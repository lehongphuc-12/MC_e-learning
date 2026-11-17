import { request } from '../../../services/api';

export type RemedialContentType = 'LESSON' | 'QUIZ' | 'SPEAKING';
export interface RemedialAssignmentDto {
  remedialAssignmentId: number; courseId: number; studentId: number; title: string; reason: string;
  contentType: RemedialContentType; contentId: number; contentTitle: string; maxAttempts: number;
  dueAt?: string | null; status: string; assignedAt: string; completedAt?: string | null; attemptsUsed: number;
  assignedByName?: string | null;
}
export interface CreateRemedialAssignmentRequest {
  title: string; reason: string; lessonId?: number; quizId?: number; speakingScriptId?: number;
  targetQuizId?: number; targetSpeakingScriptId?: number; maxAttempts: number; dueAt?: string | null; studentIds: number[];
}

export const remedialAssignmentApi = {
  async create(courseId: number, body: CreateRemedialAssignmentRequest) {
    return request<{ success: boolean; data: RemedialAssignmentDto; message?: string }>(`/v1/instructor/courses/${courseId}/remedial-assignments`, { method: 'POST', body: JSON.stringify(body) });
  },
  async getForLearner(courseId: number) {
    return request<{ success: boolean; data: RemedialAssignmentDto[] }>(`/v1/learner/courses/${courseId}/remedial-assignments`);
  },
  async getForInstructor(courseId: number) {
    return request<{ success: boolean; data: RemedialAssignmentDto[] }>(`/v1/instructor/courses/${courseId}/remedial-assignments`);
  },
};
