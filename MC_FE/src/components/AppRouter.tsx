import React from 'react';
import { ScreenType, Course, User } from '../types';
import { HomeScreen } from './screens/HomeScreen';
import { CourseCatalogScreen } from './screens/CourseCatalogScreen';
import { CourseDetailScreen } from './screens/CourseDetailScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MainLayout } from './layouts/MainLayout';
import { ToastType } from './common/Toast';

interface AppRouterProps {
  currentScreen: ScreenType;
  selectedCourse: Course | null;
  wishlistCourseIds: string[];
  searchQuery: string;
  user: User | null;
  onSearchChange: (query: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
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
  currentScreen,
  selectedCourse,
  wishlistCourseIds,
  searchQuery,
  user,
  onSearchChange,
  onNavigate,
  onSelectCourse,
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
  // Helper to wrap public screens in MainLayout
  const withMainLayout = (component: React.ReactNode, showFooter: boolean = true) => (
    <MainLayout
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      cartCount={cartCount}
      wishlistCount={wishlistCourseIds.length}
      onOpenCart={onOpenCart}
      onSelectCourse={onSelectCourse}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      showFooter={showFooter}
    >
      {component}
    </MainLayout>
  );

  switch (currentScreen) {
    case 'home':
      return withMainLayout(
        <HomeScreen
          onNavigate={onNavigate}
          onSelectCourse={onSelectCourse}
          onPreviewVideo={onPreviewVideo}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          wishlistCourseIds={wishlistCourseIds}
        />
      );
    case 'courses':
      return withMainLayout(
        <CourseCatalogScreen
          onNavigate={onNavigate}
          onSelectCourse={onSelectCourse}
          onPreviewVideo={onPreviewVideo}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          wishlistCourseIds={wishlistCourseIds}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      );
    case 'course-detail':
      return withMainLayout(
        <CourseDetailScreen
          course={selectedCourse}
          onNavigate={onNavigate}
          onEnroll={onEnrollDirectly}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          isWishlisted={selectedCourse ? wishlistCourseIds.includes(selectedCourse.id) : false}
          onPreviewVideo={onPreviewVideo}
        />
      );
    case 'profile':
      return user
        ? withMainLayout(
            <ProfileScreen
              user={user}
              onNavigate={onNavigate}
              onUpdateUser={onUpdateUser}
              onToast={onToast}
            />,
            false
          )
        : null;
    case 'login':
      return (
        <LoginScreen
          onNavigate={onNavigate}
          onLoginSuccess={onLoginSuccess}
          onToast={onToast}
        />
      );
    case 'forgot-password':
      return (
        <ForgotPasswordScreen
          onNavigate={onNavigate}
          onToast={onToast}
        />
      );
    case 'register':
      return (
        <RegisterScreen
          onNavigate={onNavigate}
          onRegisterSuccess={onRegisterSuccess}
          onToast={onToast}
        />
      );
    default:
      return null;
  }
};
