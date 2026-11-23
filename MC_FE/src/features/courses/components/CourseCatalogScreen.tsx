import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowRight,
  Search, 
  SlidersHorizontal, 
  Star, 
  X, 
  Check, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Mic2,
  Play,
  Sparkles,
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
  const [activeArtworkIndex, setActiveArtworkIndex] = useState(0);
  const [isHeroCarouselPaused, setIsHeroCarouselPaused] = useState(false);
  const itemsPerPage = 6;

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedLevel, minRating, priceFilter, sortBy]);

  const onNavigateToLearning = (course: Course) => {
    navigate(`/courses/${course.id}/learn`);
  };

  const coursesQuery = useCoursesQuery();
  const categoriesQuery = useCategoriesQuery();

  const allCourses = coursesQuery.data || [];
  const rawCategories = categoriesQuery.data || [];

  const categoryOptions = useMemo(() => {
    const fromApi = rawCategories.map((c) => c.categoryName).filter(Boolean);
    const fromCourses = [...new Set(allCourses.map((course) => course.category).filter(Boolean))];
    return ['All', ...(fromApi.length > 0 ? fromApi : fromCourses)];
  }, [allCourses, rawCategories]);

  const featuredIndex = Math.max(0, allCourses.findIndex((course) => course.featured));
  const activeCourse = allCourses[activeArtworkIndex % Math.max(allCourses.length, 1)] ?? allCourses[0];
  const courseArtwork = allCourses
    .filter((course) => course.id !== activeCourse?.id)
    .sort((a, b) => {
      const aIndex = allCourses.findIndex((course) => course.id === a.id);
      const bIndex = allCourses.findIndex((course) => course.id === b.id);
      return ((aIndex - activeArtworkIndex + allCourses.length) % allCourses.length) - ((bIndex - activeArtworkIndex + allCourses.length) % allCourses.length);
    })
    .slice(0, 2);

  useEffect(() => {
    if (allCourses.length === 0) return;
    setActiveArtworkIndex((index) => index === 0 ? featuredIndex : Math.min(index, allCourses.length - 1));
  }, [allCourses.length, featuredIndex]);

  useEffect(() => {
    if (allCourses.length < 2 || isHeroCarouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveArtworkIndex((index) => (index + 1) % allCourses.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [allCourses.length, activeArtworkIndex, isHeroCarouselPaused]);

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

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const scrollToCatalog = () => {
    document.getElementById('catalog-course-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryCount = (category: string) => allCourses.filter((course) =>
    course.category.toLowerCase().includes(category.toLowerCase())
  ).length;

  const moveHeroCarousel = (direction: -1 | 1) => {
    if (allCourses.length < 2) return;
    setActiveArtworkIndex((index) => (index + direction + allCourses.length) % allCourses.length);
  };

  return (
    <div id="course-catalog-screen" className="mx-auto max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 animate-fadeIn">
      <header className="grid overflow-hidden rounded-[30px] bg-[#071b49] text-white lg:grid-cols-[1fr_0.92fr]">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-11 lg:px-12">
          <p className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#8fc5ff]"><Mic2 size={16}/> MSEEK ACADEMY · HỌC MC THỰC CHIẾN</p>
          <h1 className="catalog-title-sparkle max-w-[620px] text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl">Chọn sân khấu<br className="hidden sm:block"/> tiếp theo của bạn.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Từ lời dẫn đầu tiên đến lúc làm chủ khán phòng — chọn lộ trình hợp với chất riêng của bạn.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={scrollToCatalog} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1764ff] px-5 text-sm font-extrabold text-white transition hover:bg-[#3478ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Khám phá {filteredCourses.length} khóa học <ArrowRight size={16}/></button>
            <span className="text-xs font-semibold text-blue-200">Giọng nói · Sự kiện · Tiệc cưới · Thuyết trình</span>
          </div>
        </div>
        <div className="relative min-h-[260px] overflow-hidden bg-[#0b2a68] p-5 sm:min-h-[330px] sm:p-7 lg:min-h-[390px]" onMouseEnter={() => setIsHeroCarouselPaused(true)} onMouseLeave={() => setIsHeroCarouselPaused(false)} onFocusCapture={() => setIsHeroCarouselPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsHeroCarouselPaused(false); }}>
          {allCourses.length > 0 ? (
            <div className="grid h-full min-h-[220px] grid-cols-[1.15fr_0.85fr] gap-3 sm:min-h-[280px]">
              <button key={activeCourse?.id} type="button" onClick={() => activeCourse && onSelectCourse(activeCourse)} className="catalog-carousel-slide group relative min-h-0 overflow-hidden rounded-[22px] bg-blue-950 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <img src={activeCourse?.thumbnail} alt={activeCourse?.title ?? 'Khóa học MC tại MSEEK'} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 p-4 text-white sm:p-5">
                  <span className="mb-1 block text-[11px] font-bold text-blue-200">ĐANG CÓ TẠI HỌC VIỆN</span>
                  <span className="line-clamp-2 block text-sm font-extrabold leading-5 sm:text-base">{activeCourse?.title}</span>
                </div>
                <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1764ff] text-white"><Play size={16} fill="currentColor"/></span>
              </button>
              <div className="grid min-h-0 grid-rows-2 gap-3">
                {courseArtwork.map((course, index) => <button key={course.id} type="button" onClick={() => onSelectCourse(course)} className="catalog-carousel-slide group relative min-h-0 overflow-hidden rounded-[20px] bg-blue-950 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ animationDelay: `${index * 90}ms` }}><img src={course.thumbnail} alt={course.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"/><span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-slate-950/70 px-3 py-2 text-xs font-bold leading-4 text-white">{course.category}</span></button>)}
                {courseArtwork.length < 2 && <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] bg-blue-800/70 p-3 text-center text-blue-100"><Sparkles size={25}/><span className="text-xs font-bold leading-4">Luyện giọng, làm chủ sân khấu</span></div>}
              </div>
              {allCourses.length > 1 && <div className="absolute right-7 top-7 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/55 p-1 backdrop-blur-sm"><button type="button" aria-label="Khóa học trước" onClick={() => moveHeroCarousel(-1)} className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft size={17}/></button><span className="min-w-10 text-center text-[11px] font-bold tabular-nums text-white">{activeArtworkIndex + 1}/{allCourses.length}</span><button type="button" aria-label="Khóa học tiếp theo" onClick={() => moveHeroCarousel(1)} className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronRight size={17}/></button></div>}
            </div>
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-[22px] bg-blue-900/50 text-blue-100"><Mic2 size={54}/></div>
          )}
        </div>
      </header>

      <section aria-labelledby="course-pathways-title" className="rounded-[24px] bg-[#eaf2ff] px-5 py-5 sm:px-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><h2 id="course-pathways-title" className="text-lg font-black tracking-tight text-[#0a245c] sm:text-xl">Bạn muốn cầm mic ở đâu?</h2><p className="mt-1 text-sm text-[#52709f]">Chọn một hướng để tìm đúng chất MC của mình.</p></div>
          <span className="text-xs font-semibold text-[#52709f]">{categoryOptions.length - 1} hướng đào tạo</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.slice(1).map((category) => {
            const active = selectedCategory === category;
            return <button key={category} type="button" aria-pressed={active} onClick={() => chooseCategory(category)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${active ? 'bg-[#0754ef] text-white' : 'bg-white text-[#173c81] hover:bg-blue-100'}`}>
              {category}<span className={`ml-2 text-xs ${active ? 'text-blue-100' : 'text-blue-500'}`}>{categoryCount(category)}</span>
            </button>;
          })}
        </div>
      </section>

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
                  onClick={() => chooseCategory(cat)}
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
        <main id="catalog-course-list" className="scroll-mt-6 lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white px-5 py-4 sm:px-6">
            <div><p className="text-lg font-black tracking-tight text-slate-950">Lộ trình dành cho bạn</p><p className="mt-1 text-sm text-slate-500">{filteredCourses.length} khóa học phù hợp{selectedCategory !== 'All' ? ` · ${selectedCategory}` : ''}</p></div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="sort-courses-select" className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><ArrowUpDown className="h-3.5 w-3.5"/>Sắp xếp</label>
              <select id="sort-courses-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="popular">Phổ biến nhất</option><option value="rating">Đánh giá cao nhất</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option>
              </select>
              <span className="text-xs font-semibold text-slate-500">{currentPage}/{totalPages}</span>
            </div>
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

          {coursesQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải khóa học">
              {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-[22px] bg-white"><div className="aspect-video animate-pulse bg-blue-100"/><div className="space-y-3 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-slate-100"/><div className="h-5 w-4/5 animate-pulse rounded bg-slate-100"/><div className="h-3 w-1/2 animate-pulse rounded bg-slate-100"/></div></div>)}
            </div>
          ) : coursesQuery.isError ? (
            <div className="rounded-[22px] bg-white p-10 text-center">
              <h3 className="text-lg font-black text-slate-900">Chưa tải được danh sách khóa học</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Kết nối đang gặp trục trặc. Thử tải lại để tiếp tục tìm lộ trình MC phù hợp.</p>
              <button type="button" onClick={() => void coursesQuery.refetch()} className="mt-5 rounded-full bg-[#0754ef] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Tải lại danh sách</button>
            </div>
          ) : displayedCourses.length === 0 ? (
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
                  onClick={() => {
                    setCurrentPage(i + 1);
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }}
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
