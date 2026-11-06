import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '../api/learningApi';
import { useAuthStore } from '../../../store/useAuthStore';
import type { UpdateLessonProgressDto } from '../types/learningTypes';

export const learningQueryKeys = {
  courseProgress: (courseId: number, userId?: string | number | null) => ['course-progress', userId ?? 'guest', courseId] as const,
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
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({
    queryKey: learningQueryKeys.courseProgress(courseId, userId),
    queryFn: () => learningApi.getCourseProgress(courseId),
    enabled: courseId > 0 && userId != null,
  });
}

export function useUpdateLessonProgress(courseId: number) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: ({ lessonId, dto }: { lessonId: number; dto: UpdateLessonProgressDto }) =>
      learningApi.updateLessonProgress(lessonId, dto),
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(learningQueryKeys.courseProgress(courseId, userId), data);
      } else {
        queryClient.invalidateQueries({
          queryKey: learningQueryKeys.courseProgress(courseId, userId),
        });
      }
      // Tiến độ video thay đổi có thể mở khóa bài học/chương tiếp theo.
      // Tải lại danh sách bài học và trạng thái khóa ngay, không chờ chu kỳ 30 giây.
      queryClient.invalidateQueries({
        queryKey: ['course-lessons', courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['quizzes', 'course', courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['courses', 'learned'],
      });
    },
  });
}
