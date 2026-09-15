// =============================================================================
// CourseManagementPage.tsx  —  Main Instructor/Admin Dashboard for Courses
// =============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlusCircle, RefreshCw, CheckCircle2, FileEdit, Sparkles, FileSpreadsheet } from 'lucide-react';
import { CourseListView } from './CourseListView';
import { CourseFilterBar } from './CourseFilterBar';
import { ImportCourseModal } from './ImportCourseModal';
import {
  useInstructorCourses,
  useAdminCourses,
  useCategoriesQuery,
} from '../../hooks/useInstructorCourses';
import type { CourseListParams } from '../../types/courseTypes';
import { useAuthStore } from '../../../../store/useAuthStore';

export const CourseManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Read the logged-in user's role from Zustand auth store
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // Modal import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [queryParams, setQueryParams] = useState<CourseListParams>({
    page: 1,
    limit: 10,
  });

  // ── Data fetching — branch on role ────────────────────────────────────────
  const instructorQuery = useInstructorCourses(queryParams, !isAdmin);
  const adminQuery      = useAdminCourses(queryParams, isAdmin);

  const { data: pageData, isLoading, isError, refetch } = isAdmin
    ? adminQuery
    : instructorQuery;

  const { data: categories = [] } = useCategoriesQuery();

  // ── Derived stats ────────────────────────────────────────────────────────
  const courses    = pageData?.data        ?? [];
  const totalPages = pageData?.pagination?.totalPages ?? 1;
  const totalCount = pageData?.pagination?.total      ?? 0;

  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* ── Page Hero Header ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden">
        {/* Background decorative glow elements */}
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/3 -bottom-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
                <BookOpen className="h-7 w-7 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {isAdmin ? 'Quản lý toàn bộ khóa học' : 'Quản lý khóa học của tôi'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-400/30">
                    <Sparkles className="h-3 w-3" />
                    Giảng viên
                  </span>
                </div>
                <p className="mt-1 text-sm text-blue-100/80">
                  {isAdmin
                    ? 'Xem, duyệt và quản lý toàn bộ hệ thống khóa học trên nền tảng'
                    : 'Tạo mới, chỉnh sửa nội dung và theo dõi trạng thái các khóa học của bạn'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            {!isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  id="import-csv-header-btn"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5 text-blue-300" />
                  Nhập CSV / Excel
                </button>
                <button
                  id="create-course-header-btn"
                  onClick={() => navigate('/instructor/courses/new')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-400 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <PlusCircle className="h-5 w-5" />
                  Tạo khóa học mới
                </button>
              </div>
            )}
          </div>

          {/* Stat Cards Row */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-blue-200/80 font-medium">Tổng số khóa học</p>
                <p className="text-xl font-bold text-white">{totalCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-blue-200/80 font-medium">Đã xuất bản (Trang này)</p>
                <p className="text-xl font-bold text-emerald-300">{publishedCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                <FileEdit className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-blue-200/80 font-medium">Bản nháp (Trang này)</p>
                <p className="text-xl font-bold text-amber-300">{draftCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Body ── */}
      <div className="mx-auto max-w-7xl space-y-6 px-6 pt-6">
        {/* Filter bar */}
        <CourseFilterBar
          categories={categories}
          onFilterChange={(filters) =>
            setQueryParams((prev) => ({ ...prev, ...filters }))
          }
        />

        {/* Error state alert */}
        {isError && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 backdrop-blur-sm px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-red-700">
              Không thể tải danh sách khóa học. Vui lòng kiểm tra lại kết nối mạng và thử lại.
            </p>
            <button
              id="courses-retry-btn"
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 active:scale-95 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* Main table */}
        <CourseListView
          courses={courses}
          totalPages={totalPages}
          currentPage={queryParams.page ?? 1}
          isLoading={isLoading}
          params={queryParams}
          onPageChange={(page) => setQueryParams((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Import CSV Modal */}
      <ImportCourseModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
