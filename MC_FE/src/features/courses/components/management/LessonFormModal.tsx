// =============================================================================
// LessonFormModal.tsx  —  Create / Edit Single Lesson Dialog
// =============================================================================

import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Video, FileText, HelpCircle, Mic2 } from 'lucide-react';
import type { Lesson, CreateLessonDto } from '../../types/lessonTypes';

import type { CourseModule } from '../../types/moduleTypes';

interface LessonFormModalProps {
  isOpen: boolean;
  existingLesson?: Lesson | null;
  modules?: CourseModule[];
  defaultModuleId?: number | null;
  defaultLessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateLessonDto) => void;
}

export const LessonFormModal: React.FC<LessonFormModalProps> = ({
  isOpen,
  existingLesson,
  modules = [],
  defaultModuleId,
  defaultLessonType,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditMode = !!existingLesson;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [lessonType, setLessonType] = useState<'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT'>('VIDEO');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingLesson) {
      setTitle(existingLesson.title);
      setDescription(existingLesson.description ?? '');
      setVideoUrl(existingLesson.videoUrl ?? '');
      setModuleId(existingLesson.moduleId ?? null);
      setLessonType(existingLesson.lessonType || 'VIDEO');
      setDurationMinutes(existingLesson.durationMinutes);
      setOrderIndex(existingLesson.orderIndex);
      setIsPreview(existingLesson.isPreview);
    } else {
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setModuleId(defaultModuleId ?? (modules.length > 0 ? modules[0].moduleId : null));
      setLessonType(defaultLessonType || 'VIDEO');
      setDurationMinutes(10);
      setOrderIndex(1);
      setIsPreview(false);
    }
    setErrorMsg(null);
  }, [existingLesson, isOpen, defaultModuleId, defaultLessonType, modules]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Tên bài học / bài tập không được để trống.');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      moduleId: lessonType === 'ASSIGNMENT' ? undefined : (moduleId ?? undefined),
      lessonType,
      durationMinutes: Number(durationMinutes) || 0,
      orderIndex: Number(orderIndex) || 1,
      isPreview,
      status: 'ACTIVE',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner ${lessonType === 'ASSIGNMENT'
              ? 'bg-purple-100 text-purple-600'
              : 'bg-blue-100 text-blue-600'
              }`}>
              {lessonType === 'ASSIGNMENT' ? <Mic2 className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode
                  ? lessonType === 'ASSIGNMENT' ? 'Chỉnh sửa Bài tập nói tổng khóa' : 'Chỉnh sửa bài học'
                  : lessonType === 'ASSIGNMENT' ? 'Tạo Bài tập nói (Speaking Assignment)' : 'Thêm bài học mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {lessonType === 'ASSIGNMENT'
                  ? 'Cấu hình đề bài tập thu âm giọng nói dành cho học viên cuối khóa học'
                  : 'Nhập thông tin bài giảng video hoặc tài liệu học tập'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Row: Module Select & Lesson Type (Only for non-ASSIGNMENT) */}
          {lessonType !== 'ASSIGNMENT' && (
            <div className={`grid grid-cols-1 ${modules.length > 0 ? 'sm:grid-cols-2' : ''} gap-4`}>
              {/* Module Select */}
              {modules.length > 0 && (
                <div>
                  <label htmlFor="lesson-module" className="block text-xs font-bold text-slate-700 mb-1">
                    Chương học (Module)
                  </label>
                  <select
                    id="lesson-module"
                    value={moduleId ?? ''}
                    onChange={(e) => setModuleId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
                  >
                    <option value="">-- Chưa phân vào chương --</option>
                    {modules.map((m) => (
                      <option key={m.moduleId} value={m.moduleId}>
                        Chương {m.orderIndex}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lesson Type Select */}
              <div>
                <label htmlFor="lesson-type" className="block text-xs font-bold text-slate-700 mb-1">
                  Loại bài học / Bài tập
                </label>
                <select
                  id="lesson-type"
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all font-semibold"
                >
                  <option value="VIDEO">📹 Video bài giảng</option>
                  <option value="DOCUMENT">📄 Tài liệu lý thuyết</option>
                  <option value="QUIZ">❓ Bài kiểm tra Quiz</option>
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="lesson-title" className="block text-xs font-bold text-slate-700 mb-1">
              {lessonType === 'ASSIGNMENT' ? 'Tên Bài tập nói tổng khóa' : 'Tên bài học'} <span className="text-red-500">*</span>
            </label>
            <input
              id="lesson-title"
              type="text"
              placeholder={
                lessonType === 'ASSIGNMENT'
                  ? 'Ví dụ: Bài tập nói cuối khóa: Biên soạn & Dẫn trực tiếp tiệc cưới'
                  : 'Ví dụ: Bài 1 - Kỹ thuật lấy hơi bụng và kiểm soát giọng nói'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
            />
          </div>

          {/* Video URL or Audio Guide */}
          <div>
            <label htmlFor="lesson-videourl" className="block text-xs font-bold text-slate-700 mb-1">
              {lessonType === 'ASSIGNMENT'
                ? 'Link Audio phát mẫu / Video hướng dẫn đề bài (tùy chọn)'
                : 'Đường dẫn Video bài giảng (URL MP4, Youtube, Vimeo, Cloudinary)'}
            </label>
            <input
              id="lesson-videourl"
              type="url"
              placeholder={
                lessonType === 'ASSIGNMENT'
                  ? 'https://res.cloudinary.com/.../audio_mau.mp3'
                  : 'https://www.youtube.com/watch?v=... hoặc link video mp4'
              }
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
            />
          </div>

          {/* Description / Prompt */}
          <div>
            <label htmlFor="lesson-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {lessonType === 'ASSIGNMENT' ? 'Đề bài / Yêu cầu thu âm (Nội dung học viên sẽ đọc để ghi âm)' : 'Mô tả ngắn bài học'}
            </label>
            <textarea
              id="lesson-desc"
              rows={4}
              placeholder={
                lessonType === 'ASSIGNMENT'
                  ? 'Ví dụ: Kính thưa quan khách hai họ, lời đầu tiên cho phép MC Hoàng Nam gửi lời chào trân trọng nhất. Đề nghị học viên đọc đoạn kịch bản này với giọng ấm áp, vừa phải trong khoảng 2 phút...'
                  : 'Nội dung chính học viên sẽ thu hoạch được sau bài học này...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all resize-none"
            />
          </div>

          {/* Row: Duration & OrderIndex */}
          <div className={`grid ${lessonType === 'ASSIGNMENT' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div>
              <label htmlFor="lesson-duration" className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng (Phút)
              </label>
              <input
                id="lesson-duration"
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
              />
            </div>

            {lessonType !== 'ASSIGNMENT' && (
              <div>
                <label htmlFor="lesson-order" className="block text-xs font-bold text-slate-700 mb-1">
                  Thứ tự bài học (#)
                </label>
                <input
                  id="lesson-order"
                  type="number"
                  min="1"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
                />
              </div>
            )}
          </div>

          {/* IsPreview Checkbox (Only for non-ASSIGNMENT) */}
          {lessonType !== 'ASSIGNMENT' && (
            <div className="flex items-center gap-3 pt-2">
              <input
                id="lesson-ispreview"
                type="checkbox"
                checked={isPreview}
                onChange={(e) => setIsPreview(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="lesson-ispreview" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Cho phép học viên xem thử miễn phí (Free Preview)
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer ${
                lessonType === 'ASSIGNMENT'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode
                    ? (lessonType === 'ASSIGNMENT' ? 'Lưu Bài tập nói' : 'Lưu thay đổi')
                    : (lessonType === 'ASSIGNMENT' ? 'Tạo Bài tập nói' : 'Tạo bài học')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
