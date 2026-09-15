// =============================================================================
// categoryApi.ts  —  Service Layer for Category lookups
// =============================================================================

import { request } from '../../../services/api';
import type { Category } from '../types/courseTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const categoryApi = {
  // GET /categories → unwrap ApiEnvelope → Category[]
  async getCategories(): Promise<Category[]> {
    const envelope = await request<ApiEnvelope<Category[]>>('/categories');
    return envelope.data;
  },

  // GET /categories/:id → unwrap ApiEnvelope → Category
  async getCategoryById(categoryId: number): Promise<Category> {
    const envelope = await request<ApiEnvelope<Category>>(`/categories/${categoryId}`);
    return envelope.data;
  },
};
