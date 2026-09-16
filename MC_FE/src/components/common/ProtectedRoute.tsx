import React from 'react';
import { Navigate } from 'react-router-dom';
import { ScreenType, User } from '../../types';
import { ToastType } from './Toast';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  user: User | null;
  currentScreen?: ScreenType;
  /**
   * Single required role (backward-compatible with existing usage).
   * For multiple roles, use allowedRoles instead.
   */
  requiredRole?: 'student' | 'instructor' | 'admin';
  /**
   * Array of allowed roles — use when a route should be accessible by
   * multiple roles (e.g. instructor dashboard accessible to both
   * 'instructor' and 'admin').
   * If both requiredRole and allowedRoles are provided, allowedRoles takes precedence.
   */
  allowedRoles?: Array<'student' | 'instructor' | 'admin'>;
  onNavigate?: (screen: ScreenType) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  requiredRole,
  allowedRoles,
  children,
}) => {
  const storedToken = useAuthStore.getState().token;
  const isAuthenticated = !!user && !!storedToken;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Determine the effective allowed roles list
  const effectiveRoles = allowedRoles ?? (requiredRole ? [requiredRole] : null);

  // If roles are specified and user doesn't have any of them → redirect home
  if (effectiveRoles && user?.role && !effectiveRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
