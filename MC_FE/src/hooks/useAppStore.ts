import { useState, useCallback } from 'react';
import { Course } from '../types';
import { mockCourses } from '../data/mockData';

import { ToastMessage, ToastType } from '../components/common/Toast';

export function useAppStore() {
  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<Course[]>([mockCourses[1]]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlistCourseIds, setWishlistCourseIds] = useState<string[]>(['course-corporate-hosting']);

  // Modals state
  const [previewModalCourse, setPreviewModalCourse] = useState<Course | null>(null);
  const [checkoutModalCourse, setCheckoutModalCourse] = useState<Course | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = useCallback((title: string, desc?: string, type: ToastType = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const handleAddToCart = useCallback((course: Course) => {
    setCartItems(prev => {
      if (!prev.some(item => item.id === course.id)) {
        showToast('Added to Cart', `${course.title} is now in your cart.`);
        return [...prev, course];
      } else {
        showToast('Already in Cart', `${course.title} is already added.`, 'info');
        return prev;
      }
    });
    setIsCartOpen(true);
  }, [showToast]);

  const handleRemoveFromCart = useCallback((courseId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== courseId));
    showToast('Item Removed', 'Course removed from your shopping cart.', 'info');
  }, [showToast]);

  const handleToggleWishlist = useCallback((courseId: string) => {
    setWishlistCourseIds(prev => {
      if (prev.includes(courseId)) {
        showToast('Removed from Wishlist', 'Course removed from your saved list.', 'info');
        return prev.filter(id => id !== courseId);
      } else {
        showToast('Saved to Wishlist', 'Course added to your saved wishlist.');
        return [...prev, courseId];
      }
    });
  }, [showToast]);

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
  };
}
