// =============================================================================
// InstructorTopbar.tsx  —  Slim Top Bar for Instructor Portal
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Mic2,
  PlusCircle,
  FileSpreadsheet,
  Eye,
  LogOut,
  UserCircle,
  ChevronDown,
  Bell,
} from 'lucide-react';
import { User } from '../types';

interface InstructorTopbarProps {
  user: User | null;
  onLogout: () => void;
}

const BREADCRUMB_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  '/instructor': { label: 'Tổng quan', icon: LayoutDashboard },
  '/instructor/dashboard': { label: 'Tổng quan', icon: LayoutDashboard },
  '/instructor/courses': { label: 'Quản lý khóa học', icon: BookOpen },
  '/instructor/speaking-submissions': { label: 'Chấm bài nói (Speaking)', icon: Mic2 },
  '/instructor/courses/new': { label: 'Tạo khóa học mới', icon: PlusCircle },
  '/instructor/import': { label: 'Nhập CSV / Excel', icon: FileSpreadsheet },
};

export const InstructorTopbar: React.FC<InstructorTopbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve breadcrumb
  const path = location.pathname;
  let breadcrumb = BREADCRUMB_MAP[path];
  if (!breadcrumb) {
    // Fuzzy match for nested routes
    for (const key of Object.keys(BREADCRUMB_MAP).sort((a, b) => b.length - a.length)) {
      if (path.startsWith(key) && key !== '/instructor') {
        breadcrumb = BREADCRUMB_MAP[key];
        break;
      }
    }
    if (!breadcrumb) breadcrumb = BREADCRUMB_MAP['/instructor'];
  }
  const BreadcrumbIcon = breadcrumb.icon;

  return (
    <header className="flex-shrink-0 h-16 bg-[#eef3ff] border-b border-blue-100 flex items-center justify-between px-5 shadow-sm z-30">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-xs font-semibold text-slate-400">Instructor Portal</span>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <BreadcrumbIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">{breadcrumb.label}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Student view shortcut */}
        <button
          onClick={() => navigate('/')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-semibold transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          <span>Giao diện Học viên</span>
        </button>

        {/* Notification bell (decorative) */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover ring-2 ring-blue-400/50"
              />
              <span className="text-[11px] font-bold text-slate-700 hidden sm:block">{user.name}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-fadeIn overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-800">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold border border-blue-100">
                    Giảng viên
                  </span>
                </div>

                <button
                  onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                >
                  <UserCircle className="w-3.5 h-3.5 text-indigo-400" />
                  Hồ sơ cá nhân
                </button>

                <button
                  onClick={() => { navigate('/'); setIsUserMenuOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  Giao diện Học viên
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
