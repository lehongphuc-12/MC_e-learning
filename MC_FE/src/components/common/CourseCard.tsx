import {
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  Mic2,
  Play,
  ShoppingCart,
  Star,
  Tag,
  UserRound,
} from 'lucide-react';
import React from 'react';
import { Course } from '../../types';

interface CourseCardProps {
  course: Course;
  isWishlisted: boolean;
  onSelect: (course: Course) => void;
  onPreview: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  onAddToCart?: (course: Course) => void;
  showCartButton?: boolean;
  idPrefix?: string;
  isInCart?: boolean;
  isEnrolled?: boolean;
  isPendingPayment?: boolean;
  onOpenCart?: () => void;
  onContinuePayment?: (course: Course) => void;
  onGoToCourse?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isWishlisted,
  onSelect,
  onPreview,
  onToggleWishlist,
  onAddToCart,
  showCartButton = false,
  idPrefix = 'course-card',
  isInCart = false,
  isEnrolled = false,
  isPendingPayment = false,
  onOpenCart,
  onContinuePayment,
  onGoToCourse,
}) => {
  const hasDiscount =
    !!course.originalPrice &&
    course.originalPrice > course.price &&
    course.price > 0;

  const discountPercent = hasDiscount
    ? Math.round(((course.originalPrice! - course.price) / course.originalPrice!) * 100)
    : 0;

  const renderPrimaryAction = () => {
    if (!showCartButton) return null;

    const baseClass =
      'h-8 px-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-all duration-200 shrink-0';

    if (isEnrolled) {
      return (
        <button
          type="button"
          onClick={() => onGoToCourse?.(course)}
          className={`${baseClass} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md`}
          title="Vào khóa học"
        >
          <GraduationCap className="w-3 h-3 shrink-0" />
          <span>Vào học</span>
        </button>
      );
    }

    if (isPendingPayment) {
      return (
        <button
          type="button"
          onClick={() => onContinuePayment?.(course)}
          className={`${baseClass} bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md`}
          title="Tiếp tục thanh toán"
        >
          <Clock className="w-3 h-3 shrink-0" />
          <span>Thanh toán</span>
        </button>
      );
    }

    if (isInCart) {
      return (
        <button
          type="button"
          onClick={() => onOpenCart?.()}
          className={`${baseClass} border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700`}
          title="Mở giỏ hàng"
        >
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>Trong giỏ</span>
        </button>
      );
    }

    if (!onAddToCart) return null;

    return (
      <button
        type="button"
        onClick={() => onAddToCart(course)}
        className={`${baseClass} bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md`}
        title="Thêm vào giỏ hàng"
      >
        <ShoppingCart className="w-3 h-3 shrink-0" />
        <span>Thêm giỏ</span>
      </button>
    );
  };

  return (
    <article
      id={`${idPrefix}-${course.id}`}
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
    >
      {/* IMAGE */}
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        <img
          src={course.thumbnail}
          alt={course.title}
          onClick={() => onSelect(course)}
          className="h-full w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-slate-950/10" />

        {course.badge && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow ${
              course.badge === 'Best Seller'
                ? 'bg-amber-500'
                : course.badge === 'Hot Deal'
                  ? 'bg-rose-500'
                  : course.badge === 'Free'
                    ? 'bg-emerald-600'
                    : 'bg-blue-600'
            }`}
          >
            {course.badge}
          </span>
        )}

        {/* WISHLIST */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(course.id);
          }}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-slate-950/80"
          title="Yêu thích"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-white'
            }`}
          />
        </button>

        {/* PREVIEW */}
        <button
          type="button"
          onClick={() => onPreview(course)}
          className="absolute bottom-3 right-3 z-20 flex h-8 items-center gap-1.5 rounded-lg bg-slate-950/75 px-2.5 text-[11px] font-bold text-white opacity-0 shadow-md backdrop-blur-md transition-all duration-200 group-hover:opacity-100 hover:bg-slate-950/90"
          title="Xem trước khóa học"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
            <Play className="h-2 w-2 translate-x-[0.5px] fill-slate-950 text-slate-950" />
          </span>
          <span>Xem trước</span>
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-4">
        {/* CATEGORY + DURATION */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-blue-600">
            {course.category?.toLowerCase().includes('giọng') ? (
              <Mic2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Tag className="h-3.5 w-3.5 shrink-0" />
            )}

            <span className="truncate text-xs font-bold">
              {course.category}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.durationHours}h</span>
          </div>
        </div>

        {/* TITLE */}
        <h3
          onClick={() => onSelect(course)}
          className="line-clamp-2 min-h-[44px] cursor-pointer text-sm font-extrabold leading-[22px] text-slate-950 transition-colors group-hover:text-blue-600"
        >
          {course.title}
        </h3>

        {/* INSTRUCTOR */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />

          <span className="truncate">
            Instructor:{' '}
            <span className="font-semibold text-slate-700">
              {course.instructor.name}
            </span>
          </span>
        </div>

        {/* RATING + LEVEL */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

            <span className="text-xs font-extrabold text-amber-500">
              {course.rating}
            </span>

            <span className="text-[11px] text-slate-400">
              ({course.reviewsCount})
            </span>
          </div>

          <span className="whitespace-nowrap text-[11px] font-semibold text-slate-400">
            {course.level}
          </span>
        </div>

        {/* BOTTOM */}
        <div className="mt-auto pt-4">
          <div className="flex w-full items-center gap-2">
            {/* PRICE */}
            <div className="min-w-0 flex-1">
              {course.price === 0 ? (
                <span className="block whitespace-nowrap text-base font-extrabold text-emerald-600">
                  MIỄN PHÍ
                </span>
              ) : (
                <>
                  <div className="whitespace-nowrap text-[17px] font-black leading-none text-slate-950">
                    {course.price.toLocaleString('vi-VN')} đ
                  </div>

                  {course.originalPrice && (
                    <div className="mt-2 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 line-through">
                        {course.originalPrice.toLocaleString('vi-VN')} đ
                      </span>

                      {hasDiscount && (
                        <span className="shrink-0 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-500">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BUTTONS */}
            <div className="flex shrink-0 items-center gap-1.5">
              {renderPrimaryAction()}

              <button
                type="button"
                onClick={() => onSelect(course)}
                className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50 px-2.5 text-[10px] font-bold text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-200 hover:bg-blue-100"
              >
                Chi tiết
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};