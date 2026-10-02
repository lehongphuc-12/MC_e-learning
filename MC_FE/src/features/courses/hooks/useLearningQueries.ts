import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api/learningApi';
import type { UpdateLessonProgressDto } from '../types/learningTypes';

export const learningQueryKeys = {
  courseProgress: (courseId: number) => ['course-progress', courseId] as const,
  activityLogs: () => ['activity-logs'] as const,
  streak: () => ['learning-streak'] as const,
};

export function useLearningStreakQuery() {
  return useQuery({
    queryKey: learningQueryKeys.streak(),
    queryFn: () => learningApi.getLearningStreak(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useActivityLogsQuery(limit = 50) {
  return useQuery({
    queryKey: learningQueryKeys.activityLogs(),
    queryFn: () => learningApi.getActivityLogs(limit),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCourseProgress(courseId: number) {
  return useQuery({
    queryKey: learningQueryKeys.courseProgress(courseId),
    queryFn: () => learningApi.getCourseProgress(courseId),
    enabled: courseId > 0,
  });
}

export function useUpdateLessonProgress(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, dto }: { lessonId: number; dto: UpdateLessonProgressDto }) =>
      learningApi.updateLessonProgress(lessonId, dto),
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(learningQueryKeys.courseProgress(courseId), data);
      } else {
        queryClient.invalidateQueries({
          queryKey: learningQueryKeys.courseProgress(courseId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['courses', 'learned'],
      });
    },
  });
}
