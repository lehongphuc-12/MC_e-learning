import React from 'react';
import { Route, useNavigate } from 'react-router-dom';
import { ScreenType } from '../../types';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { ToastType } from '../../components/common/Toast';

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

  return (
    <>
      <Route
        path="/login"
        element={
          <LoginScreen
            onNavigate={onNavigate}
            onLoginSuccess={(userObj, token) => {
              onLoginSuccess(userObj, token);
              if (userObj.roleName === 'Admin' || userObj.role === 'admin') {
                navigate('/admin');
              } else if (userObj.roleName === 'Instructor' || userObj.role === 'instructor') {
                navigate('/instructor');
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
