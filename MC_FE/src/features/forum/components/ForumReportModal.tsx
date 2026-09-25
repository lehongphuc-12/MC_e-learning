import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface ForumReportModalProps {
  isOpen: boolean;
  targetType: 'POST' | 'COMMENT';
  titleOrSnippet?: string;
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => Promise<void>;
}

const REPORT_REASONS = [
  { key: 'SPAM', label: 'Quảng cáo, Spam bài viết' },
  { key: 'HARASSMENT', label: 'Xúc phạm, Đả kích cá nhân' },
  { key: 'INAPPROPRIATE', label: 'Nội dung thô tục, không phù hợp' },
  { key: 'MISINFORMATION', label: 'Thông tin sai sự thật' },
  { key: 'OTHER', label: 'Lý do khác' },
];

export const ForumReportModal: React.FC<ForumReportModalProps> = ({
  isOpen,
  targetType,
  titleOrSnippet,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState<string>('SPAM');
  const [details, setDetails] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(reason, details);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Báo cáo vi phạm</h3>
            <p className="text-xs text-slate-400">
              Báo cáo {targetType === 'POST' ? 'bài viết' : 'bình luận'} đến Ban quản trị
            </p>
          </div>
        </div>

        {titleOrSnippet && (
          <div className="mb-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 italic line-clamp-2">
            "{titleOrSnippet}"
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Chọn lý do báo cáo
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.key}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm cursor-pointer transition-all ${
                    reason === r.key
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 font-semibold'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.key}
                    checked={reason === r.key}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-amber-500"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Mô tả chi tiết (Tùy chọn)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Cung cấp thêm thông tin giúp admin kiểm duyệt nhanh chóng..."
              rows={3}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Lưu ý: Nếu nội dung này nhận đủ <strong>5 báo cáo</strong> từ người dùng khác nhau, bài/bình luận sẽ tự động ẩn để chờ Admin duyệt.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi Báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
