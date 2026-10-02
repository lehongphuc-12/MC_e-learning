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
    private readonly IGenericRepository<QuestionMedia> _mediaRepository;
    private readonly IGenericRepository<QuestionErrorRegion> _errorRegionRepository;
    private readonly IGenericRepository<QuestionAnnotation> _annotationRepository;
    private readonly IGenericRepository<QuestionArrangeItem> _arrangeItemRepository;
    private readonly IGenericRepository<QuestionWritingConfig> _writingConfigRepository;
    private readonly IGenericRepository<ScenarioNode> _scenarioNodeRepository;
    private readonly IGenericRepository<ScenarioChoice> _scenarioChoiceRepository;
    private readonly IGenericRepository<QuizAttempt> _attemptRepository;
    private readonly IGenericRepository<QuizAnswer> _answerRepository;
    private readonly IGenericRepository<QuizAnswerSelectedChoice> _answerSelectedChoiceRepository;
    private readonly IGenericRepository<QuizAnswerErrorRegion> _answerErrorRegionRepository;
    private readonly IGenericRepository<QuizAnswerAnnotation> _answerAnnotationRepository;
    private readonly IGenericRepository<QuizAnswerArrangeItem> _answerArrangeItemRepository;
    private readonly IGenericRepository<QuizAnswerScenarioPath> _answerScenarioPathRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IUnitOfWork _unitOfWork;

    public QuizService(
        IGenericRepository<Quiz> quizRepository,
        IGenericRepository<Question> questionRepository,
        IGenericRepository<Choice> choiceRepository,
        IGenericRepository<QuestionMedia> mediaRepository,
        IGenericRepository<QuestionErrorRegion> errorRegionRepository,
        IGenericRepository<QuestionAnnotation> annotationRepository,
        IGenericRepository<QuestionArrangeItem> arrangeItemRepository,
        IGenericRepository<QuestionWritingConfig> writingConfigRepository,
        IGenericRepository<ScenarioNode> scenarioNodeRepository,
        IGenericRepository<ScenarioChoice> scenarioChoiceRepository,
        IGenericRepository<QuizAttempt> attemptRepository,
        IGenericRepository<QuizAnswer> answerRepository,
        IGenericRepository<QuizAnswerSelectedChoice> answerSelectedChoiceRepository,
        IGenericRepository<QuizAnswerErrorRegion> answerErrorRegionRepository,
        IGenericRepository<QuizAnswerAnnotation> answerAnnotationRepository,
        IGenericRepository<QuizAnswerArrangeItem> answerArrangeItemRepository,
        IGenericRepository<QuizAnswerScenarioPath> answerScenarioPathRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Lesson> lessonRepository,
        IUnitOfWork unitOfWork)
    {
        _quizRepository = quizRepository;
        _questionRepository = questionRepository;
        _choiceRepository = choiceRepository;
        _mediaRepository = mediaRepository;
        _errorRegionRepository = errorRegionRepository;
        _annotationRepository = annotationRepository;
        _arrangeItemRepository = arrangeItemRepository;
        _writingConfigRepository = writingConfigRepository;
        _scenarioNodeRepository = scenarioNodeRepository;
        _scenarioChoiceRepository = scenarioChoiceRepository;
        _attemptRepository = attemptRepository;
        _answerRepository = answerRepository;
        _answerSelectedChoiceRepository = answerSelectedChoiceRepository;
        _answerErrorRegionRepository = answerErrorRegionRepository;
        _answerAnnotationRepository = answerAnnotationRepository;
        _answerArrangeItemRepository = answerArrangeItemRepository;
        _answerScenarioPathRepository = answerScenarioPathRepository;
        _courseRepository = courseRepository;
        _lessonRepository = lessonRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<QuizDto?> CreateQuizAsync(int instructorId, CreateQuizRequest request)
    {
        var course = (await _courseRepository.FindAsync(c => c.CourseId == request.CourseId)).FirstOrDefault();
        if (course is null) throw new ArgumentException($"Course with ID {request.CourseId} not found.");
        if (course.InstructorId != instructorId) throw new UnauthorizedAccessException("You do not have permission to create this quiz.");

        if (request.LessonId.HasValue)
        {
            var lesson = (await _lessonRepository.FindAsync(l => l.LessonId == request.LessonId.Value)).FirstOrDefault();
            if (lesson is null) throw new ArgumentException($"Lesson with ID {request.LessonId.Value} not found.");
            if (lesson.CourseId != request.CourseId) throw new ArgumentException("The selected lesson does not belong to the selected course.");
        }

        var existingQuizzes = await _quizRepository.FindAsync(q => q.CourseId == request.CourseId && q.LessonId == request.LessonId);
        if (existingQuizzes.Any()) throw new ArgumentException(request.LessonId.HasValue ? "This lesson already has a quiz." : "This course already has an overall quiz.");
        if (request.Questions == null || request.Questions.Count == 0) throw new ArgumentException("At least one question is required.");
        foreach (var question in request.Questions) ValidateQuestion(question);

        var quiz = new Quiz
        {
            CourseId = request.CourseId,
            LessonId = request.LessonId,
            CreatedById = instructorId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScore = request.PassingScore,
            MaxAttempts = request.MaxAttempts,
            Status = request.Status,
            CreatedAt = DateTime.UtcNow
        };
        await _quizRepository.AddAsync(quiz);
        await _unitOfWork.SaveChangesAsync();

        foreach (var requestQuestion in request.Questions)
        {
            var question = new Question
            {
                QuizId = quiz.QuizId,
                QuestionText = requestQuestion.QuestionText.Trim(),
                QuestionType = requestQuestion.QuestionType,
                Instruction = requestQuestion.Instruction?.Trim(),
                Explanation = requestQuestion.Explanation?.Trim(),
                Points = requestQuestion.Points,
                IsRequired = requestQuestion.IsRequired,
                OrderIndex = requestQuestion.OrderIndex
            };
            await _questionRepository.AddAsync(question);
            await _unitOfWork.SaveChangesAsync();
            await CreateQuestionChildrenAsync(question.QuestionId, requestQuestion);
        }

        return await GetQuizByIdAsync(quiz.QuizId);
    }

    private async Task CreateQuestionChildrenAsync(int questionId, CreateQuestionRequest request)
    {
        foreach (var x in request.Choices)
            await _choiceRepository.AddAsync(new Choice { QuestionId = questionId, ChoiceText = x.ChoiceText.Trim(), OptionValue = x.OptionValue?.Trim(), IsCorrect = x.IsCorrect, Explanation = x.Explanation?.Trim(), OrderIndex = x.OrderIndex });
        foreach (var x in request.Media)
            await _mediaRepository.AddAsync(new QuestionMedia { QuestionId = questionId, MediaType = x.MediaType, MediaUrl = x.MediaUrl.Trim(), Label = x.Label?.Trim(), DurationSeconds = x.DurationSeconds, OrderIndex = x.OrderIndex });
        foreach (var x in request.ErrorRegions)
            await _errorRegionRepository.AddAsync(new QuestionErrorRegion { QuestionId = questionId, StartTimeMs = x.StartTimeMs, EndTimeMs = x.EndTimeMs, ErrorCategory = x.ErrorCategory.Trim(), ErrorCode = x.ErrorCode.Trim(), Description = x.Description?.Trim(), CorrectionText = x.CorrectionText?.Trim(), Points = x.Points });
        foreach (var x in request.Annotations)
            await _annotationRepository.AddAsync(new QuestionAnnotation { QuestionId = questionId, AnnotationType = x.AnnotationType, StartIndex = x.StartIndex, EndIndex = x.EndIndex, AnnotationValue = x.AnnotationValue?.Trim(), Explanation = x.Explanation?.Trim(), Points = x.Points });
        foreach (var x in request.ArrangeItems)
            await _arrangeItemRepository.AddAsync(new QuestionArrangeItem { QuestionId = questionId, Content = x.Content.Trim(), CorrectOrder = x.CorrectOrder, IsDistractor = x.IsDistractor });
        if (request.WritingConfig != null)
        {
            var x = request.WritingConfig;
            await _writingConfigRepository.AddAsync(new QuestionWritingConfig { QuestionId = questionId, EventType = x.EventType?.Trim(), Audience = x.Audience?.Trim(), Style = x.Style?.Trim(), MinWords = x.MinWords, MaxWords = x.MaxWords, RequiredElementsJson = x.RequiredElementsJson, GradingRubricJson = x.GradingRubricJson });
        }
        await _unitOfWork.SaveChangesAsync();
        await CreateScenarioAsync(questionId, request.ScenarioNodes);
    }

    private async Task CreateScenarioAsync(int questionId, List<CreateScenarioNodeRequest> requests)
    {
        if (requests.Count == 0) return;
        var nodeMap = new Dictionary<string, ScenarioNode>(StringComparer.OrdinalIgnoreCase);
        foreach (var x in requests)
        {
            var node = new ScenarioNode { QuestionId = questionId, NodeType = x.NodeType, Title = x.Title?.Trim(), Content = x.Content.Trim(), MediaUrl = x.MediaUrl?.Trim(), IsStartNode = x.IsStartNode, IsEndNode = x.IsEndNode, Points = x.Points };
            await _scenarioNodeRepository.AddAsync(node);
            nodeMap[x.ClientKey.Trim()] = node;
        }
        await _unitOfWork.SaveChangesAsync();
        foreach (var x in requests)
        {
            var source = nodeMap[x.ClientKey.Trim()];
            foreach (var c in x.Choices)
            {
                int? nextNodeId = null;
                if (!string.IsNullOrWhiteSpace(c.NextNodeClientKey)) nextNodeId = nodeMap[c.NextNodeClientKey.Trim()].NodeId;
                await _scenarioChoiceRepository.AddAsync(new ScenarioChoice { NodeId = source.NodeId, ChoiceText = c.ChoiceText.Trim(), NextNodeId = nextNodeId, Score = c.Score, Feedback = c.Feedback?.Trim(), OrderIndex = c.OrderIndex });
            }
        }
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<QuizDto?> GetQuizByIdAsync(int quizId)
    {
        var quiz = (await _quizRepository.FindAsync(q => q.QuizId == quizId, q => q.Questions)).FirstOrDefault();
        if (quiz is null) return null;
        var questions = (quiz.Questions ?? new List<Question>()).OrderBy(q => q.OrderIndex).ToList();
        var questionIds = questions.Select(q => q.QuestionId).ToList();
        var choices = await _choiceRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var media = await _mediaRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var regions = await _errorRegionRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var annotations = await _annotationRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var arrangeItems = await _arrangeItemRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var writingConfigs = await _writingConfigRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var nodes = await _scenarioNodeRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var nodeIds = nodes.Select(x => x.NodeId).ToList();
        var scenarioChoices = await _scenarioChoiceRepository.FindAsync(x => nodeIds.Contains(x.NodeId));

        return new QuizDto
        {
            QuizId = quiz.QuizId, CourseId = quiz.CourseId, LessonId = quiz.LessonId, CreatedById = quiz.CreatedById,
            Title = quiz.Title, Description = quiz.Description, TimeLimitMinutes = quiz.TimeLimitMinutes,
            PassingScore = quiz.PassingScore, MaxAttempts = quiz.MaxAttempts, Status = quiz.Status, CreatedAt = quiz.CreatedAt,
            Questions = questions.Select(q => new QuestionDto
            {
                QuestionId = q.QuestionId, QuizId = q.QuizId, QuestionText = q.QuestionText, QuestionType = q.QuestionType,
                Instruction = q.Instruction, Explanation = q.Explanation, Points = q.Points, IsRequired = q.IsRequired, OrderIndex = q.OrderIndex,
                Choices = choices.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.OrderIndex).Select(x => new ChoiceDto { ChoiceId = x.ChoiceId, QuestionId = x.QuestionId, ChoiceText = x.ChoiceText, OptionValue = x.OptionValue, IsCorrect = x.IsCorrect, Explanation = x.Explanation, OrderIndex = x.OrderIndex }).ToList(),
                Media = media.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.OrderIndex).Select(x => new QuestionMediaDto { MediaId = x.MediaId, QuestionId = x.QuestionId, MediaType = x.MediaType, MediaUrl = x.MediaUrl, Label = x.Label, DurationSeconds = x.DurationSeconds, OrderIndex = x.OrderIndex }).ToList(),
                ErrorRegions = regions.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.StartTimeMs).Select(x => new ErrorRegionDto { ErrorRegionId = x.ErrorRegionId, QuestionId = x.QuestionId, StartTimeMs = x.StartTimeMs, EndTimeMs = x.EndTimeMs, ErrorCategory = x.ErrorCategory, ErrorCode = x.ErrorCode, Description = x.Description, CorrectionText = x.CorrectionText, Points = x.Points }).ToList(),
                Annotations = annotations.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.StartIndex).Select(x => new AnnotationDto { AnnotationId = x.AnnotationId, QuestionId = x.QuestionId, AnnotationType = x.AnnotationType, StartIndex = x.StartIndex, EndIndex = x.EndIndex, AnnotationValue = x.AnnotationValue, Explanation = x.Explanation, Points = x.Points }).ToList(),
                ArrangeItems = arrangeItems.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.CorrectOrder ?? int.MaxValue).Select(x => new ArrangeItemDto { ArrangeItemId = x.ArrangeItemId, QuestionId = x.QuestionId, Content = x.Content, CorrectOrder = x.CorrectOrder, IsDistractor = x.IsDistractor }).ToList(),
                WritingConfig = writingConfigs.Where(x => x.QuestionId == q.QuestionId).Select(x => new WritingConfigDto { WritingConfigId = x.WritingConfigId, QuestionId = x.QuestionId, EventType = x.EventType, Audience = x.Audience, Style = x.Style, MinWords = x.MinWords, MaxWords = x.MaxWords, RequiredElementsJson = x.RequiredElementsJson, GradingRubricJson = x.GradingRubricJson }).FirstOrDefault(),
                ScenarioNodes = nodes.Where(x => x.QuestionId == q.QuestionId).OrderByDescending(x => x.IsStartNode).ThenBy(x => x.NodeId).Select(x => new ScenarioNodeDto
                {
                    NodeId = x.NodeId, QuestionId = x.QuestionId, NodeType = x.NodeType, Title = x.Title, Content = x.Content, MediaUrl = x.MediaUrl, IsStartNode = x.IsStartNode, IsEndNode = x.IsEndNode, Points = x.Points,
                    Choices = scenarioChoices.Where(c => c.NodeId == x.NodeId).OrderBy(c => c.OrderIndex).Select(c => new ScenarioChoiceDto { ScenarioChoiceId = c.ScenarioChoiceId, NodeId = c.NodeId, ChoiceText = c.ChoiceText, NextNodeId = c.NextNodeId, Score = c.Score, Feedback = c.Feedback, OrderIndex = c.OrderIndex }).ToList()
                }).ToList()
            }).ToList()
        };
    }

    public async Task<QuizDto?> UpdateQuizAsync(int instructorId, int quizId, UpdateQuizRequest request)
    {
        var quiz = (await _quizRepository.FindAsync(q => q.QuizId == quizId, q => q.Questions)).FirstOrDefault();
        if (quiz is null) throw new ArgumentException($"Quiz with ID {quizId} not found.");
        if (quiz.CreatedById != instructorId) throw new UnauthorizedAccessException("You do not have permission to update this quiz.");
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Quiz title is required.");
        if (request.Questions == null || request.Questions.Count == 0) throw new ArgumentException("At least one question is required.");
        foreach (var question in request.Questions) ValidateUpdateQuestion(question);

        var hasAttempts = (await _attemptRepository.FindAsync(a => a.QuizId == quizId)).Any();
        quiz.Title = request.Title.Trim(); quiz.Description = request.Description?.Trim(); quiz.TimeLimitMinutes = request.TimeLimitMinutes;
        quiz.PassingScore = request.PassingScore; quiz.MaxAttempts = request.MaxAttempts; quiz.Status = request.Status;
        _quizRepository.Update(quiz);

        var existingQuestions = (quiz.Questions ?? new List<Question>()).ToList();
        var requestedQuestionIds = request.Questions.Where(x => x.QuestionId > 0).Select(x => x.QuestionId).ToHashSet();
        foreach (var x in request.Questions.Where(x => x.QuestionId > 0))
            if (!existingQuestions.Any(q => q.QuestionId == x.QuestionId)) throw new ArgumentException($"Question with ID {x.QuestionId} does not belong to quiz {quizId}.");
        var removedQuestions = existingQuestions.Where(x => !requestedQuestionIds.Contains(x.QuestionId)).ToList();
        if (hasAttempts && removedQuestions.Count > 0) throw new ArgumentException("Questions cannot be deleted because this quiz already has attempts.");
        foreach (var x in removedQuestions) _questionRepository.Remove(x);
        await _unitOfWork.SaveChangesAsync();

        foreach (var requestQuestion in request.Questions)
        {
            Question question;
            if (requestQuestion.QuestionId > 0)
            {
                question = existingQuestions.First(x => x.QuestionId == requestQuestion.QuestionId);
                question.QuestionText = requestQuestion.QuestionText.Trim(); question.QuestionType = requestQuestion.QuestionType;
                question.Instruction = requestQuestion.Instruction?.Trim(); question.Explanation = requestQuestion.Explanation?.Trim();
                question.Points = requestQuestion.Points; question.IsRequired = requestQuestion.IsRequired; question.OrderIndex = requestQuestion.OrderIndex;
                _questionRepository.Update(question);
            }
            else
            {
                question = new Question { QuizId = quizId, QuestionText = requestQuestion.QuestionText.Trim(), QuestionType = requestQuestion.QuestionType, Instruction = requestQuestion.Instruction?.Trim(), Explanation = requestQuestion.Explanation?.Trim(), Points = requestQuestion.Points, IsRequired = requestQuestion.IsRequired, OrderIndex = requestQuestion.OrderIndex };
                await _questionRepository.AddAsync(question);
                await _unitOfWork.SaveChangesAsync();
            }
            await SyncQuestionChildrenAsync(question.QuestionId, requestQuestion, hasAttempts);
        }
        await _unitOfWork.SaveChangesAsync();
        return await GetQuizByIdAsync(quizId);
    }

    private async Task SyncQuestionChildrenAsync(int questionId, UpdateQuestionRequest request, bool hasAttempts)
    {
        await SyncChoicesAsync(questionId, request.Choices, hasAttempts);
        await SyncMediaAsync(questionId, request.Media, hasAttempts);
        await SyncRegionsAsync(questionId, request.ErrorRegions, hasAttempts);
        await SyncAnnotationsAsync(questionId, request.Annotations, hasAttempts);
        await SyncArrangeItemsAsync(questionId, request.ArrangeItems, hasAttempts);
        await SyncWritingConfigAsync(questionId, request.WritingConfig, hasAttempts);
        await SyncScenarioAsync(questionId, request.ScenarioNodes, hasAttempts);
    }

    private async Task SyncChoicesAsync(int questionId, List<UpdateChoiceRequest> requests, bool locked)
    {
        var existing = (await _choiceRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.ChoiceId > 0).Select(x => x.ChoiceId), existing.Select(x => x.ChoiceId), "Choice", questionId);
        RemoveMissing(existing, requests.Where(x => x.ChoiceId > 0).Select(x => x.ChoiceId), locked, "Choices", _choiceRepository.Remove, x => x.ChoiceId);
        foreach (var r in requests) if (r.ChoiceId > 0) { var x = existing.First(y => y.ChoiceId == r.ChoiceId); x.ChoiceText = r.ChoiceText.Trim(); x.OptionValue = r.OptionValue?.Trim(); x.IsCorrect = r.IsCorrect; x.Explanation = r.Explanation?.Trim(); x.OrderIndex = r.OrderIndex; _choiceRepository.Update(x); } else await _choiceRepository.AddAsync(new Choice { QuestionId = questionId, ChoiceText = r.ChoiceText.Trim(), OptionValue = r.OptionValue?.Trim(), IsCorrect = r.IsCorrect, Explanation = r.Explanation?.Trim(), OrderIndex = r.OrderIndex });
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncMediaAsync(int questionId, List<UpdateQuestionMediaRequest> requests, bool locked)
    {
        var existing = (await _mediaRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.MediaId > 0).Select(x => x.MediaId), existing.Select(x => x.MediaId), "Media", questionId);
        RemoveMissing(existing, requests.Where(x => x.MediaId > 0).Select(x => x.MediaId), locked, "Media", _mediaRepository.Remove, x => x.MediaId);
        foreach (var r in requests) if (r.MediaId > 0) { var x = existing.First(y => y.MediaId == r.MediaId); x.MediaType = r.MediaType; x.MediaUrl = r.MediaUrl.Trim(); x.Label = r.Label?.Trim(); x.DurationSeconds = r.DurationSeconds; x.OrderIndex = r.OrderIndex; _mediaRepository.Update(x); } else await _mediaRepository.AddAsync(new QuestionMedia { QuestionId = questionId, MediaType = r.MediaType, MediaUrl = r.MediaUrl.Trim(), Label = r.Label?.Trim(), DurationSeconds = r.DurationSeconds, OrderIndex = r.OrderIndex });
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncRegionsAsync(int questionId, List<UpdateErrorRegionRequest> requests, bool locked)
    {
        var existing = (await _errorRegionRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.ErrorRegionId > 0).Select(x => x.ErrorRegionId), existing.Select(x => x.ErrorRegionId), "Error region", questionId);
        RemoveMissing(existing, requests.Where(x => x.ErrorRegionId > 0).Select(x => x.ErrorRegionId), locked, "Error regions", _errorRegionRepository.Remove, x => x.ErrorRegionId);
        foreach (var r in requests) if (r.ErrorRegionId > 0) { var x = existing.First(y => y.ErrorRegionId == r.ErrorRegionId); x.StartTimeMs = r.StartTimeMs; x.EndTimeMs = r.EndTimeMs; x.ErrorCategory = r.ErrorCategory.Trim(); x.ErrorCode = r.ErrorCode.Trim(); x.Description = r.Description?.Trim(); x.CorrectionText = r.CorrectionText?.Trim(); x.Points = r.Points; _errorRegionRepository.Update(x); } else await _errorRegionRepository.AddAsync(new QuestionErrorRegion { QuestionId = questionId, StartTimeMs = r.StartTimeMs, EndTimeMs = r.EndTimeMs, ErrorCategory = r.ErrorCategory.Trim(), ErrorCode = r.ErrorCode.Trim(), Description = r.Description?.Trim(), CorrectionText = r.CorrectionText?.Trim(), Points = r.Points });
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncAnnotationsAsync(int questionId, List<UpdateAnnotationRequest> requests, bool locked)
    {
        var existing = (await _annotationRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.AnnotationId > 0).Select(x => x.AnnotationId), existing.Select(x => x.AnnotationId), "Annotation", questionId);
        RemoveMissing(existing, requests.Where(x => x.AnnotationId > 0).Select(x => x.AnnotationId), locked, "Annotations", _annotationRepository.Remove, x => x.AnnotationId);
        foreach (var r in requests) if (r.AnnotationId > 0) { var x = existing.First(y => y.AnnotationId == r.AnnotationId); x.AnnotationType = r.AnnotationType; x.StartIndex = r.StartIndex; x.EndIndex = r.EndIndex; x.AnnotationValue = r.AnnotationValue?.Trim(); x.Explanation = r.Explanation?.Trim(); x.Points = r.Points; _annotationRepository.Update(x); } else await _annotationRepository.AddAsync(new QuestionAnnotation { QuestionId = questionId, AnnotationType = r.AnnotationType, StartIndex = r.StartIndex, EndIndex = r.EndIndex, AnnotationValue = r.AnnotationValue?.Trim(), Explanation = r.Explanation?.Trim(), Points = r.Points });
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncArrangeItemsAsync(int questionId, List<UpdateArrangeItemRequest> requests, bool locked)
    {
        var existing = (await _arrangeItemRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.ArrangeItemId > 0).Select(x => x.ArrangeItemId), existing.Select(x => x.ArrangeItemId), "Arrange item", questionId);
        RemoveMissing(existing, requests.Where(x => x.ArrangeItemId > 0).Select(x => x.ArrangeItemId), locked, "Arrange items", _arrangeItemRepository.Remove, x => x.ArrangeItemId);
        foreach (var r in requests) if (r.ArrangeItemId > 0) { var x = existing.First(y => y.ArrangeItemId == r.ArrangeItemId); x.Content = r.Content.Trim(); x.CorrectOrder = r.CorrectOrder; x.IsDistractor = r.IsDistractor; _arrangeItemRepository.Update(x); } else await _arrangeItemRepository.AddAsync(new QuestionArrangeItem { QuestionId = questionId, Content = r.Content.Trim(), CorrectOrder = r.CorrectOrder, IsDistractor = r.IsDistractor });
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncWritingConfigAsync(int questionId, UpdateWritingConfigRequest? request, bool locked)
    {
        var existing = (await _writingConfigRepository.FindAsync(x => x.QuestionId == questionId)).FirstOrDefault();
        if (request == null)
        {
            if (existing != null) { if (locked) throw new ArgumentException("Writing config cannot be deleted because this quiz already has attempts."); _writingConfigRepository.Remove(existing); await _unitOfWork.SaveChangesAsync(); }
            return;
        }
        if (existing == null)
        {
            if (request.WritingConfigId > 0) throw new ArgumentException($"Writing config with ID {request.WritingConfigId} does not belong to question {questionId}.");
            await _writingConfigRepository.AddAsync(new QuestionWritingConfig { QuestionId = questionId, EventType = request.EventType?.Trim(), Audience = request.Audience?.Trim(), Style = request.Style?.Trim(), MinWords = request.MinWords, MaxWords = request.MaxWords, RequiredElementsJson = request.RequiredElementsJson, GradingRubricJson = request.GradingRubricJson });
        }
        else
        {
            if (request.WritingConfigId > 0 && request.WritingConfigId != existing.WritingConfigId) throw new ArgumentException($"Writing config with ID {request.WritingConfigId} does not belong to question {questionId}.");
            existing.EventType = request.EventType?.Trim(); existing.Audience = request.Audience?.Trim(); existing.Style = request.Style?.Trim(); existing.MinWords = request.MinWords; existing.MaxWords = request.MaxWords; existing.RequiredElementsJson = request.RequiredElementsJson; existing.GradingRubricJson = request.GradingRubricJson; _writingConfigRepository.Update(existing);
        }
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task SyncScenarioAsync(int questionId, List<UpdateScenarioNodeRequest> requests, bool locked)
    {
        var existingNodes = (await _scenarioNodeRepository.FindAsync(x => x.QuestionId == questionId)).ToList();
        EnsureIdsBelong(requests.Where(x => x.NodeId > 0).Select(x => x.NodeId), existingNodes.Select(x => x.NodeId), "Scenario node", questionId);
        var requestNodeIds = requests.Where(x => x.NodeId > 0).Select(x => x.NodeId).ToHashSet();
        var removedNodes = existingNodes.Where(x => !requestNodeIds.Contains(x.NodeId)).ToList();
        if (locked && removedNodes.Count > 0) throw new ArgumentException("Scenario nodes cannot be deleted because this quiz already has attempts.");

        var allExistingNodeIds = existingNodes.Select(x => x.NodeId).ToList();
        var existingChoices = (await _scenarioChoiceRepository.FindAsync(x => allExistingNodeIds.Contains(x.NodeId))).ToList();
        foreach (var node in removedNodes)
            foreach (var choice in existingChoices.Where(x => x.NodeId == node.NodeId || x.NextNodeId == node.NodeId).Distinct()) _scenarioChoiceRepository.Remove(choice);
        foreach (var node in removedNodes) _scenarioNodeRepository.Remove(node);
        await _unitOfWork.SaveChangesAsync();

        var keyMap = new Dictionary<string, ScenarioNode>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in requests)
        {
            ScenarioNode node;
            if (r.NodeId > 0)
            {
                node = existingNodes.First(x => x.NodeId == r.NodeId);
                node.NodeType = r.NodeType; node.Title = r.Title?.Trim(); node.Content = r.Content.Trim(); node.MediaUrl = r.MediaUrl?.Trim(); node.IsStartNode = r.IsStartNode; node.IsEndNode = r.IsEndNode; node.Points = r.Points; _scenarioNodeRepository.Update(node);
            }
            else
            {
                node = new ScenarioNode { QuestionId = questionId, NodeType = r.NodeType, Title = r.Title?.Trim(), Content = r.Content.Trim(), MediaUrl = r.MediaUrl?.Trim(), IsStartNode = r.IsStartNode, IsEndNode = r.IsEndNode, Points = r.Points };
                await _scenarioNodeRepository.AddAsync(node);
            }
            keyMap[r.ClientKey.Trim()] = node;
        }
        await _unitOfWork.SaveChangesAsync();

        var validNodeIds = keyMap.Values.Select(x => x.NodeId).ToHashSet();
        foreach (var r in requests)
        {
            var node = keyMap[r.ClientKey.Trim()];
            var oldChoices = (await _scenarioChoiceRepository.FindAsync(x => x.NodeId == node.NodeId)).ToList();
            EnsureIdsBelong(r.Choices.Where(x => x.ScenarioChoiceId > 0).Select(x => x.ScenarioChoiceId), oldChoices.Select(x => x.ScenarioChoiceId), "Scenario choice", node.NodeId);
            RemoveMissing(oldChoices, r.Choices.Where(x => x.ScenarioChoiceId > 0).Select(x => x.ScenarioChoiceId), locked, "Scenario choices", _scenarioChoiceRepository.Remove, x => x.ScenarioChoiceId);
            foreach (var c in r.Choices)
            {
                int? nextId = c.NextNodeId;
                if (!string.IsNullOrWhiteSpace(c.NextNodeClientKey)) nextId = keyMap[c.NextNodeClientKey.Trim()].NodeId;
                if (nextId.HasValue && !validNodeIds.Contains(nextId.Value)) throw new ArgumentException($"Next scenario node {nextId.Value} does not belong to question {questionId}.");
                if (c.ScenarioChoiceId > 0) { var x = oldChoices.First(y => y.ScenarioChoiceId == c.ScenarioChoiceId); x.ChoiceText = c.ChoiceText.Trim(); x.NextNodeId = nextId; x.Score = c.Score; x.Feedback = c.Feedback?.Trim(); x.OrderIndex = c.OrderIndex; _scenarioChoiceRepository.Update(x); }
                else await _scenarioChoiceRepository.AddAsync(new ScenarioChoice { NodeId = node.NodeId, ChoiceText = c.ChoiceText.Trim(), NextNodeId = nextId, Score = c.Score, Feedback = c.Feedback?.Trim(), OrderIndex = c.OrderIndex });
            }
            await _unitOfWork.SaveChangesAsync();
        }
    }

    private static void EnsureIdsBelong(IEnumerable<int> requestedIds, IEnumerable<int> existingIds, string name, int parentId)
    {
        var existing = existingIds.ToHashSet();
        var invalid = requestedIds.FirstOrDefault(id => !existing.Contains(id));
        if (invalid > 0) throw new ArgumentException($"{name} with ID {invalid} does not belong to parent {parentId}.");
    }

    private static void RemoveMissing<T>(IEnumerable<T> existing, IEnumerable<int> requestedIds, bool locked, string label, Action<T> remove, Func<T, int> idSelector)
    {
        var ids = requestedIds.ToHashSet();
        var removed = existing.Where(x => !ids.Contains(idSelector(x))).ToList();
        if (locked && removed.Count > 0) throw new ArgumentException($"{label} cannot be deleted because this quiz already has attempts.");
        foreach (var x in removed) remove(x);
    }

    private static void ValidateQuestion(CreateQuestionRequest q)
    {
        ValidateCommon(q.QuestionText, q.Points);
        switch (q.QuestionType)
        {
            case QuestionType.SINGLE_CHOICE: ValidateChoiceSet(q.Choices, 2, true, false, "Single choice"); break;
            case QuestionType.MULTIPLE_CHOICE: ValidateChoiceSet(q.Choices, 2, false, false, "Multiple choice"); break;
            case QuestionType.TRUE_FALSE: ValidateChoiceSet(q.Choices, 2, true, true, "True/false"); break;
            case QuestionType.FILL_BLANK: break;
            case QuestionType.LISTEN_IDENTIFY_ERROR: RequireAudio(q.Media, 1); ValidateChoiceSet(q.Choices, 2, false, false, "Listen & Identify Error"); break;
            case QuestionType.LISTEN_LOCATE_ERROR: RequireAudio(q.Media, 1); ValidateRegions(q.ErrorRegions); break;
            case QuestionType.AUDIO_COMPARISON: RequireAudio(q.Media, 2); ValidateChoiceSet(q.Choices, 2, false, false, "Audio Comparison"); break;
            case QuestionType.LISTEN_CLASSIFY: RequireAudio(q.Media, 1); ValidateChoiceSet(q.Choices, 2, false, false, "Listen & Classify"); break;
            case QuestionType.SCRIPT_ANNOTATION: ValidateAnnotations(q.Annotations); break;
            case QuestionType.SCRIPT_WRITING: ValidateWriting(q.WritingConfig); break;
            case QuestionType.ARRANGE_SCRIPT: ValidateArrange(q.ArrangeItems); break;
            case QuestionType.ERROR_CORRECTION_LAB: ValidateRegions(q.ErrorRegions); if (q.Choices.Count > 0) ValidateChoiceSet(q.Choices, 2, false, false, "Error Correction Lab"); break;
            case QuestionType.SCENARIO_DECISION_TREE: ValidateScenario(q.ScenarioNodes); break;
            case QuestionType.ESSAY: break;
            default: throw new ArgumentException("Invalid question type.");
        }
    }

    private static void ValidateUpdateQuestion(UpdateQuestionRequest q)
    {
        ValidateCommon(q.QuestionText, q.Points);
        switch (q.QuestionType)
        {
            case QuestionType.SINGLE_CHOICE: ValidateUpdateChoiceSet(q.Choices, 2, true, false, "Single choice"); break;
            case QuestionType.MULTIPLE_CHOICE: ValidateUpdateChoiceSet(q.Choices, 2, false, false, "Multiple choice"); break;
            case QuestionType.TRUE_FALSE: ValidateUpdateChoiceSet(q.Choices, 2, true, true, "True/false"); break;
            case QuestionType.FILL_BLANK: break;
            case QuestionType.LISTEN_IDENTIFY_ERROR: RequireUpdateAudio(q.Media, 1); ValidateUpdateChoiceSet(q.Choices, 2, false, false, "Listen & Identify Error"); break;
            case QuestionType.LISTEN_LOCATE_ERROR: RequireUpdateAudio(q.Media, 1); ValidateUpdateRegions(q.ErrorRegions); break;
            case QuestionType.AUDIO_COMPARISON: RequireUpdateAudio(q.Media, 2); ValidateUpdateChoiceSet(q.Choices, 2, false, false, "Audio Comparison"); break;
            case QuestionType.LISTEN_CLASSIFY: RequireUpdateAudio(q.Media, 1); ValidateUpdateChoiceSet(q.Choices, 2, false, false, "Listen & Classify"); break;
            case QuestionType.SCRIPT_ANNOTATION: ValidateUpdateAnnotations(q.Annotations); break;
            case QuestionType.SCRIPT_WRITING: ValidateUpdateWriting(q.WritingConfig); break;
            case QuestionType.ARRANGE_SCRIPT: ValidateUpdateArrange(q.ArrangeItems); break;
            case QuestionType.ERROR_CORRECTION_LAB: ValidateUpdateRegions(q.ErrorRegions); if (q.Choices.Count > 0) ValidateUpdateChoiceSet(q.Choices, 2, false, false, "Error Correction Lab"); break;
            case QuestionType.SCENARIO_DECISION_TREE: ValidateUpdateScenario(q.ScenarioNodes); break;
            case QuestionType.ESSAY: break;
            default: throw new ArgumentException("Invalid question type.");
        }
    }

    private static void ValidateCommon(string text, decimal points) { if (string.IsNullOrWhiteSpace(text)) throw new ArgumentException("Question text is required."); if (points <= 0) throw new ArgumentException("Question points must be greater than 0."); }
    private static void ValidateChoiceSet(List<CreateChoiceRequest> xs, int min, bool exactlyOne, bool exactlyTwo, string label) { if (xs.Count < min || (exactlyTwo && xs.Count != 2)) throw new ArgumentException($"{label} question has an invalid number of choices."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.ChoiceText))) throw new ArgumentException("Choice text cannot be empty."); var correct = xs.Count(x => x.IsCorrect); if ((exactlyOne && correct != 1) || (!exactlyOne && correct < 1)) throw new ArgumentException($"{label} question has an invalid number of correct choices."); }
    private static void ValidateUpdateChoiceSet(List<UpdateChoiceRequest> xs, int min, bool exactlyOne, bool exactlyTwo, string label) { if (xs.Count < min || (exactlyTwo && xs.Count != 2)) throw new ArgumentException($"{label} question has an invalid number of choices."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.ChoiceText))) throw new ArgumentException("Choice text cannot be empty."); var correct = xs.Count(x => x.IsCorrect); if ((exactlyOne && correct != 1) || (!exactlyOne && correct < 1)) throw new ArgumentException($"{label} question has an invalid number of correct choices."); }
    private static void RequireAudio(List<CreateQuestionMediaRequest> xs, int min) { if (xs.Count(x => x.MediaType == QuestionMediaType.AUDIO) < min) throw new ArgumentException($"This question requires at least {min} audio file(s)."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.MediaUrl))) throw new ArgumentException("Media URL cannot be empty."); }
    private static void RequireUpdateAudio(List<UpdateQuestionMediaRequest> xs, int min) { if (xs.Count(x => x.MediaType == QuestionMediaType.AUDIO) < min) throw new ArgumentException($"This question requires at least {min} audio file(s)."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.MediaUrl))) throw new ArgumentException("Media URL cannot be empty."); }
    private static void ValidateRegions(List<CreateErrorRegionRequest> xs) { if (xs.Count == 0) throw new ArgumentException("At least one error region is required."); if (xs.Any(x => x.StartTimeMs < 0 || x.EndTimeMs <= x.StartTimeMs || string.IsNullOrWhiteSpace(x.ErrorCategory) || string.IsNullOrWhiteSpace(x.ErrorCode))) throw new ArgumentException("Error region data is invalid."); }
    private static void ValidateUpdateRegions(List<UpdateErrorRegionRequest> xs) { if (xs.Count == 0) throw new ArgumentException("At least one error region is required."); if (xs.Any(x => x.StartTimeMs < 0 || x.EndTimeMs <= x.StartTimeMs || string.IsNullOrWhiteSpace(x.ErrorCategory) || string.IsNullOrWhiteSpace(x.ErrorCode))) throw new ArgumentException("Error region data is invalid."); }
    private static void ValidateAnnotations(List<CreateAnnotationRequest> xs) { if (xs.Count == 0) throw new ArgumentException("At least one annotation is required."); if (xs.Any(x => x.StartIndex < 0 || x.EndIndex < x.StartIndex)) throw new ArgumentException("Annotation range is invalid."); }
    private static void ValidateUpdateAnnotations(List<UpdateAnnotationRequest> xs) { if (xs.Count == 0) throw new ArgumentException("At least one annotation is required."); if (xs.Any(x => x.StartIndex < 0 || x.EndIndex < x.StartIndex)) throw new ArgumentException("Annotation range is invalid."); }
    private static void ValidateWriting(CreateWritingConfigRequest? x) { if (x == null) throw new ArgumentException("Script Writing requires writing configuration."); if (x.MinWords.HasValue && x.MaxWords.HasValue && x.MinWords > x.MaxWords) throw new ArgumentException("MinWords cannot be greater than MaxWords."); }
    private static void ValidateUpdateWriting(UpdateWritingConfigRequest? x) { if (x == null) throw new ArgumentException("Script Writing requires writing configuration."); if (x.MinWords.HasValue && x.MaxWords.HasValue && x.MinWords > x.MaxWords) throw new ArgumentException("MinWords cannot be greater than MaxWords."); }
    private static void ValidateArrange(List<CreateArrangeItemRequest> xs) { if (xs.Count < 2) throw new ArgumentException("Arrange Script requires at least 2 items."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.Content))) throw new ArgumentException("Arrange item content cannot be empty."); var orders = xs.Where(x => !x.IsDistractor).Select(x => x.CorrectOrder).ToList(); if (orders.Any(x => !x.HasValue) || orders.Where(x => x.HasValue).Select(x => x!.Value).Distinct().Count() != orders.Count) throw new ArgumentException("Non-distractor arrange items must have unique CorrectOrder values."); }
    private static void ValidateUpdateArrange(List<UpdateArrangeItemRequest> xs) { if (xs.Count < 2) throw new ArgumentException("Arrange Script requires at least 2 items."); if (xs.Any(x => string.IsNullOrWhiteSpace(x.Content))) throw new ArgumentException("Arrange item content cannot be empty."); var orders = xs.Where(x => !x.IsDistractor).Select(x => x.CorrectOrder).ToList(); if (orders.Any(x => !x.HasValue) || orders.Where(x => x.HasValue).Select(x => x!.Value).Distinct().Count() != orders.Count) throw new ArgumentException("Non-distractor arrange items must have unique CorrectOrder values."); }
    private static void ValidateScenario(List<CreateScenarioNodeRequest> xs) { if (xs.Count < 2) throw new ArgumentException("Scenario Decision Tree requires at least 2 nodes."); if (xs.Count(x => x.IsStartNode) != 1) throw new ArgumentException("Scenario must have exactly one start node."); if (xs.Select(x => x.ClientKey.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != xs.Count) throw new ArgumentException("Scenario ClientKey values must be unique."); var keys = xs.Select(x => x.ClientKey.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase); foreach (var n in xs) { if (string.IsNullOrWhiteSpace(n.ClientKey) || string.IsNullOrWhiteSpace(n.Content)) throw new ArgumentException("Scenario node ClientKey and Content are required."); if (!n.IsEndNode && n.Choices.Count == 0) throw new ArgumentException($"Scenario node '{n.ClientKey}' must have at least one choice."); foreach (var c in n.Choices) { if (string.IsNullOrWhiteSpace(c.ChoiceText)) throw new ArgumentException("Scenario choice text cannot be empty."); if (!string.IsNullOrWhiteSpace(c.NextNodeClientKey) && !keys.Contains(c.NextNodeClientKey.Trim())) throw new ArgumentException($"Scenario next node '{c.NextNodeClientKey}' does not exist."); } } }
    private static void ValidateUpdateScenario(List<UpdateScenarioNodeRequest> xs) { if (xs.Count < 2) throw new ArgumentException("Scenario Decision Tree requires at least 2 nodes."); if (xs.Count(x => x.IsStartNode) != 1) throw new ArgumentException("Scenario must have exactly one start node."); if (xs.Select(x => x.ClientKey.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != xs.Count) throw new ArgumentException("Scenario ClientKey values must be unique."); var keys = xs.Select(x => x.ClientKey.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase); foreach (var n in xs) { if (string.IsNullOrWhiteSpace(n.ClientKey) || string.IsNullOrWhiteSpace(n.Content)) throw new ArgumentException("Scenario node ClientKey and Content are required."); if (!n.IsEndNode && n.Choices.Count == 0) throw new ArgumentException($"Scenario node '{n.ClientKey}' must have at least one choice."); foreach (var c in n.Choices) { if (string.IsNullOrWhiteSpace(c.ChoiceText)) throw new ArgumentException("Scenario choice text cannot be empty."); if (!string.IsNullOrWhiteSpace(c.NextNodeClientKey) && !keys.Contains(c.NextNodeClientKey.Trim())) throw new ArgumentException($"Scenario next node '{c.NextNodeClientKey}' does not exist."); } } }

    public async Task<TakeQuizDto?> TakeQuizAsync(int learnerId, int quizId)
    {
        var quiz = (await _quizRepository.FindAsync(q => q.QuizId == quizId, q => q.Questions)).FirstOrDefault();
        if (quiz is null) throw new ArgumentException($"Quiz with ID {quizId} not found.");
        if (quiz.Status != QuizStatus.ACTIVE) throw new ArgumentException("This quiz is not available.");

        var attempts = (await _attemptRepository.FindAsync(a => a.QuizId == quizId && a.UserId == learnerId)).ToList();
        var attempt = attempts.FirstOrDefault(a => !a.SubmittedAt.HasValue);
        if (attempt is null)
        {
            if (attempts.Count >= quiz.MaxAttempts) throw new ArgumentException("You have reached the maximum number of attempts.");
            attempt = new QuizAttempt { QuizId = quizId, UserId = learnerId, AttemptNumber = attempts.Count + 1, StartedAt = DateTime.UtcNow };
            await _attemptRepository.AddAsync(attempt);
            await _unitOfWork.SaveChangesAsync();
        }

        var questions = (quiz.Questions ?? new List<Question>()).OrderBy(q => q.OrderIndex).ToList();
        var questionIds = questions.Select(q => q.QuestionId).ToList();
        var choices = await _choiceRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var media = await _mediaRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var arrangeItems = await _arrangeItemRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var writingConfigs = await _writingConfigRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var nodes = await _scenarioNodeRepository.FindAsync(x => questionIds.Contains(x.QuestionId));
        var nodeIds = nodes.Select(x => x.NodeId).ToList();
        var scenarioChoices = await _scenarioChoiceRepository.FindAsync(x => nodeIds.Contains(x.NodeId));

        return new TakeQuizDto
        {
            QuizId = quiz.QuizId, Title = quiz.Title, Description = quiz.Description, TimeLimitMinutes = quiz.TimeLimitMinutes, PassingScore = quiz.PassingScore, MaxAttempts = quiz.MaxAttempts,
            AttemptId = attempt.AttemptId, AttemptNumber = attempt.AttemptNumber, StartedAt = attempt.StartedAt,
            Questions = questions.Select(q => new TakeQuestionDto
            {
                QuestionId = q.QuestionId, QuestionText = q.QuestionText, QuestionType = q.QuestionType, Instruction = q.Instruction, Points = q.Points, IsRequired = q.IsRequired, OrderIndex = q.OrderIndex,
                Choices = (q.QuestionType == QuestionType.FILL_BLANK ? new List<Choice>() : choices.Where(x => x.QuestionId == q.QuestionId).ToList()).OrderBy(x => x.OrderIndex).Select(x => new TakeChoiceDto { ChoiceId = x.ChoiceId, ChoiceText = x.ChoiceText, OptionValue = x.OptionValue, OrderIndex = x.OrderIndex }).ToList(),
                Media = media.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.OrderIndex).Select(x => new TakeQuestionMediaDto { MediaId = x.MediaId, MediaType = x.MediaType, MediaUrl = x.MediaUrl, Label = x.Label, DurationSeconds = x.DurationSeconds, OrderIndex = x.OrderIndex }).ToList(),
                ArrangeItems = arrangeItems.Where(x => x.QuestionId == q.QuestionId).OrderBy(x => x.ArrangeItemId).Select(x => new TakeArrangeItemDto { ArrangeItemId = x.ArrangeItemId, Content = x.Content }).ToList(),
                WritingConfig = writingConfigs.Where(x => x.QuestionId == q.QuestionId).Select(x => new TakeWritingConfigDto { EventType = x.EventType, Audience = x.Audience, Style = x.Style, MinWords = x.MinWords, MaxWords = x.MaxWords, RequiredElementsJson = x.RequiredElementsJson }).FirstOrDefault(),
                ScenarioNodes = nodes.Where(x => x.QuestionId == q.QuestionId).OrderByDescending(x => x.IsStartNode).ThenBy(x => x.NodeId).Select(x => new TakeScenarioNodeDto
                {
                    NodeId = x.NodeId, NodeType = x.NodeType, Title = x.Title, Content = x.Content, MediaUrl = x.MediaUrl, IsStartNode = x.IsStartNode, IsEndNode = x.IsEndNode,
                    Choices = scenarioChoices.Where(c => c.NodeId == x.NodeId).OrderBy(c => c.OrderIndex).Select(c => new TakeScenarioChoiceDto { ScenarioChoiceId = c.ScenarioChoiceId, NodeId = c.NodeId, ChoiceText = c.ChoiceText, NextNodeId = c.NextNodeId, OrderIndex = c.OrderIndex }).ToList()
                }).ToList()
            }).ToList()
        };
    }

    public async Task<QuizResultDto?> SubmitQuizAsync(int learnerId, int quizId, SubmitQuizRequest request)
    {
        var attempt = (await _attemptRepository.FindAsync(a => a.AttemptId == request.AttemptId && a.QuizId == quizId && a.UserId == learnerId, a => a.Quiz)).FirstOrDefault();
        if (attempt is null) throw new ArgumentException("Quiz attempt not found.");
        if (attempt.SubmittedAt.HasValue) throw new ArgumentException("This quiz attempt has already been submitted.");
        if (attempt.Quiz.TimeLimitMinutes > 0 && DateTime.UtcNow > attempt.StartedAt.AddMinutes(attempt.Quiz.TimeLimitMinutes)) throw new ArgumentException("The quiz time limit has expired.");
        if (request.Answers.GroupBy(x => x.QuestionId).Any(g => g.Count() > 1)) throw new ArgumentException("Each question can only have one answer payload.");

        var questions = (await _questionRepository.FindAsync(q => q.QuizId == quizId)).OrderBy(q => q.OrderIndex).ToList();
        var questionIds = questions.Select(q => q.QuestionId).ToList();
        var choices = (await _choiceRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var regions = (await _errorRegionRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var annotations = (await _annotationRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var arrangeItems = (await _arrangeItemRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var nodes = (await _scenarioNodeRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var nodeIds = nodes.Select(x => x.NodeId).ToList();
        var scenarioChoices = (await _scenarioChoiceRepository.FindAsync(x => nodeIds.Contains(x.NodeId))).ToList();

        foreach (var answer in request.Answers)
            if (!questionIds.Contains(answer.QuestionId)) throw new ArgumentException($"Question with ID {answer.QuestionId} does not belong to this quiz.");
        foreach (var question in questions.Where(x => x.IsRequired))
        {
            var answer = request.Answers.FirstOrDefault(x => x.QuestionId == question.QuestionId);
            if (answer == null || !HasAnswerData(answer)) throw new ArgumentException($"Question {question.QuestionId} is required.");
        }

        var requiresManualGrading = false;
        foreach (var question in questions)
        {
            var requestAnswer = request.Answers.FirstOrDefault(x => x.QuestionId == question.QuestionId) ?? new SubmitQuizAnswerRequest { QuestionId = question.QuestionId };
            var selectedIds = requestAnswer.SelectedChoiceIds.Distinct().ToList();
            if (requestAnswer.SelectedChoiceId.HasValue && !selectedIds.Contains(requestAnswer.SelectedChoiceId.Value)) selectedIds.Add(requestAnswer.SelectedChoiceId.Value);
            var questionChoices = choices.Where(x => x.QuestionId == question.QuestionId).ToList();
            if (selectedIds.Any(id => questionChoices.All(x => x.ChoiceId != id))) throw new ArgumentException($"Selected choice does not belong to question {question.QuestionId}.");

            var quizAnswer = new QuizAnswer { AttemptId = attempt.AttemptId, QuestionId = question.QuestionId, SelectedChoiceId = selectedIds.Count == 1 ? selectedIds[0] : null, TextAnswer = requestAnswer.TextAnswer?.Trim(), MaxScore = question.Points, AnsweredAt = DateTime.UtcNow };
            await _answerRepository.AddAsync(quizAnswer);
            await _unitOfWork.SaveChangesAsync();

            foreach (var choiceId in selectedIds) await _answerSelectedChoiceRepository.AddAsync(new QuizAnswerSelectedChoice { QuizAnswerId = quizAnswer.QuizAnswerId, ChoiceId = choiceId });

            switch (question.QuestionType)
            {
                case QuestionType.SINGLE_CHOICE:
                case QuestionType.MULTIPLE_CHOICE:
                case QuestionType.TRUE_FALSE:
                case QuestionType.LISTEN_IDENTIFY_ERROR:
                case QuestionType.AUDIO_COMPARISON:
                case QuestionType.LISTEN_CLASSIFY:
                    ScoreChoiceAnswer(quizAnswer, questionChoices, selectedIds);
                    break;
                case QuestionType.FILL_BLANK:
                    if (questionChoices.Any(x => x.IsCorrect)) ScoreFillBlankAnswer(quizAnswer, questionChoices, requestAnswer.TextAnswer);
                    else MarkManual(quizAnswer, ref requiresManualGrading);
                    break;
                case QuestionType.LISTEN_LOCATE_ERROR:
                    await ScoreErrorRegionsAsync(quizAnswer, requestAnswer.ErrorRegions, regions.Where(x => x.QuestionId == question.QuestionId).ToList());
                    break;
                case QuestionType.SCRIPT_ANNOTATION:
                    await ScoreAnnotationsAsync(quizAnswer, requestAnswer.Annotations, annotations.Where(x => x.QuestionId == question.QuestionId).ToList());
                    break;
                case QuestionType.SCRIPT_WRITING:
                case QuestionType.ESSAY:
                    MarkManual(quizAnswer, ref requiresManualGrading);
                    break;
                case QuestionType.ARRANGE_SCRIPT:
                    await ScoreArrangeAsync(quizAnswer, requestAnswer.ArrangeItems, arrangeItems.Where(x => x.QuestionId == question.QuestionId).ToList());
                    break;
                case QuestionType.ERROR_CORRECTION_LAB:
                    await ScoreErrorCorrectionLabAsync(quizAnswer, requestAnswer, questionChoices, regions.Where(x => x.QuestionId == question.QuestionId).ToList());
                    break;
                case QuestionType.SCENARIO_DECISION_TREE:
                    await ScoreScenarioAsync(quizAnswer, requestAnswer.ScenarioPath, nodes.Where(x => x.QuestionId == question.QuestionId).ToList(), scenarioChoices);
                    break;
                default: throw new ArgumentException($"Unsupported question type: {question.QuestionType}.");
            }
            _answerRepository.Update(quizAnswer);
            await _unitOfWork.SaveChangesAsync();
        }

        attempt.SubmittedAt = DateTime.UtcNow;
        if (requiresManualGrading)
        {
            attempt.Score = null;
            attempt.ResultStatus = QuizAttemptStatus.PENDING_GRADING;
        }
        else
        {
            var savedAnswers = (await _answerRepository.FindAsync(x => x.AttemptId == attempt.AttemptId)).ToList();
            var totalMax = savedAnswers.Sum(x => x.MaxScore);
            var totalScore = savedAnswers.Sum(x => x.Score ?? 0);
            attempt.Score = totalMax <= 0 ? 0 : Math.Round(totalScore / totalMax * 100, 2);
            attempt.ResultStatus = attempt.Score >= attempt.Quiz.PassingScore ? QuizAttemptStatus.PASSED : QuizAttemptStatus.FAILED;
        }
        _attemptRepository.Update(attempt);
        await _unitOfWork.SaveChangesAsync();
        return await GetQuizResultAsync(learnerId, quizId, attempt.AttemptId);
    }

    private static bool HasAnswerData(SubmitQuizAnswerRequest x) => x.SelectedChoiceId.HasValue || x.SelectedChoiceIds.Count > 0 || !string.IsNullOrWhiteSpace(x.TextAnswer) || x.ErrorRegions.Count > 0 || x.Annotations.Count > 0 || x.ArrangeItems.Count > 0 || x.ScenarioPath.Count > 0;
    private static void MarkManual(QuizAnswer answer, ref bool requiresManualGrading) { answer.Score = null; answer.IsCorrect = null; requiresManualGrading = true; }
    private static void ScoreChoiceAnswer(QuizAnswer answer, List<Choice> choices, List<int> selectedIds)
    {
        var correct = choices.Where(x => x.IsCorrect).Select(x => x.ChoiceId).OrderBy(x => x).ToList();
        var selected = selectedIds.OrderBy(x => x).ToList();
        var ok = correct.SequenceEqual(selected);
        answer.Score = ok ? answer.MaxScore : 0; answer.IsCorrect = ok;
    }
    private static void ScoreFillBlankAnswer(QuizAnswer answer, List<Choice> choices, string? text)
    {
        var value = NormalizeText(text);
        var accepted = choices.Where(x => x.IsCorrect).SelectMany(x => new[] { x.OptionValue, x.ChoiceText }).Where(x => !string.IsNullOrWhiteSpace(x)).Select(NormalizeText).Distinct().ToList();
        var ok = value.Length > 0 && accepted.Contains(value);
        answer.Score = ok ? answer.MaxScore : 0; answer.IsCorrect = ok;
    }
    private static string NormalizeText(string? value) => string.Join(' ', (value ?? string.Empty).Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private async Task ScoreErrorRegionsAsync(QuizAnswer answer, List<SubmitErrorRegionRequest> submitted, List<QuestionErrorRegion> correct)
    {
        var used = new HashSet<int>(); decimal raw = 0, rawMax = correct.Sum(x => x.Points);
        foreach (var s in submitted)
        {
            var match = correct.Where(x => !used.Contains(x.ErrorRegionId) && s.SelectedStartTimeMs >= x.StartTimeMs && s.SelectedStartTimeMs <= x.EndTimeMs).OrderBy(x => Math.Abs(s.SelectedStartTimeMs - x.StartTimeMs)).FirstOrDefault();
            decimal location = 0, type = 0;
            if (match != null)
            {
                used.Add(match.ErrorRegionId); location = match.Points * 0.5m;
                var typeOk = (!string.IsNullOrWhiteSpace(s.SelectedErrorCode) && string.Equals(s.SelectedErrorCode.Trim(), match.ErrorCode, StringComparison.OrdinalIgnoreCase)) || (!string.IsNullOrWhiteSpace(s.SelectedErrorCategory) && string.Equals(s.SelectedErrorCategory.Trim(), match.ErrorCategory, StringComparison.OrdinalIgnoreCase));
                if (typeOk) type = match.Points * 0.5m;
            }
            raw += location + type;
            await _answerErrorRegionRepository.AddAsync(new QuizAnswerErrorRegion { QuizAnswerId = answer.QuizAnswerId, SelectedStartTimeMs = s.SelectedStartTimeMs, SelectedEndTimeMs = s.SelectedEndTimeMs, SelectedErrorCategory = s.SelectedErrorCategory?.Trim(), SelectedErrorCode = s.SelectedErrorCode?.Trim(), MatchedErrorRegionId = match?.ErrorRegionId, LocationScore = location, TypeScore = type });
        }
        answer.Score = ScaleScore(raw, rawMax, answer.MaxScore); answer.IsCorrect = answer.Score == answer.MaxScore;
    }

    private async Task ScoreAnnotationsAsync(QuizAnswer answer, List<SubmitAnnotationRequest> submitted, List<QuestionAnnotation> correct)
    {
        var used = new HashSet<int>(); decimal raw = 0, rawMax = correct.Sum(x => x.Points);
        foreach (var s in submitted)
        {
            var match = correct.Where(x => !used.Contains(x.AnnotationId) && x.AnnotationType == s.AnnotationType && RangesOverlap(s.StartIndex, s.EndIndex, x.StartIndex, x.EndIndex)).OrderBy(x => Math.Abs(s.StartIndex - x.StartIndex) + Math.Abs(s.EndIndex - x.EndIndex)).FirstOrDefault();
            var score = match?.Points ?? 0;
            if (match != null) used.Add(match.AnnotationId);
            raw += score;
            await _answerAnnotationRepository.AddAsync(new QuizAnswerAnnotation { QuizAnswerId = answer.QuizAnswerId, AnnotationType = s.AnnotationType, StartIndex = s.StartIndex, EndIndex = s.EndIndex, AnnotationValue = s.AnnotationValue?.Trim(), MatchedAnnotationId = match?.AnnotationId, Score = score });
        }
        answer.Score = ScaleScore(raw, rawMax, answer.MaxScore); answer.IsCorrect = answer.Score == answer.MaxScore;
    }

    private async Task ScoreArrangeAsync(QuizAnswer answer, List<SubmitArrangeItemRequest> submitted, List<QuestionArrangeItem> correct)
    {
        var byId = correct.ToDictionary(x => x.ArrangeItemId); var seen = new HashSet<int>(); var correctCount = 0;
        foreach (var s in submitted)
        {
            if (!byId.TryGetValue(s.ArrangeItemId, out var item)) throw new ArgumentException($"Arrange item {s.ArrangeItemId} does not belong to question {answer.QuestionId}.");
            if (!seen.Add(s.ArrangeItemId)) throw new ArgumentException($"Arrange item {s.ArrangeItemId} was submitted more than once.");
            var ok = item.IsDistractor ? !s.IsIncluded : s.IsIncluded && item.CorrectOrder == s.SelectedOrder;
            if (ok) correctCount++;
            await _answerArrangeItemRepository.AddAsync(new QuizAnswerArrangeItem { QuizAnswerId = answer.QuizAnswerId, ArrangeItemId = s.ArrangeItemId, SelectedOrder = s.SelectedOrder, IsIncluded = s.IsIncluded });
        }
        correctCount += correct.Count(x => x.IsDistractor && !seen.Contains(x.ArrangeItemId));
        answer.Score = correct.Count == 0 ? 0 : Math.Round(answer.MaxScore * correctCount / correct.Count, 2); answer.IsCorrect = answer.Score == answer.MaxScore;
    }

    private async Task ScoreErrorCorrectionLabAsync(QuizAnswer answer, SubmitQuizAnswerRequest submitted, List<Choice> choices, List<QuestionErrorRegion> regions)
    {
        var hasChoices = choices.Any(x => x.IsCorrect); var hasRegions = regions.Count > 0;
        if (!hasChoices && !hasRegions) { answer.Score = 0; answer.IsCorrect = false; return; }
        decimal choicePart = 0, regionPart = 0;
        if (hasChoices)
        {
            var selected = submitted.SelectedChoiceIds.Distinct().ToList(); if (submitted.SelectedChoiceId.HasValue && !selected.Contains(submitted.SelectedChoiceId.Value)) selected.Add(submitted.SelectedChoiceId.Value);
            var correctIds = choices.Where(x => x.IsCorrect).Select(x => x.ChoiceId).OrderBy(x => x).ToList(); choicePart = correctIds.SequenceEqual(selected.OrderBy(x => x)) ? 1 : 0;
        }
        if (hasRegions)
        {
            var temp = new QuizAnswer { QuizAnswerId = answer.QuizAnswerId, QuestionId = answer.QuestionId, MaxScore = 1 };
            await ScoreErrorRegionsAsync(temp, submitted.ErrorRegions, regions); regionPart = temp.Score ?? 0;
        }
        var parts = (hasChoices ? 1 : 0) + (hasRegions ? 1 : 0); answer.Score = Math.Round(answer.MaxScore * (choicePart + regionPart) / parts, 2); answer.IsCorrect = answer.Score == answer.MaxScore;
    }

    private async Task ScoreScenarioAsync(QuizAnswer answer, List<SubmitScenarioPathRequest> path, List<ScenarioNode> nodes, List<ScenarioChoice> allChoices)
    {
        if (path.Count == 0) { answer.Score = 0; answer.IsCorrect = false; return; }
        if (path.Select(x => x.StepOrder).Distinct().Count() != path.Count) throw new ArgumentException("Scenario StepOrder values must be unique.");
        var ordered = path.OrderBy(x => x.StepOrder).ToList(); var nodeMap = nodes.ToDictionary(x => x.NodeId); var choiceMap = allChoices.Where(x => nodeMap.ContainsKey(x.NodeId)).ToDictionary(x => x.ScenarioChoiceId);
        var start = nodes.SingleOrDefault(x => x.IsStartNode) ?? throw new ArgumentException("Scenario start node is invalid.");
        if (ordered[0].NodeId != start.NodeId) throw new ArgumentException("Scenario path must start from the start node.");
        decimal score = 0;
        for (var i = 0; i < ordered.Count; i++)
        {
            var step = ordered[i];
            if (!nodeMap.ContainsKey(step.NodeId)) throw new ArgumentException($"Scenario node {step.NodeId} does not belong to question {answer.QuestionId}.");
            if (!choiceMap.TryGetValue(step.ScenarioChoiceId, out var choice) || choice.NodeId != step.NodeId) throw new ArgumentException($"Scenario choice {step.ScenarioChoiceId} does not belong to node {step.NodeId}.");
            if (i + 1 < ordered.Count && choice.NextNodeId != ordered[i + 1].NodeId) throw new ArgumentException("Scenario path is not continuous.");
            if (i + 1 == ordered.Count && choice.NextNodeId.HasValue && !nodeMap[choice.NextNodeId.Value].IsEndNode) throw new ArgumentException("Scenario path ended before reaching an end node.");
            score += choice.Score;
            await _answerScenarioPathRepository.AddAsync(new QuizAnswerScenarioPath { QuizAnswerId = answer.QuizAnswerId, NodeId = step.NodeId, ScenarioChoiceId = step.ScenarioChoiceId, StepOrder = step.StepOrder, Score = choice.Score, AnsweredAt = DateTime.UtcNow });
        }
        answer.Score = Math.Clamp(score, 0, answer.MaxScore); answer.IsCorrect = answer.Score == answer.MaxScore;
    }

    private static bool RangesOverlap(int aStart, int aEnd, int bStart, int bEnd) => aStart <= bEnd && bStart <= aEnd;
    private static decimal ScaleScore(decimal raw, decimal rawMax, decimal maxScore) => rawMax <= 0 ? 0 : Math.Round(Math.Clamp(raw / rawMax, 0, 1) * maxScore, 2);

    public async Task<QuizResultDto?> GradeQuizAnswerAsync(int instructorId, int quizAnswerId, ManualGradeQuizAnswerRequest request)
    {
        var answer = (await _answerRepository.FindAsync(x => x.QuizAnswerId == quizAnswerId)).FirstOrDefault();
        if (answer is null) throw new ArgumentException($"Quiz answer with ID {quizAnswerId} not found.");

        var attempt = (await _attemptRepository.FindAsync(x => x.AttemptId == answer.AttemptId, x => x.Quiz)).FirstOrDefault();
        if (attempt is null) throw new ArgumentException("Quiz attempt not found.");
        if (attempt.Quiz.CreatedById != instructorId) throw new UnauthorizedAccessException("You do not have permission to grade this quiz.");
        if (!attempt.SubmittedAt.HasValue) throw new ArgumentException("This quiz attempt has not been submitted yet.");
        if (attempt.ResultStatus != QuizAttemptStatus.PENDING_GRADING) throw new ArgumentException("This quiz attempt is not pending manual grading.");
        if (answer.Score.HasValue) throw new ArgumentException("This answer has already been graded.");
        if (request.Score < 0 || request.Score > answer.MaxScore) throw new ArgumentException($"Score must be between 0 and {answer.MaxScore}.");

        answer.Score = request.Score;
        answer.IsCorrect = request.Score == answer.MaxScore;
        answer.TeacherFeedback = string.IsNullOrWhiteSpace(request.TeacherFeedback) ? null : request.TeacherFeedback.Trim();
        answer.GradedById = instructorId;
        answer.GradedAt = DateTime.UtcNow;
        _answerRepository.Update(answer);
        await _unitOfWork.SaveChangesAsync();

        var answers = (await _answerRepository.FindAsync(x => x.AttemptId == attempt.AttemptId)).ToList();
        if (answers.Any(x => !x.Score.HasValue))
        {
            attempt.Score = null;
            attempt.ResultStatus = QuizAttemptStatus.PENDING_GRADING;
        }
        else
        {
            var totalMax = answers.Sum(x => x.MaxScore);
            var totalScore = answers.Sum(x => x.Score ?? 0);
            attempt.Score = totalMax <= 0 ? 0 : Math.Round(totalScore / totalMax * 100, 2);
            attempt.ResultStatus = attempt.Score >= attempt.Quiz.PassingScore ? QuizAttemptStatus.PASSED : QuizAttemptStatus.FAILED;
        }

        _attemptRepository.Update(attempt);
        await _unitOfWork.SaveChangesAsync();
        return await GetQuizResultAsync(attempt.UserId, attempt.QuizId, attempt.AttemptId);
    }

    public async Task<QuizResultDto?> GetQuizResultAsync(int learnerId, int quizId, int attemptId)
    {
        var attempt = (await _attemptRepository.FindAsync(a => a.AttemptId == attemptId && a.QuizId == quizId && a.UserId == learnerId, a => a.Quiz)).FirstOrDefault();
        if (attempt is null) throw new ArgumentException("Quiz attempt not found.");
        if (!attempt.SubmittedAt.HasValue) throw new ArgumentException("This quiz attempt has not been submitted yet.");

        var answers = (await _answerRepository.FindAsync(x => x.AttemptId == attemptId)).ToList();
        var answerIds = answers.Select(x => x.QuizAnswerId).ToList(); var questionIds = answers.Select(x => x.QuestionId).ToList();
        var questions = (await _questionRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToDictionary(x => x.QuestionId);
        var choices = (await _choiceRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToList();
        var selected = (await _answerSelectedChoiceRepository.FindAsync(x => answerIds.Contains(x.QuizAnswerId))).ToList();
        var answerRegions = (await _answerErrorRegionRepository.FindAsync(x => answerIds.Contains(x.QuizAnswerId))).ToList();
        var answerAnnotations = (await _answerAnnotationRepository.FindAsync(x => answerIds.Contains(x.QuizAnswerId))).ToList();
        var answerArrange = (await _answerArrangeItemRepository.FindAsync(x => answerIds.Contains(x.QuizAnswerId))).ToList();
        var answerPaths = (await _answerScenarioPathRepository.FindAsync(x => answerIds.Contains(x.QuizAnswerId))).ToList();
        var regions = (await _errorRegionRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToDictionary(x => x.ErrorRegionId);
        var annotations = (await _annotationRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToDictionary(x => x.AnnotationId);
        var arrangeItems = (await _arrangeItemRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToDictionary(x => x.ArrangeItemId);
        var nodes = (await _scenarioNodeRepository.FindAsync(x => questionIds.Contains(x.QuestionId))).ToDictionary(x => x.NodeId);
        var nodeIds = nodes.Keys.ToList(); var scenarioChoices = (await _scenarioChoiceRepository.FindAsync(x => nodeIds.Contains(x.NodeId))).ToDictionary(x => x.ScenarioChoiceId);
        var choiceMap = choices.ToDictionary(x => x.ChoiceId);

        var resultAnswers = answers.OrderBy(x => questions.TryGetValue(x.QuestionId, out var q) ? q.OrderIndex : 0).Select(answer =>
        {
            questions.TryGetValue(answer.QuestionId, out var question);
            var selectedDtos = selected.Where(x => x.QuizAnswerId == answer.QuizAnswerId && choiceMap.ContainsKey(x.ChoiceId)).Select(x => choiceMap[x.ChoiceId]).Select(MapChoiceResult).ToList();
            var correctDtos = choices.Where(x => x.QuestionId == answer.QuestionId && x.IsCorrect).Select(MapChoiceResult).ToList();
            return new QuizAnswerResultDto
            {
                QuizAnswerId = answer.QuizAnswerId, QuestionId = answer.QuestionId, QuestionText = question?.QuestionText ?? string.Empty, QuestionType = question?.QuestionType ?? QuestionType.SINGLE_CHOICE,
                Score = answer.Score, MaxScore = answer.MaxScore, IsCorrect = answer.IsCorrect, TextAnswer = answer.TextAnswer, TeacherFeedback = answer.TeacherFeedback, GradedById = answer.GradedById, GradedAt = answer.GradedAt,
                SelectedChoiceId = selectedDtos.Count == 1 ? selectedDtos[0].ChoiceId : null, SelectedChoiceText = selectedDtos.Count == 1 ? selectedDtos[0].ChoiceText : null,
                CorrectChoiceId = correctDtos.Count == 1 ? correctDtos[0].ChoiceId : null, CorrectChoiceText = correctDtos.Count == 1 ? correctDtos[0].ChoiceText : null,
                SelectedChoices = selectedDtos, CorrectChoices = correctDtos,
                ErrorRegions = answerRegions.Where(x => x.QuizAnswerId == answer.QuizAnswerId).Select(x => { regions.TryGetValue(x.MatchedErrorRegionId ?? 0, out var c); return new ErrorRegionResultDto { AnswerErrorRegionId = x.AnswerErrorRegionId, SelectedStartTimeMs = x.SelectedStartTimeMs, SelectedEndTimeMs = x.SelectedEndTimeMs, SelectedErrorCategory = x.SelectedErrorCategory, SelectedErrorCode = x.SelectedErrorCode, MatchedErrorRegionId = x.MatchedErrorRegionId, CorrectStartTimeMs = c?.StartTimeMs, CorrectEndTimeMs = c?.EndTimeMs, CorrectErrorCategory = c?.ErrorCategory, CorrectErrorCode = c?.ErrorCode, LocationScore = x.LocationScore, TypeScore = x.TypeScore }; }).ToList(),
                Annotations = answerAnnotations.Where(x => x.QuizAnswerId == answer.QuizAnswerId).Select(x => { annotations.TryGetValue(x.MatchedAnnotationId ?? 0, out var c); return new AnnotationResultDto { AnswerAnnotationId = x.AnswerAnnotationId, AnnotationType = x.AnnotationType, StartIndex = x.StartIndex, EndIndex = x.EndIndex, AnnotationValue = x.AnnotationValue, MatchedAnnotationId = x.MatchedAnnotationId, CorrectStartIndex = c?.StartIndex, CorrectEndIndex = c?.EndIndex, CorrectAnnotationValue = c?.AnnotationValue, Score = x.Score }; }).ToList(),
                ArrangeItems = arrangeItems.Values.Where(x => x.QuestionId == answer.QuestionId).Select(item => { var a = answerArrange.FirstOrDefault(x => x.QuizAnswerId == answer.QuizAnswerId && x.ArrangeItemId == item.ArrangeItemId); var ok = item.IsDistractor ? a == null || !a.IsIncluded : a != null && a.IsIncluded && a.SelectedOrder == item.CorrectOrder; return new ArrangeItemResultDto { ArrangeItemId = item.ArrangeItemId, Content = item.Content, SelectedOrder = a?.SelectedOrder, CorrectOrder = item.CorrectOrder, IsIncluded = a?.IsIncluded ?? false, IsDistractor = item.IsDistractor, IsCorrect = ok }; }).ToList(),
                ScenarioPath = answerPaths.Where(x => x.QuizAnswerId == answer.QuizAnswerId).OrderBy(x => x.StepOrder).Select(x => { nodes.TryGetValue(x.NodeId, out var n); scenarioChoices.TryGetValue(x.ScenarioChoiceId, out var c); return new ScenarioPathResultDto { StepOrder = x.StepOrder, NodeId = x.NodeId, NodeContent = n?.Content ?? string.Empty, ScenarioChoiceId = x.ScenarioChoiceId, ChoiceText = c?.ChoiceText ?? string.Empty, Score = x.Score, Feedback = c?.Feedback }; }).ToList()
            };
        }).ToList();
        return new QuizResultDto { AttemptId = attempt.AttemptId, QuizId = attempt.QuizId, QuizTitle = attempt.Quiz.Title, AttemptNumber = attempt.AttemptNumber, Score = attempt.Score, PassingScore = attempt.Quiz.PassingScore, ResultStatus = attempt.ResultStatus ?? QuizAttemptStatus.IN_PROGRESS, IsPassed = attempt.ResultStatus == QuizAttemptStatus.PASSED ? true : attempt.ResultStatus == QuizAttemptStatus.FAILED ? false : null, StartedAt = attempt.StartedAt, SubmittedAt = attempt.SubmittedAt, RequiresManualGrading = attempt.ResultStatus == QuizAttemptStatus.PENDING_GRADING, Answers = resultAnswers };
    }

    private static SelectedChoiceResultDto MapChoiceResult(Choice x) => new() { ChoiceId = x.ChoiceId, ChoiceText = x.ChoiceText, OptionValue = x.OptionValue, IsCorrect = x.IsCorrect, Explanation = x.Explanation };

public async Task<List<QuizListItemDto>> GetQuizzesByCourseAsync(
    int courseId)

{
    var quizzes = await _quizRepository.FindAsync(
        q => q.CourseId == courseId,
        q => q.Lesson,
        q => q.Questions);
    return quizzes
        .OrderBy(q => q.CreatedAt)
        .Select(q => new QuizListItemDto
        {
            QuizId = q.QuizId,
            CourseId = q.CourseId,
            LessonId = q.LessonId,
            LessonTitle = q.Lesson != null ? q.Lesson.Title : null,
            Title = q.Title,
            Description = q.Description,
            TimeLimitMinutes =q.TimeLimitMinutes,
            PassingScore =q.PassingScore,
            MaxAttempts =q.MaxAttempts,
            Status =q.Status,
            CreatedAt =q.CreatedAt,
            QuestionCount =q.Questions?.Count ?? 0
        })
        .ToList();
}

public async Task<int?> GetLatestQuizResultAsync(
    int quizId,
    int learnerId)

{

    var attempts = await _attemptRepository.FindAsync(
        a => a.QuizId == quizId &&
             a.UserId == learnerId &&
             a.SubmittedAt.HasValue

    );

    var latestAttempt = attempts
        .OrderByDescending(a => a.AttemptNumber)
        .FirstOrDefault();
    return latestAttempt?.AttemptId;

}

}
