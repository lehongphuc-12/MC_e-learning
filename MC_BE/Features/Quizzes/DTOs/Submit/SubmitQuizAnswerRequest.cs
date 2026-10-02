using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitQuizAnswerRequest
{
    [Required]
    public int QuestionId { get; set; }

    // Legacy compatibility:
    // QuizService cũ đang dùng field này.
    // Sẽ bỏ ở Cụm 5 sau khi SubmitQuizAsync được nâng cấp hoàn toàn.
    public int? SelectedChoiceId { get; set; }

    // Contract mới:
    // Hỗ trợ SINGLE_CHOICE và đặc biệt MULTIPLE_CHOICE nhiều đáp án.
    public List<int> SelectedChoiceIds { get; set; } = new();

    // FILL_BLANK / SCRIPT_WRITING / text-based answer.
    public string? TextAnswer { get; set; }

    // LISTEN_LOCATE_ERROR.
    public List<SubmitErrorRegionRequest> ErrorRegions { get; set; } = new();

    // SCRIPT_ANNOTATION.
    public List<SubmitAnnotationRequest> Annotations { get; set; } = new();

    // ARRANGE_SCRIPT.
    public List<SubmitArrangeItemRequest> ArrangeItems { get; set; } = new();

    // SCENARIO_DECISION_TREE.
    public List<SubmitScenarioPathRequest> ScenarioPath { get; set; } = new();
}