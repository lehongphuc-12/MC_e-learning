import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Heart,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Course } from '../../../types';
import { CourseCard } from '../../../components/common/CourseCard';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useNavigate } from 'react-router-dom';

interface Props {
  wishlistCourseIds: string[];
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course, lessonId?: number, lessonTitle?: string) => void;
  onToggleWishlist: (courseId: string) => void;
  onAddToCart: (course: Course) => void;
  isCourseInCart: (courseId: string | number) => boolean;
  isCourseEnrolled: (courseId: string | number) => boolean;
  isCoursePendingPayment: (courseId: string | number) => boolean;
  onOpenCart: () => void;
  onContinuePayment: (course: Course) => void;
}

export const CourseFavoritesScreen: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const coursesQuery = useCoursesQuery();

  const courses = useMemo(() => {
    const saved = new Set(props.wishlistCourseIds.map(String));
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi-VN');

    return (coursesQuery.data ?? [])
      .filter((course) => saved.has(String(course.id)))
      .filter((course) => !normalizedQuery || [course.title, course.category, course.instructor.name]
        .some((value) => value.toLocaleLowerCase('vi-VN').includes(normalizedQuery)));
  }, [coursesQuery.data, props.wishlistCourseIds, searchQuery]);

  const savedCourseCount = props.wishlistCourseIds.length;

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="favorite-hero relative isolate mb-7 overflow-hidden rounded-[30px] border border-white/10 bg-[#071b45] px-6 py-8 text-white shadow-[0_24px_60px_rgba(8,32,78,0.22)] sm:px-9 sm:py-10 lg:px-12">
        <div aria-hidden="true" className="favorite-hero-light favorite-hero-light-blue pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="favorite-hero-light favorite-hero-light-gold pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 -z-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-[24%] -z-10 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div aria-hidden="true" className="favorite-hero-star favorite-hero-star-one pointer-events-none absolute right-[31%] top-[24%] text-amber-200"><Sparkles className="h-5 w-5" /></div>
        <div aria-hidden="true" className="favorite-hero-star favorite-hero-star-two pointer-events-none absolute right-[16%] bottom-[23%] text-sky-200"><Sparkles className="h-4 w-4" /></div>
        <div aria-hidden="true" className="favorite-hero-star favorite-hero-star-three pointer-events-none absolute right-[8%] top-[22%] text-white/80"><Sparkles className="h-3.5 w-3.5" /></div>

        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="favorite-heart-badge mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-100/25 bg-rose-300/10 text-rose-200 shadow-[0_8px_24px_rgba(251,113,133,0.12)]">
              <Heart className="h-5 w-5 fill-current" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">Danh sách yêu thích</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Những khóa học bạn đã lưu để dễ dàng quay lại chọn lộ trình MC phù hợp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="favorite-hero-cta group relative isolate inline-flex min-h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#ffc928] px-5 text-sm font-extrabold text-[#10234a] shadow-[0_10px_26px_rgba(255,201,40,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_14px_32px_rgba(255,201,40,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/40"
          >
            <span aria-hidden="true" className="favorite-hero-cta-shine pointer-events-none absolute inset-y-[-60%] -left-1/2 z-0 w-1/3 rotate-[20deg] bg-gradient-to-r from-transparent via-white/75 to-transparent" />
            <span className="relative z-10">Khám phá khóa học</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      <section aria-label="Các khóa học đã yêu thích">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(15,43,82,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Khóa học đã lưu</h2>
              <p className="mt-0.5 text-xs text-slate-500">{savedCourseCount} khóa học trong bộ sưu tập của bạn</p>
            </div>
          </div>

          {savedCourseCount > 0 && (
            <label className="relative block w-full sm:max-w-[340px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Tìm trong danh sách khóa học yêu thích"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm trong khóa học đã lưu..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa nội dung tìm kiếm"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          )}
        </div>

        {coursesQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
            Đang tải khóa học đã lưu…
          </div>
        ) : coursesQuery.isError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
            <p className="font-bold text-slate-900">Chưa tải được danh sách khóa học</p>
            <p className="mt-2 text-sm text-slate-600">Kiểm tra kết nối rồi thử tải lại.</p>
            <button
              type="button"
              onClick={() => void coursesQuery.refetch()}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              <RefreshCw className="h-4 w-4" /> Thử lại
            </button>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                idPrefix="favorite-course"
                isWishlisted
                onSelect={props.onSelectCourse}
                onPreview={props.onPreviewVideo}
                onToggleWishlist={props.onToggleWishlist}
                onAddToCart={props.onAddToCart}
                showCartButton
                isInCart={props.isCourseInCart(course.id)}
                isEnrolled={props.isCourseEnrolled(course.id)}
                isPendingPayment={props.isCoursePendingPayment(course.id)}
                onOpenCart={props.onOpenCart}
                onGoToCourse={(selected) => navigate(`/courses/${selected.id}/learn`)}
                onContinuePayment={props.onContinuePayment}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <Search className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">Không tìm thấy khóa học phù hợp</h3>
            <p className="mt-2 text-sm text-slate-500">Thử tên khóa học, danh mục hoặc giảng viên khác.</p>
            <button type="button" onClick={() => setSearchQuery('')} className="mt-4 text-sm font-bold text-blue-700 hover:text-blue-900">Xóa bộ lọc</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Heart className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">Bộ sưu tập của bạn đang trống</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Chọn biểu tượng trái tim trên khóa học bạn quan tâm. Khóa học đã lưu sẽ xuất hiện tại đây.
            </p>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              Xem các khóa học <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
