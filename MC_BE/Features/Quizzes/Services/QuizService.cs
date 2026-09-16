using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Services;

public class QuizService : IQuizService
{
    private readonly SmartMcDbContext _context;

    public QuizService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<QuizDto?> CreateQuizAsync(
        int instructorId,
        CreateQuizRequest request)
    {
        // =========================================================
        // 1. Check Course
        // =========================================================

        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.CourseId == request.CourseId);

        if (course is null)
            throw new ArgumentException(
                $"Course with ID {request.CourseId} not found.");

        // =========================================================
        // 2. Check instructor permission
        // =========================================================

        if (course.InstructorId != instructorId)
            throw new UnauthorizedAccessException(
                "You do not have permission to create this quiz.");

        // =========================================================
        // 3. Check Lesson if provided
        // =========================================================

        if (request.LessonId.HasValue)
        {
            var lesson = await _context.Lessons
                .FirstOrDefaultAsync(l =>
                    l.LessonId == request.LessonId.Value);

            if (lesson is null)
                throw new ArgumentException(
                    $"Lesson with ID {request.LessonId.Value} not found.");

            if (lesson.CourseId != request.CourseId)
                throw new ArgumentException(
                    "The selected lesson does not belong to the selected course.");
        }

        // =========================================================
        // 4. Validate questions
        // =========================================================

        if (request.Questions == null || !request.Questions.Any())
            throw new ArgumentException(
                "At least one question is required.");

        foreach (var questionRequest in request.Questions)
        {
            ValidateQuestion(questionRequest);
        }

        // =========================================================
        // 5. Begin transaction
        // =========================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            // =====================================================
            // 6. Create Quiz
            // =====================================================

            var quiz = new Quiz
            {
                CourseId = request.CourseId,
                LessonId = request.LessonId,
                CreatedById = instructorId,
                Title = request.Title.Trim(),
                Description = request.Description,
                TimeLimitMinutes = request.TimeLimitMinutes,
                PassingScore = request.PassingScore,
                MaxAttempts = request.MaxAttempts,
                Status = request.Status,
                CreatedAt = DateTime.UtcNow
            };

            _context.Quizzes.Add(quiz);

            await _context.SaveChangesAsync();

            // =====================================================
            // 7. Create Questions + Choices
            // =====================================================

            foreach (var questionRequest in request.Questions)
            {
                var question = new Question
                {
                    QuizId = quiz.QuizId,
                    QuestionText = questionRequest.QuestionText.Trim(),
                    QuestionType = questionRequest.QuestionType,
                    Explanation = questionRequest.Explanation,
                    OrderIndex = questionRequest.OrderIndex
                };

                _context.Questions.Add(question);

                await _context.SaveChangesAsync();

                foreach (var choiceRequest in questionRequest.Choices)
                {
                    var choice = new Choice
                    {
                        QuestionId = question.QuestionId,
                        ChoiceText = choiceRequest.ChoiceText.Trim(),
                        IsCorrect = choiceRequest.IsCorrect,
                        OrderIndex = choiceRequest.OrderIndex
                    };

                    _context.Choices.Add(choice);
                }

                await _context.SaveChangesAsync();
            }

            // =====================================================
            // 8. Commit transaction
            // =====================================================

            await transaction.CommitAsync();

            // =====================================================
            // 9. Return complete Quiz
            // =====================================================

            return await GetQuizByIdAsync(quiz.QuizId);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }


    // =============================================================
    // Validate Question
    // =============================================================

    private static void ValidateQuestion(
        CreateQuestionRequest question)
    {
        if (string.IsNullOrWhiteSpace(question.QuestionText))
            throw new ArgumentException(
                "Question text is required.");

        switch (question.QuestionType)
        {
            case QuestionType.SINGLE_CHOICE:

                ValidateSingleChoice(question);
                break;

            case QuestionType.MULTIPLE_CHOICE:

                ValidateMultipleChoice(question);
                break;

            case QuestionType.TRUE_FALSE:

                ValidateTrueFalse(question);
                break;

            case QuestionType.ESSAY:

                ValidateEssay(question);
                break;

            default:

                throw new ArgumentException(
                    "Invalid question type.");
        }
    }


    // =============================================================
    // SINGLE_CHOICE
    // =============================================================

    private static void ValidateSingleChoice(
        CreateQuestionRequest question)
    {
        if (question.Choices == null || question.Choices.Count < 2)
            throw new ArgumentException(
                "A single choice question must have at least 2 choices.");

        var correctCount =
            question.Choices.Count(c => c.IsCorrect);

        if (correctCount != 1)
            throw new ArgumentException(
                "A single choice question must have exactly one correct answer.");

        ValidateChoiceTexts(question.Choices);
    }


    // =============================================================
    // MULTIPLE_CHOICE
    // =============================================================

    private static void ValidateMultipleChoice(
        CreateQuestionRequest question)
    {
        if (question.Choices == null || question.Choices.Count < 2)
            throw new ArgumentException(
                "A multiple choice question must have at least 2 choices.");

        var correctCount =
            question.Choices.Count(c => c.IsCorrect);

        if (correctCount < 1)
            throw new ArgumentException(
                "A multiple choice question must have at least one correct answer.");

        ValidateChoiceTexts(question.Choices);
    }


    // =============================================================
    // TRUE_FALSE
    // =============================================================

    private static void ValidateTrueFalse(
        CreateQuestionRequest question)
    {
        if (question.Choices == null || question.Choices.Count != 2)
            throw new ArgumentException(
                "A true/false question must have exactly 2 choices.");

        var correctCount =
            question.Choices.Count(c => c.IsCorrect);

        if (correctCount != 1)
            throw new ArgumentException(
                "A true/false question must have exactly one correct answer.");

        ValidateChoiceTexts(question.Choices);
    }


    // =============================================================
    // ESSAY
    // =============================================================

    private static void ValidateEssay(
        CreateQuestionRequest question)
    {
        // Essay does not require choices.
        // The Question entity itself stores the question text.
    }


    // =============================================================
    // Choice validation
    // =============================================================

    private static void ValidateChoiceTexts(
        List<CreateChoiceRequest> choices)
    {
        foreach (var choice in choices)
        {
            if (string.IsNullOrWhiteSpace(choice.ChoiceText))
                throw new ArgumentException(
                    "Choice text cannot be empty.");
        }
    }


    // =============================================================
    // Map Entity -> DTO
    // =============================================================

    public async Task<QuizDto?> GetQuizByIdAsync(int quizId)
    {
        var quiz = await _context.Quizzes
            .Include(q => q.Questions)
                .ThenInclude(q => q.Choices)
            .FirstOrDefaultAsync(q => q.QuizId == quizId);

        if (quiz is null)
            return null;

        return new QuizDto
        {
            QuizId = quiz.QuizId,
            CourseId = quiz.CourseId,
            LessonId = quiz.LessonId,
            CreatedById = quiz.CreatedById,
            Title = quiz.Title,
            Description = quiz.Description,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            PassingScore = quiz.PassingScore,
            MaxAttempts = quiz.MaxAttempts,
            Status = quiz.Status,
            CreatedAt = quiz.CreatedAt,

            Questions = quiz.Questions
                .OrderBy(q => q.OrderIndex)
                .Select(q => new QuestionDto
                {
                    QuestionId = q.QuestionId,
                    QuizId = q.QuizId,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    Explanation = q.Explanation,
                    OrderIndex = q.OrderIndex,

                    Choices = q.Choices
                        .OrderBy(c => c.OrderIndex)
                        .Select(c => new ChoiceDto
                        {
                            ChoiceId = c.ChoiceId,
                            QuestionId = c.QuestionId,
                            ChoiceText = c.ChoiceText,
                            IsCorrect = c.IsCorrect,
                            OrderIndex = c.OrderIndex
                        })
                        .ToList()
                })
                .ToList()
        };
    }
    public async Task<QuizDto?> UpdateQuizAsync(
    int instructorId,
    int quizId,
    UpdateQuizRequest request)
{
    // 1. Find quiz
    var quiz = await _context.Quizzes
        .Include(q => q.Questions)
            .ThenInclude(q => q.Choices)
        .FirstOrDefaultAsync(q => q.QuizId == quizId);

    if (quiz is null)
        throw new ArgumentException(
            $"Quiz with ID {quizId} not found.");

    // 2. Check permission
    if (quiz.CreatedById != instructorId)
        throw new UnauthorizedAccessException(
            "You do not have permission to update this quiz.");

    // 3. Validate title
    if (string.IsNullOrWhiteSpace(request.Title))
        throw new ArgumentException(
            "Quiz title is required.");

    // 4. Update quiz
    quiz.Title = request.Title.Trim();
    quiz.Description = request.Description?.Trim();
    quiz.TimeLimitMinutes = request.TimeLimitMinutes;
    quiz.PassingScore = request.PassingScore;
    quiz.MaxAttempts = request.MaxAttempts;
    quiz.Status = request.Status;

    await _context.SaveChangesAsync();

    // 5. Return updated quiz
    return await GetQuizByIdAsync(quizId);
}
}
