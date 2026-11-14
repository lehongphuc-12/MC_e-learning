import React from 'react';
import { Route } from 'react-router-dom';
import { Course, ScreenType, User } from '../../types';
import { HomeScreen } from './components/HomeScreen';
import { CourseCatalogScreen } from './components/CourseCatalogScreen';
import { CourseDetailScreen } from './components/CourseDetailScreen';
import { CourseLearningPage } from './components/CourseLearningPage';
import { CourseLearningAccessGate } from './components/CourseLearningAccessGate';
import { CertificateScreen } from './components/CertificateScreen';
import { CertificateVerifyScreen } from './components/CertificateVerifyScreen';
import { MyCoursesScreen } from './components/MyCoursesScreen';
import { CourseManagementPage } from './components/management/CourseManagementPage';
import { CourseFormPage } from './components/management/CourseFormPage';
import { CourseLessonsPage } from './components/management/CourseLessonsPage';
import { InstructorSpeakingPage } from './components/management/InstructorSpeakingPage';
import { InstructorSpeakingAssignmentsPage } from './components/management/InstructorSpeakingAssignmentsPage';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { ToastType } from '../../components/common/Toast';

interface CourseRoutesProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course, lessonId?: number, lessonTitle?: string) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  onEnrollDirectly: (course: Course) => void;
  wishlistCourseIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCourse: Course | null;
  courseIdParam?: string | null;
  withMainLayout: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  withInstructorLayout?: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  user: User | null;
  currentScreen: ScreenType;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  onOpenCart: () => void;
  isCourseInCart: (courseId: string | number) => boolean;
  isCourseEnrolled: (courseId: string | number) => boolean;
  isCoursePendingPayment: (courseId: string | number) => boolean;
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
  courseIdParam,
  withMainLayout,
  withInstructorLayout = withMainLayout,
  user,
  currentScreen,
  onToast,
  onOpenCart,
  isCourseInCart,
  isCourseEnrolled,
  isCoursePendingPayment,
}: CourseRoutesProps) => {
  const routeCourseId = activeCourse?.id ?? courseIdParam;

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
      onOpenCart={onOpenCart}
      isCourseInCart={isCourseInCart}
      isCourseEnrolled={isCourseEnrolled}
      isCoursePendingPayment={isCoursePendingPayment}
      onContinuePayment={onEnrollDirectly}
    />
  )}
/>
      <Route
  path="/course-detail"
  element={withMainLayout(
    <CourseDetailScreen
      course={activeCourse}
      courseId={courseIdParam ?? undefined}
      onNavigate={onNavigate}
      onEnroll={onEnrollDirectly}
      onAddToCart={onAddToCart}
      onToggleWishlist={onToggleWishlist}
      isWishlisted={
        routeCourseId
          ? wishlistCourseIds.includes(routeCourseId)
          : false
      }
      onPreviewVideo={onPreviewVideo}
      isEnrolled={
        activeCourse
          ? isCourseEnrolled(activeCourse.id)
          : undefined
      }
      isInCart={
        routeCourseId ? isCourseInCart(routeCourseId) : undefined
      }
      isPendingPayment={
        routeCourseId ? isCoursePendingPayment(routeCourseId) : undefined
      }
      onOpenCart={onOpenCart}
    />
  )}
/>
      <Route
        path="/courses/:id/learn"
        element={
          <ProtectedRoute user={user}>
            <CourseLearningAccessGate user={user}>
              <CourseLearningPage />
            </CourseLearningAccessGate>
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/instructor/courses/:id/learn"
        element={
          <ProtectedRoute user={user} allowedRoles={['instructor', 'admin']}>
            <CourseLearningAccessGate user={user}>
              <CourseLearningPage />
            </CourseLearningAccessGate>
          </ProtectedRoute>
        }
      />
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
        path="/instructor/speaking-assignments"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<InstructorSpeakingAssignmentsPage onToast={onToast} />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/speaking-assignments"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<InstructorSpeakingAssignmentsPage onToast={onToast} />)}
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
