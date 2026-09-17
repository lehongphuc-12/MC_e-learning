import React from 'react';

interface QuizHeaderProps {
  title: string;
  attemptNumber: number;
  remainingSeconds: number;
  timeLimitMinutes: number;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
  submitting?: boolean;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
};

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  title,
  attemptNumber,
  remainingSeconds,
  timeLimitMinutes,
  answeredCount,
  totalQuestions,
  onSubmit,
  submitting = false,
}) => {
  const isTimeRunningOut =
    timeLimitMinutes > 0 && remainingSeconds <= 60;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">

          {/* =====================================================
              LEFT: QUIZ INFORMATION
          ===================================================== */}

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {title}
              </h1>

              <span className="shrink-0 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                Lần {attemptNumber}
              </span>
            </div>

            <p className="text-sm text-slate-500">
              Đã trả lời{' '}
              <span className="font-semibold text-slate-700">
                {answeredCount}
              </span>{' '}
              / {totalQuestions} câu hỏi
            </p>
          </div>

          {/* =====================================================
              RIGHT: TIMER + SUBMIT
          ===================================================== */}

          <div className="flex items-center gap-3 shrink-0">

            {/* Timer */}

            {timeLimitMinutes > 0 && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  isTimeRunningOut
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>

                <div>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">
                    Thời gian còn lại
                  </div>

                  <div className="font-bold text-sm">
                    {formatTime(remainingSeconds)}
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}

            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Đang nộp...'
                : 'Nộp bài'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};