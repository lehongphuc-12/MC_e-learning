import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { AdminOverviewTab } from '../components/AdminOverviewTab';
import { AdminUsersTab } from '../components/AdminUsersTab';
import { AdminCoursesTab } from '../components/AdminCoursesTab';
import { AdminCategoriesTab } from '../components/AdminCategoriesTab';
import { AdminFinancialsTab } from '../components/AdminFinancialsTab';
import { AdminSettingsTab } from '../components/AdminSettingsTab';
import { UserEditModal } from '../components/modals/UserEditModal';
import { CourseReviewModal } from '../components/modals/CourseReviewModal';
import { CategoryModal } from '../components/modals/CategoryModal';

import { adminApi } from '../services/adminApi';
import {
  AdminTabType,
  AdminUser,
  AdminCourse,
  AdminCategory,
  AdminStats,
  RevenueDataPoint,
  PayoutRequest,
  SystemLog,
  PlatformSettings,
  UserStatus,
} from '../types/adminTypes';
import { User } from '../../../types';
import { ToastType } from '../../../components/common/Toast';

interface AdminDashboardPageProps {
  currentUser: User | null;
  onLogout: () => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  onLogout,
  onToast,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');

  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<RevenueDataPoint[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Modal States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      const [
        statsRes,
        chartRes,
        usersRes,
        coursesRes,
        categoriesRes,
        payoutsRes,
        logsRes,
        settingsRes,
      ] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getRevenueChart(),
        adminApi.getUsers(),
        adminApi.getCourses(),
        adminApi.getCategories(),
        adminApi.getPayoutRequests(),
        adminApi.getSystemLogs(),
        adminApi.getPlatformSettings(),
      ]);

      setStats(statsRes);
      setChartData(chartRes);
      setUsers(usersRes);
      setCourses(coursesRes);
      setCategories(categoriesRes);
      setPayouts(payoutsRes);
      setLogs(logsRes);
      setSettings(settingsRes);
    };

    loadData();
  }, []);

  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const handleRefreshUsers = async () => {
    setIsUsersLoading(true);
    try {
      const usersRes = await adminApi.getUsers();
      setUsers(usersRes);
      onToast?.('Đã làm mới', 'Đã cập nhật danh sách người dùng từ Backend thành công.', 'info');
    } catch (_) {
      onToast?.('Lỗi kết nối', 'Không thể tải dữ liệu người dùng từ Backend.', 'error');
    } finally {
      setIsUsersLoading(false);
    }
  };

  // --- Handlers for Users ---
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<AdminUser>) => {
    if (updatedData.id) {
      // Edit
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedData.id ? { ...u, ...updatedData } : u))
      );
      onToast?.('Đã cập nhật', `Cập nhật thông tin ${updatedData.name} thành công.`, 'success');
    } else {
      // Add new
      const newUser: AdminUser = {
        id: `u-${Date.now()}`,
        name: updatedData.name || 'Người dùng mới',
        email: updatedData.email || 'user@mseek.edu.vn',
        role: updatedData.role || 'student',
        status: updatedData.status || 'active',
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      onToast?.('Tạo mới thành công', `Đã thêm tài khoản ${newUser.name}.`, 'success');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    const targetStatus = currentStatus === 'active' ? 'locked' : 'active';
    await adminApi.toggleUserStatus(userId, targetStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
    );
    onToast?.(
      targetStatus === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
      'Cập nhật quyền truy cập người dùng thành công.',
      targetStatus === 'locked' ? 'error' : 'success'
    );
  };

  // --- Handlers for Courses ---
  const handleReviewCourse = (course: AdminCourse) => {
    setSelectedCourse(course);
    setCourseModalOpen(true);
  };

  const handleApproveCourse = async (courseId: string) => {
    await adminApi.updateCourseStatus(courseId, 'published');
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status: 'published' } : c))
    );
    if (stats) {
      setStats({
        ...stats,
        pendingCourseApprovals: Math.max(0, stats.pendingCourseApprovals - 1),
        totalCourses: stats.totalCourses + 1,
      });
    }
    onToast?.('Đã phê duyệt', 'Khóa học đã được xuất bản công khai!', 'success');
  };

  const handleRejectCourse = async (courseId: string, reason: string) => {
    await adminApi.updateCourseStatus(courseId, 'rejected', reason);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, status: 'rejected', rejectReason: reason } : c
      )
    );
    if (stats) {
      setStats({
        ...stats,
        pendingCourseApprovals: Math.max(0, stats.pendingCourseApprovals - 1),
      });
    }
    onToast?.('Đã từ chối', 'Đã gửi thông báo cho Giảng viên khắc phục.', 'info');
  };

  const handleToggleFeatured = async (courseId: string, currentFeatured: boolean) => {
    await adminApi.toggleCourseFeatured(courseId, !currentFeatured);
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, featured: !currentFeatured } : c))
    );
    onToast?.(
      !currentFeatured ? 'Đã đặt làm Nổi Bật' : 'Đã bỏ nhãn Nổi Bật',
      'Khóa học đã cập nhật vị trí ưu tiên.',
      'success'
    );
  };

  // --- Handlers for Categories ---
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: AdminCategory) => {
    setSelectedCategory(category);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = (catData: Partial<AdminCategory>) => {
    if (catData.id) {
      setCategories((prev) =>
        prev.map((c) => (c.id === catData.id ? { ...c, ...catData } : c))
      );
      onToast?.('Đã cập nhật', `Đã sửa danh mục ${catData.name}`, 'success');
    } else {
      const newCat: AdminCategory = {
        id: `cat-${Date.now()}`,
        name: catData.name || 'Danh mục mới',
        slug: catData.slug || 'danh-muc-moi',
        iconName: catData.iconName || 'Code',
        coursesCount: 0,
        description: catData.description || '',
        status: 'active',
      };
      setCategories((prev) => [...prev, newCat]);
      onToast?.('Đã thêm danh mục', `Đã tạo danh mục ${newCat.name}`, 'success');
    }
  };

  // --- Handlers for Financial Payouts ---
  const handleApprovePayout = (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'approved' } : p))
    );
    onToast?.('Thành công', 'Đã xác nhận thanh toán chuyển khoản cho Giảng viên.', 'success');
  };

  const handleRejectPayout = (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'rejected' } : p))
    );
    onToast?.('Đã từ chối', 'Yêu cầu rút tiền bị hủy bỏ.', 'info');
  };

  // --- Handlers for Settings ---
  const handleSaveSettings = (newSettings: PlatformSettings) => {
    setSettings(newSettings);
    onToast?.('Đã lưu cấu hình', 'Các thiết lập hệ thống đã được cập nhật.', 'success');
  };

  const pendingApprovalsCount = courses.filter((c) => c.status === 'pending').length;

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentUser={currentUser}
      onNavigateHome={() => navigate('/')}
      onLogout={onLogout}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      {activeTab === 'overview' && stats && (
        <AdminOverviewTab
          stats={stats}
          chartData={chartData}
          recentLogs={logs}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          onAddUser={handleAddUser}
          onEditUser={handleEditUser}
          onToggleStatus={handleToggleUserStatus}
          onRefresh={handleRefreshUsers}
          isLoading={isUsersLoading}
        />
      )}

      {activeTab === 'courses' && (
        <AdminCoursesTab
          courses={courses}
          onReviewCourse={handleReviewCourse}
          onApproveCourse={handleApproveCourse}
          onRejectCourse={handleRejectCourse}
          onToggleFeatured={handleToggleFeatured}
        />
      )}

      {activeTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
        />
      )}

      {activeTab === 'financials' && settings && (
        <AdminFinancialsTab
          payouts={payouts}
          onApprovePayout={handleApprovePayout}
          onRejectPayout={handleRejectPayout}
          commissionRate={settings.commissionRatePercent}
        />
      )}

      {activeTab === 'settings' && settings && (
        <AdminSettingsTab settings={settings} onSaveSettings={handleSaveSettings} />
      )}

      {/* Modals */}
      <UserEditModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <CourseReviewModal
        isOpen={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        course={selectedCourse}
        onApprove={handleApproveCourse}
        onReject={handleRejectCourse}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={selectedCategory}
        onSave={handleSaveCategory}
      />
    </AdminLayout>
  );
};
