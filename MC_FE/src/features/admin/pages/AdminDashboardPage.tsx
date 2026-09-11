import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const VALID_TABS: AdminTabType[] = ['overview', 'users', 'courses', 'categories', 'financials', 'settings'];
  const tabFromUrl = searchParams.get('tab') as AdminTabType | null;
  const [activeTab, setActiveTab] = useState<AdminTabType>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview'
  );

  const handleTabChange = (tab: AdminTabType) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

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

  // State loading flag per tab
  const [tabLoading, setTabLoading] = useState<boolean>(false);

  // Lazy load data on activeTab change
  useEffect(() => {
    const fetchTabData = async () => {
      setTabLoading(true);
      try {
        switch (activeTab) {
          case 'overview':
            if (!stats) {
              const [statsRes, chartRes, logsRes] = await Promise.all([
                adminApi.getDashboardStats(),
                adminApi.getRevenueChart(),
                adminApi.getSystemLogs(),
              ]);
              setStats(statsRes);
              setChartData(chartRes);
              setLogs(logsRes);
            }
            break;

          case 'users':
            if (users.length === 0) {
              const usersRes = await adminApi.getUsers();
              setUsers(usersRes);
            }
            break;

          case 'courses':
            if (courses.length === 0) {
              const coursesRes = await adminApi.getCourses();
              setCourses(coursesRes);
            }
            break;

          case 'categories':
            if (categories.length === 0) {
              const categoriesRes = await adminApi.getCategories();
              setCategories(categoriesRes);
            }
            break;

          case 'financials':
            if (payouts.length === 0 || !settings) {
              const [payoutsRes, settingsRes] = await Promise.all([
                adminApi.getPayoutRequests(),
                adminApi.getPlatformSettings(),
              ]);
              setPayouts(payoutsRes);
              if (!settings) setSettings(settingsRes);
            }
            break;

          case 'settings':
            if (!settings) {
              const settingsRes = await adminApi.getPlatformSettings();
              setSettings(settingsRes);
            }
            break;
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu cho tab:', activeTab, err);
      } finally {
        setTabLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab]);

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
    const isLocking = currentStatus === 'active';
    const targetBEStatus = isLocking ? 'INACTIVE' : 'ACTIVE';
    const ok = await adminApi.updateUserStatus(userId, targetBEStatus);

    if (!ok) {
      onToast?.('Lỗi', 'Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.', 'error');
      return;
    }

    const targetStatus: UserStatus = isLocking ? 'locked' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
    );
    onToast?.(
      isLocking ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản',
      'Cập nhật quyền truy cập người dùng thành công.',
      isLocking ? 'error' : 'success'
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
      onTabChange={handleTabChange}
      currentUser={currentUser}
      onNavigateHome={() => navigate('/')}
      onLogout={onLogout}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      {tabLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-slate-600 font-medium">Đang tải dữ liệu...</span>
        </div>
      )}

      {!tabLoading && activeTab === 'overview' && stats && (
        <AdminOverviewTab
          stats={stats}
          chartData={chartData}
          recentLogs={logs}
          onNavigateTab={(tab) => handleTabChange(tab)}
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
