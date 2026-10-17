
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';

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
