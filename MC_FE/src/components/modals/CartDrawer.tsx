import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { Course } from '../../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Course[];
  onRemoveItem: (courseId: string) => void;
  onCheckout: () => void;
  onNavigateToCourse: (course: Course) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onCheckout,
  onNavigateToCourse
}) => {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <div id="cart-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          id="cart-drawer-panel"
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Your Cart ({cartItems.length})</h2>
            </div>
            <button
              id="close-cart-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Discover masterclasses on MCing, public speaking, and presentation design to advance your stage career.
                </p>
              </div>
            ) : (
              cartItems.map((course) => (
                <div 
                  key={course.id}
                  id={`cart-item-${course.id}`}
                  className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 group hover:border-blue-200 transition-all"
                >
                  <img 
                    src={course.thumbnail} 
                    alt={course.title} 
                    className="w-20 h-16 rounded-lg object-cover cursor-pointer"
                    onClick={() => {
                      onClose();
                      onNavigateToCourse(course);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => {
                        onClose();
                        onNavigateToCourse(course);
                      }}
                      className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-blue-600 cursor-pointer"
                    >
                      {course.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{course.instructor.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-blue-600">${course.price}</span>
                      <button
                        onClick={() => onRemoveItem(course.id)}
                        className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Summary */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
                <Tag className="w-4 h-4 text-blue-600" />
                <input 
                  type="text" 
                  placeholder="Coupon code (e.g. STAGE2026)" 
                  className="flex-1 text-xs focus:outline-none uppercase font-semibold" 
                />
                <button className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-bold">Apply</button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-blue-600">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                id="cart-checkout-btn"
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>30-Day Money-Back Guarantee</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
