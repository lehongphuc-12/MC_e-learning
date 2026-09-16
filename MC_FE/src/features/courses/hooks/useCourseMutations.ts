// =============================================================================
// useCourseMutations.ts  —  React Query WRITE hooks (Create / Update / Delete)
//
// WHY useMutation instead of calling the API directly in a click handler?
//   1. `isPending` state is automatic — no manual loading flag needed
//   2. `onSuccess` → invalidates the cache so lists auto-refresh instantly
//   3. `onError` → centralized error handling with typed error shape
//   4. The mutation object is reusable across components (pass it as a prop
//      or consume the same hook in multiple places)
//
// Pattern: each mutation invalidates the narrowest possible cache key to
// avoid unnecessary re-fetches. (E.g. deleting a course only refetches the
// instructor's list, not unrelated admin or public queries.)
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '../api/courseApi';
import { courseQueryKeys } from './useInstructorCourses';
import type { CreateCourseDto, UpdateCourseDto } from '../types/courseTypes';

// ---------------------------------------------------------------------------
// Shared API error shape (mirrors the throw in services/api.ts)
// ---------------------------------------------------------------------------
export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Hook 1: useCreateCourse
//
// Usage in a component:
//   const { mutate: createCourse, isPending } = useCreateCourse();
//   createCourse(formData, { onSuccess: () => navigate('/courses') });
// ---------------------------------------------------------------------------
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCourseDto) => courseApi.createCourse(dto),

    onSuccess: () => {
      // Invalidate the instructor's course list so the new course appears.
      // We invalidate the PARENT key which cascades to all list(...) variants.
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.instructorCourses.all,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Hook 2: useUpdateCourse
//
// Usage:
//   const { mutate: updateCourse, isPending } = useUpdateCourse();
//   updateCourse({ courseId: 5, dto: formData });
// ---------------------------------------------------------------------------
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    // Destructure the combined arg so mutationFn stays clean
    mutationFn: ({ courseId, dto }: { courseId: number; dto: UpdateCourseDto }) =>
      courseApi.updateCourse(courseId, dto),

    onSuccess: (updatedCourse) => {
      // 1. Update the detail cache directly — avoids a redundant GET request
      queryClient.setQueryData(
        courseQueryKeys.instructorCourses.detail(updatedCourse.courseId),
        updatedCourse
      );

      // 2. Invalidate the list so the updated data reflects in the table
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.instructorCourses.all,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Hook 3: useDeleteCourse
//
// Usage:
//   const { mutate: deleteCourse, isPending: isDeleting } = useDeleteCourse();
//   deleteCourse(courseId, { onSuccess: () => setIsModalOpen(false) });
// ---------------------------------------------------------------------------
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => courseApi.deleteCourse(courseId),

    onSuccess: (_data, deletedCourseId) => {
      // Remove the deleted course from the detail cache immediately
      queryClient.removeQueries({
        queryKey: courseQueryKeys.instructorCourses.detail(deletedCourseId),
      });

      // Refetch list to reflect the deletion
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.instructorCourses.all,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Hook 4: useToggleCourseStatus
//
// WHY a dedicated hook for status toggle?
//   The status toggle is a frequent, quick action from the Course List table.
//   Extracting it into its own mutation keeps the component clean and lets us
//   add optimistic updates in a future sprint without touching unrelated code.
//
// Usage:
//   const { mutate: toggleStatus } = useToggleCourseStatus();
//   toggleStatus({ courseId: 5, newStatus: 'ACTIVE' });
// ---------------------------------------------------------------------------
export function useToggleCourseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      newStatus,
    }: {
      courseId: number;
      newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    }) => courseApi.toggleCourseStatus(courseId, newStatus),

    onSuccess: (updatedCourse) => {
      // Directly update the detail cache (no re-fetch needed for a single field)
      queryClient.setQueryData(
        courseQueryKeys.instructorCourses.detail(updatedCourse.courseId),
        updatedCourse
      );
      // Sync the list to show the updated status badge
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.instructorCourses.all,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Hook 5: useBulkCreateCourses
// ---------------------------------------------------------------------------
export function useBulkCreateCourses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dtos: CreateCourseDto[]) => courseApi.createCoursesBulk(dtos),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: courseQueryKeys.instructorCourses.all,
      });
    },
  });
}
