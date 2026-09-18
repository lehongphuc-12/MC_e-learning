import React from 'react';
import { Routes, Route, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ScreenType, Course, User } from '../types';
import { MainLayout } from './layouts/MainLayout';
import { ToastType } from './common/Toast';
import { mockCourses } from '../data/mockData';
import { HomeScreen } from '../features/courses/components/HomeScreen';

// Feature route modules
import { renderAuthRoutes } from '../features/auth/routes';
import { renderCourseRoutes } from '../features/courses/routes';
import { renderQuizRoutes } from '../features/quizzes/routes';
import { renderProfileRoutes } from '../features/profile/routes';
import { renderAdminRoutes } from '../features/admin/routes';
import { renderPaymentRoutes } from '../features/payment/routes';

interface AppRouterProps {
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course) => void;
  wishlistCourseIds: string[];
  searchQuery: string;
  user: User | null;
  onSearchChange: (query: string) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  onEnrollDirectly: (course: Course) => void;
  onLoginSuccess: (userObj: any, token: string) => void;
  onRegisterSuccess: (userObj: any) => void;
  onUpdateUser?: (updatedUser: Partial<User>) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  onLogout: () => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  selectedCourse,
  setSelectedCourse,
  wishlistCourseIds,
  searchQuery,
  user,
  onSearchChange,
  onPreviewVideo,
  onAddToCart,
  onToggleWishlist,
  onEnrollDirectly,
  onLoginSuccess,
  onRegisterSuccess,
  onUpdateUser,
  onToast,
  onLogout,
  cartCount,
  onOpenCart,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Map react-router path to ScreenType for layout compatibility
  const currentScreen: ScreenType = (() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/courses')) return 'courses';
    if (path.startsWith('/course-detail')) return 'course-detail';
    if (path === '/profile') return 'profile';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/reset-password') return 'reset-password';
    return 'home';
  })();

  const handleNavigate = (screen: ScreenType) => {
    const targetPath = screen === 'home' ? '/' : `/${screen}`;
    navigate(targetPath);
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    navigate(`/course-detail?id=${course.id}`);
  };

  // Helper to wrap screens in MainLayout
  const withMainLayout = (component: React.ReactNode, showFooter: boolean = true) => (
    <MainLayout
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      user={user}
      onLogout={onLogout}
      cartCount={cartCount}
      wishlistCount={wishlistCourseIds.length}
      onOpenCart={onOpenCart}
      onSelectCourse={handleSelectCourse}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      showFooter={showFooter}
    >
      {component}
    </MainLayout>
  );

  // Sync selectedCourse from URL params on /course-detail
  const courseIdParam = searchParams.get('id');
  const activeCourse = (location.pathname === '/course-detail' && courseIdParam)
    ? (mockCourses.find((c) => c.id === courseIdParam) || selectedCourse)
    : selectedCourse;

  return (
    <Routes>
      {/* ── 1. Auth Routes (/login, /register, /forgot-password, /reset-password) ── */}
      {renderAuthRoutes({
        onNavigate: handleNavigate,
        onLoginSuccess,
        onRegisterSuccess,
        onToast,
      })}

      {/* ── 2. Course Routes (/, /courses, /course-detail, /instructor/courses/*) ── */}
      {renderCourseRoutes({
        onNavigate: handleNavigate,
        onSelectCourse: handleSelectCourse,
        onPreviewVideo,
        onAddToCart,
        onToggleWishlist,
        onEnrollDirectly,
        wishlistCourseIds,
        searchQuery,
        onSearchChange,
        activeCourse,
        withMainLayout,
        user,
        currentScreen,
        onToast,
      })}

      {/* ── 3. Quiz Routes (/quizzes/*, /instructor/quizzes/*) ── */}
      {renderQuizRoutes({
        onNavigate: handleNavigate,
        withMainLayout,
        user,
        currentScreen,
        onToast,
      })}

      {/* ── 4. Profile Route (/profile) ── */}
      {renderProfileRoutes({
        user,
        currentScreen,
        onNavigate: handleNavigate,
        onUpdateUser,
        onToast,
        withMainLayout,
      })}

      {/* ── 5. Admin Routes (/admin) ── */}
      {renderAdminRoutes({
        user,
        currentScreen,
        onNavigate: handleNavigate,
        onLogout,
        onToast,
      })}

      {/* ── 6. Payment Result Route (/payment-result) ── */}
      {renderPaymentRoutes()}

      {/* ── Fallback Route (*) ── */}
      <Route
        path="*"
        element={withMainLayout(
          <HomeScreen
            onNavigate={handleNavigate}
            onSelectCourse={handleSelectCourse}
            onPreviewVideo={onPreviewVideo}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            wishlistCourseIds={wishlistCourseIds}
          />
        )}
      />
    </Routes>
  );
};