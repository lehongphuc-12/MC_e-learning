
import React, { useState } from 'react';
import {
  X, Users, Search, CheckCircle2, Clock, Mail,
  Calendar, RefreshCw, AlertCircle
} from 'lucide-react';
import { useCourseStudents } from '../../../payment/hooks/useCourseStudents';

interface CourseStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle?: string;
}

export const CourseStudentsModal: React.FC<CourseStudentsModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const validCourseId = Number.isInteger(courseId) && courseId > 0;

  const {
    data: students = [],
    isLoading,
    isError,
    refetch,
  } = useCourseStudents(courseId, isOpen && validCourseId);

  if (!isOpen) return null;

  const keyword = searchQuery.trim().toLowerCase();

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(keyword) ||
    student.email.toLowerCase().includes(keyword)
  );

  const formatDate = (date: string | null) => {
    if (!date) return 'Chưa cập nhật';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? 'Chưa cập nhật'
      : parsed.toLocaleDateString('vi-VN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-500/20 text-blue-200 rounded-2xl border border-blue-400/30">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg">Danh Sách Học Viên Ghi Danh</h3>
              <p className="text-xs text-blue-100/80 truncate">
                {courseTitle ? `Khóa: ${courseTitle}` : 'Quản lý học viên khóa học'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!validCourseId || isLoading}
              title="Làm mới danh sách"
              className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <span className="font-semibold text-slate-700">Tổng cộng:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 whitespace-nowrap">
              {isLoading ? 'Đang tải...' : !validCourseId || isError ? 'Không khả dụng' : `${filteredStudents.length} / ${students.length} học viên`}
            </span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-[250px]">
          {!validCourseId ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
              <p className="text-sm font-bold text-amber-700">Không xác định được khóa học</p>
              <p className="text-xs text-slate-500 mt-2">Trang quản lý chưa truyền courseId hợp lệ vào modal.</p>
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-9 h-9 mx-auto text-blue-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-600">Đang tải danh sách học viên...</p>
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
              <p className="text-sm font-semibold text-rose-600">Không thể tải danh sách học viên.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                {keyword ? 'Không tìm thấy học viên phù hợp' : 'Khóa học chưa có học viên đang hoạt động'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {keyword ? 'Thử tìm kiếm bằng từ khóa khác.' : 'Chưa có dữ liệu ghi danh đang hoạt động từ hệ thống.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Học viên</th>
                    <th className="pb-3 px-3">Ngày tham gia</th>
                    <th className="pb-3 px-3">Tiến độ học</th>
                    <th className="pb-3 px-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const progress = Math.max(0, Math.min(100, Number(student.completionPercentage) || 0));
                    const completed = progress >= 100;

                    return (
                      <tr key={student.enrollmentId} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {student.avatarUrl ? (
                              <img src={student.avatarUrl} alt={student.fullName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                                {student.fullName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">{student.fullName}</p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" /> {student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(student.enrolledAt)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 w-44">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700">{progress}%</span>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {completed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                              <Clock className="w-3 h-3" /> Đang học
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[11px] text-slate-400 italic">Dữ liệu Enrollment thực tế từ hệ thống</p>
          <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 bg-white border border-slate-200 rounded-xl transition cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
