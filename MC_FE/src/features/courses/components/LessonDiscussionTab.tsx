import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { ForumComment } from '../../forum/types/forumTypes';
import { forumApi } from '../../forum/services/forumApi';
import { ForumCommentForm } from '../../forum/components/ForumCommentForm';
import { ForumCommentItem } from '../../forum/components/ForumCommentItem';
import { ForumUserProfileModal } from '../../forum/components/ForumUserProfileModal';
import { useAuthStore } from '../../../store/useAuthStore';

interface LessonDiscussionTabProps {
  lessonId: number;
  courseId: number;
  onToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const LessonDiscussionTab: React.FC<LessonDiscussionTabProps> = ({
  lessonId,
  courseId,
  onToast,
}) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedUserProfileUserId, setSelectedUserProfileUserId] = useState<number | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState<boolean>(false);

  const handleAuthorClick = useCallback((authorId: number) => {
    setSelectedUserProfileUserId(authorId);
    setIsUserProfileModalOpen(true);
  }, []);

  // Fetch comments silently (used for initial load and background polling)
  const fetchComments = useCallback(async (isSilent = false) => {
    if (!lessonId) return;
    if (!isSilent) setIsLoading(true);
    try {
      const data = await forumApi.getLessonComments(lessonId);
      setComments(data);
    } catch (_) {
      // ignore silent fetch errors
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [lessonId]);

  // Initial load when lessonId changes + setup periodic polling
  useEffect(() => {
    fetchComments(false);

    // Auto-polling every 4 seconds to sync replies and reactions in real time
    const intervalId = setInterval(() => {
      fetchComments(true);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [lessonId, fetchComments]);

  // Compute total comment count including replies
  const totalCommentsCount = useMemo(() => {
    return comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
  }, [comments]);

  // Add root comment
  const handleAddComment = async (content: string, isAnonymous: boolean, imageUrl?: string) => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để gửi thảo luận.', 'info');
      navigate('/login');
      return;
    }

    const res = await forumApi.addLessonComment(lessonId, {
      content,
      isAnonymous,
      imageUrl,
    });

    if (res.success && res.data) {
      if (onToast) onToast('Thành công', 'Đã gửi câu hỏi / bình luận của bạn.', 'success');
      // Append newly created comment immediately
      setComments((prev) => [res.data!, ...prev]);
      // Background refetch to ensure fresh state
      fetchComments(true);
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể gửi bình luận.', 'error');
    }
  };

  // Reply to an existing comment
  const handleReplyComment = async (
    parentCommentId: number,
    content: string,
    isAnonymous: boolean,
    imageUrl?: string
  ) => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để trả lời.', 'info');
      navigate('/login');
      return;
    }

    const res = await forumApi.addLessonComment(lessonId, {
      parentCommentId,
      content,
      isAnonymous,
      imageUrl,
    });

    if (res.success && res.data) {
      if (onToast) onToast('Thành công', 'Đã gửi phản hồi.', 'success');
      const newReply = res.data;
      // Immediately place new reply in local comments tree
      setComments((prev) =>
        prev.map((c) => {
          if (c.commentId === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            };
          }
          // If replying to a child comment, append to root parent
          if (c.replies?.some((r) => r.commentId === parentCommentId)) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            };
          }
          return c;
        })
      );
      fetchComments(true);
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể gửi phản hồi.', 'error');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    const res = await forumApi.deleteComment(commentId);
    if (res.success) {
      if (onToast) onToast('Thành công', 'Đã xóa bình luận.', 'success');
      // Filter out deleted comment immediately
      setComments((prev) =>
        prev
          .filter((c) => c.commentId !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.commentId !== commentId),
          }))
      );
      fetchComments(true);
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể xóa bình luận.', 'error');
    }
  };

  // React to comment
  const handleReactComment = async (commentId: number, type: 'LIKE' | 'LOVE' | 'HELPFUL') => {
    if (!user) {
      if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để tương tác.', 'info');
      return;
    }

    // Optimistic reaction update
    const updateReactionInTree = (list: ForumComment[]): ForumComment[] => {
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
          return { ...c, replies: updateReactionInTree(c.replies) };
        }
        return c;
      });
    };

    setComments((prev) => updateReactionInTree(prev));

    try {
      const summary = await forumApi.toggleCommentReaction(commentId, type);
      if (summary) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.commentId === commentId) {
              return {
                ...c,
                userReaction: summary.reactionType as any,
                reactionsCount: summary.totalReactions,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.commentId === commentId
                    ? {
                        ...r,
                        userReaction: summary.reactionType as any,
                        reactionsCount: summary.totalReactions,
                      }
                    : r
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (_) {
      fetchComments(true);
    }
  };

  // Report comment
  const handleReportComment = async (commentId: number, reason: string, details?: string) => {
    const res = await forumApi.reportComment(commentId, reason, details);
    if (res.success) {
      if (onToast) onToast('Thành công', 'Cảm ơn bạn đã gửi báo cáo vi phạm.', 'success');
      setComments((prev) =>
        prev.map((c) => {
          if (c.commentId === commentId) {
            return { ...c, userHasReported: true };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) => (r.commentId === commentId ? { ...r, userHasReported: true } : r)),
            };
          }
          return c;
        })
      );
    } else {
      if (onToast) onToast('Thông báo', res.message || 'Không thể gửi báo cáo.', 'warning');
    }
  };

  return (
    <div className="space-y-6 pt-1">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Hỏi đáp & Thảo luận bài học
          </h3>
          <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            {totalCommentsCount}
          </span>
        </div>

        <p className="text-[11px] text-slate-500">
          Trao đổi trực tiếp cùng Giảng viên và cộng đồng học viên
        </p>
      </div>

      {/* Main Comment Input Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <ForumCommentForm
          user={user}
          placeholder="Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học này..."
          buttonText="Gửi thảo luận"
          onSubmit={handleAddComment}
        />
      </div>

      {/* Comment List Section */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs">Đang tải danh sách thảo luận...</p>
        </div>
      ) : comments.length === 0 ? (
        /* Friendly Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Chưa có thảo luận nào</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Hãy là người đầu tiên đặt câu hỏi về bài giảng này để được giảng viên giải đáp hoặc trao đổi cùng các bạn học viên khác!
          </p>
        </div>
      ) : (
        /* Nested Comments Tree */
        <div className="space-y-4">
          {comments.map((comment) => (
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
          ))}
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUserProfileUserId && (
        <ForumUserProfileModal
          isOpen={isUserProfileModalOpen}
          userId={selectedUserProfileUserId}
          onClose={() => {
            setIsUserProfileModalOpen(false);
            setSelectedUserProfileUserId(null);
          }}
        />
      )}
    </div>
  );
};
