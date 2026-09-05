import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api/courseApi';

export const COURSE_QUERY_KEYS = {
  all: ['courses'] as const,
  detail: (id: string) => ['courses', id] as const,
};

export const useCoursesQuery = () => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.all,
    queryFn: () => courseApi.getCourses(),
    staleTime: 1000 * 60 * 15, // 15 mins cache
  });
};

export const useCourseDetailQuery = (courseId: string) => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.detail(courseId),
    queryFn: () => courseApi.getCourseById(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 15,
  });
};
