import { request } from '../../../services/api';

export interface CourseReviewItem {
  reviewId: number;
  author: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CourseReviewReportCategory = 'IRRELEVANT' | 'ABUSIVE_LANGUAGE' | 'SPAM_OR_FAKE' | 'PERSONAL_INFO' | 'OTHER';

export interface CourseReviewList {
  averageRating: number;
  reviewCount: number;
  reviews: CourseReviewItem[];
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CourseReviewEligibility {
  canReview: boolean;
  hasReviewed: boolean;
  reviewId?: number | null;
  rating?: number | null;
  comment?: string | null;
  isAnonymous: boolean;
  hasActiveRestriction: boolean;
  restrictionMessage?: string | null;
  updatedAt?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const courseReviewApi = {
  async getPublished(courseId: number): Promise<CourseReviewList> {
    const response = await request<ApiEnvelope<CourseReviewList>>(`/courses/${courseId}/reviews?page=1&pageSize=50`);
    return response.data;
  },

  async getMyReview(courseId: number): Promise<CourseReviewEligibility> {
    const response = await request<ApiEnvelope<CourseReviewEligibility>>(`/courses/${courseId}/reviews/me`);
    return response.data;
  },

  async submit(courseId: number, payload: { rating: number; comment?: string; isAnonymous: boolean }): Promise<CourseReviewEligibility> {
    const response = await request<ApiEnvelope<CourseReviewEligibility>>(`/courses/${courseId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deleteMine(courseId: number): Promise<void> {
    await request<ApiEnvelope<object>>(`/courses/${courseId}/reviews/me`, { method: 'DELETE' });
  },

  async report(courseId: number, reviewId: number, payload: { category: CourseReviewReportCategory; details?: string }): Promise<void> {
    await request<ApiEnvelope<{ reportId: number; status: string }>>(`/courses/${courseId}/reviews/${reviewId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getForInstructor(courseId: number): Promise<CourseReviewList> {
    const response = await request<ApiEnvelope<CourseReviewList>>(`/instructor/courses/${courseId}/reviews?page=1&pageSize=50`);
    return response.data;
  },
};
