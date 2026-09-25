import React, { useState } from 'react';
import { X, CheckCircle, XCircle, BookOpen, User, Tag, DollarSign, Layers, Video, FileText, Play, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { AdminCourse } from '../../types/adminTypes';
import { useCourseModules } from '../../../courses/hooks/useModuleQueries';

interface CourseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: AdminCourse | null;
  onApprove: (courseId: string) => void;
  onReject: (courseId: string, reason: string) => void;
  onHide?: (courseId: string) => void;
  onUnhide?: (courseId: string) => void;
}

export const CourseReviewModal: React.FC<CourseReviewModalProps> = ({
  isOpen,
  onClose,
  course,
  onApprove,
  onReject,
  onHide,
  onUnhide,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [showUnhideConfirm, setShowUnhideConfirm] = useState(false);

  const numericCourseId = course ? Number(course.id) : 0;
  const { data: modules, isLoading: isModulesLoading } = useCourseModules(numericCourseId);

  if (!isOpen || !course) return null;

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    onReject(course.id, rejectReason.trim());
    setShowRejectForm(false);
    setRejectReason('');
    onClose();
  };

  return (
    <>
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

            {/* Instructor Submission Note Box */}
            {course.submissionNote && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-amber-200 text-xs">
                <div className="flex items-center space-x-2 font-bold text-amber-400 text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>Ghi chú thay đổi từ Giảng viên:</span>
                </div>
                <p className="italic text-slate-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-amber-500/20 mt-1">
                  "{course.submissionNote}"
                </p>
              </div>
            )}

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
                    {modules ? `${modules.length} Chương` : (course.sectionsCount ? `${course.sectionsCount} Chương` : 'Chưa cập nhật')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Tag className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-400">Mốc thời gian gửi duyệt</p>
                  <p className="font-medium text-amber-300">{course.submittedAt || course.submittedDate}</p>
                  {course.approvedAt && (
                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                      Đã duyệt: {course.approvedAt}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Course Curriculum (Modules & Lessons Inspection) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  <span>Nội dung chương học & bài giảng ({modules?.length || 0} Chương)</span>
                </h4>
                {isModulesLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              </div>

              {modules && modules.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {modules.map((mod, index) => (
                    <div key={mod.moduleId} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-xs text-blue-300">
                        <span>Chương {index + 1}: {mod.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{mod.lessons?.length || 0} bài học</span>
                      </div>
                      {mod.lessons && mod.lessons.length > 0 ? (
                        <ul className="space-y-1 pl-2 border-l border-slate-800 text-xs">
                          {mod.lessons.map((les) => (
                            <li key={les.lessonId} className="flex items-center justify-between text-slate-300 py-1.5 px-2.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/60 transition">
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{les.title}</span>
                                {les.videoUrl && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    Video MP4
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 shrink-0 text-[11px] text-slate-500">
                                {les.videoUrl && (
                                  <a href={les.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                    <Play className="w-3 h-3" /> Xem video
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic pl-2">Chưa có bài học nào trong chương này</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-500 italic">
                  {isModulesLoading ? 'Đang tải danh sách bài học...' : 'Khóa học này chưa được khởi tạo chương & bài học nào.'}
                </div>
              )}
            </div>

            {/* Curriculum Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tiêu chuẩn kiểm duyệt nội dung
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Video tải lên có chất lượng rõ ràng, âm thanh chuẩn.</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Bài học không vi phạm bản quyền hoặc chứa nội dung nhạy cảm.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
            {course.status === 'pending' ? (
              <>
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
              </>
            ) : course.status === 'published' ? (
              <>
                <div />
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => setShowHideConfirm(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition cursor-pointer"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>Ẩn khóa học</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => setShowUnhideConfirm(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Xuất bản lại</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Standalone Modal Popup for Hide Confirmation */}
      {showHideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Ẩn khóa học này?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Khóa học sẽ không còn xuất hiện trong danh sách công khai và học viên mới không thể đăng ký. Học viên đã đăng ký vẫn có thể tiếp tục học.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowHideConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onHide?.(course.id);
                  setShowHideConfirm(false);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                Ẩn khóa học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Modal Popup for Unhide Confirmation */}
      {showUnhideConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Xuất bản lại khóa học?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Khóa học sẽ xuất hiện trở lại trong danh sách công khai và học viên mới có thể thấy và đăng ký.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowUnhideConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onUnhide?.(course.id);
                  setShowUnhideConfirm(false);
                  onClose();
                }}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                Xuất bản lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Modal Popup for Reject Confirmation */}
      {showRejectForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Từ chối khóa học</h3>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">
                Lý do từ chối khóa học
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết để gửi cho Giảng viên khắc phục..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRejectForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

