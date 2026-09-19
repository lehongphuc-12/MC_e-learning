using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Quizzes.Services;

public class QuizService : IQuizService
{
    private readonly IGenericRepository<Quiz> _quizRepository;
    private readonly IGenericRepository<Question> _questionRepository;
    private readonly IGenericRepository<Choice> _choiceRepository;
    private readonly IGenericRepository<QuizAttempt> _attemptRepository;
    private readonly IGenericRepository<QuizAnswer> _answerRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IUnitOfWork _unitOfWork;

    public QuizService(
        IGenericRepository<Quiz> quizRepository,
        IGenericRepository<Question> questionRepository,
        IGenericRepository<Choice> choiceRepository,
        IGenericRepository<QuizAttempt> attemptRepository,
        IGenericRepository<QuizAnswer> answerRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Lesson> lessonRepository,
        IUnitOfWork unitOfWork)
    {
        _quizRepository = quizRepository;
        _questionRepository = questionRepository;
        _choiceRepository = choiceRepository;
        _attemptRepository = attemptRepository;
        _answerRepository = answerRepository;
        _courseRepository = courseRepository;
        _lessonRepository = lessonRepository;
        _unitOfWork = unitOfWork;
    }


    public async Task<QuizDto?> CreateQuizAsync(
        int instructorId,
        CreateQuizRequest request)
    {
        // =========================================================
        // 1. Check Course
        // =========================================================

        var courses = await _courseRepository.FindAsync(c => c.CourseId == request.CourseId);
        var course = courses.FirstOrDefault();

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
            var lessons = await _lessonRepository.FindAsync(l => l.LessonId == request.LessonId.Value);
            var lesson = lessons.FirstOrDefault();

            if (lesson is null)
                throw new ArgumentException(
                    $"Lesson with ID {request.LessonId.Value} not found.");

            if (lesson.CourseId != request.CourseId)
                throw new ArgumentException(
                    "The selected lesson does not belong to the selected course.");
        }
        // =========================================================
// 4. Check duplicate quiz
// =========================================================

var existingQuizzes = await _quizRepository.FindAsync(
    q => q.CourseId == request.CourseId &&
         q.LessonId == request.LessonId);

if (existingQuizzes.Any())
{
    if (request.LessonId.HasValue)
    {
        throw new ArgumentException(
            "This lesson already has a quiz.");
    }

    throw new ArgumentException(
        "This course already has an overall quiz.");
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
        // 5. Create Quiz
        // =========================================================

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

        await _quizRepository.AddAsync(quiz);
        await _unitOfWork.SaveChangesAsync();

        // =====================================================
        // 6. Create Questions + Choices
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

            await _questionRepository.AddAsync(question);
            await _unitOfWork.SaveChangesAsync();

            foreach (var choiceRequest in questionRequest.Choices)
            {
                var choice = new Choice
                {
                    QuestionId = question.QuestionId,
                    ChoiceText = choiceRequest.ChoiceText.Trim(),
                    IsCorrect = choiceRequest.IsCorrect,
                    OrderIndex = choiceRequest.OrderIndex
                };

                await _choiceRepository.AddAsync(choice);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        return await GetQuizByIdAsync(quiz.QuizId);
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
        var quizzes = await _quizRepository.FindAsync(
            q => q.QuizId == quizId,
            q => q.Questions);

        var quiz = quizzes.FirstOrDefault();
        if (quiz is null)
            return null;

        var questionIds = (quiz.Questions ?? new List<Question>()).Select(q => q.QuestionId).ToList();
        var choicesList = await _choiceRepository.FindAsync(c => questionIds.Contains(c.QuestionId));
        var choiceDict = choicesList.GroupBy(c => c.QuestionId).ToDictionary(g => g.Key, g => g.ToList());

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

            Questions = (quiz.Questions ?? new List<Question>())
                .OrderBy(q => q.OrderIndex)
                .Select(q => new QuestionDto
                {
                    QuestionId = q.QuestionId,
                    QuizId = q.QuizId,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    Explanation = q.Explanation,
                    OrderIndex = q.OrderIndex,

                    Choices = (choiceDict.TryGetValue(q.QuestionId, out var qChoices) ? qChoices : new List<Choice>())
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
        var quizzes = await _quizRepository.FindAsync(
            q => q.QuizId == quizId,
            q => q.Questions);

        var quiz = quizzes.FirstOrDefault();

        if (quiz is null)
            throw new ArgumentException(
                $"Quiz with ID {quizId} not found.");

        if (quiz.CreatedById != instructorId)
            throw new UnauthorizedAccessException(
                "You do not have permission to update this quiz.");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException(
                "Quiz title is required.");

        if (request.Questions == null || !request.Questions.Any())
        {
            throw new ArgumentException(
                "At least one question is required.");
        }

        foreach (var questionRequest in request.Questions)
        {
            ValidateUpdateQuestion(questionRequest);
        }

        var attempts = await _attemptRepository.FindAsync(a => a.QuizId == quizId);
        var hasAttempts = attempts.Any();

        quiz.Title = request.Title.Trim();
        quiz.Description = request.Description?.Trim();
        quiz.TimeLimitMinutes = request.TimeLimitMinutes;
        quiz.PassingScore = request.PassingScore;
        quiz.MaxAttempts = request.MaxAttempts;
        quiz.Status = request.Status;

        _quizRepository.Update(quiz);

        var existingQuestions = (quiz.Questions ?? new List<Question>()).ToList();
        var requestQuestionIds = request.Questions
            .Where(q => q.QuestionId > 0)
            .Select(q => q.QuestionId)
            .ToHashSet();

        foreach (var questionRequest in request.Questions)
        {
            if (questionRequest.QuestionId <= 0)
                continue;

            var existingQuestion = existingQuestions
                .FirstOrDefault(q => q.QuestionId == questionRequest.QuestionId);

            if (existingQuestion is null)
            {
                throw new ArgumentException(
                    $"Question with ID {questionRequest.QuestionId} does not belong to quiz {quizId}.");
            }
        }

        if (!hasAttempts)
        {
            var questionsToDelete = existingQuestions
                .Where(q => !requestQuestionIds.Contains(q.QuestionId))
                .ToList();

            foreach (var question in questionsToDelete)
            {
                _questionRepository.Remove(question);
            }
        }
        else
        {
            var removedQuestions = existingQuestions
                .Where(q => !requestQuestionIds.Contains(q.QuestionId))
                .ToList();

            if (removedQuestions.Any())
            {
                throw new ArgumentException(
                    "Questions cannot be deleted because this quiz already has attempts.");
            }
        }

        foreach (var questionRequest in request.Questions)
        {
            Question question;

            if (questionRequest.QuestionId > 0)
            {
                question = existingQuestions.First(q => q.QuestionId == questionRequest.QuestionId);
                question.QuestionText = questionRequest.QuestionText.Trim();
                question.QuestionType = questionRequest.QuestionType;
                question.Explanation = questionRequest.Explanation?.Trim();
                question.OrderIndex = questionRequest.OrderIndex;

                _questionRepository.Update(question);
            }
            else
            {
                question = new Question
                {
                    QuizId = quizId,
                    QuestionText = questionRequest.QuestionText.Trim(),
                    QuestionType = questionRequest.QuestionType,
                    Explanation = questionRequest.Explanation?.Trim(),
                    OrderIndex = questionRequest.OrderIndex
                };

                await _questionRepository.AddAsync(question);
                await _unitOfWork.SaveChangesAsync();
            }

            var choicesList = await _choiceRepository.FindAsync(c => c.QuestionId == question.QuestionId);
            var existingChoices = choicesList.ToList();
            var requestChoiceIds = questionRequest.Choices
                .Where(c => c.ChoiceId > 0)
                .Select(c => c.ChoiceId)
                .ToHashSet();

            foreach (var choiceRequest in questionRequest.Choices)
            {
                if (choiceRequest.ChoiceId <= 0) continue;

                var existingChoice = existingChoices.FirstOrDefault(c => c.ChoiceId == choiceRequest.ChoiceId);

                if (existingChoice is null)
                {
                    throw new ArgumentException(
                        $"Choice with ID {choiceRequest.ChoiceId} does not belong to question {question.QuestionId}.");
                }
            }

            if (!hasAttempts)
            {
                var choicesToDelete = existingChoices
                    .Where(c => !requestChoiceIds.Contains(c.ChoiceId))
                    .ToList();

                foreach (var choice in choicesToDelete)
                {
                    _choiceRepository.Remove(choice);
                }
            }
            else
            {
                var removedChoices = existingChoices
                    .Where(c => !requestChoiceIds.Contains(c.ChoiceId))
                    .ToList();

                if (removedChoices.Any())
                {
                    throw new ArgumentException(
                        "Choices cannot be deleted because this quiz already has attempts.");
                }
            }

            foreach (var choiceRequest in questionRequest.Choices)
            {
                if (choiceRequest.ChoiceId > 0)
                {
                    var choice = existingChoices.First(c => c.ChoiceId == choiceRequest.ChoiceId);
                    choice.ChoiceText = choiceRequest.ChoiceText.Trim();
                    choice.IsCorrect = choiceRequest.IsCorrect;
                    choice.OrderIndex = choiceRequest.OrderIndex;

                    _choiceRepository.Update(choice);
                }
                else
                {
                    var choice = new Choice
                    {
                        QuestionId = question.QuestionId,
                        ChoiceText = choiceRequest.ChoiceText.Trim(),
                        IsCorrect = choiceRequest.IsCorrect,
                        OrderIndex = choiceRequest.OrderIndex
                    };

                    await _choiceRepository.AddAsync(choice);
                }
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return await GetQuizByIdAsync(quizId);
    }

    public async Task<TakeQuizDto?> TakeQuizAsync(
        int learnerId,
        int quizId)
    {
        var quizzes = await _quizRepository.FindAsync(
            q => q.QuizId == quizId,
            q => q.Questions);

        var quiz = quizzes.FirstOrDefault();

        if (quiz is null)
            throw new ArgumentException(
                $"Quiz with ID {quizId} not found.");

        if (quiz.Status != QuizStatus.ACTIVE)
            throw new ArgumentException(
                "This quiz is not available.");

        var userAttempts = await _attemptRepository.FindAsync(a => a.QuizId == quizId && a.UserId == learnerId);
        var attemptCount = userAttempts.Count();

        if (attemptCount >= quiz.MaxAttempts)
            throw new ArgumentException(
                "You have reached the maximum number of attempts.");

        var attempt = new QuizAttempt
        {
            QuizId = quizId,
            UserId = learnerId,
            AttemptNumber = attemptCount + 1,
            StartedAt = DateTime.UtcNow
        };

        await _attemptRepository.AddAsync(attempt);
        await _unitOfWork.SaveChangesAsync();

        var questionIds = (quiz.Questions ?? new List<Question>()).Select(q => q.QuestionId).ToList();
        var choicesList = await _choiceRepository.FindAsync(c => questionIds.Contains(c.QuestionId));
        var choiceDict = choicesList.GroupBy(c => c.QuestionId).ToDictionary(g => g.Key, g => g.ToList());

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

            Questions = (quiz.Questions ?? new List<Question>())
                .OrderBy(q => q.OrderIndex)
                .Select(q => new TakeQuestionDto
                {
                    QuestionId = q.QuestionId,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    OrderIndex = q.OrderIndex,

                    Choices = (choiceDict.TryGetValue(q.QuestionId, out var qChoices) ? qChoices : new List<Choice>())
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
        var attempts = await _attemptRepository.FindAsync(
            a => a.AttemptId == request.AttemptId && a.QuizId == quizId && a.UserId == learnerId,
            a => a.Quiz);

        var attempt = attempts.FirstOrDefault();

        if (attempt is null)
            throw new ArgumentException(
                "Quiz attempt not found.");

        if (attempt.SubmittedAt.HasValue)
            throw new ArgumentException(
                "This quiz attempt has already been submitted.");

        if (attempt.Quiz.TimeLimitMinutes > 0)
        {
            var deadline = attempt.StartedAt
                .AddMinutes(attempt.Quiz.TimeLimitMinutes);

            if (DateTime.UtcNow > deadline)
                throw new ArgumentException(
                    "The quiz time limit has expired.");
        }

        var questions = await _questionRepository.FindAsync(q => q.QuizId == quizId);
        var questionList = questions.ToList();
        var questionIds = questionList.Select(q => q.QuestionId).ToList();
        var choices = await _choiceRepository.FindAsync(c => questionIds.Contains(c.QuestionId));
        var choiceList = choices.ToList();

        foreach (var answer in request.Answers)
        {
            var question = questionList
                .FirstOrDefault(q => q.QuestionId == answer.QuestionId);

            if (question is null)
                throw new ArgumentException(
                    $"Question with ID {answer.QuestionId} does not belong to this quiz.");

            if (answer.SelectedChoiceId.HasValue)
            {
                var choiceExists = choiceList
                    .Any(c => c.QuestionId == answer.QuestionId && c.ChoiceId == answer.SelectedChoiceId.Value);

                if (!choiceExists)
                    throw new ArgumentException(
                        $"Selected choice does not belong to question {answer.QuestionId}.");
            }
        }

        var totalQuestions = questionList.Count;
        var correctAnswers = 0;

        foreach (var question in questionList)
        {
            var answer = request.Answers
                .FirstOrDefault(a => a.QuestionId == question.QuestionId);

            var selectedChoice = answer?.SelectedChoiceId;

            var correctChoice = choiceList
                .FirstOrDefault(c => c.QuestionId == question.QuestionId && c.IsCorrect);

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

            await _answerRepository.AddAsync(quizAnswer);
        }

        decimal score = totalQuestions == 0
            ? 0
            : Math.Round(
                (decimal)correctAnswers / totalQuestions * 100,
                2);

        attempt.Score = score;
        attempt.ResultStatus =
            score >= attempt.Quiz.PassingScore
                ? QuizAttemptStatus.PASSED
                : QuizAttemptStatus.FAILED;

        attempt.SubmittedAt = DateTime.UtcNow;

        _attemptRepository.Update(attempt);
        await _unitOfWork.SaveChangesAsync();

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
        var attempts = await _attemptRepository.FindAsync(
            a => a.AttemptId == attemptId && a.QuizId == quizId && a.UserId == learnerId,
            a => a.Quiz);

        var attempt = attempts.FirstOrDefault();

        if (attempt is null)
            throw new ArgumentException(
                "Quiz attempt not found.");

        if (!attempt.SubmittedAt.HasValue)
            throw new ArgumentException(
                "This quiz attempt has not been submitted yet.");

        var quizAnswersList = await _answerRepository.FindAsync(a => a.AttemptId == attemptId);
        var quizAnswers = quizAnswersList.ToList();

        var questionIds = quizAnswers.Select(a => a.QuestionId).ToList();
        var questionsList = await _questionRepository.FindAsync(q => questionIds.Contains(q.QuestionId));
        var questionDict = questionsList.ToDictionary(q => q.QuestionId);

        var selectedChoiceIds = quizAnswers.Where(a => a.SelectedChoiceId.HasValue).Select(a => a.SelectedChoiceId!.Value).ToList();
        var selectedChoicesList = await _choiceRepository.FindAsync(c => selectedChoiceIds.Contains(c.ChoiceId));
        var selectedChoiceDict = selectedChoicesList.ToDictionary(c => c.ChoiceId);

        var correctChoices = await _choiceRepository.FindAsync(c => questionIds.Contains(c.QuestionId) && c.IsCorrect);
        var correctChoiceDict = correctChoices.ToDictionary(c => c.QuestionId);

        var score = attempt.Score ?? 0;
        var isPassed = score >= attempt.Quiz.PassingScore;

        var answers = quizAnswers
            .OrderBy(a => questionDict.TryGetValue(a.QuestionId, out var q) ? q.OrderIndex : 0)
            .Select(answer =>
            {
                var question = questionDict.TryGetValue(answer.QuestionId, out var q) ? q : null;
                var selectedChoice = answer.SelectedChoiceId.HasValue && selectedChoiceDict.TryGetValue(answer.SelectedChoiceId.Value, out var sc) ? sc : null;
                var correctChoice = correctChoiceDict.TryGetValue(answer.QuestionId, out var cc) ? cc : null;

                return new QuizAnswerResultDto
                {
                    QuestionId = answer.QuestionId,
                    QuestionText = question?.QuestionText ?? string.Empty,
                    SelectedChoiceId = answer.SelectedChoiceId,
                    SelectedChoiceText = selectedChoice?.ChoiceText,
                    CorrectChoiceId = correctChoice?.ChoiceId,
                    CorrectChoiceText = correctChoice?.ChoiceText,
                    IsCorrect = answer.IsCorrect ?? false
                };
            })
            .ToList();

        return new QuizResultDto
        {
            AttemptId = attempt.AttemptId,
            QuizId = attempt.QuizId,
            QuizTitle = attempt.Quiz?.Title ?? string.Empty,
            AttemptNumber = attempt.AttemptNumber,
            Score = score,
            PassingScore = attempt.Quiz?.PassingScore ?? 0,
            IsPassed = isPassed,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            Answers = answers
        };
    }

public async Task<List<QuizListItemDto>> GetQuizzesByCourseAsync(int courseId)
{
    var quizzes = await _quizRepository.FindAsync(
        q => q.CourseId == courseId,
        q => q.Lesson);

    return quizzes
        .Select(q => new QuizListItemDto
        {
            QuizId = q.QuizId,
            CourseId = q.CourseId,
            LessonId = q.LessonId,

            LessonTitle = q.Lesson != null
                ? q.Lesson.Title
                : null,

            Title = q.Title,
            Description = q.Description,
            TimeLimitMinutes = q.TimeLimitMinutes,
            PassingScore = q.PassingScore,
            MaxAttempts = q.MaxAttempts,
            Status = q.Status
        })
        .ToList();
}
private static void ValidateUpdateQuestion(
    UpdateQuestionRequest question)
{
    if (string.IsNullOrWhiteSpace(question.QuestionText))
        throw new ArgumentException(
            "Question text is required.");

    switch (question.QuestionType)
    {
        case QuestionType.SINGLE_CHOICE:

            ValidateUpdateSingleChoice(question);
            break;

        case QuestionType.MULTIPLE_CHOICE:

            ValidateUpdateMultipleChoice(question);
            break;

        case QuestionType.TRUE_FALSE:

            ValidateUpdateTrueFalse(question);
            break;

        case QuestionType.ESSAY:

            ValidateUpdateEssay(question);
            break;

        default:

            throw new ArgumentException(
                "Invalid question type.");
    }
}
private static void ValidateUpdateSingleChoice(
    UpdateQuestionRequest question)
{
    if (question.Choices == null ||
        question.Choices.Count < 2)
    {
        throw new ArgumentException(
            "A single choice question must have at least 2 choices.");
    }

    var correctCount =
        question.Choices.Count(c => c.IsCorrect);

    if (correctCount != 1)
    {
        throw new ArgumentException(
            "A single choice question must have exactly one correct answer.");
    }

    ValidateUpdateChoiceTexts(question.Choices);
}
private static void ValidateUpdateTrueFalse(
    UpdateQuestionRequest question)
{
    if (question.Choices == null ||
        question.Choices.Count != 2)
    {
        throw new ArgumentException(
            "A true/false question must have exactly 2 choices.");
    }

    var correctCount =
        question.Choices.Count(c => c.IsCorrect);

    if (correctCount != 1)
    {
        throw new ArgumentException(
            "A true/false question must have exactly one correct answer.");
    }

    ValidateUpdateChoiceTexts(question.Choices);
}
private static void ValidateUpdateEssay(
    UpdateQuestionRequest question)
{
    // Essay does not require choices.
}
private static void ValidateUpdateChoiceTexts(
    List<UpdateChoiceRequest> choices)
{
    foreach (var choice in choices)
    {
        if (string.IsNullOrWhiteSpace(choice.ChoiceText))
        {
            throw new ArgumentException(
                "Choice text cannot be empty.");
        }
    }
}
private static void ValidateUpdateMultipleChoice(UpdateQuestionRequest question)
{
    if (question.Choices == null || question.Choices.Count < 2)
    {
        throw new ArgumentException(
            "Multiple choice question must have at least 2 choices.");
    }

    var correctChoices = question.Choices.Count(c => c.IsCorrect);

    if (correctChoices < 1)
    {
        throw new ArgumentException(
            "Multiple choice question must have at least 1 correct choice.");
    }

    ValidateUpdateChoiceTexts(question.Choices);
}
}
