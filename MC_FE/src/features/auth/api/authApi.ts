import { request } from '../../../services/api';

export const authApi = {
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

  async getMe(): Promise<any> {
    return request('/auth/me', {
      method: 'GET',
    });
  },

  async logout(): Promise<any> {
    return request('/auth/logout', {
      method: 'POST',
    });
  },
};
