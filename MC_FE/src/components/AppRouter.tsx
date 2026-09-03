import React from 'react';
import { ScreenType, Course, User } from '../types';
import { HomeScreen } from './screens/HomeScreen';
import { CourseCatalogScreen } from './screens/CourseCatalogScreen';
import { CourseDetailScreen } from './screens/CourseDetailScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ProfileScreen } from './screens/ProfileScreen';

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
}) => {
  switch (currentScreen) {
    case 'home':
      return (
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
      return (
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
      return (
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
    case 'login':
      return (
        <LoginScreen
          onNavigate={onNavigate}
          onLoginSuccess={onLoginSuccess}
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
    case 'profile':
      return user ? (
        <ProfileScreen
          user={user}
          onNavigate={onNavigate}
          onUpdateUser={onUpdateUser}
          onToast={onToast}
        />
      ) : null;
    default:
      return null;
  }
};
