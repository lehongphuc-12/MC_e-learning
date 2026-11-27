import React from 'react';
import { Route, useLocation, useNavigate } from 'react-router-dom';
import { ScreenType } from '../../types';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { ToastType } from '../../components/common/Toast';
import { getRoleHomePath, resolveUserRole } from './utils/authRole';

interface AuthRoutesProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess: (userObj: any, token: string) => void;
  onRegisterSuccess: (userObj: any) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const renderAuthRoutes = ({
  onNavigate,
  onLoginSuccess,
  onRegisterSuccess,
  onToast,
}: AuthRoutesProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Route
        path="/login"
        element={
          <LoginScreen
            onNavigate={onNavigate}
            onLoginSuccess={(userObj, token) => {
              onLoginSuccess(userObj, token);
              const returnTo = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
              const role = resolveUserRole(userObj);
              const returnPath = returnTo?.pathname ?? '';
              const isPath = (base: string) => returnPath === base || returnPath.startsWith(`${base}/`);
              const conflictsWithRole =
                (role === 'admin' && isPath('/instructor')) ||
                (role === 'instructor' && isPath('/admin')) ||
                (role === 'student' && (isPath('/admin') || isPath('/instructor')));
              if (returnTo?.pathname && !conflictsWithRole) {
                navigate({ pathname: returnTo.pathname, search: returnTo.search, hash: returnTo.hash }, { replace: true });
              } else {
                navigate(getRoleHomePath(role), { replace: true });
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
            onNavigate={onNavigate}
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
            onNavigate={onNavigate}
            onToast={onToast}
          />
        }
      />
      <Route
        path="/reset-password"
        element={
          <ResetPasswordScreen
            onNavigate={onNavigate}
            onToast={onToast}
          />
        }
      />
    </>
  );
};
