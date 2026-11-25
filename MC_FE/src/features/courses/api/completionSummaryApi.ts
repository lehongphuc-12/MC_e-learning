import { request } from '../../../services/api';
import type { CourseCompletionSummary } from '../types/completionSummaryTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const completionSummaryApi = {
  async getCompletionSummary(courseId: number): Promise<CourseCompletionSummary> {
    const response = await request<ApiEnvelope<CourseCompletionSummary>>(
      `/courses/${courseId}/completion-summary`
    );
    return response.data;
  },
};
