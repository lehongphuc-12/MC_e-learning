
import React from 'react';
import { ArrowUpRight, Check, Clock3, FileCheck2, Loader2, Mic2, Sparkles } from 'lucide-react';

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
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
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
  const isTimeRunningOut = timeLimitMinutes > 0 && remainingSeconds <= 60;
  const progress = totalQuestions > 0 ? Math.min(100, Math.max(0, (answeredCount / totalQuestions) * 100)) : 0;
  const isCompleted = totalQuestions > 0 && answeredCount >= totalQuestions;

  return (
    <header className="mseek-quiz-header relative z-20 overflow-hidden border-b border-[#DCE6F7] bg-white shadow-[0_6px_30px_rgba(18,48,105,.055)]">
      <style>{`
        @keyframes mseekHeaderEnter {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mseekTimerPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.18); }
          50% { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
        }
        @keyframes mseekHeaderShine {
          0% { transform: translateX(-160%) skewX(-20deg); }
          100% { transform: translateX(300%) skewX(-20deg); }
        }
        .mseek-quiz-header { animation: mseekHeaderEnter .5s cubic-bezier(.2,.8,.2,1) both; }
        .mseek-header-timer-warning { animation: mseekTimerPulse 1.8s ease-in-out infinite; }
        .mseek-header-submit { position: relative; overflow: hidden; }
        .mseek-header-submit::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 35%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
          transform: translateX(-160%) skewX(-20deg);
        }
        .mseek-header-submit:not(:disabled):hover::after { animation: mseekHeaderShine .85s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .mseek-quiz-header, .mseek-header-timer-warning, .mseek-header-submit::after { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-32 h-64 w-64 rounded-full bg-[#DCE9FF]/40 blur-[75px]" />
        <div className="absolute right-[12%] -top-24 h-52 w-52 rounded-full bg-[#EDF3FF]/80 blur-[65px]" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#102E68] via-[#326FE3] to-[#E6BF75]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

          {/* LEFT: QUIZ INFORMATION */}
          <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-[#C9D9F5] bg-gradient-to-br from-[#EAF1FF] to-[#F8FAFF] text-[#1E50A3] shadow-[0_4px_12px_rgba(34,83,166,.08)] sm:h-14 sm:w-14">
              <Mic2 size={23} strokeWidth={1.7} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#17458F] text-[#F4D38C]">
                <Sparkles size={10} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5680C0]">
                  MSEEK Academy / Quiz
                </span>
                <span className="h-1 w-1 rounded-full bg-[#B6C6DF]" />
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D9E5FA] bg-[#F1F6FF] px-2.5 py-0.5 text-[10px] font-bold text-[#315FA7]">
                  Lần làm bài {attemptNumber}
                </span>
              </div>

              <h1 className="truncate text-[18px] font-extrabold tracking-[-.025em] text-[#102B61] sm:text-[21px]">
                {title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5 text-[12px] text-[#7385A3]">
                  <FileCheck2 size={14} className="text-[#4675BF]" />
                  Đã trả lời
                  <span className="font-extrabold text-[#173C7D]">{answeredCount}/{totalQuestions}</span>
                  câu hỏi
                </div>

                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F8F0] px-2.5 py-1 text-[10px] font-bold text-[#168458]">
                    <Check size={11} strokeWidth={3} />
                    Đã trả lời tất cả
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: PROGRESS + TIMER + SUBMIT */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:gap-4">

            <div className="min-w-0 flex-1 rounded-[15px] border border-[#E0E9F7] bg-[#F8FAFF] px-4 py-3 sm:min-w-[175px] sm:flex-none lg:min-w-[190px]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[#667FA7]">Tiến độ làm bài</span>
                <span className="text-[12px] font-extrabold tabular-nums text-[#1A4CA0]">{Math.round(progress)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Tiến độ trả lời câu hỏi"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="h-[7px] overflow-hidden rounded-full bg-[#E1E9F8]"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1B4A9B] via-[#3779EA] to-[#7FAAFF] transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-[#94A2B9]">
                {isCompleted ? 'Hoàn thành phần trả lời' : 'Tiếp tục hoàn thành bài kiểm tra'}
              </p>
            </div>

            <div className="flex items-stretch gap-3">
              {timeLimitMinutes > 0 && (
                <div
                  role="timer"
                  aria-label={`Thời gian còn lại ${formatTime(remainingSeconds)}`}
                  className={[
                    'flex min-w-[130px] flex-1 items-center gap-2.5 rounded-[15px] border px-3.5 py-2.5 transition-all duration-300 sm:flex-none',
                    isTimeRunningOut
                      ? 'mseek-header-timer-warning border-[#F6B7B7] bg-[#FFF1F1] text-[#D72D36]'
                      : 'border-[#DDE7F6] bg-[#F6F9FF] text-[#173D7B]',
                  ].join(' ')}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isTimeRunningOut ? 'bg-[#FFE1E1]' : 'bg-[#E5EDFC]'}`}>
                    <Clock3 size={19} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className={`whitespace-nowrap text-[10px] font-semibold ${isTimeRunningOut ? 'text-[#E15B62]' : 'text-[#8395B3]'}`}>
                      {isTimeRunningOut ? 'Sắp hết giờ!' : 'Thời gian còn lại'}
                    </p>
                    <p className="mt-0.5 text-[19px] font-extrabold leading-none tracking-[.025em] tabular-nums">
                      {formatTime(remainingSeconds)}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="mseek-header-submit group inline-flex min-h-[60px] flex-1 items-center justify-center gap-2.5 rounded-[15px] border border-[#244E9B] bg-gradient-to-r from-[#123574] via-[#1C4B9D] to-[#2863C4] px-5 text-[13px] font-bold text-white shadow-[0_7px_18px_rgba(28,73,153,.19)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_11px_25px_rgba(28,73,153,.26)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:flex-none sm:px-6"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span className="whitespace-nowrap">Đang nộp...</span>
                  </>
                ) : (
                  <>
                    <span className="whitespace-nowrap">Nộp bài</span>
                    <ArrowUpRight size={17} className="text-[#F1D18D] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default QuizHeader;
