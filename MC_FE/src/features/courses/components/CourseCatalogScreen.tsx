import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Star, 
  X, 
  Check, 
  ArrowUpDown
} from 'lucide-react';
import { Course, ScreenType } from '../../../types';
import { CourseCard } from '../../../components/common/CourseCard';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useCategoriesQuery } from '../hooks/useInstructorCourses';
import { useNavigate } from 'react-router-dom';

interface CourseCatalogScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  wishlistCourseIds: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCart: () => void;
  isCourseInCart: (courseId: string | number) => boolean;
  isCourseEnrolled: (courseId: string | number) => boolean;
  isCoursePendingPayment: (courseId: string | number) => boolean;
  onContinuePayment: (course: Course) => void;
}

export const CourseCatalogScreen: React.FC<CourseCatalogScreenProps> = ({
  onNavigate,
  onSelectCourse,
  onPreviewVideo,
  onAddToCart,
  onToggleWishlist,
  wishlistCourseIds,
  searchQuery,
  onSearchChange,
  onOpenCart,
  isCourseInCart,
  isCourseEnrolled,
  isCoursePendingPayment,
  onContinuePayment,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price-low' | 'price-high' | 'newest'>('popular');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const itemsPerPage = 6;

  const navigate = useNavigate();

  const onNavigateToLearning = (course: Course) => {
    navigate(`/courses/${course.id}/learn`);
  };

  const coursesQuery = useCoursesQuery();
  const categoriesQuery = useCategoriesQuery();

  const allCourses = coursesQuery.data || [];
  const rawCategories = categoriesQuery.data || [];

  const categoryOptions = useMemo(() => {
    return ['All', ...rawCategories.map((c) => c.categoryName)];
  }, [rawCategories]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(query);
        const matchSubtitle = course.subtitle.toLowerCase().includes(query);
        const matchInstructor = course.instructor.name.toLowerCase().includes(query);
        const matchCat = course.category.toLowerCase().includes(query);
        if (!matchTitle && !matchSubtitle && !matchInstructor && !matchCat) return false;
      }

      if (selectedCategory !== 'All' && !course.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
        return false;
      }

      if (selectedLevel !== 'All' && course.level !== selectedLevel && course.level !== 'All Levels') {
        return false;
      }

      if (minRating > 0 && course.rating < minRating) {
        return false;
      }

      if (priceFilter === 'free' && course.price > 0) return false;
      if (priceFilter === 'paid' && course.price === 0) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'popular') return b.studentsCount - a.studentsCount;
      return 0;
    });
  }, [allCourses, searchQuery, selectedCategory, selectedLevel, minRating, priceFilter, sortBy]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const displayedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedLevel('All');
    setMinRating(0);
    setPriceFilter('all');
    onSearchChange('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory !== 'All' || selectedLevel !== 'All' || minRating > 0 || priceFilter !== 'all' || Boolean(searchQuery);

  return (
    <div id="course-catalog-screen" className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10 animate-fadeIn">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> Học viện MSEEK</span>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Khám phá khóa học</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Nâng tầm bản lĩnh sân khấu với lộ trình đào tạo MC và giao tiếp từ các chuyên gia.
            </p>
            <p className="mt-5 text-sm font-semibold text-white"><span className="text-2xl font-black">{filteredCourses.length}</span><span className="ml-2 text-slate-300">khóa học dành cho bạn</span></p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="sort-courses-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sắp xếp khóa học
            </label>
            <select
              id="sort-courses-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-w-52 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-lg outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
            >
              <option value="popular">Phổ biến nhất</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="price-low">Giá: Thấp đến Cao</option>
              <option value="price-high">Giá: Cao đến Thấp</option>
            </select>
          </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Sidebar */}
        <aside id="catalog-filters-sidebar" className="lg:col-span-3 space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Bộ lọc</h3>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Đặt lại
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Từ khóa tìm kiếm</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Ví dụ: Đám cưới, Thuyết trình..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700">Danh mục</label>
            <div className="space-y-1">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{cat === 'All' ? 'Tất cả danh mục' : cat}</span>
                  {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Cấp độ kỹ năng</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'All', label: 'Tất cả' },
                { id: 'Beginner', label: 'Cơ bản' },
                { id: 'Intermediate', label: 'Trung cấp' },
                { id: 'Advanced', label: 'Nâng cao' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    selectedLevel === lvl.id
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Đánh giá tối thiểu</label>
            <div className="space-y-1.5">
              {[
                { val: 4.8, label: 'Từ 4.8 ★ trở lên' },
                { val: 4.5, label: 'Từ 4.5 ★ trở lên' },
                { val: 0, label: 'Tất cả đánh giá' },
              ].map((r) => (
                <button
                  key={r.val}
                  onClick={() => setMinRating(r.val)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                    minRating === r.val ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{r.label}</span>
                  </div>
                  {minRating === r.val && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Học phí</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'free', label: 'Miễn phí' },
                { id: 'paid', label: 'Trả phí' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriceFilter(p.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    priceFilter === p.id
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Catalog Grid */}
        <main className="lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
            <div><p className="text-sm font-extrabold text-slate-900">Thư viện khóa học</p><p className="mt-1 text-xs text-slate-500">Hiển thị {displayedCourses.length} trong {filteredCourses.length} khóa học</p></div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Trang {currentPage} / {totalPages}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {hasActiveFilters && <><span className="text-slate-400 font-medium">Bộ lọc đang dùng:</span>
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                Danh mục: {selectedCategory}
                <button onClick={() => setSelectedCategory('All')}><X className="w-3 h-3 hover:text-blue-900" /></button>
              </span>
            )}
            {selectedLevel !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                Cấp độ: {selectedLevel}
                <button onClick={() => setSelectedLevel('All')}><X className="w-3 h-3 hover:text-blue-900" /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200">
                Đánh giá: {minRating}+ ★
                <button onClick={() => setMinRating(0)}><X className="w-3 h-3 hover:text-amber-900" /></button>
              </span>
            )}
            {priceFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
                Giá: {priceFilter === 'free' ? 'Miễn phí' : 'Trả phí'}
                <button onClick={() => setPriceFilter('all')}><X className="w-3 h-3 hover:text-slate-900" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
                "{searchQuery}"
                <button onClick={() => onSearchChange('')}><X className="w-3 h-3 hover:text-slate-900" /></button>
              </span>
            )}
            </>}
          </div>

          {displayedCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Không tìm thấy khóa học phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thử điều chỉnh từ khóa tìm kiếm hoặc đặt lại các bộ lọc để tìm kiếm các khóa học khác.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 cursor-pointer"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
  {displayedCourses.map((course) => (
    <CourseCard
      key={course.id}
      idPrefix="catalog-card"
      course={course}
      isWishlisted={wishlistCourseIds.includes(course.id)}
      onSelect={onSelectCourse}
      onPreview={onPreviewVideo}
      onToggleWishlist={onToggleWishlist}
      onAddToCart={onAddToCart}
      showCartButton={true}
      isInCart={isCourseInCart(course.id)}
      isEnrolled={isCourseEnrolled(course.id)}
      isPendingPayment={isCoursePendingPayment(course.id)}
      onOpenCart={onOpenCart}
      onContinuePayment={onContinuePayment}
      onGoToCourse={(selectedCourse) => onNavigateToLearning(selectedCourse)}
    />
  ))}
</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
