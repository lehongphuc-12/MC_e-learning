using System.Data;
using System.Globalization;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Google.Apis.Sheets.v4.Data;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record SyncCell(string Table, int Id, string Field, string BaseValue, string DatabaseValue, string SheetValue, string Direction);
public sealed record SyncPlan(int QuizId, string Status, List<string> Problems, List<SyncCell> Changes, List<SyncCell> Conflicts);

// Existing records only: never infer a DELETE or INSERT from a spreadsheet row.
public sealed class QuizFullSyncService(SmartMcDbContext db, QuizSheetReader sheets)
{
    private sealed record Spec(string Key, Type Type, string[] Fields);
    private static readonly Dictionary<string, Spec> Specs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Quizzes"] = new("QuizId", typeof(Quiz), ["Title", "Description", "TimeLimitMinutes", "PassingScore", "MaxAttempts", "Status"]),
        ["Questions"] = new("QuestionId", typeof(Question), ["QuestionText", "Instruction", "Explanation", "QuestionType", "Points", "IsRequired", "OrderIndex"]),
        ["Choices"] = new("ChoiceId", typeof(Choice), ["ChoiceText", "OptionValue", "IsCorrect", "Explanation", "OrderIndex"]),
        ["Media"] = new("MediaId", typeof(QuestionMedia), ["MediaType", "MediaUrl", "Label", "DurationSeconds", "OrderIndex"]),
        ["ErrorRegions"] = new("ErrorRegionId", typeof(QuestionErrorRegion), ["StartTimeMs", "EndTimeMs", "ErrorCategory", "ErrorCode", "Description", "CorrectionText", "Points"]),
        ["Annotations"] = new("AnnotationId", typeof(QuestionAnnotation), ["AnnotationType", "StartIndex", "EndIndex", "AnnotationValue", "Explanation", "Points"]),
        ["ArrangeItems"] = new("ArrangeItemId", typeof(QuestionArrangeItem), ["Content", "CorrectOrder", "IsDistractor"]),
        ["WritingConfigs"] = new("WritingConfigId", typeof(QuestionWritingConfig), ["EventType", "Audience", "Style", "MinWords", "MaxWords", "RequiredElementsJson", "GradingRubricJson"]),
        ["ScenarioNodes"] = new("NodeId", typeof(ScenarioNode), ["NodeType", "Title", "Content", "MediaUrl", "IsStartNode", "IsEndNode", "Points"]),
        ["ScenarioChoices"] = new("ScenarioChoiceId", typeof(ScenarioChoice), ["ChoiceText", "NextNodeId", "Score", "Feedback", "OrderIndex"])
    };

    private sealed record Snapshot(
        Dictionary<string, string> Db,
        Dictionary<string, string> Sheet,
        Dictionary<string, (object Entity, PropertyInfo Property)> Targets,
        Dictionary<string, (string Table, int Row, string Field)> Locations,
        List<string> Problems);

    // Journal contains immutable source snapshots and exact intended writes.
    private sealed record SyncOperationPayload(
        Dictionary<string, string> Baseline,
        Dictionary<string, string> BeforeDb,
        Dictionary<string, string> BeforeSheet,
        List<SyncCell> Changes,
        List<SyncCell> Conflicts,
        string? ConflictKey = null);

    private sealed record PendingOperation(Guid Id, string Type, string Status, SyncOperationPayload Payload);

    private static async Task<PendingOperation?> PendingAsync(int quizId, NpgsqlConnection con, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(@"SELECT operation_id,operation_type,status,payload::text
            FROM quiz_sync_operations WHERE quiz_id=@id AND status NOT IN ('COMPLETED','SUPERSEDED') ORDER BY created_at_utc LIMIT 1", con);
        cmd.Parameters.AddWithValue("id", quizId);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        var payload = JsonSerializer.Deserialize<SyncOperationPayload>(reader.GetString(3))
            ?? throw new InvalidOperationException("Invalid recovery journal payload.");
        return new(reader.GetGuid(0), reader.GetString(1), reader.GetString(2), payload);
    }

    private static async Task<Guid> PrepareAsync(int quizId, string type, SyncOperationPayload payload, NpgsqlConnection con, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        await using var cmd = new NpgsqlCommand(@"INSERT INTO quiz_sync_operations
            (operation_id,quiz_id,operation_type,status,payload)
            VALUES (@id,@quiz,@type,'PREPARED',@payload::jsonb)", con);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("quiz", quizId);
        cmd.Parameters.AddWithValue("type", type);
        cmd.Parameters.AddWithValue("payload", JsonSerializer.Serialize(payload));
        await cmd.ExecuteNonQueryAsync(ct);
        return id;
    }

    private static async Task SetOperationStatusAsync(Guid id, string status, NpgsqlConnection con, NpgsqlTransaction? tx, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(@"UPDATE quiz_sync_operations SET status=@status,updated_at_utc=now()
            WHERE operation_id=@id AND status <> 'COMPLETED'", con, tx);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("status", status);
        if (await cmd.ExecuteNonQueryAsync(ct) != 1)
            throw new InvalidOperationException("Sync operation journal was changed concurrently.");
    }

    private static bool Same(Dictionary<string, string> a, Dictionary<string, string> b) =>
        a.Count == b.Count && a.All(x => b.TryGetValue(x.Key, out var v) && v == x.Value);

    // A pending operation is NEVER auto-replayed. An interrupted external write may have
    // succeeded even if the HTTP response was lost; a blind retry can destroy later edits.
    // Only finish the journal when every cell is independently verifiable as converged.
    private async Task<SyncPlan?> RecoverAsync(int quizId, NpgsqlConnection con, CancellationToken ct)
    {
        var op = await PendingAsync(quizId, con, ct);
        if (op == null) return null;
        var payload = op.Payload;
        var snap = await CaptureAsync(quizId, ct);
        var baseline = await BaselineAsync(quizId, con, null, ct);
        if (snap.Problems.Count != 0 || baseline == null || !Same(baseline, payload.Baseline))
        {
            await SetOperationStatusAsync(op.Id, "RECOVERY_REQUIRED", con, null, ct);
            return new(quizId, "RECOVERY_REQUIRED", ["Pending operation cannot be verified; baseline or structure changed. Manual review required."], [], []);
        }

        var writes = payload.Changes;
        var expected = new Dictionary<string, string>(payload.Baseline, StringComparer.Ordinal);
        foreach (var c in writes)
        {
            var key = Key(c.Table, c.Id, c.Field);
            expected[key] = c.Direction == "SHEET_TO_DB" ? c.SheetValue : c.DatabaseValue;
        }
        // For conflict resolution only the selected conflict field is advanced.
        if (op.Type == "RESOLVE_DATABASE" && payload.ConflictKey != null)
        {
            var chosen = writes.Single();
            expected[payload.ConflictKey] = chosen.DatabaseValue;
        }

        // All cells must match the journal's exact expected end-state. For unrelated
        // unresolved conflicts, the old DB/Sheet divergence is intentionally retained.
        bool verified = snap.Db.Count == payload.BeforeDb.Count && snap.Sheet.Count == payload.BeforeSheet.Count;
        foreach (var (key, oldDb) in payload.BeforeDb)
        {
            if (!snap.Db.TryGetValue(key, out var currentDb) || !snap.Sheet.TryGetValue(key, out var currentSheet)) { verified = false; break; }
            var write = writes.FirstOrDefault(c => Key(c.Table, c.Id, c.Field) == key);
            var wantedDb = write == null ? oldDb : (write.Direction == "SHEET_TO_DB" ? write.SheetValue : write.DatabaseValue);
            var wantedSheet = write == null ? payload.BeforeSheet[key] : (write.Direction == "DB_TO_SHEET" ? write.DatabaseValue : write.SheetValue);
            if (currentDb != wantedDb || currentSheet != wantedSheet) { verified = false; break; }
        }
        if (!verified)
        {
            await SetOperationStatusAsync(op.Id, "RECOVERY_REQUIRED", con, null, ct);
            return new(quizId, "RECOVERY_REQUIRED", ["Interrupted operation is not fully converged. No writes were replayed; manual review required."], [], []);
        }

        await using var tx = await con.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var freshBase = await BaselineAsync(quizId, con, tx, ct);
        if (freshBase == null || !Same(freshBase, payload.Baseline))
            return new(quizId, "RECOVERY_REQUIRED", ["Baseline changed during recovery."], [], []);
        foreach (var c in writes) freshBase[Key(c.Table, c.Id, c.Field)] = expected[Key(c.Table, c.Id, c.Field)];
        await StoreAsync(quizId, freshBase, con, tx, ct);
        if (op.Type == "EXECUTE") await SaveConflictsAsync(quizId, payload.Conflicts, con, tx, ct);
        else if (op.Type == "RESOLVE_DATABASE") await MarkResolvedAsync(quizId, writes.Single(), con, tx, ct);
        await SetOperationStatusAsync(op.Id, "COMPLETED", con, tx, ct);
        await tx.CommitAsync(ct);
        return new(quizId, "RECOVERED", [], writes, payload.Conflicts);
    }

    // Explicit Instructor approval is required. No DB/Sheet content is written here.
    // This narrow recovery path is for one interrupted DB_TO_SHEET write followed by
    // a different external Sheet edit. The old journal is retained for audit.
    public async Task<SyncPlan> SupersedeDivergedOperationAsync(int quizId, int instructorId,
        Guid operationId, string expectedDatabaseValue, string expectedSheetValue, CancellationToken ct)
    {
        if (!await OwnedAsync(quizId, instructorId, ct))
            return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);
        if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
            return new(quizId, "HAS_ATTEMPTS", ["Learner attempts exist; writes blocked."], [], []);
        await using var con = new NpgsqlConnection(db.Database.GetConnectionString());
        await con.OpenAsync(ct);
        await using (var cmd = new NpgsqlCommand("SELECT pg_advisory_lock(714923,@id)", con))
        {
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        try
        {
            var op = await PendingAsync(quizId, con, ct);
            if (op == null || op.Id != operationId || op.Type != "EXECUTE" ||
                op.Status != "RECOVERY_REQUIRED" || op.Payload.Changes.Count != 1 ||
                op.Payload.Changes[0].Direction != "DB_TO_SHEET" || op.Payload.Conflicts.Count != 0)
                return new(quizId, "RECOVERY_NOT_ELIGIBLE", ["Journal identity, status or write set does not match the safe recovery case."], [], []);
            var change = op.Payload.Changes[0];
            var key = Key(change.Table, change.Id, change.Field);
            var baseline = await BaselineAsync(quizId, con, null, ct);
            var snap = await CaptureAsync(quizId, ct);
            if (baseline == null || !Same(baseline, op.Payload.Baseline) || snap.Problems.Count != 0 ||
                !snap.Db.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(op.Payload.BeforeDb.Keys) ||
                !snap.Sheet.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(op.Payload.BeforeSheet.Keys) ||
                !Same(snap.Db, op.Payload.BeforeDb) ||
                snap.Sheet.Any(x => x.Key != key && x.Value != op.Payload.BeforeSheet[x.Key]) ||
                !snap.Sheet.TryGetValue(key, out var sheetNow) ||
                !snap.Db.TryGetValue(key, out var dbNow) ||
                dbNow != expectedDatabaseValue || sheetNow != expectedSheetValue ||
                dbNow != change.DatabaseValue || sheetNow == dbNow ||
                sheetNow == op.Payload.BeforeSheet[key] ||
                sheetNow == baseline[key] || dbNow == baseline[key])
                return new(quizId, "RECOVERY_STATE_CHANGED", ["Live DB, Sheet or baseline differs from the explicitly reviewed recovery state."], [], []);

            // Repeat the external read immediately before committing journal metadata.
            var fresh = await CaptureAsync(quizId, ct);
            if (fresh.Problems.Count != 0 || !Same(fresh.Db, snap.Db) || !Same(fresh.Sheet, snap.Sheet))
                return new(quizId, "STALE_SNAPSHOT", ["DB or Sheet changed during recovery."], [], []);
            var conflict = change with { BaseValue = baseline[key], DatabaseValue = dbNow,
                SheetValue = sheetNow, Direction = "CONFLICT" };
            await using var tx = await con.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var currentBase = await BaselineAsync(quizId, con, tx, ct);
            if (currentBase == null || !Same(currentBase, baseline))
                return new(quizId, "STALE_BASELINE", ["Baseline changed during recovery."], [], []);
            await SaveConflictsAsync(quizId, [conflict], con, tx, ct);
            await SetOperationStatusAsync(op.Id, "SUPERSEDED", con, tx, ct);
            await tx.CommitAsync(ct);
            return new(quizId, "RECOVERY_SUPERSEDED", [], [], [conflict]);
        }
        finally
        {
            await using var cmd = new NpgsqlCommand("SELECT pg_advisory_unlock(714923,@id)", con);
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(CancellationToken.None);
        }
    }

    private static string Key(string table, int id, string field) => $"{table}/{id}/{field}";

    private static string Canonical(object? value) =>
        value is null ? "" :
        value is bool b ? (b ? "true" : "false") :
        value is Enum e ? e.ToString() :
        value is IFormattable f ? f.ToString(null, CultureInfo.InvariantCulture) ?? "" :
        value.ToString() ?? "";

    private static string Normalize(string value, Type type)
    {
        var t = Nullable.GetUnderlyingType(type) ?? type;
        value = value.Trim();

        if (t == typeof(decimal) && decimal.TryParse(value.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var dec))
            return dec.ToString(CultureInfo.InvariantCulture);
        if (t == typeof(int) && int.TryParse(value, out var i))
            return i.ToString(CultureInfo.InvariantCulture);
        if (t == typeof(bool) && bool.TryParse(value, out var b))
            return b ? "true" : "false";
        if (t.IsEnum && Enum.TryParse(t, value, true, out var e) && e != null && Enum.IsDefined(t, e))
            return e.ToString()!;
        return value;
    }

    private static bool ConvertValue(string value, Type type, out object? result)
    {
        result = null;
        var t = Nullable.GetUnderlyingType(type) ?? type;

        if (t == typeof(string)) { result = value; return true; }
        if (value.Length == 0 && Nullable.GetUnderlyingType(type) != null) return true;
        if (t == typeof(int) && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i)) { result = i; return true; }
        if (t == typeof(decimal) && decimal.TryParse(value.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var d)) { result = d; return true; }
        if (t == typeof(bool) && bool.TryParse(value, out var b)) { result = b; return true; }
        if (t.IsEnum && Enum.TryParse(t, value, true, out var e) && e != null && Enum.IsDefined(t, e)) { result = e; return true; }
        return false;
    }

    private static bool Valid(string field, object? value)
    {
        if (value is int i && (field is "OrderIndex" or "CorrectOrder" or "MaxAttempts") && i < 1) return false;
        if (value is int n && (field is "StartIndex" or "EndIndex" or "StartTimeMs" or "EndTimeMs" or "TimeLimitMinutes" or "DurationSeconds" or "MinWords" or "MaxWords") && n < 0) return false;
        if (value is decimal d && (field is "Points" or "Score") && d < 0) return false;
        if (field is "Title" or "QuestionText" or "ChoiceText" or "Content" or "MediaUrl" or "ErrorCode" or "ErrorCategory" && string.IsNullOrWhiteSpace(value?.ToString())) return false;
        return true;
    }

    private async Task<Snapshot> CaptureAsync(int quizId, CancellationToken ct)
    {
        var quiz = await db.Quizzes.AsNoTracking()
            .Include(q => q.Questions).ThenInclude(q => q.Choices)
            .Include(q => q.Questions).ThenInclude(q => q.Media)
            .Include(q => q.Questions).ThenInclude(q => q.ErrorRegions)
            .Include(q => q.Questions).ThenInclude(q => q.Annotations)
            .Include(q => q.Questions).ThenInclude(q => q.ArrangeItems)
            .Include(q => q.Questions).ThenInclude(q => q.WritingConfig)
            .Include(q => q.Questions).ThenInclude(q => q.ScenarioNodes).ThenInclude(n => n.Choices)
            .AsSplitQuery().FirstOrDefaultAsync(q => q.QuizId == quizId, ct)
            ?? throw new InvalidOperationException("Quiz not found.");

        var data = await sheets.ReadGoogleAsync(ct);
        var ownedQuestions = quiz.Questions.Select(x => x.QuestionId).ToHashSet();
        var ownedNodes = quiz.Questions.SelectMany(x => x.ScenarioNodes).Select(x => x.NodeId).ToHashSet();

        var groups = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase)
        {
            ["Quizzes"] = [quiz],
            ["Questions"] = quiz.Questions.Cast<object>().ToList(),
            ["Choices"] = quiz.Questions.SelectMany(q => q.Choices).Cast<object>().ToList(),
            ["Media"] = quiz.Questions.SelectMany(q => q.Media).Cast<object>().ToList(),
            ["ErrorRegions"] = quiz.Questions.SelectMany(q => q.ErrorRegions).Cast<object>().ToList(),
            ["Annotations"] = quiz.Questions.SelectMany(q => q.Annotations).Cast<object>().ToList(),
            ["ArrangeItems"] = quiz.Questions.SelectMany(q => q.ArrangeItems).Cast<object>().ToList(),
            ["WritingConfigs"] = quiz.Questions.Where(q => q.WritingConfig != null).Select(q => (object)q.WritingConfig!).ToList(),
            ["ScenarioNodes"] = quiz.Questions.SelectMany(q => q.ScenarioNodes).Cast<object>().ToList(),
            ["ScenarioChoices"] = quiz.Questions.SelectMany(q => q.ScenarioNodes).SelectMany(n => n.Choices).Cast<object>().ToList()
        };

        var left = new Dictionary<string, string>(StringComparer.Ordinal);
        var right = new Dictionary<string, string>(StringComparer.Ordinal);
        var targets = new Dictionary<string, (object, PropertyInfo)>(StringComparer.Ordinal);
        var locations = new Dictionary<string, (string, int, string)>(StringComparer.Ordinal);
        var problems = new List<string>();

        foreach (var (table, spec) in Specs)
        {
            var entities = groups[table];
            var index = entities.ToDictionary(e => (int)spec.Type.GetProperty(spec.Key)!.GetValue(e)!, e => e);

            var rows = (data.GetValueOrDefault(table) ?? []).Where(r =>
                (table == "Quizzes" && r.GetValueOrDefault("QuizId") == quizId.ToString()) ||
                (table == "Questions" && int.TryParse(r.GetValueOrDefault("QuizId"), out var qi) && qi == quizId) ||
                (table != "Quizzes" && table != "Questions" && int.TryParse(r.GetValueOrDefault("QuestionId"), out var qid) && ownedQuestions.Contains(qid)) ||
                (table == "ScenarioChoices" && int.TryParse(r.GetValueOrDefault("NodeId"), out var nid) && ownedNodes.Contains(nid)) ||
                (int.TryParse(r.GetValueOrDefault(spec.Key), out var id) && index.ContainsKey(id))
            ).ToList();

            if (rows.Count != index.Count)
                problems.Add($"{table}: DB has {index.Count} rows, Sheet has {rows.Count}. Insert/delete requires manual reconciliation.");

            var seen = new HashSet<int>();

            foreach (var row in rows)
            {
                if (!int.TryParse(row.GetValueOrDefault(spec.Key), out var id) || !seen.Add(id) || !index.TryGetValue(id, out var entity))
                {
                    problems.Add($"{table} row {row.GetValueOrDefault("_row")}: missing, duplicate or foreign {spec.Key}.");
                    continue;
                }

                var parent = table is "Quizzes" ? "" :
                             table is "Questions" ? "QuizId" :
                             table is "ScenarioChoices" ? "NodeId" : "QuestionId";

                if (parent.Length > 0)
                {
                    if (!row.TryGetValue(parent, out var parentId) ||
                        !int.TryParse(parentId.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var actualParent))
                        problems.Add($"{table}/{id}: missing or invalid {parent}.");
                    else
                    {
                        var p = spec.Type.GetProperty(parent);
                        if (p == null || !int.TryParse(Canonical(p.GetValue(entity)), out var expectedParent) || actualParent != expectedParent)
                            problems.Add($"{table}/{id}: parent ID mismatch.");
                    }
                }

                foreach (var field in spec.Fields)
                {
                    var prop = spec.Type.GetProperty(field, BindingFlags.Public | BindingFlags.Instance)!;
                    var key = Key(table, id, field);

                    left[key] = Canonical(prop.GetValue(entity));
                    targets[key] = (entity, prop);

                    if (!row.TryGetValue(field, out var cell))
                    {
                        problems.Add($"{table}: column {field} missing (row {row.GetValueOrDefault("_row")}).");
                        continue;
                    }

                    right[key] = Normalize(cell, prop.PropertyType);
                    if (!row.TryGetValue("_row", out var rowText) ||
                        !int.TryParse(rowText, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sheetRow) || sheetRow < 2)
                        problems.Add($"{table}/{id}: missing or invalid _row metadata.");
                    else locations[key] = (table, sheetRow, field);

                    if (!ConvertValue(right[key], prop.PropertyType, out var converted) || !Valid(field, converted))
                        problems.Add($"{table}/{id}.{field}: invalid value '{cell}'.");
                }
            }
        }

        return new(left, right, targets, locations, problems);
    }

    private async Task<Dictionary<string, string>?> BaselineAsync(int quizId, NpgsqlConnection con, NpgsqlTransaction? tx, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT cells::text FROM quiz_sync_cell_baselines WHERE quiz_id=@id", con, tx);
        cmd.Parameters.AddWithValue("id", quizId);
        var json = await cmd.ExecuteScalarAsync(ct) as string;
        return json == null ? null : JsonSerializer.Deserialize<Dictionary<string, string>>(json);
    }

    private static async Task StoreAsync(int quizId, Dictionary<string, string> values, NpgsqlConnection con, NpgsqlTransaction tx, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            "INSERT INTO quiz_sync_cell_baselines(quiz_id,cells,synced_at_utc) VALUES(@id,@cells::jsonb,now()) ON CONFLICT(quiz_id) DO UPDATE SET cells=EXCLUDED.cells,synced_at_utc=now()", con, tx);

        cmd.Parameters.AddWithValue("id", quizId);
        cmd.Parameters.AddWithValue("cells", JsonSerializer.Serialize(values));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    // Initial baseline review: report every differing field without writing either source.
    // These are NOT three-way conflicts because no baseline exists yet.
    private static List<SyncCell> InitialDifferences(Snapshot snap)
    {
        var differences = new List<SyncCell>();
        foreach (var (key, dbValue) in snap.Db.OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            if (!snap.Sheet.TryGetValue(key, out var sheetValue) || !snap.Targets.TryGetValue(key, out var target)) continue;
            var type = target.Property.PropertyType;
            if (Normalize(dbValue, type) == Normalize(sheetValue, type)) continue;
            var parts = key.Split('/', 3);
            differences.Add(new SyncCell(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture),
                parts[2], "", dbValue, sheetValue, "INITIAL_MISMATCH"));
        }
        return differences;
    }

    private static SyncPlan Compare(int id, Snapshot snap, Dictionary<string, string>? baseline)
    {
        var problems = new List<string>(snap.Problems);
        var changes = new List<SyncCell>();
        var conflicts = new List<SyncCell>();
        if (baseline == null)
        {
            var initialDifferences = InitialDifferences(snap);
            return new(id, problems.Count != 0 ? "INVALID_OR_INCOMPLETE" : initialDifferences.Count != 0 ? "BASELINE_REQUIRES_MATCH" : "BASELINE_REQUIRED",
                problems, initialDifferences, conflicts);
        }
        if (!baseline.Keys.OrderBy(x => x).SequenceEqual(snap.Db.Keys.OrderBy(x => x)) ||
            !snap.Db.Keys.OrderBy(x => x).SequenceEqual(snap.Sheet.Keys.OrderBy(x => x)))
            problems.Add("Baseline, DB and Sheet keys differ. Insert/delete must be reconciled manually.");
        foreach (var (key, original) in baseline)
        {
            if (!snap.Db.TryGetValue(key, out var d) || !snap.Sheet.TryGetValue(key, out var sh) || !snap.Targets.TryGetValue(key, out var target)) continue;
            var b = Normalize(original, target.Property.PropertyType);
            d = Normalize(d, target.Property.PropertyType);
            sh = Normalize(sh, target.Property.PropertyType);
            if (d == sh)
            {
                // Equality alone does not prove which side changed; never silently advance baseline.
                if (d != b) problems.Add($"{key}: DB and Sheet agree but differ from baseline. Recovery requires verification.");
                continue;
            }
            var parts = key.Split('/', 3);
            var direction = d == b ? "SHEET_TO_DB" : sh == b ? "DB_TO_SHEET" : "CONFLICT";
            var item = new SyncCell(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture), parts[2], b, d, sh, direction);
            if (direction == "CONFLICT") conflicts.Add(item); else changes.Add(item);
        }
        var status = problems.Count != 0 ? "INVALID_OR_INCOMPLETE" : conflicts.Count != 0 ? "CONFLICT" : changes.Count == 0 ? "IN_SYNC" : "READY";
        return new(id, status, problems, changes, conflicts);
    }

    private async Task<bool> OwnedAsync(int quizId, int instructorId, CancellationToken ct) =>
        await db.Quizzes.AsNoTracking().AnyAsync(q => q.QuizId == quizId && q.CreatedById == instructorId, ct);

    public async Task<SyncPlan> PlanAsync(int quizId, int instructorId, CancellationToken ct)
    {
        if (!await OwnedAsync(quizId, instructorId, ct)) return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);
        var snap = await CaptureAsync(quizId, ct);
        await using var con = new NpgsqlConnection(db.Database.GetConnectionString());
        await con.OpenAsync(ct);
        if (await PendingAsync(quizId, con, ct) != null)
            return new(quizId, "RECOVERY_PENDING", ["A previous operation needs recovery before new changes."], [], []);
        return Compare(quizId, snap, await BaselineAsync(quizId, con, null, ct));
    }

    
public async Task<SyncPlan> AdoptAsync(int quizId, int instructorId, CancellationToken ct)
{
    if (quizId <= 0 || !await OwnedAsync(quizId, instructorId, ct))
        return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);

    await using var lockCon = new NpgsqlConnection(db.Database.GetConnectionString());
    await lockCon.OpenAsync(ct);

    await using (var cmd = new NpgsqlCommand("SELECT pg_advisory_lock(714923,@id)", lockCon))
    {
        cmd.Parameters.AddWithValue("id", quizId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    try
    {
        if (await BaselineAsync(quizId, lockCon, null, ct) != null)
            return new(quizId, "BASELINE_ALREADY_EXISTS", [], [], []);

        var snap = await CaptureAsync(quizId, ct);
        if (snap.Problems.Count != 0)
            return new(quizId, "INVALID_OR_INCOMPLETE", snap.Problems, [], []);

        if (snap.Db.Count != snap.Sheet.Count ||
            snap.Db.Keys.Except(snap.Sheet.Keys, StringComparer.Ordinal).Any())
            return new(quizId, "INVALID_OR_INCOMPLETE", ["DB and Sheet field keys differ."], [], []);

        var initialDifferences = InitialDifferences(snap);
        if (initialDifferences.Count != 0)
            return new(quizId, "BASELINE_REQUIRES_MATCH",
                [$"Initial DB and Sheet values must match. {initialDifferences.Count} field(s) differ. Review Changes before confirming."],
                initialDifferences, []);

        var fresh = await CaptureAsync(quizId, ct);
        if (fresh.Problems.Count != 0 ||
            !fresh.Db.OrderBy(x => x.Key).SequenceEqual(snap.Db.OrderBy(x => x.Key)) ||
            !fresh.Sheet.OrderBy(x => x.Key).SequenceEqual(snap.Sheet.OrderBy(x => x.Key)))
            return new(quizId, "STALE_SNAPSHOT", ["DB or Sheet changed during baseline adoption. Retry."], [], []);

        await using var tx = await lockCon.BeginTransactionAsync(IsolationLevel.Serializable, ct);

        if (await BaselineAsync(quizId, lockCon, tx, ct) != null)
            return new(quizId, "BASELINE_ALREADY_EXISTS", [], [], []);

        await StoreAsync(quizId, fresh.Db, lockCon, tx, ct);
        await tx.CommitAsync(ct);

        return new(quizId, "BASELINE_ADOPTED", [], [], []);
    }
    finally
    {
        await using var cmd = new NpgsqlCommand("SELECT pg_advisory_unlock(714923,@id)", lockCon);
        cmd.Parameters.AddWithValue("id", quizId);
        await cmd.ExecuteNonQueryAsync(CancellationToken.None);
    }
}
    public async Task<SyncPlan> BootstrapFromSheetAsync(int quizId, int instructorId, CancellationToken ct)
    {
        if (!await OwnedAsync(quizId, instructorId, ct))
            return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);
        if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
            return new(quizId, "HAS_ATTEMPTS", ["Learner attempts exist; bootstrap blocked."], [], []);

        await using var lockCon = new NpgsqlConnection(db.Database.GetConnectionString());
        await lockCon.OpenAsync(ct);
        await using (var command = new NpgsqlCommand("SELECT pg_advisory_lock(714923,@id)", lockCon))
        {
            command.Parameters.AddWithValue("id", quizId);
            await command.ExecuteNonQueryAsync(ct);
        }
        try
        {
            if (await BaselineAsync(quizId, lockCon, null, ct) != null)
                return new(quizId, "BASELINE_ALREADY_EXISTS", [], [], []);

            var snapshot = await CaptureAsync(quizId, ct);
            if (snapshot.Problems.Count > 0 || snapshot.Db.Count != snapshot.Sheet.Count ||
                snapshot.Db.Keys.Except(snapshot.Sheet.Keys).Any())
                return new(quizId, "INVALID_OR_INCOMPLETE", snapshot.Problems.Count > 0
                    ? snapshot.Problems : ["Sheet and DB record/field keys differ."], [], []);

            // Validate all incoming values before changing any entity.
            var convertedValues = new Dictionary<string, object?>();
            var changes = new List<SyncCell>();
            foreach (var (key, dbValue) in snapshot.Db)
            {
                var (entity, property) = snapshot.Targets[key];
                var sheetValue = snapshot.Sheet[key];
                var field = key.Split('/', 3)[2];
                if (!ConvertValue(sheetValue, property.PropertyType, out var converted) || !Valid(field, converted))
                    return new(quizId, "INVALID_VALUE", [$"Invalid Sheet value at {key}: '{sheetValue}'."], [], []);
                convertedValues[key] = converted;
                if (Normalize(dbValue, property.PropertyType) != sheetValue)
                {
                    var parts = key.Split('/', 3);
                    changes.Add(new SyncCell(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture),
                        parts[2], "", dbValue, sheetValue, "SHEET_TO_DB"));
                }
            }

            // Recheck before beginning writes; never initialize against a stale snapshot.
            var fresh = await CaptureAsync(quizId, ct);
            if (fresh.Problems.Count > 0 || !fresh.Db.OrderBy(x => x.Key).SequenceEqual(snapshot.Db.OrderBy(x => x.Key)) ||
                !fresh.Sheet.OrderBy(x => x.Key).SequenceEqual(snapshot.Sheet.OrderBy(x => x.Key)))
                return new(quizId, "STALE_SNAPSHOT", ["Data changed during bootstrap; retry next cycle."], [], []);

            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            if (await BaselineAsync(quizId, (NpgsqlConnection)db.Database.GetDbConnection(),
                    (NpgsqlTransaction)tx.GetDbTransaction(), ct) != null)
                return new(quizId, "BASELINE_ALREADY_EXISTS", [], [], []);
            if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
                return new(quizId, "HAS_ATTEMPTS", ["Learner attempts exist; bootstrap blocked."], [], []);

            foreach (var change in changes)
            {
                var key = Key(change.Table, change.Id, change.Field);
                var (entity, property) = snapshot.Targets[key];
                var current = await db.FindAsync(entity.GetType(), new object[] { change.Id }, ct);
                if (current == null || Normalize(Canonical(property.GetValue(current)), property.PropertyType) !=
                    Normalize(change.DatabaseValue, property.PropertyType))
                    return new(quizId, "STALE_DB", ["DB changed during bootstrap."], [], []);
                property.SetValue(current, convertedValues[key]);
            }
            if (changes.Count > 0) await db.SaveChangesAsync(ct);

            var verified = await CaptureAsync(quizId, ct);
            var verificationProblems = new List<string>(verified.Problems);
            var keys = verified.Db.Keys.Union(verified.Sheet.Keys, StringComparer.Ordinal)
                .Union(snapshot.Sheet.Keys, StringComparer.Ordinal)
                .OrderBy(k => k, StringComparer.Ordinal);
            foreach (var key in keys)
            {
                if (!verified.Db.TryGetValue(key, out var dbValue) ||
                    !verified.Sheet.TryGetValue(key, out var sheetValue) ||
                    !verified.Targets.TryGetValue(key, out var target))
                {
                    verificationProblems.Add($"Key={key} | Missing DB={!verified.Db.ContainsKey(key)}, Sheet={!verified.Sheet.ContainsKey(key)}, Target={!verified.Targets.ContainsKey(key)}");
                    continue;
                }
                var normalizedDb = Normalize(dbValue, target.Property.PropertyType);
                var normalizedSheet = Normalize(sheetValue, target.Property.PropertyType);
                if (!string.Equals(normalizedDb, normalizedSheet, StringComparison.Ordinal))
                    verificationProblems.Add($"Key={key} | DB='{dbValue}' | Sheet='{sheetValue}' | NormalizedDB='{normalizedDb}' | NormalizedSheet='{normalizedSheet}'");
            }
            if (verified.Db.Count != snapshot.Sheet.Count)
                verificationProblems.Add($"Field count mismatch: DB={verified.Db.Count}, original Sheet={snapshot.Sheet.Count}");
            if (verificationProblems.Count > 0)
            {
                foreach (var problem in verificationProblems.Take(40))
                    Console.WriteLine($"[QUIZ {quizId} BOOTSTRAP VERIFY] {problem}");
                return new(quizId, "VERIFY_FAILED", verificationProblems.Take(40).ToList(), changes, []);
            }

            await StoreAsync(quizId, verified.Sheet,
                (NpgsqlConnection)db.Database.GetDbConnection(),
                (NpgsqlTransaction)tx.GetDbTransaction(), ct);
            await tx.CommitAsync(ct);
            return new(quizId, "BOOTSTRAPPED_SHEET_TO_DB", [], changes, []);
        }
        finally
        {
            await using var command = new NpgsqlCommand("SELECT pg_advisory_unlock(714923,@id)", lockCon);
            command.Parameters.AddWithValue("id", quizId);
            await command.ExecuteNonQueryAsync(CancellationToken.None);
        }
    }

    private static string Column(int index)
    {
        var result = "";
        for (var n = index + 1; n > 0;) { n--; result = (char)('A' + n % 26) + result; n /= 26; }
        return result;
    }

    private async Task WriteSheetAsync(Snapshot snap, IReadOnlyList<SyncCell> changes, CancellationToken ct)
    {
        if (changes.Count == 0) return;
        using var client = await sheets.ConnectAsync(ct);
        var headers = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        var updates = new List<ValueRange>();
        foreach (var change in changes)
        {
            var key = Key(change.Table, change.Id, change.Field);
            var loc = snap.Locations[key];
            if (!headers.TryGetValue(loc.Table, out var header))
            {
                var req = client.Spreadsheets.Values.Get(QuizSheetReader.SpreadsheetId, $"'{loc.Table}'!1:1");
                header = (await req.ExecuteAsync(ct)).Values?.FirstOrDefault()?.Select(x => x?.ToString()?.Trim() ?? "").ToList() ?? [];
                headers[loc.Table] = header;
            }
            var col = header.FindIndex(x => string.Equals(x, loc.Field, StringComparison.OrdinalIgnoreCase));
            if (col < 0) throw new InvalidOperationException($"Missing sheet column {loc.Table}.{loc.Field}");
            updates.Add(new ValueRange { Range = $"'{loc.Table}'!{Column(col)}{loc.Row}", Values = new List<IList<object>> { new List<object> { change.DatabaseValue } } });
        }
        var reqUpdate = client.Spreadsheets.Values.BatchUpdate(new BatchUpdateValuesRequest { ValueInputOption = "RAW", Data = updates }, QuizSheetReader.SpreadsheetId);
        await reqUpdate.ExecuteAsync(ct);
    }

    private static async Task SaveConflictsAsync(int quizId, IReadOnlyList<SyncCell> conflicts, NpgsqlConnection con, NpgsqlTransaction tx, CancellationToken ct)
    {
        foreach (var c in conflicts)
        {
            await using var cmd = new NpgsqlCommand(@"INSERT INTO quiz_sync_conflicts
                (quiz_id,table_name,record_id,field_name,baseline_value,database_value,sheet_value,status,created_at_utc)
                VALUES (@quiz,@table,@record,@field,@base,@db,@sheet,'PENDING',now())
                ON CONFLICT (quiz_id,table_name,record_id,field_name) DO UPDATE SET
                baseline_value=EXCLUDED.baseline_value,database_value=EXCLUDED.database_value,
                sheet_value=EXCLUDED.sheet_value,status='PENDING'", con, tx);
            cmd.Parameters.AddWithValue("quiz", quizId);
            cmd.Parameters.AddWithValue("table", c.Table);
            cmd.Parameters.AddWithValue("record", c.Id);
            cmd.Parameters.AddWithValue("field", c.Field);
            cmd.Parameters.AddWithValue("base", c.BaseValue);
            cmd.Parameters.AddWithValue("db", c.DatabaseValue);
            cmd.Parameters.AddWithValue("sheet", c.SheetValue);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    public async Task<SyncPlan> ResolveConflictAsync(int quizId, int instructorId, string table, int recordId, string field, string winner, CancellationToken ct)
    {
        if (!await OwnedAsync(quizId, instructorId, ct)) return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);
        if (quizId <= 0 || recordId <= 0 || !Specs.TryGetValue(table, out var spec) || !spec.Fields.Contains(field, StringComparer.Ordinal) ||
            (winner != "DATABASE" && winner != "SHEET"))
            return new(quizId, "INVALID_REQUEST", ["Invalid table, record, field or winner."], [], []);
        if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
            return new(quizId, "HAS_ATTEMPTS", ["Learner attempts exist; writes blocked."], [], []);

        await using var lockCon = new NpgsqlConnection(db.Database.GetConnectionString());
        await lockCon.OpenAsync(ct);
        await using (var cmd = new NpgsqlCommand("SELECT pg_advisory_lock(714923,@id)", lockCon))
        {
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        try
        {
            var recovered = await RecoverAsync(quizId, lockCon, ct);
            if (recovered != null) return recovered;
            var snap = await CaptureAsync(quizId, ct);
            var baseline = await BaselineAsync(quizId, lockCon, null, ct);
            var plan = Compare(quizId, snap, baseline);
            if (plan.Problems.Count != 0 || baseline == null) return plan;
            var conflict = plan.Conflicts.SingleOrDefault(x => x.Table == table && x.Id == recordId && x.Field == field);
            if (conflict == null) return plan with { Status = "CONFLICT_NOT_CURRENT", Problems = ["The field is no longer a current three-way conflict. Review again."] };
            var key = Key(table, recordId, field);
            await using (var cmd = new NpgsqlCommand(@"SELECT baseline_value,database_value,sheet_value FROM quiz_sync_conflicts
                WHERE quiz_id=@quiz AND table_name=@table AND record_id=@record AND field_name=@field AND status='PENDING'", lockCon))
            {
                cmd.Parameters.AddWithValue("quiz", quizId);
                cmd.Parameters.AddWithValue("table", table);
                cmd.Parameters.AddWithValue("record", recordId);
                cmd.Parameters.AddWithValue("field", field);
                await using var r = await cmd.ExecuteReaderAsync(ct);
                if (!await r.ReadAsync(ct)) return plan with { Status = "CONFLICT_NOT_PENDING", Problems = ["Conflict is not recorded as PENDING. Run full sync to register it."] };
                var type = snap.Targets[key].Property.PropertyType;
                if (Normalize(r.GetString(0), type) != Normalize(conflict.BaseValue, type) ||
                    Normalize(r.GetString(1), type) != Normalize(conflict.DatabaseValue, type) ||
                    Normalize(r.GetString(2), type) != Normalize(conflict.SheetValue, type))
                    return plan with { Status = "STALE_CONFLICT", Problems = ["Stored conflict differs from live values. Review again."] };
            }
            var preflight = await CaptureAsync(quizId, ct);
            if (preflight.Problems.Count != 0 || !preflight.Db.OrderBy(x => x.Key).SequenceEqual(snap.Db.OrderBy(x => x.Key)) ||
                !preflight.Sheet.OrderBy(x => x.Key).SequenceEqual(snap.Sheet.OrderBy(x => x.Key)))
                return plan with { Status = "STALE_SNAPSHOT" };
            if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
                return plan with { Status = "HAS_ATTEMPTS" };

            if (winner == "DATABASE")
            {
                // External write happens before DB metadata commit; retry remains possible if verification fails.
                var opPayload = new SyncOperationPayload(new(baseline), new(snap.Db), new(snap.Sheet),
                    [conflict with { Direction = "DB_TO_SHEET" }], [], key);
                var operationId = await PrepareAsync(quizId, "RESOLVE_DATABASE", opPayload, lockCon, ct);
                await WriteSheetAsync(snap, [conflict], ct);
                var verified = await CaptureAsync(quizId, ct);
                var type = snap.Targets[key].Property.PropertyType;
                if (verified.Problems.Count != 0 || !verified.Db.TryGetValue(key, out var dbValue) ||
                    !verified.Sheet.TryGetValue(key, out var sheetValue) ||
                    Normalize(dbValue, type) != Normalize(conflict.DatabaseValue, type) ||
                    Normalize(sheetValue, type) != Normalize(conflict.DatabaseValue, type))
                    return plan with { Status = "VERIFY_FAILED", Problems = ["Sheet write was not verified; baseline unchanged."] };
                await using var tx = await lockCon.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var freshBase = await BaselineAsync(quizId, lockCon, tx, ct);
                if (freshBase == null || !freshBase.TryGetValue(key, out var oldBase) || oldBase != baseline[key])
                    return plan with { Status = "STALE_BASELINE" };
                freshBase[key] = Normalize(conflict.DatabaseValue, type);
                await StoreAsync(quizId, freshBase, lockCon, tx, ct);
                await MarkResolvedAsync(quizId, conflict, lockCon, tx, ct);
                await SetOperationStatusAsync(operationId, "COMPLETED", lockCon, tx, ct);
                await tx.CommitAsync(ct);
            }
            else
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var (entity, property) = snap.Targets[key];
                var current = await db.FindAsync(entity.GetType(), new object[] { recordId }, ct);
                if (current == null || Normalize(Canonical(property.GetValue(current)), property.PropertyType) != Normalize(conflict.DatabaseValue, property.PropertyType))
                    return plan with { Status = "STALE_DB" };
                if (!ConvertValue(conflict.SheetValue, property.PropertyType, out var converted) || !Valid(field, converted))
                    return plan with { Status = "INVALID_VALUE" };
                property.SetValue(current, converted);
                await db.SaveChangesAsync(ct);
                var verified = await CaptureAsync(quizId, ct);
                if (verified.Problems.Count != 0 || !verified.Db.TryGetValue(key, out var dbValue) ||
                    !verified.Sheet.TryGetValue(key, out var sheetValue) ||
                    Normalize(dbValue, property.PropertyType) != Normalize(conflict.SheetValue, property.PropertyType) ||
                    Normalize(sheetValue, property.PropertyType) != Normalize(conflict.SheetValue, property.PropertyType))
                    return plan with { Status = "VERIFY_FAILED", Problems = ["Database/Sheet verification failed; DB transaction will roll back."] };
                var con = (NpgsqlConnection)db.Database.GetDbConnection();
                var npgTx = (NpgsqlTransaction)tx.GetDbTransaction();
                var freshBase = await BaselineAsync(quizId, con, npgTx, ct);
                if (freshBase == null || !freshBase.TryGetValue(key, out var oldBase) || oldBase != baseline[key])
                    return plan with { Status = "STALE_BASELINE" };
                freshBase[key] = Normalize(conflict.SheetValue, property.PropertyType);
                await StoreAsync(quizId, freshBase, con, npgTx, ct);
                await MarkResolvedAsync(quizId, conflict, con, npgTx, ct);
                await tx.CommitAsync(ct);
            }
            return plan with { Status = "RESOLVED", Problems = [], Changes = [], Conflicts = [] };
        }
        finally
        {
            await using var cmd = new NpgsqlCommand("SELECT pg_advisory_unlock(714923,@id)", lockCon);
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(CancellationToken.None);
        }
    }

    private static async Task MarkResolvedAsync(int quizId, SyncCell conflict, NpgsqlConnection con, NpgsqlTransaction tx, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(@"UPDATE quiz_sync_conflicts SET status='RESOLVED'
            WHERE quiz_id=@quiz AND table_name=@table AND record_id=@record AND field_name=@field AND status='PENDING'", con, tx);
        cmd.Parameters.AddWithValue("quiz", quizId);
        cmd.Parameters.AddWithValue("table", conflict.Table);
        cmd.Parameters.AddWithValue("record", conflict.Id);
        cmd.Parameters.AddWithValue("field", conflict.Field);
        if (await cmd.ExecuteNonQueryAsync(ct) != 1)
            throw new InvalidOperationException("Conflict changed while resolving; transaction rolled back.");
    }

    public async Task<SyncPlan> ExecuteAsync(int quizId, int instructorId, CancellationToken ct)
    {
        if (!await OwnedAsync(quizId, instructorId, ct)) return new(quizId, "NOT_FOUND", ["Quiz not owned by instructor."], [], []);
        if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
            return new(quizId, "HAS_ATTEMPTS", ["Learner attempts exist; writes blocked."], [], []);

        // Session lock serializes sync workers for this quiz. A separate connection is used
        // for writes; no nested EF and Npgsql transactions on the same connection.
        await using var lockCon = new NpgsqlConnection(db.Database.GetConnectionString());
        await lockCon.OpenAsync(ct);
        await using (var cmd = new NpgsqlCommand("SELECT pg_advisory_lock(714923,@id)", lockCon))
        {
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        try
        {
            var recovered = await RecoverAsync(quizId, lockCon, ct);
            if (recovered != null) return recovered;
            var snap = await CaptureAsync(quizId, ct);
            var baseline = await BaselineAsync(quizId, lockCon, null, ct);
            var plan = Compare(quizId, snap, baseline);
            if (plan.Status is "BASELINE_REQUIRED" or "INVALID_OR_INCOMPLETE") return plan;
            if (baseline == null) return plan;
            if (await db.QuizAttempts.AsNoTracking().AnyAsync(a => a.QuizId == quizId, ct))
                return plan with { Status = "HAS_ATTEMPTS", Problems = ["Learner attempts exist; writes blocked."] };

            // A pending conflict remains untouched. Other independent fields can converge.
            var sheetWrites = plan.Changes.Where(c => c.Direction == "DB_TO_SHEET").ToList();
            var dbWrites = plan.Changes.Where(c => c.Direction == "SHEET_TO_DB").ToList();
            var preflight = await CaptureAsync(quizId, ct);
            if (preflight.Problems.Count != 0 || !preflight.Db.OrderBy(x => x.Key).SequenceEqual(snap.Db.OrderBy(x => x.Key)) ||
                !preflight.Sheet.OrderBy(x => x.Key).SequenceEqual(snap.Sheet.OrderBy(x => x.Key)))
                return plan with { Status = "STALE_SNAPSHOT" };

            // External write first. If DB commit fails, baseline is not advanced; retry
            // compares the old baseline against the newly converged Sheet value.
            Guid? operationId = null;
            if (plan.Changes.Count != 0)
            {
                var payload = new SyncOperationPayload(new(baseline), new(snap.Db), new(snap.Sheet),
                    new(plan.Changes), new(plan.Conflicts));
                operationId = await PrepareAsync(quizId, "EXECUTE", payload, lockCon, ct);
            }
            await WriteSheetAsync(snap, sheetWrites, ct);
            if (operationId.HasValue)
                await SetOperationStatusAsync(operationId.Value, "SHEET_APPLIED", lockCon, null, ct);
            var afterSheet = await CaptureAsync(quizId, ct);
            if (afterSheet.Problems.Count != 0 || sheetWrites.Any(c =>
            {
                var key = Key(c.Table, c.Id, c.Field);
                var type = snap.Targets[key].Property.PropertyType;
                return !afterSheet.Sheet.TryGetValue(key, out var sheetValue) ||
                       !afterSheet.Db.TryGetValue(key, out var dbValue) ||
                       Normalize(sheetValue, type) != Normalize(c.DatabaseValue, type) ||
                       Normalize(dbValue, type) != Normalize(c.DatabaseValue, type);
            })) return plan with { Status = "SHEET_WRITE_UNVERIFIED" };

            // EF transaction covers database field writes and baseline update atomically.
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            foreach (var change in dbWrites)
            {
                var key = Key(change.Table, change.Id, change.Field);
                var (entity, prop) = snap.Targets[key];
                var current = await db.FindAsync(entity.GetType(), new object[] { change.Id }, ct);
                if (current == null || Normalize(Canonical(prop.GetValue(current)), prop.PropertyType) != change.DatabaseValue)
                    return plan with { Status = "STALE_DB" };
                if (!ConvertValue(change.SheetValue, prop.PropertyType, out var converted) || !Valid(change.Field, converted))
                    return plan with { Status = "INVALID_VALUE" };
                prop.SetValue(current, converted);
            }
            if (dbWrites.Count != 0) await db.SaveChangesAsync(ct);

            // Re-read Sheet after DB writes. Concurrent edits are never silently overwritten.
            var confirmed = await CaptureAsync(quizId, ct);
            if (confirmed.Problems.Count != 0 || plan.Changes.Any(c =>
            {
                var key = Key(c.Table, c.Id, c.Field);
                var type = snap.Targets[key].Property.PropertyType;
                var expected = c.Direction == "SHEET_TO_DB" ? c.SheetValue : c.DatabaseValue;
                return !confirmed.Db.TryGetValue(key, out var dbValue) ||
                       !confirmed.Sheet.TryGetValue(key, out var sheetValue) ||
                       Normalize(dbValue, type) != Normalize(expected, type) ||
                       Normalize(sheetValue, type) != Normalize(expected, type);
            })) return plan with { Status = "VERIFY_FAILED" };
            var next = new Dictionary<string, string>(baseline);
            foreach (var change in plan.Changes)
            {
                var key = Key(change.Table, change.Id, change.Field);
                next[key] = change.Direction == "SHEET_TO_DB" ? change.SheetValue : change.DatabaseValue;
            }
            // Keep conflicting keys at their old baseline until Instructor resolves them.
            foreach (var c in plan.Conflicts) next[Key(c.Table, c.Id, c.Field)] = baseline[Key(c.Table, c.Id, c.Field)];

            var con = (NpgsqlConnection)db.Database.GetDbConnection();
            var npgTx = (NpgsqlTransaction)tx.GetDbTransaction();
            await SaveConflictsAsync(quizId, plan.Conflicts, con, npgTx, ct);
            if (!next.OrderBy(x => x.Key).SequenceEqual(baseline.OrderBy(x => x.Key)))
                await StoreAsync(quizId, next, con, npgTx, ct);
            if (operationId.HasValue)
                await SetOperationStatusAsync(operationId.Value, "COMPLETED", con, npgTx, ct);
            await tx.CommitAsync(ct);
            return plan with { Status = plan.Conflicts.Count != 0 ? "CONFLICT" : plan.Changes.Count == 0 ? "IN_SYNC" : "SYNCED" };
        }
        finally
        {
            await using var cmd = new NpgsqlCommand("SELECT pg_advisory_unlock(714923,@id)", lockCon);
            cmd.Parameters.AddWithValue("id", quizId);
            await cmd.ExecuteNonQueryAsync(CancellationToken.None);
        }
    }
}

[ApiController]
[Route("api/quizzes/sync/full")]
[Authorize(Roles = "Instructor")]
public sealed class QuizFullSyncController(
    QuizFullSyncService service,
    ILogger<QuizFullSyncController> logger
) : ControllerBase
{
    private int? InstructorId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet("plan/{quizId:int}")]
    public Task<IActionResult> Plan(int quizId, CancellationToken ct) => Run(quizId, "plan", ct);

    [HttpPost("adopt/{quizId:int}")]
    public Task<IActionResult> Adopt(int quizId, CancellationToken ct) => Run(quizId, "adopt", ct);

    [HttpPost("execute/{quizId:int}")]
    public Task<IActionResult> Execute(int quizId, CancellationToken ct) => Run(quizId, "execute", ct);

    public sealed record RecoveryApproval(Guid OperationId, string ExpectedDatabaseValue, string ExpectedSheetValue);

    [HttpPost("recover-diverged/{quizId:int}")]
    public async Task<IActionResult> RecoverDiverged(int quizId, [FromBody] RecoveryApproval approval, CancellationToken ct)
    {
        var user = InstructorId();
        if (user == null) return Unauthorized();
        if (approval == null || approval.OperationId == Guid.Empty || approval.ExpectedDatabaseValue == null || approval.ExpectedSheetValue == null)
            return BadRequest(new { status = "INVALID_REQUEST" });
        try
        {
            var result = await service.SupersedeDivergedOperationAsync(quizId, user.Value,
                approval.OperationId, approval.ExpectedDatabaseValue, approval.ExpectedSheetValue, ct);
            return result.Status == "RECOVERY_SUPERSEDED" ? Ok(result) :
                result.Status == "NOT_FOUND" ? NotFound(result) : Conflict(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Recovery approval failed for quiz {QuizId}", quizId);
            return StatusCode(500, new { status = "RECOVERY_FAILED", message = "Review journal and live data before retrying." });
        }
    }

    private async Task<IActionResult> Run(int quizId, string mode, CancellationToken ct)
    {
        var user = InstructorId();
        if (user == null) return Unauthorized();

        try
        {
            var result = mode == "plan"
                ? await service.PlanAsync(quizId, user.Value, ct)
                : mode == "adopt"
                    ? await service.AdoptAsync(quizId, user.Value, ct)
                    : await service.ExecuteAsync(quizId, user.Value, ct);

            if (result.Status == "NOT_FOUND") return NotFound(result);
            if (mode == "plan") return Ok(result);
            return result.Status is "BASELINE_ADOPTED" or "BASELINE_ALREADY_EXISTS" or
                "SYNCED" or "SYNCED_SHEET_TO_DB" or "SYNCED_DB_TO_SHEET" or
                "IN_SYNC" or "CONFLICT" or "RECOVERED" or "READY"
                ? Ok(result) : Conflict(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Full sync {Mode} failed for quiz {QuizId}", mode, quizId);
            return StatusCode(500, new
            {
                status = "SYNC_FAILED",
                message = "No success confirmation; inspect DB and Sheet before retrying."
            });
        }
    }
}
