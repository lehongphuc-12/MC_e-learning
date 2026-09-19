// =============================================================================
// InstructorLayout.tsx  —  Dedicated Layout Wrapper for Instructor Portal
// =============================================================================

import React from 'react';
import { InstructorHeader } from '../InstructorHeader';
import { Footer } from '../Footer';
import { ScreenType, User } from '../../types';

interface InstructorLayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigate?: (screen: ScreenType) => void;
  showFooter?: boolean;
}

export const InstructorLayout: React.FC<InstructorLayoutProps> = ({
  children,
  user,
  onLogout,
  onNavigate,
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <InstructorHeader user={user} onLogout={onLogout} />
      <main className="flex-1">{children}</main>
      {showFooter && onNavigate && <Footer onNavigate={onNavigate} />}
    </div>
  );
};
