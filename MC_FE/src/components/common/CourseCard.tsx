import { Clock, Heart, Play, Star } from 'lucide-react';
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
}) => {
  return (
    <div
      id={`${idPrefix}-${course.id}`}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group animate-fadeIn"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video overflow-hidden bg-slate-900">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          onClick={() => onSelect(course)}
        />
        {course.badge && (
          <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white shadow ${
            course.badge === 'Best Seller' ? 'bg-amber-500' :
            course.badge === 'Hot Deal' ? 'bg-rose-500' :
            course.badge === 'Free' ? 'bg-emerald-600' : 'bg-blue-600'
          }`}>
            {course.badge}
          </span>
        )}
        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(course.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors cursor-pointer ${
            isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
        {/* Quick Video Preview Overlay Trigger */}
        <button
          onClick={() => onPreview(course)}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-200 cursor-pointer"
        >
          <Play className="w-5 h-5 ml-0.5 fill-white" />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-blue-600 truncate max-w-[140px]">{course.category}</span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {course.durationHours}h
            </span>
          </div>
          <h3
            onClick={() => onSelect(course)}
            className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
          >
            {course.title}
          </h3>
          <p className="text-xs text-slate-500">
            Instructor: <span className="font-medium text-slate-700">{course.instructor.name}</span>
          </p>
        </div>

        {/* Rating & Stats */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{course.rating}</span>
              <span className="text-slate-400 font-normal text-[11px]">({course.reviewsCount})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{course.level}</span>
          </div>

          {/* Pricing & CTA */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-extrabold text-slate-900">
                {course.price === 0 ? 'FREE' : `$${course.price}`}
              </span>
              {course.originalPrice && (
                <span className="text-xs text-slate-400 line-through ml-1.5">${course.originalPrice}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {showCartButton && onAddToCart && (
                <button
                  onClick={() => onAddToCart(course)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  title="Add to Cart"
                >
                  + Cart
                </button>
              )}
              <button
                onClick={() => onSelect(course)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
