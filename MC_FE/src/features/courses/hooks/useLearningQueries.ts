import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api/learningApi';
import type { UpdateLessonProgressDto } from '../types/learningTypes';

export const learningQueryKeys = {
  courseProgress: (courseId: number) => ['course-progress', courseId] as const,
};

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
