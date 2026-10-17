export interface InstructorQuizAttemptDto { attemptId: number; quizId: number; userId: number; attemptNumber: number; submittedAt: string | null; resultStatus: 'IN_PROGRESS' | 'PENDING_GRADING' | 'PASSED' | 'FAILED'; score: number | null; pendingAnswers: number;
    fullName?: string | null;
 }
