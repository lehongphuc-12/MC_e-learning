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

interface CourseCatalogScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  wishlistCourseIds: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'price-low' | 'price-high' | 'newest'>('popular');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  const coursesQuery = useCoursesQuery();
  const allCourses = coursesQuery.data || [];

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

      if (selectedCategory !== 'All' && !course.category.includes(selectedCategory)) {
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

  const categoryOptions = [
    'All',
    'MC & Event Hosting',
    'Public Speaking & Keynotes',
    'Wedding & Gala MCing',
    'Presentation & Pitch Mastery',
    'Storytelling for Leaders',
    'Voice, Diction & Body Language',
  ];

  return (
    <div id="course-catalog-screen" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600">Home</button>
          <span>/</span>
          <span className="text-slate-900 font-bold">Course Catalog</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Explore Masterclasses</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Discover {filteredCourses.length} comprehensive communication courses led by elite industry hosts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort by:
            </span>
            <select
              id="sort-courses-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Sidebar */}
        <aside id="catalog-filters-sidebar" className="lg:col-span-3 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Filters</h3>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Reset All
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Search Keywords</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="e.g. Wedding, Keynote..."
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
            <label className="text-xs font-bold text-slate-700">Category</label>
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
                  <span className="truncate">{cat}</span>
                  {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Skill Level</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    selectedLevel === lvl
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Minimum Rating</label>
            <div className="space-y-1.5">
              {[
                { val: 4.8, label: '4.8 ★ & above' },
                { val: 4.5, label: '4.5 ★ & above' },
                { val: 0, label: 'Show All Ratings' },
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
            <label className="text-xs font-bold text-slate-700">Pricing</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'free', label: 'Free' },
                { id: 'paid', label: 'Paid' },
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
        <main className="lg:col-span-9 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('All')}><X className="w-3 h-3 hover:text-blue-900" /></button>
              </span>
            )}
            {selectedLevel !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                Level: {selectedLevel}
                <button onClick={() => setSelectedLevel('All')}><X className="w-3 h-3 hover:text-blue-900" /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200">
                Rating: {minRating}+ ★
                <button onClick={() => setMinRating(0)}><X className="w-3 h-3 hover:text-amber-900" /></button>
              </span>
            )}
            {priceFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
                Price: {priceFilter.toUpperCase()}
                <button onClick={() => setPriceFilter('all')}><X className="w-3 h-3 hover:text-slate-900" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
                "{searchQuery}"
                <button onClick={() => onSearchChange('')}><X className="w-3 h-3 hover:text-slate-900" /></button>
              </span>
            )}
          </div>

          {displayedCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No masterclasses found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search keywords or resetting your filter criteria to discover other masterclasses.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
