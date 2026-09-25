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
  FileText,
  Calendar,
  AlertCircle,
  Send,
  RefreshCw,
} from 'lucide-react';
import { AdminCourse, CourseModerationStatus } from '../types/adminTypes';

interface AdminCoursesTabProps {
  courses: AdminCourse[];
  onReviewCourse: (course: AdminCourse) => void;
  onApproveCourse: (courseId: string) => void;
  onRejectCourse: (courseId: string, reason: string) => void;
  onToggleFeatured: (courseId: string, currentFeatured: boolean) => void;
  onRefresh?: () => void;
}

export const AdminCoursesTab: React.FC<AdminCoursesTabProps> = ({
  courses,
  onReviewCourse,
  onApproveCourse,
  onRejectCourse,
  onToggleFeatured,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'approved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const pendingCourses = courses.filter((c) => c.status === 'pending');
  const approvedCourses = courses.filter((c) => c.status === 'published');

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeSubTab === 'pending') {
      return matchesSearch && c.status === 'pending';
    }
    return matchesSearch && c.status === 'published';
  });

  const formatDate = (iso?: string) => {
    if (!iso) return 'N/A';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleConfirmReject = (courseId: string) => {
    if (!rejectReason.trim()) return;
    onRejectCourse(courseId, rejectReason.trim());
    setRejectingCourseId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            <span>Kiểm Duyệt & Quản Lý Khóa Học</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Hệ thống duyệt 2 tầng dành riêng cho Admin: Xem xét khóa học mới/cập nhật từ Giảng viên, đọc ghi chú và mốc thời gian trước khi phê duyệt.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang làm mới...' : 'Làm mới danh sách'}</span>
          </button>
        )}
      </div>

      {/* 2 Main View Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-semibold text-sm transition cursor-pointer ${
            activeSubTab === 'pending'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Khóa học Chưa Duyệt</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 font-bold">
            {pendingCourses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('approved')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-semibold text-sm transition cursor-pointer ${
            activeSubTab === 'approved'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Khóa học Đã Duyệt</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
            {approvedCourses.length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
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
      </div>

      {/* Table Content */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Tên Khóa Học</th>
                <th className="px-6 py-4">Giảng Viên</th>
                <th className="px-6 py-4">Ghi Chú Giảng Viên</th>
                <th className="px-6 py-4">Mốc Thời Gian</th>
                {activeSubTab === 'approved' && <th className="px-6 py-4">Nổi Bật</th>}
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Chưa có khóa học nào trong danh mục này.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-800/40 transition">
                    {/* Course Title & Category */}
                    <td className="px-6 py-4 max-w-xs">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          {course.category}
                        </span>
                        <p className="font-semibold text-white text-sm line-clamp-2 mt-1">
                          {course.title}
                        </p>
                        <p className="text-xs font-bold text-amber-400 mt-1">
                          {course.price ? `${course.price.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                        </p>
                      </div>
                    </td>

                    {/* Instructor Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-200">{course.instructorName}</p>
                          <p className="text-[11px] text-slate-500">{course.instructorEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Submission Note */}
                    <td className="px-6 py-4 max-w-xs">
                      {course.submissionNote ? (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 text-xs flex items-start space-x-2">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span className="italic line-clamp-2">{course.submissionNote}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Không có ghi chú</span>
                      )}
                    </td>

                    {/* Timestamps */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Gửi: {formatDate(course.submittedAt || course.submittedDate)}</span>
                      </div>
                      {course.approvedAt && (
                        <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>Duyệt: {formatDate(course.approvedAt)}</span>
                        </div>
                      )}
                      {course.approvedByName && (
                        <p className="text-[10px] text-slate-500">Bởi Admin: {course.approvedByName}</p>
                      )}
                    </td>

                    {/* Featured toggle for approved courses */}
                    {activeSubTab === 'approved' && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onToggleFeatured(course.id, !!course.featured)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            course.featured
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title="Đánh dấu Khóa học Nổi bật"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onReviewCourse(course)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Xem chi tiết</span>
                        </button>

                        {course.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onApproveCourse(course.id)}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Duyệt ngay</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingCourseId(course.id);
                                setRejectReason('');
                              }}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Từ chối</span>
                            </button>
                          </>
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

      {/* Reject Modal with Reason Input */}
      {rejectingCourseId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>Nhập lý do từ chối khóa học</span>
            </div>
            <p className="text-xs text-slate-400">
              Lý do này sẽ được gửi tới Giảng viên để họ biết thông tin cụ thể và tiến hành chỉnh sửa lại.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Video bài 2 bị lỗi âm thanh, thông tin mô tả chưa đầy đủ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectingCourseId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={() => handleConfirmReject(rejectingCourseId)}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi phản hồi từ chối</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
