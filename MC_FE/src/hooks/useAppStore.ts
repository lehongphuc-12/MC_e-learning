import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Course, User } from '../types';
import { ToastMessage, ToastType } from '../components/common/Toast';
import { paymentApi } from '../features/payment/api/paymentApi';
import type { EnrollmentDto } from '../features/payment/types/paymentTypes';

const GUEST_CART_KEY = 'mseek_cart_guest';

const getUserCartKey = (userId: string) => {
  return `mseek_cart_user_${userId}`;
};

const readCart = (key: string): Course[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to read cart "${key}":`, error);
    return [];
  }
};

const writeCart = (key: string, cart: Course[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(cart));
  } catch (error) {
    console.error(`Failed to save cart "${key}":`, error);
  }
};

const getNumericCourseId = (course: Course): number | null => {
  const courseId = Number(course.id);
  if (!Number.isInteger(courseId) || courseId <= 0) return null;
  return courseId;
};

export function useAppStore(user: User | null) {
  const cartStorageKey = useMemo(() => user ? getUserCartKey(user.id) : GUEST_CART_KEY, [user]);
  const loadedCartKeyRef = useRef<string>(cartStorageKey);

  const [cartItems, setCartItems] = useState<Course[]>(() => readCart(GUEST_CART_KEY));
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlistCourseIds, setWishlistCourseIds] = useState<string[]>(['course-corporate-hosting']);
  const [previewModalCourse, setPreviewModalCourse] = useState<Course | null>(null);
  const [checkoutModalCourse, setCheckoutModalCourse] = useState<Course | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [isEnrollmentSyncing, setIsEnrollmentSyncing] = useState<boolean>(false);

  const showToast = useCallback((title: string, desc?: string, type: ToastType = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // CART: chuyển đúng cart theo guest/account và merge guest cart khi Learner login.
  useEffect(() => {
    if (!user) {
      const guestCart = readCart(GUEST_CART_KEY);
      loadedCartKeyRef.current = GUEST_CART_KEY;
      setCartItems(guestCart);
      setEnrollments([]);
      return;
    }

    const userCartKey = getUserCartKey(user.id);
    const userCart = readCart(userCartKey);
    const guestCart = readCart(GUEST_CART_KEY);
    const mergedCart = [...userCart];

    guestCart.forEach((guestCourse) => {
      const alreadyExists = mergedCart.some((item) => String(item.id) === String(guestCourse.id));
      if (!alreadyExists) mergedCart.push(guestCourse);
    });

    writeCart(userCartKey, mergedCart);

    if (guestCart.length > 0) {
      localStorage.removeItem(GUEST_CART_KEY);
    }

    loadedCartKeyRef.current = userCartKey;
    setCartItems(mergedCart);
  }, [user]);

  // CART: chỉ persist khi state hiện tại thực sự thuộc đúng storage key.
  useEffect(() => {
    if (loadedCartKeyRef.current !== cartStorageKey) return;
    writeCart(cartStorageKey, cartItems);
  }, [cartItems, cartStorageKey]);

  const syncEnrollments = useCallback(async (): Promise<EnrollmentDto[]> => {
    if (!user || user.role !== 'student') {
      setEnrollments([]);
      return [];
    }

    setIsEnrollmentSyncing(true);

    try {
      const response = await paymentApi.getMyEnrollments();
      const enrollmentItems = response.success && Array.isArray(response.data) ? response.data : [];

      setEnrollments(enrollmentItems);

      const activeCourseIds = new Set(
        enrollmentItems
          .filter((enrollment) => String(enrollment.status).toUpperCase() === 'ACTIVE')
          .map((enrollment) => String(enrollment.courseId))
      );

      setCartItems((previousCart) =>
        previousCart.filter((course) => !activeCourseIds.has(String(course.id)))
      );

      return enrollmentItems;
    } catch (error) {
      console.error('Failed to sync enrollments for cart:', error);
      return [];
    } finally {
      setIsEnrollmentSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    void syncEnrollments();
  }, [syncEnrollments]);

  useEffect(() => {
    const handlePaymentCourseActivated = (event: Event) => {
      const customEvent = event as CustomEvent<{ courseId?: string | number }>;
      const courseId = customEvent.detail?.courseId;

      if (courseId == null) return;

      setCartItems((previousCart) =>
        previousCart.filter((course) => String(course.id) !== String(courseId))
      );

      void syncEnrollments();
    };

    window.addEventListener('mseek:payment-course-activated', handlePaymentCourseActivated);

    return () => {
      window.removeEventListener('mseek:payment-course-activated', handlePaymentCourseActivated);
    };
  }, [syncEnrollments]);

  const activeCourseIds = useMemo(() => {
    return new Set(
      enrollments
        .filter((enrollment) => String(enrollment.status).toUpperCase() === 'ACTIVE')
        .map((enrollment) => String(enrollment.courseId))
    );
  }, [enrollments]);

  const pendingCourseIds = useMemo(() => {
    return new Set(
      enrollments
        .filter((enrollment) => String(enrollment.status).toUpperCase() === 'PENDING_PAYMENT')
        .map((enrollment) => String(enrollment.courseId))
    );
  }, [enrollments]);

  const isCourseInCart = useCallback(
    (courseId: string | number) =>
      cartItems.some((course) => String(course.id) === String(courseId)),
    [cartItems]
  );

  const isCourseEnrolled = useCallback(
    (courseId: string | number) => activeCourseIds.has(String(courseId)),
    [activeCourseIds]
  );

  const isCoursePendingPayment = useCallback(
    (courseId: string | number) => pendingCourseIds.has(String(courseId)),
    [pendingCourseIds]
  );

  const handleAddToCart = useCallback(
    (course: Course) => {
      const realCourseId = getNumericCourseId(course);

      if (!realCourseId) {
        showToast(
          'Không thể thêm vào giỏ hàng',
          'Khóa học không có CourseID hợp lệ từ hệ thống.',
          'error'
        );
        return;
      }

      if (user && user.role !== 'student') {
        showToast(
          'Không thể thêm vào giỏ hàng',
          'Chỉ tài khoản học viên mới có thể đăng ký khóa học.',
          'info'
        );
        return;
      }

      if (activeCourseIds.has(String(realCourseId))) {
        showToast(
          'Bạn đã đăng ký khóa học',
          'Khóa học này đã được kích hoạt trong tài khoản của bạn.',
          'info'
        );
        return;
      }

      setCartItems((previousCart) => {
        const alreadyInCart = previousCart.some(
          (item) => String(item.id) === String(course.id)
        );

        if (alreadyInCart) {
          showToast(
            'Đã có trong giỏ hàng',
            `${course.title} đã có trong giỏ hàng.`,
            'info'
          );
          return previousCart;
        }

        const isPendingPayment = pendingCourseIds.has(String(realCourseId));

        if (isPendingPayment) {
          showToast(
            'Tiếp tục thanh toán',
            `${course.title} đang có đăng ký chờ thanh toán.`
          );
        } else {
          showToast(
            'Đã thêm vào giỏ hàng',
            `${course.title} đã được thêm vào giỏ hàng.`
          );
        }

        return [...previousCart, course];
      });

      setIsCartOpen(true);
    },
    [activeCourseIds, pendingCourseIds, showToast, user]
  );

  const handleRemoveFromCart = useCallback(
    (courseId: string) => {
      setCartItems((previousCart) =>
        previousCart.filter((item) => String(item.id) !== String(courseId))
      );

      showToast(
        'Đã xóa khỏi giỏ hàng',
        'Khóa học đã được xóa khỏi giỏ hàng.',
        'info'
      );
    },
    [showToast]
  );

  const clearCartForCurrentUser = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem(cartStorageKey);
  }, [cartStorageKey]);

  const handleToggleWishlist = useCallback(
    (courseId: string) => {
      setWishlistCourseIds((previousWishlist) => {
        if (previousWishlist.includes(courseId)) {
          showToast(
            'Removed from Wishlist',
            'Course removed from your saved list.',
            'info'
          );

          return previousWishlist.filter((id) => id !== courseId);
        }

        showToast(
          'Saved to Wishlist',
          'Course added to your saved wishlist.'
        );

        return [...previousWishlist, courseId];
      });
    },
    [showToast]
  );

  return {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    wishlistCourseIds,
    previewModalCourse,
    setPreviewModalCourse,
    checkoutModalCourse,
    setCheckoutModalCourse,
    toastMessage,
    setToastMessage,
    showToast,
    handleAddToCart,
    handleRemoveFromCart,
    handleToggleWishlist,
    enrollments,
    activeCourseIds,
    pendingCourseIds,
    isEnrollmentSyncing,
    syncEnrollments,
    isCourseInCart,
    isCourseEnrolled,
    isCoursePendingPayment,
    clearCartForCurrentUser,
  };
}