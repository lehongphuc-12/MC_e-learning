import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Course, User } from '../types';
import { ToastMessage, ToastType } from '../components/common/Toast';
import { paymentApi } from '../features/payment/api/paymentApi';
import type { EnrollmentDto } from '../features/payment/types/paymentTypes';
import { courseFavoritesApi } from '../features/courses/api/courseFavoritesApi';

const GUEST_CART_KEY = 'mseek_cart_guest';
const GUEST_WISHLIST_KEY = 'mseek_wishlist_guest';

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

const readGuestWishlist = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export function useAppStore(user: User | null) {
  const cartStorageKey = useMemo(() => user ? getUserCartKey(user.id) : GUEST_CART_KEY, [user]);
  const loadedCartKeyRef = useRef<string>(cartStorageKey);

  const [cartItems, setCartItems] = useState<Course[]>(() => readCart(GUEST_CART_KEY));
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlistCourseIds, setWishlistCourseIds] = useState<string[]>(readGuestWishlist);
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

  useEffect(() => {
    if (user?.role !== 'student') {
      if (!user) setWishlistCourseIds(readGuestWishlist());
      else setWishlistCourseIds([]);
      return;
    }

    let active = true;
    const syncFavorites = async () => {
      const guestIds = readGuestWishlist()
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);
      if (guestIds.length) {
        await Promise.allSettled(guestIds.map((id) => courseFavoritesApi.add(id)));
      }
      const ids = await courseFavoritesApi.getMine();
      if (!active) return;
      setWishlistCourseIds(ids.map(String));
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    };
    syncFavorites()
      .catch((error) => console.error('Failed to load favorite courses:', error));
    return () => { active = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user) localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlistCourseIds));
  }, [user, wishlistCourseIds]);

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
        .filter((enrollment) =>
          (enrollment.isAccessGranted ?? String(enrollment.status).toUpperCase() === 'ACTIVE') &&
          !enrollment.canPurchaseDirectly
        )
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
      const removing = wishlistCourseIds.includes(courseId);
      const next = removing
        ? wishlistCourseIds.filter((id) => id !== courseId)
        : [...wishlistCourseIds, courseId];
      setWishlistCourseIds(next);

      if (user?.role === 'student') {
        const numericId = Number(courseId);
        if (!Number.isInteger(numericId) || numericId <= 0) {
          setWishlistCourseIds(wishlistCourseIds);
          showToast('Không thể lưu khóa học', 'Mã khóa học không hợp lệ.', 'error');
          return;
        }
        const mutation = removing ? courseFavoritesApi.remove(numericId) : courseFavoritesApi.add(numericId);
        void mutation.catch((error) => {
          setWishlistCourseIds(wishlistCourseIds);
          showToast('Chưa cập nhật được yêu thích', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'error');
        });
      } else if (user) {
        setWishlistCourseIds(wishlistCourseIds);
        showToast('Chỉ học viên mới có danh sách yêu thích.', undefined, 'info');
        return;
      }

      showToast(removing ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích', undefined, removing ? 'info' : 'success');
    },
    [showToast, user?.role, wishlistCourseIds]
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
