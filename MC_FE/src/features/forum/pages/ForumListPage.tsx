import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, MessageSquare, TrendingUp, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { ForumTopic, ForumPost } from '../types/forumTypes';
import { forumApi } from '../services/forumApi';
import { ForumFilterBar } from '../components/ForumFilterBar';
import { ForumPostCard } from '../components/ForumPostCard';
import { ForumPostFormModal } from '../components/ForumPostFormModal';
import { User } from '../../../types';
import { ToastType } from '../../../components/common/Toast';

interface ForumListPageProps {
  user: User | null;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const ForumListPage: React.FC<ForumListPageProps> = ({ user, onToast }) => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'hot' | 'most_commented'>('latest');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);

  // Fetch topics
  useEffect(() => {
    forumApi.getTopics().then(setTopics);
  }, []);

  const fetchPostsSilent = async () => {
    try {
      const res = await forumApi.getPosts({
        page,
        limit: 8,
        topicId: selectedTopicId,
        search: searchQuery,
        sortBy,
      });
      setPosts(res.items);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalItems);
    } catch (_) {}
  };

  // Fetch posts
  const fetchPosts = async () => {
    if (posts.length === 0) setLoading(true);
    try {
      await fetchPostsSilent();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Realtime auto-polling every 5s for list page
    const intervalId = setInterval(() => {
      fetchPostsSilent();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [page, selectedTopicId, searchQuery, sortBy]);

  const handleCreatePost = async (topicId: number, title: string, content: string, imageUrl?: string, isAnonymous?: boolean) => {
    if (!user) {
      if (onToast) onToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để tạo bài viết.', 'info');
      navigate('/login');
      return;
    }

    const res = await forumApi.createPost({ topicId, title, content, imageUrl, isAnonymous });
    if (res.success) {
      if (onToast) onToast('Thành công', 'Bài viết mới của bạn đã được đăng thành công!', 'success');
      fetchPosts();
    } else {
      if (onToast) onToast('Lỗi', res.message || 'Không thể tạo bài viết.', 'error');
    }
  };

  const handleReactPost = async (postId: number, type: 'LIKE' | 'LOVE' | 'HELPFUL') => {
    if (!user) {
      if (onToast) onToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để thả tương tác.', 'info');
      return;
    }

    // Optimistic update for post cards list
    setPosts((prev) =>
      prev.map((p) => {
        if (p.postId === postId) {
          const isRemoving = p.userReaction === type;
          const newReaction = isRemoving ? undefined : type;
          let countDiff = 0;
          if (isRemoving) countDiff = -1;
          else if (!p.userReaction) countDiff = 1;

          return {
            ...p,
            userReaction: newReaction,
            reactionsCount: Math.max(0, p.reactionsCount + countDiff),
          };
        }
        return p;
      })
    );

    try {
      const res = await forumApi.togglePostReaction(postId, type);
      if (res) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.postId === postId) {
              return {
                ...p,
                userReaction: res.reactionType as any,
                reactionsCount: res.totalReactions,
              };
            }
            return p;
          })
        );
      }
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-900/60 via-slate-900 to-slate-900 border border-cyan-500/20 p-8 shadow-2xl">
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Diễn đàn Cộng đồng MC & Diễn xuất
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Giao lưu, Chia sẻ & Kết nối
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Nơi trao đổi bí quyết làm chủ sân khấu, xử lý tình huống MC, thảo luận bài học và tìm kiếm các cơ hội làm việc thực tế.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  if (onToast) onToast('Đăng nhập', 'Vui lòng đăng nhập để đăng bài.', 'info');
                  navigate('/login');
                } else {
                  setIsFormModalOpen(true);
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 shrink-0"
            >
              <MessageSquarePlus className="h-5 w-5" />
              <span>Tạo Bài viết mới</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <ForumFilterBar
          topics={topics}
          selectedTopicId={selectedTopicId}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onSelectTopic={(id) => {
            setSelectedTopicId(id);
            setPage(1);
          }}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          onSortChange={(s) => {
            setSortBy(s);
            setPage(1);
          }}
        />

        {/* Main Posts List & Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Posts Feed (Single Column, 1 Row = 1 Post) */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-64 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-12 text-center space-y-3">
                <MessageSquare className="h-12 w-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Chưa có bài viết nào</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy là người đầu tiên chia sẻ câu chuyện hoặc đặt câu hỏi trên diễn đàn!
                </p>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Đăng bài viết ngay
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <ForumPostCard
                    key={post.postId}
                    post={post}
                    onClick={() => navigate(`/forum/posts/${post.postId}`)}
                    onReact={handleReactPost}
                  />
                ))}
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  Hiển thị <strong>{posts.length}</strong> / <strong>{totalItems}</strong> bài viết
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-300 px-3">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats Widget */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Thống kê Diễn đàn
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Tổng bài viết</div>
                  <div className="text-lg font-black text-cyan-400 mt-1">{totalItems}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Chủ đề</div>
                  <div className="text-lg font-black text-pink-400 mt-1">{topics.length}</div>
                </div>
              </div>
            </div>

            {/* Rules Widget */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 text-xs text-slate-400 leading-relaxed">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Filter className="h-4 w-4 text-amber-400" />
                Nội quy Diễn đàn
              </h3>
              <ul className="space-y-2 list-disc list-inside text-slate-300">
                <li>Tôn trọng các thành viên khác, không phát ngôn thù hận.</li>
                <li>Không đăng bài quảng cáo rác (spam) hoặc thông tin sai lệch.</li>
                <li>Bài viết/Bình luận nhận đủ <strong>5 báo cáo</strong> sẽ tự động ẩn chờ kiểm duyệt.</li>
                <li>Hỗ trợ tính năng <strong>Đăng ẩn danh</strong> khi phát biểu ý kiến cá nhân.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Post Form Modal */}
      <ForumPostFormModal
        isOpen={isFormModalOpen}
        topics={topics}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};
