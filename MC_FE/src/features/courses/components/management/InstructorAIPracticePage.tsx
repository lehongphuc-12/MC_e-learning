
import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileDown,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

import {
  aiPracticeApi,
  type InstructorAIPracticeHistoryItem,
} from '@/features/voiceAI/api/aiPracticeApi';

import { AIPracticeFeedback } from '@/features/voiceAI/components/AIPracticeFeedback';

import type {
  AIPracticeResult,
} from '@/features/voiceAI/types/aiPracticeTypes';

import { printAIPracticePDF } from '@/features/voiceAI/api/AIPracticePDF';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return date.toLocaleString('vi-VN');
}

export function InstructorAIPracticePage() {
  const [courseInput, setCourseInput] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);

  const [page, setPage] = useState(1);

  const [items, setItems] = useState<
    InstructorAIPracticeHistoryItem[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedResult, setSelectedResult] =
    useState<AIPracticeResult | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!courseId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await aiPracticeApi.instructorHistory(
        courseId,
        page,
        PAGE_SIZE
      );

      setItems(response);
    } catch (err) {
      console.error(err);

      setError(
        'Không thể tải lịch sử. Hãy kiểm tra mã khóa học và quyền giảng viên.'
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    const parsedId = Number(courseInput);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Vui lòng nhập mã khóa học hợp lệ.');
      return;
    }

    setError('');
    setPage(1);
    setCourseId(parsedId);
    setSelectedResult(null);
  };

  const openDetail = async (practiceSessionId: number) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedResult(null);

    try {
      const response = await aiPracticeApi.instructorDetail(
        practiceSessionId
      );

      setSelectedResult(response);
    } catch (err) {
      console.error(err);

      setDetailError(
        'Không thể tải feedback. Phiên luyện tập có thể chưa có kết quả hoặc bạn không có quyền truy cập.'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedResult) {
      return;
    }

    const opened = printAIPracticePDF(selectedResult);

    if (!opened) {
      window.alert(
        'Trình duyệt đang chặn cửa sổ mới. Hãy cho phép popup để xuất PDF.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <ClipboardList size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Đánh giá luyện tập AI
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Xem lịch sử và phản hồi AI của học viên theo khóa học.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <BookOpen size={20} className="text-indigo-600" />
            Chọn khóa học
          </h2>

          <form
            onSubmit={handleSearch}
            className="flex flex-wrap gap-3"
          >
            <input
              type="number"
              min={1}
              step={1}
              value={courseInput}
              onChange={(event) =>
                setCourseInput(event.target.value)
              }
              placeholder="Nhập mã khóa học..."
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <Search size={18} />
              Xem lịch sử
            </button>

            {courseId && (
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loading ? 'animate-spin' : ''}
                />
                Làm mới
              </button>
            )}
          </form>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {courseId && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-slate-800">
                Lịch sử khóa học #{courseId}
              </h2>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center gap-3 text-indigo-700">
                <Loader2 size={23} className="animate-spin" />
                Đang tải dữ liệu...
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">
                Không có phiên luyện tập trong trang này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Mã phiên</th>
                      <th className="px-6 py-4">Học viên</th>
                      <th className="px-6 py-4">Bài học</th>
                      <th className="px-6 py-4">Thời gian</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr
                        key={item.practiceSessionId}
                        className="hover:bg-indigo-50/40"
                      >
                        <td className="px-6 py-4 font-bold">
                          #{item.practiceSessionId}
                        </td>

                        <td className="px-6 py-4">
                          Học viên #{item.learnerId}
                        </td>

                        <td className="px-6 py-4">
                          {item.lessonId
                            ? `Bài #${item.lessonId}`
                            : '—'}
                        </td>

                        <td className="px-6 py-4">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                            {item.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            disabled={
                              detailLoading ||
                              item.status.toUpperCase() !==
                                'COMPLETED'
                            }
                            onClick={() =>
                              void openDetail(item.practiceSessionId)
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
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

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className="text-xs text-slate-500">
                Trang {page}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || page === 1}
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                  className="rounded-xl border p-2 disabled:opacity-40"
                >
                  <ChevronLeft size={19} />
                </button>

                <button
                  type="button"
                  disabled={
                    loading || items.length < PAGE_SIZE
                  }
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                  className="rounded-xl border p-2 disabled:opacity-40"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
          </section>
        )}

        {(selectedResult || detailLoading || detailError) && (
          <section className="space-y-5 rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết feedback AI
                </h2>

                {selectedResult && (
                  <p className="mt-1 text-sm text-slate-500">
                    Phiên #{selectedResult.practiceSessionId}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {selectedResult && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    <FileDown size={17} />
                    Lưu PDF
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedResult(null);
                    setDetailError('');
                  }}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Đóng chi tiết"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {detailLoading && (
              <div className="flex items-center gap-3 py-6 text-indigo-700">
                <Loader2 size={20} className="animate-spin" />
                Đang tải feedback...
              </div>
            )}

            {detailError && (
              <p role="alert" className="text-sm text-red-600">
                {detailError}
              </p>
            )}

            {selectedResult && (
              <AIPracticeFeedback result={selectedResult} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}
