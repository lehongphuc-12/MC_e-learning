import React, { useState } from 'react';
import { Reply, EyeOff, Flag, Trash2, ShieldAlert, User as UserIcon } from 'lucide-react';
import { ForumComment } from '../types/forumTypes';
import { ForumReactionButtons } from './ForumReactionButtons';
import { ForumCommentForm } from './ForumCommentForm';
import { ForumReportModal } from './ForumReportModal';
import { User } from '../../../types';

interface ForumCommentItemProps {
  comment: ForumComment;
  currentUser: User | null;
  onReply: (parentCommentId: number, content: string, isAnonymous: boolean, imageUrl?: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onReact: (commentId: number, type: 'LIKE' | 'LOVE' | 'HELPFUL') => void;
  onReport: (commentId: number, reason: string, details?: string) => Promise<void>;
}

export const ForumCommentItem: React.FC<ForumCommentItemProps> = ({
  comment,
  currentUser,
  onReply,
  onDelete,
  onReact,
  onReport,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isHidden = comment.status === 'HIDDEN_BY_REPORTS' || comment.status === 'HIDDEN_BY_ADMIN';
  const isDeleted = comment.status === 'DELETED';
  const isAdmin = currentUser?.role === 'admin';
  const isAuthor = comment.isAuthor;

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    setDeleting(true);
    try {
      await onDelete(comment.commentId);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`group relative space-y-3 ${comment.depthLevel === 2 ? 'ml-6 pl-4 border-l-2 border-slate-800' : ''}`}>
      <div
        className={`rounded-2xl p-4 transition-all duration-200 ${
          isHidden
            ? 'bg-amber-950/20 border border-amber-500/30 opacity-75 grayscale'
            : 'bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80'
        }`}
      >
        {/* Header: Author, Badges, Actions */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {comment.isAnonymous ? (
                <EyeOff className="h-4 w-4 text-cyan-400" />
              ) : comment.authorAvatar ? (
                <img src={comment.authorAvatar} alt={comment.authorName} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-4 w-4 text-slate-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {comment.isAnonymous ? 'Học viên ẩn danh' : comment.authorName}
                </span>

                {comment.isAnonymous && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    <EyeOff className="h-3 w-3" />
                    Ẩn danh
                  </span>
                )}

                {comment.authorRole === 'Admin' && (
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(comment.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Controls: Report & Delete */}
          <div className="flex items-center gap-1">
            {isHidden && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                <ShieldAlert className="h-3 w-3" />
                Đang bị ẩn chờ duyệt
              </span>
            )}

            {!isAuthor && !isHidden && currentUser && (
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                disabled={comment.userHasReported}
                className={`p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors ${
                  comment.userHasReported ? 'text-amber-400 opacity-50 cursor-not-allowed' : ''
                }`}
                title={comment.userHasReported ? 'Bạn đã báo cáo bình luận này' : 'Báo cáo bình luận'}
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}

            {(isAuthor || isAdmin) && !isDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Xóa bình luận"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="text-xs text-slate-200 leading-relaxed mb-3 whitespace-pre-line">
          {comment.content.startsWith('@') ? (
            (() => {
              const colonIdx = comment.content.indexOf(':');
              if (colonIdx > 1 && colonIdx < 60) {
                const mention = comment.content.substring(0, colonIdx);
                const rest = comment.content.substring(colonIdx + 1);
                return (
                  <>
                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 mr-1.5">
                      {mention}
                    </span>
                    {rest}
                  </>
                );
              }
              if (comment.content.startsWith('@Học viên ẩn danh')) {
                const mention = '@Học viên ẩn danh';
                const rest = comment.content.substring(mention.length);
                return (
                  <>
                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 mr-1.5">
                      {mention}
                    </span>
                    {rest}
                  </>
                );
              }
              const spaceIdx = comment.content.indexOf(' ');
              if (spaceIdx > 1) {
                const mention = comment.content.substring(0, spaceIdx);
                const rest = comment.content.substring(spaceIdx);
                return (
                  <>
                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 mr-1.5">
                      {mention}
                    </span>
                    {rest}
                  </>
                );
              }
              return comment.content;
            })()
          ) : (
            comment.content
          )}
        </div>

        {/* Comment Image */}
        {comment.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden max-h-60 border border-slate-800 bg-black/40">
            <img src={comment.imageUrl} alt="Bình luận đính kèm ảnh" className="w-full h-full object-cover max-h-60 rounded-xl" />
          </div>
        )}

        {/* Footer Actions: React & Reply */}
        {!isHidden && !isDeleted && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <ForumReactionButtons
              reactionsCount={comment.reactionsCount}
              userReaction={comment.userReaction}
              onReact={(type) => onReact(comment.commentId, type)}
              size="sm"
            />

            {currentUser && (
              <button
                type="button"
                onClick={() => setIsReplying(!isReplying)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Trả lời</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply Form toggle */}
      {isReplying && (
        <div className="ml-6 pl-4 border-l-2 border-cyan-500/40 pt-2 animate-in fade-in">
          <ForumCommentForm
            user={currentUser}
            placeholder={`Trả lời ${comment.isAnonymous ? 'Học viên ẩn danh' : comment.authorName}...`}
            buttonText="Gửi câu trả lời"
            initialContent={`@${comment.isAnonymous ? 'Học viên ẩn danh' : comment.authorName}: `}
            onCancel={() => setIsReplying(false)}
            onSubmit={async (content, isAnonymous, imageUrl) => {
              await onReply(comment.commentId, content, isAnonymous, imageUrl);
              setIsReplying(false);
            }}
          />
        </div>
      )}

      {/* Render Level 2 Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 pt-1">
          {comment.replies.map((reply) => (
            <ForumCommentItem
              key={reply.commentId}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onReact={onReact}
              onReport={onReport}
            />
          ))}
        </div>
      )}

      {/* Report Modal */}
      <ForumReportModal
        isOpen={isReportModalOpen}
        targetType="COMMENT"
        titleOrSnippet={comment.content}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={async (reason, details) => {
          await onReport(comment.commentId, reason, details);
        }}
      />
    </div>
  );
};
