
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileAudio,
  FileDown,
  Headphones,
  History,
  Info,
  Loader2,
  Mic2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

import { aiPracticeApi } from '../api/aiPracticeApi';
import { printAIPracticePDF } from '../api/AIPracticePDF';
import { AIPracticeRecorder } from '../components/AIPracticeRecorder';
import { AIPracticeFeedback } from '../components/AIPracticeFeedback';
import { useAIPractice } from '../hooks/useAIPractice';

import type {
  AIPracticeHistoryItem,
  AIPracticeResult,
} from '../types/aiPracticeTypes';

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const HISTORY_PAGE_SIZE = 10;

type PageTab = 'practice' | 'history';

function formatPracticeDate(value: string): string {
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

function getPracticeStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'PROCESSING':
      return 'Đang phân tích';
    case 'PENDING':
      return 'Đang chờ';
    case 'FAILED':
      return 'Thất bại';
    default:
      return status;
  }
}

function getPracticeStatusColor(status: string): string {
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

export function AIPracticePage() {
  const { courseId: courseParam, lessonId: lessonParam } = useParams();

  const courseId = Number(courseParam);
  const lessonId = Number(lessonParam);

  const navigate = useNavigate();
  const location = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPrefilledRef = useRef(false);

  const historyRequestRef = useRef(0);
  const detailRequestRef = useRef(0);

  // =========================
  // PRACTICE STATE
  // =========================

  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [expectedText, setExpectedText] = useState('');

  const [activeTab, setActiveTab] = useState<
    'record' | 'upload'
  >('record');

  const [fileError, setFileError] = useState('');

  const {
    result,
    loading,
    error,
    submit,
    reset,
  } = useAIPractice();

  // =========================
  // PAGE TABS
  // =========================

  const [activePageTab, setActivePageTab] =
    useState<PageTab>('practice');

  // =========================
  // HISTORY STATE
  // =========================

  const [historyItems, setHistoryItems] = useState<
    AIPracticeHistoryItem[]
  >([]);

  const [historyPage, setHistoryPage] = useState(1);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] = useState('');

  const [historyRefreshKey, setHistoryRefreshKey] =
    useState(0);

  // =========================
  // HISTORY DETAIL STATE
  // =========================

  const [
    selectedHistoryResult,
    setSelectedHistoryResult,
  ] = useState<AIPracticeResult | null>(null);

  const [
    historyDetailLoading,
    setHistoryDetailLoading,
  ] = useState(false);

  const [
    historyDetailError,
    setHistoryDetailError,
  ] = useState('');

  const validCourse =
    Number.isInteger(courseId) && courseId > 0;

  const validLesson =
    Number.isInteger(lessonId) && lessonId > 0;

  // =========================
  // TELEPROMPTER PREFILL
  // =========================

  useEffect(() => {
    if (hasPrefilledRef.current) {
      return;
    }

    const state = location.state as {
      fromTeleprompter?: boolean;
      prefillScriptText?: string;
      prefillAudioFile?: File;
    } | null;

    if (!state?.fromTeleprompter) {
      return;
    }

    hasPrefilledRef.current = true;

    if (state.prefillScriptText) {
      setExpectedText(state.prefillScriptText);
    }

    if (state.prefillAudioFile) {
      setFile(state.prefillAudioFile);
      setActiveTab('upload');
    }
  }, [location.state]);

  // =========================
  // AUDIO PREVIEW
  // =========================

  useEffect(() => {
    if (!audio) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(audio);

    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audio]);

  // =========================
  // LOAD HISTORY
  // =========================

  useEffect(() => {
    if (activePageTab !== 'history') {
      return;
    }

    const requestId = ++historyRequestRef.current;
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const response = await aiPracticeApi.history(
          historyPage,
          HISTORY_PAGE_SIZE
        );

        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryItems(response);
        }
      } catch (err) {
        console.error(
          'Không thể tải lịch sử luyện tập AI:',
          err
        );

        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryItems([]);

          setHistoryError(
            'Không thể tải lịch sử luyện tập. Vui lòng thử lại.'
          );
        }
      } finally {
        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [
    activePageTab,
    historyPage,
    historyRefreshKey,
  ]);

  // =========================
  // AUDIO HANDLERS
  // =========================

  const setFile = (file: File | null) => {
    setFileError('');

    if (!file) {
      setAudio(null);
      reset();
      return;
    }

    const extension = file.name
      .split('.')
      .pop()
      ?.toLowerCase();

    if (
      extension !== 'wav' &&
      extension !== 'flac'
    ) {
      setFileError(
        'Chỉ hỗ trợ file WAV hoặc FLAC.'
      );
      return;
    }

    if (file.size === 0) {
      setFileError(
        'File âm thanh không được để trống.'
      );
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setFileError(
        'File âm thanh vượt quá giới hạn 20 MB.'
      );
      return;
    }

    setAudio(file);
    reset();
  };

  const clearAudio = () => {
    setAudio(null);
    setFileError('');
    reset();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (
      !audio ||
      loading ||
      !validCourse ||
      !validLesson
    ) {
      return;
    }

    await submit(
      courseId,
      lessonId,
      audio,
      expectedText
    );
  };

  // =========================
  // HISTORY HANDLERS
  // =========================

  const refreshHistory = () => {
    setHistoryRefreshKey(
      (current) => current + 1
    );
  };

  const closeHistoryDetail = () => {
    ++detailRequestRef.current;

    setSelectedHistoryResult(null);
    setHistoryDetailLoading(false);
    setHistoryDetailError('');
  };

  const switchPageTab = (tab: PageTab) => {
    closeHistoryDetail();

    if (tab === 'history') {
      setHistoryPage(1);

      if (activePageTab === 'history') {
        refreshHistory();
      }
    }

    setActivePageTab(tab);
  };

  const openHistoryDetail = async (
    practiceSessionId: number
  ) => {
    const requestId = ++detailRequestRef.current;

    setHistoryDetailLoading(true);
    setHistoryDetailError('');
    setSelectedHistoryResult(null);

    try {
      const response = await aiPracticeApi.detail(
        practiceSessionId
      );

      if (requestId === detailRequestRef.current) {
        setSelectedHistoryResult(response);
      }
    } catch (err) {
      console.error(
        'Không thể tải feedback AI:',
        err
      );

      if (requestId === detailRequestRef.current) {
        setHistoryDetailError(
          'Không thể tải feedback. Phiên luyện tập có thể chưa hoàn thành.'
        );
      }
    } finally {
      if (requestId === detailRequestRef.current) {
        setHistoryDetailLoading(false);
      }
    }
  };

  // =========================
  // PDF HANDLER
  // =========================

  const handlePrintFeedback = (
    feedback: AIPracticeResult
  ) => {
    const opened = printAIPracticePDF(feedback);

    if (!opened) {
      window.alert(
        'Trình duyệt đang chặn cửa sổ mới. Hãy cho phép popup để in hoặc lưu PDF.'
      );
    }
  };

  // =========================
  // INVALID ROUTE
  // =========================

  if (!validCourse || !validLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Info className="mx-auto mb-3 h-10 w-10 text-red-500" />

          <h2 className="text-xl font-bold text-slate-900">
            Đường dẫn không hợp lệ
          </h2>

          <p className="mt-2 text-slate-500">
            Không tìm thấy thông tin bài luyện tập.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-slate-50 pb-16">

      {/* HEADER */}

      <div className="border-b border-violet-100 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">

          <button
            type="button"
            onClick={() => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(`/courses/${courseId}/learn`);
  }
}}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowLeft size={18} />
            Quay lại khóa học
          </button>

          <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            <Sparkles size={14} />
            AI Speaking Practice
          </div>

        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-7 px-5 py-8">

        {/* MAIN TABS */}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">

          <button
            type="button"
            onClick={() =>
              switchPageTab('practice')
            }
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
              activePageTab === 'practice'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-violet-50'
            }`}
          >
            <Mic2 size={18} />
            Luyện tập với AI
          </button>

          <button
            type="button"
            onClick={() =>
              switchPageTab('history')
            }
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
              activePageTab === 'history'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-violet-50'
            }`}
          >
            <History size={18} />
            Lịch sử luyện tập
          </button>

        </div>

        {/* ======================================
            TAB 1: LUYỆN TẬP VỚI AI
        ====================================== */}

        {activePageTab === 'practice' && (
          <>

            {/* HERO */}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 p-7 text-white shadow-xl shadow-violet-200 md:p-10">

              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

              <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-pink-300/20 blur-3xl" />

              <div className="relative z-10 max-w-2xl">

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold">
                  <Sparkles size={15} />
                  LUYỆN PHÁT ÂM CÙNG AI
                </div>

                <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
                  Luyện nói tự tin hơn

                  <span className="mt-1 block text-violet-100">
                    với trợ lý AI
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-violet-100 md:text-base">
                  Ghi âm giọng nói hoặc tải lên file âm thanh.
                  Hệ thống sẽ phân tích bằng mô hình V4-B
                  và đưa ra nhận xét, gợi ý cải thiện phát âm.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs">
                    <ShieldCheck size={15} />
                    Không trừ lượt thi
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs">
                    <CheckCircle2 size={15} />
                    Không ảnh hưởng điểm số
                  </span>

                </div>

              </div>

              <AudioLines
                size={140}
                strokeWidth={0.7}
                className="pointer-events-none absolute bottom-5 right-8 hidden text-white/20 md:block"
              />

            </section>

            {/* MAIN CONTENT */}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">

              <div className="space-y-6">

                {/* EXPECTED TEXT */}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5 flex items-start gap-3">

                    <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                      <FileAudio size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        1. Nội dung luyện đọc
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Nhập văn bản bạn dự định đọc để
                        cung cấp thêm ngữ cảnh cho AI.
                      </p>
                    </div>

                  </div>

                  <textarea
                    value={expectedText}
                    onChange={(event) =>
                      setExpectedText(event.target.value)
                    }
                    maxLength={5000}
                    disabled={loading}
                    rows={5}
                    placeholder="Ví dụ: Xin chào, tôi đang luyện tập kỹ năng nói và phát âm..."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                  />

                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>Không bắt buộc</span>
                    <span>
                      {expectedText.length}/5000 ký tự
                    </span>
                  </div>

                </section>

                {/* AUDIO INPUT */}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5 flex items-start gap-3">

                    <div className="rounded-xl bg-fuchsia-100 p-3 text-fuchsia-700">
                      <Mic2 size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        2. Cung cấp giọng nói
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Chọn ghi âm trực tiếp hoặc tải
                        file âm thanh từ thiết bị.
                      </p>
                    </div>

                  </div>

                  {/* RECORD / UPLOAD TABS */}

                  <div className="mb-6 grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setActiveTab('record')
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-bold transition ${
                        activeTab === 'record'
                          ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Mic2 size={19} />
                      Ghi âm trực tiếp
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setActiveTab('upload')
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-bold transition ${
                        activeTab === 'upload'
                          ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <UploadCloud size={19} />
                      Tải file âm thanh
                    </button>

                  </div>

                  {/* RECORD */}

                  {activeTab === 'record' ? (

                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-5">

                      <div className="mb-4 text-center">

                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                          <Mic2 size={30} />
                        </div>

                        <h3 className="font-bold text-slate-800">
                          Ghi âm giọng nói
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Sử dụng microphone để luyện
                          phát âm trực tiếp.
                        </p>

                      </div>

                      <AIPracticeRecorder
                        disabled={loading}
                        onAudio={setFile}
                      />

                    </div>

                  ) : (

                    /* UPLOAD */

                    <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-7 text-center">

                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                        <UploadCloud size={30} />
                      </div>

                      <h3 className="font-bold text-slate-800">
                        Tải lên file ghi âm
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Hỗ trợ định dạng WAV hoặc FLAC
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Dung lượng tối đa 20 MB
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".wav,.flac,audio/wav,audio/flac"
                        disabled={loading}
                        className="sr-only"
                        onChange={(event) => {
                          setFile(
                            event.target.files?.[0] ?? null
                          );

                          event.target.value = '';
                        }}
                      />

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50"
                      >
                        <UploadCloud size={18} />
                        Chọn file từ máy tính
                      </button>

                    </div>
                  )}

                  {/* FILE ERROR */}

                  {fileError && (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
                    >
                      {fileError}
                    </p>
                  )}

                  {/* SELECTED AUDIO */}

                  {audio && (

                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">

                      <div className="flex items-center gap-3">

                        <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                          <FileAudio size={23} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-bold text-slate-800">
                            {audio.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(audio.size / 1048576).toFixed(2)}
                            {' MB · '}
                            Sẵn sàng phân tích
                          </p>

                        </div>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={clearAudio}
                          aria-label="Xóa file âm thanh"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <X size={19} />
                        </button>

                      </div>

                      {audioUrl && (

                        <div className="mt-4">

                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <Headphones size={15} />
                            Nghe lại bản ghi
                          </div>

                          <audio
                            controls
                            src={audioUrl}
                            className="w-full"
                          />

                        </div>

                      )}

                    </div>

                  )}

                  {/* SUBMIT */}

                  <button
                    type="button"
                    disabled={loading || !audio}
                    onClick={() =>
                      void handleSubmit()
                    }
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {loading ? (
                      <>
                        <Loader2
                          size={21}
                          className="animate-spin"
                        />
                        Đang phân tích phát âm...
                      </>
                    ) : (
                      <>
                        <Sparkles size={21} />
                        Phân tích phát âm bằng AI
                      </>
                    )}

                  </button>

                  {loading && (
                    <p className="mt-3 text-center text-xs text-slate-500">
                      Hệ thống đang xử lý âm thanh và tạo phản hồi.
                      Vui lòng chờ và không đóng trang.
                    </p>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                      {error}
                    </div>
                  )}

                </section>

                {/* RESULT */}

                {result && (

                  <section className="space-y-4">

                    <div className="flex items-center gap-3">

                      <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                        <CheckCircle2 size={22} />
                      </div>

                      <div>

                        <h2 className="text-xl font-bold text-slate-900">
                          3. Kết quả phân tích AI
                        </h2>

                        <p className="text-sm text-slate-500">
                          Nhận xét và hướng dẫn luyện tập.
                        </p>

                      </div>

                    </div>

                    <AIPracticeFeedback result={result} />

                    <div className="flex flex-wrap gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          handlePrintFeedback(result)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                      >
                        <FileDown size={18} />
                        In / Lưu feedback PDF
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={clearAudio}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-3 font-semibold text-violet-700 transition hover:bg-violet-50"
                      >
                        <RotateCcw size={18} />
                        Luyện tập lại
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          switchPageTab('history')
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <History size={18} />
                        Xem lịch sử
                      </button>

                    </div>

                  </section>

                )}

              </div>

              {/* SIDEBAR */}

              <aside className="space-y-5 lg:sticky lg:top-6">

                {/* PROCESS */}

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5 flex items-center gap-3">

                    <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                      <Sparkles size={21} />
                    </div>

                    <h3 className="font-bold text-slate-900">
                      Quy trình phân tích
                    </h3>

                  </div>

                  <div className="space-y-5">

                    {[
                      {
                        number: '01',
                        title: 'Cung cấp âm thanh',
                        description:
                          'Ghi âm hoặc tải file WAV/FLAC.',
                      },
                      {
                        number: '02',
                        title: 'Mô hình V4-B',
                        description:
                          'Phân tích các nhóm đặc trưng phát âm.',
                      },
                      {
                        number: '03',
                        title: 'Phản hồi từ AI',
                        description:
                          'Tổng hợp nhận xét và đề xuất luyện tập.',
                      },
                    ].map((step) => (

                      <div
                        key={step.number}
                        className="flex gap-3"
                      >

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-extrabold text-violet-700">
                          {step.number}
                        </div>

                        <div>

                          <p className="text-sm font-bold text-slate-800">
                            {step.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {step.description}
                          </p>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

                {/* SAFETY */}

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">

                  <div className="mb-3 flex items-center gap-2 text-emerald-800">
                    <ShieldCheck size={20} />

                    <h3 className="font-bold">
                      Luyện tập an toàn
                    </h3>
                  </div>

                  <p className="text-sm leading-7 text-emerald-900/80">
                    Đây là chế độ luyện tập độc lập.
                    Kết quả AI không được sử dụng để
                    chấm điểm bài thi chính thức,
                    không tiêu hao lượt thi và
                    không thay đổi tiến độ học.
                  </p>

                </div>

                {/* TIPS */}

                <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">

                  <div className="mb-3 flex items-center gap-2 text-indigo-800">
                    <Info size={20} />

                    <h3 className="font-bold">
                      Mẹo luyện phát âm
                    </h3>
                  </div>

                  <p className="text-sm leading-7 text-indigo-900/80">
                    Ghi âm ở nơi yên tĩnh, đặt microphone
                    cách miệng một khoảng phù hợp và
                    đọc rõ ràng với tốc độ tự nhiên.
                  </p>

                </div>

              </aside>

            </div>

          </>
        )}

        {/* ======================================
            TAB 2: LỊCH SỬ LUYỆN TẬP AI
        ====================================== */}

        {activePageTab === 'history' && (

          <section className="space-y-6">

            {/* HISTORY HEADER */}

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <h2 className="flex items-center gap-3 text-2xl font-extrabold text-slate-900">
                  <History
                    size={27}
                    className="text-violet-600"
                  />
                  Lịch sử luyện tập AI
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Xem lại các phiên luyện tập và phản hồi AI đã lưu.
                </p>

              </div>

              <button
                type="button"
                disabled={historyLoading}
                onClick={refreshHistory}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    historyLoading
                      ? 'animate-spin'
                      : ''
                  }
                />
                Làm mới
              </button>

            </div>

            {/* HISTORY TABLE */}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              {historyLoading ? (

                <div className="flex min-h-56 items-center justify-center gap-3 text-violet-700">
                  <Loader2
                    size={24}
                    className="animate-spin"
                  />
                  Đang tải lịch sử...
                </div>

              ) : historyError ? (

                <div className="px-6 py-12 text-center">

                  <p
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {historyError}
                  </p>

                  <button
                    type="button"
                    onClick={refreshHistory}
                    className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Thử lại
                  </button>

                </div>

              ) : historyItems.length === 0 ? (

                <div className="px-6 py-16 text-center">

                  <History
                    size={45}
                    className="mx-auto text-slate-300"
                  />

                  <h3 className="mt-4 font-bold text-slate-700">
                    {historyPage === 1
                      ? 'Chưa có lịch sử luyện tập'
                      : 'Không còn phiên luyện tập'}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Các phiên luyện tập AI sẽ được lưu tại đây.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      switchPageTab('practice')
                    }
                    className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    Bắt đầu luyện tập
                  </button>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[720px] text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>
                        <th className="px-6 py-4">
                          Mã phiên
                        </th>

                        <th className="px-6 py-4">
                          Hình thức
                        </th>

                        <th className="px-6 py-4">
                          Bài học
                        </th>

                        <th className="px-6 py-4">
                          Thời gian
                        </th>

                        <th className="px-6 py-4">
                          Trạng thái
                        </th>

                        <th className="px-6 py-4 text-right">
                          Thao tác
                        </th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {historyItems.map((item) => (

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
                              ? `Bài #${item.lessonId}`
                              : '—'}
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {formatPracticeDate(
                              item.createdAt
                            )}
                          </td>

                          <td className="px-6 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPracticeStatusColor(
                                item.status
                              )}`}
                            >
                              {getPracticeStatus(
                                item.status
                              )}
                            </span>

                          </td>

                          <td className="px-6 py-4 text-right">

                            <button
                              type="button"
                              disabled={
                                historyDetailLoading ||
                                item.status.toUpperCase() !==
                                  'COMPLETED'
                              }
                              onClick={() =>
                                void openHistoryDetail(
                                  item.practiceSessionId
                                )
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

              {/* PAGINATION */}

              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">

                <span className="text-xs text-slate-500">
                  Trang {historyPage}
                  {!historyLoading &&
                    ` · ${historyItems.length} phiên`}
                </span>

                <div className="flex gap-2">

                  <button
                    type="button"
                    disabled={
                      historyLoading ||
                      historyPage === 1
                    }
                    onClick={() => {
                      closeHistoryDetail();

                      setHistoryPage(
                        (current) => current - 1
                      );
                    }}
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={19} />
                  </button>

                  <button
                    type="button"
                    disabled={
                      historyLoading ||
                      historyItems.length <
                        HISTORY_PAGE_SIZE
                    }
                    onClick={() => {
                      closeHistoryDetail();

                      setHistoryPage(
                        (current) => current + 1
                      );
                    }}
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={19} />
                  </button>

                </div>

              </div>

            </div>

            {/* HISTORY DETAIL */}

            {(selectedHistoryResult ||
              historyDetailLoading ||
              historyDetailError) && (

              <section className="space-y-5 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm md:p-7">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <h3 className="text-xl font-bold text-slate-900">
                      Chi tiết phản hồi AI
                    </h3>

                    {selectedHistoryResult && (

                      <p className="mt-1 text-sm text-slate-500">
                        Phiên #
                        {selectedHistoryResult.practiceSessionId}
                        {' · '}
                        {formatPracticeDate(
                          selectedHistoryResult.createdAt
                        )}
                      </p>

                    )}

                  </div>

                  <div className="flex flex-wrap gap-2">

                    {selectedHistoryResult && (

                      <button
                        type="button"
                        onClick={() =>
                          handlePrintFeedback(
                            selectedHistoryResult
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                      >
                        <FileDown size={17} />
                        In / Lưu PDF
                      </button>

                    )}

                    <button
                      type="button"
                      onClick={closeHistoryDetail}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <X size={17} />
                      Đóng
                    </button>

                  </div>

                </div>

                {historyDetailLoading && (

                  <div className="flex items-center gap-3 py-8 text-violet-700">
                    <Loader2
                      size={21}
                      className="animate-spin"
                    />
                    Đang tải feedback...
                  </div>

                )}

                {historyDetailError && (

                  <p
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {historyDetailError}
                  </p>

                )}

                {selectedHistoryResult && (

                  <AIPracticeFeedback
                    result={selectedHistoryResult}
                  />

                )}

              </section>

            )}

          </section>

        )}

      </div>

    </main>
  );
}
