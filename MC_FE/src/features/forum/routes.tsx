import React from 'react';
import { Route } from 'react-router-dom';
import { User } from '../../types';
import { ForumListPage } from './pages/ForumListPage';
import { ForumDetailPage } from './pages/ForumDetailPage';
import { ToastType } from '../../components/common/Toast';

interface ForumRoutesProps {
  withMainLayout: (component: React.ReactNode, showFooter?: boolean) => React.ReactNode;
  user: User | null;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const renderForumRoutes = ({
  withMainLayout,
  user,
  onToast,
}: ForumRoutesProps) => {
  return (
    <>
      <Route
        path="/forum"
        element={withMainLayout(<ForumListPage user={user} onToast={onToast} />)}
      />
      <Route
        path="/forum/posts/:id"
        element={withMainLayout(<ForumDetailPage user={user} onToast={onToast} />)}
      />
    </>
  );
};
