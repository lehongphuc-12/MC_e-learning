import React from 'react';
import { Navigate } from 'react-router-dom';
import { ScreenType, User } from '../../types';
import { ToastType } from './Toast';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  user: User | null;
  currentScreen?: ScreenType;
  requiredRole?: 'student' | 'instructor' | 'admin';
  onNavigate?: (screen: ScreenType) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  requiredRole,
  children,
}) => {
  const storedToken = useAuthStore.getState().token;
  const isAuthenticated = !!user && !!storedToken;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

