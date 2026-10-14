using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitScenarioPathRequest
{
    [Required]
    public int NodeId { get; set; }

    [Required]
    public int ScenarioChoiceId { get; set; }

    [Range(1, int.MaxValue)]
    public int StepOrder { get; set; }
}