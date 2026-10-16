// =============================================================================
// InstructorLayout.tsx  —  Dedicated Layout Wrapper for Instructor Portal
// =============================================================================

import React from 'react';
import { InstructorSidebar } from '../InstructorSidebar';
import { InstructorTopbar } from '../InstructorTopbar';
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
}) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar */}
      <InstructorSidebar user={user} onLogout={onLogout} />

      {/* Right main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <InstructorTopbar user={user} onLogout={onLogout} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
