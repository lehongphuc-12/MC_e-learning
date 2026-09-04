import { request } from './api';

export const authService = {
  async login(email: string, password: string): Promise<any> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(fullName: string, email: string, password: string): Promise<any> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    });
  },

  async googleLogin(idToken: string): Promise<any> {
    return request('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  async forgotPassword(email: string): Promise<any> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, email: string, newPassword: string): Promise<any> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, email, newPassword }),
    });
  },

  async getMe(token?: string): Promise<any> {
    const authToken = token || localStorage.getItem('token');
    return request('/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  },

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
};
