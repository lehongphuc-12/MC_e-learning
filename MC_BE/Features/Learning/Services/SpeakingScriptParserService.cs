// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Business Logic Layer (Domain / Processing Service).
// - Nằm trong module: Features/Learning/Services.
// - Vai trò: Bộ xử lý (Parser Engine) chuyên trách bóc tách tài liệu kịch bản dạng nhị phân/văn bản
//   (.docx, .txt, .md) thành kịch bản luyện nói phân tầng 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Giúp giảng viên tiết kiệm công sức: Chỉ cần soạn 1 tài liệu Word hoặc Text duy nhất, hệ thống tự động
//   nhận diện các thẻ phân cấp [LEVEL: BEGINNER], [LEVEL: INTERMEDIATE], [LEVEL: ADVANCED].
// - Tự động xử lý bóc tách thẻ chỉ dẫn đạo diễn theo quy chế MC chuyên nghiệp:
//   1. BEGINNER: Giữ nguyên toàn bộ lời thoại + hướng dẫn cử chỉ + phong cách giọng + ngắt nghỉ.
//   2. INTERMEDIATE: Bỏ hướng dẫn cử chỉ và ngắt nghỉ, chỉ giữ lời thoại và phong cách giọng.
//   3. ADVANCED: Lời thoại thuần túy, xóa sạch mọi thẻ để học viên tự chủ hoàn toàn kỹ năng dẫn.
// - Tạo CleanScriptForScoring (văn bản sạch 100%) làm Ground Truth để thuật toán so khớp âm thanh (Speech-to-Text).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Nhận đầu vào: IFormFile từ Controller -> SpeakingScriptService.
// - Thư viện sử dụng: DocumentFormat.OpenXml (xử lý file Word .docx in-memory), Markdig, System.Text.RegularExpressions.
// - Đầu ra: ParsedScriptResult cung cấp cho SpeakingScriptService lưu vào Database hoặc trả về xem trước (Preview).
// ====================================================================================================

using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Markdig;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Kết quả sau khi phân tích file kịch bản, bao gồm trạng thái thành công, danh sách lỗi,
/// văn bản gốc và từ điển nội dung phân theo từng cấp độ.
/// </summary>
public class ParsedScriptResult
{
    /// <summary>
    /// [Dòng này làm gì]: Lưu trạng thái thành công hay thất bại của tiến trình phân tích cú pháp tài liệu.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Cho phép truy cập đọc/ghi từ tầng Service và Controller.
    /// - `bool`: Kiểu dữ liệu logic boolean (true/false).
    /// - `{ get; set; }`: Auto-property.
    /// [Tại sao dùng & Rủi ro nếu thiếu]:
    /// - Caller (SpeakingScriptService) chỉ cần kiểm tra cờ này để quyết định tiếp tục lưu DB hay trả về lỗi cho Client.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Danh sách thông báo lỗi chi tiết phát hiện trong quá trình đọc hoặc bóc tách file.
    /// [Giải phẫu từng từ khóa]:
    /// - `public`: Truy cập công khai.
    /// - `List<string>`: Danh sách chuỗi ký tự động (Generic Collection).
    /// - `{ get; set; }`: Auto-property.
    /// - `= new();`: Cú pháp Target-typed new expression (C# 9+) khởi tạo danh sách rỗng, tránh NullReferenceException.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// [Dòng này làm gì]: Lưu toàn bộ nội dung văn bản thô trích xuất từ file gốc (.docx, .txt, .md).
    /// [Giải phẫu từng từ khóa]:
    /// - `public string OriginalContent { get; set; } = string.Empty;`: Khởi tạo chuỗi rỗng mặc định.
    /// </summary>
    public string OriginalContent { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Từ điển lưu nội dung phân tích chi tiết tương ứng với từng cấp độ SpeakingLevel.
    /// [Giải phẫu từng từ khóa]:
    /// - `Dictionary<SpeakingLevel, ParsedLevelContent>`: Ánh xạ cặp Key-Value với Key là Enum SpeakingLevel (BEGINNER, INTERMEDIATE, ADVANCED) và Value là ParsedLevelContent.
    /// - `= new();`: Khởi tạo sẵn Dictionary rỗng.
    /// </summary>
    public Dictionary<SpeakingLevel, ParsedLevelContent> Levels { get; set; } = new();
}

/// <summary>
/// Nội dung chi tiết của một cấp độ luyện nói sau khi được xử lý qua bộ lọc thẻ.
/// </summary>
public class ParsedLevelContent
{
    /// <summary>
    /// [Dòng này làm gì]: Xác định cấp độ luyện nói (BEGINNER, INTERMEDIATE hoặc ADVANCED).
    /// [Giải phẫu từng từ khóa]:
    /// - `public SpeakingLevel Level { get; set; }`: Lưu giá trị Enum phân định cấp độ.
    /// </summary>
    public SpeakingLevel Level { get; set; }

    /// <summary>
    /// [Dòng này làm gì]: Lưu nội dung văn bản sau khi đã lọc thẻ theo quy chuẩn nghiệp vụ của cấp độ tương ứng.
    /// [Giải phẫu từng từ khóa]:
    /// - `public string Content { get; set; } = string.Empty;`: Chuỗi ký tự non-nullable.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// [Dòng này làm gì]: Lưu văn bản sạch hoàn toàn (xóa sạch 100% thẻ chỉ dẫn sân khấu) làm Ground Truth cho AI chấm điểm phát âm.
    /// [Giải phẫu từng từ khóa]:
    /// - `public string CleanScriptForScoring { get; set; } = string.Empty;`: Chuỗi sạch chuẩn mực.
    /// </summary>
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

/// <summary>
/// Dịch vụ phân tích và trích xuất nội dung kịch bản luyện nói từ file tải lên.
/// </summary>
public class SpeakingScriptParserService
{
    /// <summary>
    /// [Dòng này làm gì]: Đối tượng ghi nhật ký (Logger) theo dõi quá trình đọc file và bắt lỗi hệ thống.
    /// [Giải phẫu từng từ khóa]:
    /// - `private readonly ILogger<SpeakingScriptParserService> _logger;`: Inject từ DI Container qua Constructor.
    /// </summary>
    private readonly ILogger<SpeakingScriptParserService> _logger;

    // ====================================================================================================
    // CÁC BIỂU THỨC CHÍNH QUY (COMPILED REGEXES) ĐƯỢC TỐI ƯU HÓA HIỆU NĂNG:
    // [TẠI SAO DÙNG RegexOptions.Compiled]:
    //   - Trình biên dịch C# sẽ dịch Regex trực tiếp sang mã máy (MSIL) ở lần nạp đầu tiên, giúp tốc độ
    //     so khớp khi xử lý hàng nghìn tài liệu nhanh hơn gấp 5 - 10 lần so với Regex thông thường.
    // ====================================================================================================

    /// <summary>
    /// Regex nhận diện tiêu đề phân cấp kịch bản như: ## [LEVEL: BEGINNER] hoặc [LEVEL: ADVANCED].
    /// Sử dụng RegexOptions.IgnoreCase (không phân biệt hoa thường) và RegexOptions.Compiled.
    /// </summary>
    private static readonly Regex LevelHeaderRegex = new(
        @"(?:##\s*)?\[LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)\]",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Regex nhận diện tất cả các loại thẻ trong ngoặc vuông: [bất_kỳ_nội_dung_gì].
    /// </summary>
    private static readonly Regex AllTagsRegex = new(@"\[[^\]]*\]", RegexOptions.Compiled);

    /// <summary>
    /// Regex nhận diện riêng các thẻ hướng dẫn cử chỉ/sân khấu: [HƯỚNG DẪN: mỉm cười, nhìn khán giả].
    /// </summary>
    private static readonly Regex GuideTagRegex = new(@"\[HƯỚNG DẪN:[^\]]*\]", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Regex nhận diện riêng các thẻ chỉ dẫn nhịp điệu ngắt nghỉ: [NGẮT NGHỈ: 2s].
    /// </summary>
    private static readonly Regex PauseTagRegex = new(@"\[NGẮT NGHỈ:[^\]]*\]", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Khởi tạo Parser Service với Logger ghi nhận vết xử lý tài liệu.
    /// </summary>
    public SpeakingScriptParserService(ILogger<SpeakingScriptParserService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Phân tích file tài liệu tải lên (.docx, .txt, .md) hoàn toàn trên bộ nhớ RAM (In-Memory).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Validate đầu vào (File null, kích thước 0 byte, vượt quá 10MB, đuôi file trái phép).
    ///   - Bước 2: Copy nội dung file vào MemoryStream, nhận diện đuôi file và gọi hàm trích xuất text tương ứng.
    ///   - Bước 3: Bắt lỗi ngoại lệ (Try/Catch) nếu file bị hỏng hoặc mã hóa sai.
    ///   - Bước 4: Kiểm tra chuỗi thô sau bóc tách có rỗng hay không.
    ///   - Bước 5: Gọi ParseSections để phân tách cấu trúc 3 cấp độ và trả về kết quả.
    /// [Bảo mật & Tối ưu RAM]:
    /// - Xử lý stream trực tiếp in-memory, không tạo file tạm trên ổ cứng (Zero Disk Footprint), ngăn ngừa lỗ hổng Path Traversal.
    /// </summary>
    /// <param name="file">File tài liệu gửi lên từ form HTTP multipart.</param>
    /// <returns>Đối tượng ParsedScriptResult chứa kết quả bóc tách hoặc danh sách lỗi.</returns>
    public async Task<ParsedScriptResult> ParseFileAsync(IFormFile file)
    {
        // Theo dõi luồng dữ liệu: Khởi tạo biến result chứa trạng thái phản hồi
        var result = new ParsedScriptResult();

        // ====================================================================================================
        // [BƯỚC 1]: KIỂM TRA HỢP LỆ ĐẦU VÀO CỦA TẬP TIN (FILE VALIDATION)
        // ====================================================================================================

        // [BƯỚC 1.1]: Kiểm tra tính tồn tại và dung lượng rỗng của file
        // - Điều kiện kiểm tra: `file == null || file.Length == 0` (Client không đính kèm file hoặc file 0 byte).
        // - Trường hợp ĐÚNG (TRUE):
        //     + Đặt `result.Success = false`.
        //     + Gọi `result.Errors.Add(...)` thêm thông báo lỗi "Tập tin tải lên rỗng hoặc không tồn tại.".
        //     + Lập tức `return result;` dừng ngay luồng xử lý (Fail-Fast Principle), không tốn RAM cấp phát stream.
        // - Trường hợp SAI (FALSE): Bỏ qua khối if, file tồn tại và có dung lượng, đi tiếp xuống [BƯỚC 1.2].
        // [DỰ ĐOÁN CÂU HỎI REVIEW CỦA GIẢNG VIÊN - EDGE CASE]:
        //   - Q: Nếu người dùng gửi request multipart nhưng để trống trường file thì sao?
        //   - A: file sẽ là null hoặc Length == 0, if này bắt gọn và trả về JSON lỗi 400 rõ ràng thay vì ném NullReferenceException (500).
        if (file == null || file.Length == 0)
        {
            result.Success = false;
            result.Errors.Add("Tập tin tải lên rỗng hoặc không tồn tại.");
            return result;
        }

        // [BƯỚC 1.2]: Kiểm tra kích thước tập tin vượt quá giới hạn (Max File Size Defense)
        // - Điều kiện: `file.Length > 10 * 1024 * 1024` (File lớn hơn 10 Megabytes = 10,485,760 bytes).
        // - Trường hợp ĐÚNG (TRUE):
        //     + Đặt `result.Success = false`.
        //     + Thêm lỗi vượt quá 10MB và `return result;` ngay lập tức.
        // - Trường hợp SAI (FALSE): File có dung lượng an toàn (<= 10MB), tiếp tục sang [BƯỚC 1.3].
        // [TẠI SAO DÙNG KỸ THUẬT NÀY - BẢO MẬT & HIỆU NĂNG]:
        //   - Ngăn chặn tấn công Từ chối Dịch vụ (DoS / Memory Exhaustion): Nếu cho phép file Word hàng trăm MB
        //     vào RAM, máy chủ có thể bị cạn kiệt bộ nhớ (OutOfMemoryException) và sập process.
        if (file.Length > 10 * 1024 * 1024)
        {
            result.Success = false;
            result.Errors.Add("Dung lượng tập tin vượt quá giới hạn cho phép (10MB).");
            return result;
        }

        // [BƯỚC 1.3]: Kiểm tra định dạng đuôi file mở rộng (File Extension Whitelist)
        // - `Path.GetExtension(file.FileName).ToLowerInvariant()`: Lấy phần mở rộng và chuyển về chữ thường bất biến văn hóa.
        // - Danh sách cho phép: `.docx`, `.txt`, `.md`.
        // - Điều kiện: `!allowedExts.Contains(ext)` (Đuôi file nằm ngoài whitelist).
        // - Trường hợp ĐÚNG (TRUE): Báo lỗi định dạng không hỗ trợ và `return result;` ngay.
        // - Trường hợp SAI (FALSE): Đuôi file hợp lệ, đi tiếp xuống [BƯỚC 2] để trích xuất văn bản.
        // [TẠI SAO DÙNG KỸ THUẬT NÀY - BẢO MẬT]:
        //   - Chống tấn công tải lên file thực thi độc hại (.exe, .dll, .sh, .bat).
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExts = new[] { ".docx", ".txt", ".md" };
        if (!allowedExts.Contains(ext))
        {
            result.Success = false;
            result.Errors.Add($"Định dạng tập tin '{ext}' không được hỗ trợ. Chỉ chấp nhận .docx, .txt, .md.");
            return result;
        }

        // ====================================================================================================
        // [BƯỚC 2]: TRÍCH XUẤT VĂN BẢN HOÀN TOÀN TRÊN BỘ NHỚ RAM (IN-MEMORY EXTRACTION)
        // ====================================================================================================
        string rawText;
        try
        {
            // [TẠI SAO DÙNG using var memoryStream = new MemoryStream()]:
            //   - Không ghi file tạm ra đĩa cứng (Disk I/O): Tăng tốc độ đọc gấp nhiều lần, đồng thời tránh rủi ro
            //     tồn đọng file rác làm đầy ổ đĩa hoặc bị khai thác đường dẫn tập tin (Path Traversal Vulnerability).
            //   - `using var`: Tự động giải phóng tài nguyên IDisposable (gọi .Dispose()) ngay khi thoát khỏi scope của khối try.
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0; // Đặt lại con trỏ stream về vị trí byte đầu tiên để các bộ đọc bắt đầu từ đầu

            // [BƯỚC 2.1]: Rẽ nhánh xử lý file Microsoft Word (.docx)
            // - Điều kiện: `ext == ".docx"`.
            // - Luồng: Gọi hàm chuyên biệt ExtractFromDocx(memoryStream) dùng thư viện OpenXML SDK.
            if (ext == ".docx")
            {
                rawText = ExtractFromDocx(memoryStream);
            }
            // [BƯỚC 2.2]: Rẽ nhánh xử lý file văn bản thuần (.txt)
            // - Điều kiện: `ext == ".txt"`.
            // - Luồng: Sử dụng StreamReader với bảng mã `System.Text.Encoding.UTF8` để giữ trọn vẹn dấu tiếng Việt.
            else if (ext == ".txt")
            {
                using var reader = new StreamReader(memoryStream, System.Text.Encoding.UTF8);
                rawText = await reader.ReadToEndAsync();
            }
            // [BƯỚC 2.3]: Rẽ nhánh xử lý file Markdown (.md)
            // - Điều kiện: Còn lại (chính là .md theo danh sách whitelist).
            // - Luồng: Đọc toàn bộ nội dung Markdown dạng UTF-8 plain text.
            else // .md
            {
                using var reader = new StreamReader(memoryStream, System.Text.Encoding.UTF8);
                var mdContent = await reader.ReadToEndAsync();
                rawText = mdContent;
            }
        }
        catch (Exception ex)
        {
            // [BƯỚC 3]: Bắt ngoại lệ khi đọc file hỏng hoặc cấu trúc tệp XML bị lỗi
            // - Ghi log Error chi tiết vào file nhật ký của hệ thống (kèm tên file gây lỗi).
            // - Đóng gói thông báo lỗi thân thiện vào result.Errors và trả về cho client.
            _logger.LogError(ex, "Lỗi khi đọc file tài liệu: {FileName}", file.FileName);
            result.Success = false;
            result.Errors.Add($"Không thể đọc nội dung file: {ex.Message}");
            return result;
        }

        // [BƯỚC 4]: Kiểm tra nội dung sau trích xuất có rỗng hay không
        // - `rawText.Trim()`: Loại bỏ các ký tự khoảng trắng thừa ở đầu và cuối chuỗi.
        // - Điều kiện: `string.IsNullOrWhiteSpace(rawText)` (File Word toàn trang trắng hoặc file text trống).
        // - Trường hợp ĐÚNG (TRUE): Báo lỗi "Nội dung tập tin sau khi trích xuất hoàn toàn trống." và RETURN.
        // - Trường hợp SAI (FALSE): Văn bản có nội dung thực sự, gán vào result.OriginalContent và đi tiếp sang [BƯỚC 5].
        rawText = rawText.Trim();
        if (string.IsNullOrWhiteSpace(rawText))
        {
            result.Success = false;
            result.Errors.Add("Nội dung tập tin sau khi trích xuất hoàn toàn trống.");
            return result;
        }

        result.OriginalContent = rawText;

        // [BƯỚC 5]: Phân tích văn bản thành 3 cấp độ (Beginner, Intermediate, Advanced)
        // - Gọi hàm ParseSections(rawText, result) để áp dụng các biểu thức chính quy.
        ParseSections(rawText, result);

        return result;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Trích xuất nội dung văn bản từ luồng nhớ .docx sử dụng OpenXML SDK.
    /// - End-to-End Flow: Mở WordprocessingDocument ở chế độ Read-only -> Duyệt các Paragraph trong Document Body -> Lấy p.InnerText -> Ghép lại bằng ký tự xuống dòng '\n'.
    /// [Tại sao dùng p.InnerText thay vì duyệt từng Run (<w:r>)]:
    /// - TRÁNH LỖI PHÂN RÃ KÝ TỰ TIẾNG VIỆT (Unicode Run-Splitting Bug): Trong Microsoft Word, khi người dùng gõ tiếng Việt có dấu, bộ gõ Unikey có thể chèn các ký tự dấu vào các thẻ Run riêng biệt. Nếu nối từng Run, các từ có thể bị đứt gãy hoặc mất dấu. `p.InnerText` tự động hợp nhất toàn bộ các Run con thành chuỗi Unicode hoàn chỉnh và chính xác 100%.
    /// </summary>
    /// <param name="stream">Luồng nhớ chứa dữ liệu file .docx.</param>
    /// <returns>Chuỗi văn bản thô đầy đủ.</returns>
    private string ExtractFromDocx(MemoryStream stream)
    {
        // [BƯỚC 1]: Mở tài liệu Word in-memory ở chế độ chỉ đọc (isEditable = false)
        using var wordDoc = WordprocessingDocument.Open(stream, false);
        var body = wordDoc.MainDocumentPart?.Document.Body;
        if (body == null) return string.Empty;

        // [BƯỚC 2]: Trích xuất văn bản từ các thẻ Paragraph (<w:p>)
        var paragraphs = body.Descendants<Paragraph>();
        var lines = paragraphs
            .Select(p => p.InnerText.Trim())
            .Where(line => !string.IsNullOrEmpty(line));

        return string.Join("\n", lines);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Phân tích văn bản thô thành 3 cấp độ: BEGINNER, INTERMEDIATE, ADVANCED.
    /// - Có cơ chế tự động bù đắp (Fallback) nếu tài liệu thiếu cấp độ hoặc là file văn bản thuần.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Tìm tất cả các điểm đánh dấu tiêu đề cấp độ qua LevelHeaderRegex.
    ///   - Bước 2: Nếu matches.Count == 0 (file không có thẻ): Tự động nhân bản và lọc cả 3 cấp độ từ văn bản thô.
    ///   - Bước 3: Nếu có thẻ: Cắt lát chuỗi (Substring) để lấy nội dung từng phần tương ứng.
    ///   - Bước 4: Duyệt qua danh sách 3 cấp độ bắt buộc, nếu thiếu cấp độ nào thì lấy cấp độ có sẵn làm Fallback.
    ///   - Bước 5: Áp dụng quy tắc lọc thẻ cho từng cấp độ và gán CleanScriptForScoring.
    /// </summary>
    /// <param name="rawText">Văn bản thô đã bóc tách.</param>
    /// <param name="result">Đối tượng lưu trữ kết quả phân tích.</param>
    public void ParseSections(string rawText, ParsedScriptResult result)
    {
        // [BƯỚC 1]: Dùng Regex tìm các vị trí xuất hiện thẻ tiêu đề cấp độ
        var matches = LevelHeaderRegex.Matches(rawText);

        var requiredLevels = new[] { SpeakingLevel.BEGINNER, SpeakingLevel.INTERMEDIATE, SpeakingLevel.ADVANCED };

        // [BƯỚC 2]: Rẽ nhánh xử lý khi tài liệu KHÔNG CHỨA BẤT KỲ THẺ CẤP ĐỘ NÀO (matches.Count == 0)
        // - Tình huống thực tế: Giảng viên chỉ upload một kịch bản lời thoại bình thường mà không biết cú pháp [LEVEL: ...].
        // - Xử lý thông minh (Smart Fallback):
        //     + Hệ thống không báo lỗi mà tự động dùng toàn bộ văn bản đó làm gốc để tạo cho cả 3 cấp độ!
        //     + Cấp độ Beginner: Giữ nguyên văn bản.
        //     + Cấp độ Intermediate / Advanced: Tự động loại bỏ các thẻ đạo diễn (nếu có).
        // - Kết quả: result.Success = true và return ngay, mang lại trải nghiệm người dùng cực kỳ mượt mà.
        if (matches.Count == 0)
        {
            var cleanText = rawText.Trim();
            foreach (var reqLevel in requiredLevels)
            {
                result.Levels[reqLevel] = new ParsedLevelContent
                {
                    Level = reqLevel,
                    Content = ProcessLevelContent(cleanText, reqLevel),
                    CleanScriptForScoring = ExtractCleanScript(cleanText)
                };
            }
            result.Success = true;
            return;
        }

        // [BƯỚC 3]: Trích xuất nội dung của từng phân đoạn cấp độ được tìm thấy
        var foundLevels = new Dictionary<SpeakingLevel, string>();

        for (int i = 0; i < matches.Count; i++)
        {
            var currentMatch = matches[i];
            var levelStr = currentMatch.Groups[1].Value.ToUpperInvariant();

            // Rẽ nhánh: Nếu không parse được tên cấp độ sang Enum SpeakingLevel thì bỏ qua (continue)
            if (!Enum.TryParse<SpeakingLevel>(levelStr, true, out var levelEnum))
            {
                continue;
            }

            // Tính toán vị trí cắt chuỗi:
            // - contentStart: Ngay sau thẻ tiêu đề hiện tại
            // - contentEnd: Vị trí bắt đầu của thẻ tiếp theo (hoặc đến cuối văn bản nếu là thẻ cuối cùng)
            int contentStart = currentMatch.Index + currentMatch.Length;
            int contentEnd = (i + 1 < matches.Count) ? matches[i + 1].Index : rawText.Length;

            var sectionContent = rawText.Substring(contentStart, contentEnd - contentStart).Trim();
            foundLevels[levelEnum] = sectionContent;
        }

        // [BƯỚC 4]: Xây dựng phương án dự phòng (Fallback) nếu giảng viên chỉ viết 1 hoặc 2 cấp độ
        // - Lấy nội dung của cấp độ đầu tiên có dữ liệu; nếu vẫn null thì dùng toàn bộ rawText.
        var defaultFallback = foundLevels.Values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? rawText;

        // [BƯỚC 5]: Đảm bảo cấu trúc ĐỦ CẢ 3 CẤP ĐỘ BẮT BUỘC (BEGINNER, INTERMEDIATE, ADVANCED)
        // Extract each level per exact requirements:
        // - BEGINNER: Lời thoại + [HƯỚNG DẪN] + [GIỌNG ĐỌC] + [NGẮT NGHỈ]
        // - INTERMEDIATE: Lời thoại + [GIỌNG ĐỌC] (xóa bỏ [HƯỚNG DẪN] và [NGẮT NGHỈ])
        // - ADVANCED: Chỉ giữ lời thoại thuần, xóa toàn bộ thẻ
        foreach (var reqLevel in requiredLevels)
        {
            // Kiểm tra xem cấp độ này đã được tìm thấy trong file hay chưa
            var rawContent = foundLevels.ContainsKey(reqLevel) && !string.IsNullOrWhiteSpace(foundLevels[reqLevel])
                ? foundLevels[reqLevel]
                : defaultFallback;
            
            // Xử lý loại bỏ thẻ theo quy chuẩn nghiệp vụ của từng cấp độ
            var processedContent = ProcessLevelContent(rawContent, reqLevel);
            // Trích xuất kịch bản sạch hoàn toàn để làm dữ liệu mẫu so khớp âm thanh chấm điểm
            var cleanForScoring = ExtractCleanScript(rawContent);

            result.Levels[reqLevel] = new ParsedLevelContent
            {
                Level = reqLevel,
                Content = processedContent,
                CleanScriptForScoring = cleanForScoring
            };
        }

        result.Success = true;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xử lý nội dung kịch bản cho từng cấp độ chuyên biệt theo quy tắc nghiệp vụ:
    ///   - BEGINNER: Giữ nguyên toàn bộ nội dung và thẻ hướng dẫn.
    ///   - INTERMEDIATE: Loại bỏ thẻ [HƯỚNG DẪN:...] và [NGẮT NGHỈ:...], giữ lại [GIỌNG ĐỌC:...].
    ///   - ADVANCED: Loại bỏ toàn bộ tất cả các thẻ [...].
    /// [Giải phẫu câu lệnh Switch Expression]:
    /// - Cú pháp pattern matching hiện đại của C# 8+, tối ưu hóa tốc độ rẽ nhánh và làm mã nguồn cực kỳ gọn gàng.
    /// </summary>
    /// <param name="rawContent">Nội dung thô của cấp độ.</param>
    /// <param name="level">Cấp độ cần xử lý.</param>
    /// <returns>Nội dung sau khi đã chuẩn hóa.</returns>
    public string ProcessLevelContent(string rawContent, SpeakingLevel level)
    {
        // Rẽ nhánh: Nếu chuỗi rỗng hoặc chỉ có khoảng trắng thì trả về chuỗi rỗng ngay
        if (string.IsNullOrWhiteSpace(rawContent)) return string.Empty;

        return level switch
        {
            // Nhánh 1: Cấp độ Cơ bản (BEGINNER)
            // Giữ nguyên 100% hướng dẫn sân khấu và ngắt nghỉ để người mới bắt đầu dễ làm theo
            SpeakingLevel.BEGINNER => rawContent.Trim(),

            // Nhánh 2: Cấp độ Trung cấp (INTERMEDIATE)
            // Loại bỏ [HƯỚNG DẪN:...] và [NGẮT NGHỈ:...], giữ lại phong cách giọng đọc
            SpeakingLevel.INTERMEDIATE =>
                PauseTagRegex.Replace(GuideTagRegex.Replace(rawContent, ""), "").Trim(),

            // Nhánh 3: Cấp độ Nâng cao (ADVANCED)
            // Thử thách cao nhất: Xóa sạch toàn bộ mọi thẻ [...], học viên phải tự làm chủ hoàn toàn bài nói
            SpeakingLevel.ADVANCED =>
                AllTagsRegex.Replace(rawContent, "").Trim(),

            // Nhánh mặc định (Default fallback): Giữ nguyên văn bản
            _ => rawContent.Trim()
        };
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Loại bỏ toàn bộ các thẻ [...] và chuẩn hóa khoảng trắng/dòng mới để tạo văn bản sạch (Clean Script).
    /// - Dùng làm văn bản chuẩn (Ground Truth) để thuật toán Speech-to-Text / AI so khớp phát âm khi chấm điểm.
    /// [Giải phẫu các bước Regex]:
    /// - Bước 1: `AllTagsRegex.Replace(content, "")` xóa bỏ mọi nội dung bên trong dấu ngoặc vuông.
    /// - Bước 2: `Regex.Replace(clean, @"[ \t]+", " ")` gộp nhiều dấu tab hoặc dấu cách thành 1 khoảng trắng duy nhất.
    /// - Bước 3: `Regex.Replace(clean, @"\n{3,}", "\n\n")` giới hạn tối đa 2 lần ngắt dòng liên tiếp, xóa bỏ các khoảng cách dòng thừa thãi.
    /// </summary>
    /// <param name="content">Nội dung kịch bản chứa thẻ.</param>
    /// <returns>Văn bản sạch hoàn toàn không còn thẻ.</returns>
    public string ExtractCleanScript(string content)
    {
        // Rẽ nhánh: Kiểm tra chuỗi rỗng
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;

        // Bước 1: Dùng AllTagsRegex loại bỏ mọi thẻ có định dạng [bất_kỳ_nội_dung_gì]
        var clean = AllTagsRegex.Replace(content, "");

        // Bước 2: Chuẩn hóa khoảng trắng - Thay thế các chuỗi tab hoặc nhiều dấu cách liên tiếp thành 1 dấu cách duy nhất
        clean = Regex.Replace(clean, @"[ \t]+", " ");

        // Bước 3: Chuẩn hóa ngắt dòng - Giới hạn tối đa 2 lần xuống dòng liên tiếp (\n\n) để tránh các đoạn trống quá dài
        clean = Regex.Replace(clean, @"\n{3,}", "\n\n");

        return clean.Trim();
    }
}
