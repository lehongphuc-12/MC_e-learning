import React, { useState, useEffect } from 'react';
import { ScreenType, Course, User } from './types';
import { mockCourses } from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { CartDrawer } from './components/modals/CartDrawer';
import { CheckCircle2, X } from 'lucide-react';
import { authService } from './services/authService';
import { useAppStore } from './hooks/useAppStore';
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const store = useAppStore();

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoadingUser(false);
        setUser(null);
        return;
      }

      try {
        const result = await authService.getMe(token);
        if (result.success) {
          const userObj = result.data;
          const mappedRole = 
            userObj.roleName === 'Learner' ? 'student' :
            userObj.roleName === 'Instructor' ? 'instructor' :
            userObj.roleName === 'Admin' ? 'admin' : 'student';

          setUser({
            id: userObj.userId.toString(),
            name: userObj.fullName,
            email: userObj.email,
            avatar: userObj.avatarUrl || getDefaultAvatar(userObj.fullName),
            role: mappedRole
          });
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchMe();
  }, []);

  // Listen to hash change to set active screen
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      if (hash.startsWith('#/courses')) {
        setCurrentScreen('courses');
      } else if (hash.startsWith('#/course-detail')) {
        // Parse course ID from hash query parameter
        const match = hash.match(/\?id=([^&]+)/);
        const courseId = match ? match[1] : null;
        if (courseId) {
          const found = mockCourses.find(c => c.id === courseId);
          if (found) {
            setSelectedCourse(found);
          }
        }
        setCurrentScreen('course-detail');
      } else if (hash === '#/profile') {
        setCurrentScreen('profile');
      } else if (hash === '#/login') {
        setCurrentScreen('login');
      } else if (hash === '#/register') {
        setCurrentScreen('register');
      } else {
        setCurrentScreen('home');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run once on startup

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (screen: ScreenType) => {
    window.location.hash = `/${screen === 'home' ? '' : screen}`;
  };

  const handleSelectCourse = (course: Course) => {
    window.location.hash = `/course-detail?id=${course.id}`;
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

    setUser({
      id: userObj.userId.toString(),
      name: userObj.fullName,
      email: userObj.email,
      avatar: userObj.avatarUrl || getDefaultAvatar(userObj.fullName),
      role: mappedRole
    });
    localStorage.setItem('token', token);
    store.showToast('Welcome Back!', `Logged in successfully as ${userObj.email}`);
    handleNavigate('courses');
  };

  const handleRegisterSuccess = (userObj: any) => {
    store.showToast('Account Created!', `Welcome to MSEEK Academy, ${userObj.fullName}! Please login.`);
    handleNavigate('login');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    store.showToast('Signed Out', 'You have been logged out securely.', 'info');
    handleNavigate('home');
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
      {store.toastMessage && (
        <div 
          id="global-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 max-w-sm animate-bounce"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{store.toastMessage.title}</h4>
            {store.toastMessage.desc && (
              <p className="text-[11px] text-slate-300 mt-0.5">{store.toastMessage.desc}</p>
            )}
          </div>
          <button
            onClick={() => store.setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        cartCount={store.cartItems.length}
        wishlistCount={store.wishlistCourseIds.length}
        onOpenCart={() => store.setIsCartOpen(true)}
        onSelectCourse={handleSelectCourse}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Screen Routing */}
      <main className="flex-1">
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
        />
      </main>

      {/* Global Footer (shown on home, catalog, and detail screens) */}
      {(currentScreen === 'home' || currentScreen === 'courses' || currentScreen === 'course-detail') && (
        <Footer onNavigate={handleNavigate} />
      )}

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
