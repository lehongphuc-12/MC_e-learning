using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateQuizRequest
{
    [Required(ErrorMessage = "Course ID is required.")]
    public int CourseId { get; set; }

    public int? LessonId { get; set; }

    [Required(ErrorMessage = "Quiz title is required.")]
    [MaxLength(255, ErrorMessage = "Quiz title cannot exceed 255 characters.")]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Time limit must be 0 or greater.")]
    public int TimeLimitMinutes { get; set; } = 0;

    [Range(0, 100, ErrorMessage = "Passing score must be between 0 and 100.")]
    public decimal PassingScore { get; set; } = 80.00m;

    [Range(1, int.MaxValue, ErrorMessage = "Max attempts must be at least 1.")]
    public int MaxAttempts { get; set; } = 1;

    public QuizStatus Status { get; set; } = QuizStatus.DRAFT;

    [MinLength(1, ErrorMessage = "At least one question is required.")]
    public List<CreateQuestionRequest> Questions { get; set; } = new();
}


public class CreateQuestionRequest
{
    [Required(ErrorMessage = "Question text is required.")]
    public string QuestionText { get; set; } = string.Empty;

    [Required(ErrorMessage = "Question type is required.")]
    public QuestionType QuestionType { get; set; }

    public string? Explanation { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Order index must be at least 1.")]
    public int OrderIndex { get; set; } = 1;

    public List<CreateChoiceRequest> Choices { get; set; } = new();
}


public class CreateChoiceRequest
{
    [Required(ErrorMessage = "Choice text is required.")]
    public string ChoiceText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Order index must be at least 1.")]
    public int OrderIndex { get; set; } = 1;
}
public class QuizDto
{
    public int QuizId { get; set; }

    public int? CourseId { get; set; }

    public int? LessonId { get; set; }

    public int CreatedById { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int TimeLimitMinutes { get; set; }

    public decimal PassingScore { get; set; }

    public int MaxAttempts { get; set; }

    public QuizStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<QuestionDto> Questions { get; set; } = new();
}


public class QuestionDto
{
    public int QuestionId { get; set; }

    public int QuizId { get; set; }

    public string QuestionText { get; set; } = string.Empty;

    public QuestionType QuestionType { get; set; }

    public string? Explanation { get; set; }

    public int OrderIndex { get; set; }

    public List<ChoiceDto> Choices { get; set; } = new();
}


public class ChoiceDto
{
    public int ChoiceId { get; set; }

    public int QuestionId { get; set; }

    public string ChoiceText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int OrderIndex { get; set; }
}
public class UpdateQuizRequest
{
    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(0, int.MaxValue)]
    public int TimeLimitMinutes { get; set; }

    [Range(0, 100)]
    public decimal PassingScore { get; set; }

    [Range(1, int.MaxValue)]
    public int MaxAttempts { get; set; }

    public QuizStatus Status { get; set; }

    public List<UpdateQuestionRequest> Questions { get; set; } = new();
}
public class UpdateQuestionRequest
{
    // = 0 nếu tạo question mới
    public int QuestionId { get; set; }

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    public QuestionType QuestionType { get; set; }

    public string? Explanation { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;

    public List<UpdateChoiceRequest> Choices { get; set; } = new();
}
public class UpdateChoiceRequest
{
    // = 0 nếu tạo choice mới
    public int ChoiceId { get; set; }

    [Required]
    public string ChoiceText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;
}
public class TakeQuizDto
{
    public int QuizId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScore { get; set; }
    public int MaxAttempts { get; set; }
    public int AttemptId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public List<TakeQuestionDto> Questions { get; set; } = new();
}

public class TakeQuestionDto
{
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public int OrderIndex { get; set; }
    public List<TakeChoiceDto> Choices { get; set; } = new();
}

public class TakeChoiceDto
{
    public int ChoiceId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}
public class SubmitQuizRequest
{
    [Required]
    public int AttemptId { get; set; }

    public List<SubmitQuizAnswerRequest> Answers { get; set; } = new();
}

public class SubmitQuizAnswerRequest
{
    [Required]
    public int QuestionId { get; set; }

    public int? SelectedChoiceId { get; set; }
}

public class QuizResultDto
{
    public int AttemptId { get; set; }

    public int QuizId { get; set; }

    public string QuizTitle { get; set; } = string.Empty;

    public int AttemptNumber { get; set; }

    public decimal Score { get; set; }

    public decimal PassingScore { get; set; }

    public bool IsPassed { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public List<QuizAnswerResultDto> Answers { get; set; } = new();
}


public class QuizAnswerResultDto
{
    public int QuestionId { get; set; }

    public string QuestionText { get; set; } = string.Empty;

    public int? SelectedChoiceId { get; set; }

    public string? SelectedChoiceText { get; set; }

    public int? CorrectChoiceId { get; set; }

    public string? CorrectChoiceText { get; set; }

    public bool IsCorrect { get; set; }
}
public class QuizListItemDto
{
    public int QuizId { get; set; }
    public int? CourseId { get; set; }
    public int? LessonId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int TimeLimitMinutes { get; set; }
    public decimal PassingScore { get; set; }
    public int MaxAttempts { get; set; }

    public QuizStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }

    public int QuestionCount { get; set; }
}