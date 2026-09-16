import React, { useEffect } from 'react';
import { ScreenType, User } from '../../types';
import { ToastType } from './Toast';

interface ProtectedRouteProps {
  user: User | null;
  currentScreen: ScreenType;
  requiredRole?: 'student' | 'instructor' | 'admin';
  onNavigate: (screen: ScreenType) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  requiredRole,
  onNavigate,
  onToast,
  children,
}) => {
  const isAuthenticated = !!user || !!localStorage.getItem('token');

  useEffect(() => {
    if (!isAuthenticated) {
      onToast?.('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để truy cập trang này.', 'error');
      onNavigate('login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      onToast?.('Truy cập bị từ chối', 'Bạn không có quyền truy cập vào khu vực này.', 'error');
      onNavigate('home');
    }
  }, [isAuthenticated, user, requiredRole, onNavigate, onToast]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
