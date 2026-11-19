using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.VoiceJourney.Entities;
using MC_BE.Features.VoiceJourney.Services;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.VoiceJourney.Controllers;

[ApiController]
[Authorize(Roles = "Learner")]
[Route("api/voice-coach")]
public sealed class VoiceJourneyController : ControllerBase
{
    private readonly SmartMcDbContext _db;
    private readonly IVoiceAiEntitlementService _entitlements;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private int LearnerId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public VoiceJourneyController(SmartMcDbContext db, IVoiceAiEntitlementService entitlements)
    { _db = db; _entitlements = entitlements; }

    // AI Voice Coach là phòng luyện tập bổ trợ do Admin quản lý,
    // không phụ thuộc Enrollment của khóa học MC thông thường.
    private bool HasIdentity => LearnerId > 0;

    [HttpGet("access")]
    public async Task<IActionResult> Access(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        var entitlements = await _entitlements.GetEntitlementsAsync(LearnerId, ct);
        var active = await _entitlements.HasActiveEntitlementAsync(LearnerId, ct: ct);
        return Ok(new
        {
            hasAccess = active,
            source = "AI_ENTITLEMENTS",
            activeCount = entitlements.Count(x => x.Status == "ACTIVE"),
            entitlements = entitlements.Select(x => new { x.Id, x.SourceType, x.SourceCourseId, x.GrantedAt, x.ExpiresAt, x.Status }),
            message = active ? "Bạn còn quyền sử dụng AI Voice Journey." : "Bạn chưa có quyền AI còn hiệu lực. Hãy mua AI Voice Journey hoặc khóa MC có tặng quyền AI."
        });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();

        var profile = await _db.VoiceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LearnerId == LearnerId, ct);

        var diagnostic = await _db.VoiceDiagnosticAttempts.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return Ok(new { profile, hasDiagnostic = diagnostic != null, diagnostic });
    }

    public sealed record ProfileRequest(string Goal, string Experience, string? Region, int MinutesPerDay);

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileRequest req, CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();

        var goals = new[] { "GENERAL", "WEDDING_MC", "EVENT_MC", "NEWS_MC" };
        var experiences = new[] { "BEGINNER", "INTERMEDIATE", "ADVANCED" };

        if (string.IsNullOrWhiteSpace(req.Goal) ||
            !goals.Contains(req.Goal.Trim().ToUpperInvariant()) ||
            string.IsNullOrWhiteSpace(req.Experience) ||
            !experiences.Contains(req.Experience.Trim().ToUpperInvariant()) ||
            req.MinutesPerDay is < 5 or > 180 ||
            (req.Region?.Length ?? 0) > 50)
            return BadRequest(new { message = "Thông tin mục tiêu, kinh nghiệm hoặc thời lượng luyện tập không hợp lệ." });

        var profile = await _db.VoiceProfiles.FirstOrDefaultAsync(x => x.LearnerId == LearnerId, ct);
        if (profile == null)
        {
            profile = new VoiceProfile { LearnerId = LearnerId };
            _db.VoiceProfiles.Add(profile);
        }

        profile.Goal = req.Goal.Trim().ToUpperInvariant();
        profile.Experience = req.Experience.Trim().ToUpperInvariant();
        profile.Region = req.Region?.Trim();
        profile.MinutesPerDay = req.MinutesPerDay;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(profile);
    }

    [HttpPost("diagnostics/skip")]
    public IActionResult SkipDiagnostic()
    {
        if (!HasIdentity) return Unauthorized();
        return Ok(new
        {
            skipped = true,
            recommendationMode = "CATALOG_DEFAULT",
            message = "Bạn có thể tự chọn bất kỳ bài luyện nào. AI sẽ cá nhân hóa khi có dữ liệu đánh giá hoặc luyện tập."
        });
    }

    public sealed record DiagnosticRequest(int PracticeSessionId);

    [HttpPost("diagnostics")]
    public async Task<IActionResult> SaveDiagnostic([FromBody] DiagnosticRequest req, CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        if (!await _entitlements.HasActiveEntitlementAsync(LearnerId, ct: ct))
            return StatusCode(403, new { code = "AI_ENTITLEMENT_REQUIRED", message = "Quyền AI đã hết hạn hoặc chưa được cấp. Hồ sơ và lịch sử của bạn vẫn được bảo lưu." });

        var assessment = await ReadAssessment(req.PracticeSessionId, ct);
        if (assessment == null)
            return BadRequest(new { message = "Phiên ghi âm chưa hoàn tất hoặc không thuộc tài khoản của bạn." });

        var existing = await _db.VoiceDiagnosticAttempts.FirstOrDefaultAsync(
            x => x.LearnerId == LearnerId && x.PracticeSessionId == req.PracticeSessionId, ct);

        if (existing == null)
        {
            existing = new VoiceDiagnosticAttempt
            {
                LearnerId = LearnerId,
                PracticeSessionId = req.PracticeSessionId,
                ModelVersion = assessment.Value.ModelVersion,
                PredictionsJson = JsonSerializer.Serialize(assessment.Value.Predictions),
                CreatedAt = DateTime.UtcNow
            };
            _db.VoiceDiagnosticAttempts.Add(existing);
        }
        else
        {
            existing.ModelVersion = assessment.Value.ModelVersion;
            existing.PredictionsJson = JsonSerializer.Serialize(assessment.Value.Predictions);
            existing.CreatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        var roadmap = await RebuildRoadmapAsync(req.PracticeSessionId, assessment.Value.ModelVersion, ct);

        return Ok(new
        {
            diagnosticId = existing.Id,
            existing.PracticeSessionId,
            existing.ModelVersion,
            predictions = assessment.Value.Predictions,
            roadmapVersion = roadmap?.Version,
            message = "Đã lưu đánh giá đầu vào và cập nhật gợi ý luyện tập."
        });
    }

    [HttpGet("lessons")]
    public async Task<IActionResult> Lessons(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();

        var lessons = await _db.VoiceLessons.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id)
            .Select(x => new
            {
                x.Id, x.SkillId, x.Title, x.Description, x.Difficulty,
                x.DurationMinutes, x.VideoUrl, x.DocumentUrl, x.DocumentTitle,
                skillName = _db.VoiceSkills.Where(s => s.Id == x.SkillId).Select(s => s.Name).FirstOrDefault(),
                exercises = _db.VoiceExercises.Where(e => e.LessonId == x.Id && e.IsActive)
                    .OrderBy(e => e.DisplayOrder)
                    .Select(e => new { e.Id, e.Title, e.ExerciseType, e.Instructions, e.PracticeText })
                    .ToList()
            }).ToListAsync(ct);

        return Ok(lessons);
    }

    [HttpGet("recommendations")]
    public async Task<IActionResult> Recommendations(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        var roadmap = await _db.VoiceRoadmaps.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.Version).FirstOrDefaultAsync(ct);
        if (roadmap == null && await _entitlements.HasActiveEntitlementAsync(LearnerId, ct: ct))
            roadmap = await RebuildRoadmapAsync(null, null, ct);
        var rows = await BuildRecommendationsAsync(ct);
        return Ok(rows.Select((x, index) => new
        {
            x.Id, x.SkillId, x.SkillName, x.Title, x.Description, x.Difficulty,
            x.DurationMinutes, x.VideoUrl, x.DocumentUrl, x.DocumentTitle, x.Exercises, x.Score, x.IsPersonalized,
            x.Reason, x.CompletedAttempts, order = index + 1,
            roadmapVersion = roadmap?.Version
        }));
    }

    [HttpGet("roadmap/current")]
    public async Task<IActionResult> CurrentRoadmap(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        var roadmap = await _db.VoiceRoadmaps.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.Version).FirstOrDefaultAsync(ct);

        if (roadmap == null && await _entitlements.HasActiveEntitlementAsync(LearnerId, ct: ct))
            roadmap = await RebuildRoadmapAsync(null, null, ct);
        if (roadmap == null) return Ok(new { roadmap = (object?)null, items = Array.Empty<object>() });

        var items = await _db.VoiceRoadmapItems.AsNoTracking()
            .Where(x => x.RoadmapId == roadmap.Id)
            .OrderBy(x => x.DayNumber)
            .Select(x => new
            {
                x.Id, order = x.DayNumber, x.LessonId, x.ErrorCode, x.Title,
                x.Instructions, x.DurationMinutes, x.Priority, x.IsCompleted, x.CompletedAt
            }).ToListAsync(ct);

        return Ok(new { roadmap, items });
    }

    [HttpGet("roadmap/history")]
    public async Task<IActionResult> RoadmapHistory(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        var rows = await _db.VoiceRoadmaps.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.Version)
            .Select(x => new { x.Id, x.Version, x.Goal, x.ModelVersion, x.CreatedAt, x.SourcePracticeSessionId })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("progress")]
    public async Task<IActionResult> Progress(CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();

        var rows = await _db.VoiceExerciseAttempts.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .GroupBy(x => x.ExerciseId)
            .Select(g => new
            {
                exerciseId = g.Key,
                attempts = g.Count(),
                lastPracticedAt = g.Max(x => x.CreatedAt)
            }).ToListAsync(ct);

        var latestRoadmap = await _db.VoiceRoadmaps.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.Version).Select(x => new { x.Version, x.CreatedAt })
            .FirstOrDefaultAsync(ct);

        return Ok(new { totalAttempts = rows.Sum(x => x.attempts), exercises = rows, latestRoadmap });
    }

    public sealed record AttemptRequest(int PracticeSessionId);

    [HttpPost("exercises/{exerciseId:int}/attempts")]
    public async Task<IActionResult> RecordAttempt(int exerciseId, [FromBody] AttemptRequest req, CancellationToken ct)
    {
        if (!HasIdentity) return Unauthorized();
        if (!await _entitlements.HasActiveEntitlementAsync(LearnerId, ct: ct))
            return StatusCode(403, new { code = "AI_ENTITLEMENT_REQUIRED", message = "Quyền AI đã hết hạn hoặc chưa được cấp. Hồ sơ và lịch sử của bạn vẫn được bảo lưu." });

        var exercise = await _db.VoiceExercises.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == exerciseId && x.IsActive, ct);
        if (exercise == null) return NotFound(new { message = "Không tìm thấy bài tập." });

        var assessment = await ReadAssessment(req.PracticeSessionId, ct);
        if (assessment == null)
            return BadRequest(new { message = "Phiên ghi âm chưa hoàn tất hoặc không thuộc tài khoản của bạn." });

        var attempt = new VoiceExerciseAttempt
        {
            LearnerId = LearnerId,
            ExerciseId = exerciseId,
            PracticeSessionId = req.PracticeSessionId,
            ModelVersion = assessment.Value.ModelVersion,
            PredictionsJson = JsonSerializer.Serialize(assessment.Value.Predictions),
            FeedbackJson = assessment.Value.FeedbackJson,
            CreatedAt = DateTime.UtcNow
        };

        _db.VoiceExerciseAttempts.Add(attempt);
        await _db.SaveChangesAsync(ct);

        var roadmap = await RebuildRoadmapAsync(req.PracticeSessionId, assessment.Value.ModelVersion, ct);

        return Ok(new
        {
            attempt.Id, attempt.ExerciseId, attempt.PracticeSessionId,
            predictions = assessment.Value.Predictions,
            roadmapVersion = roadmap?.Version,
            message = "Đã lưu kết quả luyện tập. Bài học không bị khóa; gợi ý sẽ được cập nhật."
        });
    }

    private sealed record RecommendationRow(
        int Id, int SkillId, string SkillName, string Title, string Description,
        string Difficulty, int DurationMinutes, string? VideoUrl, string? DocumentUrl, string? DocumentTitle,
        List<ExerciseDto> Exercises, double Score, bool IsPersonalized,
        string Reason, int CompletedAttempts);

    private sealed record ExerciseDto(int Id, string Title, string ExerciseType, string Instructions, string? PracticeText);

    private async Task<List<RecommendationRow>> BuildRecommendationsAsync(CancellationToken ct)
    {
        var profile = await _db.VoiceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LearnerId == LearnerId, ct);

        var skills = await _db.VoiceSkills.AsNoTracking()
            .Where(x => x.IsActive).ToDictionaryAsync(x => x.Id, ct);

        var activeSkillIds = skills.Keys.ToArray();
        var lessons = await _db.VoiceLessons.AsNoTracking()
            .Where(x => x.IsPublished && activeSkillIds.Contains(x.SkillId))
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(ct);

        var publishedLessonIds = lessons.Select(l => l.Id).ToArray();
        var exercises = await _db.VoiceExercises.AsNoTracking()
            .Where(x => x.IsActive && publishedLessonIds.Contains(x.LessonId))
            .OrderBy(x => x.DisplayOrder).ToListAsync(ct);

        var mappings = await _db.VoiceSkillModelMappings.AsNoTracking()
            .Where(x => x.IsActive && x.IsCalibrated &&
                x.SignalDirection != "UNKNOWN").ToListAsync(ct);

        var diagnostic = await _db.VoiceDiagnosticAttempts.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);

        var attempts = await _db.VoiceExerciseAttempts.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

        var latest = new Dictionary<string, (double Value, DateTime At)>(StringComparer.OrdinalIgnoreCase);
        if (diagnostic != null)
            AddLatest(latest, ParsePredictions(diagnostic.PredictionsJson), diagnostic.CreatedAt);

        foreach (var attempt in attempts)
            AddLatest(latest, ParsePredictions(attempt.PredictionsJson), attempt.CreatedAt);

        var result = new List<RecommendationRow>();
        foreach (var lesson in lessons)
        {
            var score = 0d;
            var personalized = false;
            var reasons = new List<string>();
            var skill = skills[lesson.SkillId];

            foreach (var mapping in mappings.Where(m => m.SkillId == lesson.SkillId))
            {
                if (!latest.TryGetValue(mapping.ModelLabel, out var prediction)) continue;
                var raw = prediction.Value;
                if (!double.IsFinite(raw) || raw < 0 || raw > 1) continue;

                var weakness = mapping.SignalDirection == "HIGHER_IS_WORSE" ? raw : 1d - raw;
                score += weakness * 0.65d;
                personalized = true;
                if (weakness >= 0.65d) reasons.Add($"Model ghi nhận tín hiệu cần ưu tiên ở kỹ năng {skill.Name}.");
                else if (weakness >= 0.35d) reasons.Add($"Nên tiếp tục củng cố kỹ năng {skill.Name}.");
            }

            var lessonExercises = exercises.Where(x => x.LessonId == lesson.Id).ToList();
            var exerciseIds = lessonExercises.Select(x => x.Id).ToHashSet();
            var completedAttempts = attempts.Count(x => exerciseIds.Contains(x.ExerciseId));

            if (completedAttempts == 0)
            {
                score += 0.15d;
                reasons.Add("Bạn chưa thực hành bài này.");
            }
            else
            {
                // Không coi số lần làm nhiều là tiến bộ; giữ bài ở mức ôn tập thấp hơn.
                score += 0.03d;
                reasons.Add($"Bạn đã thực hành {completedAttempts} lần; có thể luyện lại để củng cố.");
            }

            if (profile != null)
            {
                if (string.Equals(lesson.Difficulty, profile.Experience, StringComparison.OrdinalIgnoreCase))
                    score += 0.10d;
                else if (profile.Experience == "BEGINNER" && lesson.Difficulty == "ADVANCED")
                    score -= 0.15d;

                if (lesson.DurationMinutes <= profile.MinutesPerDay)
                    score += 0.08d;
                else
                    score -= 0.04d;

                var goalKeywords = profile.Goal switch
                {
                    "WEDDING_MC" => new[] { "cưới", "đám cưới", "wedding", "ceremony", "tiệc" },
                    "EVENT_MC" => new[] { "sự kiện", "event", "sân khấu", "dẫn chương trình" },
                    "NEWS_MC" => new[] { "bản tin", "news", "tin tức", "phát thanh" },
                    _ => Array.Empty<string>()
                };

                var searchable = $"{skill.Name} {skill.Description} {lesson.Title} {lesson.Description}".ToLowerInvariant();
                if (goalKeywords.Any(k => searchable.Contains(k)))
                {
                    score += 0.12d;
                    reasons.Add("Nội dung phù hợp với mục tiêu luyện giọng của bạn.");
                }
            }

            if (!personalized)
                reasons.Add("Gợi ý theo thư viện mặc định vì chưa có tín hiệu model đã hiệu chuẩn.");

            result.Add(new RecommendationRow(
                lesson.Id, lesson.SkillId, skill.Name, lesson.Title, lesson.Description,
                lesson.Difficulty, lesson.DurationMinutes, lesson.VideoUrl, lesson.DocumentUrl, lesson.DocumentTitle,
                lessonExercises.Select(e => new ExerciseDto(e.Id, e.Title, e.ExerciseType, e.Instructions, e.PracticeText)).ToList(),
                Math.Round(Math.Clamp(score, 0d, 1d), 4), personalized,
                string.Join(" ", reasons), completedAttempts));
        }

        return result.OrderByDescending(x => x.Score).ThenBy(x => x.DurationMinutes).ThenBy(x => x.Id).ToList();
    }

    private async Task<VoiceRoadmap?> RebuildRoadmapAsync(int? sourceSessionId, string? modelVersion, CancellationToken ct)
    {
        var rows = await BuildRecommendationsAsync(ct);
        var profile = await _db.VoiceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LearnerId == LearnerId, ct);

        var latestDiagnostic = await _db.VoiceDiagnosticAttempts.AsNoTracking()
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        sourceSessionId ??= latestDiagnostic?.PracticeSessionId;
        modelVersion ??= latestDiagnostic?.ModelVersion ?? "CATALOG_DEFAULT";

        var current = await _db.VoiceRoadmaps
            .Where(x => x.LearnerId == LearnerId)
            .OrderByDescending(x => x.Version).FirstOrDefaultAsync(ct);

        var currentItems = current == null
            ? new List<VoiceRoadmapItem>()
            : await _db.VoiceRoadmapItems.AsNoTracking()
                .Where(x => x.RoadmapId == current.Id)
                .OrderBy(x => x.DayNumber).ToListAsync(ct);

        var targetGoal = profile?.Goal ?? "GENERAL";
        var targetModelVersion = modelVersion ?? "CATALOG_DEFAULT";
        var same = currentItems.Count == rows.Count &&
            currentItems.Select(x => x.LessonId).SequenceEqual(rows.Select(x => (int?)x.Id)) &&
            currentItems.Zip(rows).All(pair => Math.Abs(pair.First.Priority - pair.Second.Score) < 0.0001d) &&
            current != null &&
            string.Equals(current.Goal, targetGoal, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(current.ModelVersion, targetModelVersion, StringComparison.OrdinalIgnoreCase);

        if (same) return current;

        var roadmap = new VoiceRoadmap
        {
            LearnerId = LearnerId,
            Version = (current?.Version ?? 0) + 1,
            SourcePracticeSessionId = sourceSessionId,
            Goal = targetGoal,
            ModelVersion = targetModelVersion,
            CreatedAt = DateTime.UtcNow
        };
        _db.VoiceRoadmaps.Add(roadmap);
        await _db.SaveChangesAsync(ct);

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            _db.VoiceRoadmapItems.Add(new VoiceRoadmapItem
            {
                RoadmapId = roadmap.Id,
                DayNumber = i + 1, // Thứ tự ưu tiên, không phải ngày học bắt buộc.
                LessonId = row.Id,
                ErrorCode = (await _db.VoiceSkills.AsNoTracking()
                    .Where(x => x.Id == row.SkillId).Select(x => x.SkillCode).FirstOrDefaultAsync(ct)) ?? "GENERAL",
                Title = row.Title,
                Instructions = row.Reason,
                DurationMinutes = row.DurationMinutes,
                Priority = row.Score,
                IsCompleted = row.CompletedAttempts > 0
            });

            _db.VoiceRecommendationSnapshots.Add(new VoiceRecommendationSnapshot
            {
                LearnerId = LearnerId,
                LessonId = row.Id,
                Score = row.Score,
                Reason = row.Reason,
                Source = row.IsPersonalized ? "HYBRID_MODEL" : "CATALOG_DEFAULT",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return roadmap;
    }

    private async Task<(string ModelVersion, Dictionary<string, double> Predictions, string? FeedbackJson)?> ReadAssessment(
        int sessionId, CancellationToken ct)
    {
        var session = await _db.AIPracticeSessions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.PracticeSessionId == sessionId &&
                x.LearnerId == LearnerId && x.Status == "COMPLETED", ct);
        if (session == null) return null;

        var feedback = await _db.AIPracticeFeedbacks.AsNoTracking()
            .Where(x => x.PracticeSessionId == sessionId && x.LearnerId == LearnerId)
            .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);
        if (feedback == null) return null;

        var predictions = ParsePredictions(feedback.PredictionJson);
        return predictions.Count == 0 ? null : (feedback.ModelVersion, predictions, feedback.FeedbackJson);
    }

    private static void AddLatest(
        Dictionary<string, (double Value, DateTime At)> target,
        Dictionary<string, double> source, DateTime at)
    {
        foreach (var item in source)
            if (!target.TryGetValue(item.Key, out var old) || at > old.At)
                target[item.Key] = (item.Value, at);
    }

    private static Dictionary<string, double> ParsePredictions(string? json)
    {
        var result = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(json)) return result;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            JsonElement predictions = root;

            if (root.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in root.EnumerateObject())
                {
                    if (string.Equals(property.Name, "predictions", StringComparison.OrdinalIgnoreCase))
                    {
                        predictions = property.Value;
                        break;
                    }
                }
            }

            if (predictions.ValueKind != JsonValueKind.Object) return result;
            foreach (var property in predictions.EnumerateObject())
                if (property.Value.ValueKind == JsonValueKind.Number &&
                    property.Value.TryGetDouble(out var value) &&
                    double.IsFinite(value))
                    result[property.Name] = value;
        }
        catch (JsonException)
        {
            // JSON lỗi thì không dùng dữ liệu đó để cá nhân hóa.
        }

        return result;
    }
}
