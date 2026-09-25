// =============================================================================
// InstructorHeader.tsx  —  Dedicated Header for Instructor Portal
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Eye,
  LogOut,
  UserCircle,
  ChevronDown,
  Mic2,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { User } from '../types';

interface InstructorHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const InstructorHeader: React.FC<InstructorHeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentPath = location.pathname;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/instructor')}
              className="flex items-center gap-3 group cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white leading-none flex items-center gap-1.5">
                  MSEEK
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                    Giảng Viên
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                  Instructor Portal
                </div>
              </div>
            </button>

            {/* Desktop Navigation Links (Only Instructor specific) */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/instructor')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  currentPath === '/instructor' || currentPath === '/instructor/dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan</span>
              </button>

              <button
                onClick={() => navigate('/instructor/courses')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  currentPath === '/instructor/courses' || currentPath.includes('/lessons')
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Quản lý khóa học</span>
              </button>

              <button
                onClick={() => navigate('/instructor/courses/new')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  currentPath === '/instructor/courses/new'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <span>Tạo khóa học mới</span>
              </button>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Student View Shortcut */}
            <button
              onClick={() => navigate('/')}
              title="Xem giao diện học viên công khai"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Giao diện Học viên</span>
            </button>

            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-all cursor-pointer"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
                    <div className="text-[10px] text-blue-400 font-semibold">Giảng viên</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 text-slate-200 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        navigate('/instructor');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-blue-400" />
                      <span>Trang Bảng điều khiển</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/instructor/courses');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>Quản lý Khóa học</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserCircle className="w-4 h-4 text-indigo-400" />
                      <span>Hồ sơ cá nhân</span>
                    </button>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
          <button
            onClick={() => {
              navigate('/instructor');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 bg-blue-600 text-white"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Bảng điều khiển Giảng viên</span>
          </button>
          <button
            onClick={() => {
              navigate('/instructor/courses');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 bg-slate-800 text-slate-200"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Quản lý Khóa học</span>
          </button>
          <button
            onClick={() => {
              navigate('/instructor/courses/new');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 bg-slate-800 text-slate-200"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>Tạo khóa học mới</span>
          </button>
          <button
            onClick={() => {
              navigate('/');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 bg-slate-800 text-slate-300"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Xem giao diện Học viên</span>
          </button>
        </div>
      )}
    </header>
  );
};
