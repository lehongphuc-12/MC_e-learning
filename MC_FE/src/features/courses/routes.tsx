import React from 'react';
import { Route } from 'react-router-dom';
import { Course, ScreenType, User } from '../../types';
import { HomeScreen } from './components/HomeScreen';
import { CourseCatalogScreen } from './components/CourseCatalogScreen';
import { CourseDetailScreen } from './components/CourseDetailScreen';
import { CourseLearningPage } from './components/CourseLearningPage';
import { CertificateScreen } from './components/CertificateScreen';
import { CertificateVerifyScreen } from './components/CertificateVerifyScreen';
import { MyCoursesScreen } from './components/MyCoursesScreen';
import { CourseManagementPage } from './components/management/CourseManagementPage';
import { CourseFormPage } from './components/management/CourseFormPage';
import { CourseLessonsPage } from './components/management/CourseLessonsPage';
import { InstructorSpeakingPage } from './components/management/InstructorSpeakingPage';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { ToastType } from '../../components/common/Toast';

interface CourseRoutesProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  onEnrollDirectly: (course: Course) => void;
  wishlistCourseIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCourse: Course | null;
  withMainLayout: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  withInstructorLayout?: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  user: User | null;
  currentScreen: ScreenType;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const renderCourseRoutes = ({
  onNavigate,
  onSelectCourse,
  onPreviewVideo,
  onAddToCart,
  onToggleWishlist,
  onEnrollDirectly,
  wishlistCourseIds,
  searchQuery,
  onSearchChange,
  activeCourse,
  withMainLayout,
  withInstructorLayout = withMainLayout,
  user,
  currentScreen,
  onToast,
}: CourseRoutesProps) => {
  return (
    <>
      {/* Public Course & Learning Routes */}
      <Route
        path="/"
        element={withMainLayout(
          <HomeScreen
            onNavigate={onNavigate}
            onSelectCourse={onSelectCourse}
            onPreviewVideo={onPreviewVideo}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            wishlistCourseIds={wishlistCourseIds}
          />
        )}
      />
      <Route
        path="/courses"
        element={withMainLayout(
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
        )}
      />
      <Route
        path="/course-detail"
        element={withMainLayout(
          <CourseDetailScreen
            course={activeCourse}
            onNavigate={onNavigate}
            onEnroll={onEnrollDirectly}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            isWishlisted={activeCourse ? wishlistCourseIds.includes(activeCourse.id) : false}
            onPreviewVideo={onPreviewVideo}
          />
        )}
      />
      <Route path="/courses/:id/learn" element={<CourseLearningPage />} />
      <Route path="/my-courses" element={withMainLayout(<MyCoursesScreen onNavigate={onNavigate} />)} />
      <Route path="/certificates/:certificateId" element={<CertificateScreen />} />
      <Route path="/verify-certificate" element={<CertificateVerifyScreen />} />

      {/* Instructor Course Routes (Wrapped in dedicated InstructorLayout) */}
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<CourseManagementPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/new"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<CourseFormPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:id/edit"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<CourseFormPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:id/lessons"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<CourseLessonsPage />)}
          </ProtectedRoute>
        }
      />
      <Route path="/instructor/courses/:id/learn" element={<CourseLearningPage />} />
      <Route
        path="/instructor/speaking-submissions"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<InstructorSpeakingPage onToast={onToast} />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/speaking"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<InstructorSpeakingPage onToast={onToast} />)}
          </ProtectedRoute>
        }
      />
    </>
  );
};
