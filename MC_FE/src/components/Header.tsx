import {
  BookOpen,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Mic2,
  Search,
  ShoppingBag,
  Sparkles,
  UserPlus,
  X
} from 'lucide-react';
import React, { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
      <div id="top-announcement-bar" className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 font-semibold border border-blue-500/40 text-[10px] uppercase tracking-wider">
              NEW RELEASE
            </span>
            <span className="hidden sm:inline">2026 Masterclass with Jonathan Sterling: The Elegant Wedding MC</span>
            <span className="sm:hidden">2026 Wedding MC Masterclass Live</span>
          </div>

          {/* Direct Screen Jumper Pill */}
          <div className="relative">
            {/* <button
              id="screens-dropdown-btn"s
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
        </div>
      </div>

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
                  Home
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
                  Courses
                </button>
                <button
                  id="nav-detail-btn"
                  onClick={() => onNavigate('course-detail')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentScreen === 'course-detail'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Course Detail
                </button>
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
                  placeholder="Search masterclasses, MCing..."
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
                title="Your Saved Wishlist"
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
                title="View Shopping Cart"
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
                <div className="relative">
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
                      <button
                        onClick={() => {
                          onNavigate('courses');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Explore Courses</span>
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('course-detail');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Featured Masterclass</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => {
                          onLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
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
                    Sign In
                  </button>
                  <button
                    id="header-register-btn"
                    onClick={() => onNavigate('register')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
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
                placeholder="Search courses..."
                className="w-full pl-3 pr-3 py-2 text-xs bg-slate-100 rounded-lg"
              />
            </div>
            {screensList.map((screen) => (
              <button
                key={screen.id}
                onClick={() => {
                  onNavigate(screen.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
                  currentScreen === screen.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                }`}
              >
                <span>{screen.icon}</span>
                <span>{screen.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>
    </>
  );
};
