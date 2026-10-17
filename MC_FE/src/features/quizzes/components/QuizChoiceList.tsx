
import React from 'react';
import { Check, Headphones, Mic2 } from 'lucide-react';
import { QuestionType, TakeChoiceDto } from '../types/quizTypes';

interface QuizChoiceListProps {
  questionId: number;
  questionType: QuestionType;
  choices: TakeChoiceDto[];
  selectedChoiceIds: number[];
  onSelect: (questionId: number, choiceId: number) => void;
  disabled?: boolean;
}

export const QuizChoiceList: React.FC<QuizChoiceListProps> = ({
  questionId,
  questionType,
  choices,
  selectedChoiceIds,
  onSelect,
  disabled = false,
}) => {
  const isMultiple = questionType === 'MULTIPLE_CHOICE';
  const inputType = isMultiple ? 'checkbox' : 'radio';
  const sortedChoices = [...choices].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="mseek-quiz-choices relative mt-5">
      <style>{`
        @keyframes mseekChoiceEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mseekChoiceSelect {
          0% { transform: scale(.92); }
          65% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes mseekChoiceGlow {
          0%, 100% { opacity: .35; }
          50% { opacity: .7; }
        }
        .mseek-choice-card {
          animation: mseekChoiceEnter .45s cubic-bezier(.2,.8,.2,1) both;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease;
        }
        .mseek-choice-card:not(.mseek-choice-disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(18,55,116,.09);
        }
        .mseek-choice-card:focus-within {
          outline: 2px solid #3b82f6;
          outline-offset: 3px;
        }
        .mseek-choice-check { animation: mseekChoiceSelect .3s ease-out both; }
        .mseek-choice-selected::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(110deg,transparent 30%,rgba(255,255,255,.12) 50%,transparent 70%);
          background-size: 200% 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .mseek-choice-card, .mseek-choice-check { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <Headphones size={17} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-[.01em] text-[#102B61]">
              {isMultiple ? 'Chọn các đáp án đúng' : 'Lựa chọn đáp án'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isMultiple ? 'Bạn có thể chọn nhiều đáp án' : 'Chọn một đáp án phù hợp nhất'}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE6F7] bg-[#F5F8FF] px-3 py-1.5 text-[11px] font-semibold text-[#436398]">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          {selectedChoiceIds.length} đã chọn
        </span>
      </div>

      <div className="space-y-3">
        {sortedChoices.map((choice, index) => {
          const isSelected = selectedChoiceIds.includes(choice.choiceId);
          const choiceLabel = index < 26 ? String.fromCharCode(65 + index) : String(index + 1);

          return (
            <label
              key={choice.choiceId}
              style={{ animationDelay: `${Math.min(index * 65, 390)}ms` }}
              className={[
                'mseek-choice-card group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-[18px] border px-4 py-3.5 sm:gap-4 sm:px-5',
                disabled ? 'mseek-choice-disabled cursor-not-allowed opacity-60' : 'cursor-pointer',
                isSelected
                  ? 'mseek-choice-selected border-[#2F65E8] bg-gradient-to-r from-[#103478] via-[#17489B] to-[#2257B1] shadow-[0_8px_24px_rgba(27,75,160,.18)]'
                  : 'border-[#DFE7F4] bg-white shadow-[0_3px_12px_rgba(24,52,100,.035)] hover:border-[#90AFE9] hover:bg-[#F8FAFF]',
              ].join(' ')}
            >
              {isSelected && (
                <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[#F0C978]" />
              )}

              <input
                type={inputType}
                name={`question-${questionId}`}
                value={choice.choiceId}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onSelect(questionId, choice.choiceId)}
                className="peer sr-only"
              />

              <span
                aria-hidden="true"
                className={[
                  'relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center border-2 transition-all duration-200',
                  isMultiple ? 'rounded-[7px]' : 'rounded-full',
                  isSelected
                    ? 'border-[#F4D18C] bg-[#F4D18C] shadow-[0_0_12px_rgba(244,209,140,.35)]'
                    : 'border-[#C3CFE4] bg-white group-hover:border-[#4278DF]',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="mseek-choice-check flex items-center justify-center">
                    {isMultiple ? (
                      <Check size={15} strokeWidth={3} className="text-[#103478]" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#103478]" />
                    )}
                  </span>
                )}
              </span>

              <span
                aria-hidden="true"
                className={[
                  'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border text-[16px] font-bold transition-all duration-300',
                  isSelected
                    ? 'border-white/20 bg-white/10 text-[#F5D48D] shadow-inner'
                    : 'border-[#E4EAF6] bg-[#F0F4FD] text-[#183C7C] group-hover:border-[#BFD0F2] group-hover:bg-[#E8EFFD]',
                ].join(' ')}
              >
                {choiceLabel}
              </span>

              <span
                className={[
                  'relative z-10 min-w-0 flex-1 break-words text-[13px] font-medium leading-6 sm:text-[14px]',
                  isSelected ? 'font-semibold text-white' : 'text-[#273C60]',
                ].join(' ')}
              >
                {choice.choiceText}
              </span>

              <span
                aria-hidden="true"
                className={[
                  'relative z-10 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:flex',
                  isSelected
                    ? 'border border-white/15 bg-white/10 text-[#F2D08B]'
                    : 'bg-[#F5F7FC] text-[#9AAECF] group-hover:bg-[#EAF0FC] group-hover:text-[#3B69BD]',
                ].join(' ')}
              >
                {isSelected ? <Check size={18} strokeWidth={2.5} /> : <Mic2 size={17} strokeWidth={1.7} />}
              </span>

              {isSelected && (
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-[#78A7FF]/10 blur-2xl" />
              )}
            </label>
          );
        })}

        {choices.length === 0 && (
          <div className="relative overflow-hidden rounded-[20px] border border-dashed border-[#B7C9E9] bg-gradient-to-br from-[#F8FAFF] to-[#EEF3FF] px-6 py-9 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DCE6F7] bg-white text-[#3765B5] shadow-sm">
              <Mic2 size={22} strokeWidth={1.6} />
            </div>
            <p className="text-sm font-bold text-[#19396F]">Chưa có đáp án cho câu hỏi này</p>
            <p className="mt-1 text-xs leading-5 text-[#7486A5]">
              Vui lòng quay lại sau hoặc liên hệ giảng viên nếu cần hỗ trợ.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizChoiceList;
