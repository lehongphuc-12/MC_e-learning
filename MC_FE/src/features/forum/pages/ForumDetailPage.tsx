import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Eye, Flag, Edit, Trash2, ShieldAlert, User as UserIcon, EyeOff } from 'lucide-react';
import { ForumPost, ForumComment, ForumTopic } from '../types/forumTypes';
import { forumApi } from '../services/forumApi';
import { ForumTopicBadge } from '../components/ForumTopicBadge';
import { ForumReactionButtons } from '../components/ForumReactionButtons';
import { ForumCommentForm } from '../components/ForumCommentForm';
import { ForumCommentItem } from '../components/ForumCommentItem';
import { ForumReportModal } from '../components/ForumReportModal';
import { ForumPostFormModal } from '../components/ForumPostFormModal';
import { ForumUserProfileModal } from '../components/ForumUserProfileModal';
import { User } from '../../../types';
import { ToastType } from '../../../components/common/Toast';

interface ForumDetailPageProps {
  user: User | null;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const ForumDetailPage: React.FC<ForumDetailPageProps> = ({ user, onToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedUserProfileUserId, setSelectedUserProfileUserId] = useState<number | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState<boolean>(false);

  const handleAuthorClick = (authorId: number) => {
    setSelectedUserProfileUserId(authorId);
    setIsUserProfileModalOpen(true);
  };

  const postIdNumber = Number(id);

  const loadDataSilent = async () => {
    if (!postIdNumber) return;
    try {
      const fetchedPost = await forumApi.getPostById(postIdNumber);
      if (fetchedPost) {
        setPost(fetchedPost);
        const fetchedComments = await forumApi.getComments(postIdNumber);
        setComments(fetchedComments);
      }
    } catch (_) {}
  };

  const loadData = async () => {
    if (!postIdNumber) return;
    if (!post) setLoading(true);
    try {
      await loadDataSilent();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    forumApi.getTopics().then(setTopics);
    loadData();

    // Realtime auto-polling every 3s for multi-account realtime updates
    const intervalId = setInterval(() => {
      loadDataSilent();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [postIdNumber]);

  if (loading && !post) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 flex items-center justify-center">
        <div className="text-slate-400 text-xs">Đang tải chi tiết bài viết...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Bài viết không tồn tại hoặc đã bị ẩn</h2>
        <button
          type="button"
          onClick={() => navigate('/forum')}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all"
        >
          Quay lại Diễn đàn
        </button>
      </div>
    );
  }

  const isHidden = post.status === 'HIDDEN_BY_REPORTS' || post.status === 'HIDDEN_BY_ADMIN';
  const isAdmin = user?.role === 'admin';
  const isAuthor = post.isAuthor;

  const handleEditSubmit = async (topicId: number, title: string, content: string, imageUrl?: string, isAnonymous?: boolean) => {
    const res = await forumApi.updatePost(post.postId, { topicId, title, content, imageUrl, isAnonymous });
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã cập nhật bài viết.', 'success');
      loadDataSilent();
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể cập nhật.', 'error');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    const res = await forumApi.deletePost(post.postId);
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã xóa bài viết.', 'success');
      navigate('/forum');
    }
  };

  const handleReactPost = async (type: 'LIKE' | 'LOVE' | 'HELPFUL') => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để thả tương tác.', 'info');
      return;
    }

    const currentReaction = post.userReaction;
    const isRemoving = currentReaction === type;
    const newReaction = isRemoving ? undefined : type;
    let countDiff = 0;
    if (isRemoving) countDiff = -1;
    else if (!currentReaction) countDiff = 1;

    // Optimistic Update immediately!
    setPost({
      ...post,
      userReaction: newReaction,
      reactionsCount: Math.max(0, post.reactionsCount + countDiff),
    });

    try {
      const res = await forumApi.togglePostReaction(post.postId, type);
      if (res) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                userReaction: res.reactionType as any,
                reactionsCount: res.totalReactions,
              }
            : null
        );
      }
    } catch (_) {
      loadDataSilent();
    }
  };

  const handleAddComment = async (content: string, isAnonymous: boolean, imageUrl?: string) => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để bình luận.', 'info');
      navigate('/login');
      return;
    }
    const res = await forumApi.addComment({ postId: post.postId, content, isAnonymous, imageUrl });
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã gửi bình luận thành công!', 'success');
      loadDataSilent();
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể gửi bình luận.', 'error');
    }
  };

  const handleReplyComment = async (parentCommentId: number, content: string, isAnonymous: boolean, imageUrl?: string) => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để trả lời.', 'info');
      return;
    }
    const res = await forumApi.addComment({ postId: post.postId, parentCommentId, content, isAnonymous, imageUrl });
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã gửi câu trả lời.', 'success');
      loadDataSilent();
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể trả lời.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const res = await forumApi.deleteComment(commentId);
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã xóa bình luận.', 'success');
      loadDataSilent();
    }
  };

  const handleReactComment = async (commentId: number, type: 'LIKE' | 'LOVE' | 'HELPFUL') => {
    if (!user) return;

    // Optimistic Update for comment reaction
    const updateCommentReaction = (list: ForumComment[]): ForumComment[] => {
      return list.map((c) => {
        if (c.commentId === commentId) {
          const isRemoving = c.userReaction === type;
          const newReaction = isRemoving ? undefined : type;
          let countDiff = 0;
          if (isRemoving) countDiff = -1;
          else if (!c.userReaction) countDiff = 1;

          return {
            ...c,
            userReaction: newReaction,
            reactionsCount: Math.max(0, c.reactionsCount + countDiff),
          };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateCommentReaction(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => updateCommentReaction(prev));

    try {
      const res = await forumApi.toggleCommentReaction(commentId, type);
      if (res) {
        const syncCommentReaction = (list: ForumComment[]): ForumComment[] => {
          return list.map((c) => {
            if (c.commentId === commentId) {
              return {
                ...c,
                userReaction: res.reactionType as any,
                reactionsCount: res.totalReactions,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: syncCommentReaction(c.replies) };
            }
            return c;
          });
        };
        setComments((prev) => syncCommentReaction(prev));
      }
    } catch (_) {
      loadDataSilent();
    }
  };

  const handleReportComment = async (commentId: number, reason: string, details?: string) => {
    const res = await forumApi.reportComment(commentId, reason, details);
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã gửi báo cáo vi phạm bình luận.', 'success');
      loadDataSilent();
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể báo cáo.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Back button */}
        <button
          type="button"
          onClick={() => navigate('/forum')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Diễn đàn</span>
        </button>

        {/* Post Card Detail */}
        <div
          className={`rounded-3xl bg-slate-900/90 border p-6 sm:p-8 space-y-6 ${
            isHidden ? 'border-amber-500/40 opacity-75 grayscale bg-amber-950/10' : 'border-slate-800'
          }`}
        >
          {/* Header info */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ForumTopicBadge name={post.topicName} />

            <div className="flex items-center gap-2">
              {isHidden && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                  <ShieldAlert className="h-4 w-4" />
                  Bài viết đang bị ẩn chờ duyệt
                </span>
              )}

              {!isAuthor && !isHidden && user && (
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  disabled={post.userHasReported}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-all ${
                    post.userHasReported ? 'text-amber-400 opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>{post.userHasReported ? 'Đã báo cáo' : 'Báo cáo'}</span>
                </button>
              )}

              {(isAuthor || isAdmin) && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                    title="Sửa bài viết"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                    title="Xóa bài viết"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Author info */}
          <div
            onClick={() => {
              if (!post.isAnonymous && post.authorId) {
                handleAuthorClick(post.authorId);
              }
            }}
            className={`flex items-center gap-3 pb-4 border-b border-slate-800 ${
              !post.isAnonymous && post.authorId ? 'cursor-pointer hover:opacity-90' : ''
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {post.isAnonymous ? (
                <EyeOff className="h-5 w-5 text-cyan-400" />
              ) : post.authorAvatar ? (
                <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white hover:text-cyan-400 transition-colors">
                  {post.isAnonymous ? 'Học viên ẩn danh' : post.authorName}
                </span>
                {post.isAnonymous && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    <EyeOff className="h-3 w-3" />
                    Ẩn danh
                  </span>
                )}
                {post.authorRole === 'Admin' && (
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>Đăng ngày: {new Date(post.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>

          {/* Main Post Content */}
          <div className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>

          {/* Main Post Image */}
          {post.imageUrl && (
            <div className="rounded-2xl overflow-hidden max-h-[500px] border border-slate-800 bg-black/40 flex items-center justify-center">
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-contain max-h-[500px] rounded-2xl" />
            </div>
          )}

          {/* Reactions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <ForumReactionButtons
              reactionsCount={post.reactionsCount}
              userReaction={post.userReaction}
              disabled={isHidden}
              onReact={handleReactPost}
            />

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MessageSquare className="h-4 w-4" />
              <span>{comments.length} bình luận</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            Bình luận ({comments.length})
          </h3>

          {/* Top-level Comment Form */}
          {!isHidden ? (
            <ForumCommentForm
              user={user}
              placeholder="Viết suy nghĩ hoặc chia sẻ của bạn về bài viết này..."
              buttonText="Gửi bình luận"
              onSubmit={handleAddComment}
            />
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-center">
              Bài viết đang bị ẩn nên tính năng bình luận tạm thời bị khóa.
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4 pt-4">
            {comments.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6">
                Chưa có bình luận nào. Hãy là người đầu tiên để lại ý kiến!
              </div>
            ) : (
              comments.map((comment) => (
                <ForumCommentItem
                  key={comment.commentId}
                  comment={comment}
                  currentUser={user}
                  onReply={handleReplyComment}
                  onDelete={handleDeleteComment}
                  onReact={handleReactComment}
                  onReport={handleReportComment}
                  onAuthorClick={handleAuthorClick}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ForumPostFormModal
        isOpen={isEditModalOpen}
        topics={topics}
        editPost={post}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
      />

      {/* Report Modal */}
      <ForumReportModal
        isOpen={isReportModalOpen}
        targetType="POST"
        titleOrSnippet={post.title}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={async (reason, details) => {
          const res = await forumApi.reportPost(post.postId, reason, details);
          if (res.success) {
            if (onToast) onToast('Thành công', 'Đã gửi báo cáo bài viết.', 'success');
            loadData();
          } else {
            if (onToast) onToast('Lỗi', res.message || 'Không thể báo cáo.', 'error');
          }
        }}
      />

      {/* User Profile Info Modal */}
      <ForumUserProfileModal
        userId={selectedUserProfileUserId}
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        onToast={(title, desc, type) => onToast && onToast(title, desc, type)}
      />
    </div>
  );
};
