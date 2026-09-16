import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleApi } from '../api/moduleApi';
import { lessonQueryKeys } from './useLessonQueries';
import type { CreateModuleDto, UpdateModuleDto, BulkImportModuleItem } from '../types/moduleTypes';

export const moduleQueryKeys = {
  courseModules: (courseId: number) => ['course-modules', courseId] as const,
};

export function useCourseModules(courseId: number) {
  return useQuery({
    queryKey: moduleQueryKeys.courseModules(courseId),
    queryFn: () => moduleApi.getModulesByCourseId(courseId),
    enabled: courseId > 0,
  });
}

export function useCreateModule(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateModuleDto) => moduleApi.createModule(courseId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleQueryKeys.courseModules(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useUpdateModule(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, dto }: { moduleId: number; dto: UpdateModuleDto }) =>
      moduleApi.updateModule(moduleId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleQueryKeys.courseModules(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useDeleteModule(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: number) => moduleApi.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleQueryKeys.courseModules(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}

export function useBulkCreateModules(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: BulkImportModuleItem[]) => moduleApi.bulkCreateModules(courseId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: moduleQueryKeys.courseModules(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
    },
  });
}
