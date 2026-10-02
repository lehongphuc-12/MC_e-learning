import { request } from '../../../services/api';
import {
  CreateQuizRequest,
  UpdateQuizRequest,
  TakeQuizDto,
  SubmitQuizRequest,
  QuizResultDto,
  QuizDto,
  QuizListItemDto,
  ApiResponse,
  LatestQuizResultDto,
  ManualGradeQuizAnswerRequest,
} from '../types/quizTypes';

export const quizApi = {
  async createQuiz(data: CreateQuizRequest): Promise<{
    success: boolean;
    message: string;
    data: QuizDto;
    errors: string[];
  }> {
    return request('/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuiz(
    quizId: number,
    data: UpdateQuizRequest
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizDto;
    errors: string[];
  }> {
    return request(`/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getQuizById(
    quizId: number
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizDto;
    errors: string[];
  }> {
    return request(`/quizzes/${quizId}`, {
      method: 'GET',
    });
  },

  async takeQuiz(
    quizId: number
  ): Promise<{
    success: boolean;
    message: string;
    data: TakeQuizDto;
    errors: string[];
  }> {
    return request(`/quizzes/${quizId}/take`, {
      method: 'GET',
    });
  },

  async submitQuiz(
    quizId: number,
    data: SubmitQuizRequest
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizResultDto;
    errors: string[];
  }> {
    return request(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getQuizResult(
    quizId: number,
    attemptId: number
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizResultDto;
    errors: string[];
  }> {
    return request(`/quizzes/${quizId}/result/${attemptId}`, {
      method: 'GET',
    });
  },

  async gradeQuizAnswer(
    quizAnswerId: number,
    data: ManualGradeQuizAnswerRequest
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizResultDto;
    errors: string[];
  }> {
    return request(`/quizzes/answers/${quizAnswerId}/grade`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getQuizzesByCourse(
    courseId: number
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizListItemDto[];
    errors: string[];
  }> {
    return request(`/quizzes/course/${courseId}`, {
      method: 'GET',
    });
  },

  async getLatestQuizResult(
    quizId: number
  ): Promise<{
    success: boolean;
    data: LatestQuizResultDto;
  }> {
    return request(`/quizzes/${quizId}/latest-result`, {
      method: 'GET',
    });
  },
};