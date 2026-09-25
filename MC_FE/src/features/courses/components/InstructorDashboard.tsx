// =============================================================================
// InstructorDashboard.tsx  —  Main Overview Dashboard for Instructors
// =============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  FileEdit,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Layers,
  Video,
  Eye,
  Settings,
  Star,
} from 'lucide-react';
import { useInstructorCourses } from '../hooks/useInstructorCourses';
import { useAuthStore } from '../../../store/useAuthStore';
import { ImportCourseModal } from './management/ImportCourseModal';

export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Logged in user info
  const user = useAuthStore((state) => state.user);

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Fetch real instructor courses
  const { data: pageData, isLoading, refetch } = useInstructorCourses({
    page: 1,
    limit: 100,
  });

  const courses = pageData?.data ?? [];
  const totalCount = pageData?.pagination?.total ?? courses.length;

  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;

  // Calculate total course value / tuition sum
  const totalRevenueVnd = courses.reduce((sum, c) => sum + (c.price || 0), 0);

  // Format currency helper (VNĐ)
  const formatVND = (price?: number) => {
    if (!price || price === 0) return 'Miễn phí';
    return `${price.toLocaleString('vi-VN')} ₫`;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 font-sans">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar || 'https://ui-avatars.com/api/?name=Instructor&background=2563eb&color=fff'}
                alt={user?.name || 'Giảng viên'}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-400/40 shadow-lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Xin chào, {user?.name || 'Giảng viên'}!
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    Giảng viên Chuyên nghiệp
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Chào mừng bạn quay trở lại. Tổng quan hoạt động đào tạo và các khóa học của bạn hôm nay.
                </p>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-300" />
                <span>Nhập CSV / Excel</span>
              </button>
              <button
                onClick={() => navigate('/instructor/courses/new')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Tạo khóa học mới</span>
              </button>
            </div>
          </div>

          {/* ── Metric Cards Row (6 Cards) ── */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Tổng khóa học</span>
                <div className="h-7 w-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{isLoading ? '...' : totalCount}</p>
              <p className="text-[10px] text-blue-200/80 mt-1">Đang quản lý</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Đã xuất bản</span>
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-300">{isLoading ? '...' : publishedCount}</p>
              <p className="text-[10px] text-emerald-200/80 mt-1">Công khai học viên</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Chưa xuất bản</span>
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <FileEdit className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-amber-300">{isLoading ? '...' : draftCount}</p>
              <p className="text-[10px] text-amber-200/80 mt-1">Bản nháp đang lưu</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Giá trị các khóa</span>
                <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-lg font-black text-purple-200 truncate">{isLoading ? '...' : formatVND(totalRevenueVnd)}</p>
              <p className="text-[10px] text-purple-200/80 mt-1">Tổng học phí gốc</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Người tham gia</span>
                <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-cyan-200">
                {isLoading ? '...' : courses.reduce((sum, c) => sum + (c.studentsCount || c.studentCount || 0), 0)}
              </p>
              <p className="text-[10px] text-cyan-200/80 mt-1">Tổng lượt đăng ký</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Doanh thu tạm tính</span>
                <div className="h-7 w-7 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2 text-lg font-black text-pink-200 truncate">
                {isLoading ? '...' : formatVND(courses.reduce((sum, c) => sum + ((c.studentsCount || c.studentCount || 0) * (c.price || 0)), 0))}
              </p>
              <p className="text-[10px] text-pink-200/80 mt-1">Từ các khóa học đã bán</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Body ── */}
      <div className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/instructor/courses')}
            className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  Quản lý danh sách khóa học
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xem chi tiết, chỉnh sửa học phí, trạng thái xuất bản
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => navigate('/instructor/courses/new')}
            className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                  Tạo khóa học mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập tiêu đề, danh mục, giá bán và mô tả
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                  Nhập nhanh qua CSV / Excel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tải lên chương và bài học tự động hàng loạt
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* ── Recent Courses Table Section ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <span>Danh sách khóa học gần đây</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiển thị các khóa học mới cập nhật trong hệ thống của bạn
              </p>
            </div>

            <button
              onClick={() => navigate('/instructor/courses')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span>Xem tất cả ({totalCount})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-xs font-medium">Đang tải dữ liệu khóa học...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Chưa có khóa học nào</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bắt đầu bằng cách bấm nút bên dưới để tạo hoặc nhập khóa học đầu tiên của bạn.
              </p>
              <button
                onClick={() => navigate('/instructor/courses/new')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <PlusCircle className="h-4 w-4" />
                Tạo khóa học ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 px-4">Khóa học</th>
                    <th className="pb-3 px-4">Danh mục</th>
                    <th className="pb-3 px-4">Học phí (VNĐ)</th>
                    <th className="pb-3 px-4">Học viên</th>
                    <th className="pb-3 px-4">Trạng thái</th>
                    <th className="pb-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {courses.slice(0, 6).map((c) => (
                    <tr key={c.courseId} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => navigate(`/instructor/courses/${c.courseId}/lessons`)}
                          title="Bấm để xem chi tiết & bài học"
                          className="flex items-center gap-3 cursor-pointer group/item"
                        >
                          <img
                            src={c.thumbnailUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=120&h=80&fit=crop'}
                            alt={c.title}
                            className="h-10 w-14 rounded-lg object-cover border border-slate-200 shrink-0 group-hover/item:scale-105 transition-transform duration-300"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover/item:text-blue-600 transition-colors line-clamp-1">
                              {c.title}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              Trình độ: {c.level || 'Tất cả trình độ'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {c.categoryName || 'Chưa phân loại'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatVND(c.price)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                          <Users className="h-3.5 w-3.5 text-cyan-600" />
                          <span>{c.studentsCount || c.studentCount || 0} học viên</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {c.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Đã xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <FileEdit className="h-3 w-3" /> Bản nháp
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/instructor/courses/${c.courseId}/edit`)}
                          title="Chỉnh sửa khóa học"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => navigate(`/instructor/courses/${c.courseId}/learn`)}
                          title="Xem giao diện học"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

export default InstructorDashboard;
