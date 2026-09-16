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
public async Task<TakeQuizDto?> TakeQuizAsync(
    int learnerId,
    int quizId)
{
    // 1. Find quiz
    var quiz = await _context.Quizzes
        .Include(q => q.Questions)
            .ThenInclude(q => q.Choices)
        .FirstOrDefaultAsync(q => q.QuizId == quizId);

    if (quiz is null)
        throw new ArgumentException(
            $"Quiz with ID {quizId} not found.");

    // 2. Check quiz status
    if (quiz.Status != QuizStatus.ACTIVE)
        throw new ArgumentException(
            "This quiz is not available.");

    // 3. Count attempts
    var attemptCount = await _context.QuizAttempts
        .CountAsync(a =>
            a.QuizId == quizId &&
            a.UserId == learnerId);

    if (attemptCount >= quiz.MaxAttempts)
        throw new ArgumentException(
            "You have reached the maximum number of attempts.");

    // 4. Create new attempt
    var attempt = new QuizAttempt
    {
        QuizId = quizId,
        UserId = learnerId,
        AttemptNumber = attemptCount + 1,
        StartedAt = DateTime.UtcNow
    };

    _context.QuizAttempts.Add(attempt);

    await _context.SaveChangesAsync();

    // 5. Map quiz for learner
    return new TakeQuizDto
    {
        QuizId = quiz.QuizId,
        Title = quiz.Title,
        Description = quiz.Description,
        TimeLimitMinutes = quiz.TimeLimitMinutes,
        PassingScore = quiz.PassingScore,
        MaxAttempts = quiz.MaxAttempts,
        AttemptId = attempt.AttemptId,
        AttemptNumber = attempt.AttemptNumber,
        StartedAt = attempt.StartedAt,

        Questions = quiz.Questions
            .OrderBy(q => q.OrderIndex)
            .Select(q => new TakeQuestionDto
            {
                QuestionId = q.QuestionId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                OrderIndex = q.OrderIndex,

                Choices = q.Choices
                    .OrderBy(c => c.OrderIndex)
                    .Select(c => new TakeChoiceDto
                    {
                        ChoiceId = c.ChoiceId,
                        ChoiceText = c.ChoiceText,
                        OrderIndex = c.OrderIndex
                    })
                    .ToList()
            })
            .ToList()
    };
}
public async Task<QuizResultDto?> SubmitQuizAsync(
    int learnerId,
    int quizId,
    SubmitQuizRequest request)
{
    // 1. Find attempt
    var attempt = await _context.QuizAttempts
        .Include(a => a.Quiz)
            .ThenInclude(q => q.Questions)
                .ThenInclude(q => q.Choices)
        .FirstOrDefaultAsync(a =>
            a.AttemptId == request.AttemptId &&
            a.QuizId == quizId &&
            a.UserId == learnerId);

    if (attempt is null)
        throw new ArgumentException(
            "Quiz attempt not found.");

    // 2. Prevent submitting twice
    if (attempt.SubmittedAt.HasValue)
        throw new ArgumentException(
            "This quiz attempt has already been submitted.");

    // 3. Check time limit
    if (attempt.Quiz.TimeLimitMinutes > 0)
    {
        var deadline = attempt.StartedAt
            .AddMinutes(attempt.Quiz.TimeLimitMinutes);

        if (DateTime.UtcNow > deadline)
            throw new ArgumentException(
                "The quiz time limit has expired.");
    }

    // 4. Validate questions and choices
    foreach (var answer in request.Answers)
    {
        var question = attempt.Quiz.Questions
            .FirstOrDefault(q => q.QuestionId == answer.QuestionId);

        if (question is null)
            throw new ArgumentException(
                $"Question with ID {answer.QuestionId} does not belong to this quiz.");

        if (answer.SelectedChoiceId.HasValue)
        {
            var choiceExists = question.Choices
                .Any(c => c.ChoiceId == answer.SelectedChoiceId.Value);

            if (!choiceExists)
                throw new ArgumentException(
                    $"Selected choice does not belong to question {answer.QuestionId}.");
        }
    }

    // 5. Calculate score
    var totalQuestions = attempt.Quiz.Questions.Count;
    var correctAnswers = 0;

    foreach (var question in attempt.Quiz.Questions)
    {
        var answer = request.Answers
            .FirstOrDefault(a => a.QuestionId == question.QuestionId);

        var selectedChoice = answer?.SelectedChoiceId;

        var correctChoice = question.Choices
            .FirstOrDefault(c => c.IsCorrect);

        bool isCorrect =
            selectedChoice.HasValue &&
            correctChoice != null &&
            selectedChoice.Value == correctChoice.ChoiceId;

        if (isCorrect)
            correctAnswers++;

        var quizAnswer = new QuizAnswer
        {
            AttemptId = attempt.AttemptId,
            QuestionId = question.QuestionId,
            SelectedChoiceId = selectedChoice,
            IsCorrect = isCorrect,
            AnsweredAt = DateTime.UtcNow
        };

        _context.QuizAnswers.Add(quizAnswer);
    }

    // 6. Calculate score
    decimal score = totalQuestions == 0
        ? 0
        : Math.Round(
            (decimal)correctAnswers / totalQuestions * 100,
            2);

    // 7. Update attempt
    attempt.Score = score;
    attempt.ResultStatus =
        score >= attempt.Quiz.PassingScore
            ? QuizAttemptStatus.PASSED
            : QuizAttemptStatus.FAILED;

    attempt.SubmittedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync();

    // 8. Return result
    return new QuizResultDto
    {
        AttemptId = attempt.AttemptId,
        QuizId = attempt.QuizId,
        AttemptNumber = attempt.AttemptNumber,
        Score = score,
        PassingScore = attempt.Quiz.PassingScore,
        IsPassed =
            score >= attempt.Quiz.PassingScore,
        StartedAt = attempt.StartedAt,
        SubmittedAt = attempt.SubmittedAt.Value
    };
}
public async Task<QuizResultDto?> GetQuizResultAsync(
    int learnerId,
    int quizId,
    int attemptId)
{
    // =========================================================
    // 1. Find attempt
    // =========================================================

    var attempt = await _context.QuizAttempts
        .Include(a => a.Quiz)
        .Include(a => a.QuizAnswers)
            .ThenInclude(a => a.Question)
        .Include(a => a.QuizAnswers)
            .ThenInclude(a => a.SelectedChoice)
        .FirstOrDefaultAsync(a =>
            a.AttemptId == attemptId &&
            a.QuizId == quizId &&
            a.UserId == learnerId);

    if (attempt is null)
        throw new ArgumentException(
            "Quiz attempt not found.");

    // =========================================================
    // 2. Check submitted
    // =========================================================

    if (!attempt.SubmittedAt.HasValue)
        throw new ArgumentException(
            "This quiz attempt has not been submitted yet.");

    // =========================================================
    // 3. Get correct choices
    // =========================================================

    var questionIds = attempt.QuizAnswers
        .Select(a => a.QuestionId)
        .ToList();

    var correctChoices = await _context.Choices
        .Where(c =>
            questionIds.Contains(c.QuestionId) &&
            c.IsCorrect)
        .ToListAsync();

    // =========================================================
    // 4. Calculate result information
    // =========================================================

    var score = attempt.Score ?? 0;

    var isPassed =
        score >= attempt.Quiz.PassingScore;

    // =========================================================
    // 5. Map answers
    // =========================================================

    var answers = attempt.QuizAnswers
        .OrderBy(a => a.Question.OrderIndex)
        .Select(answer =>
        {
            var correctChoice = correctChoices
                .FirstOrDefault(c =>
                    c.QuestionId == answer.QuestionId);

            return new QuizAnswerResultDto
            {
                QuestionId = answer.QuestionId,

                QuestionText =
                    answer.Question.QuestionText,

                SelectedChoiceId =
                    answer.SelectedChoiceId,

                SelectedChoiceText =
                    answer.SelectedChoice?.ChoiceText,

                CorrectChoiceId =
                    correctChoice?.ChoiceId,

                CorrectChoiceText =
                    correctChoice?.ChoiceText,

                IsCorrect =
                    answer.IsCorrect ?? false
            };
        })
        .ToList();

    // =========================================================
    // 6. Return result
    // =========================================================

    return new QuizResultDto
    {
        AttemptId = attempt.AttemptId,

        QuizId = attempt.QuizId,

        QuizTitle = attempt.Quiz.Title,

        AttemptNumber = attempt.AttemptNumber,

        Score = score,

        PassingScore =
            attempt.Quiz.PassingScore,

        IsPassed = isPassed,

        StartedAt = attempt.StartedAt,

        SubmittedAt = attempt.SubmittedAt,

        Answers = answers
    };
}
}
