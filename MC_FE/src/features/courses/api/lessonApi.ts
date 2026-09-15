import { request } from '../../../services/api';
import type { Lesson, CreateLessonDto, UpdateLessonDto } from '../types/lessonTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const lessonApi = {
  async getLessonsByCourseId(courseId: number): Promise<Lesson[]> {
    const envelope = await request<ApiEnvelope<Lesson[]>>(`/courses/${courseId}/lessons`);
    return envelope.data;
  },

  async createLesson(courseId: number, dto: CreateLessonDto): Promise<Lesson> {
    const envelope = await request<ApiEnvelope<Lesson>>(`/courses/${courseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  async createLessonsBulk(courseId: number, dtos: CreateLessonDto[]): Promise<Lesson[]> {
    const envelope = await request<ApiEnvelope<Lesson[]>>(`/courses/${courseId}/lessons/bulk`, {
      method: 'POST',
      body: JSON.stringify(dtos),
    });
    return envelope.data;
  },

  async updateLesson(lessonId: number, dto: UpdateLessonDto): Promise<Lesson> {
    const envelope = await request<ApiEnvelope<Lesson>>(`/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  async deleteLesson(lessonId: number): Promise<void> {
    await request<ApiEnvelope<null>>(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },
};
