// =============================================================================
// CourseFilterBar.tsx  —  Status / Search / Category filter controls
//
// WHY local state for filters + lifting up via onChange?
//   The filter values are transient UI state (not server state), so they live
//   here as useState. The parent (CourseListView) receives the final filter
//   object and passes it to useInstructorCourses() which makes the API call.
//   This separation keeps each component focused on one responsibility.
// =============================================================================

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Category, CourseListParams, CourseStatus } from '../../types/courseTypes';

interface CourseFilterBarProps {
  categories: Category[];
  onFilterChange: (params: CourseListParams) => void;
}

export const CourseFilterBar: React.FC<CourseFilterBarProps> = ({
  categories,
  onFilterChange,
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CourseStatus | ''>('');
  const [categoryId, setCategoryId] = useState<string>('');

  // Propagate all filter values to parent on every change
  const applyFilters = (
    newSearch = search,
    newStatus: CourseStatus | '' = status,
    newCategoryId = categoryId
  ) => {
    onFilterChange({
      search: newSearch || undefined,
      status: (newStatus as CourseStatus) || undefined,
      categoryId: newCategoryId ? Number(newCategoryId) : undefined,
      page: 1, // Reset to page 1 whenever filters change
    });
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setCategoryId('');
    onFilterChange({ page: 1 });
  };

  const hasActiveFilters = search || status || categoryId;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 backdrop-blur-sm transition-all">
      {/* Search input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          id="course-search-input"
          type="text"
          placeholder="Tìm kiếm theo tên khóa học..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            applyFilters(e.target.value);
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
        />
      </div>

      {/* Status filter */}
      <select
        id="course-status-filter"
        value={status}
        onChange={(e) => {
          const val = e.target.value as CourseStatus | '';
          setStatus(val);
          applyFilters(search, val);
        }}
        className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all cursor-pointer"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="DRAFT">Bản nháp</option>
        <option value="PUBLISHED">Đã xuất bản</option>
        <option value="ARCHIVED">Đã lưu trữ</option>
      </select>

      {/* Category filter */}
      <select
        id="course-category-filter"
        value={categoryId}
        onChange={(e) => {
          setCategoryId(e.target.value);
          applyFilters(search, status, e.target.value);
        }}
        className="rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 px-3.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all cursor-pointer"
      >
        <option value="">Tất cả danh mục</option>
        {categories.map((cat) => (
          <option key={cat.categoryId} value={cat.categoryId}>
            {cat.categoryName}
          </option>
        ))}
      </select>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          id="course-filter-clear-btn"
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
};
