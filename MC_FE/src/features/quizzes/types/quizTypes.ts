// ============================================================
// QUIZ TYPES
// Aligned with MC_BE/Features/Quizzes/DTOs
// ============================================================

// ============================================================
// ENUMS
// ============================================================

export type QuizStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED';

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'ESSAY';

// ============================================================
// CHOICE
// ============================================================

export interface ChoiceDto {
  choiceId: number;
  questionId?: number;
  choiceText: string;
  isCorrect?: boolean;
  orderIndex: number;
}

// ============================================================
// QUESTION
// ============================================================

export interface QuestionDto {
  questionId: number;
  quizId?: number;
  questionText: string;
  questionType: QuestionType;
  explanation?: string | null;
  orderIndex: number;
  choices: ChoiceDto[];
}

// ============================================================
// QUIZ DTO
// GET /api/quizzes/{id}
// ============================================================

export interface QuizDto {
  quizId: number;
  courseId?: number | null;
  lessonId?: number | null;
  createdById: number;

  title: string;
  description?: string | null;

  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;

  status: QuizStatus;
  createdAt: string;

  questions: QuestionDto[];
}

// ============================================================
// CREATE QUIZ
// POST /api/quizzes
// Instructor only
// ============================================================

export interface CreateChoiceRequest {
  choiceText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface CreateQuestionRequest {
  questionText: string;
  questionType: QuestionType;
  explanation?: string | null;
  orderIndex: number;
  choices: CreateChoiceRequest[];
}

export interface CreateQuizRequest {
  courseId: number;
  lessonId: number | null;

  title: string;
  description?: string | null;

  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;

  status: QuizStatus;

  questions: CreateQuestionRequest[];
}

// ============================================================
// UPDATE QUIZ
// PUT /api/quizzes/{quizId}
// Instructor only
// ============================================================

export interface UpdateChoiceRequest {
  choiceId: number;
  choiceText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface UpdateQuestionRequest {
  questionId: number;
  questionText: string;
  questionType: QuestionType;
  explanation?: string | null;
  orderIndex: number;
  choices: UpdateChoiceRequest[];
}

export interface UpdateQuizRequest {
  title: string;
  description?: string | null;
  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;
  status: QuizStatus;
  questions: UpdateQuestionRequest[];
}

// ============================================================
// TAKE QUIZ
// GET /api/quizzes/{quizId}/take
// Learner only
// ============================================================

export interface TakeChoiceDto {
  choiceId: number;
  choiceText: string;
  orderIndex: number;
}

export interface TakeQuestionDto {
  questionId: number;
  questionText: string;
  questionType: QuestionType;
  orderIndex: number;
  choices: TakeChoiceDto[];
}

export interface TakeQuizDto {
  quizId: number;

  title: string;
  description?: string | null;

  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;

  attemptId: number;
  attemptNumber: number;

  startedAt: string;

  questions: TakeQuestionDto[];
}

// ============================================================
// SUBMIT QUIZ
// POST /api/quizzes/{quizId}/submit
// Learner only
// ============================================================

export interface SubmitQuizAnswerRequest {
  questionId: number;
  selectedChoiceId: number | null;
}

export interface SubmitQuizRequest {
  attemptId: number;
  answers: SubmitQuizAnswerRequest[];
}

// ============================================================
// QUIZ RESULT
// GET /api/quizzes/{quizId}/result/{attemptId}
// Learner only
// ============================================================

export interface QuizAnswerResultDto {
  questionId: number;

  questionText: string;

  selectedChoiceId: number | null;
  selectedChoiceText: string | null;

  correctChoiceId: number | null;
  correctChoiceText: string | null;

  isCorrect: boolean;
}

export interface QuizResultDto {
  attemptId: number;

  quizId: number;

  quizTitle: string;

  attemptNumber: number;

  score: number;

  passingScore: number;

  isPassed: boolean;

  startedAt: string;

  submittedAt: string | null;

  answers: QuizAnswerResultDto[];
}


// ============================================================
// API RESPONSE
// Backend sử dụng ApiResponse<T>
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}
export interface QuizListItemDto {
  quizId: number;
  courseId: number;
  lessonId: number | null;

  title: string;
  description?: string | null;

  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;

  status: QuizStatus;
  createdAt: string;

  questionCount?: number;
}