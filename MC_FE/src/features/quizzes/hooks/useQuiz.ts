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

      const response = await quizApi.getQuiz(quizId);

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to load quiz.'
        );
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
        throw new Error(
          response.message || 'Failed to create quiz.'
        );
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
      const response = await quizApi.updateQuiz(
        quizId,
        data
      );

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to update quiz.'
        );
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
        throw new Error(
          response.message || 'Failed to load quiz.'
        );
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
      const response = await quizApi.submitQuiz(
        quizId,
        data
      );

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to submit quiz.'
        );
      }

      return response.data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['take-quiz', variables.quizId],
      });
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
        throw new Error(
          'Quiz ID and Attempt ID are required.'
        );
      }

      const response = await quizApi.getQuizResult(
        quizId,
        attemptId
      );

      if (!response.success) {
        throw new Error(
          response.message || 'Failed to load quiz result.'
        );
      }

      return response.data;
    },

    enabled: !!quizId && !!attemptId,
  });
  
};
export const useQuizzesByCourse = (
  courseId: number | null
) => {
  return useQuery({
    queryKey: ['quizzes', 'course', courseId],

    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required.');
      }

      const response =
        await quizApi.getQuizzesByCourse(courseId);

      if (!response.success) {
        throw new Error(
          response.message ||
            'Failed to load quizzes.'
        );
      }

      return response.data;
    },

    enabled: !!courseId,
  });
};