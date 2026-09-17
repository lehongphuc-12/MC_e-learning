import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useQuiz, useUpdateQuiz } from '../hooks/useQuiz';

import {
  QuizStatus,
  QuestionType,
  UpdateQuizRequest,
  UpdateQuestionRequest,
  UpdateChoiceRequest,
} from '../types/quizTypes';

const QUIZ_STATUS_OPTIONS: {
  value: QuizStatus;
  label: string;
}[] = [
  {
    value: 'DRAFT',
    label: 'Nháp',
  },
  {
    value: 'PUBLISHED',
    label: 'Đã xuất bản',
  },
  {
    value: 'ARCHIVED',
    label: 'Lưu trữ',
  },
];

const QUESTION_TYPE_OPTIONS: {
  value: QuestionType;
  label: string;
}[] = [
  {
    value: 'SINGLE_CHOICE',
    label: 'Một đáp án đúng',
  },
  {
    value: 'MULTIPLE_CHOICE',
    label: 'Nhiều đáp án đúng',
  },
  {
    value: 'TRUE_FALSE',
    label: 'Đúng / Sai',
  },
];

const createEmptyChoice = (
  orderIndex: number,
): UpdateChoiceRequest => ({
  choiceId: 0,
  choiceText: '',
  isCorrect: false,
  orderIndex,
});

const createEmptyQuestion = (
  orderIndex: number,
): UpdateQuestionRequest => ({
  questionId: 0,
  questionText: '',
  questionType: 'SINGLE_CHOICE',
  explanation: null,
  orderIndex,
  choices: [
    createEmptyChoice(1),
    createEmptyChoice(2),
  ],
});

export const UpdateQuizPage: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const quizId = id ? Number(id) : null;

  // ============================================================
  // GET QUIZ
  // ============================================================

  const validQuizId =
    quizId !== null &&
    Number.isInteger(quizId) &&
    quizId > 0
      ? quizId
      : null;

  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useQuiz(validQuizId);

  // ============================================================
  // UPDATE QUIZ
  // ============================================================

  const updateQuizMutation = useUpdateQuiz();

  // ============================================================
  // FORM - QUIZ INFORMATION
  // ============================================================

  const [title, setTitle] = useState('');

  const [description, setDescription] =
    useState('');

  const [timeLimitMinutes, setTimeLimitMinutes] =
    useState(0);

  const [passingScore, setPassingScore] =
    useState(80);

  const [maxAttempts, setMaxAttempts] =
    useState(1);

  const [status, setStatus] =
    useState<QuizStatus>('DRAFT');

  // ============================================================
  // FORM - QUESTIONS
  // ============================================================

  const [questions, setQuestions] = useState<
    UpdateQuestionRequest[]
  >([]);

  // ============================================================
  // MESSAGE
  // ============================================================

  const [errorMessage, setErrorMessage] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  // ============================================================
  // LOAD QUIZ DATA
  // ============================================================

  useEffect(() => {
    if (!quiz) {
      return;
    }

    setTitle(quiz.title ?? '');

    setDescription(
      quiz.description ?? '',
    );

    setTimeLimitMinutes(
      quiz.timeLimitMinutes ?? 0,
    );

    setPassingScore(
      Number(quiz.passingScore ?? 0),
    );

    setMaxAttempts(
      quiz.maxAttempts ?? 1,
    );

    setStatus(
      quiz.status ?? 'DRAFT',
    );

    // ----------------------------------------------------------
    // LOAD QUESTIONS
    // ----------------------------------------------------------

    const loadedQuestions: UpdateQuestionRequest[] =
      (quiz.questions ?? []).map(
        (question) => ({
          questionId:
            question.questionId,

          questionText:
            question.questionText ?? '',

          questionType:
            question.questionType,

          explanation:
            question.explanation ?? null,

          orderIndex:
            question.orderIndex,

          choices:
            (question.choices ?? []).map(
              (choice) => ({
                choiceId:
                  choice.choiceId,

                choiceText:
                  choice.choiceText ?? '',

                isCorrect:
                  choice.isCorrect ?? false,

                orderIndex:
                  choice.orderIndex,
              }),
            ),
        }),
      );

    loadedQuestions.sort(
      (a, b) =>
        a.orderIndex -
        b.orderIndex,
    );

    setQuestions(
      loadedQuestions,
    );
  }, [quiz]);

  // ============================================================
  // QUESTION HELPERS
  // ============================================================

  const updateQuestion = (
    questionIndex: number,
    updates: Partial<UpdateQuestionRequest>,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, index) =>
          index === questionIndex
            ? {
                ...question,
                ...updates,
              }
            : question,
      ),
    );
  };

  const updateQuestionText = (
    questionIndex: number,
    value: string,
  ) => {
    updateQuestion(
      questionIndex,
      {
        questionText: value,
      },
    );
  };

  const updateQuestionType = (
    questionIndex: number,
    value: QuestionType,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, index) => {
          if (
            index !== questionIndex
          ) {
            return question;
          }

          // ----------------------------------------------------
          // TRUE / FALSE
          // ----------------------------------------------------

          if (
            value === 'TRUE_FALSE'
          ) {
            return {
              ...question,
              questionType:
                value,
              choices: [
                {
                  choiceId:
                    question.choices[0]
                      ?.choiceId ?? 0,
                  choiceText:
                    'Đúng',
                  isCorrect:
                    question.choices[0]
                      ?.isCorrect ?? false,
                  orderIndex: 1,
                },
                {
                  choiceId:
                    question.choices[1]
                      ?.choiceId ?? 0,
                  choiceText:
                    'Sai',
                  isCorrect:
                    question.choices[1]
                      ?.isCorrect ?? false,
                  orderIndex: 2,
                },
              ],
            };
          }

          // ----------------------------------------------------
          // MULTIPLE / SINGLE CHOICE
          // ----------------------------------------------------

          let updatedChoices =
            question.choices.map(
              (choice) => ({
                ...choice,
              }),
            );

          if (
            updatedChoices.length <
            2
          ) {
            while (
              updatedChoices.length <
              2
            ) {
              updatedChoices.push(
                createEmptyChoice(
                  updatedChoices.length +
                    1,
                ),
              );
            }
          }

          // SINGLE CHOICE chỉ cho phép
          // một đáp án đúng.
          if (
            value ===
              'SINGLE_CHOICE' &&
            updatedChoices.length > 0
          ) {
            let foundCorrect =
              false;

            updatedChoices =
              updatedChoices.map(
                (choice) => {
                  if (
                    choice.isCorrect &&
                    !foundCorrect
                  ) {
                    foundCorrect =
                      true;

                    return choice;
                  }

                  return {
                    ...choice,
                    isCorrect:
                      false,
                  };
                },
              );
          }

          return {
            ...question,
            questionType:
              value,
            choices:
              updatedChoices,
          };
        },
      ),
    );
  };

  const updateQuestionExplanation = (
    questionIndex: number,
    value: string,
  ) => {
    updateQuestion(
      questionIndex,
      {
        explanation:
          value.trim() || null,
      },
    );
  };

  // ============================================================
  // ADD QUESTION
  // ============================================================

  const handleAddQuestion = () => {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      createEmptyQuestion(
        currentQuestions.length + 1,
      ),
    ]);
  };

  // ============================================================
  // DELETE QUESTION
  // ============================================================

  const handleDeleteQuestion = (
    questionIndex: number,
  ) => {
    const confirmed =
      window.confirm(
        'Bạn có chắc muốn xóa câu hỏi này không?',
      );

    if (!confirmed) {
      return;
    }

    setQuestions((currentQuestions) =>
      currentQuestions
        .filter(
          (_, index) =>
            index !== questionIndex,
        )
        .map(
          (
            question,
            index,
          ) => ({
            ...question,
            orderIndex:
              index + 1,
          }),
        ),
    );
  };

  // ============================================================
  // CHOICE HELPERS
  // ============================================================

  const updateChoice = (
    questionIndex: number,
    choiceIndex: number,
    updates: Partial<UpdateChoiceRequest>,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, qIndex) => {
          if (
            qIndex !==
            questionIndex
          ) {
            return question;
          }

          return {
            ...question,
            choices:
              question.choices.map(
                (
                  choice,
                  cIndex,
                ) =>
                  cIndex ===
                  choiceIndex
                    ? {
                        ...choice,
                        ...updates,
                      }
                    : choice,
              ),
          };
        },
      ),
    );
  };

  // ============================================================
  // UPDATE CHOICE TEXT
  // ============================================================

  const updateChoiceText = (
    questionIndex: number,
    choiceIndex: number,
    value: string,
  ) => {
    updateChoice(
      questionIndex,
      choiceIndex,
      {
        choiceText: value,
      },
    );
  };

  // ============================================================
  // SELECT CORRECT CHOICE
  // ============================================================

  const handleToggleCorrectChoice = (
    questionIndex: number,
    choiceIndex: number,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, qIndex) => {
          if (
            qIndex !==
            questionIndex
          ) {
            return question;
          }

          // ----------------------------------------------------
          // SINGLE CHOICE
          // ----------------------------------------------------

          if (
            question.questionType ===
            'SINGLE_CHOICE'
          ) {
            return {
              ...question,
              choices:
                question.choices.map(
                  (
                    choice,
                    cIndex,
                  ) => ({
                    ...choice,
                    isCorrect:
                      cIndex ===
                      choiceIndex,
                  }),
                ),
            };
          }

          // ----------------------------------------------------
          // MULTIPLE CHOICE
          // ----------------------------------------------------

          if (
            question.questionType ===
            'MULTIPLE_CHOICE'
          ) {
            return {
              ...question,
              choices:
                question.choices.map(
                  (
                    choice,
                    cIndex,
                  ) =>
                    cIndex ===
                    choiceIndex
                      ? {
                          ...choice,
                          isCorrect:
                            !choice.isCorrect,
                        }
                      : choice,
                ),
            };
          }

          // ----------------------------------------------------
          // TRUE / FALSE
          // ----------------------------------------------------

          if (
            question.questionType ===
            'TRUE_FALSE'
          ) {
            return {
              ...question,
              choices:
                question.choices.map(
                  (
                    choice,
                    cIndex,
                  ) => ({
                    ...choice,
                    isCorrect:
                      cIndex ===
                      choiceIndex,
                  }),
                ),
            };
          }

          return question;
        },
      ),
    );
  };

  // ============================================================
  // ADD CHOICE
  // ============================================================

  const handleAddChoice = (
    questionIndex: number,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, qIndex) => {
          if (
            qIndex !==
            questionIndex
          ) {
            return question;
          }

          return {
            ...question,
            choices: [
              ...question.choices,
              createEmptyChoice(
                question.choices
                  .length + 1,
              ),
            ],
          };
        },
      ),
    );
  };

  // ============================================================
  // DELETE CHOICE
  // ============================================================

  const handleDeleteChoice = (
    questionIndex: number,
    choiceIndex: number,
  ) => {
    setQuestions((currentQuestions) =>
      currentQuestions.map(
        (question, qIndex) => {
          if (
            qIndex !==
            questionIndex
          ) {
            return question;
          }

          if (
            question.choices
              .length <= 2
          ) {
            return question;
          }

          return {
            ...question,
            choices:
              question.choices
                .filter(
                  (
                    _,
                    index,
                  ) =>
                    index !==
                    choiceIndex,
                )
                .map(
                  (
                    choice,
                    index,
                  ) => ({
                    ...choice,
                    orderIndex:
                      index + 1,
                  }),
                ),
          };
        },
      ),
    );
  };

  // ============================================================
  // VALIDATE QUESTIONS
  // ============================================================

  const validateQuestions =
    (): string | null => {
      if (
        questions.length === 0
      ) {
        return 'Quiz phải có ít nhất một câu hỏi.';
      }

      for (
        let i = 0;
        i < questions.length;
        i++
      ) {
        const question =
          questions[i];

        const questionNumber =
          i + 1;

        if (
          !question.questionText.trim()
        ) {
          return `Vui lòng nhập nội dung cho câu hỏi ${questionNumber}.`;
        }

        if (
          question.choices.length ===
            0 &&
          question.questionType !==
            'TRUE_FALSE'
        ) {
          return `Câu hỏi ${questionNumber} phải có đáp án.`;
        }

        // ------------------------------------------------------
        // Check duplicate choice text
        // ------------------------------------------------------

        const choiceTexts =
          question.choices
            .map(
              (choice) =>
                choice.choiceText
                  .trim()
                  .toLowerCase(),
            )
            .filter(
              (text) => text,
            );

        const uniqueChoiceTexts =
          new Set(choiceTexts);

        if (
          choiceTexts.length !==
          uniqueChoiceTexts.size
        ) {
          return `Các đáp án của câu hỏi ${questionNumber} không được trùng nhau.`;
        }

        // ------------------------------------------------------
        // Check empty choice
        // ------------------------------------------------------

        for (
          let j = 0;
          j <
          question.choices.length;
          j++
        ) {
          if (
            !question.choices[
              j
            ].choiceText.trim()
          ) {
            return `Vui lòng nhập nội dung đáp án ${j + 1} của câu hỏi ${questionNumber}.`;
          }
        }

        // ------------------------------------------------------
        // SINGLE CHOICE
        // ------------------------------------------------------

        if (
          question.questionType ===
          'SINGLE_CHOICE'
        ) {
          const correctCount =
            question.choices.filter(
              (choice) =>
                choice.isCorrect,
            ).length;

          if (
            correctCount !== 1
          ) {
            return `Câu hỏi ${questionNumber} phải có đúng một đáp án đúng.`;
          }
        }

        // ------------------------------------------------------
        // MULTIPLE CHOICE
        // ------------------------------------------------------

        if (
          question.questionType ===
          'MULTIPLE_CHOICE'
        ) {
          const correctCount =
            question.choices.filter(
              (choice) =>
                choice.isCorrect,
            ).length;

          if (
            correctCount < 1
          ) {
            return `Câu hỏi ${questionNumber} phải có ít nhất một đáp án đúng.`;
          }
        }

        // ------------------------------------------------------
        // TRUE / FALSE
        // ------------------------------------------------------

        if (
          question.questionType ===
          'TRUE_FALSE'
        ) {
          if (
            question.choices
              .length !== 2
          ) {
            return `Câu hỏi ${questionNumber} dạng Đúng/Sai phải có đúng 2 đáp án.`;
          }

          const correctCount =
            question.choices.filter(
              (choice) =>
                choice.isCorrect,
            ).length;

          if (
            correctCount !== 1
          ) {
            return `Câu hỏi ${questionNumber} dạng Đúng/Sai phải có đúng một đáp án đúng.`;
          }
        }
      }

      return null;
    };

  // ============================================================
  // VALIDATE FORM
  // ============================================================

  const validateForm =
    (): string | null => {
      if (!title.trim()) {
        return 'Vui lòng nhập tiêu đề quiz.';
      }

      if (
        title.trim().length >
        255
      ) {
        return 'Tiêu đề quiz không được vượt quá 255 ký tự.';
      }

      if (
        timeLimitMinutes < 0
      ) {
        return 'Thời gian làm bài không hợp lệ.';
      }

      if (
        passingScore < 0 ||
        passingScore > 100
      ) {
        return 'Điểm đạt phải nằm trong khoảng từ 0 đến 100.';
      }

      if (
        maxAttempts < 1
      ) {
        return 'Số lần làm bài phải lớn hơn hoặc bằng 1.';
      }

      return validateQuestions();
    };

  // ============================================================
  // SUBMIT UPDATE
  // ============================================================

  const handleUpdateQuiz =
    async () => {
      setErrorMessage('');
      setSuccessMessage('');

      const validationError =
        validateForm();

      if (validationError) {
        setErrorMessage(
          validationError,
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });

        return;
      }

      if (
        validQuizId === null
      ) {
        setErrorMessage(
          'Quiz ID không hợp lệ.',
        );

        return;
      }

      // --------------------------------------------------------
      // Normalize question + choice order
      // --------------------------------------------------------

      const normalizedQuestions =
        questions.map(
          (
            question,
            questionIndex,
          ) => ({
            ...question,

            questionText:
              question.questionText.trim(),

            explanation:
              question.explanation
                ?.trim() || null,

            orderIndex:
              questionIndex + 1,

            choices:
              question.choices.map(
                (
                  choice,
                  choiceIndex,
                ) => ({
                  ...choice,

                  choiceText:
                    choice.choiceText.trim(),

                  orderIndex:
                    choiceIndex + 1,
                }),
              ),
          }),
        );

      const payload: UpdateQuizRequest =
        {
          title: title.trim(),

          description:
            description.trim() ||
            null,

          timeLimitMinutes,

          passingScore,

          maxAttempts,

          status,

          questions:
            normalizedQuestions,
        };

      try {
        await updateQuizMutation.mutateAsync(
          {
            quizId: validQuizId,
            data: payload,
          },
        );

        setSuccessMessage(
          'Cập nhật quiz thành công.',
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });

        // ------------------------------------------------------
        // Navigate to detail
        // ------------------------------------------------------

        setTimeout(() => {
          navigate(
            `/instructor/quizzes/${validQuizId}`,
          );
        }, 800);
      } catch (err) {
        console.error(
          'Update quiz failed:',
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật quiz. Vui lòng thử lại.';

        setErrorMessage(
          message,
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

  // ============================================================
  // INVALID ID
  // ============================================================

  if (
    validQuizId === null
  ) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Không thể cập nhật quiz
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quiz ID không hợp lệ
              hoặc chưa được cung
              cấp.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Đang tải thông tin
              quiz...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // LOAD ERROR
  // ============================================================

  if (isError || !quiz) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Không thể tải quiz
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error instanceof
              Error
                ? error.message
                : 'Đã xảy ra lỗi khi tải thông tin quiz.'}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Quay lại
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                Cập nhật Quiz
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Chỉnh sửa thông tin,
                câu hỏi và đáp án của
                bài kiểm tra.
              </p>
            </div>

            <span className="text-sm text-slate-400">
              Quiz ID: {quiz.quizId}
            </span>
          </div>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mt-0.5 font-bold text-red-500">
              !
            </div>

            <div>
              <p className="text-sm font-semibold text-red-700">
                Cập nhật thất bại
              </p>

              <p className="mt-1 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            SUCCESS
        ====================================================== */}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">
              {successMessage}
            </p>
          </div>
        )}

        {/* =====================================================
            QUIZ INFORMATION
        ====================================================== */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Thông tin Quiz
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các thông tin chung của
              bài kiểm tra.
            </p>
          </div>

          <div className="space-y-5">

            {/* TITLE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Tiêu đề
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                value={title}
                maxLength={255}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                placeholder="Nhập tiêu đề quiz..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {title.length}/255
              </p>
            </div>

            {/* DESCRIPTION */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mô tả
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (không bắt buộc)
                </span>
              </label>

              <textarea
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target
                      .value,
                  )
                }
                placeholder="Nhập mô tả quiz..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* SETTINGS */}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {/* TIME */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Thời gian làm bài
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={
                      timeLimitMinutes
                    }
                    onChange={(
                      event,
                    ) =>
                      setTimeLimitMinutes(
                        Math.max(
                          0,
                          Number(
                            event
                              .target
                              .value,
                          ),
                        ),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    phút
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  0 = không giới
                  hạn
                </p>
              </div>

              {/* PASSING SCORE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Điểm đạt
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={
                      passingScore
                    }
                    onChange={(
                      event,
                    ) =>
                      setPassingScore(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* MAX ATTEMPTS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Số lần làm tối đa
                </label>

                <input
                  type="number"
                  min={1}
                  value={
                    maxAttempts
                  }
                  onChange={(event) =>
                    setMaxAttempts(
                      Math.max(
                        1,
                        Number(
                          event
                            .target
                            .value,
                        ),
                      ),
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Trạng thái
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as QuizStatus,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
              >
                {QUIZ_STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>

        {/* =====================================================
            QUESTIONS
        ====================================================== */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Câu hỏi
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Chỉnh sửa câu hỏi và
                đáp án của quiz.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleAddQuestion
              }
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Thêm câu hỏi
            </button>
          </div>

          {/* EMPTY */}

          {questions.length ===
            0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">
                Quiz chưa có câu
                hỏi.
              </p>

              <button
                type="button"
                onClick={
                  handleAddQuestion
                }
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Thêm câu hỏi
              </button>
            </div>
          )}

          {/* QUESTIONS */}

          <div className="space-y-6">

            {questions.map(
              (
                question,
                questionIndex,
              ) => (
                <div
                  key={`${question.questionId}-${questionIndex}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >

                  {/* QUESTION HEADER */}

                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {questionIndex +
                          1}
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Câu hỏi{' '}
                          {questionIndex +
                            1}
                        </p>

                        {question.questionId >
                          0 && (
                          <p className="text-xs text-slate-400">
                            Question ID:{' '}
                            {
                              question.questionId
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteQuestion(
                          questionIndex,
                        )
                      }
                      className="self-start rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
                    >
                      Xóa câu hỏi
                    </button>
                  </div>

                  {/* QUESTION TEXT */}

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nội dung câu
                      hỏi
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <textarea
                      value={
                        question.questionText
                      }
                      onChange={(
                        event,
                      ) =>
                        updateQuestionText(
                          questionIndex,
                          event.target
                            .value,
                        )
                      }
                      placeholder="Nhập nội dung câu hỏi..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* QUESTION TYPE */}

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Loại câu hỏi
                    </label>

                    <select
                      value={
                        question.questionType
                      }
                      onChange={(
                        event,
                      ) =>
                        updateQuestionType(
                          questionIndex,
                          event.target
                            .value as QuestionType,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
                    >
                      {QUESTION_TYPE_OPTIONS.map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  {/* CHOICES */}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Đáp án
                        </label>

                        <p className="mt-1 text-xs text-slate-400">
                          {question.questionType ===
                          'SINGLE_CHOICE'
                            ? 'Chọn một đáp án đúng.'
                            : question.questionType ===
                                'MULTIPLE_CHOICE'
                              ? 'Có thể chọn nhiều đáp án đúng.'
                              : 'Chọn đáp án Đúng hoặc Sai.'}
                        </p>
                      </div>

                      {question.questionType !==
                        'TRUE_FALSE' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAddChoice(
                              questionIndex,
                            )
                          }
                          className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          + Thêm đáp án
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">

                      {question.choices.map(
                        (
                          choice,
                          choiceIndex,
                        ) => (
                          <div
                            key={`${choice.choiceId}-${choiceIndex}`}
                            className={`rounded-xl border p-3 transition ${
                              choice.isCorrect
                                ? 'border-green-300 bg-green-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">

                              {/* CORRECT */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleCorrectChoice(
                                    questionIndex,
                                    choiceIndex,
                                  )
                                }
                                className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                                  choice.isCorrect
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-slate-300 bg-white text-transparent hover:border-green-400'
                                }`}
                                title={
                                  choice.isCorrect
                                    ? 'Đáp án đúng'
                                    : 'Chọn làm đáp án đúng'
                                }
                              >
                                ✓
                              </button>

                              {/* TEXT */}

                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400">
                                    Đáp án{' '}
                                    {String.fromCharCode(
                                      65 +
                                        choiceIndex,
                                    )}
                                  </span>

                                  {choice.isCorrect && (
                                    <span className="text-xs font-semibold text-green-600">
                                      Đáp án đúng
                                    </span>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={
                                    choice.choiceText
                                  }
                                  disabled={
                                    question.questionType ===
                                    'TRUE_FALSE'
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateChoiceText(
                                      questionIndex,
                                      choiceIndex,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder={`Nhập đáp án ${String.fromCharCode(
                                    65 +
                                      choiceIndex,
                                  )}...`}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                />
                              </div>

                              {/* DELETE */}

                              {question.questionType !==
                                'TRUE_FALSE' &&
                                question
                                  .choices
                                  .length >
                                  2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteChoice(
                                        questionIndex,
                                        choiceIndex,
                                      )
                                    }
                                    className="mt-6 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                    title="Xóa đáp án"
                                  >
                                    ✕
                                  </button>
                                )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* EXPLANATION */}

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Giải thích đáp án
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        (không bắt buộc)
                      </span>
                    </label>

                    <textarea
                      value={
                        question.explanation ??
                        ''
                      }
                      onChange={(
                        event,
                      ) =>
                        updateQuestionExplanation(
                          questionIndex,
                          event.target
                            .value,
                        )
                      }
                      placeholder="Nhập giải thích cho câu hỏi..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              ),
            )}
          </div>

          {/* ADD QUESTION BOTTOM */}

          {questions.length >
            0 && (
            <button
              type="button"
              onClick={
                handleAddQuestion
              }
              className="mt-6 w-full rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
            >
              + Thêm câu hỏi
            </button>
          )}
        </div>

        {/* =====================================================
            NOTE
        ====================================================== */}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Lưu ý
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            Khi cập nhật, các câu hỏi
            và đáp án hiện có sẽ được
            giữ nguyên ID. Câu hỏi hoặc
            đáp án mới sẽ được gửi với
            ID = 0 để hệ thống tạo mới.
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            Nếu quiz đã có người làm,
            backend có thể giới hạn việc
            xóa câu hỏi hoặc đáp án để
            đảm bảo dữ liệu lịch sử làm
            bài.
          </p>
        </div>

        {/* =====================================================
            ACTIONS
        ====================================================== */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            disabled={
              updateQuizMutation.isPending
            }
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={
              handleUpdateQuiz
            }
            disabled={
              updateQuizMutation.isPending
            }
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateQuizMutation.isPending
              ? 'Đang cập nhật...'
              : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateQuizPage;