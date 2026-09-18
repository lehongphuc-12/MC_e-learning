import React from 'react';
import { Route } from 'react-router-dom';
import { ScreenType, User } from '../../types';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { ToastType } from '../../components/common/Toast';

interface AdminRoutesProps {
  user: User | null;
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onLogout: () => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const renderAdminRoutes = ({
  user,
  currentScreen,
  onNavigate,
  onLogout,
  onToast,
}: AdminRoutesProps) => {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedRoute
          user={user}
          requiredRole="admin"
          currentScreen={currentScreen}
          onNavigate={onNavigate}
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
  );
};
