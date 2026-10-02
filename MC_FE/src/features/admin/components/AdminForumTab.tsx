import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  Eye,
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  FileText,
  Search,
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  X,
  ExternalLink,
  User,
  Mail,
  Calendar,
  Filter,
} from 'lucide-react';
import { ForumReport, ForumPost, ForumTopic } from '../../forum/types/forumTypes';
import { forumApi } from '../../forum/services/forumApi';

interface AdminForumTabProps {
  onToast?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminForumTab: React.FC<AdminForumTabProps> = ({ onToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'posts'>('reports');

  // --- REPORT TAB STATES ---
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('PENDING');
  const [reportPage, setReportPage] = useState<number>(1);
  const [reportTotalItems, setReportTotalItems] = useState<number>(0);
  const [actionId, setActionId] = useState<number | null>(null);

  // --- ALL POSTS TAB STATES ---
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [postPage, setPostPage] = useState<number>(1);
  const [postTotalItems, setPostTotalItems] = useState<number>(0);
  const [postTotalPages, setPostTotalPages] = useState<number>(1);
  const [postTopicFilter, setPostTopicFilter] = useState<number | undefined>(undefined);
  const [postStatusFilter, setPostStatusFilter] = useState<string>('');
  const [postSearchQuery, setPostSearchQuery] = useState<string>('');

  // --- MODAL STATES ---
  const [detailReport, setDetailReport] = useState<ForumReport | null>(null);
  const [detailPost, setDetailPost] = useState<ForumPost | null>(null);

  // Load Topics once
  useEffect(() => {
    forumApi.getTopics().then(setTopics);
  }, []);

  // Fetch Reports
  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await forumApi.getReports(reportPage, 10, reportStatusFilter);
      setReports(res.items);
      setReportTotalItems(res.totalItems);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'reports') {
      fetchReports();
    }
  }, [reportPage, reportStatusFilter, activeSubTab]);

  // Fetch Admin Posts
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await forumApi.getAdminPosts(postPage, 10, postTopicFilter, postStatusFilter, postSearchQuery);
      setPosts(res.items);
      setPostTotalItems(res.totalItems);
      setPostTotalPages(res.totalPages);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'posts') {
      fetchPosts();
    }
  }, [postPage, postTopicFilter, postStatusFilter, activeSubTab]);

  // --- REPORT ACTIONS ---
  const handleResolveReport = async (reportId: number, action: 'DISMISS' | 'HIDE' | 'DELETE') => {
    setActionId(reportId);
    try {
      const success = await forumApi.resolveReport(reportId, action);
      if (success) {
        if (onToast) onToast('Thành công', `Đã xử lý báo cáo #${reportId}`, 'success');
        fetchReports();
        if (detailReport?.reportId === reportId) setDetailReport(null);
      } else {
        if (onToast) onToast('Lỗi', 'Không thể xử lý báo cáo.', 'error');
      }
    } finally {
      setActionId(null);
    }
  };

  const handleRestorePost = async (postId: number) => {
    if (!window.confirm('Khôi phục bài viết này? Bài viết sẽ hiển thị công khai trở lại và các báo cáo cũ sẽ được giải quyết.')) return;
    try {
      const success = await forumApi.restorePost(postId);
      if (success) {
        if (onToast) onToast('Thành công', 'Đã khôi phục bài viết thành công.', 'success');
        if (activeSubTab === 'reports') fetchReports();
        if (activeSubTab === 'posts') fetchPosts();
        setDetailReport(null);
        setDetailPost(null);
      }
    } catch (_) {}
  };

  const handleRestoreComment = async (commentId: number) => {
    if (!window.confirm('Khôi phục bình luận này? Báo cáo cũ sẽ được dọn dẹp.')) return;
    try {
      const success = await forumApi.restoreComment(commentId);
      if (success) {
        if (onToast) onToast('Thành công', 'Đã khôi phục bình luận thành công.', 'success');
        if (activeSubTab === 'reports') fetchReports();
        setDetailReport(null);
      }
    } catch (_) {}
  };

  const handleUpdatePostStatus = async (postId: number, newStatus: string, actionLabel: string) => {
    if (!window.confirm(`Xác nhận ${actionLabel} bài viết #${postId}?`)) return;
    try {
      const success = await forumApi.updatePostStatus(postId, newStatus);
      if (success) {
        if (onToast) onToast('Thành công', `Đã ${actionLabel.toLowerCase()} bài viết #${postId}`, 'success');
        fetchPosts();
        setDetailPost(null);
      } else {
        if (onToast) onToast('Lỗi', 'Không thể cập nhật trạng thái bài viết.', 'error');
      }
    } catch (_) {}
  };

  // Helper for status badge
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Công khai</span>;
      case 'HIDDEN_BY_REPORTS':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Tự động ẩn (Reports)</span>;
      case 'HIDDEN_BY_ADMIN':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Đã ẩn bởi Admin</span>;
      case 'DELETED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Đã xóa</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{status || 'N/A'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Quản lý Diễn đàn & Kiểm duyệt Bài viết
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Kiểm duyệt các bài viết vi phạm hoặc xem toàn bộ danh sách bài viết trên diễn đàn
            </p>
          </div>

          {/* Sub-tab pills */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'reports'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Báo cáo vi phạm</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('posts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'posts'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Tất cả bài viết</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: BÁO CÁO VI PHẠM                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Trạng thái báo cáo:</span>
              <select
                value={reportStatusFilter}
                onChange={(e) => {
                  setReportStatusFilter(e.target.value);
                  setReportPage(1);
                }}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                <option value="PENDING">Đang chờ xử lý (Pending)</option>
                <option value="RESOLVED">Đã giải quyết (Resolved)</option>
                <option value="DISMISSED">Đã bỏ qua (Dismissed)</option>
                <option value="">Tất cả trạng thái</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchReports}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Làm mới"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {/* List of Reports */}
          {loadingReports ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 text-xs">
              Đang tải danh sách báo cáo...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 text-xs">
              Không tìm thấy báo cáo vi phạm nào.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const isTargetHiddenOrDeleted =
                  r.targetStatus === 'HIDDEN_BY_ADMIN' ||
                  r.targetStatus === 'HIDDEN_BY_REPORTS' ||
                  r.targetStatus === 'DELETED';

                return (
                  <div
                    key={r.reportId}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 hover:border-slate-700/80 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          #{r.reportId} • {r.targetType === 'POST' ? 'Bài viết' : 'Bình luận'}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          Lý do: <strong className="text-rose-400">{r.reason}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {renderStatusBadge(r.targetStatus)}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            r.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : r.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          Báo cáo: {r.status === 'PENDING' ? 'Chờ duyệt' : r.status === 'RESOLVED' ? 'Đã xử lý' : 'Đã bỏ qua'}
                        </span>
                      </div>
                    </div>

                    {/* Target Snippet */}
                    <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80 space-y-1">
                      <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                        <span>Nội dung bị báo cáo:</span>
                        {r.postTopicName && (
                          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded">
                            Chủ đề: {r.postTopicName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white line-clamp-2">
                        {r.targetType === 'POST' ? r.postTitle : r.commentSnippet}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tác giả gốc:{' '}
                        <strong className="text-slate-200">{r.authorName}</strong>
                        {r.authorEmail ? <span className="text-cyan-400/90 font-mono"> ({r.authorEmail})</span> : ''}{' '}
                        (ID: {r.authorId})
                      </div>
                    </div>

                    {/* Reporter details */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                      <div>
                        Người báo cáo: <strong className="text-slate-200">{r.reporterName}</strong> •{' '}
                        {new Date(r.createdAt).toLocaleString('vi-VN')}
                      </div>

                      {r.details && (
                        <div className="text-xs text-amber-300 italic">
                          Chi tiết: "{r.details}"
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      {/* Xem chi tiết button */}
                      <button
                        type="button"
                        onClick={() => setDetailReport(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:text-cyan-200 border border-slate-700 transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      {/* Khôi phục button ONLY shown if target is currently hidden or deleted! */}
                      {isTargetHiddenOrDeleted && r.targetType === 'POST' && r.postId && (
                        <button
                          type="button"
                          onClick={() => handleRestorePost(r.postId!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Khôi phục Bài viết</span>
                        </button>
                      )}

                      {isTargetHiddenOrDeleted && r.targetType === 'COMMENT' && r.commentId && (
                        <button
                          type="button"
                          onClick={() => handleRestoreComment(r.commentId!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Khôi phục Bình luận</span>
                        </button>
                      )}

                      {r.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.reportId, 'DISMISS')}
                            disabled={actionId === r.reportId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Bỏ qua</span>
                          </button>

                          {!isTargetHiddenOrDeleted && (
                            <button
                              type="button"
                              onClick={() => handleResolveReport(r.reportId, 'HIDE')}
                              disabled={actionId === r.reportId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Ẩn nội dung</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.reportId, 'DELETE')}
                            disabled={actionId === r.reportId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa vĩnh viễn</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: TẤT CẢ BÀI VIẾT (ALL FORUM POSTS MANAGEMENT)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'posts' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Topic filter, Status filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
            {/* Search */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, nội dung, tác giả..."
                value={postSearchQuery}
                onChange={(e) => {
                  setPostSearchQuery(e.target.value);
                  setPostPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Topic Filter */}
            <div className="sm:col-span-3">
              <select
                value={postTopicFilter || ''}
                onChange={(e) => {
                  setPostTopicFilter(e.target.value ? Number(e.target.value) : undefined);
                  setPostPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">Tất cả Chủ đề</option>
                {topics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={postStatusFilter}
                onChange={(e) => {
                  setPostStatusFilter(e.target.value);
                  setPostPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="">Tất cả Trạng thái</option>
                <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                <option value="HIDDEN_BY_ADMIN">Đã ẩn bởi Admin (HIDDEN_BY_ADMIN)</option>
                <option value="HIDDEN_BY_REPORTS">Ẩn do vi phạm (HIDDEN_BY_REPORTS)</option>
                <option value="DELETED">Đã xóa (DELETED)</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="sm:col-span-1 flex items-center justify-end">
              <button
                type="button"
                onClick={fetchPosts}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors w-full sm:w-auto flex items-center justify-center"
                title="Làm mới"
              >
                <RefreshCw className={`h-4 w-4 ${loadingPosts ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Posts List */}
          {loadingPosts ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 text-xs">
              Đang tải danh sách bài viết...
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 text-xs">
              Không tìm thấy bài viết nào phù hợp.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div
                  key={p.postId}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 hover:border-slate-700/80 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        #{p.postId} • {p.topicName}
                      </span>
                      {p.isAnonymous && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          Ẩn danh
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {p.reportsCount > 0 && (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {p.reportsCount} báo cáo
                        </span>
                      )}
                      {renderStatusBadge(p.status)}
                    </div>
                  </div>

                  {/* Title & Preview Content */}
                  <div>
                    <h3 className="text-base font-bold text-white mb-1 hover:text-cyan-400 transition-colors cursor-pointer" onClick={() => setDetailPost(p)}>
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {p.content}
                    </p>
                  </div>

                  {/* Author & Stats bar */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <strong className="text-slate-200">{p.authorName}</strong>
                        {p.authorEmail && <span className="text-cyan-400/90 font-mono text-[11px]"> ({p.authorEmail})</span>}
                      </span>

                      <span className="text-slate-600">•</span>

                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-slate-500" />
                        {p.reactionsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-slate-500" />
                        {p.commentsCount}
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => setDetailPost(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết</span>
                        </button>

                        {p.status === 'PUBLISHED' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdatePostStatus(p.postId, 'HIDDEN_BY_ADMIN', 'Ẩn')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all text-xs font-semibold flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Ẩn</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestorePost(p.postId)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all text-xs font-semibold flex items-center gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Khôi phục</span>
                          </button>
                        )}

                        {p.status !== 'DELETED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdatePostStatus(p.postId, 'DELETED', 'Xóa vĩnh viễn')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {postTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-400">
                Hiển thị {posts.length} / {postTotalItems} bài viết (Trang {postPage}/{postTotalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={postPage <= 1}
                  onClick={() => setPostPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={postPage >= postTotalPages}
                  onClick={() => setPostPage((prev) => Math.min(postTotalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REPORT DETAIL MODAL                                             */}
      {/* ========================================================================= */}
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    Báo cáo #{detailReport.reportId}
                  </span>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    {detailReport.targetType === 'POST' ? 'Bài viết' : 'Bình luận'}
                  </span>
                  {renderStatusBadge(detailReport.targetStatus)}
                </div>
                <h3 className="text-base font-bold text-white mt-2">
                  Chi tiết vi phạm: <span className="text-rose-400">{detailReport.reason}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDetailReport(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Author & Reporter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Tác giả bài viết / bình luận:</span>
                  </div>
                  <div className="text-sm font-bold text-white">{detailReport.authorName}</div>
                  <div className="text-cyan-400 font-mono flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {detailReport.authorEmail || 'N/A'}
                  </div>
                  <div className="text-slate-500 text-[10px]">User ID: {detailReport.authorId}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    <span>Người gửi báo cáo:</span>
                  </div>
                  <div className="text-sm font-bold text-white">{detailReport.reporterName}</div>
                  <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    {new Date(detailReport.createdAt).toLocaleString('vi-VN')}
                  </div>
                  {detailReport.details && (
                    <div className="text-amber-300 italic text-[11px]">"{detailReport.details}"</div>
                  )}
                </div>
              </div>

              {/* Content Preview Box */}
              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Nội dung bị báo cáo chi tiết</span>
                  {detailReport.postTopicName && (
                    <span className="text-cyan-400 font-normal">Chủ đề: {detailReport.postTopicName}</span>
                  )}
                </div>

                {detailReport.targetType === 'POST' ? (
                  <>
                    <h4 className="text-base font-bold text-white">{detailReport.postTitle}</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {detailReport.postContent || detailReport.postTitle}
                    </p>
                    {detailReport.postImageUrl && (
                      <div className="mt-3 rounded-xl overflow-hidden max-h-72 border border-slate-800">
                        <img src={detailReport.postImageUrl} alt="Báo cáo" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {detailReport.commentContent || detailReport.commentSnippet}
                    </p>
                    {detailReport.commentImageUrl && (
                      <div className="mt-3 rounded-xl overflow-hidden max-h-72 border border-slate-800">
                        <img src={detailReport.commentImageUrl} alt="Bình luận" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                {detailReport.postId && (
                  <a
                    href={`/forum?post=${detailReport.postId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    <span>Xem trên Diễn đàn</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(detailReport.targetStatus === 'HIDDEN_BY_ADMIN' || detailReport.targetStatus === 'HIDDEN_BY_REPORTS' || detailReport.targetStatus === 'DELETED') && detailReport.postId && (
                  <button
                    type="button"
                    onClick={() => handleRestorePost(detailReport.postId!)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Khôi phục Bài viết</span>
                  </button>
                )}

                {detailReport.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(detailReport.reportId, 'DISMISS')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Bỏ qua báo cáo</span>
                    </button>

                    {detailReport.targetStatus !== 'HIDDEN_BY_ADMIN' && detailReport.targetStatus !== 'HIDDEN_BY_REPORTS' && (
                      <button
                        type="button"
                        onClick={() => handleResolveReport(detailReport.reportId, 'HIDE')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all flex items-center gap-1.5"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Ẩn nội dung</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResolveReport(detailReport.reportId, 'DELETE')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Xóa vĩnh viễn</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: POST DETAIL MODAL (ADMIN FORUM POST VIEW)                        */}
      {/* ========================================================================= */}
      {detailPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  Bài viết #{detailPost.postId} • {detailPost.topicName}
                </span>
                {renderStatusBadge(detailPost.status)}
              </div>

              <button
                type="button"
                onClick={() => setDetailPost(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Author Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-sm">
                    {detailPost.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {detailPost.authorName}
                      {detailPost.isAnonymous && <span className="text-[10px] text-slate-400 font-normal">(Đăng ẩn danh)</span>}
                    </div>
                    <div className="text-xs text-cyan-400 font-mono">{detailPost.authorEmail || 'N/A'}</div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <div>Tạo ngày: {new Date(detailPost.createdAt).toLocaleDateString('vi-VN')}</div>
                  <div className="text-[11px] text-slate-500">ID Tác giả: {detailPost.authorId}</div>
                </div>
              </div>

              {/* Title & Content */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">{detailPost.title}</h3>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {detailPost.content}
                </div>

                {detailPost.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-80">
                    <img src={detailPost.imageUrl} alt={detailPost.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Stats & Reports bar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="h-4 w-4 text-cyan-400" />
                    {detailPost.reactionsCount} Lượt thích
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-cyan-400" />
                    {detailPost.commentsCount} Bình luận
                  </span>
                </div>

                {detailPost.reportsCount > 0 && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    {detailPost.reportsCount} Lượt báo cáo vi phạm
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
              <a
                href={`/forum?post=${detailPost.postId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline"
              >
                <span>Xem trên Diễn đàn</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <div className="flex items-center gap-2">
                {detailPost.status === 'PUBLISHED' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdatePostStatus(detailPost.postId, 'HIDDEN_BY_ADMIN', 'Ẩn')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all flex items-center gap-1.5"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Ẩn bài viết</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRestorePost(detailPost.postId)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Khôi phục bài viết</span>
                  </button>
                )}

                {detailPost.status !== 'DELETED' && (
                  <button
                    type="button"
                    onClick={() => handleUpdatePostStatus(detailPost.postId, 'DELETED', 'Xóa vĩnh viễn')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa vĩnh viễn</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
