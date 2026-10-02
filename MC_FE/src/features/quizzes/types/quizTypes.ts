export type QuizStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type QuizAttemptStatus = 'IN_PROGRESS' | 'PENDING_GRADING' | 'PASSED' | 'FAILED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'LISTEN_IDENTIFY_ERROR' | 'LISTEN_LOCATE_ERROR' | 'AUDIO_COMPARISON' | 'LISTEN_CLASSIFY' | 'SCRIPT_ANNOTATION' | 'SCRIPT_WRITING' | 'ARRANGE_SCRIPT' | 'ERROR_CORRECTION_LAB' | 'SCENARIO_DECISION_TREE' | 'ESSAY';
export type QuestionMediaType = 'AUDIO' | 'VIDEO' | 'IMAGE';
export type AnnotationType = 'PAUSE' | 'BREATH' | 'EMPHASIS' | 'PITCH_RISE' | 'PITCH_FALL';
export type ScenarioNodeType = 'SITUATION' | 'QUESTION' | 'INFORMATION' | 'RESULT';

export interface ChoiceDto { choiceId: number; questionId?: number; choiceText: string; optionValue?: string | null; isCorrect?: boolean; explanation?: string | null; orderIndex: number; }
export interface QuestionMediaDto { mediaId: number; questionId?: number; mediaType: QuestionMediaType; mediaUrl: string; label?: string | null; durationSeconds?: number | null; orderIndex: number; }
export interface ErrorRegionDto { errorRegionId: number; questionId?: number; startTimeMs: number; endTimeMs: number; errorCategory: string; errorCode: string; description?: string | null; correctionText?: string | null; points: number; }
export interface AnnotationDto { annotationId: number; questionId?: number; annotationType: AnnotationType; startIndex: number; endIndex: number; annotationValue?: string | null; explanation?: string | null; points: number; }
export interface ArrangeItemDto { arrangeItemId: number; questionId?: number; content: string; correctOrder?: number | null; isDistractor: boolean; }
export interface WritingConfigDto { writingConfigId?: number; questionId?: number; eventType?: string | null; audience?: string | null; style?: string | null; minWords?: number | null; maxWords?: number | null; requiredElementsJson?: string | null; gradingRubricJson?: string | null; }
export interface ScenarioChoiceDto { scenarioChoiceId: number; nodeId?: number; choiceText: string; nextNodeId?: number | null; score?: number; feedback?: string | null; orderIndex: number; }
export interface ScenarioNodeDto { nodeId: number; questionId?: number; nodeType: ScenarioNodeType; title?: string | null; content: string; mediaUrl?: string | null; isStartNode: boolean; isEndNode: boolean; points?: number | null; choices: ScenarioChoiceDto[]; }
export interface QuestionDto { questionId: number; quizId?: number; questionText: string; questionType: QuestionType; instruction?: string | null; explanation?: string | null; points?: number; isRequired?: boolean; orderIndex: number; choices: ChoiceDto[]; media?: QuestionMediaDto[]; errorRegions?: ErrorRegionDto[]; annotations?: AnnotationDto[]; arrangeItems?: ArrangeItemDto[]; writingConfig?: WritingConfigDto | null; scenarioNodes?: ScenarioNodeDto[]; }
export interface QuizDto { quizId: number; courseId?: number | null; lessonId?: number | null; createdById: number; title: string; description?: string | null; timeLimitMinutes: number; passingScore: number; maxAttempts: number; status: QuizStatus; createdAt: string; questions: QuestionDto[]; }

export interface CreateChoiceRequest { choiceText: string; optionValue?: string | null; isCorrect: boolean; explanation?: string | null; orderIndex: number; }
export interface CreateQuestionRequest { questionText: string; questionType: QuestionType; instruction?: string | null; explanation?: string | null; points?: number; isRequired?: boolean; orderIndex: number; choices: CreateChoiceRequest[]; media?: any[]; errorRegions?: any[]; annotations?: any[]; arrangeItems?: any[]; writingConfig?: any | null; scenarioNodes?: any[]; }
export interface CreateQuizRequest { courseId: number; lessonId: number | null; title: string; description?: string | null; timeLimitMinutes: number; passingScore: number; maxAttempts: number; status: QuizStatus; questions: CreateQuestionRequest[]; }
export interface UpdateChoiceRequest extends CreateChoiceRequest { choiceId: number; }
export interface UpdateQuestionRequest extends Omit<CreateQuestionRequest, 'choices'> { questionId: number; choices: UpdateChoiceRequest[]; }
export interface UpdateQuizRequest { title: string; description?: string | null; timeLimitMinutes: number; passingScore: number; maxAttempts: number; status: QuizStatus; questions: UpdateQuestionRequest[]; }

export interface TakeChoiceDto { choiceId: number; choiceText: string; optionValue?: string | null; orderIndex: number; }
export interface TakeQuestionMediaDto { mediaId: number; mediaType: QuestionMediaType; mediaUrl: string; label?: string | null; durationSeconds?: number | null; orderIndex: number; }
export interface TakeArrangeItemDto { arrangeItemId: number; content: string; }
export interface TakeWritingConfigDto { eventType?: string | null; audience?: string | null; style?: string | null; minWords?: number | null; maxWords?: number | null; requiredElementsJson?: string | null; }
export interface TakeScenarioChoiceDto { scenarioChoiceId: number; choiceText: string; nextNodeId?: number | null; orderIndex: number; }
export interface TakeScenarioNodeDto { nodeId: number; nodeType: ScenarioNodeType; title?: string | null; content: string; mediaUrl?: string | null; isStartNode: boolean; isEndNode: boolean; choices: TakeScenarioChoiceDto[]; }
export interface TakeQuestionDto { questionId: number; questionText: string; questionType: QuestionType; instruction?: string | null; points?: number; isRequired?: boolean; orderIndex: number; choices: TakeChoiceDto[]; media?: TakeQuestionMediaDto[]; arrangeItems?: TakeArrangeItemDto[]; writingConfig?: TakeWritingConfigDto | null; scenarioNodes?: TakeScenarioNodeDto[]; }
export interface TakeQuizDto { quizId: number; title: string; description?: string | null; timeLimitMinutes: number; passingScore: number; maxAttempts: number; attemptId: number; attemptNumber: number; startedAt: string; questions: TakeQuestionDto[]; }

export interface SubmitErrorRegionRequest { selectedStartTimeMs: number; selectedEndTimeMs?: number | null; selectedErrorCategory?: string | null; selectedErrorCode?: string | null; }
export interface SubmitAnnotationRequest { annotationType: AnnotationType; startIndex: number; endIndex: number; annotationValue?: string | null; }
export interface SubmitArrangeItemRequest { arrangeItemId: number; selectedOrder?: number | null; isIncluded: boolean; }
export interface SubmitScenarioPathRequest { nodeId: number; scenarioChoiceId: number; stepOrder: number; }
export interface SubmitQuizAnswerRequest { questionId: number; selectedChoiceId?: number | null; selectedChoiceIds?: number[]; textAnswer?: string | null; errorRegions?: SubmitErrorRegionRequest[]; annotations?: SubmitAnnotationRequest[]; arrangeItems?: SubmitArrangeItemRequest[]; scenarioPath?: SubmitScenarioPathRequest[]; }
export interface SubmitQuizRequest { attemptId: number; answers: SubmitQuizAnswerRequest[]; }

export interface SelectedChoiceResultDto { choiceId: number; choiceText: string; isCorrect?: boolean; explanation?: string | null; }
export interface ErrorRegionResultDto { answerErrorRegionId?: number; selectedStartTimeMs: number; selectedEndTimeMs?: number | null; selectedErrorCategory?: string | null; selectedErrorCode?: string | null; matchedErrorRegionId?: number | null; correctStartTimeMs?: number | null; correctEndTimeMs?: number | null; correctErrorCategory?: string | null; correctErrorCode?: string | null; locationScore?: number; typeScore?: number; }
export interface AnnotationResultDto { answerAnnotationId?: number; annotationType: AnnotationType; startIndex: number; endIndex: number; annotationValue?: string | null; matchedAnnotationId?: number | null; score?: number; }
export interface ArrangeItemResultDto { arrangeItemId: number; content: string; selectedOrder?: number | null; correctOrder?: number | null; isIncluded: boolean; isDistractor?: boolean; }
export interface ScenarioPathResultDto { nodeId: number; nodeTitle?: string | null; scenarioChoiceId: number; choiceText: string; stepOrder: number; score: number; feedback?: string | null; }
export interface QuizAnswerResultDto { quizAnswerId: number; questionId: number; questionText: string; questionType: QuestionType; score?: number | null; maxScore?: number; isCorrect?: boolean | null; textAnswer?: string | null; teacherFeedback?: string | null; gradedById?: number | null; gradedAt?: string | null; selectedChoices?: SelectedChoiceResultDto[]; correctChoices?: SelectedChoiceResultDto[]; errorRegions?: ErrorRegionResultDto[]; annotations?: AnnotationResultDto[]; arrangeItems?: ArrangeItemResultDto[]; scenarioPath?: ScenarioPathResultDto[]; selectedChoiceId?: number | null; selectedChoiceText?: string | null; correctChoiceId?: number | null; correctChoiceText?: string | null; }
export interface QuizResultDto { attemptId: number; quizId: number; quizTitle: string; attemptNumber: number; score?: number | null; passingScore: number; resultStatus: QuizAttemptStatus; isPassed?: boolean | null; startedAt: string; submittedAt: string | null; requiresManualGrading: boolean; answers: QuizAnswerResultDto[]; }
export interface ManualGradeQuizAnswerRequest { score: number; teacherFeedback?: string | null; }
export interface LatestQuizResultDto { attemptId: number; }
export interface QuizListItemDto { quizId: number; courseId: number; lessonId: number | null; title: string; description?: string | null; timeLimitMinutes: number; passingScore: number; maxAttempts: number; status: QuizStatus; createdAt: string; questionCount?: number; }
export interface ApiResponse<T> { success: boolean; message: string; data: T; errors: string[]; }