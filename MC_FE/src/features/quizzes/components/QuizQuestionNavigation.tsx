
import React, { useMemo } from 'react';
import { CheckCircle2, LayoutGrid, Sparkles } from 'lucide-react';

interface QuizQuestionNavigationProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestionIndexes: number[];
  onQuestionChange: (questionIndex: number) => void;
  disabled?: boolean;
}

export const QuizQuestionNavigation: React.FC<QuizQuestionNavigationProps> = ({
  totalQuestions,
  currentQuestion,
  answeredQuestionIndexes,
  onQuestionChange,
  disabled = false,
}) => {
  const answeredSet = useMemo(
    () => new Set(answeredQuestionIndexes),
    [answeredQuestionIndexes]
  );

  const answeredCount = useMemo(
    () => Array.from({ length: totalQuestions }, (_, index) => index)
      .filter(index => answeredSet.has(index)).length,
    [answeredSet, totalQuestions]
  );

  const progress = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-[#DFE8F5] bg-white p-4 shadow-[0_8px_32px_-15px_rgba(20,54,110,0.18)] transition-all duration-500 hover:shadow-[0_16px_40px_-18px_rgba(30,75,160,0.22)] sm:p-5">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-emerald-100/40 blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-blue-100 bg-gradient-to-br from-[#EFF5FF] to-[#E3EDFF] text-[#2459ED] shadow-sm">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-extrabold tracking-tight text-[#142443]">
                  Điều hướng câu hỏi
                </h3>
                <Sparkles className="h-3.5 w-3.5 text-[#E5A928]" />
              </div>
              <p className="mt-1 text-xs text-[#7184A0]">
                Chọn số câu để di chuyển nhanh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-[#FFE6A4] bg-[#FFF7DF] px-3 py-1.5 text-xs font-extrabold text-[#A36A05]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {answeredCount}/{totalQuestions} câu
          </div>
        </div>

        {/* Progress */}
        <div className="mb-5 rounded-[15px] border border-[#E7EEF8] bg-[#F8FAFE] px-3.5 py-3">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#526684]">
              Tiến độ hoàn thành
            </span>
            <span className="text-sm font-extrabold tabular-nums text-[#0A9C69]">
              {progress}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Tiến độ trả lời câu hỏi"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            className="h-[7px] overflow-hidden rounded-full bg-[#E4EBF5]"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#16A874] via-[#24C58C] to-[#7BDEAC] transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-[#8190A8]">
            {progress === 100
              ? 'Tuyệt vời! Bạn đã trả lời tất cả câu hỏi.'
              : `Còn ${totalQuestions - answeredCount} câu hỏi chưa trả lời.`}
          </p>
        </div>

        {/* Question grid */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const isCurrent = index === currentQuestion;
            const isAnswered = answeredSet.has(index);

            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                onClick={() => onQuestionChange(index)}
                aria-label={`Đi đến câu ${index + 1}${isAnswered ? ', đã trả lời' : ', chưa trả lời'}${isCurrent ? ', câu hiện tại' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                title={`Câu ${index + 1}${isAnswered ? ' - Đã trả lời' : ' - Chưa trả lời'}`}
                className={`
                  group/number relative flex h-11 w-full items-center justify-center
                  overflow-hidden rounded-[11px] border text-sm font-extrabold
                  tabular-nums outline-none
                  transition-all duration-300 ease-out
                  focus-visible:ring-2 focus-visible:ring-[#2459ED]
                  focus-visible:ring-offset-2
                  disabled:cursor-not-allowed disabled:opacity-50
                  enabled:hover:-translate-y-0.5
                  enabled:active:translate-y-0
                  ${
                    isCurrent
                      ? 'z-10 border-[#2459ED] bg-gradient-to-br from-[#3168FF] to-[#1748D8] text-white shadow-[0_5px_14px_rgba(36,89,237,0.28)] enabled:hover:shadow-[0_8px_20px_rgba(36,89,237,0.35)]'
                      : isAnswered
                        ? 'border-[#A4E8C5] bg-[#E8F9EF] text-[#087F55] enabled:hover:border-[#35C58A] enabled:hover:bg-[#D9F6E6]'
                        : 'border-[#F2DEAA] bg-[#FFFAEC] text-[#9C7218] enabled:hover:border-[#E8B94E] enabled:hover:bg-[#FFF2C9]'
                  }
                `}
              >
                <span className="relative z-10">{index + 1}</span>
                {isAnswered && !isCurrent && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#21B981]" />
                )}
                {isCurrent && (
                  <span className="pointer-events-none absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-white/70" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E8EEF7] pt-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[4px] bg-[#2459ED]" />
            <span className="text-[11px] font-medium text-[#61738E]">
              Câu hiện tại
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[4px] border border-[#9DE4BD] bg-[#E8F9EF]" />
            <span className="text-[11px] font-medium text-[#61738E]">
              Đã trả lời
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[4px] border border-[#F2DEAA] bg-[#FFFAEC]" />
            <span className="text-[11px] font-medium text-[#61738E]">
              Chưa trả lời
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestionNavigation;
