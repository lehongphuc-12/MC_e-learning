import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, User } from './types';
import { mockCourses } from './data/mockData';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { CartDrawer } from './components/modals/CartDrawer';
import { Toast } from './components/common/Toast';
import { authApi } from './features/auth/api/authApi';
import { useAppStore } from './hooks/useAppStore';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(mockCourses[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { user, setAuth, updateUser, logout: authLogout } = useAuth();
  const store = useAppStore();
  const navigate = useNavigate();

  // Background session sync - updates state quietly without blocking UI render
  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = useAuthStore.getState().token;
      if (!storedToken) return;

      try {
        const result = await authApi.getMe();
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
            storedToken
          );
        } else {
          authLogout();
        }
      } catch (err) {
        authLogout();
      }
    };

    fetchMe();
  }, []);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    navigate(`/course-detail?id=${course.id}`);
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
  };

  const handleRegisterSuccess = (userObj: any) => {
    store.showToast('Account Created!', `Welcome to MSEEK Academy, ${userObj.fullName}! Please login.`);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Ignore network errors on logout
    }
    authLogout();
    store.showToast('Signed Out', 'You have been logged out securely.', 'info');
    navigate('/');
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    updateUser(updatedUser);
  };

  return (
    <div id="mseek-app-root" className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Alert */}
      <Toast toast={store.toastMessage} onClose={() => store.setToastMessage(null)} />

      {/* Declarative Screen Routing */}
      <AppRouter
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        wishlistCourseIds={store.wishlistCourseIds}
        searchQuery={searchQuery}
        user={user}
        onSearchChange={setSearchQuery}
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
