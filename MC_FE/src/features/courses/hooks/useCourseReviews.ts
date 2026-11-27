import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courseReviewApi, type CourseReviewReportCategory } from '../api/courseReviewApi';
import { COURSE_QUERY_KEYS } from './useCoursesQuery';

export const courseReviewQueryKeys = {
  list: (courseId: number) => ['course-reviews', courseId] as const,
  mine: (courseId: number) => ['course-review-me', courseId] as const,
  instructor: (courseId: number) => ['instructor-course-reviews', courseId] as const,
};

export function useCourseReviews(courseId: number, enabled = true) {
  return useQuery({
    queryKey: courseReviewQueryKeys.list(courseId),
    queryFn: () => courseReviewApi.getPublished(courseId),
    enabled: enabled && courseId > 0,
    staleTime: 30_000,
  });
}

export function useMyCourseReview(courseId: number, enabled = true) {
  return useQuery({
    queryKey: courseReviewQueryKeys.mine(courseId),
    queryFn: () => courseReviewApi.getMyReview(courseId),
    enabled: enabled && courseId > 0,
    staleTime: 30_000,
  });
}

export function useInstructorCourseReviews(courseId: number, enabled = true) {
  return useQuery({
    queryKey: courseReviewQueryKeys.instructor(courseId),
    queryFn: () => courseReviewApi.getForInstructor(courseId),
    enabled: enabled && courseId > 0,
    staleTime: 30_000,
  });
}

export function useSubmitCourseReview(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; comment?: string; isAnonymous: boolean }) => courseReviewApi.submit(courseId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.list(courseId) }),
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.mine(courseId) }),
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.instructor(courseId) }),
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.detail(String(courseId)) }),
        queryClient.invalidateQueries({ queryKey: ['courses', 'recommended'] }),
      ]);
    },
  });
}

export function useDeleteCourseReview(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => courseReviewApi.deleteMine(courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.list(courseId) }),
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.mine(courseId) }),
        queryClient.invalidateQueries({ queryKey: courseReviewQueryKeys.instructor(courseId) }),
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.detail(String(courseId)) }),
        queryClient.invalidateQueries({ queryKey: ['courses', 'recommended'] }),
      ]);
    },
  });
}

export function useReportCourseReview(courseId: number) {
  return useMutation({
    mutationFn: ({ reviewId, category, details }: { reviewId: number; category: CourseReviewReportCategory; details?: string }) =>
      courseReviewApi.report(courseId, reviewId, { category, details }),
  });
}
