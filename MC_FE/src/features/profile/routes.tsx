import React from 'react';
import { Route } from 'react-router-dom';
import { ScreenType, User } from '../../types';
import { ProfileScreen } from './components/ProfileScreen';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { ToastType } from '../../components/common/Toast';

interface ProfileRoutesProps {
  user: User | null;
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onUpdateUser?: (updatedUser: Partial<User>) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  withMainLayout: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
}

export const renderProfileRoutes = ({
  user,
  currentScreen,
  onNavigate,
  onUpdateUser,
  onToast,
  withMainLayout,
}: ProfileRoutesProps) => {
  return (
    <Route
      path="/profile"
      element={
        <ProtectedRoute
          user={user}
          currentScreen={currentScreen}
          onNavigate={onNavigate}
          onToast={onToast}
        >
          {withMainLayout(
            <ProfileScreen
              user={user!}
              onNavigate={onNavigate}
              onUpdateUser={onUpdateUser}
              onToast={onToast}
            />,
            false
          )}
        </ProtectedRoute>
      }
    />
  );
};
