
import { request } from '../../../services/api';

import type {
  AIPracticeHistoryItem,
  AIPracticeResult,
} from '../types/aiPracticeTypes';

export interface InstructorAIPracticeHistoryItem {
  practiceSessionId: number;
  learnerId: number;
  lessonId: number | null;
  status: string;
  createdAt: string;
}

export const aiPracticeApi = {
  submit(
    courseId: number,
    lessonId: number,
    audio: File,
    expectedText?: string
  ) {
    const body = new FormData();

    body.append('AudioFile', audio);

    if (expectedText?.trim()) {
      body.append('ExpectedText', expectedText.trim());
    }

    return request<AIPracticeResult>(
      `/voice-assessment/practices/courses/${courseId}/lessons/${lessonId}`,
      {
        method: 'POST',
        body,
      }
    );
  },

  history(page = 1, pageSize = 20) {
    return request<AIPracticeHistoryItem[]>(
      `/voice-assessment/practices/me?page=${page}&pageSize=${pageSize}`
    );
  },

  detail(practiceSessionId: number) {
    return request<AIPracticeResult>(
      `/voice-assessment/practices/${practiceSessionId}`
    );
  },

  instructorHistory(
    courseId: number,
    page = 1,
    pageSize = 20,
    lessonId?: number
  ) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (lessonId !== undefined) {
      params.set('lessonId', String(lessonId));
    }

    return request<InstructorAIPracticeHistoryItem[]>(
      `/voice-assessment/practices/instructor/courses/${courseId}?${params.toString()}`
    );
  },

  instructorDetail(practiceSessionId: number) {
    return request<AIPracticeResult>(
      `/voice-assessment/practices/instructor/${practiceSessionId}`
    );
  },
};
