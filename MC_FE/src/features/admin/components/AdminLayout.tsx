import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderTree,
  DollarSign,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Home,
  Mic2,
} from 'lucide-react';
import { AdminTabType } from '../types/adminTypes';
import { User } from '../../../types';

interface AdminLayoutProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  currentUser: User | null;
  onNavigateHome: () => void;
  onLogout: () => void;
  pendingApprovalsCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onNavigateHome,
  onLogout,
  pendingApprovalsCount = 0,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    {
      id: 'overview' as AdminTabType,
      label: 'Tổng Quan',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'users' as AdminTabType,
      label: 'Người Dùng',
      icon: Users,
      badge: null,
    },
    {
      id: 'courses' as AdminTabType,
      label: 'Khóa Học',
      icon: BookOpen,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'categories' as AdminTabType,
      label: 'Danh Mục',
      icon: FolderTree,
      badge: null,
    },
    {
      id: 'financials' as AdminTabType,
      label: 'Tài Chính & Payout',
      icon: DollarSign,
      badge: null,
    },
    {
      id: 'settings' as AdminTabType,
      label: 'Cấu Hình Hệ Thống',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Top Header Navigation */}
      <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
        {/* Brand & Toggle Sidebar */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Sidebar"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <Mic2 className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xl font-black tracking-tight text-white leading-none flex items-center gap-1">
                MSEEK
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                <span className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-wider uppercase">
                  ADMIN HUB
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">Master The Art</div>
            </div>
          </div>
        </div>

        {/* Global Admin Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full relative mx-4">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm nhanh học viên, giảng viên, khóa học hoặc mã đơn..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition"
          />
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Back to Client Site */}
          <button
            onClick={onNavigateHome}
            className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50 transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-blue-400" />
            <span>Trang Chủ Học Viên</span>
          </button>

          {/* Notifications button */}
          <div className="relative">
            <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 relative transition cursor-pointer">
              <Bell className="w-5 h-5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
            <img
              src={
                currentUser?.avatar ||
                'https://ui-avatars.com/api/?name=Admin&background=2563eb&color=fff'
              }
              alt={currentUser?.name || 'Admin'}
              className="w-8 h-8 rounded-full border border-blue-500/30 object-cover"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                {currentUser?.name || 'Quản trị viên'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {currentUser?.email || 'admin@mseek.edu.vn'}
              </p>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } border-r border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col justify-between transition-all duration-200 shrink-0`}
        >
          <div className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {!sidebarCollapsed && 'Danh mục quản trị'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>

                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Badge */}
          {!sidebarCollapsed && (
            <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>Quyền Hạn Cao Nhất</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Đang vận hành hệ thống ở chế độ Admin Bảo Mật. mọi thao tác được ghi log.
              </p>
            </div>
          )}
        </aside>

        {/* Content Region */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
