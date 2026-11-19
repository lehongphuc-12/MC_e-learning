
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';

export const useCourseStudentInsights = (courseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['course-student-insights', courseId],
    queryFn: async () => {
      const response = await paymentApi.getCourseStudentInsights(courseId);
      if (!response.success) throw new Error(response.message || 'Không thể tải dữ liệu tiến độ học viên.');
      return response.data ?? [];
    },
    enabled: enabled && Number.isInteger(courseId) && courseId > 0,
    staleTime: 15_000,
    retry: 1,
  });
};

export const useCourseStudents = (courseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['course-enrolled-students', courseId],
    queryFn: async () => {
      const response = await paymentApi.getCourseStudents(courseId);

      if (!response.success) {
        throw new Error(response.message || 'Không thể tải danh sách học viên.');
      }

      return response.data ?? [];
    },
    enabled: enabled && Number.isInteger(courseId) && courseId > 0,
    staleTime: 30_000,
    retry: 1,
  });
};
