import { request } from '../../../services/api';
import type { CourseLearningProgress, UpdateLessonProgressDto } from '../types/learningTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const learningApi = {
  async getCourseProgress(courseId: number): Promise<CourseLearningProgress> {
    try {
      const response = await request<ApiEnvelope<CourseLearningProgress>>(`/learning/courses/${courseId}/progress`);
      return response.data;
    } catch (err) {
      console.warn('Backend progress API error, using local state:', err);
      // Fallback object for unauthenticated or offline testing
      return {
        courseId,
        courseTitle: 'Learning Course',
        enrollmentId: 1,
        completionPercentage: 0,
        isCompleted: false,
        completedLessonsCount: 0,
        totalLessonsCount: 0,
        lessonProgresses: [],
      };
    }
  },

  async updateLessonProgress(
    lessonId: number,
    dto: UpdateLessonProgressDto
  ): Promise<CourseLearningProgress> {
    const response = await request<ApiEnvelope<CourseLearningProgress>>(`/learning/lessons/${lessonId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return response.data;
  },
};
