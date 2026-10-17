
using System.IO.Compression;
using System.Xml.Linq;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class QuizSheetReader(IConfiguration config)
{
    public const string SpreadsheetId = "1SIV9GdGHGgYlHioSqcWhGg6Xm6IPz9FLYJR4updgKMs";

    public static readonly string[] Names =
    [
        "Courses", "Lessons", "QuizPlan", "Quizzes", "Questions",
        "Choices", "Media", "ErrorRegions", "Annotations",
        "ArrangeItems", "WritingConfigs", "ScenarioNodes",
        "ScenarioChoices", "DataSources"
    ];

    public async Task<SheetsService> ConnectAsync(CancellationToken ct)
    {
        var path = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) throw new InvalidOperationException("GOOGLE_APPLICATION_CREDENTIALS is missing or invalid.");
        var credential = (await GoogleCredential.FromFileAsync(path, ct)).CreateScoped(SheetsService.Scope.Spreadsheets);
        return new SheetsService(new BaseClientService.Initializer { HttpClientInitializer = credential, ApplicationName = "MSEEK LMS" });
    }

    public async Task<Dictionary<string, List<Dictionary<string, string>>>> ReadGoogleAsync(CancellationToken ct)
    {
        using var client = await ConnectAsync(ct);
        var req = client.Spreadsheets.Values.BatchGet(SpreadsheetId);
        req.Ranges = Names.Select(n => $"'{n}'!A1:AZ").ToList();
        var response = await req.ExecuteAsync(ct);
        var result = new Dictionary<string, List<Dictionary<string, string>>>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < Names.Length; i++) result[Names[i]] = ParseRows(response.ValueRanges?.ElementAtOrDefault(i)?.Values);
        return result;
    }

    public static Dictionary<string, List<Dictionary<string, string>>> ReadExcel(Stream stream)
    {
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, true);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        XNamespace rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        XNamespace pkg = "http://schemas.openxmlformats.org/package/2006/relationships";
        var wb = XDocument.Load(archive.GetEntry("xl/workbook.xml")!.Open());
        var relationships = XDocument.Load(archive.GetEntry("xl/_rels/workbook.xml.rels")!.Open());
        var targets = relationships.Descendants(pkg + "Relationship").ToDictionary(x => (string)x.Attribute("Id")!, x => (string)x.Attribute("Target")!);
        var stringsEntry = archive.GetEntry("xl/sharedStrings.xml");
        var strings = stringsEntry == null ? new List<string>() : XDocument.Load(stringsEntry.Open()).Descendants(ns + "si").Select(x => string.Concat(x.Descendants(ns + "t").Select(t => t.Value))).ToList();
        var output = new Dictionary<string, List<Dictionary<string, string>>>(StringComparer.OrdinalIgnoreCase);

        foreach (var sh in wb.Descendants(ns + "sheet"))
        {
            var name = (string)sh.Attribute("name")!;
            if (!Names.Contains(name, StringComparer.OrdinalIgnoreCase)) continue;
            var target = targets[(string)sh.Attribute(rel + "id")!].TrimStart('/');
            var path = target.StartsWith("xl/") ? target : "xl/" + target;
            var entry = archive.GetEntry(path.Replace("\\", "/"));
            if (entry == null) throw new InvalidDataException($"Missing worksheet {name}.");
            var doc = XDocument.Load(entry.Open());
            var values = new List<IList<object>>();

            foreach (var row in doc.Descendants(ns + "sheetData").Elements(ns + "row"))
            {
                var cells = new SortedDictionary<int, object>();
                foreach (var c in row.Elements(ns + "c"))
                {
                    var address = (string?)c.Attribute("r") ?? "A1";
                    var letters = new string(address.TakeWhile(char.IsLetter).ToArray());
                    var col = 0;
                    foreach (var ch in letters) col = col * 26 + char.ToUpperInvariant(ch) - 'A' + 1;
                    var type = (string?)c.Attribute("t");
                    var raw = (string?)c.Element(ns + "v") ?? "";
                    string value = type == "s" && int.TryParse(raw, out var idx) && idx < strings.Count ? strings[idx] : type == "inlineStr" ? string.Concat(c.Descendants(ns + "t").Select(x => x.Value)) : type == "b" ? (raw == "1" ? "TRUE" : "FALSE") : raw;
                    cells[col - 1] = value;
                }
                values.Add(Enumerable.Range(0, cells.Count == 0 ? 0 : cells.Keys.Max() + 1).Select(i => cells.TryGetValue(i, out var v) ? v : "").ToList());
            }

            output[name] = ParseRows(values);
        }

        foreach (var name in Names) output.TryAdd(name, new());
        return output;
    }

    public static List<Dictionary<string, string>> ParseRows(IList<IList<object>>? values)
    {
        var rows = new List<Dictionary<string, string>>();
        if (values == null || values.Count == 0) return rows;
        var headers = values[0].Select(v => v?.ToString()?.Trim() ?? "").ToArray();

        for (var r = 1; r < values.Count; r++)
        {
            var record = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["_row"] = (r + 1).ToString() };
            for (var c = 0; c < headers.Length; c++)
                if (headers[c].Length > 0)
                    record[headers[c]] = c < values[r].Count ? values[r][c]?.ToString()?.Trim() ?? "" : "";

            if (record.Any(x => x.Key != "_row" && !string.IsNullOrWhiteSpace(x.Value))) rows.Add(record);
        }

        return rows;
    }
}
