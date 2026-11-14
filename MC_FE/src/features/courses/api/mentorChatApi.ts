import { request, API_BASE_URL } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

export interface MentorSourceCitation {
  source_type: 'video_transcript' | 'document';
  title: string;
  lesson_id?: number;
  material_id?: number;
  page_number?: number;
  snippet: string;
  score?: number;
}

export interface MentorChatResponse {
  answer: string;
  course_id: number;
  sources: MentorSourceCitation[];
}

export interface CourseMaterialItem {
  materialId: number;
  lessonId?: number | null;
  title: string;
  fileUrl?: string;
  materialType?: string;
  createdAt?: string;
  ragStatus?: 'INDEXED' | 'PENDING_INDEX' | string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export const mentorChatApi = {
  /**
   * Hỏi đáp với AI Mentor trong phạm vi khóa học (REST thông thường)
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
   * Server-Sent Events (SSE) Stream: Hỏi đáp với AI Mentor và nhận token trực tiếp
   */
  async askMentorStream(
    courseId: number,
    message: string,
    lessonId?: number,
    topK = 4,
    callbacks?: {
      onSources?: (sources: MentorSourceCitation[]) => void;
      onChunk?: (text: string) => void;
      onError?: (err: Error) => void;
    }
  ): Promise<void> {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/mentor-chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message,
        lesson_id: lessonId || null,
        top_k: topK
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Lỗi kết nối AI Mentor (${response.status})`);
    }

    if (!response.body) {
      throw new Error('Trình duyệt không hỗ trợ streaming response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const block of parts) {
          if (!block.trim()) continue;
          const lines = block.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (eventType === 'sources' && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.sources && callbacks?.onSources) {
                callbacks.onSources(parsed.sources);
              }
            } catch (e) {
              console.warn('[SSE] Parse sources error:', e);
            }
          } else if (eventType === 'chunk' && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text && callbacks?.onChunk) {
                callbacks.onChunk(parsed.text);
              }
            } catch (e) {
              console.warn('[SSE] Parse chunk error:', e);
            }
          } else if (eventType === 'error' && dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              const errMsg = parsed.error || 'Lỗi xử lý stream từ AI Mentor';
              if (callbacks?.onError) {
                callbacks.onError(new Error(errMsg));
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * Lấy danh sách tài liệu trong khóa học
   */
  async getMaterials(courseId: number): Promise<CourseMaterialItem[]> {
    const envelope = await request<ApiEnvelope<CourseMaterialItem[]>>(`/courses/${courseId}/materials`, {
      method: 'GET'
    });
    return envelope.data || [];
  },

  /**
   * Xóa tài liệu khỏi khóa học và đồng bộ dọn vector Qdrant
   */
  async deleteMaterial(courseId: number, materialId: number): Promise<any> {
    const envelope = await request<ApiEnvelope<any>>(`/courses/${courseId}/materials/${materialId}`, {
      method: 'DELETE'
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
