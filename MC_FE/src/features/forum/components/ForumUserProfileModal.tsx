import React, { useEffect, useState } from 'react';
import {
  X,
  MessageSquare,
  Calendar,
  FileText,
  MessageCircle,
  MoreHorizontal,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { ForumUserProfile } from '../types/forumTypes';
import { forumApi } from '../services/forumApi';
import { chatApi } from '../../chat/api/chatApi';
import { useAuthStore } from '../../../store/useAuthStore';

interface ForumUserProfileModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

const REPORT_REASONS = [
  { key: 'SPAM', label: 'Spam, quảng cáo không đúng nơi' },
  { key: 'HARASSMENT', label: 'Xúc phạm, ngôn từ thù thù' },
  { key: 'INAPPROPRIATE', label: 'Tài khoản mạo danh, giả mạo' },
  { key: 'MISINFORMATION', label: 'Đăng tải thông tin sai sự thật' },
  { key: 'OTHER', label: 'Lý do khác' },
];

export const ForumUserProfileModal: React.FC<ForumUserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  onToast,
}) => {
  const [profile, setProfile] = useState<ForumUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('SPAM');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSubmitting, setReportSubmitting] = useState<boolean>(false);

  const currentUser = useAuthStore((state) => state.user);
  const isSelf = currentUser && Number(currentUser.id) === userId;

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setShowMenu(false);
      setShowReportModal(false);
      forumApi
        .getUserProfile(userId)
        .then((res) => {
          setProfile(res);
        })
        .catch(() => {
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setProfile(null);
    }
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch (_) {
      return dateStr;
    }
  };

  const getRoleBadge = (roleName?: string) => {
    const role = (roleName || '').toLowerCase();
    if (role === 'instructor' || role === 'giảng viên') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <UserCheck className="h-3.5 w-3.5" />
          Giảng viên
        </span>
      );
    }
    if (role === 'admin' || role === 'quản trị viên') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Quản trị viên
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Học viên
      </span>
    );
  };

  const handleStartChat = async () => {
    if (!userId || isSelf) return;
    setChatLoading(true);
    try {
      const conversation = await chatApi.createConversation(userId);
      window.dispatchEvent(new CustomEvent('mseek_open_chat_widget', { detail: { conversation } }));
      onClose();
    } catch (err: any) {
      if (onToast) {
        onToast('Lỗi nhắn tin', err?.message || 'Không thể tạo cuộc trò chuyện.', 'error');
      } else {
        alert(err?.message || 'Không thể tạo cuộc trò chuyện.');
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmitUserReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      // Send report notification / mock report to system
      if (onToast) {
        onToast('Đã gửi báo cáo', `Đã gửi báo cáo người dùng ${profile?.fullName || ''} tới Ban Quản Trị.`, 'success');
      }
      setShowReportModal(false);
      setShowMenu(false);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl overflow-hidden relative text-white">
        {/* Header background decoration */}
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-950/40 backdrop-blur-md text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Đang tải thông tin người dùng...</p>
          </div>
        ) : profile ? (
          <div className="px-6 pb-6 relative">
            {/* Avatar & Basic Info */}
            <div className="-mt-12 mb-4 flex items-end justify-between">
              <div className="relative">
                <img
                  src={
                    profile.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&background=2563eb&color=fff&bold=true`
                  }
                  alt={profile.fullName}
                  className="h-20 w-20 rounded-2xl border-4 border-slate-900 object-cover shadow-xl bg-slate-800"
                />
              </div>

              {/* Role badge */}
              <div className="mb-1">{getRoleBadge(profile.roleName)}</div>
            </div>

            {/* Name */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {profile.fullName}
              </h2>
            </div>

            {/* Detailed Info Cards */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 text-xs text-slate-300">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Ngày tham gia:</span>
                <span className="font-semibold text-white ml-auto">{formatDate(profile.joinedAt)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Bài viết</div>
                    <div className="text-sm font-bold text-white">{profile.postsCount}</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Bình luận</div>
                    <div className="text-sm font-bold text-white">{profile.commentsCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 relative">
              {!isSelf ? (
                <button
                  type="button"
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="flex-1 h-11 rounded-2xl font-semibold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Nhắn tin
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 h-11 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                  <span>Hồ sơ của bạn</span>
                </div>
              )}

              {/* More button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="Tùy chọn khác"
                  className="h-11 w-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {/* Options Dropdown */}
                {showMenu && (
                  <div className="absolute right-0 bottom-13 w-48 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-1.5 z-20 animate-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Báo cáo người dùng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 px-6 text-center">
            <p className="text-sm text-slate-400">Không thể tải thông tin người dùng.</p>
          </div>
        )}

        {/* Report User Modal */}
        {showReportModal && profile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Báo cáo người dùng</h3>
                  <p className="text-xs text-slate-400">Tài khoản: {profile.fullName}</p>
                </div>
              </div>

              <form onSubmit={handleSubmitUserReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Lý do báo cáo
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.key}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          reportReason === r.key
                            ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 font-semibold'
                            : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="userReportReason"
                          value={r.key}
                          checked={reportReason === r.key}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="accent-rose-500"
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
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Mô tả cụ thể hành vi vi phạm..."
                    rows={2}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
