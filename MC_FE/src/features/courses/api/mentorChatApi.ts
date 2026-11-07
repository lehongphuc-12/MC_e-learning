import { request, API_BASE_URL } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

export interface MentorSourceCitation {
  source_type: 'video_transcript' | 'document';
  title: string;
  lesson_id?: number;
  snippet: string;
  score?: number;
}

export interface MentorChatResponse {
  answer: string;
  course_id: number;
  sources: MentorSourceCitation[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export const mentorChatApi = {
  /**
   * Hỏi đáp với AI Mentor trong phạm vi khóa học
   */
  async askMentor(courseId: number, message: string, lessonId?: number, topK = 4): Promise<MentorChatResponse> {
    const payload = {
      message,
      lesson_id: lessonId || null,
      top_k: topK
    };

    const envelope = await request<ApiEnvelope<MentorChatResponse>>(`/courses/${courseId}/mentor-chat`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return envelope.data;
  },

  /**
   * Đồng bộ transcript bài học vào AI Mentor (dành cho giảng viên / admin)
   */
  async syncLessonTranscript(courseId: number, lessonId: number): Promise<any> {
    const envelope = await request<ApiEnvelope<any>>(`/courses/${courseId}/mentor-chat/sync-lesson/${lessonId}`, {
      method: 'POST'
    });
    return envelope.data;
  },

  /**
   * Đồng bộ toàn bộ transcript bài giảng trong khóa vào AI Mentor
   */
  async syncCourseTranscripts(courseId: number): Promise<any> {
    const envelope = await request<ApiEnvelope<any>>(`/courses/${courseId}/mentor-chat/sync-course`, {
      method: 'POST'
    });
    return envelope.data;
  },

  /**
   * Tải lên tài liệu PDF/TXT/MD cho khóa học và tự động lập chỉ mục RAG vào MentorChat
   */
  async uploadDocumentMaterial(
    courseId: number, 
    file: File, 
    title?: string, 
    lessonId?: number
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (lessonId) formData.append('lessonId', String(lessonId));

    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/materials/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed with status ${response.status}`);
    }

    const envelope: ApiEnvelope<any> = await response.json();
    return envelope.data;
  }
};
