import React from 'react';

import {
  QuestionType,
  TakeChoiceDto,
} from '../types/quizTypes';

interface QuizChoiceListProps {
  questionId: number;
  questionType: QuestionType;
  choices: TakeChoiceDto[];
  selectedChoiceIds: number[];
  onSelect: (
    questionId: number,
    choiceId: number
  ) => void;
  disabled?: boolean;
}

export const QuizChoiceList: React.FC<
  QuizChoiceListProps
> = ({
  questionId,
  questionType,
  choices,
  selectedChoiceIds,
  onSelect,
  disabled = false,
}) => {
  const isMultiple =
    questionType === 'MULTIPLE_CHOICE';

  const inputType = isMultiple
    ? 'checkbox'
    : 'radio';

  const sortedChoices = [...choices].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  return (
    <div className="mt-5 space-y-3">
      {sortedChoices.map((choice) => {
        const isSelected =
          selectedChoiceIds.includes(
            choice.choiceId
          );

        return (
          <label
            key={choice.choiceId}
            className={`
              flex cursor-pointer items-center gap-3
              rounded-xl border p-4
              transition-all duration-200
              ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }
              ${
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : ''
              }
            `}
          >
            <input
              type={inputType}
              name={`question-${questionId}`}
              value={choice.choiceId}
              checked={isSelected}
              disabled={disabled}
              onChange={() =>
                onSelect(
                  questionId,
                  choice.choiceId
                )
              }
              className="h-4 w-4 accent-blue-600"
            />

            <span
              className={`
                text-sm leading-6
                ${
                  isSelected
                    ? 'font-medium text-blue-700'
                    : 'text-slate-700'
                }
              `}
            >
              {choice.choiceText}
            </span>
          </label>
        );
      })}

      {choices.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
          <p className="text-sm text-slate-500">
            Chưa có đáp án cho câu hỏi này.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizChoiceList;