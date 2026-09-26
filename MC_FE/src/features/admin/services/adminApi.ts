import { request } from '../../../services/api';
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
  RevenueDataPoint,
  defaultPlatformSettings,
  emptyAdminStats,
} from '../types/adminTypes';

export const adminApi = {
  // Stats
  async getDashboardStats(): Promise<AdminStats> {
    try {
      const res = await request<{ success: boolean; data: AdminStats }>('/admin/stats');
      if (res.success && res.data) return res.data;
    } catch (err) {
      console.error('Failed to get dashboard stats:', err);
    }
    return emptyAdminStats;
  },

  async getRevenueChart(): Promise<RevenueDataPoint[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/stats/revenue-chart');
      if (res.success && res.data) {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.data)) return res.data.data;
      }
    } catch (err) {
      console.error('Failed to get revenue chart:', err);
    }
    return [];
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/users');
      if (res.success && res.data) {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.data)) return res.data.data;
      }
    } catch (err) {
      console.error('Failed to get admin users:', err);
    }
    return [];
  },

  async updateUserStatus(userId: string, targetStatus: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    try {
      await request(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus }),
      });
      return true;
    } catch (err) {
      console.error('Failed to update user status:', err);
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
    } catch (err) {
      console.error('Failed to update user:', err);
    }
    return null;
  },

  async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      await request(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      return true;
    } catch (err) {
      console.error('Failed to update user role:', err);
      return false;
    }
  },

  // Courses
  async getCourses(): Promise<AdminCourse[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/courses?limit=100');
      const rawData = res?.data;
      const rawList: any[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
        ? rawData.data
        : [];

      return rawList.map((c: any) => {
        let moderationStatus: CourseModerationStatus = 'draft';
        const st = String(c.status || '').toUpperCase();
        if (st === 'PUBLISHED') moderationStatus = 'published';
        else if (st === 'PENDING_APPROVAL' || st === 'PENDING') moderationStatus = 'pending';
        else if (st === 'REJECTED') moderationStatus = 'rejected';

        return {
          id: String(c.courseId || c.id || ''),
          title: c.title || 'Khóa học',
          instructorName: c.instructorName || 'Giảng viên',
          instructorEmail: c.instructorEmail || '',
          category: c.categoryName || c.category || 'Chưa phân loại',
          price: Number(c.price) || 0,
          status: moderationStatus,
          rating: Number(c.rating) || 0,
          studentsCount: Number(c.studentsCount || c.enrolledStudentsCount || c.totalStudents) || 0,
          submittedDate: c.submittedAt || c.createdAt || new Date().toISOString(),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          submittedAt: c.submittedAt,
          approvedAt: c.approvedAt,
          approvedByName: c.approvedByName,
          submissionNote: c.submissionNote,
          rejectReason: c.rejectionReason || c.rejectReason,
        };
      });
    } catch (err) {
      console.error('Failed to get courses:', err);
    }
    return [];
  },

  async updateCourseStatus(courseId: string, status: CourseModerationStatus, reason?: string): Promise<boolean> {
    try {
      if (status === 'published') {
        await request(`/admin/courses/${courseId}/approve`, { method: 'POST' });
      } else if (status === 'rejected') {
        await request(`/admin/courses/${courseId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Nội dung chưa đạt yêu cầu' }),
        });
      } else {
        await request(`/admin/courses/${courseId}/moderation`, {
          method: 'PUT',
          body: JSON.stringify({ status, reason }),
        });
      }
      return true;
    } catch (err) {
      console.error('Failed to update course status:', err);
      return false;
    }
  },

  async approveCourse(courseId: string | number): Promise<boolean> {
    try {
      await request(`/admin/courses/${courseId}/approve`, { method: 'POST' });
      return true;
    } catch (err) {
      console.error('Failed to approve course:', err);
      return false;
    }
  },

  async rejectCourse(courseId: string | number, reason: string): Promise<boolean> {
    try {
      await request(`/admin/courses/${courseId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return true;
    } catch (err) {
      console.error('Failed to reject course:', err);
      return false;
    }
  },

  async toggleCourseFeatured(courseId: string, featured: boolean): Promise<boolean> {
    try {
      await request(`/admin/courses/${courseId}/featured`, {
        method: 'PUT',
        body: JSON.stringify({ featured }),
      });
      return true;
    } catch (err) {
      console.error('Failed to toggle course featured:', err);
      return false;
    }
  },

  // Categories
  async getCategories(): Promise<AdminCategory[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/categories');
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : Array.isArray(res.data.data) ? res.data.data : [];
        return rawList.map((cat: any) => ({
          id: String(cat.categoryId || cat.id),
          name: cat.categoryName || cat.name || '',
          slug: cat.slug || String(cat.categoryName || '').toLowerCase().replace(/\s+/g, '-'),
          iconName: cat.iconName || 'Code',
          coursesCount: cat.coursesCount || 0,
          description: cat.description || '',
          status: (cat.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive',
        }));
      }
    } catch (err) {
      console.error('Failed to get categories:', err);
    }
    return [];
  },

  // Payouts
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/payouts');
      if (res.success && res.data) {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.data)) return res.data.data;
      }
    } catch (err) {
      // Endpoint may not be present on backend yet
    }
    return [];
  },

  // System Logs & Settings
  async getSystemLogs(): Promise<SystemLog[]> {
    try {
      const res = await request<{ success: boolean; data: SystemLog[] }>('/admin/logs');
      if (res.success && res.data) return res.data;
    } catch (err) {
      console.error('Failed to get system logs:', err);
    }
    return [];
  },

  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const res = await request<{ success: boolean; data: PlatformSettings }>('/admin/settings');
      if (res.success && res.data) {
        localStorage.setItem('mseek_maintenance_mode', JSON.stringify(res.data.maintenanceMode));
        return res.data;
      }
    } catch (err) {
      console.error('Failed to get platform settings:', err);
    }
    return defaultPlatformSettings;
  },

  async updatePlatformSettings(settings: PlatformSettings): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      localStorage.setItem('mseek_maintenance_mode', JSON.stringify(settings.maintenanceMode));
      window.dispatchEvent(new Event('mseek_settings_changed'));
      return res.success;
    } catch (err) {
      console.error('Failed to update platform settings:', err);
      return false;
    }
  },

  async getPublicSettings(): Promise<PlatformSettings> {
    try {
      const res = await request<{ success: boolean; data: PlatformSettings }>('/system/settings');
      if (res.success && res.data) {
        localStorage.setItem('mseek_maintenance_mode', JSON.stringify(res.data.maintenanceMode));
        return res.data;
      }
    } catch (_) {
      // Fallback
    }
    const cached = localStorage.getItem('mseek_maintenance_mode');
    if (cached !== null) {
      return { ...defaultPlatformSettings, maintenanceMode: JSON.parse(cached) };
    }
    return defaultPlatformSettings;
  },
};
