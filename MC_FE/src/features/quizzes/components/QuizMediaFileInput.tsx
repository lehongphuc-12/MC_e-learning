
import React, { useRef, useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
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

export const QuizMediaFileInput: React.FC<Props> = ({ mediaType, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file || uploading) return;
    setError('');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!extensions[mediaType].includes(ext)) {
      setError('Định dạng file không được hỗ trợ.');
      return;
    }

    if (file.size > limits[mediaType] * 1024 * 1024) {
      setError(`Dung lượng tối đa ${limits[mediaType]}MB.`);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadQuizMedia(file, mediaType);
      onUploaded(result.mediaUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept[mediaType]}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
      >
        {uploading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <CloudUpload className="h-4 w-4" />
        }
        {uploading ? 'Đang tải lên Cloudinary...' : 'Tải file từ máy tính'}
      </button>

      <span className="ml-2 text-xs text-slate-500">
        Tối đa {limits[mediaType]}MB
      </span>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
