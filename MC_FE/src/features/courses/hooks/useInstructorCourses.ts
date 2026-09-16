// =============================================================================
// useInstructorCourses.ts  —  React Query READ hooks for Course Management
//
// WHY React Query here instead of useEffect + useState?
//   1. Automatic caching: repeated navigations don't re-fetch from server
//   2. Background refetch: data stays fresh when user returns to the tab
//   3. Loading/error states built-in: no manual `isLoading` boolean needed
//   4. Optimistic updates + cache invalidation work seamlessly with mutations
//
// Architecture decision: hooks = "smart" wrappers over the "dumb" api service.
// The api file does HTTP; the hook does React integration.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api/courseApi';
import { categoryApi } from '../api/categoryApi';
import type { CourseListParams } from '../types/courseTypes';

// ---------------------------------------------------------------------------
// QUERY KEY FACTORY
//
// WHY use a factory object instead of plain string arrays?
//   - Type-safe: prevents typos in query keys across multiple files
//   - Hierarchical: invalidating 'instructorCourses.all' auto-invalidates
//     all 'instructorCourses.list(...)' entries too.
//   Reference: TkDodo's Query Key Factory pattern (industry best practice)
// ---------------------------------------------------------------------------
export const courseQueryKeys = {
  // Base key — invalidating this invalidates ALL course-related queries
  all: ['courses'] as const,

  // Instructor-specific keys (scoped under 'my-courses')
  instructorCourses: {
    all: ['courses', 'my-courses'] as const,
    list: (params: CourseListParams) =>
      ['courses', 'my-courses', params] as const,
    detail: (id: number) => ['courses', 'my-courses', id] as const,
  },

  // Admin keys
  adminCourses: {
    all: ['courses', 'admin'] as const,
    list: (params: CourseListParams) =>
      ['courses', 'admin', params] as const,
  },

  // Categories — used in the form dropdown
  categories: {
    all: ['categories'] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Hook 1: useInstructorCourses
// Fetches the currently logged-in instructor's own courses (paginated).
//
// Usage:
//   const { data, isLoading, isError } = useInstructorCourses({ page: 1 });
// ---------------------------------------------------------------------------
export function useInstructorCourses(params: CourseListParams = {}, enabled = true) {
  return useQuery({
    queryKey: courseQueryKeys.instructorCourses.list(params),
    queryFn: () => courseApi.getInstructorCourses(params),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// Hook 2: useAdminCourses
// Fetches ALL courses for Admin view — same shape, different endpoint.
//
// Usage:
//   const { data } = useAdminCourses({ page: 1, status: 'DRAFT' });
// ---------------------------------------------------------------------------
export function useAdminCourses(params: CourseListParams = {}, enabled = true) {
  return useQuery({
    queryKey: courseQueryKeys.adminCourses.list(params),
    queryFn: () => courseApi.getAllCoursesAdmin(params),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// Hook 3: useCourseDetail
// Fetches a single course by ID.
// `enabled: !!courseId` prevents fetching when id is 0/undefined (create mode)
//
// Usage:
//   const { data: course } = useCourseDetail(courseId);
// ---------------------------------------------------------------------------
export function useCourseDetail(courseId: number) {
  return useQuery({
    queryKey: courseQueryKeys.instructorCourses.detail(courseId),
    queryFn: () => courseApi.getCourseById(courseId),
    // Only run query when we have a valid ID (edit mode, not create mode)
    enabled: courseId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

// ---------------------------------------------------------------------------
// Hook 4: useCategoriesQuery
// Fetches all active categories — used by the course form's <select>.
//
// WHY long staleTime (30 min)?
//   Categories rarely change, so aggressive caching is safe and avoids
//   redundant network requests every time the form opens.
// ---------------------------------------------------------------------------
export function useCategoriesQuery() {
  return useQuery({
    queryKey: courseQueryKeys.categories.all,
    queryFn: () => categoryApi.getCategories(),
    staleTime: 1000 * 60 * 30, // 30 min — categories change infrequently
  });
}
