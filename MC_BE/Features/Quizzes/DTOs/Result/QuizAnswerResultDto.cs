using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuizAnswerResultDto
{
    public int QuizAnswerId { get; set; }
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }

    public decimal? Score { get; set; }
    public decimal MaxScore { get; set; }

    public bool? IsCorrect { get; set; }

    public string? TextAnswer { get; set; }

    public string? TeacherFeedback { get; set; }
    public int? GradedById { get; set; }
    public DateTime? GradedAt { get; set; }

    // ============================================================
    // Legacy compatibility
    // QuizService cũ đang map 4 field này.
    // Sẽ bỏ ở Cụm 5 khi GetQuizResultAsync được nâng cấp hoàn toàn.
    // ============================================================

    public int? SelectedChoiceId { get; set; }
    public string? SelectedChoiceText { get; set; }

    public int? CorrectChoiceId { get; set; }
    public string? CorrectChoiceText { get; set; }

    // ============================================================
    // New result contract
    // ============================================================

    public List<SelectedChoiceResultDto> SelectedChoices { get; set; } = new();

    public List<SelectedChoiceResultDto> CorrectChoices { get; set; } = new();

    public List<ErrorRegionResultDto> ErrorRegions { get; set; } = new();

    public List<AnnotationResultDto> Annotations { get; set; } = new();

    public List<ArrangeItemResultDto> ArrangeItems { get; set; } = new();

    public List<ScenarioPathResultDto> ScenarioPath { get; set; } = new();
}