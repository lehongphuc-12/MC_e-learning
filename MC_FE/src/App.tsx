import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { authApi } from './features/auth/api/authApi';
import { paymentApi } from './features/payment/api/paymentApi';
import { ChatWidget } from './features/chat/components/ChatWidget';

import { Course, User } from './types';
import { mockCourses } from './data/mockData';

import { AppRouter } from './components/AppRouter';
import { Toast } from './components/common/Toast';
import { CartDrawer } from './components/modals/CartDrawer';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';

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

  const [isCartCheckingOut, setIsCartCheckingOut] =
    useState(false);

  // ============================================================
  // HOOKS
  // ============================================================

  const {
    user,
    setAuth,
    updateUser,
    logout: authLogout,
  } = useAuth();

  // QUAN TRỌNG:
  // Truyền user vào store để Cart biết:
  // - đang guest hay đã login
  // - cart thuộc account nào
  // - có cần sync Enrollment hay không
  const store = useAppStore(user);

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
  // CART CHECKOUT
  // ============================================================

  const handleCartCheckout = async (
    courses: Course[]
  ) => {
    if (
      courses.length === 0 ||
      isCartCheckingOut
    ) {
      return;
    }

    if (!user) {
      store.showToast(
        'Login Required',
        'Please login before checking out your cart.',
        'info'
      );

      navigate('/login');
      return;
    }

    setIsCartCheckingOut(true);

    try {
      const enrollmentIds: number[] = [];
      const checkoutCourseIds: string[] = [];

      for (const course of courses) {
        const courseId = Number(course.id);

        if (
          !Number.isInteger(courseId) ||
          courseId <= 0
        ) {
          throw new Error(
            `Invalid course ID: ${course.id}`
          );
        }

        const enrollmentResult =
          await paymentApi.enrollCourse(
            courseId
          );

        if (
          !enrollmentResult.success ||
          !enrollmentResult.data
        ) {
          throw new Error(
            enrollmentResult.message ||
              `Unable to enroll in ${course.title}.`
          );
        }

        const enrollment =
          enrollmentResult.data;

        if (
          enrollment.status === 'ACTIVE'
        ) {
          store.handleRemoveFromCart(
            course.id
          );
          continue;
        }

        if (
          enrollment.status !==
          'PENDING_PAYMENT'
        ) {
          throw new Error(
            `Course "${course.title}" cannot be checked out because enrollment status is ${enrollment.status}.`
          );
        }

        enrollmentIds.push(
          enrollment.enrollmentId
        );

        checkoutCourseIds.push(
          course.id
        );
      }

      if (enrollmentIds.length === 0) {
        store.showToast(
          'Already Enrolled',
          'All courses in your cart are already available in your account.',
          'info'
        );

        return;
      }

      const paymentResult =
        await paymentApi.createCartPayment(
          enrollmentIds
        );

      if (
        !paymentResult.success ||
        !paymentResult.data
      ) {
        throw new Error(
          paymentResult.message ||
            'Unable to create cart payment.'
        );
      }

      const payment =
        paymentResult.data;

      if (!payment.paymentUrl) {
        throw new Error(
          'PayOS did not return a payment URL.'
        );
      }

      sessionStorage.setItem(
        'mseek_active_payment_id',
        String(payment.paymentId)
      );

      if (
        checkoutCourseIds.length === 1
      ) {
        sessionStorage.setItem(
          'mseek_active_payment_course_id',
          checkoutCourseIds[0]
        );
      } else {
        sessionStorage.removeItem(
          'mseek_active_payment_course_id'
        );
      }

      sessionStorage.setItem(
        'mseek_active_payment_course_ids',
        JSON.stringify(
          checkoutCourseIds
        )
      );

      window.location.href =
        payment.paymentUrl;
    } catch (error) {
      console.error(
        'Cart checkout failed:',
        error
      );

      store.showToast(
        'Checkout Failed',
        error instanceof Error
          ? error.message
          : 'Unable to process your cart checkout.',
        'error'
      );
    } finally {
      setIsCartCheckingOut(false);
    }
  };

  // ============================================================
  // CHECKOUT SUCCESS
  //
  // Sau khi Enrollment/Payment thành công:
  // 1. remove course khỏi cart
  // 2. sync lại Enrollment thật từ backend
  // 3. invalidate query liên quan course/enrollment
  // 4. thông báo thành công
  // 5. chuyển tới course
  // ============================================================

  const handleCheckoutSuccess = async (
    course: Course
  ) => {
    store.handleRemoveFromCart(course.id);

    await store.syncEnrollments();

    // Đảm bảo các màn hình dùng React Query không giữ dữ liệu cũ.
    await queryClient.invalidateQueries();

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
  //
  // Cart của user KHÔNG bị xóa khỏi localStorage.
  // useAppStore sẽ tự chuyển về guest cart sau khi user = null.
  //
  // Như vậy:
  // Account A logout -> cart A vẫn được lưu.
  // Account B login -> chỉ thấy cart B.
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
        isCourseInCart={
          store.isCourseInCart
        }
        isCourseEnrolled={
          store.isCourseEnrolled
        }
        isCoursePendingPayment={
          store.isCoursePendingPayment
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
        onCheckoutAll={
          handleCartCheckout
        }
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