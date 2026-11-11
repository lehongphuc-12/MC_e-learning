namespace MC_BE.Features.VoiceAssessment.DTOs.Internal;

public class LLMFeedbackDto
{
    public string OverallAssessment { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public List<FeedbackItemDto> Strengths { get; set; } = new();

    public List<FeedbackItemDto> Issues { get; set; } = new();

    public List<string> Recommendations { get; set; } = new();

    public List<PracticeExerciseDto> PracticePlan { get; set; } = new();

    public string Encouragement { get; set; } = string.Empty;
}

public class FeedbackItemDto
{
    public string Category { get; set; } = string.Empty;

    public string Explanation { get; set; } = string.Empty;

    public string Evidence { get; set; } = string.Empty;
}

public class PracticeExerciseDto
{
    public string Title { get; set; } = string.Empty;

    public string Instruction { get; set; } = string.Empty;

    public string Example { get; set; } = string.Empty;
}