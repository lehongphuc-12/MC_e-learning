
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { quizApi } from '../api/quizApi';
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

// =========================
// GET QUIZ DETAIL
// =========================
export const useQuiz = (quizId: number | null) => {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) {
        throw new Error('Quiz ID is required.');
      }

      const response = await quizApi.getQuizById(quizId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to load quiz.');
      }

      return response.data;
    },
    enabled: !!quizId,
  });
};

// =========================
// CREATE QUIZ
// =========================
export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateQuizRequest) => {
      const response = await quizApi.createQuiz(data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to create quiz.');
      }

      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['quizzes'],
      });
    },
  });
};

// =========================
// UPDATE QUIZ
// =========================
export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizId,
      data,
    }: {
      quizId: number;
      data: UpdateQuizRequest;
    }) => {
      const response = await quizApi.updateQuiz(quizId, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update quiz.');
      }

      return response.data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['quiz', variables.quizId],
      });

      queryClient.invalidateQueries({
        queryKey: ['quizzes'],
      });
    },
  });
};

// =========================
// TAKE QUIZ
// =========================
export const useTakeQuiz = (quizId: number | null) => {
  return useQuery({
    queryKey: ['take-quiz', quizId],

    queryFn: async () => {
      if (!quizId) {
        throw new Error('Quiz ID is required.');
      }

      const response = await quizApi.takeQuiz(quizId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to load quiz.');
      }

      return response.data;
    },

    enabled: !!quizId,
  });
};

// =========================
// SUBMIT QUIZ
// =========================
export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizId,
      data,
    }: {
      quizId: number;
      data: SubmitQuizRequest;
    }) => {
      const response = await quizApi.submitQuiz(quizId, data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to submit quiz.');
      }

      return response.data;
    },

    onSuccess: (_, variables) => {
      // Giữ nguyên: cập nhật dữ liệu làm Quiz
      queryClient.invalidateQueries({
        queryKey: ['take-quiz', variables.quizId],
      });

      // Giữ nguyên: cập nhật kết quả mới nhất
      queryClient.invalidateQueries({
        queryKey: ['quiz-latest-result', variables.quizId],
      });

      // BỔ SUNG: cập nhật lịch sử các lượt làm Quiz
      queryClient.invalidateQueries({
        queryKey: ['quiz-my-attempts', variables.quizId],
      });

      // BỔ SUNG: cập nhật dữ liệu kết quả Quiz
      queryClient.invalidateQueries({
        queryKey: ['quiz-result', variables.quizId],
      });
      // A PASS can unlock the next lesson/chapter. Refresh the learner's course sidebar.
      queryClient.invalidateQueries({ queryKey: ['course-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes', 'course'] });
    },
  });
};

// =========================
// VIEW QUIZ RESULT
// =========================
export const useQuizResult = (
  quizId: number | null,
  attemptId: number | null
) => {
  return useQuery({
    queryKey: ['quiz-result', quizId, attemptId],

    queryFn: async () => {
      if (!quizId || !attemptId) {
        throw new Error('Quiz ID and Attempt ID are required.');
      }

      const response = await quizApi.getQuizResult(quizId, attemptId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to load quiz result.');
      }

      return response.data;
    },

    enabled: !!quizId && !!attemptId,
  });
};

// =========================
// GET QUIZZES BY COURSE
// =========================
export const useQuizzesByCourse = (
  courseId: number | null
) => {
  return useQuery({
    queryKey: ['quizzes', 'course', courseId],

    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required.');
      }

      const response = await quizApi.getQuizzesByCourse(courseId);

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to load quizzes.'
        );
      }

      return response.data;
    },

    enabled: !!courseId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
};

// =========================
// GET LATEST QUIZ RESULT
// Learner only
// =========================
export const useLatestQuizResult = (
  quizId: number | null
) => {
  return useQuery({
    queryKey: ['quiz-latest-result', quizId],

    queryFn: async () => {
      if (!quizId) {
        throw new Error('Quiz ID is required.');
      }

      const response = await quizApi.getLatestQuizResult(quizId);

      /**
       * Learner chưa từng làm Quiz.
       *
       * Tùy backend, nếu trường hợp này trả
       * success = true, data = null
       * thì return null bình thường.
       */
      if (!response.success) {
        return null;
      }

      return response.data ?? null;
    },

    enabled: !!quizId,
    retry: false,
  });
};

// =========================
// GET MY QUIZ ATTEMPTS
// Learner only
// =========================
export const useMyQuizAttempts = (quizId: number | null) => useQuery({
  queryKey: ['quiz-my-attempts', quizId],
  queryFn: async () => {
    if (!quizId) throw new Error('Quiz ID is required.');

    const result = await quizApi.getMyQuizAttempts(quizId);

    if (!result.success) {
      throw new Error(result.message || 'Không tải được lịch sử Quiz.');
    }

    return result.data ?? [];
  },
  enabled: !!quizId,
  staleTime: 0,
  refetchOnMount: 'always',
});
