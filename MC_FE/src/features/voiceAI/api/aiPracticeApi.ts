import { request } from '../../../services/api';
import type { AIPracticeHistoryItem, AIPracticeResult } from '../types/aiPracticeTypes';

export const aiPracticeApi = {
  submit(courseId: number, lessonId: number, audio: File, expectedText?: string) {
    const body = new FormData();
    body.append('AudioFile', audio);
    if (expectedText?.trim()) body.append('ExpectedText', expectedText.trim());
    return request<AIPracticeResult>(`/voice-assessment/practices/courses/${courseId}/lessons/${lessonId}`, {
      method: 'POST', body,
    });
  },
  history(page = 1, pageSize = 20) {
    return request<AIPracticeHistoryItem[]>(`/voice-assessment/practices/me?page=${page}&pageSize=${pageSize}`);
  },
  detail(id: number) {
    return request<AIPracticeResult>(`/voice-assessment/practices/${id}`);
  },
};