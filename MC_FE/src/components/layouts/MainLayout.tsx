import React from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { ScreenType, User, Course } from '../../types';

interface MainLayoutProps {
  children: React.ReactNode;
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  user: User | null;
  onLogout: () => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onSelectCourse: (course: Course) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFooter?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentScreen,
  onNavigate,
  user,
  onLogout,
  cartCount,
  wishlistCount,
  onOpenCart,
  onSelectCourse,
  searchQuery,
  onSearchChange,
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <Header
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onOpenCart={onOpenCart}
        onSelectCourse={onSelectCourse}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer onNavigate={onNavigate} />}
    </div>
  );
};
