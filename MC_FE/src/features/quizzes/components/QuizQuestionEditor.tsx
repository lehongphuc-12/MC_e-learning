import React from 'react';

import {
  CreateQuestionRequest,
  QuestionType,
} from '../types/quizTypes';

interface QuizQuestionEditorProps {
  question: CreateQuestionRequest;
  questionNumber: number;
  onChange: (
    question: CreateQuestionRequest
  ) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}

const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
}[] = [
  {
    value: 'SINGLE_CHOICE',
    label: 'Một đáp án',
  },
  {
    value: 'MULTIPLE_CHOICE',
    label: 'Nhiều đáp án',
  },
  {
    value: 'TRUE_FALSE',
    label: 'Đúng / Sai',
  },
];

export const QuizQuestionEditor: React.FC<
  QuizQuestionEditorProps
> = ({
  question,
  questionNumber,
  onChange,
  onRemove,
  canRemove = true,
}) => {
  // =========================
  // UPDATE QUESTION TEXT
  // =========================
  const handleQuestionTextChange = (
    value: string
  ) => {
    onChange({
      ...question,
      questionText: value,
    });
  };

  // =========================
  // UPDATE QUESTION TYPE
  // =========================
  const handleQuestionTypeChange = (
    value: QuestionType
  ) => {
    let updatedChoices =
      question.choices;

    if (value === 'TRUE_FALSE') {
      updatedChoices = [
        {
          choiceText: 'Đúng',
          isCorrect:
            question.choices[0]?.isCorrect ??
            true,
          orderIndex: 1,
        },
        {
          choiceText: 'Sai',
          isCorrect:
            question.choices[1]?.isCorrect ??
            false,
          orderIndex: 2,
        },
      ];
    } else if (
      question.questionType === 'TRUE_FALSE'
    ) {
      updatedChoices = [
        {
          choiceText: '',
          isCorrect: true,
          orderIndex: 1,
        },
        {
          choiceText: '',
          isCorrect: false,
          orderIndex: 2,
        },
      ];
    }

    onChange({
      ...question,
      questionType: value,
      choices: updatedChoices,
    });
  };

  // =========================
  // UPDATE EXPLANATION
  // =========================
  const handleExplanationChange = (
    value: string
  ) => {
    onChange({
      ...question,
      explanation: value,
    });
  };

  // =========================
  // UPDATE CHOICE TEXT
  // =========================
  const handleChoiceTextChange = (
    choiceIndex: number,
    value: string
  ) => {
    const updatedChoices =
      question.choices.map(
        (choice, index) =>
          index === choiceIndex
            ? {
                ...choice,
                choiceText: value,
              }
            : choice
      );

    onChange({
      ...question,
      choices: updatedChoices,
    });
  };

  // =========================
  // SELECT CORRECT CHOICE
  // =========================
  const handleCorrectChoiceChange = (
    choiceIndex: number
  ) => {
    const isMultiple =
      question.questionType ===
      'MULTIPLE_CHOICE';

    const updatedChoices =
      question.choices.map(
        (choice, index) => {
          if (isMultiple) {
            return index === choiceIndex
              ? {
                  ...choice,
                  isCorrect:
                    !choice.isCorrect,
                }
              : choice;
          }

          return {
            ...choice,
            isCorrect:
              index === choiceIndex,
          };
        }
      );

    onChange({
      ...question,
      choices: updatedChoices,
    });
  };

  // =========================
  // ADD CHOICE
  // =========================
  const handleAddChoice = () => {
    if (
      question.questionType ===
      'TRUE_FALSE'
    ) {
      return;
    }

    const nextOrderIndex =
      question.choices.length + 1;

    onChange({
      ...question,
      choices: [
        ...question.choices,
        {
          choiceText: '',
          isCorrect: false,
          orderIndex: nextOrderIndex,
        },
      ],
    });
  };

  // =========================
  // REMOVE CHOICE
  // =========================
  const handleRemoveChoice = (
    choiceIndex: number
  ) => {
    if (
      question.questionType ===
      'TRUE_FALSE'
    ) {
      return;
    }

    if (question.choices.length <= 2) {
      return;
    }

    const updatedChoices =
      question.choices
        .filter(
          (_, index) =>
            index !== choiceIndex
        )
        .map((choice, index) => ({
          ...choice,
          orderIndex: index + 1,
        }));

    onChange({
      ...question,
      choices: updatedChoices,
    });
  };

  const isMultiple =
    question.questionType ===
    'MULTIPLE_CHOICE';

  const isTrueFalse =
    question.questionType ===
    'TRUE_FALSE';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* =========================
          QUESTION HEADER
      ========================= */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
            {questionNumber}
          </div>

          <h3 className="text-base font-semibold text-slate-900">
            Câu hỏi {questionNumber}
          </h3>
        </div>

        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Xóa câu hỏi
          </button>
        )}
      </div>

      {/* =========================
          QUESTION TEXT
      ========================= */}
      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Nội dung câu hỏi
          <span className="ml-1 text-red-500">
            *
          </span>
        </label>

        <textarea
          value={question.questionText}
          onChange={(event) =>
            handleQuestionTextChange(
              event.target.value
            )
          }
          placeholder="Nhập nội dung câu hỏi..."
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* =========================
          QUESTION TYPE
      ========================= */}
      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Loại câu hỏi
        </label>

        <select
          value={question.questionType}
          onChange={(event) =>
            handleQuestionTypeChange(
              event.target.value as QuestionType
            )
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
        >
          {QUESTION_TYPES.map((type) => (
            <option
              key={type.value}
              value={type.value}
            >
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* =========================
          CHOICES
      ========================= */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              Đáp án
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Chọn đáp án đúng bằng cách
              đánh dấu bên trái.
            </p>
          </div>

          {!isTrueFalse && (
            <button
              type="button"
              onClick={handleAddChoice}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
            >
              + Thêm đáp án
            </button>
          )}
        </div>

        <div className="space-y-3">
          {question.choices.map(
            (choice, index) => (
              <div
                key={`${questionNumber}-${index}`}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  choice.isCorrect
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* CORRECT */}
                <input
                  type={
                    isMultiple
                      ? 'checkbox'
                      : 'radio'
                  }
                  name={`correct-question-${questionNumber}`}
                  checked={
                    choice.isCorrect
                  }
                  onChange={() =>
                    handleCorrectChoiceChange(
                      index
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-green-600"
                />

                {/* ORDER */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </div>

                {/* TEXT */}
                <input
                  type="text"
                  value={choice.choiceText}
                  onChange={(event) =>
                    handleChoiceTextChange(
                      index,
                      event.target.value
                    )
                  }
                  disabled={isTrueFalse}
                  placeholder={`Đáp án ${index + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
                />

                {/* REMOVE */}
                {!isTrueFalse && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveChoice(
                        index
                      )
                    }
                    disabled={
                      question.choices
                        .length <= 2
                    }
                    className="shrink-0 rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Xóa đáp án"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          )}
        </div>

        {question.choices.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
            <p className="text-sm text-slate-500">
              Chưa có đáp án.
            </p>

            <button
              type="button"
              onClick={handleAddChoice}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Thêm đáp án
            </button>
          </div>
        )}
      </div>

      {/* =========================
          EXPLANATION
      ========================= */}
      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Giải thích đáp án
          <span className="ml-1 text-xs font-normal text-slate-400">
            (không bắt buộc)
          </span>
        </label>

        <textarea
          value={question.explanation ?? ''}
          onChange={(event) =>
            handleExplanationChange(
              event.target.value
            )
          }
          placeholder="Nhập giải thích để học viên hiểu đáp án..."
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
};

export default QuizQuestionEditor;