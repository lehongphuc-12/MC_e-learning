import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonApi } from '../api/lessonApi';
import type { CreateLessonDto, UpdateLessonDto } from '../types/lessonTypes';

export const lessonQueryKeys = {
  courseLessons: (courseId: number) => ['course-lessons', courseId] as const,
};

export function useCourseLessons(courseId: number) {
  return useQuery({
    queryKey: lessonQueryKeys.courseLessons(courseId),
    queryFn: () => lessonApi.getLessonsByCourseId(courseId),
    enabled: courseId > 0,
  });
}

export function useCreateLesson(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateLessonDto) => lessonApi.createLesson(courseId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useBulkCreateLessons(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dtos: CreateLessonDto[]) => lessonApi.createLessonsBulk(courseId, dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useUpdateLesson(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, dto }: { lessonId: number; dto: UpdateLessonDto }) =>
      lessonApi.updateLesson(lessonId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useDeleteLesson(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: number) => lessonApi.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}
