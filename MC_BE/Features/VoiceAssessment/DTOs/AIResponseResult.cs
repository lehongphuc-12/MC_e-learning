namespace MC_BE.Features.VoiceAssessment.DTOs;

public class AIResponseResult
{
    public int FeedbackId { get; set; }

    public int SubmissionId { get; set; }

    public string ModelVersion { get; set; } = string.Empty;

    public int CheckpointEpoch { get; set; }

    public Dictionary<string, double> Predictions { get; set; }
        = new();

    public string OverallAssessment { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public List<FeedbackItemResultDto> Strengths { get; set; } = new();

    public List<FeedbackItemResultDto> Issues { get; set; } = new();

    public List<string> Recommendations { get; set; } = new();

    public List<PracticeExerciseResultDto> PracticePlan { get; set; } = new();

    public string Encouragement { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}

public class FeedbackItemResultDto
{
    public string Category { get; set; } = string.Empty;

    public string Explanation { get; set; } = string.Empty;

    public string Evidence { get; set; } = string.Empty;
}

public class PracticeExerciseResultDto
{
    public string Title { get; set; } = string.Empty;

    public string Instruction { get; set; } = string.Empty;

    public string Example { get; set; } = string.Empty;
}