import React, { useState, useRef } from 'react';
import { Send, EyeOff, User as UserIcon, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { User } from '../../../types';
import { forumApi } from '../services/forumApi';

interface ForumCommentFormProps {
  user: User | null;
  placeholder?: string;
  buttonText?: string;
  initialContent?: string;
  onCancel?: () => void;
  onSubmit: (content: string, isAnonymous: boolean, imageUrl?: string) => Promise<void>;
}

export const ForumCommentForm: React.FC<ForumCommentFormProps> = ({
  user,
  placeholder = 'Viết bình luận của bạn...',
  buttonText = 'Gửi bình luận',
  initialContent = '',
  onCancel,
  onSubmit,
}) => {
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await forumApi.uploadImage(file);
      if (res.success && res.imageUrl) {
        setImageUrl(res.imageUrl);
      } else {
        alert(res.message || 'Không thể tải ảnh lên.');
      }
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting || uploadingImage) return;

    setSubmitting(true);
    try {
      await onSubmit(content.trim(), isAnonymous, imageUrl.trim() || undefined);
      setContent('');
      setImageUrl('');
      if (onCancel) onCancel();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 mt-1">
          {isAnonymous ? (
            <EyeOff className="h-4 w-4 text-cyan-400" />
          ) : user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-4 w-4 text-slate-400" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/60 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
          />

          {/* Attached image preview */}
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 max-h-36 bg-slate-950 inline-block">
              <img src={imageUrl} alt="Bình luận ảnh" className="max-h-36 object-contain" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
                title="Xóa ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/40"
                />
                <span className="flex items-center gap-1">
                  <EyeOff className="h-3.5 w-3.5 text-cyan-400" />
                  Đăng ẩn danh
                </span>
              </label>

              {/* Image attachment button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
                title="Đính kèm ảnh"
              >
                {uploadingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-slate-400 hover:text-cyan-400" />
                )}
                <span>Thêm ảnh</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={!content.trim() || submitting || uploadingImage}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Đang gửi...' : buttonText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
