using System.Text.Json.Serialization;

namespace MC_BE.Features.Courses.DTOs;

public class MentorChatRequestDto
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("lesson_id")]
    public int? LessonId { get; set; }

    [JsonPropertyName("top_k")]
    public int TopK { get; set; } = 4;
}

public class PythonChatRequest
{
    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("lesson_id")]
    public int? LessonId { get; set; }

    [JsonPropertyName("top_k")]
    public int TopK { get; set; } = 4;
}

public class MentorSourceItemDto
{
    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("lesson_id")]
    public int? LessonId { get; set; }

    [JsonPropertyName("snippet")]
    public string Snippet { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public double Score { get; set; }
}

public class MentorChatResponseDto
{
    [JsonPropertyName("answer")]
    public string Answer { get; set; } = string.Empty;

    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("sources")]
    public List<MentorSourceItemDto> Sources { get; set; } = new();
}

public class TranscriptIngestRequestDto
{
    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("lesson_id")]
    public int LessonId { get; set; }

    [JsonPropertyName("lesson_title")]
    public string LessonTitle { get; set; } = string.Empty;

    [JsonPropertyName("transcript_text")]
    public string TranscriptText { get; set; } = string.Empty;
}

public class MentorIngestResponseDto
{
    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("total_chunks")]
    public int TotalChunks { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

public class SyncCourseTranscriptsResultDto
{
    public int TotalLessonsProcessed { get; set; }
    public int TotalSuccess { get; set; }
    public int TotalSkipped { get; set; }
    public List<string> Messages { get; set; } = new();
}
