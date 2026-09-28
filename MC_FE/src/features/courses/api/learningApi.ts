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

  async getLearningStreak(): Promise<{ currentStreak: number; longestStreak: number }> {
    const res = await request<ApiEnvelope<{ currentStreak: number; longestStreak: number }>>('/learning/streak');
    return res.data;
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

  async getActivityLogs(limit = 10): Promise<any[]> {
    try {
      const response = await request<ApiEnvelope<any[]>>(`/learning/activity-logs?limit=${limit}`);
      return response.data;
    } catch {
      return [];
    }
  }
};
