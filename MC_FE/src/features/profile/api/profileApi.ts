import { request } from '../../../services/api';

export const profileApi = {
  async getProfile(): Promise<any> {
    const token = localStorage.getItem('token');
    return request('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
    const token = localStorage.getItem('token');
    return request('/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  },

  async updateAvatar(params: { file?: File; avatarUrl?: string }): Promise<any> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    if (params.file) {
      formData.append('file', params.file);
    }
    if (params.avatarUrl) {
      formData.append('avatarUrl', params.avatarUrl);
    }

    return request('/auth/avatar', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
  },

  async changePassword(oldPassword: string | null, newPassword: string, confirmPassword: string): Promise<any> {
    const token = localStorage.getItem('token');
    return request('/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });
  },
};
