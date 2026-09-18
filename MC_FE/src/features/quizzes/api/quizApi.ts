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
} from '../types/quizTypes';

/**
 * API cho chức năng Quiz
 *
 * Backend:
 * /api/quizzes
 *
 * Phân quyền:
 * - Instructor: Create / Update Quiz
 * - Learner: Take / Submit / View Result
 */
export const quizApi = {
  // ============================================================
  // IN03 - Create Quiz
  // POST /api/quizzes
  // Role: Instructor
  // ============================================================

  async createQuiz(
    data: CreateQuizRequest
  ): Promise<{
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

  // ============================================================
  // IN04 - Update Quiz
  // PUT /api/quizzes/{quizId}
  // Role: Instructor
  // ============================================================

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

  // ============================================================
  // Get Quiz Detail
  // GET /api/quizzes/{id}
  // Role: Authenticated user
  // ============================================================

  async getQuiz(
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

  // ============================================================
  // LE12 - Take Quiz
  // GET /api/quizzes/{quizId}/take
  // Role: Learner
  // ============================================================

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

  // ============================================================
  // LE12 - Submit Quiz
  // POST /api/quizzes/{quizId}/submit
  // Role: Learner
  // ============================================================

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

  // ============================================================
  // LE16 - View Quiz Result
  // GET /api/quizzes/{quizId}/result/{attemptId}
  // Role: Learner
  // ============================================================

  async getQuizResult(
    quizId: number,
    attemptId: number
  ): Promise<{
    success: boolean;
    message: string;
    data: QuizResultDto;
    errors: string[];
  }> {
    return request(
      `/quizzes/${quizId}/result/${attemptId}`,
      {
        method: 'GET',
      }
    );
  },
  // ============================================================
// IN - Get Quizzes By Course
// GET /api/quizzes/course/{courseId}
// Role: Instructor / Admin
// ============================================================

async getQuizzesByCourse(
  courseId: number
): Promise<ApiResponse<QuizListItemDto[]>> {
  return request(`/quizzes/course/${courseId}`, {
    method: 'GET',
  });
},
};