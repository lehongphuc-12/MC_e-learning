export interface LessonProgress {
  lessonId: number;
  isCompleted: boolean;
  lastPositionSeconds: number;
  timeSpentSeconds: number;
  timeSpentMinutes: number;
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface CourseLearningProgress {
  courseId: number;
  courseTitle: string;
  enrollmentId: number;
  completionPercentage: number;
  isCompleted: boolean;
  completedLessonsCount: number;
  totalLessonsCount: number;
  certificateId?: number;
  certificateCode?: string;
  lessonProgresses: LessonProgress[];
}

export interface UpdateLessonProgressDto {
  isCompleted?: boolean;
  lastPositionSeconds?: number;
  timeSpentSeconds?: number;
}

export interface Certificate {
  certificateId: number;
  enrollmentId: number;
  learnerId: number;
  learnerName: string;
  courseId: number;
  courseTitle: string;
  instructorName: string;
  certificateCode: string;
  issuedAt: string;
  completionPercentage: number;
  grade?: string;
  status: string;
  certificateUrl?: string;
}

export interface CertificateVerification {
  certificateCode: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: string;
  isValid: boolean;
  status: string;
}
