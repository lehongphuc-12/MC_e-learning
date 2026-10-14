// =============================================================================
// LessonFormModal.tsx  —  Create / Edit Single Lesson Dialog
// Supports: enter a video URL  OR  upload a file directly to Cloudflare R2
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  X, Save, Loader2, Video, Mic2, FileText, ClipboardList,
  Upload, Link2, CheckCircle2, Trash2, CloudUpload,
} from 'lucide-react';
import type { Lesson, CreateLessonDto } from '../../types/lessonTypes';
import type { CourseModule } from '../../types/moduleTypes';
import { lessonApi } from '../../api/lessonApi';

// ─── Types ─────────────────────────────────────────────────────────────────

interface LessonFormModalProps {
  isOpen: boolean;
  existingLesson?: Lesson | null;
  modules?: CourseModule[];
  defaultModuleId?: number | null;
  defaultLessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  isSubmitting: boolean;
  onClose: () => void;
  /** Called with the metadata DTO (title, description, etc.) and optional attached file to upload. */
  onSubmit: (dto: CreateLessonDto, file?: File | null) => void;
  /** Optional: notify parent when a video has been uploaded to R2 directly (edit-mode only). */
  onVideoUploaded?: (updatedLesson: Lesson) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg',
  'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
];

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const LessonFormModal: React.FC<LessonFormModalProps> = ({
  isOpen,
  existingLesson,
  modules = [],
  defaultModuleId,
  defaultLessonType,
  isSubmitting,
  onClose,
  onSubmit,
  onVideoUploaded,
}) => {
  const isEditMode = !!existingLesson;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [lessonType, setLessonType] = useState<'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT'>('VIDEO');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Video upload state
  const [videoInputMode, setVideoInputMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Reset when modal opens / lesson changes ───────────────────────────

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
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadSuccess(false);
    setUploadError(null);
    setVideoInputMode('url');
  }, [existingLesson, isOpen, defaultModuleId, defaultLessonType, modules]);

  if (!isOpen) return null;

  // ─── File selection ────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setUploadError('Định dạng không hỗ trợ. Vui lòng chọn file video (mp4, webm, mov, avi, mkv).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File quá lớn (${formatBytes(file.size)}). Giới hạn tối đa là 500 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  // ─── Direct upload to R2 (edit mode only) ─────────────────────────────

  const handleUploadToR2 = async () => {
    if (!selectedFile || !existingLesson) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const updated = await lessonApi.uploadVideo(
        existingLesson.lessonId,
        selectedFile,
        (pct) => setUploadProgress(pct),
      );
      setUploadProgress(100);
      setUploadSuccess(true);
      setVideoUrl(updated.videoUrl ?? '');
      onVideoUploaded?.(updated);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload thất bại, vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Form submit (metadata only) ──────────────────────────────────────

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
    }, selectedFile);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  const isVideoLesson = lessonType === 'VIDEO' || lessonType === 'ASSIGNMENT';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 sticky top-0 bg-white z-10 rounded-t-3xl">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* ══════════════════════════════════════════════
              VIDEO / AUDIO SECTION
              ══════════════════════════════════════════════ */}
          {isVideoLesson && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lessonType === 'ASSIGNMENT' ? 'Audio / Video hướng dẫn đề bài (tùy chọn)' : 'Video bài giảng'}
                </span>
              </div>

              {/* Tab switcher: URL vs File upload */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white w-fit">
                <button
                  type="button"
                  onClick={() => setVideoInputMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${videoInputMode === 'url'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Nhập URL
                </button>
                <button
                  type="button"
                  onClick={() => setVideoInputMode('file')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${videoInputMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  Upload lên R2
                </button>
              </div>

              {/* URL input */}
              {videoInputMode === 'url' && (
                <div>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
                  />
                  {videoUrl && (
                    <p className="mt-1.5 text-xs text-slate-500 truncate">
                      🔗 <span className="font-mono">{videoUrl}</span>
                    </p>
                  )}
                </div>
              )}

              {/* File upload input */}
              {videoInputMode === 'file' && (
                <div className="space-y-3">
                  {/* Drag-and-drop / click zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${selectedFile
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {!selectedFile ? (
                      <>
                        <Upload className="h-8 w-8 text-slate-400" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">
                            Kéo thả file video vào đây hoặc <span className="text-blue-600">bấm để chọn</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Hỗ trợ: MP4, WebM, MOV, AVI, MKV — Tối đa 500 MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <Video className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setUploadSuccess(false);
                            setUploadError(null);
                            setUploadProgress(0);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload error */}
                  {uploadError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {uploadError}
                    </div>
                  )}

                  {/* Progress bar */}
                  {isUploading && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">Đang upload lên Cloudflare R2…</span>
                        <span className="text-xs font-bold text-blue-700">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload success */}
                  {uploadSuccess && (
                    <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-700">Upload thành công!</p>
                        {videoUrl && (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 underline truncate block"
                          >
                            {videoUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload button (edit mode only — in create mode video is uploaded after lesson is created) */}
                  {isEditMode ? (
                    <button
                      type="button"
                      disabled={!selectedFile || isUploading || uploadSuccess}
                      onClick={handleUploadToR2}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                      {isUploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Đang upload ({uploadProgress}%)…</>
                      ) : uploadSuccess ? (
                        <><CheckCircle2 className="h-4 w-4" /> Đã upload xong</>
                      ) : (
                        <><CloudUpload className="h-4 w-4" /> Upload video lên Cloudflare R2</>
                      )}
                    </button>
                  ) : (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>✨ File video đã sẵn sàng. Hệ thống sẽ <strong>tự động upload lên Cloudflare R2</strong> ngay khi bạn bấm nút <strong>"Tạo bài học"</strong> bên dưới.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Video Live Preview Player */}
              {videoUrl && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-900 p-2.5 shadow-inner space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                    <span className="flex items-center gap-1.5 text-blue-300">
                      <Video className="h-3.5 w-3.5" />
                      Xem trực tiếp Video bài học ({videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? 'Link YouTube' : 'File MP4 từ R2'})
                    </span>
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Mở link ↗
                    </a>
                  </div>
                  {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={
                        (() => {
                          const m = videoUrl.match(/(?:youtu\.be\/|v\/|u\/\w+\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                          return (m && m[1]) ? `https://www.youtube.com/embed/${m[1]}` : videoUrl;
                        })()
                      }
                      className="w-full aspect-video rounded-lg max-h-56 border border-slate-800 shadow-md"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full max-h-56 rounded-lg bg-black border border-slate-800 shadow-md"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              DOCUMENT SECTION (Tài liệu lý thuyết)
              ══════════════════════════════════════════════ */}
          {lessonType === 'DOCUMENT' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Đính kèm File tài liệu / Link đọc lý thuyết
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Đường dẫn tài liệu (PDF, Google Docs, Slides...)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... hoặc link tài liệu PDF"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              QUIZ SECTION (Bài kiểm tra Quiz)
              ══════════════════════════════════════════════ */}
          {lessonType === 'QUIZ' && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Bài kiểm tra Trắc nghiệm (Quiz)
                </span>
              </div>
              <p className="text-xs text-purple-700">
                💡 Bài học trắc nghiệm sẽ được tạo thành công. Sau khi lưu, bạn có thể tạo và chỉnh sửa các câu hỏi trắc nghiệm ngay trên giao diện danh sách bài học.
              </p>
            </div>
          )}

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
              disabled={isSubmitting || isUploading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer ${lessonType === 'ASSIGNMENT'
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
