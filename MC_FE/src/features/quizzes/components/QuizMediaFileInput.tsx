
import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, CloudUpload, FileAudio2, FileImage, FileVideo2, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { uploadQuizMedia } from '../api/quizMediaApi';
import type { QuizUploadMediaType } from '../api/quizMediaApi';

interface Props {
  mediaType: QuizUploadMediaType;
  onUploaded: (url: string) => void;
}

const accept: Record<QuizUploadMediaType, string> = {
  AUDIO: '.mp3,.wav,.m4a,.ogg,audio/*',
  VIDEO: '.mp4,.webm,.mov,video/*',
  IMAGE: '.jpg,.jpeg,.png,.webp,image/*'
};

const extensions: Record<QuizUploadMediaType, string[]> = {
  AUDIO: ['mp3', 'wav', 'm4a', 'ogg'],
  VIDEO: ['mp4', 'webm', 'mov'],
  IMAGE: ['jpg', 'jpeg', 'png', 'webp']
};

const limits: Record<QuizUploadMediaType, number> = {
  AUDIO: 25,
  VIDEO: 100,
  IMAGE: 10
};

const config = {
  AUDIO: { label: 'Âm thanh', description: 'Tải lên bản ghi âm hoặc tư liệu luyện giọng', formats: 'MP3, WAV, M4A, OGG', Icon: FileAudio2 },
  VIDEO: { label: 'Video', description: 'Tải lên video minh họa hoặc bài giảng', formats: 'MP4, WEBM, MOV', Icon: FileVideo2 },
  IMAGE: { label: 'Hình ảnh', description: 'Tải lên hình ảnh minh họa cho câu hỏi', formats: 'JPG, JPEG, PNG, WEBP', Icon: FileImage }
};

export const QuizMediaFileInput: React.FC<Props> = ({ mediaType, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  const current = config[mediaType];
  const Icon = current.Icon;

  const handleFile = async (file?: File) => {
    if (!file || uploading) return;
    setError('');
    setUploadedName('');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!extensions[mediaType].includes(ext)) {
      setError(`Định dạng không được hỗ trợ. Chỉ chấp nhận ${current.formats}.`);
      return;
    }

    if (file.size > limits[mediaType] * 1024 * 1024) {
      setError(`Dung lượng tối đa cho ${current.label.toLowerCase()} là ${limits[mediaType]}MB.`);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadQuizMedia(file, mediaType);
      onUploaded(result.mediaUrl);
      setUploadedName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải file thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 w-full space-y-2.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept[mediaType]}
        className="hidden"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading}
        aria-label={`Tải lên ${current.label.toLowerCase()}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`group relative isolate overflow-hidden rounded-2xl border border-dashed p-4 text-center outline-none transition-all duration-300 sm:p-5 ${
          uploading ? 'cursor-wait border-violet-200 bg-violet-50/60' :
          dragging ? 'cursor-pointer scale-[1.01] border-violet-500 bg-violet-100 shadow-lg shadow-violet-200/50' :
          'cursor-pointer border-violet-200 bg-gradient-to-br from-[#f8f7ff] via-white to-[#eff4ff] hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-100/60 focus-visible:ring-2 focus-visible:ring-violet-500'
        }`}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-violet-200/35 blur-3xl transition-all duration-500 group-hover:bg-violet-300/50" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-blue-200/35 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-3">
            {!uploading && <span className="absolute inset-0 rounded-2xl bg-violet-300/30 blur-xl transition-transform duration-500 group-hover:scale-125" />}
            <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 transition-all duration-300 ${uploading ? '' : 'group-hover:-translate-y-1 group-hover:rotate-3 group-hover:shadow-violet-300/70'}`}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
            </div>
            {!uploading && <Sparkles className="absolute -right-3 -top-2 h-4 w-4 text-violet-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />}
          </div>

          <div className="mb-1 flex items-center justify-center gap-1.5">
            <h3 className="text-sm font-bold tracking-tight text-slate-800">
              {uploading ? 'Đang tải lên Cloudinary...' : dragging ? 'Thả file vào đây' : `Tải lên ${current.label.toLowerCase()}`}
            </h3>
          </div>

          <p className="max-w-sm text-xs leading-relaxed text-slate-500">{uploading ? 'Vui lòng đợi trong khi hệ thống xử lý tệp của bạn.' : current.description}</p>

          <div className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${
            uploading ? 'bg-violet-100 text-violet-600' :
            'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200 group-hover:shadow-lg group-hover:shadow-violet-300/60'
          }`}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {uploading ? 'Đang xử lý...' : 'Chọn file từ máy tính'}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
            <span>{current.formats}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Tối đa {limits[mediaType]}MB</span>
            <span className="hidden sm:inline">• Kéo thả để tải lên</span>
          </div>
        </div>

        {uploading && <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-violet-100"><div className="h-full w-1/3 animate-[uploadSlide_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-500 to-blue-500" /></div>}
      </div>

      {uploadedName && !uploading && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 animate-[fadeUp_.3s_ease-out]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate"><strong>Tải lên thành công!</strong> {uploadedName}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600 animate-[fadeUp_.3s_ease-out]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        @keyframes uploadSlide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(410%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[uploadSlide_1\\.4s_ease-in-out_infinite\\],
          .animate-\\[fadeUp_\\.3s_ease-out\\] { animation: none; }
        }
      `}</style>
    </div>
  );
};
