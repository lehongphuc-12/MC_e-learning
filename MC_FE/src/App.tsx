import React, { useState } from 'react';
import { ScreenType, Course, User } from './types';
import { mockCourses, mockCurrentUser } from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeScreen } from './components/screens/HomeScreen';
import { CourseCatalogScreen } from './components/screens/CourseCatalogScreen';
import { CourseDetailScreen } from './components/screens/CourseDetailScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { RegisterScreen } from './components/screens/RegisterScreen';
import { VideoPreviewModal } from './components/modals/VideoPreviewModal';
import { CheckoutModal } from './components/modals/CheckoutModal';
import { CartDrawer } from './components/modals/CartDrawer';
import { CheckCircle2, Heart, ShoppingBag, X } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(mockCourses[0]);
  const [user, setUser] = useState<User | null>(mockCurrentUser);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<Course[]>([mockCourses[1]]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [wishlistCourseIds, setWishlistCourseIds] = useState<string[]>(['course-corporate-hosting']);

  // Modals state
  const [previewModalCourse, setPreviewModalCourse] = useState<Course | null>(null);
  const [checkoutModalCourse, setCheckoutModalCourse] = useState<Course | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ title: string; desc?: string; type?: 'success' | 'info' } | null>(null);

  const showToast = (title: string, desc?: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Screen navigation with smooth scroll to top
  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentScreen('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviewVideo = (course: Course) => {
    setPreviewModalCourse(course);
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

  const handleEnrollDirectly = (course: Course) => {
    setCheckoutModalCourse(course);
  };

  const handleCheckoutSuccess = (course: Course) => {
    if (user) {
      if (!user.enrolledCourseIds.includes(course.id)) {
        setUser({
          ...user,
          enrolledCourseIds: [...user.enrolledCourseIds, course.id]
        });
      }
    }
    // Remove from cart if it was there
    setCartItems(prev => prev.filter(c => c.id !== course.id));
    showToast('Enrollment Confirmed!', `Welcome to ${course.title}. Lifetime access unlocked.`);
    handleNavigate('course-detail');
  };

  const handleLoginSuccess = (email: string) => {
    setUser({
      ...mockCurrentUser,
      email: email,
    });
    showToast('Welcome Back!', `Logged in successfully as ${email}`);
    handleNavigate('courses');
  };

  const handleRegisterSuccess = (name: string, email: string) => {
    setUser({
      ...mockCurrentUser,
      name: name,
      email: email,
    });
    showToast('Account Created!', `Welcome to MSEEK Academy, ${name}!`);
    handleNavigate('courses');
  };

  const handleLogout = () => {
    setUser(null);
    showToast('Signed Out', 'You have been logged out securely.', 'info');
    handleNavigate('home');
  };

  return (
    <div id="mseek-app-root" className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div 
          id="global-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 max-w-sm animate-bounce"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{toastMessage.title}</h4>
            {toastMessage.desc && (
              <p className="text-[11px] text-slate-300 mt-0.5">{toastMessage.desc}</p>
            )}
          </div>
          <button
            onClick={() => setToastMessage(null)}
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
        cartCount={cartItems.length}
        wishlistCount={wishlistCourseIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onSelectCourse={handleSelectCourse}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Screen Routing */}
      <main className="flex-1">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            onSelectCourse={handleSelectCourse}
            onPreviewVideo={handlePreviewVideo}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistCourseIds={wishlistCourseIds}
          />
        )}

        {currentScreen === 'courses' && (
          <CourseCatalogScreen
            onNavigate={handleNavigate}
            onSelectCourse={handleSelectCourse}
            onPreviewVideo={handlePreviewVideo}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistCourseIds={wishlistCourseIds}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {currentScreen === 'course-detail' && (
          <CourseDetailScreen
            course={selectedCourse}
            onNavigate={handleNavigate}
            onEnroll={handleEnrollDirectly}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={selectedCourse ? wishlistCourseIds.includes(selectedCourse.id) : false}
            onPreviewVideo={handlePreviewVideo}
          />
        )}

        {currentScreen === 'login' && (
          <LoginScreen
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === 'register' && (
          <RegisterScreen
            onNavigate={handleNavigate}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}
      </main>

      {/* Global Footer (shown on home, catalog, and detail screens) */}
      {(currentScreen === 'home' || currentScreen === 'courses' || currentScreen === 'course-detail') && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={() => {
          if (cartItems.length > 0) {
            handleEnrollDirectly(cartItems[0]);
          }
        }}
        onNavigateToCourse={handleSelectCourse}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        course={previewModalCourse}
        isOpen={!!previewModalCourse}
        onClose={() => setPreviewModalCourse(null)}
        onEnroll={handleEnrollDirectly}
      />

      {/* Instant Checkout / Enrollment Modal */}
      <CheckoutModal
        course={checkoutModalCourse}
        isOpen={!!checkoutModalCourse}
        onClose={() => setCheckoutModalCourse(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
