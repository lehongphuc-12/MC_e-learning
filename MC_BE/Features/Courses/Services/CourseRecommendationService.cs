using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;

namespace MC_BE.Features.Courses.Services;

public class CourseRecommendationService : ICourseRecommendationService
{
    private readonly SmartMcDbContext _context;
    private readonly ILogger<CourseRecommendationService> _logger;

    public CourseRecommendationService(SmartMcDbContext context, ILogger<CourseRecommendationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<CourseRecommendationDto>> GetTopRecommendationsAsync(int userId, int top = 3)
    {
        var response = await GetRecommendationsAsync(userId, top);
        return response.Courses;
    }

    public async Task<CourseRecommendationResponse> GetRecommendationsAsync(int userId, int limit = 10)
    {
        if (limit <= 0) limit = 10;

        // 1. Lấy thông tin khảo sát của học viên (nếu có)
        var preferences = await _context.UserLearningPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        // 2. Lấy danh sách khóa học mà học viên đã đăng ký / sở hữu
        var userEnrollments = await _context.Enrollments
            .AsNoTracking()
            .Include(e => e.Course)
            .Where(e => e.LearnerId == userId)
            .ToListAsync();

        var enrolledCourseIds = userEnrollments.Select(e => e.CourseId).ToHashSet();

        // 3. Khóa học đã hoàn thành (tiến độ >= 80% hoặc trạng thái COMPLETED hoặc có chứng chỉ)
        var certificateCourseIds = await _context.Certificates
            .AsNoTracking()
            .Include(c => c.Enrollment)
            .Where(c => c.Enrollment != null && c.Enrollment.LearnerId == userId && c.Status == "ACTIVE")
            .Select(c => c.Enrollment.CourseId)
            .Distinct()
            .ToListAsync();

        var completedCourseIds = userEnrollments
            .Where(e => e.CompletionPercentage >= 80m || e.Status == "COMPLETED")
            .Select(e => e.CourseId)
            .Union(certificateCourseIds)
            .ToHashSet();

        // 4. Lấy lịch sử Speaking Submissions của học viên
        var speakingSubmissions = await _context.SpeakingSubmissions
            .AsNoTracking()
            .Where(s => s.LearnerId == userId)
            .ToListAsync();

        // 5. Lấy danh sách Remedial Assignments được giao cho học viên
        var remedialAssignments = await _context.RemedialAssignmentRecipients
            .AsNoTracking()
            .Include(r => r.Assignment)
            .Where(r => r.StudentId == userId)
            .ToListAsync();

        // 6. Lấy tương tác Forum của học viên (chủ đề bài đăng hoặc bình luận)
        var forumTopicNames = await GetUserForumTopicsAsync(userId);

        // 7. Xác định kỹ năng yếu nhất của học viên (từ Rubric, điểm 0/thấp, Remedial và Preferences bổ trợ)
        var weakSkills = ExtractLearnerWeakSkills(speakingSubmissions, remedialAssignments, preferences);

        // 8. Xác định danh mục yêu thích và cấp độ học viên
        var targetCategories = ExtractTargetCategories(userEnrollments, forumTopicNames, preferences);
        var learnerLevel = DetermineLearnerLevel(userEnrollments, preferences);

        // 9. Lấy danh sách các khóa học PUBLISHED mà học viên CHƯA đăng ký / chưa mua
        var candidateCourses = await _context.Courses
            .AsNoTracking()
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .Include(c => c.PrerequisiteCourse)
            .Where(c => c.Status == CourseStatus.PUBLISHED && !enrolledCourseIds.Contains(c.CourseId))
            .ToListAsync();

        // Nếu người dùng đã sở hữu tất cả các khóa học, sử dụng toàn bộ khóa học để xếp hạng fallback
        if (candidateCourses.Count == 0)
        {
            candidateCourses = await _context.Courses
                .AsNoTracking()
                .Include(c => c.Category)
                .Include(c => c.Instructor)
                .Include(c => c.Lessons)
                .Include(c => c.Enrollments)
                .Include(c => c.PrerequisiteCourse)
                .Where(c => c.Status == CourseStatus.PUBLISHED)
                .ToListAsync();
        }

        int maxEnrollments = candidateCourses
            .Select(c => c.Enrollments?.Count ?? 0)
            .DefaultIfEmpty(1)
            .Max();
        if (maxEnrollments <= 0) maxEnrollments = 1;

        bool hasActualLearningData = userEnrollments.Count > 0 || speakingSubmissions.Count > 0 || remedialAssignments.Count > 0;
        bool isColdStart = !hasActualLearningData;

        // 10. Tính toán điểm đề xuất cho từng khóa học
        var scoredList = new List<CourseRecommendationDto>();

        foreach (var course in candidateCourses)
        {
            var scoredCourse = ScoreCourse(
                course,
                weakSkills,
                targetCategories,
                learnerLevel,
                completedCourseIds,
                maxEnrollments,
                isColdStart);

            scoredList.Add(scoredCourse);
        }

        var sortedCourses = scoredList
            .OrderByDescending(c => c.TotalScore)
            .ThenByDescending(c => c.PopularityScore)
            .Take(limit)
            .ToList();

        return new CourseRecommendationResponse
        {
            IsColdStart = isColdStart,
            UserExperienceLevel = preferences?.ExperienceLevel ?? learnerLevel.ToString(),
            TargetCategories = targetCategories.ToList(),
            FocusSkills = weakSkills.Select(w => w.SkillName).ToList(),
            Courses = sortedCourses
        };
    }

    private CourseRecommendationDto ScoreCourse(
        Course course,
        List<SkillWeakness> weakSkills,
        HashSet<string> targetCategories,
        CourseLevel targetLevel,
        HashSet<int> completedCourseIds,
        int maxEnrollments,
        bool isColdStart)
    {
        // ---------------------------------------------------------------------
        // 1. SkillGapScore (trọng số 0.35, thang 0.0 -> 1.0)
        // ---------------------------------------------------------------------
        var courseSkills = SplitTags(course.SkillTags);
        double skillGapScore = 0.0;
        string? matchedWeakSkillName = null;

        if (weakSkills.Count > 0)
        {
            var matched = new List<SkillWeakness>();
            foreach (var ws in weakSkills)
            {
                if (courseSkills.Any(cs => IsSkillMatch(cs, ws.SkillCode, ws.SkillName)))
                {
                    matched.Add(ws);
                }
            }

            if (matched.Count > 0)
            {
                // Chọn kỹ năng yếu nhất được khóa học hỗ trợ
                var topWeak = matched.OrderByDescending(m => m.Severity).First();
                matchedWeakSkillName = topWeak.SkillName;

                // Nếu khóa học bao phủ hầu hết hoặc tất cả kỹ năng yếu -> 1.0, khớp một phần -> 0.5
                if (matched.Count >= Math.Min(2, weakSkills.Count))
                {
                    skillGapScore = 1.0;
                }
                else
                {
                    skillGapScore = 0.5;
                }
            }
            else
            {
                skillGapScore = 0.0;
            }
        }
        else
        {
            skillGapScore = 0.0;
        }

        // ---------------------------------------------------------------------
        // 2. CategoryAndLevelScore (trọng số 0.30, thang 0.0 -> 1.0)
        // ---------------------------------------------------------------------
        double categoryPoint = 0.0;
        string? matchedCategoryName = null;

        if (course.Category != null && !string.IsNullOrWhiteSpace(course.Category.CategoryName))
        {
            if (targetCategories.Any(tc =>
                string.Equals(tc, course.Category.CategoryName, StringComparison.OrdinalIgnoreCase) ||
                course.Category.CategoryName.Contains(tc, StringComparison.OrdinalIgnoreCase) ||
                tc.Contains(course.Category.CategoryName, StringComparison.OrdinalIgnoreCase)))
            {
                categoryPoint = 0.6;
                matchedCategoryName = course.Category.CategoryName;
            }
        }

        if (categoryPoint == 0.0 && targetCategories.Count > 0)
        {
            var found = targetCategories.FirstOrDefault(tc =>
                course.Title.Contains(tc, StringComparison.OrdinalIgnoreCase));
            if (found != null)
            {
                categoryPoint = 0.6;
                matchedCategoryName = found;
            }
        }

        double levelPoint = 0.0;
        bool isAllLevels = course.Level == CourseLevel.ALL_LEVELS;

        if (course.Level.HasValue && course.Level.Value == targetLevel)
        {
            levelPoint = 0.4;
        }
        else if (isAllLevels)
        {
            levelPoint = 0.3;
        }
        else if (targetLevel == CourseLevel.BEGINNER && course.Level == CourseLevel.INTERMEDIATE)
        {
            levelPoint = 0.15;
        }

        double categoryAndLevelScore = Math.Min(1.0, categoryPoint + levelPoint);

        // ---------------------------------------------------------------------
        // 3. NextStepScore (trọng số 0.25, thang 0.0 -> 1.0)
        // ---------------------------------------------------------------------
        double nextStepScore = 0.0;
        string? prerequisiteCourseTitle = null;

        if (course.PrerequisiteCourseId.HasValue && completedCourseIds.Contains(course.PrerequisiteCourseId.Value))
        {
            nextStepScore = 1.0;
            prerequisiteCourseTitle = course.PrerequisiteCourse?.Title ?? $"Khóa học #{course.PrerequisiteCourseId.Value}";
        }

        // ---------------------------------------------------------------------
        // 4. PopularityScore (trọng số 0.10, thang 0.0 -> 1.0)
        // ---------------------------------------------------------------------
        int enrollmentsCount = course.Enrollments?.Count ?? 0;
        double normEnrollment = Math.Min(1.0, (double)enrollmentsCount / maxEnrollments);

        // Rating: ước tính trung bình chất lượng khóa học
        double rating = CalculateEstimatedRating(course, enrollmentsCount);
        double normRating = Math.Min(1.0, rating / 5.0);

        double popularityScore = Math.Min(1.0, (0.7 * normEnrollment) + (0.3 * normRating));

        // ---------------------------------------------------------------------
        // 5. TotalScore = (0.35 * SkillGapScore) + (0.30 * CategoryAndLevelScore)
        //                + (0.25 * NextStepScore) + (0.10 * PopularityScore)
        // ---------------------------------------------------------------------
        double totalScore = (0.35 * skillGapScore)
            + (0.30 * categoryAndLevelScore)
            + (0.25 * nextStepScore)
            + (0.10 * popularityScore);

        totalScore = Math.Round(Math.Min(1.0, totalScore), 2);

        // ---------------------------------------------------------------------
        // 6. Sinh lý do đề xuất (RecommendationReason)
        // Quy tắc ưu tiên theo yêu cầu:
        // - Nếu NextStepScore == 1.0: "Bước tiếp theo sau khóa [Tên khóa tiên quyết]"
        // - Nếu SkillGapScore >= 0.5: "Giúp cải thiện kỹ năng [Tên kỹ năng yếu]"
        // - Nếu CategoryAndLevelScore >= 0.6: "Phù hợp với định hướng [Tên danh mục] của bạn"
        // - Trường hợp mặc định: "Khóa học nền tảng được đánh giá cao"
        // ---------------------------------------------------------------------
        string recommendationReason;
        if (nextStepScore == 1.0 && !string.IsNullOrEmpty(prerequisiteCourseTitle))
        {
            recommendationReason = $"Bước tiếp theo sau khóa {prerequisiteCourseTitle}";
        }
        else if (skillGapScore >= 0.5 && !string.IsNullOrEmpty(matchedWeakSkillName))
        {
            recommendationReason = $"Giúp cải thiện kỹ năng {matchedWeakSkillName}";
        }
        else if (categoryAndLevelScore >= 0.6 && !string.IsNullOrEmpty(matchedCategoryName))
        {
            recommendationReason = $"Phù hợp với định hướng {matchedCategoryName} của bạn";
        }
        else if (categoryAndLevelScore >= 0.6 && course.Category != null)
        {
            recommendationReason = $"Phù hợp với định hướng {course.Category.CategoryName} của bạn";
        }
        else
        {
            recommendationReason = "Khóa học nền tảng được đánh giá cao";
        }

        // Tính thời lượng hiển thị từ các bài học
        string duration = FormatCourseDuration(course.Lessons);

        // Tính giá gốc và phần trăm giảm giá hiển thị
        decimal price = course.Price;
        decimal originalPrice = price > 0 ? Math.Round(price * 1.25m, 0) : 0m;
        int discountPercent = price > 0 ? 20 : 0;
        int reviewCount = Math.Max(enrollmentsCount, 1);

        return new CourseRecommendationDto
        {
            Id = course.CourseId,
            CourseId = course.CourseId,
            Title = course.Title,
            Slug = course.Slug,
            Description = course.Description,
            ThumbnailUrl = course.ThumbnailUrl,
            CategoryName = course.Category?.CategoryName,
            CategoryId = course.CategoryId,
            InstructorName = course.Instructor?.FullName ?? "Giảng viên MC Chuyên nghiệp",
            InstructorId = course.InstructorId,
            Level = course.Level?.ToString(),
            Duration = duration,
            Rating = Math.Round(rating, 1),
            ReviewCount = reviewCount,
            Price = price,
            OriginalPrice = originalPrice,
            DiscountPercent = discountPercent,
            IsFree = course.IsFree,
            SkillTags = course.SkillTags,
            PrerequisiteCourseId = course.PrerequisiteCourseId,
            PrerequisiteCourseTitle = course.PrerequisiteCourse?.Title,

            TotalScore = totalScore,
            SkillGapScore = Math.Round(skillGapScore, 2),
            CategoryAndLevelScore = Math.Round(categoryAndLevelScore, 2),
            NextStepScore = Math.Round(nextStepScore, 2),
            PopularityScore = Math.Round(popularityScore, 2),
            RecommendationReason = recommendationReason,
            IsColdStartRecommendation = isColdStart
        };
    }

    private static string FormatCourseDuration(ICollection<Lesson>? lessons)
    {
        if (lessons == null || lessons.Count == 0) return "Chưa cập nhật";
        int totalMinutes = lessons.Sum(l => l.DurationMinutes);
        if (totalMinutes <= 0) return $"{lessons.Count} bài học";

        int hours = totalMinutes / 60;
        int minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0)
            return $"{hours} giờ {minutes} phút";
        if (hours > 0)
            return $"{hours} giờ";
        return $"{minutes} phút";
    }

    private static double CalculateEstimatedRating(Course course, int enrollmentsCount)
    {
        // Khóa học có đánh giá cao từ 4.7 đến 5.0
        if (enrollmentsCount > 20) return 4.9;
        if (enrollmentsCount > 5) return 4.8;
        if (course.Level == CourseLevel.BEGINNER) return 4.9;
        return 4.8;
    }

    private async Task<List<string>> GetUserForumTopicsAsync(int userId)
    {
        try
        {
            var userPostTopicIds = await _context.Set<ForumPost>()
                .AsNoTracking()
                .Where(p => p.AuthorId == userId)
                .Select(p => p.TopicId)
                .Distinct()
                .ToListAsync();

            var userCommentTopicIds = await _context.Set<ForumComment>()
                .AsNoTracking()
                .Where(c => c.AuthorId == userId && c.Post != null)
                .Select(c => c.Post.TopicId)
                .Distinct()
                .ToListAsync();

            var combinedTopicIds = userPostTopicIds.Union(userCommentTopicIds).Distinct().ToList();

            if (combinedTopicIds.Count == 0) return new List<string>();

            return await _context.Set<ForumTopic>()
                .AsNoTracking()
                .Where(t => combinedTopicIds.Contains(t.TopicId))
                .Select(t => t.Name)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể lấy lịch sử tương tác forum cho user {UserId}", userId);
            return new List<string>();
        }
    }

    private static List<SkillWeakness> ExtractLearnerWeakSkills(
        List<SpeakingSubmission> submissions,
        List<RemedialAssignmentRecipient> remedials,
        UserLearningPreferences? preferences)
    {
        var weaknessMap = new Dictionary<string, SkillWeakness>(StringComparer.OrdinalIgnoreCase);

        // 1. Phân tích từ các bài tập bị giao Remedial Assignment (mức độ nghiêm trọng cao: 3.0)
        foreach (var r in remedials)
        {
            var text = $"{r.Assignment?.Title} {r.Assignment?.Reason}";
            CheckAndAddWeakness(text, "Pronunciation", "Phát âm", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "SpeechRate", "Tốc độ nói", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "Intonation", "Ngữ điệu", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "Improvisation", "Xử lý tình huống", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "StagePresence", "Làm chủ sân khấu", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "VoiceClarity", "Độ tròn vành rõ chữ", 3.0, weaknessMap);
            CheckAndAddWeakness(text, "BreathControl", "Kiểm soát hơi thở", 3.0, weaknessMap);
        }

        // 2. Phân tích từ Speaking Submissions (điểm liệt = 0 hoặc điểm < 70)
        foreach (var sub in submissions)
        {
            double severity = 0.0;
            if (sub.Score.HasValue && sub.Score.Value == 0m)
            {
                severity = 3.5; // Điểm liệt = 0
            }
            else if (sub.Score.HasValue && sub.Score.Value < 70m)
            {
                severity = 2.0; // Điểm yếu dưới trung bình
            }

            if (severity > 0)
            {
                // Kiểm tra Rubric Scores được nhúng trong Feedback: <!--RUBRIC_SCORES:(.*?)-->
                if (!string.IsNullOrWhiteSpace(sub.Feedback))
                {
                    var match = Regex.Match(sub.Feedback, @"<!--RUBRIC_SCORES:(.*?)-->", RegexOptions.Singleline);
                    if (match.Success)
                    {
                        var rubricRaw = match.Groups[1].Value;
                        CheckAndAddWeakness(rubricRaw, "Pronunciation", "Phát âm", severity, weaknessMap);
                        CheckAndAddWeakness(rubricRaw, "SpeechRate", "Tốc độ nói", severity, weaknessMap);
                        CheckAndAddWeakness(rubricRaw, "Intonation", "Ngữ điệu", severity, weaknessMap);
                        CheckAndAddWeakness(rubricRaw, "Improvisation", "Xử lý tình huống", severity, weaknessMap);
                    }
                }

                var text = $"{sub.Note} {sub.Feedback}";
                CheckAndAddWeakness(text, "Pronunciation", "Phát âm", severity, weaknessMap);
                CheckAndAddWeakness(text, "SpeechRate", "Tốc độ nói", severity, weaknessMap);
                CheckAndAddWeakness(text, "Intonation", "Ngữ điệu", severity, weaknessMap);
                CheckAndAddWeakness(text, "Improvisation", "Xử lý tình huống", severity, weaknessMap);
                CheckAndAddWeakness(text, "BreathControl", "Kiểm soát hơi thở", severity, weaknessMap);
            }
        }

        // 3. Kết hợp FocusSkills từ UserLearningPreferences nếu học viên đã chọn trong khảo sát
        if (preferences != null && !string.IsNullOrWhiteSpace(preferences.FocusSkills))
        {
            var prefSkills = SplitTags(preferences.FocusSkills);
            foreach (var fs in prefSkills)
            {
                string skillName = TranslateSkillName(fs);
                // Nếu chưa có từ bài tập thực tế, thêm vào với severity 1.5 làm tín hiệu định hướng
                if (!weaknessMap.ContainsKey(fs))
                {
                    weaknessMap[fs] = new SkillWeakness(fs, skillName, 1.5);
                }
            }
        }

        return weaknessMap.Values.OrderByDescending(w => w.Severity).ToList();
    }

    private static void CheckAndAddWeakness(
        string text,
        string skillCode,
        string skillName,
        double severity,
        Dictionary<string, SkillWeakness> map)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        if (text.Contains(skillCode, StringComparison.OrdinalIgnoreCase) ||
            text.Contains(skillName, StringComparison.OrdinalIgnoreCase))
        {
            if (map.TryGetValue(skillCode, out var existing))
            {
                existing.Severity = Math.Max(existing.Severity, severity);
            }
            else
            {
                map[skillCode] = new SkillWeakness(skillCode, skillName, severity);
            }
        }
    }

    private static HashSet<string> ExtractTargetCategories(
        List<Enrollment> enrollments,
        List<string> forumTopics,
        UserLearningPreferences? preferences)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Từ khóa học đã đăng ký
        foreach (var e in enrollments)
        {
            if (e.Course?.Category != null && !string.IsNullOrWhiteSpace(e.Course.Category.CategoryName))
            {
                set.Add(e.Course.Category.CategoryName);
            }
        }

        // Từ Forum topics
        foreach (var topic in forumTopics)
        {
            if (!string.IsNullOrWhiteSpace(topic))
            {
                set.Add(topic);
            }
        }

        // Từ khảo sát UserLearningPreferences
        if (preferences != null && !string.IsNullOrWhiteSpace(preferences.TargetCategories))
        {
            var prefCats = SplitTags(preferences.TargetCategories);
            foreach (var c in prefCats)
            {
                set.Add(c);
            }
        }

        return set;
    }

    private static CourseLevel DetermineLearnerLevel(
        List<Enrollment> enrollments,
        UserLearningPreferences? preferences)
    {
        // Nếu user có khảo sát kinh nghiệm thì ưu tiên
        if (preferences != null && !string.IsNullOrWhiteSpace(preferences.ExperienceLevel))
        {
            if (Enum.TryParse<CourseLevel>(preferences.ExperienceLevel, true, out var prefLvl))
            {
                return prefLvl;
            }
            if (preferences.ExperienceLevel.Contains("Beginner", StringComparison.OrdinalIgnoreCase))
                return CourseLevel.BEGINNER;
            if (preferences.ExperienceLevel.Contains("Intermediate", StringComparison.OrdinalIgnoreCase))
                return CourseLevel.INTERMEDIATE;
            if (preferences.ExperienceLevel.Contains("Advanced", StringComparison.OrdinalIgnoreCase))
                return CourseLevel.ADVANCED;
        }

        // Nếu học viên đã học các khóa
        if (enrollments.Count > 0)
        {
            var maxEnrolledLevel = enrollments
                .Select(e => e.Course?.Level)
                .Where(l => l.HasValue && l.Value != CourseLevel.ALL_LEVELS)
                .OrderByDescending(l => l)
                .FirstOrDefault();

            if (maxEnrolledLevel.HasValue)
            {
                return maxEnrolledLevel.Value;
            }
        }

        // Mặc định ưu tiên Beginner cho học viên mới
        return CourseLevel.BEGINNER;
    }

    private static bool IsSkillMatch(string courseSkill, string weakCode, string weakName)
    {
        return string.Equals(courseSkill, weakCode, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(courseSkill, weakName, StringComparison.OrdinalIgnoreCase) ||
               courseSkill.Contains(weakCode, StringComparison.OrdinalIgnoreCase) ||
               courseSkill.Contains(weakName, StringComparison.OrdinalIgnoreCase) ||
               weakCode.Contains(courseSkill, StringComparison.OrdinalIgnoreCase);
    }

    private static string TranslateSkillName(string skill)
    {
        return skill.ToLowerInvariant() switch
        {
            "pronunciation" => "Phát âm & thanh điệu",
            "speechrate" => "Tốc độ & nhịp điệu",
            "intonation" => "Ngữ điệu & cảm xúc",
            "improvisation" => "Xử lý tình huống",
            "stagepresence" => "Làm chủ sân khấu",
            "breathcontrol" => "Kiểm soát hơi thở",
            "voiceclarity" => "Độ rõ và vang của giọng",
            _ => skill
        };
    }

    private static List<string> SplitTags(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags)) return new();
        return tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }

    private class SkillWeakness
    {
        public string SkillCode { get; set; }
        public string SkillName { get; set; }
        public double Severity { get; set; }

        public SkillWeakness(string code, string name, double severity)
        {
            SkillCode = code;
            SkillName = name;
            Severity = severity;
        }
    }
}
