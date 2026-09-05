import { useState } from 'react';
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

  const showToast = (title: string, desc?: string, type: ToastType = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleAddToCart = (course: Course) => {
    if (!cartItems.some(item => item.id === course.id)) {
      setCartItems(prev => [...prev, course]);
      showToast('Added to Cart', `${course.title} is now in your cart.`);
    } else {
      showToast('Already in Cart', `${course.title} is already added.`, 'info');
    }
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (courseId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== courseId));
    showToast('Item Removed', 'Course removed from your shopping cart.', 'info');
  };

  const handleToggleWishlist = (courseId: string) => {
    if (wishlistCourseIds.includes(courseId)) {
      setWishlistCourseIds(prev => prev.filter(id => id !== courseId));
      showToast('Removed from Wishlist', 'Course removed from your saved list.', 'info');
    } else {
      setWishlistCourseIds(prev => [...prev, courseId]);
      showToast('Saved to Wishlist', 'Course added to your saved wishlist.');
    }
  };

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
