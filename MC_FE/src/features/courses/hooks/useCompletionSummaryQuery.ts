import { useQuery } from '@tanstack/react-query';
import { completionSummaryApi } from '../api/completionSummaryApi';

export const useCompletionSummaryQuery = (courseId: number) => {
  return useQuery({
    queryKey: ['course-completion-summary', courseId],
    queryFn: () => completionSummaryApi.getCompletionSummary(courseId),
    enabled: Number.isFinite(courseId) && courseId > 0,
    staleTime: 5 * 60 * 1000,
  });
};
