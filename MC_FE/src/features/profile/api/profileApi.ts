import { request } from '../../../services/api';

export const profileApi = {
  async getProfile(): Promise<any> {
    return request('/auth/profile', {
      method: 'GET',
    });
  },

  async updateProfile(profileData: {
    fullName?: string;
    phoneNumber?: string;
    bio?: string;
    gender?: string;
    dateOfBirth?: string;
    experienceLevel?: string;
    learningGoal?: string;
    preferredLanguage?: string;
  }): Promise<any> {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  async updateAvatar(params: { file?: File; avatarUrl?: string }): Promise<any> {
    const formData = new FormData();
    if (params.file) {
      formData.append('file', params.file);
    }
    if (params.avatarUrl) {
      formData.append('avatarUrl', params.avatarUrl);
    }

    return request('/auth/avatar', {
      method: 'PUT',
      body: formData,
    });
  },

  async changePassword(oldPassword: string | null, newPassword: string, confirmPassword: string): Promise<any> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });
  },
};
