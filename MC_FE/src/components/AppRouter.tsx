import React from 'react';
import { Routes, Route, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ScreenType, Course, User } from '../types';
import { HomeScreen } from '../features/courses/components/HomeScreen';
import { CourseCatalogScreen } from '../features/courses/components/CourseCatalogScreen';
import { CourseDetailScreen } from '../features/courses/components/CourseDetailScreen';
import { LoginScreen } from '../features/auth/components/LoginScreen';
import { RegisterScreen } from '../features/auth/components/RegisterScreen';
import { ForgotPasswordScreen } from '../features/auth/components/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../features/auth/components/ResetPasswordScreen';
import { ProfileScreen } from '../features/profile/components/ProfileScreen';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage';
// FE:03 Course Management imports
import { CourseManagementPage } from '../features/courses/components/management/CourseManagementPage';
import { CourseFormPage } from '../features/courses/components/management/CourseFormPage';
import { CourseLessonsPage } from '../features/courses/components/management/CourseLessonsPage';
import { CourseLearningPage } from '../features/courses/components/CourseLearningPage';
import { CertificateScreen } from '../features/courses/components/CertificateScreen';
import { CertificateVerifyScreen } from '../features/courses/components/CertificateVerifyScreen';
import { MainLayout } from './layouts/MainLayout';
import { ToastType } from './common/Toast';
import { ProtectedRoute } from './common/ProtectedRoute';
import { mockCourses } from '../data/mockData';
// FE:08 Quiz Management imports
import { CreateQuizPage } from '../features/quizzes/pages/CreateQuizPage';
import { UpdateQuizPage } from '../features/quizzes/pages/UpdateQuizPage';
import { TakeQuizPage } from '../features/quizzes/pages/TakeQuizPage';
import { QuizResultPage } from '../features/quizzes/pages/QuizResultPage';
import { QuizDetailPage } from '../features/quizzes/pages/QuizDetailPage';
import { QuizManagementPage } from '../features/quizzes/pages/QuizManagementPage';
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

  // Helper to wrap public screens in MainLayout
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
      <Route
        path="/"
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
      <Route
        path="/courses"
        element={withMainLayout(
          <CourseCatalogScreen
            onNavigate={handleNavigate}
            onSelectCourse={handleSelectCourse}
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
            onNavigate={handleNavigate}
            onEnroll={onEnrollDirectly}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            isWishlisted={activeCourse ? wishlistCourseIds.includes(activeCourse.id) : false}
            onPreviewVideo={onPreviewVideo}
          />
        )}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute
            user={user}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            {withMainLayout(
              <ProfileScreen
                user={user!}
                onNavigate={handleNavigate}
                onUpdateUser={onUpdateUser}
                onToast={onToast}
              />,
              false
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            user={user}
            requiredRole="admin"
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            <AdminDashboardPage
              currentUser={user}
              onLogout={onLogout}
              onToast={onToast}
            />
          </ProtectedRoute>
        }
      />

      {/* ── FE:03 Instructor Course Management Routes ────────────────────── */}
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            {withMainLayout(<CourseManagementPage />)}
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
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            {withMainLayout(<CourseFormPage />)}
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
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            {withMainLayout(<CourseFormPage />)}
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
            onNavigate={handleNavigate}
            onToast={onToast}
          >
            {withMainLayout(<CourseLessonsPage />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/learn"
        element={<CourseLearningPage />}
      />
      <Route
        path="/instructor/courses/:id/learn"
        element={<CourseLearningPage />}
      />
      <Route
        path="/certificates/:certificateId"
        element={<CertificateScreen />}
      />
      <Route
        path="/verify-certificate"
        element={<CertificateVerifyScreen />}
      />
      <Route
        path="/login"
        element={
          <LoginScreen
            onNavigate={handleNavigate}
            onLoginSuccess={(userObj, token) => {
              onLoginSuccess(userObj, token);
              if (userObj.roleName === 'Admin' || userObj.role === 'admin') {
                navigate('/admin');
              } else if (userObj.roleName === 'Instructor' || userObj.role === 'instructor') {
                // Instructors go directly to their course management dashboard
                navigate('/instructor/courses');
              } else {
                navigate('/courses');
              }
            }}
            onToast={onToast}
          />
        }
      />
      <Route
        path="/register"
        element={
          <RegisterScreen
            onNavigate={handleNavigate}
            onRegisterSuccess={(userObj) => {
              onRegisterSuccess(userObj);
              navigate('/login');
            }}
            onToast={onToast}
          />
        }
      />
      <Route
        path="/forgot-password"
        element={
          <ForgotPasswordScreen
            onNavigate={handleNavigate}
            onToast={onToast}
          />
        }
      />
      <Route
        path="/reset-password"
        element={
          <ResetPasswordScreen
            onNavigate={handleNavigate}
            onToast={onToast}
          />
        }
      />
      <Route
        path="/instructor/quizzes/new"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onToast={onToast}
      >
      {withMainLayout(
        <CreateQuizPage />
      )}
    </ProtectedRoute>
  }
/>
      <Route
  path="/instructor/quizzes/:id/edit"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['instructor', 'admin']}
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onToast={onToast}
    >
      {withMainLayout(
        <UpdateQuizPage />
      )}
    </ProtectedRoute>
  }
/>
      <Route
  path="/quizzes/:quizId/take"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['student']}
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onToast={onToast}
    >
      {withMainLayout(
        <TakeQuizPage />
      )}
    </ProtectedRoute>
  }
/>  
    <Route
  path="/quizzes/:quizId/result/:attemptId"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['student']}
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onToast={onToast}
    >
      {withMainLayout(
        <QuizResultPage />
      )}
    </ProtectedRoute>
  }
/>
    <Route
  path="/instructor/quizzes/:id"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['instructor', 'admin']}
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onToast={onToast}
    >
      {withMainLayout(
        <QuizDetailPage />
      )}
    </ProtectedRoute>
  }
/>
  <Route
  path="/instructor/courses/:courseId/quizzes"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['instructor', 'admin']}
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onToast={onToast}
    >
      {withMainLayout(
        <QuizManagementPage />
      )}
    </ProtectedRoute>
  }
/>
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
