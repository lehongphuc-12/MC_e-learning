import type { Lesson, CreateLessonDto } from './lessonTypes';

export interface CourseModule {
  moduleId: number;
  courseId: number;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  lessonsCount: number;
  totalDurationMinutes: number;
  lessons: Lesson[];
}

export interface CreateModuleDto {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface UpdateModuleDto {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface BulkImportModuleItem {
  moduleTitle: string;
  moduleDescription?: string;
  moduleOrderIndex?: number;
  lessons: CreateLessonDto[];
}
