using System;
using System.Collections.Generic;
namespace MC_BE.Features.VoiceAssessment.DTOs;
public sealed class AIPracticeResult
{
    public int PracticeSessionId { get; set; }
    public int PracticeFeedbackId { get; set; }
    public string PracticeMode { get; set; } = "";
    public int? CourseId { get; set; }
    public int? LessonId { get; set; }
    public string ModelVersion { get; set; } = "";
    public int CheckpointEpoch { get; set; }
    public Dictionary<string, double> Predictions { get; set; } = new();
    public string OverallAssessment { get; set; } = "";
    public string Summary { get; set; } = "";
    public List<FeedbackItemResultDto> Strengths { get; set; } = new();
    public List<FeedbackItemResultDto> Issues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public List<PracticeExerciseResultDto> PracticePlan { get; set; } = new();
    public string Encouragement { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
