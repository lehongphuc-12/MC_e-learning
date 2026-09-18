import React from 'react';

interface QuizQuestionNavigationProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestionIndexes: number[];
  onQuestionChange: (
    questionIndex: number
  ) => void;
  disabled?: boolean;
}

export const QuizQuestionNavigation: React.FC<
  QuizQuestionNavigationProps
> = ({
  totalQuestions,
  currentQuestion,
  answeredQuestionIndexes,
  onQuestionChange,
  disabled = false,
}) => {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {/* HEADER */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Danh sách câu hỏi
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Chọn câu hỏi để chuyển nhanh
        </p>
      </div>

      {/* QUESTION NUMBERS */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {Array.from(
          { length: totalQuestions },
          (_, index) => {
            const isCurrent =
              index === currentQuestion;

            const isAnswered =
              answeredQuestionIndexes.includes(
                index
              );

            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onQuestionChange(index)
                }
                aria-label={`Đi đến câu ${
                  index + 1
                }`}
                className={`
                  flex h-10 w-full items-center justify-center
                  rounded-lg border text-sm font-semibold
                  transition-all duration-200
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isAnswered
                        ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                  }
                `}
              >
                {index + 1}
              </button>
            );
          }
        )}
      </div>

      {/* LEGEND */}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-600" />
          <span>Câu hiện tại</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-green-300 bg-green-50" />
          <span>Đã trả lời</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-slate-200 bg-slate-50" />
          <span>Chưa trả lời</span>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestionNavigation;