// =============================================================================
// InstructorSidebar.tsx  —  Left Sidebar Navigation for Instructor Portal
// =============================================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Eye,
  LogOut,
  Mic2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { User } from '../types';

interface InstructorSidebarProps {
  user: User | null;
  onLogout: () => void;
}

const NAV_ITEMS = [
  {
    label: 'Tổng quan',
    icon: LayoutDashboard,
    path: '/instructor',
    exact: true,
    color: 'text-blue-400',
  },
  {
    label: 'Quản lý khóa học',
    icon: BookOpen,
    path: '/instructor/courses',
    exact: false,
    color: 'text-emerald-400',
  },
  {
    label: 'Chấm bài nói',
    icon: Mic2,
    path: '/instructor/speaking-submissions',
    exact: false,
    color: 'text-cyan-400',
  },
  {
    label: 'Tạo khóa học mới',
    icon: PlusCircle,
    path: '/instructor/courses/new',
    exact: true,
    color: 'text-violet-400',
  },
];

const DURATION = 300; // ms — must match CSS transition duration

export const InstructorSidebar: React.FC<InstructorSidebarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.path === '/instructor') {
      return location.pathname === '/instructor' || location.pathname === '/instructor/dashboard';
    }
    if (item.path === '/instructor/courses') {
      return location.pathname.startsWith('/instructor/courses') && location.pathname !== '/instructor/courses/new';
    }
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  // Shared label style: fade + clip smoothly with the sidebar width transition
  // Collapsing: opacity fades quickly (0ms delay), then max-width clips (80ms delay)
  // Expanding:  max-width opens immediately (0ms delay), opacity fades in after (180ms delay)
  const labelStyle: React.CSSProperties = {
    opacity: collapsed ? 0 : 1,
    maxWidth: collapsed ? '0px' : '160px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    // property order: opacity, max-width
    transition: collapsed
      ? `opacity ${DURATION}ms ease, max-width ${DURATION}ms ease`
      : `max-width ${DURATION}ms cubic-bezier(0.4,0,0.2,1) 0ms, opacity 150ms ease 180ms`,
  };

  const sectionLabelStyle: React.CSSProperties = {
    opacity: collapsed ? 0 : 1,
    maxHeight: collapsed ? '0px' : '24px',
    overflow: 'hidden',
    transition: collapsed
      ? `opacity ${DURATION}ms ease, max-height ${DURATION}ms ease`
      : `max-height ${DURATION}ms ease 0ms, opacity 150ms ease 180ms`,
  };

  return (
    // Wrapper: relative so the toggle button can escape sidebar bounds
    <div
      className="relative flex-shrink-0 h-screen"
      style={{
        width: collapsed ? '72px' : '240px',
        transition: `width ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      {/* Collapse toggle button — sits OUTSIDE aside so overflow:hidden won't clip it */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          right: '-14px',
          top: '76px',
          zIndex: 50,
          transition: `transform ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
        className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-colors shadow-lg"
      >
        <ChevronLeft
          className="w-3.5 h-3.5 transition-transform duration-300"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Sidebar panel */}
      <aside className="instructor-sidebar absolute inset-0 flex flex-col overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#080f1e]" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 via-transparent to-indigo-950/30" />
        <div className="absolute -top-20 -left-10 w-48 h-48 rounded-full bg-blue-600/10 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-20 -right-10 w-40 h-40 rounded-full bg-indigo-600/10 blur-[50px] pointer-events-none" />
        {/* Right border */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-700/60 to-transparent" />

        <div className="relative z-10 flex flex-col h-full">

          {/* Logo area */}
          <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0 border-b border-slate-800/60 overflow-hidden">
            <button
              onClick={() => navigate('/instructor')}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform"
            >
              <Mic2 className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0" style={labelStyle}>
              <div className="text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                MSEEK
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-400/20">
                  GV
                </span>
              </div>
              <div className="text-[9px] font-medium text-slate-500 tracking-widest uppercase mt-0.5">
                Instructor Portal
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {/* Section label */}
            <div className="px-2 mb-3" style={sectionLabelStyle}>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                Điều hướng
              </span>
            </div>

            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`
                    w-full flex items-center rounded-xl group relative overflow-visible
                    transition-colors duration-200
                    ${active
                      ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/80 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }
                  `}
                  style={{
                    padding: collapsed ? '10px 0' : '10px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? '0' : '12px',
                    transition: `padding ${DURATION}ms ease, justify-content ${DURATION}ms ease`,
                  }}
                >
                  {/* Active left indicator */}
                  {active && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full opacity-70" style={{ marginLeft: '-8px' }} />
                  )}

                  <Icon
                    className={`flex-shrink-0 transition-transform duration-200 w-[18px] h-[18px] ${
                      active ? 'text-white' : item.color + ' group-hover:scale-110'
                    }`}
                  />

                  {/* Label — always mounted, fades with sidebar */}
                  <span
                    className="text-[12px] font-semibold leading-none"
                    style={labelStyle}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User info + Logout */}
          <div className="border-t border-slate-800/60 px-2 py-3 space-y-1">
            {user && (
              <button
                onClick={() => navigate('/profile')}
                title={collapsed ? user.name : undefined}
                className="w-full flex items-center rounded-xl px-3 py-2.5 hover:bg-slate-800/70 transition-colors group relative overflow-hidden"
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: '12px',
                  transition: `justify-content ${DURATION}ms ease`,
                }}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/50 flex-shrink-0"
                />
                <div className="min-w-0 text-left" style={labelStyle}>
                  <div className="text-[11px] font-bold text-white truncate">{user.name}</div>
                  <div className="text-[10px] text-blue-400 font-semibold">Giảng viên</div>
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    {user.name}
                  </div>
                )}
              </button>
            )}

            <button
              onClick={onLogout}
              title={collapsed ? 'Đăng xuất' : undefined}
              className="w-full flex items-center rounded-xl px-3 py-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group relative"
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '12px',
                transition: `justify-content ${DURATION}ms ease`,
              }}
            >
              <LogOut className="w-[17px] h-[17px] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[12px] font-semibold" style={labelStyle}>
                Đăng xuất
              </span>
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  Đăng xuất
                </div>
              )}
            </button>
          </div>

        </div>
      </aside>
    </div>
  );
};
