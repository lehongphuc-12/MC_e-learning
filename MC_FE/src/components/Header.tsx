import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  /* =========================
     CLICK OUTSIDE USER MENU
  ========================= */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /* =========================
     HEADER SCROLL EFFECT
  ========================= */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* =========================================================
          ANNOUNCEMENT BAR
      ========================================================== */}
      {isAnnouncementVisible && (
        <div
          id="top-announcement-bar"
          className="mseek-announcement relative z-50 overflow-hidden bg-[#031a43] text-white"
        >
          {/* animated background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="announcement-glow-left absolute -left-20 -top-16 h-32 w-72 rounded-full bg-blue-500/25 blur-[70px]" />

            <div className="announcement-glow-right absolute -right-10 -top-20 h-40 w-72 rounded-full bg-[#ffc928]/15 blur-[80px]" />

            <div className="announcement-wave absolute left-1/2 top-0 hidden h-full w-[360px] -translate-x-1/2 opacity-40 lg:block">
              <span className="wave-line wave-line-1" />
              <span className="wave-line wave-line-2" />
              <span className="wave-line wave-line-3" />
            </div>

            <span className="announcement-particle particle-one" />
            <span className="announcement-particle particle-two" />
            <span className="announcement-particle particle-three" />
          </div>

          <div className="relative mx-auto flex min-h-[38px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* LEFT */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#ffc928]/30 bg-[#ffc928]/10 px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-[#ffc928]" />

                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#ffd95e]">
                  MSEEK
                </span>
              </div>

              <div className="hidden items-center gap-2 text-[10px] font-semibold text-blue-100/85 sm:flex lg:text-[11px]">
                <span>Nâng tầm giọng nói</span>

                <span className="h-1 w-1 rounded-full bg-[#ffc928]" />

                <span>Tự tin làm chủ sân khấu</span>

                <span className="hidden h-1 w-1 rounded-full bg-[#ffc928] lg:block" />

                <span className="hidden font-black text-[#ffc928] lg:inline">
                  Bắt đầu hành trình cùng MSEEK
                </span>
              </div>

              <span className="truncate text-[9px] font-bold text-blue-100 sm:hidden">
                Luyện giọng chuyên nghiệp cùng MSEEK
              </span>
            </div>

            {/* RIGHT */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 text-[10px] font-semibold text-blue-100/80 xl:flex">
                <span className="announcement-live-dot" />
                Khóa học luyện giọng cho MC chuyên nghiệp
              </div>

              <button
                type="button"
                onClick={() => onNavigate('courses')}
                className="announcement-cta hidden items-center gap-1.5 rounded-full bg-[#ffc928] px-3 py-1.5 text-[9px] font-black text-[#082554] shadow-[0_5px_18px_rgba(255,201,40,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd950] sm:flex"
              >
                Khám phá ngay
                <ArrowRight className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setIsAnnouncementVisible(false)}
                title="Đóng"
                className="flex h-6 w-6 items-center justify-center rounded-full text-blue-100/60 transition-all duration-300 hover:rotate-90 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MAIN HEADER
      ========================================================== */}
      <header
        id="main-header"
        className={`sticky top-0 z-40 transition-all duration-500 ${
          isScrolled
            ? 'border-b border-blue-100/80 bg-white/90 shadow-[0_12px_40px_rgba(8,47,107,0.10)] backdrop-blur-2xl'
            : 'border-b border-slate-100 bg-white/95 shadow-[0_8px_30px_rgba(15,65,130,0.06)] backdrop-blur-xl'
        }`}
      >
        {/* TOP LIGHT */}
        <div className="header-top-light pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* BACKGROUND GLOW */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="header-glow absolute -left-20 -top-20 h-44 w-72 rounded-full bg-blue-400/[0.07] blur-[80px]" />

          <div className="header-glow-yellow absolute -right-16 -top-24 h-44 w-64 rounded-full bg-[#ffc928]/[0.06] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
  <div
    className={`flex items-center justify-between transition-all duration-500 ${
      isScrolled ? 'h-[58px]' : 'h-[64px]'
    }`}
  >
    {/* =====================================================
        LEFT: LOGO + NAV
    ====================================================== */}
    <div className="flex min-w-0 items-center gap-4 xl:gap-7">
      {/* LOGO */}
      <button
        id="brand-logo-btn"
        type="button"
        onClick={() => onNavigate('home')}
        className="logo-wrapper group relative flex shrink-0 items-center"
        aria-label="MSeek - Trang chủ"
      >
        {/* logo glow */}
        <div className="logo-glow pointer-events-none absolute inset-0 scale-75 rounded-full bg-cyan-400/25 opacity-0 blur-xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-100" />
        {/* animated stars */}
        <span className="logo-star logo-star-one" />
        <span className="logo-star logo-star-two" />

        {/* LOGO IMAGE */}
<div className="relative z-10 aspect-square overflow-hidden rounded-full border-2 border-white/90 bg-[#061a38] shadow-[0_5px_18px_rgba(8,37,84,0.18)] ring-1 ring-blue-100/80 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:scale-[1.04] group-hover:shadow-[0_8px_24px_rgba(8,37,84,0.25)]">
  <img
    src="/images/logo/mseekk-logo.png"
    alt="MSeek - Speak. Seek. Inspire."
    className={`block aspect-square w-auto rounded-full object-cover transition-all duration-500 group-hover:scale-[1.06] ${
      isScrolled ? 'h-[42px]' : 'h-[48px]'
    }`}
  />
</div>
      </button>

      {/* DESKTOP NAV */}
      <nav className="hidden items-center gap-1 lg:flex">
                {/* HOME */}
                <button
                  id="nav-home-btn"
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`nav-premium group relative flex items-center rounded-[13px] px-3.5 py-2.5 text-[12px] font-black transition-all duration-300 ${
                    currentScreen === 'home'
                      ? 'bg-blue-50 text-[#075dc7]'
                      : 'text-slate-600 hover:bg-blue-50/70 hover:text-[#075dc7]'
                  }`}
                >
                  Trang chủ

                  <span
                    className={`absolute -bottom-[1px] left-1/2 h-[2.5px] -translate-x-1/2 rounded-full bg-[#ffc928] transition-all duration-300 ${
                      currentScreen === 'home'
                        ? 'w-6'
                        : 'w-0 group-hover:w-5'
                    }`}
                  />
                </button>

                {/* COURSES */}
                <button
                  id="nav-courses-btn"
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className={`nav-premium group relative flex items-center rounded-[13px] px-3.5 py-2.5 text-[12px] font-black transition-all duration-300 ${
                    currentScreen === 'courses' ||
                    currentScreen === 'course-detail'
                      ? 'bg-blue-50 text-[#075dc7]'
                      : 'text-slate-600 hover:bg-blue-50/70 hover:text-[#075dc7]'
                  }`}
                >
                  Khóa học

                  <span
                    className={`absolute -bottom-[1px] left-1/2 h-[2.5px] -translate-x-1/2 rounded-full bg-[#ffc928] transition-all duration-300 ${
                      currentScreen === 'courses' ||
                      currentScreen === 'course-detail'
                        ? 'w-6'
                        : 'w-0 group-hover:w-5'
                    }`}
                  />
                </button>

                {/* FORUM */}
                <button
                  id="nav-forum-btn"
                  type="button"
                  onClick={() => onNavigate('forum')}
                  className={`nav-premium group relative flex items-center rounded-[13px] px-3.5 py-2.5 text-[12px] font-black transition-all duration-300 ${
                    currentScreen === 'forum'
                      ? 'bg-blue-50 text-[#075dc7]'
                      : 'text-slate-600 hover:bg-blue-50/70 hover:text-[#075dc7]'
                  }`}
                >
                  Diễn đàn

                  <span
                    className={`absolute -bottom-[1px] left-1/2 h-[2.5px] -translate-x-1/2 rounded-full bg-[#ffc928] transition-all duration-300 ${
                      currentScreen === 'forum'
                        ? 'w-6'
                        : 'w-0 group-hover:w-5'
                    }`}
                  />
                </button>

                {/* ADMIN */}
                {user?.role === 'admin' && (
                  <button
                    id="nav-admin-btn"
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className={`group flex items-center gap-1.5 rounded-[13px] px-3 py-2.5 text-[11px] font-black transition-all duration-300 ${
                      currentScreen === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </button>
                )}

                {/* INSTRUCTOR */}
                {user?.role === 'instructor' && (
                  <>
                    <button
                      id="nav-instructor-home-btn"
                      type="button"
                      onClick={() => navigate('/instructor')}
                      className="flex items-center gap-1.5 rounded-[13px] px-3 py-2.5 text-[11px] font-black text-blue-700 transition-all duration-300 hover:bg-blue-50"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Giảng viên
                    </button>

                    <button
                      id="nav-instructor-courses-btn"
                      type="button"
                      onClick={() => navigate('/instructor/courses')}
                      className="hidden items-center gap-1.5 rounded-[13px] px-3 py-2.5 text-[11px] font-black text-emerald-700 transition-all duration-300 hover:bg-emerald-50 xl:flex"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Khóa học của tôi
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* =====================================================
                CENTER: SEARCH
            ====================================================== */}
            <div className="mx-4 hidden min-w-[180px] max-w-[390px] flex-1 md:block xl:mx-7">
              <div className="search-premium group relative">
                {/* focus glow */}
                <div className="pointer-events-none absolute -inset-[1px] rounded-[16px] bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-cyan-400/0 opacity-0 blur-sm transition-opacity duration-500 group-focus-within:opacity-100" />

                <Search className="absolute left-4 top-1/2 z-10 h-[17px] w-[17px] -translate-y-1/2 text-slate-400 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-blue-600" />

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
                  placeholder="Tìm khóa học, giảng viên, chủ đề..."
                  className="relative w-full rounded-[16px] border border-slate-200/80 bg-[#f5f8fc]/95 py-[11px] pl-11 pr-12 text-[11px] font-semibold text-slate-700 outline-none transition-all duration-300 placeholder:font-medium placeholder:text-slate-400 hover:border-blue-200 hover:bg-white focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/[0.06]"
                />

                <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[8px] font-black text-slate-400 xl:flex">
                  ⌘K
                </div>
              </div>
            </div>

            {/* =====================================================
                RIGHT ACTIONS
            ====================================================== */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* WISHLIST */}
              <button
                id="header-wishlist-btn"
                type="button"
                onClick={() => onNavigate('courses')}
                title="Danh sách yêu thích"
                className="header-action group relative hidden h-[40px] w-[40px] items-center justify-center rounded-[13px] border border-slate-100 bg-slate-50/80 text-slate-500 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 hover:shadow-[0_8px_20px_rgba(244,63,94,0.10)] sm:flex"
              >
                <Heart className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />

                {wishlistCount > 0 && (
                  <span className="badge-pop absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[8px] font-black text-white shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* CART */}
              <button
                id="header-cart-btn"
                type="button"
                onClick={onOpenCart}
                title="Giỏ hàng"
                className="header-action group relative hidden h-[40px] w-[40px] items-center justify-center rounded-[13px] border border-slate-100 bg-slate-50/80 text-slate-500 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 hover:shadow-[0_8px_20px_rgba(37,99,235,0.10)] sm:flex"
              >
                <ShoppingBag className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />

                {cartCount > 0 && (
                  <span className="badge-pop absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[8px] font-black text-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* ===================================================
                  AUTH / USER
              ==================================================== */}
              {user ? (
                <div
                  ref={userMenuRef}
                  className="relative"
                >
                  <button
                    id="header-user-menu-btn"
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`group flex items-center gap-2 rounded-[14px] border px-1.5 py-1.5 pr-2.5 transition-all duration-300 ${
                      isUserMenuOpen
                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-8 w-8 rounded-[10px] object-cover ring-2 ring-white"
                      />

                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    <div className="hidden max-w-[105px] text-left xl:block">
                      <div className="truncate text-[10px] font-black text-slate-800">
                        {user.name}
                      </div>

                      <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-blue-500">
                        {user.role}
                      </div>
                    </div>

                    <ChevronDown
                      className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-300 sm:block ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* USER DROPDOWN */}
                  {isUserMenuOpen && (
                    <div
                      id="user-dropdown-menu"
                      className="user-dropdown absolute right-0 mt-3 w-[250px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 shadow-[0_25px_70px_rgba(15,43,82,0.18)] backdrop-blur-2xl"
                    >
                      {/* USER INFO */}
                      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-[#fff9e8] px-4 py-4">
                        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />

                        <div className="relative flex items-center gap-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-11 w-11 rounded-[14px] object-cover ring-2 ring-white shadow-md"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-black text-slate-900">
                              {user.name}
                            </p>

                            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-500">
                              {user.email}
                            </p>

                            <span className="mt-1.5 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-600">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        {/* ADMIN */}
                        {user.role === 'admin' && (
                          <button
                            id="dropdown-admin-btn"
                            type="button"
                            onClick={() => {
                              onNavigate('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-black text-purple-700 transition-colors hover:bg-purple-50"
                          >
                            <Shield className="h-4 w-4" />
                            Bảng quản trị Admin
                          </button>
                        )}

                        {/* INSTRUCTOR */}
                        {user.role === 'instructor' && (
                          <>
                            <button
                              id="dropdown-instructor-dashboard-btn"
                              type="button"
                              onClick={() => {
                                navigate('/instructor');
                                setIsUserMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-black text-blue-700 transition-colors hover:bg-blue-50"
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              Trang Giảng viên
                            </button>

                            <button
                              id="dropdown-instructor-courses-btn"
                              type="button"
                              onClick={() => {
                                navigate('/instructor/courses');
                                setIsUserMenuOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-black text-emerald-700 transition-colors hover:bg-emerald-50"
                            >
                              <BookOpen className="h-4 w-4" />
                              Quản lý khóa học của tôi
                            </button>
                          </>
                        )}

                        {/* PROFILE */}
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('profile');
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <UserCircle className="h-4 w-4" />
                          Trang cá nhân
                        </button>

                        {/* MY COURSES */}
                        {user.role === 'student' && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate('my-courses');
                              setIsUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <BookOpen className="h-4 w-4" />
                            Khóa học đã đăng ký
                          </button>
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        {/* LOGOUT */}
                        <button
                          type="button"
                          onClick={() => {
                            onLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* =================================================
                   GUEST AUTH BUTTONS
                ================================================== */
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    id="header-signin-btn"
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="rounded-[12px] px-3 py-2.5 text-[11px] font-black text-slate-600 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Đăng nhập
                  </button>

                  <button
                    id="header-register-btn"
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="register-button group relative flex items-center gap-2 overflow-hidden rounded-[13px] bg-[#ffc928] px-4 py-2.5 text-[11px] font-black text-[#092653] shadow-[0_8px_24px_rgba(255,201,40,0.30)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd64c] hover:shadow-[0_12px_32px_rgba(255,201,40,0.42)]"
                  >
                    <span className="register-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[40%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

                    <UserPlus className="relative z-10 h-3.5 w-3.5" />

                    <span className="relative z-10">
                      Đăng ký
                    </span>
                  </button>
                </div>
              )}

              {/* MOBILE MENU */}
              <button
                id="mobile-menu-toggle-btn"
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`flex h-10 w-10 items-center justify-center rounded-[13px] transition-all duration-300 lg:hidden ${
                  isMobileMenuOpen
                    ? 'rotate-90 bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            MOBILE DROPDOWN
        ========================================================== */}
        <div
          className={`mobile-menu-wrapper overflow-hidden border-t border-slate-100 bg-white/95 backdrop-blur-2xl transition-all duration-500 lg:hidden ${
            isMobileMenuOpen
              ? 'max-h-[720px] opacity-100'
              : 'pointer-events-none max-h-0 border-transparent opacity-0'
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {/* SEARCH MOBILE */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);

                  if (currentScreen !== 'courses') {
                    onNavigate('courses');
                  }
                }}
                placeholder="Tìm kiếm khóa học..."
                className="w-full rounded-[14px] border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-[11px] font-semibold outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/[0.06]"
              />
            </div>

            {/* NAVIGATION */}
            <div className="grid gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  closeMobileMenu();
                }}
                className={`mobile-nav-item ${
                  currentScreen === 'home'
                    ? 'mobile-nav-active'
                    : ''
                }`}
              >
                <span>Trang chủ</span>

                {currentScreen === 'home' && (
                  <span className="h-2 w-2 rounded-full bg-[#ffc928]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('courses');
                  closeMobileMenu();
                }}
                className={`mobile-nav-item ${
                  currentScreen === 'courses'
                    ? 'mobile-nav-active'
                    : ''
                }`}
              >
                <span>Khóa học</span>

                {currentScreen === 'courses' && (
                  <span className="h-2 w-2 rounded-full bg-[#ffc928]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('forum');
                  closeMobileMenu();
                }}
                className={`mobile-nav-item ${
                  currentScreen === 'forum'
                    ? 'mobile-nav-active'
                    : ''
                }`}
              >
                <span>Diễn đàn</span>

                {currentScreen === 'forum' && (
                  <span className="h-2 w-2 rounded-full bg-[#ffc928]" />
                )}
              </button>

              {/* ADMIN MOBILE */}
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('admin');
                    closeMobileMenu();
                  }}
                  className="flex items-center gap-2 rounded-[13px] bg-purple-50 px-4 py-3 text-left text-[11px] font-black text-purple-700"
                >
                  <Shield className="h-4 w-4" />
                  Bảng quản trị Admin
                </button>
              )}

              {/* INSTRUCTOR MOBILE */}
              {user?.role === 'instructor' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/instructor');
                      closeMobileMenu();
                    }}
                    className="flex items-center gap-2 rounded-[13px] bg-blue-50 px-4 py-3 text-left text-[11px] font-black text-blue-700"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Trang Giảng viên
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate('/instructor/courses');
                      closeMobileMenu();
                    }}
                    className="flex items-center gap-2 rounded-[13px] bg-emerald-50 px-4 py-3 text-left text-[11px] font-black text-emerald-700"
                  >
                    <BookOpen className="h-4 w-4" />
                    Quản lý khóa học
                  </button>
                </>
              )}

              {user?.role === 'student' && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('my-courses');
                    closeMobileMenu();
                  }}
                  className={`mobile-nav-item ${
                    currentScreen === 'my-courses'
                      ? 'mobile-nav-active'
                      : ''
                  }`}
                >
                  <span>Khóa học đã đăng ký</span>

                  {currentScreen === 'my-courses' && (
                    <span className="h-2 w-2 rounded-full bg-[#ffc928]" />
                  )}
                </button>
              )}
            </div>

            {/* MOBILE ACTIONS */}
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  onNavigate('courses');
                  closeMobileMenu();
                }}
                className="relative flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-rose-50 text-[10px] font-black text-rose-600"
              >
                <Heart className="h-4 w-4" />
                Yêu thích

                {wishlistCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] text-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenCart();
                  closeMobileMenu();
                }}
                className="relative flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-blue-50 text-[10px] font-black text-blue-600"
              >
                <ShoppingBag className="h-4 w-4" />
                Giỏ hàng

                {cartCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* GUEST MOBILE AUTH */}
            {!user && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('login');
                    closeMobileMenu();
                  }}
                  className="rounded-[13px] border border-slate-200 bg-white px-4 py-3 text-[10px] font-black text-slate-700"
                >
                  Đăng nhập
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('register');
                    closeMobileMenu();
                  }}
                  className="rounded-[13px] bg-[#ffc928] px-4 py-3 text-[10px] font-black text-[#082554]"
                >
                  Đăng ký ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            HEADER ANIMATIONS
        ========================================================== */}
        <style>{`
          /* ==============================
             ANNOUNCEMENT
          ============================== */

          @keyframes announcementGlowLeft {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
            }

            50% {
              transform: translate3d(90px, 0, 0) scale(1.15);
            }
          }

          @keyframes announcementGlowRight {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
            }

            50% {
              transform: translate3d(-80px, 10px, 0) scale(1.12);
            }
          }

          .announcement-glow-left {
            animation: announcementGlowLeft 10s ease-in-out infinite;
          }

          .announcement-glow-right {
            animation: announcementGlowRight 12s ease-in-out infinite;
          }

          /* ==============================
             SOUND WAVE
          ============================== */

          @keyframes soundWave {
            0%, 100% {
              transform: scaleY(0.35);
              opacity: 0.25;
            }

            50% {
              transform: scaleY(1);
              opacity: 0.8;
            }
          }

          .announcement-wave {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
          }

          .announcement-wave::before,
          .announcement-wave::after,
          .wave-line,
          .wave-line::before,
          .wave-line::after {
            content: '';
            display: block;
            width: 2px;
            border-radius: 999px;
            background: linear-gradient(
              to bottom,
              transparent,
              rgba(67, 184, 255, 0.85),
              transparent
            );
            transform-origin: center;
            animation: soundWave 1.5s ease-in-out infinite;
          }

          .announcement-wave::before {
            height: 13px;
            animation-delay: 0s;
          }

          .wave-line-1 {
            height: 22px;
            animation-delay: 0.15s;
          }

          .wave-line-1::before {
            height: 30px;
            animation-delay: 0.3s;
          }

          .wave-line-1::after {
            height: 16px;
            animation-delay: 0.45s;
          }

          .wave-line-2 {
            height: 28px;
            animation-delay: 0.6s;
          }

          .wave-line-2::before {
            height: 18px;
            animation-delay: 0.75s;
          }

          .wave-line-2::after {
            height: 34px;
            animation-delay: 0.9s;
          }

          .wave-line-3 {
            height: 20px;
            animation-delay: 1.05s;
          }

          .wave-line-3::before {
            height: 12px;
            animation-delay: 1.2s;
          }

          .wave-line-3::after {
            height: 26px;
            animation-delay: 1.35s;
          }

          .announcement-wave::after {
            height: 15px;
            animation-delay: 1.5s;
          }

          /* ==============================
             PARTICLES
          ============================== */

          @keyframes particleFloat {
            0%, 100% {
              transform: translate3d(0, 0, 0);
              opacity: 0.25;
            }

            50% {
              transform: translate3d(18px, -7px, 0);
              opacity: 0.9;
            }
          }

          .announcement-particle {
            position: absolute;
            width: 3px;
            height: 3px;
            border-radius: 999px;
            background: #ffc928;
            box-shadow: 0 0 10px rgba(255, 201, 40, 0.8);
            animation: particleFloat 4s ease-in-out infinite;
          }

          .particle-one {
            left: 18%;
            top: 9px;
          }

          .particle-two {
            left: 64%;
            bottom: 8px;
            animation-delay: 1.2s;
          }

          .particle-three {
            right: 11%;
            top: 10px;
            animation-delay: 2.1s;
          }

          /* ==============================
             LIVE DOT
          ============================== */

          @keyframes livePulse {
            0% {
              box-shadow: 0 0 0 0 rgba(255, 201, 40, 0.5);
            }

            70% {
              box-shadow: 0 0 0 7px rgba(255, 201, 40, 0);
            }

            100% {
              box-shadow: 0 0 0 0 rgba(255, 201, 40, 0);
            }
          }

          .announcement-live-dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: #ffc928;
            animation: livePulse 2s infinite;
          }

          /* ==============================
             CTA ANNOUNCEMENT
          ============================== */

          @keyframes announcementCTA {
            0%, 100% {
              box-shadow: 0 5px 18px rgba(255, 201, 40, 0.2);
            }

            50% {
              box-shadow: 0 7px 26px rgba(255, 201, 40, 0.38);
            }
          }

          .announcement-cta {
            animation: announcementCTA 3s ease-in-out infinite;
          }

          /* ==============================
             HEADER LIGHT
          ============================== */

          @keyframes headerLight {
            0% {
              transform: translateX(-100%) scaleX(0.3);
              opacity: 0;
            }

            35% {
              opacity: 1;
            }

            70% {
              opacity: 0.7;
            }

            100% {
              transform: translateX(100%) scaleX(0.3);
              opacity: 0;
            }
          }

          .header-top-light {
            animation: headerLight 8s ease-in-out infinite;
          }

          /* ==============================
             HEADER GLOWS
          ============================== */

          @keyframes headerGlow {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(80px, 10px, 0);
            }
          }

          @keyframes headerGlowYellow {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }

            50% {
              transform: translate3d(-70px, 10px, 0);
            }
          }

          .header-glow {
            animation: headerGlow 12s ease-in-out infinite;
          }

          .header-glow-yellow {
            animation: headerGlowYellow 14s ease-in-out infinite;
          }

          /* ==============================
             LOGO
          ============================== */

          @keyframes logoFloat {
            0%, 100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-2px);
            }
          }

          .logo-wrapper img {
            animation: logoFloat 4.5s ease-in-out infinite;
          }

          @keyframes logoStar {
            0%, 100% {
              opacity: 0;
              transform: scale(0.4) rotate(0deg);
            }

            50% {
              opacity: 1;
              transform: scale(1) rotate(180deg);
            }
          }

          .logo-star {
            position: absolute;
            z-index: 20;
            width: 5px;
            height: 5px;
            background: #ffc928;
            clip-path: polygon(
              50% 0%,
              61% 38%,
              100% 50%,
              61% 62%,
              50% 100%,
              39% 62%,
              0% 50%,
              39% 38%
            );
            pointer-events: none;
            animation: logoStar 3s ease-in-out infinite;
          }

          .logo-star-one {
            right: 7%;
            top: 15%;
          }

          .logo-star-two {
            left: 25%;
            bottom: 5%;
            animation-delay: 1.4s;
          }

          /* ==============================
             NAVIGATION
          ============================== */

          .nav-premium {
            position: relative;
          }

          .nav-premium::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 13px;
            background: linear-gradient(
              120deg,
              transparent,
              rgba(255, 255, 255, 0.75),
              transparent
            );
            transform: translateX(-120%);
            opacity: 0;
            transition:
              transform 0.6s ease,
              opacity 0.3s ease;
            pointer-events: none;
          }

          .nav-premium:hover::before {
            transform: translateX(120%);
            opacity: 1;
          }

          /* ==============================
             SEARCH
          ============================== */

          @keyframes searchGlow {
            0%, 100% {
              opacity: 0.2;
            }

            50% {
              opacity: 0.65;
            }
          }

          .search-premium:focus-within::after {
            content: '';
            position: absolute;
            inset: -2px;
            z-index: -1;
            border-radius: 18px;
            background: linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.12),
              rgba(34, 211, 238, 0.12),
              rgba(37, 99, 235, 0.12)
            );
            filter: blur(7px);
            animation: searchGlow 2.5s ease-in-out infinite;
          }

          /* ==============================
             ACTION BUTTONS
          ============================== */

          .header-action::after {
            content: '';
            position: absolute;
            inset: 50%;
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.8);
            opacity: 0;
            transition: all 0.35s ease;
          }

          .header-action:hover::after {
            inset: 0;
            opacity: 0.2;
          }

          /* ==============================
             BADGE
          ============================== */

          @keyframes badgePop {
            0% {
              transform: scale(0.5);
              opacity: 0;
            }

            60% {
              transform: scale(1.2);
            }

            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .badge-pop {
            animation: badgePop 0.45s
              cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          /* ==============================
             REGISTER BUTTON
          ============================== */

          @keyframes registerGlow {
            0%, 100% {
              box-shadow:
                0 8px 24px rgba(255, 201, 40, 0.25);
            }

            50% {
              box-shadow:
                0 10px 32px rgba(255, 201, 40, 0.45);
            }
          }

          .register-button {
            animation: registerGlow 3.2s ease-in-out infinite;
          }

          @keyframes registerShine {
            0% {
              left: -70%;
            }

            35%,
            100% {
              left: 150%;
            }
          }

          .register-shine {
            animation: registerShine 4s ease-in-out infinite;
          }

          /* ==============================
             USER DROPDOWN
          ============================== */

          @keyframes userDropdown {
            from {
              opacity: 0;
              transform: translate3d(0, -8px, 0) scale(0.97);
            }

            to {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          .user-dropdown {
            transform-origin: top right;
            animation: userDropdown 0.25s
              cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          /* ==============================
             MOBILE
          ============================== */

          .mobile-nav-item {
            display: flex;
            width: 100%;
            align-items: center;
            justify-content: space-between;
            border-radius: 13px;
            padding: 12px 14px;
            font-size: 11px;
            font-weight: 800;
            color: rgb(71 85 105);
            transition: all 0.3s ease;
          }

          .mobile-nav-item:hover {
            background: rgb(239 246 255);
            color: rgb(37 99 235);
            transform: translateX(3px);
          }

          .mobile-nav-active {
            background: linear-gradient(
              90deg,
              rgb(239 246 255),
              rgb(248 250 252)
            );
            color: rgb(37 99 235);
          }

          /* ==============================
             REDUCED MOTION
          ============================== */

          @media (prefers-reduced-motion: reduce) {
            .announcement-glow-left,
            .announcement-glow-right,
            .announcement-wave::before,
            .announcement-wave::after,
            .wave-line,
            .wave-line::before,
            .wave-line::after,
            .announcement-particle,
            .announcement-live-dot,
            .announcement-cta,
            .header-top-light,
            .header-glow,
            .header-glow-yellow,
            .logo-wrapper img,
            .logo-star,
            .register-button,
            .register-shine,
            .badge-pop,
            .user-dropdown {
              animation: none !important;
            }
          }
        `}</style>
      </header>
    </>
  );
};