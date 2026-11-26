using System;
using System.Collections.Generic;
using MC_BE.Features.VoiceAssessment.DTOs.Internal;

namespace MC_BE.Features.VoiceAssessment.DTOs;

public sealed class PracticeCriterionResultDto
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";

    // PASSED / FAILED / NOT_EVALUATED
    public string Status { get; set; } = "NOT_EVALUATED";

    public bool EvidenceAvailable { get; set; }

    public double? Score { get; set; }
    public double? RawScore { get; set; }
    public double? PassingScore { get; set; }
    public string? ScoreDescription { get; set; }
}

public sealed class AIPracticeResult
{
    public int PracticeSessionId { get; set; }
    public int PracticeFeedbackId { get; set; }

    public string PracticeMode { get; set; } = "";

    public int? CourseId { get; set; }
    public int? LessonId { get; set; }

    public string ModelVersion { get; set; } = "";
    public int CheckpointEpoch { get; set; }

    public SpeechClarityDto? Clarity { get; set; }

    public string? Transcript { get; set; }

    public bool PronunciationAvailable { get; set; }

    public Dictionary<string, double> Predictions { get; set; } = new();

    public List<PracticeCriterionResultDto> Criteria { get; set; } = new();

    public int PassedCriteriaCount { get; set; }
    public int EvaluatedCriteriaCount { get; set; }
    public int TotalCriteriaCount { get; set; } = 3;

    public string OverallAssessment { get; set; } = "";
    public string Summary { get; set; } = "";

    public List<FeedbackItemResultDto> Strengths { get; set; } = new();
    public List<FeedbackItemResultDto> Issues { get; set; } = new();

    public List<string> Recommendations { get; set; } = new();

    public List<PracticeExerciseResultDto> PracticePlan { get; set; } = new();

    public string Encouragement { get; set; } = "";

    public DateTime CreatedAt { get; set; }
}