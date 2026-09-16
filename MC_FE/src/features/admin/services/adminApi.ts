import { request } from '../../../services/api';
import {
  initialAdminStats,
  mockRevenueChartData,
  initialAdminUsers,
  initialAdminCourses,
  initialAdminCategories,
  initialPayoutRequests,
  initialSystemLogs,
  defaultPlatformSettings,
} from '../data/mockAdminData';
import {
  AdminStats,
  AdminUser,
  AdminCourse,
  AdminCategory,
  PayoutRequest,
  SystemLog,
  PlatformSettings,
  UserRole,
  CourseModerationStatus,
} from '../types/adminTypes';

export const adminApi = {
  // Stats
  async getDashboardStats(): Promise<AdminStats> {
    try {
      const res = await request<{ success: boolean; data: AdminStats }>('/admin/stats');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialAdminStats;
  },

  async getRevenueChart() {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/stats/revenue-chart');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return mockRevenueChartData;
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    try {
      const res = await request<{ success: boolean; data: AdminUser[] }>('/admin/users');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialAdminUsers;
  },

  async updateUserStatus(userId: string, targetStatus: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    try {
      await request(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus }),
      });
      return true;
    } catch (_) {
      return false;
    }
  },

  async updateUser(userId: string, data: Partial<AdminUser>): Promise<AdminUser | null> {
    try {
      const res = await request<{ success: boolean; data: AdminUser }>(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return null;
  },


  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      await request(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      return true;
    } catch (_) {
      return true;
    }
  },

  // Courses
  async getCourses(): Promise<AdminCourse[]> {
    try {
      const res = await request<{ success: boolean; data: AdminCourse[] }>('/admin/courses');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialAdminCourses;
  },

  async updateCourseStatus(courseId: string, status: CourseModerationStatus, reason?: string): Promise<boolean> {
    try {
      await request(`/admin/courses/${courseId}/moderation`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
      });
      return true;
    } catch (_) {
      return true;
    }
  },

  async toggleCourseFeatured(courseId: string, featured: boolean): Promise<boolean> {
    try {
      await request(`/admin/courses/${courseId}/featured`, {
        method: 'PUT',
        body: JSON.stringify({ featured }),
      });
      return true;
    } catch (_) {
      return true;
    }
  },

  // Categories
  async getCategories(): Promise<AdminCategory[]> {
    try {
      const res = await request<{ success: boolean; data: AdminCategory[] }>('/admin/categories');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialAdminCategories;
  },

  // Payouts
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      const res = await request<{ success: boolean; data: PayoutRequest[] }>('/admin/payouts');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialPayoutRequests;
  },

  // System Logs & Settings
  async getSystemLogs(): Promise<SystemLog[]> {
    try {
      const res = await request<{ success: boolean; data: SystemLog[] }>('/admin/logs');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return initialSystemLogs;
  },

  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const res = await request<{ success: boolean; data: PlatformSettings }>('/admin/settings');
      if (res.success && res.data) return res.data;
    } catch (_) {
      // Fallback
    }
    return defaultPlatformSettings;
  },
};
