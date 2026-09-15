// useCoursesQuery.ts — Public-facing catalog hooks (for LEARNER UI)
//
// NOTE: These hooks serve the PUBLIC learner catalog (HomeScreen, CourseCatalogScreen).
// For INSTRUCTOR CRUD management, use useInstructorCourses.ts instead.
//
// Currently returns mock data because the public course endpoint
// returns a different Course shape (with mock fields like rating, instructor object, etc.)
// than the management Course type (DB-aligned).
// When the backend has a /courses/public endpoint, swap the queryFn here.

import { useQuery } from '@tanstack/react-query';
import { mockCourses } from '../../../data/mockData';

export const COURSE_QUERY_KEYS = {
  all: ['courses', 'public'] as const,
  detail: (id: string) => ['courses', 'public', id] as const,
};

// Public catalog — returns mock courses for the learner-facing catalog
// TODO: Replace with real API call once backend has GET /courses/public
export const useCoursesQuery = () => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.all,
    queryFn: async () => mockCourses,
    staleTime: 1000 * 60 * 30,
  });
};

// Detail query for learner catalog
export const useCourseDetailQuery = (courseId: string) => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.detail(courseId),
    queryFn: async () => mockCourses.find((c) => c.id === courseId) ?? null,
    enabled: !!courseId,
    staleTime: 1000 * 60 * 30,
  });
};
