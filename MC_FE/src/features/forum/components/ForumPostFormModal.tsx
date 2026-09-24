import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, MessageSquare, Image as ImageIcon, Upload, Loader2, EyeOff } from 'lucide-react';
import { ForumTopic, ForumPost } from '../types/forumTypes';
import { forumApi } from '../services/forumApi';

interface ForumPostFormModalProps {
  isOpen: boolean;
  topics: ForumTopic[];
  editPost?: ForumPost | null;
  onClose: () => void;
  onSubmit: (topicId: number, title: string, content: string, imageUrl?: string, isAnonymous?: boolean) => Promise<void>;
}

export const ForumPostFormModal: React.FC<ForumPostFormModalProps> = ({
  isOpen,
  topics,
  editPost,
  onClose,
  onSubmit,
}) => {
  const [topicId, setTopicId] = useState<number>(topics[0]?.topicId || 1);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editPost) {
      setTopicId(editPost.topicId);
      setTitle(editPost.title);
      setContent(editPost.content);
      setImageUrl(editPost.imageUrl || '');
      setIsAnonymous(editPost.isAnonymous || false);
    } else {
      setTopicId(topics[0]?.topicId || 1);
      setTitle('');
      setContent('');
      setImageUrl('');
      setIsAnonymous(false);
    }
  }, [editPost, topics]);

  if (!isOpen) return null;

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
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(topicId, title.trim(), content.trim(), imageUrl.trim() || undefined, isAnonymous);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            {editPost ? <MessageSquare className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {editPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
            </h3>
            <p className="text-xs text-slate-400">
              Chia sẻ kinh nghiệm, câu hỏi hoặc ý kiến của bạn với cộng đồng MC
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Chủ đề thảo luận
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              {topics.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  {t.name} ({t.description})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tiêu đề bài viết
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề cô đọng, rõ ràng..."
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nội dung bài viết
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết chi tiết nội dung thảo luận của bạn tại đây..."
              rows={6}
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 leading-relaxed resize-y"
            />
          </div>

          {/* Anonymous Option */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 h-4 w-4"
              />
              <EyeOff className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Đăng bài ẩn danh (Tên và ảnh đại diện của bạn sẽ được ẩn đối với người dùng khác)</span>
            </label>
          </div>

          {/* Image Attachment Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-cyan-400" />
                Đính kèm hình ảnh (Tùy chọn)
              </span>
              {uploadingImage && (
                <span className="text-cyan-400 flex items-center gap-1 text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang tải ảnh...
                </span>
              )}
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Dán đường dẫn ảnh (URL) hoặc tải ảnh lên từ thiết bị..."
                className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />

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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700 shrink-0 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Tải ảnh từ máy</span>
              </button>
            </div>

            {imageUrl && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-800 max-h-48 bg-slate-950 flex items-center justify-center group">
                <img src={imageUrl} alt="Ảnh đính kèm" className="max-h-48 object-contain" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 rounded-full bg-slate-950/80 text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
                  title="Xóa ảnh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || submitting || uploadingImage}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : editPost ? 'Cập nhật bài viết' : 'Đăng bài viết'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
