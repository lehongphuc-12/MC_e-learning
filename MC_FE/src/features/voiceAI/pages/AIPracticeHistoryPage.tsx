
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { FileDown } from 'lucide-react';
import { printAIPracticePDF } from '../api/AIPracticePDF';
import { aiPracticeApi } from '../api/aiPracticeApi';
import { AIPracticeFeedback } from '../components/AIPracticeFeedback';
import type {
  AIPracticeHistoryItem,
  AIPracticeResult,
} from '../types/aiPracticeTypes';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'PROCESSING':
      return 'Đang phân tích';
    case 'PENDING':
      return 'Đang chờ';
    case 'FAILED':
      return 'Phân tích thất bại';
    default:
      return status;
  }
}

function getStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function AIPracticeHistoryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<AIPracticeHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedResult, setSelectedResult] =
    useState<AIPracticeResult | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await aiPracticeApi.history(page, PAGE_SIZE);
      setItems(response);
    } catch (err) {
      console.error('Không thể tải lịch sử AI:', err);
      setError('Không thể tải lịch sử luyện tập. Vui lòng thử lại.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openDetail = async (practiceSessionId: number) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedResult(null);

    try {
      const response = await aiPracticeApi.detail(practiceSessionId);
      setSelectedResult(response);
    } catch (err) {
      console.error('Không thể tải feedback AI:', err);
      setDetailError(
        'Không thể mở kết quả AI. Phiên luyện tập có thể chưa hoàn thành.'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedResult(null);
    setDetailError('');
  };

  const canGoNext = items.length === PAGE_SIZE;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"
            >
              <ArrowLeft size={17} />
              Quay lại
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                <ClipboardList size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Lịch sử luyện tập AI
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Xem lại các phiên luyện nói và phản hồi đã lưu.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
            Làm mới
          </button>
        </div>

        {/* History table */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-slate-800">
              Danh sách phiên luyện tập
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Dữ liệu được sắp xếp từ mới nhất đến cũ nhất.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-violet-700">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm font-medium">
                Đang tải lịch sử...
              </span>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadHistory()}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ClipboardList
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-bold text-slate-700">
                {page === 1
                  ? 'Chưa có lịch sử luyện tập'
                  : 'Không còn phiên luyện tập'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {page === 1
                  ? 'Các phiên luyện tập AI sẽ xuất hiện tại đây.'
                  : 'Hãy quay lại trang trước để xem lịch sử.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Mã phiên</th>
                    <th className="px-6 py-4">Hình thức</th>
                    <th className="px-6 py-4">Bài học</th>
                    <th className="px-6 py-4">Thời gian</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr
                      key={item.practiceSessionId}
                      className="transition hover:bg-violet-50/40"
                    >
                      <td className="px-6 py-4 font-bold text-slate-800">
                        #{item.practiceSessionId}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {item.practiceMode === 'COURSE'
                          ? 'Trong khóa học'
                          : 'Luyện tập tự do'}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {item.lessonId
                          ? `Bài học #${item.lessonId}`
                          : '—'}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={15} />
                          {formatDate(item.createdAt)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={
                            detailLoading ||
                            item.status.toUpperCase() !== 'COMPLETED'
                          }
                          onClick={() =>
                            void openDetail(item.practiceSessionId)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye size={16} />
                          Xem feedback
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Trang {page}
              {!loading && ` · ${items.length} phiên`}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                disabled={loading || !canGoNext}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </section>

        {/* Detail feedback */}
        {(selectedResult || detailLoading || detailError) && (
          <section className="space-y-5 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết phản hồi AI
                </h2>

                {selectedResult && (
                  <p className="mt-1 text-sm text-slate-500">
                    Phiên #{selectedResult.practiceSessionId}
                    {' · '}
                    {formatDate(selectedResult.createdAt)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeDetail}
                aria-label="Đóng chi tiết"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            {detailLoading && (
              <div className="flex items-center gap-3 py-8 text-violet-700">
                <Loader2 size={21} className="animate-spin" />
                <span className="text-sm">
                  Đang tải phản hồi AI...
                </span>
              </div>
            )}

            {detailError && (
              <p role="alert" className="text-sm text-red-600">
                {detailError}
              </p>
            )}

            {selectedResult && (
  <>
    <AIPracticeFeedback result={selectedResult} />

    <button
      type="button"
      onClick={() => {
        const opened = printAIPracticePDF(selectedResult);

        if (!opened) {
          window.alert(
            'Trình duyệt đang chặn cửa sổ mới. Hãy cho phép popup để xuất PDF.'
          );
        }
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
    >
      <FileDown size={18} />
      In / Lưu feedback PDF
    </button>
  </>
)}
          </section>
        )}
      </div>
    </main>
  );
}
