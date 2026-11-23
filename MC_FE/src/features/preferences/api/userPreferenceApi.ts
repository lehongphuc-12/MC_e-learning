import { request } from '../../../services/api';
import type { UserPreferenceDto, SaveUserPreferenceRequest } from '../types/preferenceTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const userPreferenceApi = {
  /**
   * GET /api/user-preferences/me
   * Lấy thông tin khảo sát định hướng đầu vào của học viên.
   */
  async getMyPreferences(): Promise<UserPreferenceDto | null> {
    try {
      const envelope = await request<ApiEnvelope<UserPreferenceDto>>('/user-preferences/me');
      return envelope.data;
    } catch (err) {
      console.warn('Failed to fetch user preferences:', err);
      return null;
    }
  },

  /**
   * POST /api/user-preferences
   * Lưu hoặc cập nhật khảo sát định hướng đầu vào của học viên.
   */
  async savePreferences(payload: SaveUserPreferenceRequest): Promise<UserPreferenceDto> {
    const envelope = await request<ApiEnvelope<UserPreferenceDto>>('/user-preferences', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return envelope.data;
  },
};
