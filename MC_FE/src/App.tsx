import React, { useState, useEffect } from 'react';
import { ScreenType, Course, User } from './types';
import { mockCourses } from './data/mockData';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { CartDrawer } from './components/modals/CartDrawer';
import { Toast } from './components/common/Toast';
import { authApi } from './features/auth/api/authApi';
import { useAppStore } from './hooks/useAppStore';
import { useAuth } from './hooks/useAuth';
import { AppRouter } from './components/AppRouter';

const getDefaultAvatar = (name: string) => {
  const parts = name.trim().split(/\s+/);
  let initials = '';
  if (parts.length > 1) {
    initials = (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
  } else if (parts.length === 1 && parts[0]) {
    initials = parts[0].slice(0, 2);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials.toUpperCase())}&background=2563eb&color=fff&bold=true`;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(mockCourses[0]);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { user, setAuth, updateUser, logout: authLogout } = useAuth();
  const store = useAppStore();

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const result = await authApi.getMe(token);
        if (result.success) {
          const userObj = result.data;
          const mappedRole = 
            userObj.roleName === 'Learner' ? 'student' :
            userObj.roleName === 'Instructor' ? 'instructor' :
            userObj.roleName === 'Admin' ? 'admin' : 'student';

          setAuth(
            {
              id: userObj.userId.toString(),
              name: userObj.fullName,
              email: userObj.email,
              avatar: userObj.avatarUrl || getDefaultAvatar(userObj.fullName),
              role: mappedRole,
              isGoogleLogin: userObj.isGoogleLogin ?? false
            },
            token
          );
        } else {
          authLogout();
        }
      } catch (err) {
        authLogout();
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchMe();
  }, [setAuth, authLogout]);

  // Listen to path changes (HTML5 History API) to set active screen
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname;
      const search = window.location.search;

      if (pathname.startsWith('/courses')) {
        setCurrentScreen('courses');
      } else if (pathname.startsWith('/course-detail')) {
        const params = new URLSearchParams(search);
        const courseId = params.get('id');
        if (courseId) {
          const found = mockCourses.find((c) => c.id === courseId);
          if (found) {
            setSelectedCourse(found);
          }
        }
        setCurrentScreen('course-detail');
      } else if (pathname === '/profile') {
        setCurrentScreen('profile');
      } else if (pathname === '/login') {
        setCurrentScreen('login');
      } else if (pathname === '/register') {
        setCurrentScreen('register');
      } else if (pathname === '/forgot-password') {
        setCurrentScreen('forgot-password');
      } else if (pathname === '/reset-password') {
        setCurrentScreen('reset-password');
      } else {
        setCurrentScreen('home');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange(); // Run once on startup

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleNavigate = (screen: ScreenType) => {
    const targetPath = screen === 'home' ? '/' : `/${screen}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleSelectCourse = (course: Course) => {
    const targetPath = `/course-detail?id=${course.id}`;
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new Event('popstate'));
  };

  const handleCheckoutSuccess = (course: Course) => {
    store.handleRemoveFromCart(course.id);
    store.showToast('Enrollment Confirmed!', `Welcome to ${course.title}. Lifetime access unlocked.`);
    handleSelectCourse(course);
  };

  const handleLoginSuccess = (userObj: any, token: string) => {
    const mappedRole = 
      userObj.roleName === 'Learner' ? 'student' :
      userObj.roleName === 'Instructor' ? 'instructor' :
      userObj.roleName === 'Admin' ? 'admin' : 'student';

    setAuth(
      {
        id: userObj.userId.toString(),
        name: userObj.fullName,
        email: userObj.email,
        avatar: userObj.avatarUrl || getDefaultAvatar(userObj.fullName),
        role: mappedRole,
        isGoogleLogin: userObj.isGoogleLogin ?? false
      },
      token
    );
    store.showToast('Welcome Back!', `Logged in successfully as ${userObj.email}`);
    handleNavigate('courses');
  };

  const handleRegisterSuccess = (userObj: any) => {
    store.showToast('Account Created!', `Welcome to MSEEK Academy, ${userObj.fullName}! Please login.`);
    handleNavigate('login');
  };

  const handleLogout = () => {
    authLogout();
    store.showToast('Signed Out', 'You have been logged out securely.', 'info');
    handleNavigate('home');
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    updateUser(updatedUser);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-400 tracking-wider">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="mseek-app-root" className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Alert */}
      <Toast toast={store.toastMessage} onClose={() => store.setToastMessage(null)} />

      {/* Screen Routing with Layouts */}
      <AppRouter
        currentScreen={currentScreen}
        selectedCourse={selectedCourse}
        wishlistCourseIds={store.wishlistCourseIds}
        searchQuery={searchQuery}
        user={user}
        onSearchChange={setSearchQuery}
        onNavigate={handleNavigate}
        onSelectCourse={handleSelectCourse}
        onPreviewVideo={store.setPreviewModalCourse}
        onAddToCart={store.handleAddToCart}
        onToggleWishlist={store.handleToggleWishlist}
        onEnrollDirectly={store.setCheckoutModalCourse}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        onUpdateUser={handleUpdateUser}
        onToast={store.showToast}
        onLogout={handleLogout}
        cartCount={store.cartItems.length}
        onOpenCart={() => store.setIsCartOpen(true)}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={store.isCartOpen}
        onClose={() => store.setIsCartOpen(false)}
        cartItems={store.cartItems}
        onRemoveItem={store.handleRemoveFromCart}
        onCheckout={() => {
          if (store.cartItems.length > 0) {
            store.setCheckoutModalCourse(store.cartItems[0]);
          }
        }}
        onNavigateToCourse={handleSelectCourse}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        course={store.previewModalCourse}
        isOpen={!!store.previewModalCourse}
        onClose={() => store.setPreviewModalCourse(null)}
        onEnroll={store.setCheckoutModalCourse}
      />

      {/* Instant Checkout / Enrollment Modal */}
      <CheckoutModal
        course={store.checkoutModalCourse}
        isOpen={!!store.checkoutModalCourse}
        onClose={() => store.setCheckoutModalCourse(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
