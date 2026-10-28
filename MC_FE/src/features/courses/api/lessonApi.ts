import { request, API_BASE_URL } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
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

  /**
   * Uploads a video file to Cloudflare R2 via the backend.
   * Reports upload progress through the optional `onProgress` callback.
   * @param lessonId    - target lesson ID
   * @param file        - File object selected by the user
   * @param onProgress  - callback receiving 0–100 percent complete
   * @returns           - updated Lesson with the new videoUrl
   */
  uploadVideo(
    lessonId: number,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<Lesson> {
    return new Promise((resolve, reject) => {
      const token = useAuthStore.getState().token;
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/lessons/${lessonId}/upload-video`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Progress event
      xhr.upload.addEventListener('progress', (ev) => {
        if (ev.lengthComputable && onProgress) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const envelope: ApiEnvelope<Lesson> = JSON.parse(xhr.responseText);
            resolve(envelope.data);
          } catch {
            reject(new Error('Server returned invalid JSON after video upload.'));
          }
        } else {
          let msg = `Upload failed (HTTP ${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText);
            msg = body?.message ?? msg;
          } catch { /* ignore */ }
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during video upload.')));
      xhr.addEventListener('abort', () => reject(new Error('Video upload was aborted.')));

      xhr.send(formData);
    });
  },

  async deleteVideo(lessonId: number): Promise<void> {
    await request<ApiEnvelope<null>>(`/lessons/${lessonId}/video`, {
      method: 'DELETE',
    });
  },
};

