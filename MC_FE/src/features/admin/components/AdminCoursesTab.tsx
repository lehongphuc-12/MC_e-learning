import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  User,
  Clock,
} from 'lucide-react';
import { AdminCourse, CourseModerationStatus } from '../types/adminTypes';

interface AdminCoursesTabProps {
  courses: AdminCourse[];
  onReviewCourse: (course: AdminCourse) => void;
  onApproveCourse: (courseId: string) => void;
  onRejectCourse: (courseId: string, reason: string) => void;
  onToggleFeatured: (courseId: string, currentFeatured: boolean) => void;
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({
  courses,
  onReviewCourse,
  onApproveCourse,
  onToggleFeatured,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseModerationStatus>('all');

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: CourseModerationStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Đã Xuất Bản
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3 mr-1" /> Chờ Duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3 mr-1" /> Đã Từ Chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400">
            Bản Nháp
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-purple-400" />
          <span>Kiểm Duyệt & Quản Lý Khóa Học</span>
        </h1>
        <p className="text-sm text-slate-400">
          Xem xét nội dung bài giảng do Giảng viên gửi lên, phê duyệt xuất bản hoặc yêu cầu chỉnh sửa.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên khóa học, giảng viên hoặc thể loại..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({courses.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chờ duyệt ({courses.filter((c) => c.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'published'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đã xuất bản
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'rejected'
                ? 'bg-rose-500/20 text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Từ chối
          </button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Tên Khóa Học</th>
                <th className="px-6 py-4">Giảng Viên</th>
                <th className="px-6 py-4">Học Phí</th>
                <th className="px-6 py-4">Trạng Thái Duyệt</th>
                <th className="px-6 py-4">Nổi Bật (Featured)</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Không có khóa học nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 max-w-xs">
                      <div>
                        <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          {course.category}
                        </span>
                        <p className="font-semibold text-white text-sm line-clamp-2 mt-1">
                          {course.title}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-200">{course.instructorName}</p>
                          <p className="text-[11px] text-slate-500">{course.instructorEmail}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {course.price ? `${course.price.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(course.status)}</td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => onToggleFeatured(course.id, !!course.featured)}
                        className={`p-1.5 rounded-lg border transition ${
                          course.featured
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                        }`}
                        title="Đánh dấu Khóa học Nổi bật"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onReviewCourse(course)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Chi tiết & Duyệt</span>
                        </button>
                        {course.status === 'pending' && (
                          <button
                            onClick={() => onApproveCourse(course.id)}
                            className="p-1.5 rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                            title="Phê duyệt nhanh"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
