import { request } from '../../../services/api';

export interface AdminCourseReview {
  reviewId: number; courseId: number; courseTitle: string; learnerId: number; learnerName: string; learnerEmail: string;
  isAnonymous: boolean; rating: number; comment?: string | null; status: string; moderationReason?: string | null;
  createdAt: string; updatedAt: string; isLearnerBlocked: boolean;
}

export interface AdminCourseReviewReport {
  reportId: number; reviewId: number; courseId: number; courseTitle: string; reviewAuthorId: number; reviewAuthorName: string;
  reviewAuthorEmail: string; reviewAuthorChoseAnonymous: boolean; rating: number; reviewComment?: string | null; reviewStatus: string;
  category: string; details?: string | null; status: string; reporterId: number; reporterName: string; reporterEmail: string;
  createdAt: string; reviewedAt?: string | null; resolutionNote?: string | null;
}

export interface AdminCourseReviewAction {
  actionId: number; courseId: number; courseTitle: string; reviewId?: number | null; reportId?: number | null;
  targetLearnerId?: number | null; targetLearnerName?: string | null; adminName: string; actionType: string; reason: string; createdAt: string;
}

export interface AdminPage<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
interface ApiEnvelope<T> { success: boolean; data: T; message?: string; }

async function get<T>(url: string): Promise<T> {
  const result = await request<ApiEnvelope<T>>(url);
  if (!result?.success || !result.data) throw new Error(result?.message || 'Không tải được dữ liệu đánh giá.');
  return result.data;
}
async function post(url: string, body: unknown): Promise<void> {
  const result = await request<ApiEnvelope<object>>(url, { method: 'POST', body: JSON.stringify(body) });
  if (!result?.success) throw new Error(result?.message || 'Không thể lưu thao tác quản trị.');
}

export const courseReviewAdminApi = {
  getReviews: (page = 1, status = '', search = '') => get<AdminPage<AdminCourseReview>>(`/admin/course-reviews?page=${page}&pageSize=20${status ? `&status=${encodeURIComponent(status)}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getReports: (page = 1, status = 'PENDING') => get<AdminPage<AdminCourseReviewReport>>(`/admin/course-reviews/reports?page=${page}&pageSize=20${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  getActions: () => get<AdminPage<AdminCourseReviewAction>>('/admin/course-reviews/actions?page=1&pageSize=50'),
  resolveReport: (reportId: number, payload: { decision: 'DISMISS' | 'TAKE_ACTION'; reviewAction?: 'HIDE' | 'REMOVE' | 'RESTORE'; blockAuthorForCourse?: boolean; reason: string }) => post(`/admin/course-reviews/reports/${reportId}/resolve`, payload),
  startReportReview: (reportId: number) => post(`/admin/course-reviews/reports/${reportId}/start-review`, {}),
  moderateReview: (reviewId: number, payload: { action: 'HIDE' | 'REMOVE' | 'RESTORE'; reason: string }) => post(`/admin/course-reviews/${reviewId}/moderate`, payload),
  blockReviewer: (courseId: number, learnerId: number, reason: string, triggerReviewId?: number) => post(`/admin/course-reviews/courses/${courseId}/learners/${learnerId}/block`, { reason, triggerReviewId }),
  unblockReviewer: (courseId: number, learnerId: number, reason: string) => post(`/admin/course-reviews/courses/${courseId}/learners/${learnerId}/unblock`, { reason }),
};
