
import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../services/api';

type Notice = {
  id: number;
  type?: string;
  title: string;
  message: string;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const box = useRef<HTMLDivElement>(null);

  const auth = () => ({
    Authorization: `Bearer ${useAuthStore.getState().token || ''}`,
  });

  const refresh = async () => {
    if (!useAuthStore.getState().token) return;

    try {
      const r = await fetch(`${API_BASE_URL}/notifications`, {
        headers: auth(),
      });

      if (!r.ok) {
        throw new Error('Không thể tải thông báo');
      }

      const data = await r.json();

      const firstPage: Notice[] = data.items || [];
      setItems((prev) => {
        // Giữ các trang lịch sử đã tải khi tự làm mới mỗi 30 giây.
        const older = prev.filter((n) => !firstPage.some((fresh) => fresh.id === n.id));
        return [...firstPage, ...older];
      });
      setHasMore((current) => page === 1 ? firstPage.length === 30 : current);
      setCount(data.unreadCount || 0);
      setError('');
    } catch {
      setError('Không thể tải thông báo. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    if (!token) {
      setItems([]);
      setCount(0);
      setOpen(false);
      setPage(1);
      setHasMore(false);
      return;
    }

    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);

    const handleFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);

    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const r = await fetch(`${API_BASE_URL}/notifications?page=${nextPage}`, { headers: auth() });
      if (!r.ok) throw new Error('Không thể tải lịch sử');
      const data = await r.json();
      const nextItems: Notice[] = data.items || [];
      setItems((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        return [...prev, ...nextItems.filter((n) => !existing.has(n.id))];
      });
      setPage(nextPage);
      setHasMore(nextItems.length === 30);
      setError('');
    } catch {
      setError('Không thể tải thêm thông báo. Vui lòng thử lại.');
    } finally {
      setLoadingMore(false);
    }
  };

  const visibleItems = items.filter((n) =>
    tab === 'all' || (tab === 'read' ? n.isRead : !n.isRead)
  );

  const markRead = async (id: number): Promise<boolean> => {
    try {
      const r = await fetch(
        `${API_BASE_URL}/notifications/${id}/read`,
        {
          method: 'PATCH',
          headers: auth(),
        }
      );

      if (!r.ok) {
        throw new Error('Không thể đánh dấu đã đọc');
      }

      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      );

      setCount((prev) => Math.max(0, prev - 1));

      return true;
    } catch {
      setError('Không thể đánh dấu thông báo đã đọc.');
      return false;
    }
  };

  const markAllRead = async () => {
    if (loading || count === 0) return;

    setLoading(true);

    try {
      const r = await fetch(
        `${API_BASE_URL}/notifications/read-all`,
        {
          method: 'PATCH',
          headers: auth(),
        }
      );

      if (!r.ok) {
        throw new Error('Không thể đánh dấu tất cả đã đọc');
      }

      setItems((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );

      setCount(0);
      setError('');

      await refresh();
    } catch {
      setError('Không thể đánh dấu tất cả đã đọc.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (n: Notice) => {
    if (!n.isRead) {
      await markRead(n.id);
    }

    setOpen(false);

    if (
      n.url?.startsWith('/') &&
      !n.url.startsWith('//')
    ) {
      let targetUrl = n.url;
      const isLessonDiscussion =
        n.type === 'lesson_comment' ||
        (targetUrl.includes('/learn') && targetUrl.includes('lessonId='));
      if (isLessonDiscussion && !targetUrl.includes('tab=')) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'tab=discussion';
      }
      navigate(targetUrl, {
        state: isLessonDiscussion ? { openTab: 'discussion' } : undefined,
      });
    }
  };

  if (!token) return null;

  return (
    <div className="relative" ref={box}>
      {/* Nút chuông */}
      <button
        type="button"
        aria-label={
          count > 0
            ? `Thông báo, ${count} chưa đọc`
            : 'Thông báo'
        }
        title="Thông báo"
        onClick={() => {
          setOpen(!open);

          if (!open) {
            void refresh();
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-blue-50"
      >
        <Bell size={20} />

        {count > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Danh sách thông báo */}
      {open && (
        <div className="absolute right-0 top-12 z-[100] w-[min(90vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <strong className="text-base">
                Thông báo
              </strong>

              {count > 0 && (
                <p className="mt-0.5 text-xs text-blue-600">
                  {count} thông báo chưa đọc
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={loading || count === 0}
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={15} />
              Đọc tất cả
            </button>
          </div>

          <div className="flex gap-1 border-b px-3 py-2" role="tablist" aria-label="Lọc thông báo">
            {([['all', 'Tất cả'], ['unread', 'Chưa đọc'], ['read', 'Đã đọc']] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === value ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Nội dung */}
          <div className="max-h-96 overflow-y-auto">

            {error && (
              <div className="border-b bg-red-50 px-4 py-3">
                <p className="text-xs text-red-600">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-1 text-xs font-semibold text-red-700 underline"
                >
                  Thử lại
                </button>
              </div>
            )}

            {!error && visibleItems.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">
                {tab === 'read' ? 'Chưa có thông báo đã đọc' : tab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
              </p>
            )}

            {visibleItems.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleNotificationClick(n)}
                className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-slate-100 ${
                  n.isRead
                    ? 'bg-white'
                    : 'bg-blue-50'
                }`}
              >
                {/* Nội dung thông báo */}
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm ${
                      n.isRead
                        ? 'font-medium text-slate-500'
                        : 'font-bold text-slate-900'
                    }`}
                  >
                    {n.title}
                  </div>

                  <p
                    className={`mt-1 text-xs ${
                      n.isRead
                        ? 'text-slate-400'
                        : 'text-slate-700'
                    }`}
                  >
                    {n.message}
                  </p>

                  <time className="mt-1 block text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </time>
                </div>

                {/* Chấm xanh: chỉ hiện khi chưa đọc */}
                {!n.isRead && (
                  <span
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"
                    title="Chưa đọc"
                    aria-label="Chưa đọc"
                  />
                )}
              </button>
            ))}
            {hasMore && (
              <button type="button" disabled={loadingMore} onClick={() => void loadMore()}
                className="w-full px-4 py-3 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                {loadingMore ? 'Đang tải...' : 'Tải thêm thông báo cũ'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
