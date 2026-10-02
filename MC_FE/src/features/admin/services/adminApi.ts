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
      const res = await request<{ success: boolean; data: any }>('/admin/stats');
      if (res && res.success && res.data) {
        return {
          totalRevenue: Number(res.data.totalRevenue) || 0,
          revenueGrowth: Number(res.data.revenueGrowth) || 0,
          totalUsers: Number(res.data.totalUsers) || 0,
          usersGrowth: Number(res.data.usersGrowth) || 0,
          activeStudents: Number(res.data.activeStudents) || 0,
          totalInstructors: Number(res.data.totalInstructors) || 0,
          totalCourses: Number(res.data.totalCourses) || 0,
          coursesGrowth: Number(res.data.coursesGrowth) || 0,
          pendingCourseApprovals: Number(res.data.pendingCourseApprovals) || 0,
          pendingPayoutsCount: Number(res.data.pendingPayoutsCount) || 0,
          pendingPayoutsAmount: Number(res.data.pendingPayoutsAmount) || 0,
        };
      }
    } catch (_) {}
    return {
      totalRevenue: 0,
      revenueGrowth: 0,
      totalUsers: 0,
      usersGrowth: 0,
      activeStudents: 0,
      totalInstructors: 0,
      totalCourses: 0,
      coursesGrowth: 0,
      pendingCourseApprovals: 0,
      pendingPayoutsCount: 0,
      pendingPayoutsAmount: 0,
    };
  },

  async getRevenueChart(): Promise<RevenueDataPoint[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/stats/revenue-chart');
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (_) {}
    return [];
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/users');
      if (res && res.success) {
        const rawData = res.data;
        const rawList: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.users)
          ? rawData.users
          : [];

        return rawList.map((u: any) => ({
          id: String(u.userId || u.id || ''),
          name: u.fullName || u.name || 'Người dùng',
          email: u.email || '',
          role: (String(u.role).toLowerCase() === 'admin' ? 'admin' : String(u.role).toLowerCase() === 'instructor' ? 'instructor' : 'student') as UserRole,
          status: (String(u.status).toLowerCase() === 'inactive' || String(u.status).toLowerCase() === 'locked') ? 'locked' : 'active',
          avatar: u.avatar || u.avatarUrl,
          joinedDate: u.joinedDate || u.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          coursesEnrolled: Number(u.coursesEnrolled) || 0,
          coursesCreated: Number(u.coursesCreated) || 0,
          totalSpent: Number(u.totalSpent) || 0,
          earnings: Number(u.earnings) || 0,
          lastActive: u.lastActive || 'Chưa có',
        }));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
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
      const res = await request<{ success: boolean; data: any }>('/admin/courses');
      if (res && res.success) {
        const rawData = res.data;
        const rawList: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.items)
          ? rawData.items
          : [];

        return rawList.map((c: any) => {
          let moderationStatus: CourseModerationStatus = 'draft';
          const st = String(c.status || '').toUpperCase();
          if (st === 'PUBLISHED') moderationStatus = 'published';
          else if (st === 'PENDING_APPROVAL' || st === 'PENDING') moderationStatus = 'pending';
          else if (st === 'REJECTED') moderationStatus = 'rejected';

          return {
            id: String(c.courseId || c.id || Date.now()),
            title: c.title || 'Khóa học',
            instructorName: c.instructorName || 'Giảng viên',
            instructorEmail: c.instructorEmail || '',
            category: c.categoryName || c.category || 'Chưa phân loại',
            price: Number(c.price) || 0,
            status: moderationStatus,
            rating: Number(c.rating) || 5.0,
            studentsCount: Number(c.studentsCount) || 0,
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
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khóa học Admin:', err);
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
      const res = await request<{ success: boolean; data: any }>('/admin/categories');
      if (res && res.success) {
        const rawData = res.data;
        const rawList: any[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
          ? rawData.data
          : [];

        return rawList.map((cat: any) => {
          const nameStr = cat.categoryName || cat.name || '';
          const statusStr = String(cat.status || 'ACTIVE').toUpperCase();

          return {
            id: String(cat.categoryId || cat.id || Date.now()),
            name: nameStr,
            slug: cat.slug || nameStr.toLowerCase().replace(/\s+/g, '-'),
            iconName: cat.iconName || 'Mic',
            coursesCount: Number(cat.coursesCount) || 0,
            description: cat.description || '',
            status: statusStr === 'INACTIVE' ? 'inactive' : 'active',
          };
        });
      }
    } catch (err) {
      console.error('Lỗi tải danh mục từ Backend:', err);
    }
    return [];
  },

  async createCategory(data: Partial<AdminCategory>): Promise<AdminCategory | null> {
    try {
      const res = await request<{ success: boolean; data: any }>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          categoryName: data.name,
          description: data.description || '',
          status: data.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
        }),
      });

      if (res.success && res.data) {
        const cat = res.data;
        const nameStr = cat.categoryName || data.name || '';
        return {
          id: String(cat.categoryId),
          name: nameStr,
          slug: cat.slug || nameStr.toLowerCase().replace(/\s+/g, '-'),
          iconName: data.iconName || 'Code',
          coursesCount: Number(cat.coursesCount) || 0,
          description: cat.description || '',
          status: String(cat.status).toUpperCase() === 'INACTIVE' ? 'inactive' : 'active',
        };
      }
    } catch (err) {
      console.error('Lỗi tạo danh mục:', err);
    }
    return null;
  },

  async updateCategory(id: string | number, data: Partial<AdminCategory>): Promise<AdminCategory | null> {
    try {
      const res = await request<{ success: boolean; data: any }>(`/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          categoryName: data.name,
          description: data.description || '',
          status: data.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
        }),
      });

      if (res.success && res.data) {
        const cat = res.data;
        const nameStr = cat.categoryName || data.name || '';
        return {
          id: String(cat.categoryId),
          name: nameStr,
          slug: cat.slug || nameStr.toLowerCase().replace(/\s+/g, '-'),
          iconName: data.iconName || 'Code',
          coursesCount: Number(cat.coursesCount) || 0,
          description: cat.description || '',
          status: String(cat.status).toUpperCase() === 'INACTIVE' ? 'inactive' : 'active',
        };
      }
    } catch (err) {
      console.error('Lỗi cập nhật danh mục:', err);
    }
    return null;
  },

  async deleteCategory(id: string | number): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/categories/${id}`, {
        method: 'DELETE',
      });
      return res.success;
    } catch (err) {
      console.error('Lỗi xóa danh mục:', err);
      return false;
    }
  },

  async toggleCategoryStatus(id: string | number): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/categories/${id}/status`, {
        method: 'PUT',
      });
      return res.success;
    } catch (err) {
      console.error('Lỗi đổi trạng thái danh mục:', err);
      return false;
    }
  },


  // Payouts
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      const res = await request<{ success: boolean; data: PayoutRequest[] }>('/admin/payouts');
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (_) {}
    return [];
  },

  // System Logs & Settings
  async getSystemLogs(): Promise<SystemLog[]> {
    try {
      const res = await request<{ success: boolean; data: SystemLog[] }>('/admin/logs');
      if (res && res.success && Array.isArray(res.data)) return res.data;
    } catch (_) {}
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
