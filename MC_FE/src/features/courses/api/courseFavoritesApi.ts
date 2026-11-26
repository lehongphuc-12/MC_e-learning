import { request } from '../../../services/api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const courseFavoritesApi = {
  async getMine(): Promise<number[]> {
    const response = await request<ApiEnvelope<number[]>>('/course-favorites');
    return response.data ?? [];
  },
  async add(courseId: number): Promise<void> {
    await request<ApiEnvelope<string>>(`/course-favorites/${courseId}`, { method: 'POST' });
  },
  async remove(courseId: number): Promise<void> {
    await request<ApiEnvelope<string>>(`/course-favorites/${courseId}`, { method: 'DELETE' });
  },
};
