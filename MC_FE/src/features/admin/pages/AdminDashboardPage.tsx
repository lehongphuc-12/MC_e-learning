import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { AdminOverviewTab } from '../components/AdminOverviewTab';
import { AdminUsersTab } from '../components/AdminUsersTab';
import { AdminCoursesTab } from '../components/AdminCoursesTab';
import { AdminCategoriesTab } from '../components/AdminCategoriesTab';
import { AdminFinancialsTab } from '../components/AdminFinancialsTab';
import { AdminSettingsTab } from '../components/AdminSettingsTab';
import { AdminForumTab } from '../components/AdminForumTab';
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

  const VALID_TABS: AdminTabType[] = ['overview', 'users', 'courses', 'categories', 'financials', 'settings', 'forum'];
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

  // Fetch data on activeTab change or polling
  const refreshCoursesData = async () => {
    try {
      const coursesRes = await adminApi.getCourses();
      setCourses(coursesRes);
    } catch (err) {
      console.error('Lỗi tự động tải danh sách khóa học:', err);
    }
  };

  useEffect(() => {
    const fetchTabData = async () => {
      // Xác định xem tab hiện tại có cần tải dữ liệu từ Backend lần đầu hay không
      let needsFetch = false;
      switch (activeTab) {
        case 'overview':
          needsFetch = !stats;
          break;
        case 'users':
          needsFetch = users.length === 0;
          break;
        case 'courses':
          needsFetch = courses.length === 0;
          break;
        case 'categories':
          needsFetch = categories.length === 0;
          break;
        case 'financials':
          needsFetch = payouts.length === 0 || !settings;
          break;
        case 'settings':
          needsFetch = !settings;
          break;
        case 'forum':
          needsFetch = false;
          break;
      }

      if (!needsFetch) {
        // Với tab courses, nếu đã có dữ liệu thì cập nhật ngầm mà không làm nhấp nháy màn hình
        if (activeTab === 'courses') {
          refreshCoursesData();
        }
        return;
      }

      setTabLoading(true);
      try {
        switch (activeTab) {
          case 'overview':
            const [statsRes, chartRes, logsRes] = await Promise.all([
              adminApi.getDashboardStats(),
              adminApi.getRevenueChart(),
              adminApi.getSystemLogs(),
            ]);
            setStats(statsRes);
            setChartData(chartRes);
            setLogs(logsRes);
            break;

          case 'users':
            const usersRes = await adminApi.getUsers();
            setUsers(usersRes);
            break;

          case 'courses':
            await refreshCoursesData();
            break;

          case 'categories':
            await refreshCategoriesData();
            break;

          case 'financials':
            const [payoutsRes, settingsRes] = await Promise.all([
              adminApi.getPayoutRequests(),
              adminApi.getPlatformSettings(),
            ]);
            setPayouts(payoutsRes);
            if (!settings) setSettings(settingsRes);
            break;

          case 'settings':
            const setRes = await adminApi.getPlatformSettings();
            setSettings(setRes);
            break;
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu cho tab:', activeTab, err);
      } finally {
        setTabLoading(false);
      }
    };

    fetchTabData();

    // Auto-polling every 10 seconds for real-time updates without F5
    const interval = setInterval(() => {
      if (activeTab === 'courses') {
        refreshCoursesData();
      }
    }, 10000);

    return () => clearInterval(interval);
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
      // Edit backend call
      const updatedUser = await adminApi.updateUser(updatedData.id, updatedData);
      if (updatedUser) {
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedData.id ? { ...u, ...updatedUser } : u))
        );
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedData.id ? { ...u, ...updatedData } : u))
        );
      }
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

  const refreshCategoriesData = async () => {
    try {
      const categoriesRes = await adminApi.getCategories();
      setCategories(categoriesRes);
    } catch (err) {
      console.error('Lỗi tự động tải danh mục:', err);
    }
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

  const handleSaveCategory = async (catData: Partial<AdminCategory>) => {
    if (catData.id) {
      const res = await adminApi.updateCategory(catData.id, catData);
      if (res) {
        onToast?.('Đã cập nhật', `Đã sửa danh mục ${res.name}`, 'success');
      } else {
        onToast?.('Lỗi', 'Không thể cập nhật danh mục.', 'error');
      }
    } else {
      const res = await adminApi.createCategory(catData);
      if (res) {
        onToast?.('Đã thêm danh mục', `Đã tạo danh mục ${res.name}`, 'success');
      } else {
        onToast?.('Lỗi', 'Không thể tạo danh mục.', 'error');
      }
    }
    await refreshCategoriesData();
  };

  const handleToggleCategoryStatus = async (categoryId: string) => {
    const ok = await adminApi.toggleCategoryStatus(categoryId);
    if (ok) {
      onToast?.('Thành công', 'Đã cập nhật trạng thái danh mục.', 'success');
      await refreshCategoriesData();
    } else {
      onToast?.('Lỗi', 'Không thể thay đổi trạng thái danh mục.', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hoặc ngưng hoạt động danh mục này?')) return;
    const ok = await adminApi.deleteCategory(categoryId);
    if (ok) {
      onToast?.('Thành công', 'Đã xử lý ngưng hoạt động/xóa danh mục.', 'success');
      await refreshCategoriesData();
    } else {
      onToast?.('Lỗi', 'Không thể xóa danh mục.', 'error');
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
  const handleSaveSettings = async (newSettings: PlatformSettings) => {
    try {
      const success = await adminApi.updatePlatformSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        onToast?.('Đã lưu cấu hình', 'Các thiết lập hệ thống đã được cập nhật.', 'success');
      } else {
        onToast?.('Lỗi', 'Không thể lưu cấu hình hệ thống', 'error');
      }
    } catch (error) {
      onToast?.('Lỗi', 'Có lỗi xảy ra khi lưu cấu hình', 'error');
    }
  };

  const pendingApprovalsCount = Array.isArray(courses)
    ? courses.filter((c) => c?.status === 'pending').length
    : 0;

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      currentUser={currentUser}
      onNavigateHome={() => navigate('/')}
      onLogout={onLogout}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      {tabLoading ? (
        <div className="flex flex-col items-center justify-center py-28 min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
          <span className="text-slate-400 font-medium text-sm">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && stats && (
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
              onRefresh={refreshCoursesData}
            />
          )}

      {activeTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onToggleStatus={handleToggleCategoryStatus}
          onDeleteCategory={handleDeleteCategory}
          onRefresh={refreshCategoriesData}
          isLoading={tabLoading}
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

          {activeTab === 'forum' && (
            <AdminForumTab onToast={onToast} />
          )}
        </>
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
