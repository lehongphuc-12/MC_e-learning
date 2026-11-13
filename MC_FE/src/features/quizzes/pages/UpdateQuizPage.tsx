import React, {
  useEffect,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useQuiz,
  useUpdateQuiz,
} from '../hooks/useQuiz';

import {
  QuizStatus,
  QuestionType,
  UpdateQuizRequest,
  UpdateQuestionRequest,
  UpdateChoiceRequest,
} from '../types/quizTypes';

import { ToastType } from '../../../components/common/Toast';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, CircleHelp, ClipboardList, FileText, ListChecks, Loader2, Mic2, Plus, Save, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';

interface UpdateQuizPageProps {
  onToast?: (
    title: string,
    desc?: string,
    type?: ToastType
  ) => void;
}

interface QuizNavigationState {
  returnTo?: string;
}

const QUIZ_STATUS_OPTIONS: {
  value: QuizStatus;
  label: string;
}[] = [
  {
    value: 'DRAFT',
    label: 'Nháp',
  },
  {
    value: 'ACTIVE',
    label: 'Đã xuất bản',
  },
  {
    value: 'INACTIVE',
    label: 'Ngừng hoạt động',
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
  orderIndex: number
): UpdateChoiceRequest => ({
  choiceId: 0,
  choiceText: '',
  isCorrect: false,
  orderIndex,
});

const createEmptyQuestion = (
  orderIndex: number
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

export const UpdateQuizPage: React.FC<
  UpdateQuizPageProps
> = ({ onToast }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } =
    useParams<{ id: string }>();

  // ============================================================
  // NAVIGATION STATE
  // ============================================================

  const navigationState =
    location.state as QuizNavigationState | null;

  const returnTo =
    navigationState?.returnTo;

  // ============================================================
  // QUIZ ID
  // ============================================================

  const quizId = id
    ? Number(id)
    : null;

  const validQuizId =
    quizId !== null &&
    Number.isInteger(quizId) &&
    quizId > 0
      ? quizId
      : null;

  // ============================================================
  // GET QUIZ
  // ============================================================

  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useQuiz(validQuizId);

  // ============================================================
  // UPDATE QUIZ
  // ============================================================

  const updateQuizMutation =
    useUpdateQuiz();

  // ============================================================
  // FORM - QUIZ INFORMATION
  // ============================================================

  const [title, setTitle] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    timeLimitMinutes,
    setTimeLimitMinutes,
  ] = useState(0);

  const [
    passingScore,
    setPassingScore,
  ] = useState(80);

  const [
    maxAttempts,
    setMaxAttempts,
  ] = useState(0);

  const [status, setStatus] =
    useState<QuizStatus>('DRAFT');

  // ============================================================
  // FORM - QUESTIONS
  // ============================================================

  const [
    questions,
    setQuestions,
  ] = useState<
    UpdateQuestionRequest[]
  >([]);

  // ============================================================
  // DELETE QUESTION CONFIRM
  // ============================================================

  const [
    questionToDelete,
    setQuestionToDelete,
  ] = useState<number | null>(
    null
  );

  // ============================================================
  // MESSAGE
  // ============================================================

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  // ============================================================
  // NAVIGATION
  // ============================================================

  /**
   * Update Quiz luôn quay về Quiz Detail.
   *
   * Đồng thời truyền tiếp returnTo để:
   *
   * QuizManagement / CourseLessons
   *          ↓
   *     QuizDetail
   *          ↓
   *     UpdateQuiz
   *          ↓
   *     QuizDetail
   *          ↓
   * returnTo ban đầu
   */
  const handleBackToDetail = () => {
    if (validQuizId !== null) {
      navigate(
        `/instructor/quizzes/${validQuizId}`,
        {
          replace: true,
          state: returnTo
            ? {
                returnTo,
              }
            : undefined,
        }
      );

      return;
    }

    navigate('/instructor/courses', {
      replace: true,
    });
  };

  // ============================================================
  // LOAD QUIZ DATA
  // ============================================================

  useEffect(() => {
    if (!quiz) {
      return;
    }

    setTitle(
      quiz.title ?? ''
    );

    setDescription(
      quiz.description ?? ''
    );

    setTimeLimitMinutes(
      quiz.timeLimitMinutes ?? 0
    );

    setPassingScore(
      Number(
        quiz.passingScore ?? 0
      )
    );

    setMaxAttempts(
      quiz.maxAttempts ?? 0
    );

    setStatus(
      quiz.status ?? 'DRAFT'
    );

    const loadedQuestions: UpdateQuestionRequest[] =
      (quiz.questions ?? []).map(
        (question) => ({
          questionId:
            question.questionId,

          questionText:
            question.questionText ??
            '',

          questionType:
            question.questionType,

          explanation:
            question.explanation ??
            null,

          orderIndex:
            question.orderIndex,

          choices:
            (
              question.choices ??
              []
            ).map(
              (choice) => ({
                choiceId:
                  choice.choiceId,

                choiceText:
                  choice.choiceText ??
                  '',

                isCorrect:
                  choice.isCorrect ??
                  false,

                orderIndex:
                  choice.orderIndex,
              })
            ),
        })
      );

    loadedQuestions.sort(
      (a, b) =>
        a.orderIndex -
        b.orderIndex
    );

    setQuestions(
      loadedQuestions
    );
  }, [quiz]);

  // ============================================================
  // QUESTION HELPERS
  // ============================================================

  const updateQuestion = (
    questionIndex: number,
    updates: Partial<UpdateQuestionRequest>
  ) => {
    setQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,
                  ...updates,
                }
              : question
        )
    );
  };

  const updateQuestionText = (
    questionIndex: number,
    value: string
  ) => {
    updateQuestion(
      questionIndex,
      {
        questionText: value,
      }
    );
  };

  const updateQuestionType = (
    questionIndex: number,
    value: QuestionType
  ) => {
    setQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (
            question,
            index
          ) => {
            if (
              index !==
              questionIndex
            ) {
              return question;
            }

            // ==================================================
            // TRUE / FALSE
            // ==================================================

            if (
              value ===
              'TRUE_FALSE'
            ) {
              return {
                ...question,

                questionType:
                  value,

                choices: [
                  {
                    choiceId:
                      question
                        .choices[0]
                        ?.choiceId ??
                      0,

                    choiceText:
                      'Đúng',

                    isCorrect:
                      question
                        .choices[0]
                        ?.isCorrect ??
                      false,

                    orderIndex: 1,
                  },
                  {
                    choiceId:
                      question
                        .choices[1]
                        ?.choiceId ??
                      0,

                    choiceText:
                      'Sai',

                    isCorrect:
                      question
                        .choices[1]
                        ?.isCorrect ??
                      false,

                    orderIndex: 2,
                  },
                ],
              };
            }

            // ==================================================
            // MULTIPLE / SINGLE CHOICE
            // ==================================================

            let updatedChoices =
              question.choices.map(
                (choice) => ({
                  ...choice,
                })
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
                      1
                  )
                );
              }
            }

            // ==================================================
            // SINGLE CHOICE
            // ==================================================

            if (
              value ===
                'SINGLE_CHOICE' &&
              updatedChoices.length >
                0
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
                  }
                );
            }

            return {
              ...question,
              questionType:
                value,
              choices:
                updatedChoices,
            };
          }
        )
    );
  };

  const updateQuestionExplanation =
    (
      questionIndex: number,
      value: string
    ) => {
      updateQuestion(
        questionIndex,
        {
          explanation:
            value.trim() ||
            null,
        }
      );
    };

  // ============================================================
  // ADD QUESTION
  // ============================================================

  const handleAddQuestion = () => {
    setQuestions(
      (currentQuestions) => [
        ...currentQuestions,

        createEmptyQuestion(
          currentQuestions.length +
            1
        ),
      ]
    );
  };

  // ============================================================
  // DELETE QUESTION
  // ============================================================

  const handleDeleteQuestion = (
    questionIndex: number
  ) => {
    setQuestionToDelete(
      questionIndex
    );
  };

  const confirmDeleteQuestion =
    () => {
      if (
        questionToDelete ===
        null
      ) {
        return;
      }

      setQuestions(
        (currentQuestions) =>
          currentQuestions
            .filter(
              (_, index) =>
                index !==
                questionToDelete
            )
            .map(
              (
                question,
                index
              ) => ({
                ...question,

                orderIndex:
                  index + 1,
              })
            )
      );

      setQuestionToDelete(
        null
      );

      onToast?.(
        'Đã xóa câu hỏi',
        'Câu hỏi sẽ được xóa khi bạn lưu thay đổi.',
        'success'
      );
    };

  const cancelDeleteQuestion =
    () => {
      setQuestionToDelete(
        null
      );
    };

  // ============================================================
  // CHOICE HELPERS
  // ============================================================

  const updateChoice = (
    questionIndex: number,
    choiceIndex: number,
    updates: Partial<UpdateChoiceRequest>
  ) => {
    setQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (
            question,
            qIndex
          ) => {
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
                    cIndex
                  ) =>
                    cIndex ===
                    choiceIndex
                      ? {
                          ...choice,
                          ...updates,
                        }
                      : choice
                ),
            };
          }
        )
    );
  };

  // ============================================================
  // UPDATE CHOICE TEXT
  // ============================================================

  const updateChoiceText = (
    questionIndex: number,
    choiceIndex: number,
    value: string
  ) => {
    updateChoice(
      questionIndex,
      choiceIndex,
      {
        choiceText: value,
      }
    );
  };

  // ============================================================
  // SELECT CORRECT CHOICE
  // ============================================================

  const handleToggleCorrectChoice =
    (
      questionIndex: number,
      choiceIndex: number
    ) => {
      setQuestions(
        (currentQuestions) =>
          currentQuestions.map(
            (
              question,
              qIndex
            ) => {
              if (
                qIndex !==
                questionIndex
              ) {
                return question;
              }

              // ================================================
              // SINGLE CHOICE
              // ================================================

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
                        cIndex
                      ) => ({
                        ...choice,

                        isCorrect:
                          cIndex ===
                          choiceIndex,
                      })
                    ),
                };
              }

              // ================================================
              // MULTIPLE CHOICE
              // ================================================

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
                        cIndex
                      ) =>
                        cIndex ===
                        choiceIndex
                          ? {
                              ...choice,

                              isCorrect:
                                !choice.isCorrect,
                            }
                          : choice
                    ),
                };
              }

              // ================================================
              // TRUE / FALSE
              // ================================================

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
                        cIndex
                      ) => ({
                        ...choice,

                        isCorrect:
                          cIndex ===
                          choiceIndex,
                      })
                    ),
                };
              }

              return question;
            }
          )
      );
    };

  // ============================================================
  // ADD CHOICE
  // ============================================================

  const handleAddChoice = (
    questionIndex: number
  ) => {
    setQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (
            question,
            qIndex
          ) => {
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
                    .length + 1
                ),
              ],
            };
          }
        )
    );
  };

  // ============================================================
  // DELETE CHOICE
  // ============================================================

  const handleDeleteChoice = (
    questionIndex: number,
    choiceIndex: number
  ) => {
    setQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (
            question,
            qIndex
          ) => {
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
                      index
                    ) =>
                      index !==
                      choiceIndex
                  )
                  .map(
                    (
                      choice,
                      index
                    ) => ({
                      ...choice,

                      orderIndex:
                        index + 1,
                    })
                  ),
            };
          }
        )
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
          question.choices
            .length === 0 &&
          question.questionType !==
            'TRUE_FALSE'
        ) {
          return `Câu hỏi ${questionNumber} phải có đáp án.`;
        }

        // ======================================================
        // CHECK DUPLICATE CHOICE TEXT
        // ======================================================

        const choiceTexts =
          question.choices
            .map((choice) =>
              choice.choiceText
                .trim()
                .toLowerCase()
            )
            .filter(
              (text) => text
            );

        const uniqueChoiceTexts =
          new Set(choiceTexts);

        if (
          choiceTexts.length !==
          uniqueChoiceTexts.size
        ) {
          return `Các đáp án của câu hỏi ${questionNumber} không được trùng nhau.`;
        }

        // ======================================================
        // CHECK EMPTY CHOICE
        // ======================================================

        for (
          let j = 0;
          j <
          question.choices
            .length;
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

        // ======================================================
        // SINGLE CHOICE
        // ======================================================

        if (
          question.questionType ===
          'SINGLE_CHOICE'
        ) {
          const correctCount =
            question.choices.filter(
              (choice) =>
                choice.isCorrect
            ).length;

          if (
            correctCount !== 1
          ) {
            return `Câu hỏi ${questionNumber} phải có đúng một đáp án đúng.`;
          }
        }

        // ======================================================
        // MULTIPLE CHOICE
        // ======================================================

        if (
          question.questionType ===
          'MULTIPLE_CHOICE'
        ) {
          const correctCount =
            question.choices.filter(
              (choice) =>
                choice.isCorrect
            ).length;

          if (
            correctCount < 1
          ) {
            return `Câu hỏi ${questionNumber} phải có ít nhất một đáp án đúng.`;
          }
        }

        // ======================================================
        // TRUE / FALSE
        // ======================================================

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
                choice.isCorrect
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
        !Number.isInteger(maxAttempts) || maxAttempts < 0
      ) {
        return 'Số lần làm bài phải là số nguyên không âm (0 = không giới hạn).';
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
          validationError
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
          'Quiz ID không hợp lệ.'
        );

        return;
      }

      // ========================================================
      // NORMALIZE QUESTION + CHOICE ORDER
      // ========================================================

      const normalizedQuestions =
        questions.map(
          (
            question,
            questionIndex
          ) => ({
            ...question,

            questionText:
              question.questionText.trim(),

            explanation:
              question.explanation
                ?.trim() ||
              null,

            orderIndex:
              questionIndex + 1,

            choices:
              question.choices.map(
                (
                  choice,
                  choiceIndex
                ) => ({
                  ...choice,

                  choiceText:
                    choice.choiceText.trim(),

                  orderIndex:
                    choiceIndex + 1,
                })
              ),
          })
        );

      const payload: UpdateQuizRequest =
        {
          purpose: quiz?.purpose ?? 'PRACTICE',
          moduleId: quiz?.moduleId ?? null,
          availableFrom: quiz?.availableFrom ?? null,
          availableUntil: quiz?.availableUntil ?? null,
          title:
            title.trim(),

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
            quizId:
              validQuizId,

            data: payload,
          }
        );

        setSuccessMessage(
          'Cập nhật quiz thành công.'
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });

        onToast?.(
          'Cập nhật thành công',
          'Bài kiểm tra đã được cập nhật thành công.',
          'success'
        );

        // ======================================================
        // SUCCESS -> QUIZ DETAIL
        // ======================================================

        setTimeout(() => {
          handleBackToDetail();
        }, 800);
      } catch (err) {
        console.error(
          'Update quiz failed:',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật quiz. Vui lòng thử lại.';

        setErrorMessage(
          message
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const toggleQuestion = (index: number) => setExpandedQuestions(current => current.includes(index) ? current.filter(i => i !== index) : [...current, index]);
  const inputClass = 'w-full rounded-xl border border-[#dbe5f4] bg-white px-3.5 py-2.5 text-sm text-[#173564] outline-none transition focus:border-[#1765f5] focus:ring-4 focus:ring-blue-100';
  const panelClass = 'rounded-[20px] border border-[#e0eaf7] bg-white shadow-[0_8px_30px_rgba(25,67,125,0.045)]';
  const totalChoices = questions.reduce((sum, q) => sum + q.choices.length, 0);
  const fieldLabel = 'mb-2 block text-xs font-bold text-[#234371]';

  if (validQuizId === null || isError || (!isLoading && !quiz)) {
    return <div className="min-h-[65vh] bg-[#f4f8ff] p-6"><div className={`${panelClass} mx-auto max-w-xl p-10 text-center`}><h2 className="text-xl font-extrabold text-[#112b5d]">{validQuizId === null ? 'Quiz ID không hợp lệ' : 'Không thể tải Quiz'}</h2><p className="mt-3 text-sm text-slate-500">{error instanceof Error ? error.message : 'Vui lòng kiểm tra lại đường dẫn hoặc thử lại.'}</p><button type="button" onClick={handleBackToDetail} className="mt-6 rounded-xl bg-[#0865f5] px-5 py-3 text-sm font-bold text-white">Quay lại</button></div></div>;
  }
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-[#f4f8ff] text-sm font-semibold text-blue-700"><Loader2 className="animate-spin" size={22}/>Đang tải thông tin Quiz...</div>;

  return (
    <div className="min-h-screen bg-[#f3f7fe] pb-12 text-[#0e2857]">
      <div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-7">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#7890b3]"><span>Giảng viên</span><span>/</span><span>Quiz</span><span>/</span><button type="button" onClick={handleBackToDetail} className="hover:text-blue-600">Chi tiết Quiz</button><span>/</span><span className="text-[#0c3479]">Chỉnh sửa Quiz</span></div>
        <section className="relative mb-5 overflow-hidden rounded-[24px] bg-[linear-gradient(115deg,#061a43_0%,#0843a9_49%,#006dff_76%,#05245d_100%)] px-6 py-6 text-white sm:px-9 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[48px] border-white/10"/><div className="pointer-events-none absolute right-48 top-4 h-48 w-48 rotate-45 rounded-[45px] border-[34px] border-blue-300/10"/>
          <div className="relative z-10 max-w-[850px]"><button type="button" onClick={handleBackToDetail} className="mb-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold transition hover:bg-white/25"><ArrowLeft size={15}/>Quay lại chi tiết</button><div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Quiz Editor · MSEEK Academy</div><h1 className="max-w-[750px] text-2xl font-black leading-tight sm:text-[32px]">{quiz?.title || 'Chỉnh sửa Quiz'}</h1><p className="mt-3 max-w-[690px] text-sm leading-6 text-blue-100">Cập nhật thông tin, cấu hình và nội dung câu hỏi. Các thay đổi chỉ được gửi lên hệ thống khi nhấn “Lưu thay đổi”.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs">Quiz #{quiz?.quizId}</span><span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{questions.length} câu hỏi</span><span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs">{QUIZ_STATUS_OPTIONS.find(item => item.value === status)?.label ?? status}</span></div></div>
          <div className="pointer-events-none absolute bottom-[-55px] right-[5%] hidden rotate-[-13deg] text-white/20 lg:block"><Mic2 size={235} strokeWidth={1.1}/></div>
        </section>
        {errorMessage && <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"><CircleHelp size={19} className="shrink-0"/>{errorMessage}</div>}
        {successMessage && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><Check size={18}/>{successMessage}</div>}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <section className={`${panelClass} p-5 sm:p-6`}>
              <div className="mb-5 flex items-center gap-2.5 border-b border-[#edf1f8] pb-4"><div className="rounded-xl bg-blue-50 p-2 text-[#0766f6]"><ClipboardList size={21}/></div><div><h2 className="text-base font-extrabold">Thông tin cơ bản</h2><p className="mt-0.5 text-xs text-[#8094b2]">Thông tin hiển thị cho học viên và thiết lập bài kiểm tra</p></div></div>
              <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                <div><label className={fieldLabel}>Tiêu đề Quiz <span className="text-red-500">*</span></label><input className={inputClass} value={title} maxLength={255} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề Quiz..."/><p className="mt-1 text-right text-[11px] text-[#92a2b9]">{title.length}/255</p></div>
                <div><label className={fieldLabel}>Trạng thái</label><select className={inputClass} value={status} onChange={e => setStatus(e.target.value as QuizStatus)}>{QUIZ_STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><span className="mt-1 block text-[11px] text-slate-500">Chọn Lưu trữ và đặt ngày mở để hệ thống tự xuất bản đúng lịch.</span></div>
                <div className="md:row-span-2"><label className={fieldLabel}>Mô tả</label><textarea className={`${inputClass} min-h-[143px] resize-y`} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả nội dung và mục tiêu của bài kiểm tra..."/></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={fieldLabel}>Thời gian (phút)</label><input className={inputClass} type="number" min={0} value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(Math.max(0, Number(e.target.value)))}/></div><div><label className={fieldLabel}>Điểm đạt (%)</label><input className={inputClass} type="number" min={0} max={100} step={0.01} value={80} disabled title="Điểm đạt cố định là 80% theo quy định MSEEK"/></div></div>
                <div><label className={fieldLabel}>Số lần làm tối đa (0 = không giới hạn)</label><input className={inputClass} type="number" min={0} value={maxAttempts} onChange={e => setMaxAttempts(Math.max(0, Number(e.target.value)))}/></div>
              </div>
            </section>
            <section className={`${panelClass} p-4 sm:p-5`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="rounded-xl bg-blue-50 p-2 text-[#0865f5]"><ListChecks size={20}/></div><div><h2 className="text-base font-extrabold">Danh sách câu hỏi ({questions.length})</h2><p className="text-xs text-[#8497b3]">Nhấn vào từng câu hỏi để chỉnh sửa nội dung và đáp án</p></div></div><button type="button" onClick={() => { handleAddQuestion(); setExpandedQuestions(current => [...current, questions.length]); }} className="inline-flex items-center gap-2 rounded-xl bg-[#0865f5] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"><Plus size={16}/>Thêm câu hỏi</button></div>
              {questions.length === 0 && <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center text-sm text-[#6a82a8]">Chưa có câu hỏi. Nhấn “Thêm câu hỏi” để bắt đầu.</div>}
              <div className="space-y-2.5">{questions.map((question, questionIndex) => {
                const expanded = expandedQuestions.includes(questionIndex);
                return <div key={`${question.questionId}-${questionIndex}`} className={`overflow-hidden rounded-2xl border transition ${expanded ? 'border-blue-300 bg-[#f8fbff] shadow-sm' : 'border-[#e1eaf6] bg-white hover:border-blue-200'}`}>
                  <div className="flex items-center gap-2 px-3 py-3 sm:gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eff4fc] text-xs font-extrabold text-[#16407f]">{questionIndex + 1}</span><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={18}/></div><button type="button" onClick={() => toggleQuestion(questionIndex)} aria-expanded={expanded} className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-bold text-[#123368]">{question.questionText.trim() || `Câu hỏi ${questionIndex + 1} (chưa có nội dung)`}</div><div className="mt-1 text-[11px] text-[#8497b4]">{QUESTION_TYPE_OPTIONS.find(item => item.value === question.questionType)?.label || question.questionType}{question.questionId > 0 ? ` · ID #${question.questionId}` : ' · Mới'}</div></button><span className="hidden shrink-0 text-xs font-semibold text-[#5472a2] sm:inline">{question.choices.length} đáp án</span><button type="button" onClick={() => handleDeleteQuestion(questionIndex)} title="Xóa câu hỏi" className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"><Trash2 size={16}/></button><button type="button" onClick={() => toggleQuestion(questionIndex)} aria-label={expanded ? 'Thu gọn' : 'Mở rộng'} className="rounded-lg p-2 text-[#31558b] hover:bg-blue-50">{expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button></div>
                  {expanded && <div className="space-y-4 border-t border-[#e5edf8] px-4 py-5 sm:px-5"><div><label className={fieldLabel}>Nội dung câu hỏi <span className="text-red-500">*</span></label><textarea rows={3} className={`${inputClass} resize-y`} value={question.questionText} onChange={e => updateQuestionText(questionIndex, e.target.value)} placeholder="Nhập nội dung câu hỏi..."/></div><div><label className={fieldLabel}>Loại câu hỏi</label><select className={inputClass} value={question.questionType} onChange={e => updateQuestionType(questionIndex, e.target.value as QuestionType)}>{QUESTION_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Danh sách đáp án</h3><p className="text-[11px] text-[#8497b4]">{question.questionType === 'MULTIPLE_CHOICE' ? 'Có thể đánh dấu nhiều đáp án đúng.' : 'Chỉ chọn một đáp án đúng.'}</p></div>{question.questionType !== 'TRUE_FALSE' && <button type="button" onClick={() => handleAddChoice(questionIndex)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"><Plus size={14}/>Thêm đáp án</button>}</div>
                    <div className="space-y-2">{question.choices.map((choice, choiceIndex) => <div key={`${choice.choiceId}-${choiceIndex}`} className={`flex items-center gap-2 rounded-xl border p-2.5 ${choice.isCorrect ? 'border-emerald-200 bg-emerald-50/70' : 'border-[#e1e9f4] bg-white'}`}><button type="button" onClick={() => handleToggleCorrectChoice(questionIndex, choiceIndex)} title={choice.isCorrect ? 'Đáp án đúng' : 'Đánh dấu đáp án đúng'} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${choice.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500'}`}><Check size={15}/></button><span className="w-5 shrink-0 text-xs font-bold text-[#6880a5]">{String.fromCharCode(65 + choiceIndex)}</span><input className={`${inputClass} min-w-0 flex-1`} value={choice.choiceText} disabled={question.questionType === 'TRUE_FALSE'} onChange={e => updateChoiceText(questionIndex, choiceIndex, e.target.value)} placeholder={`Đáp án ${String.fromCharCode(65 + choiceIndex)}...`}/>{choice.isCorrect && <span className="hidden text-[11px] font-bold text-emerald-700 sm:inline">Đúng</span>}{question.questionType !== 'TRUE_FALSE' && question.choices.length > 2 && <button type="button" onClick={() => handleDeleteChoice(questionIndex, choiceIndex)} title="Xóa đáp án" className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X size={16}/></button>}</div>)}</div>
                    <div><label className={fieldLabel}>Giải thích đáp án <span className="font-normal text-slate-400">(không bắt buộc)</span></label><textarea rows={2} className={`${inputClass} resize-y`} value={question.explanation ?? ''} onChange={e => updateQuestionExplanation(questionIndex, e.target.value)} placeholder="Giải thích tại sao đáp án này đúng..."/></div></div>}
                </div>;
              })}</div>
              {questions.length > 0 && <button type="button" onClick={() => { handleAddQuestion(); setExpandedQuestions(current => [...current, questions.length]); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/70 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100"><Plus size={16}/>Thêm câu hỏi mới</button>}
            </section>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800"><strong>Lưu ý:</strong> ID của câu hỏi và đáp án cũ được giữ nguyên; mục mới gửi ID = 0. Nếu Quiz đã có học viên làm bài, backend có thể từ chối sửa/xóa câu hỏi để bảo vệ lịch sử kết quả.</div>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-5">
            <section className={`${panelClass} p-4`}><div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><BookOpen size={18} className="text-blue-600"/>Tổng quan Quiz</div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f1f6ff] p-3"><p className="text-[11px] text-[#7289ab]">Tổng số câu</p><p className="mt-1 text-xl font-black">{questions.length}</p></div><div className="rounded-xl bg-[#f1f6ff] p-3"><p className="text-[11px] text-[#7289ab]">Tổng đáp án</p><p className="mt-1 text-xl font-black">{totalChoices}</p></div><div className="rounded-xl bg-[#f1f6ff] p-3"><p className="text-[11px] text-[#7289ab]">Thời gian</p><p className="mt-1 text-lg font-black">{timeLimitMinutes === 0 ? 'Không giới hạn' : `${timeLimitMinutes} phút`}</p></div><div className="rounded-xl bg-[#f1f6ff] p-3"><p className="text-[11px] text-[#7289ab]">Điểm đạt</p><p className="mt-1 text-xl font-black">{passingScore}%</p></div></div><p className="mt-3 text-[11px] leading-5 text-[#8295b0]">Các chỉ số lấy từ dữ liệu Quiz đang chỉnh sửa, không phải thống kê lượt làm bài.</p></section>
            <section className={`${panelClass} p-4`}><div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Settings2 size={18} className="text-blue-600"/>Cấu hình hiện tại</div><div className="space-y-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="text-[#7087a8]">Trạng thái</span><span className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700">{QUIZ_STATUS_OPTIONS.find(item => item.value === status)?.label ?? status}</span></div><div className="flex items-center justify-between gap-2"><span className="text-[#7087a8]">Lượt làm tối đa</span><strong>{maxAttempts} lượt</strong></div><div className="flex items-center justify-between gap-2"><span className="text-[#7087a8]">Số câu đã nhập nội dung</span><strong>{questions.filter(q => q.questionText.trim()).length}/{questions.length}</strong></div></div></section>
            <section className={`${panelClass} p-4`}><div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={18} className="text-blue-600"/>Hành động</div><button type="button" disabled={updateQuizMutation.isPending} onClick={handleUpdateQuiz} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#075cf3] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{updateQuizMutation.isPending ? <Loader2 size={17} className="animate-spin"/> : <Save size={17}/>} {updateQuizMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}</button><button type="button" disabled={updateQuizMutation.isPending} onClick={handleBackToDetail} className="mt-2 w-full rounded-xl border border-[#dbe5f4] bg-white px-4 py-3 text-sm font-bold text-[#16376d] hover:bg-blue-50 disabled:opacity-60">Hủy thay đổi</button><p className="mt-3 text-center text-[11px] leading-5 text-[#8295b0]">Dữ liệu chỉ được cập nhật sau khi lưu thành công.</p></section>
          </aside>
        </div>
      </div>
      {questionToDelete !== null && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#061a43]/60 px-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-question-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-4 inline-flex rounded-xl bg-red-50 p-3 text-red-600"><Trash2 size={25}/></div><h2 id="delete-question-title" className="text-xl font-extrabold">Xóa câu hỏi {questionToDelete + 1}?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Câu hỏi và các đáp án liên quan sẽ bị loại khỏi biểu mẫu. Thay đổi chỉ được gửi lên backend khi nhấn “Lưu thay đổi”.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={cancelDeleteQuestion} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Hủy</button><button type="button" onClick={confirmDeleteQuestion} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">Xóa câu hỏi</button></div></div></div>}
    </div>
  );
};

export default UpdateQuizPage;
