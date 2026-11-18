using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Features.VoiceJourney.Entities;

// ======================================================
// 1. VOICE PROFILE
// Lưu hồ sơ và mục tiêu luyện giọng của học viên
// ======================================================

[Table("voice_profiles")]
public sealed class VoiceProfile
{
    [Key]
    public int Id { get; set; }

    public int LearnerId { get; set; }

    [MaxLength(40)]
    public string Goal { get; set; } = "GENERAL";

    [MaxLength(30)]
    public string Experience { get; set; } = "BEGINNER";

    [MaxLength(50)]
    public string? Region { get; set; }

    public int MinutesPerDay { get; set; } = 20;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}


// ======================================================
// 2. VOICE ROADMAP
// Lưu phiên bản lộ trình cũ
// ======================================================

[Table("voice_roadmaps")]
public sealed class VoiceRoadmap
{
    [Key]
    public int Id { get; set; }

    public int LearnerId { get; set; }

    public int Version { get; set; }

    public int? SourcePracticeSessionId { get; set; }

    [MaxLength(40)]
    public string Goal { get; set; } = "GENERAL";

    [MaxLength(50)]
    public string ModelVersion { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


// ======================================================
// 3. VOICE ROADMAP ITEM
// Lưu từng nội dung trong lộ trình cũ
// ======================================================

[Table("voice_roadmap_items")]
public sealed class VoiceRoadmapItem
{
    [Key]
    public int Id { get; set; }

    public int RoadmapId { get; set; }

    // Lesson được đề xuất; DayNumber được dùng như thứ tự ưu tiên, không phải ngày bắt buộc.
    public int? LessonId { get; set; }

    public int DayNumber { get; set; }

    [MaxLength(40)]
    public string ErrorCode { get; set; } = "";

    [MaxLength(200)]
    public string Title { get; set; } = "";

    [MaxLength(2000)]
    public string Instructions { get; set; } = "";

    public int DurationMinutes { get; set; }

    public double Priority { get; set; }

    public bool IsCompleted { get; set; }

    public DateTime? CompletedAt { get; set; }
}


// ======================================================
// 4. VOICE SKILL
// Tiêu chí luyện giọng do Admin quản lý
// ======================================================

[Table("voice_skills")]
public sealed class VoiceSkill
{
    [Key]
    public int Id { get; set; }

    [MaxLength(40)]
    public string SkillCode { get; set; } = "";

    [MaxLength(120)]
    public string Name { get; set; } = "";

    [MaxLength(1000)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }
}


// ======================================================
// 5. VOICE LESSON
// Bài học chuẩn do Admin thiết lập
// ======================================================

[Table("voice_lessons")]
public sealed class VoiceLesson
{
    [Key]
    public int Id { get; set; }

    public int SkillId { get; set; }

    [MaxLength(200)]
    public string Title { get; set; } = "";

    [MaxLength(2000)]
    public string Description { get; set; } = "";

    [MaxLength(30)]
    public string Difficulty { get; set; } = "BEGINNER";

    public int DurationMinutes { get; set; } = 10;

    [MaxLength(1500)]
    public string? VideoUrl { get; set; }

    [MaxLength(1500)]
    public string? DocumentUrl { get; set; }

    [MaxLength(200)]
    public string? DocumentTitle { get; set; }

    [MaxLength(40)]
    public string? ModelLabel { get; set; }

    [MaxLength(30)]
    public string ModelSignalDirection { get; set; } = "UNKNOWN";

    public bool IsPublished { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}


// ======================================================
// 6. VOICE EXERCISE
// Bài tập có sẵn trong từng bài học
// ======================================================

[Table("voice_exercises")]
public sealed class VoiceExercise
{
    [Key]
    public int Id { get; set; }

    public int LessonId { get; set; }

    [MaxLength(200)]
    public string Title { get; set; } = "";

    [MaxLength(30)]
    public string ExerciseType { get; set; } = "READ_ALOUD";

    [Column(TypeName = "text")]
    public string Instructions { get; set; } = "";

    [Column(TypeName = "text")]
    public string? PracticeText { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; } = true;
}


// ======================================================
// 7. VOICE EXERCISE ATTEMPT
// Lưu kết quả từng lần học viên thực hành
// ======================================================

[Table("voice_exercise_attempts")]
public sealed class VoiceExerciseAttempt
{
    [Key]
    public int Id { get; set; }

    public int LearnerId { get; set; }

    public int ExerciseId { get; set; }

    public int PracticeSessionId { get; set; }

    [MaxLength(50)]
    public string ModelVersion { get; set; } = "";

    [Column(TypeName = "jsonb")]
    public string PredictionsJson { get; set; } = "{}";

    [Column(TypeName = "jsonb")]
    public string? FeedbackJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


// ======================================================
// 8. VOICE DIAGNOSTIC ATTEMPT
// Lưu kết quả đánh giá giọng nói đầu vào
// ======================================================

[Table("voice_diagnostic_attempts")]
public sealed class VoiceDiagnosticAttempt
{
    [Key]
    public int Id { get; set; }

    public int LearnerId { get; set; }

    public int PracticeSessionId { get; set; }

    [MaxLength(50)]
    public string ModelVersion { get; set; } = "";

    [Column(TypeName = "jsonb")]
    public string PredictionsJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


// ======================================================
// 9. VOICE SKILL MODEL MAPPING
// Ánh xạ kết quả model với tiêu chí luyện giọng
// ======================================================

[Table("voice_skill_model_mappings")]
public sealed class VoiceSkillModelMapping
{
    [Key]
    public int Id { get; set; }

    public int SkillId { get; set; }

    [MaxLength(40)]
    public string ModelLabel { get; set; } = "";

    [MaxLength(30)]
    public string SignalDirection { get; set; } = "UNKNOWN";

    public bool IsCalibrated { get; set; }

    public bool IsActive { get; set; } = true;
}


// ======================================================
// 10. VOICE RECOMMENDATION SNAPSHOT
// Lưu lịch sử kết quả gợi ý bài học của AI
// ======================================================

[Table("voice_recommendation_snapshots")]
public sealed class VoiceRecommendationSnapshot
{
    [Key]
    public int Id { get; set; }

    public int LearnerId { get; set; }

    public int LessonId { get; set; }

    public double Score { get; set; }

    [MaxLength(1000)]
    public string Reason { get; set; } = "";

    [MaxLength(30)]
    public string Source { get; set; } = "CATALOG_DEFAULT";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}