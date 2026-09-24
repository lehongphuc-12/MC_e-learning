import React from 'react';
import { MessageSquare, Pin, ShieldAlert, User as UserIcon, EyeOff } from 'lucide-react';
import { ForumPost } from '../types/forumTypes';
import { ForumTopicBadge } from './ForumTopicBadge';
import { ForumReactionButtons } from './ForumReactionButtons';

interface ForumPostCardProps {
  post: ForumPost;
  onClick: () => void;
  onReact: (postId: number, type: 'LIKE' | 'LOVE' | 'HELPFUL') => void;
  onAuthorClick?: (authorId: number) => void;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({ post, onClick, onReact, onAuthorClick }) => {
  const isHidden = post.status === 'HIDDEN_BY_REPORTS' || post.status === 'HIDDEN_BY_ADMIN';

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-3xl bg-slate-900/90 border p-6 sm:p-7 transition-all duration-300 hover:shadow-2xl cursor-pointer space-y-4 ${
        isHidden
          ? 'border-amber-500/40 opacity-75 grayscale bg-amber-950/10'
          : post.isPinned
          ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 via-slate-900 to-slate-900 shadow-cyan-500/10'
          : 'border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* Header: Author Info & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          onClick={(e) => {
            if (!post.isAnonymous && post.authorId && onAuthorClick) {
              e.stopPropagation();
              onAuthorClick(post.authorId);
            }
          }}
          className={`flex items-center gap-3 ${!post.isAnonymous && post.authorId ? 'cursor-pointer hover:opacity-90' : ''}`}
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
              <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
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
            <span className="text-xs text-slate-400">
              {new Date(post.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ForumTopicBadge name={post.topicName} />
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              <Pin className="h-3.5 w-3.5" />
              Ghim
            </span>
          )}
          {isHidden && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
              <ShieldAlert className="h-3.5 w-3.5" />
              Đang ẩn chờ duyệt
            </span>
          )}
        </div>
      </div>

      {/* Post Title */}
      <h2 className="text-lg sm:text-2xl font-black text-white leading-snug group-hover:text-cyan-300 transition-colors tracking-tight">
        {post.title}
      </h2>

      {/* Content Snippet */}
      <p className="text-sm text-slate-300 leading-relaxed line-clamp-4 whitespace-pre-line">
        {post.content}
      </p>

      {/* Large Image Showcase */}
      {post.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black/40 max-h-[460px] flex items-center justify-center">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-contain max-h-[460px] rounded-2xl group-hover:scale-[1.01] transition-transform duration-300"
          />
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <div onClick={(e) => e.stopPropagation()}>
          <ForumReactionButtons
            reactionsCount={post.reactionsCount}
            userReaction={post.userReaction}
            disabled={isHidden}
            onReact={(type) => onReact(post.postId, type)}
            size="md"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 hover:text-white transition-colors">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span>{post.commentsCount} bình luận</span>
          </span>
        </div>
      </div>
    </div>
  );
};
