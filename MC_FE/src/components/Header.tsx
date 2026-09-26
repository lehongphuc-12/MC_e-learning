import {
  BookOpen,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  UserCircle,
  UserPlus,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, ScreenType, User } from '../types';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  user: User | null;
  onLogout: () => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onSelectCourse: (course: Course) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  user,
  onLogout,
  cartCount,
  wishlistCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);

  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const screensList: { id: ScreenType; label: string; desc: string; icon: string }[] = [
    { id: 'home', label: '1. Home / Landing', desc: 'Hero, Categories, Instructors, Pricing', icon: '🏠' },
    { id: 'courses', label: '2. Course Catalog', desc: 'Full Filters, Search & Course Grid', icon: '📚' },
    { id: 'course-detail', label: '3. Course Detail', desc: 'Wedding MC, Curriculum, Video Preview', icon: '✨' },
    { id: 'login', label: '4. Login Page', desc: 'Cinematic Split Authentication', icon: '🔑' },
    { id: 'register', label: '5. Register Page', desc: 'Modern High-Tech Classroom Onboarding', icon: '🚀' },
  ];

  return (
    <>
      {/* Top Announcement Bar */}
      {isAnnouncementVisible && (
        <div id="top-announcement-bar" className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 font-semibold border border-blue-500/40 text-[10px] uppercase tracking-wider">
                NEW RELEASE
              </span>
              <span className="hidden sm:inline">2026 Masterclass with Jonathan Sterling: The Elegant Wedding MC</span>
              <span className="sm:hidden">2026 Wedding MC Masterclass Live</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Direct Screen Jumper Pill */}
              <div className="relative">
                {/* <button
                  id="screens-dropdown-btn"
                  onClick={() => setIsScreenMenuOpen(!isScreenMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 rounded-md border border-blue-700/50 font-semibold text-[11px] transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Switch Screen ({currentScreen})</span>
                  <ChevronDown className="w-3 h-3 text-blue-300" />
                </button> */}

                {isScreenMenuOpen && (
                  <div 
                    id="screens-dropdown-menu"
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50 animate-fadeIn"
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Screen to Preview
                    </div>
                    {screensList.map((screen) => (
                      <button
                        key={screen.id}
                        id={`jump-to-${screen.id}`}
                        onClick={() => {
                          onNavigate(screen.id);
                          setIsScreenMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-blue-50 transition-colors cursor-pointer ${
                          currentScreen === screen.id ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        <span className="text-base">{screen.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold">{screen.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{screen.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsAnnouncementVisible(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                title="Close Announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <button
                id="brand-logo-btn"
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2.5 group cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tight text-slate-900 leading-none flex items-center gap-1">
                    MSEEK
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Master The Art</div>
                </div>
              </button>

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-1">
                <button
                  id="nav-home-btn"
                  onClick={() => onNavigate('home')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentScreen === 'home'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Trang chủ
                </button>
                <button
                  id="nav-courses-btn"
                  onClick={() => onNavigate('courses')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentScreen === 'courses' || currentScreen === 'course-detail'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Khóa học
                </button>
                <button
                  id="nav-forum-btn"
                  onClick={() => onNavigate('forum')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentScreen === 'forum'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Diễn đàn
                </button>
                {user?.role === 'admin' && (
                  <button
                    id="nav-admin-btn"
                    onClick={() => onNavigate('admin')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      currentScreen === 'admin'
                        ? 'text-purple-700 bg-purple-100 font-extrabold ring-1 ring-purple-300'
                        : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Bảng quản trị Admin</span>
                  </button>
                )}
                {user?.role === 'instructor' && (
                  <>
                    <button
                      id="nav-instructor-home-btn"
                      onClick={() => navigate('/instructor')}
                      className="px-3.5 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                    >
                      <LayoutDashboard className="w-4 h-4 text-blue-600" />
                      <span>Trang Giảng viên</span>
                    </button>
                    <button
                      id="nav-instructor-courses-btn"
                      onClick={() => navigate('/instructor/courses')}
                      className="px-3.5 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span>Quản lý khóa học</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Center Search Bar (Desktop) */}
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
              <div className="relative w-full">
                <input
                  id="header-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (currentScreen !== 'courses') {
                      onNavigate('courses');
                    }
                  }}
                  placeholder="Tìm kiếm khóa học, MC..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100/90 focus:bg-white rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-3">
              {/* Wishlist */}
              <button
                id="header-wishlist-btn"
                onClick={() => onNavigate('courses')}
                title="Danh sách yêu thích"
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart Button */}
              <button
                id="header-cart-btn"
                onClick={onOpenCart}
                title="Giỏ hàng"
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Profile / Auth Action */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    id="header-user-menu-btn"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/60 rounded-full border border-slate-200 transition-all cursor-pointer"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500"
                    />
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                      <div className="text-[10px] text-blue-600 font-semibold uppercase">{user.role}</div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {isUserMenuOpen && (
                    <div 
                      id="user-dropdown-menu"
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fadeIn"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                      {user.role === 'admin' && (
                        <button
                          id="dropdown-admin-btn"
                          onClick={() => {
                            onNavigate('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50/80 hover:bg-purple-100 flex items-center gap-2 cursor-pointer border-b border-purple-100"
                        >
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span>Bảng quản trị Admin</span>
                        </button>
                      )}
                      {user.role === 'instructor' && (
                        <>
                          <button
                            id="dropdown-instructor-dashboard-btn"
                            onClick={() => {
                              navigate('/instructor');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 flex items-center gap-2 cursor-pointer border-b border-blue-100"
                          >
                            <LayoutDashboard className="w-4 h-4 text-blue-600" />
                            <span>Trang Giảng viên</span>
                          </button>
                          <button
                            id="dropdown-instructor-courses-btn"
                            onClick={() => {
                              navigate('/instructor/courses');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 flex items-center gap-2 cursor-pointer border-b border-emerald-100"
                          >
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                            <span>Quản lý Khóa học của tôi</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                      >
                        <UserCircle className="w-4 h-4" />
                        <span>Trang cá nhân</span>
                      </button>
                      {user.role === 'student' && (
                        <button
                          onClick={() => {
                            onNavigate('my-courses');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Khóa học đã đăng ký</span>
                        </button>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => {
                          onLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    id="header-signin-btn"
                    onClick={() => onNavigate('login')}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                  <button
                    id="header-register-btn"
                    onClick={() => onNavigate('register')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký</span>
                  </button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div id="mobile-nav-panel" className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kiếm khóa học..."
                className="w-full pl-3 pr-3 py-2 text-xs bg-slate-100 rounded-lg"
              />
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 bg-purple-50 text-purple-700 border border-purple-200"
              >
                <span>🛡️</span>
                <span>Bảng quản trị Admin</span>
              </button>
            )}
            {user?.role === 'instructor' && (
              <>
                <button
                  id="mobile-instructor-dashboard-btn"
                  onClick={() => {
                    navigate('/instructor');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 bg-blue-50 text-blue-700 border border-blue-200"
                >
                  <span>📊</span>
                  <span>Trang Giảng viên</span>
                </button>
                <button
                  id="mobile-instructor-courses-btn"
                  onClick={() => {
                    navigate('/instructor/courses');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <span>📚</span>
                  <span>Quản lý Khóa học của tôi</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                onNavigate('home');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentScreen === 'home' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span>🏠</span>
              <span>Trang chủ</span>
            </button>
            <button
              onClick={() => {
                onNavigate('courses');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentScreen === 'courses' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span>📚</span>
              <span>Khóa học</span>
            </button>
            <button
              onClick={() => {
                onNavigate('forum');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                currentScreen === 'forum' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span>💬</span>
              <span>Diễn đàn</span>
            </button>
            {user?.role === 'student' && (
              <button
                onClick={() => {
                  onNavigate('my-courses');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                  currentScreen === 'my-courses' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                }`}
              >
                <span>🎓</span>
                <span>Khóa học đã đăng ký</span>
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
};
