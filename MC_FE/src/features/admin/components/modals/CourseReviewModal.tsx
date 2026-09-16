import React, { useState } from 'react';
import { X, CheckCircle, XCircle, BookOpen, User, Tag, DollarSign, Layers } from 'lucide-react';
import { AdminCourse } from '../../types/adminTypes';

interface CourseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: AdminCourse | null;
  onApprove: (courseId: string) => void;
  onReject: (courseId: string, reason: string) => void;
}

export const CourseReviewModal: React.FC<CourseReviewModalProps> = ({
  isOpen,
  onClose,
  course,
  onApprove,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!isOpen || !course) return null;

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    onReject(course.id, rejectReason.trim());
    setShowRejectForm(false);
    setRejectReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Kiểm Duyệt Khóa Học</h3>
              <p className="text-xs text-slate-400">ID: {course.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <span className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md mb-2">
              {course.category}
            </span>
            <h2 className="text-xl font-bold text-white">{course.title}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/60 border border-slate-800 rounded-xl text-sm">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Giảng viên</p>
                <p className="font-medium text-slate-200">{course.instructorName}</p>
                <p className="text-xs text-slate-500">{course.instructorEmail}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Học phí niêm yết</p>
                <p className="font-semibold text-emerald-400">
                  {course.price ? `${course.price.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Layers className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs text-slate-400">Cấu trúc bài học</p>
                <p className="font-medium text-slate-200">
                  {course.sectionsCount || 10} Chương • {course.lecturesCount || 60} Bài giảng
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs text-slate-400">Ngày gửi duyệt</p>
                <p className="font-medium text-slate-200">{course.submittedDate}</p>
              </div>
            </div>
          </div>

          {/* Curriculum Checklist */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tiêu chuẩn kiểm duyệt nội dung
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Video tải lên có chất lượng 1080p, âm thanh rõ ràng.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bài học không vi phạm bản quyền hoặc chứa nội dung nhạy cảm.</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Có tài liệu tham khảo và mô tả đề cương chi tiết.</span>
              </li>
            </ul>
          </div>

          {showRejectForm && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-rose-400 uppercase">
                Lý do từ chối khóa học
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết để gửi cho Giảng viên khắc phục..."
                className="w-full bg-slate-900 border border-rose-500/30 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg transition cursor-pointer"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!showRejectForm && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Từ Chối Duyệt</span>
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  onApprove(course.id);
                  onClose();
                }}
                className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Phê Duyệt & Xuất Bản</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
