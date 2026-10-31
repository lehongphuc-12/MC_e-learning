export interface Lesson {
  lessonId: number;
  courseId: number;
  moduleId?: number;
  title: string;
  description?: string;
  lessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  orderIndex: number;
  durationMinutes: number;
  isPreview: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  videoUrl?: string;
  isLocked?: boolean;
  lockReason?: string | null;
  createdAt: string;
}

export interface CreateLessonDto {
  moduleId?: number;
  title: string;
  description?: string;
  lessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  orderIndex?: number;
  durationMinutes?: number;
  isPreview?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  videoUrl?: string;
}

export interface UpdateLessonDto {
  moduleId?: number;
  title?: string;
  description?: string;
  lessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  orderIndex?: number;
  durationMinutes?: number;
  isPreview?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  videoUrl?: string;
}
