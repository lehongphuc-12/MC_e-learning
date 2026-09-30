import React from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Course } from '../../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Course[];
  onRemoveItem: (courseId: string) => void;
  onCheckoutAll: (courses: Course[]) => void;
  onNavigateToCourse: (course: Course) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onCheckoutAll,
  onNavigateToCourse,
}) => {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.price || 0),
    0
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price);

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div
          id="cart-drawer-panel"
          className="flex w-screen max-w-md flex-col bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />

              <h2 className="text-base font-bold text-slate-900">
                Giỏ hàng ({cartItems.length})
              </h2>
            </div>

            <button
              id="close-cart-btn"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  Giỏ hàng đang trống
                </h3>

                <p className="max-w-xs text-xs text-slate-500">
                  Hãy thêm khóa học bạn muốn học vào giỏ hàng.
                </p>
              </div>
            ) : (
              cartItems.map((course) => (
                <div
                  key={course.id}
                  id={`cart-item-${course.id}`}
                  className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3"
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-16 w-20 cursor-pointer rounded-lg object-cover"
                    onClick={() => {
                      onClose();
                      onNavigateToCourse(course);
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <h4
                      onClick={() => {
                        onClose();
                        onNavigateToCourse(course);
                      }}
                      className="line-clamp-2 cursor-pointer text-xs font-bold text-slate-900 hover:text-blue-600"
                    >
                      {course.title}
                    </h4>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {course.instructor.name}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-blue-600">
                        {formatPrice(Number(course.price))}đ
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onRemoveItem(course.id)
                        }
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Tạm tính</span>

                  <span className="font-semibold text-slate-900">
                    {formatPrice(subtotal)}đ
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-slate-900">
                  <span>Tổng thanh toán</span>

                  <span className="text-blue-600">
                    {formatPrice(subtotal)}đ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckoutAll(cartItems);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                <span>
                  Thanh toán tất cả {cartItems.length} khóa học
                </span>

                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Thanh toán an toàn qua PayOS</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};