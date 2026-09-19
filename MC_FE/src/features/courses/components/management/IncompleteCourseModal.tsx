import React from 'react';
import { AlertTriangle, BookOpen, Layers, X, ArrowRight } from 'lucide-react';

interface IncompleteCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseId: number;
  missingItems: string[];
  onGoToLessons: () => void;
}

export const IncompleteCourseModal: React.FC<IncompleteCourseModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  courseId,
  missingItems,
  onGoToLessons,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 transition-all">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-5 border-b border-amber-100/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Chưa thể gửi Admin duyệt</h3>
              <p className="text-xs font-medium text-amber-700/90 line-clamp-1">
                Khóa học: {courseTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-amber-700/60 hover:bg-amber-100 hover:text-amber-900 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Để gửi duyệt bài thành công, khóa học phải có đầy đủ tên khóa học, mô tả, các Chương học (Module) và các Bài học (Lesson).
          </p>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2.5">
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Các phần còn thiếu ({missingItems.length}):
            </p>
            <ul className="space-y-2">
              {missingItems.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                    ✕
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onGoToLessons}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all cursor-pointer"
          >
            <span>Bổ sung Chương & Bài học</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
