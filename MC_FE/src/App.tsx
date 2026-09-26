import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Course, User } from './types';
import { mockCourses } from './data/mockData';

import { AppRouter } from './components/AppRouter';
import { Toast } from './components/common/Toast';
import { CartDrawer } from './components/modals/CartDrawer';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';

import { authApi } from './features/auth/api/authApi';
import { ChatWidget } from './features/chat/components/ChatWidget';

import { useAppStore } from './hooks/useAppStore';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';

const getDefaultAvatar = (name: string) => {
  const parts = name.trim().split(/\s+/);

  let initials = '';

  if (parts.length > 1) {
    initials =
      (parts[0][0] || '') +
      (parts[parts.length - 1][0] || '');
  } else if (parts.length === 1 && parts[0]) {
    initials = parts[0].slice(0, 2);
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials.toUpperCase()
  )}&background=2563eb&color=fff&bold=true`;
};

export default function App() {
  // ============================================================
  // STATE
  // ============================================================

  const [selectedCourse, setSelectedCourse] =
    useState<Course | null>(mockCourses[0] ?? null);

  const [searchQuery, setSearchQuery] =
    useState<string>('');

  // ============================================================
  // HOOKS
  // ============================================================

  const {
    user,
    setAuth,
    updateUser,
    logout: authLogout,
  } = useAuth();

  const store = useAppStore();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ============================================================
  // RESTORE / SYNC SESSION
  // ============================================================

  useEffect(() => {
    const fetchMe = async () => {
      const storedToken =
        useAuthStore.getState().token;

      // Không có token thì không cần gọi /me
      if (!storedToken) {
        return;
      }

      try {
        const result = await authApi.getMe();

        if (!result.success || !result.data) {
          authLogout();
          return;
        }

        const userObj = result.data;

        const mappedRole: User['role'] =
          userObj.roleName === 'Learner'
            ? 'student'
            : userObj.roleName === 'Instructor'
              ? 'instructor'
              : userObj.roleName === 'Admin'
                ? 'admin'
                : 'student';

        setAuth(
          {
            id: userObj.userId.toString(),

            name: userObj.fullName,

            email: userObj.email,

            avatar:
              userObj.avatarUrl ||
              getDefaultAvatar(userObj.fullName),

            role: mappedRole,

            isGoogleLogin:
              userObj.isGoogleLogin ?? false,
          },
          storedToken
        );
      } catch (error) {
        console.error(
          'Failed to restore user session:',
          error
        );

        authLogout();
      }
    };

    void fetchMe();
  }, [authLogout, setAuth]);

  // ============================================================
  // COURSE
  // ============================================================

  const handleSelectCourse = (
    course: Course
  ) => {
    setSelectedCourse(course);

    navigate(
      `/course-detail?id=${course.id}`
    );
  };

  // ============================================================
  // CHECKOUT
  // ============================================================

  const handleCheckoutSuccess = (
    course: Course
  ) => {
    store.handleRemoveFromCart(course.id);

    store.showToast(
      'Enrollment Confirmed!',
      `Welcome to ${course.title}. Lifetime access unlocked.`
    );

    handleSelectCourse(course);
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLoginSuccess = (
    userObj: any,
    token: string
  ) => {
    const mappedRole: User['role'] =
      userObj.roleName === 'Learner'
        ? 'student'
        : userObj.roleName === 'Instructor'
          ? 'instructor'
          : userObj.roleName === 'Admin'
            ? 'admin'
            : 'student';

    setAuth(
      {
        id: userObj.userId.toString(),

        name: userObj.fullName,

        email: userObj.email,

        avatar:
          userObj.avatarUrl ||
          getDefaultAvatar(
            userObj.fullName
          ),

        role: mappedRole,

        isGoogleLogin:
          userObj.isGoogleLogin ?? false,
      },
      token
    );

    store.showToast(
      'Welcome Back!',
      `Logged in successfully as ${userObj.email}`
    );
  };

  // ============================================================
  // REGISTER
  // ============================================================

  const handleRegisterSuccess = (
    userObj: any
  ) => {
    store.showToast(
      'Account Created!',
      `Welcome to MSEEK Academy, ${userObj.fullName}! Please login.`
    );
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn(
        'Logout API failed:',
        error
      );
    }

    authLogout();
    queryClient.clear();

    store.showToast(
      'Signed Out',
      'You have been logged out securely.',
      'info'
    );

    navigate('/');
  };

  // ============================================================
  // UPDATE USER
  // ============================================================

  const handleUpdateUser = (
    updatedUser: Partial<User>
  ) => {
    updateUser(updatedUser);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      id="mseek-app-root"
      className="
        min-h-screen
        flex
        flex-col
        bg-slate-50
        text-slate-900
        selection:bg-blue-600
        selection:text-white
      "
    >
      {/* ======================================================
          TOAST
      ====================================================== */}

      <Toast
        toast={store.toastMessage}
        onClose={() =>
          store.setToastMessage(null)
        }
      />

      {/* ======================================================
          APPLICATION ROUTER
      ====================================================== */}

      <AppRouter
        selectedCourse={selectedCourse}
        setSelectedCourse={
          setSelectedCourse
        }
        wishlistCourseIds={
          store.wishlistCourseIds
        }
        searchQuery={searchQuery}
        user={user}
        onSearchChange={setSearchQuery}
        onPreviewVideo={
          store.setPreviewModalCourse
        }
        onAddToCart={
          store.handleAddToCart
        }
        onToggleWishlist={
          store.handleToggleWishlist
        }
        onEnrollDirectly={
          store.setCheckoutModalCourse
        }
        onLoginSuccess={
          handleLoginSuccess
        }
        onRegisterSuccess={
          handleRegisterSuccess
        }
        onUpdateUser={
          handleUpdateUser
        }
        onToast={store.showToast}
        onLogout={handleLogout}
        cartCount={
          store.cartItems.length
        }
        onOpenCart={() =>
          store.setIsCartOpen(true)
        }
      />

      {/* ======================================================
          CHAT
      ====================================================== */}

      {user && (
        <ChatWidget
          currentUser={user}
        />
      )}

      {/* ======================================================
          CART DRAWER
      ====================================================== */}

      <CartDrawer
        isOpen={store.isCartOpen}
        onClose={() =>
          store.setIsCartOpen(false)
        }
        cartItems={store.cartItems}
        onRemoveItem={
          store.handleRemoveFromCart
        }
        onCheckout={() => {
          if (
            store.cartItems.length === 0
          ) {
            return;
          }

          store.setCheckoutModalCourse(
            store.cartItems[0]
          );

          store.setIsCartOpen(false);
        }}
        onNavigateToCourse={
          handleSelectCourse
        }
      />

      {/* ======================================================
          VIDEO PREVIEW
      ====================================================== */}

      <VideoPreviewModal
        course={
          store.previewModalCourse
        }
        isOpen={
          !!store.previewModalCourse
        }
        onClose={() =>
          store.setPreviewModalCourse(
            null
          )
        }
        onEnroll={
          store.setCheckoutModalCourse
        }
      />

      {/* ======================================================
          CHECKOUT
      ====================================================== */}

      <CheckoutModal
        course={
          store.checkoutModalCourse
        }
        isOpen={
          !!store.checkoutModalCourse
        }
        onClose={() =>
          store.setCheckoutModalCourse(
            null
          )
        }
        onSuccess={
          handleCheckoutSuccess
        }
      />
    </div>
  );
}