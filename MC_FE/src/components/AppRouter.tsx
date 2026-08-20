import React from 'react';
import { ScreenType, Course } from '../types';
import { HomeScreen } from './screens/HomeScreen';
import { CourseCatalogScreen } from './screens/CourseCatalogScreen';
import { CourseDetailScreen } from './screens/CourseDetailScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';

interface AppRouterProps {
  currentScreen: ScreenType;
  selectedCourse: Course | null;
  wishlistCourseIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  onEnrollDirectly: (course: Course) => void;
  onLoginSuccess: (userObj: any, token: string) => void;
  onRegisterSuccess: (userObj: any) => void;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  currentScreen,
  selectedCourse,
  wishlistCourseIds,
  searchQuery,
  onSearchChange,
  onNavigate,
  onSelectCourse,
  onPreviewVideo,
  onAddToCart,
  onToggleWishlist,
  onEnrollDirectly,
  onLoginSuccess,
  onRegisterSuccess,
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
        />
      );
    case 'register':
      return (
        <RegisterScreen
          onNavigate={onNavigate}
          onRegisterSuccess={onRegisterSuccess}
        />
      );
    default:
      return null;
  }
};
