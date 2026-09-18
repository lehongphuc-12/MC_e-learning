import React from 'react';
import { Route } from 'react-router-dom';
import { ScreenType, User } from '../../types';
import { CreateQuizPage } from './pages/CreateQuizPage';
import { UpdateQuizPage } from './pages/UpdateQuizPage';
import { TakeQuizPage } from './pages/TakeQuizPage';
import { QuizResultPage } from './pages/QuizResultPage';
import { QuizDetailPage } from './pages/QuizDetailPage';
import { QuizManagementPage } from './pages/QuizManagementPage';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { ToastType } from '../../components/common/Toast';

interface QuizRoutesProps {
  onNavigate: (screen: ScreenType) => void;
  withMainLayout: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  withInstructorLayout?: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  user: User | null;
  currentScreen: ScreenType;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const renderQuizRoutes = ({
  onNavigate,
  withMainLayout,
  withInstructorLayout = withMainLayout,
  user,
  currentScreen,
  onToast,
}: QuizRoutesProps) => {
  return (
    <>
      {/* Instructor Quiz Management Routes */}
      <Route
        path="/instructor/quizzes/new"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['instructor', 'admin']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<CreateQuizPage />)}
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
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<UpdateQuizPage />)}
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
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<QuizDetailPage />)}
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
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withInstructorLayout(<QuizManagementPage />)}
          </ProtectedRoute>
        }
      />

      {/* Student Quiz Routes */}
      <Route
        path="/quizzes/:quizId/take"
        element={
          <ProtectedRoute
            user={user}
            allowedRoles={['student']}
            currentScreen={currentScreen}
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withMainLayout(<TakeQuizPage />)}
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
            onNavigate={onNavigate}
            onToast={onToast}
          >
            {withMainLayout(<QuizResultPage />)}
          </ProtectedRoute>
        }
      />
    </>
  );
};
