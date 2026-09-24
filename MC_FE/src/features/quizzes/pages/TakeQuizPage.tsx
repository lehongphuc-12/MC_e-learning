import React, { useEffect, useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useTakeQuiz,
  useSubmitQuiz,
} from '../hooks/useQuiz';

import { quizApi } from '../api/quizApi';

import { QuizHeader } from '../components/QuizHeader';
import { QuizChoiceList } from '../components/QuizChoiceList';
import { QuizQuestionNavigation } from '../components/QuizQuestionNavigation';

import {
  TakeQuestionDto,
} from '../types/quizTypes';

interface QuizNavigationState {
  returnTo?: string;
}

export const TakeQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { quizId } = useParams<{ quizId: string }>();

  const parsedQuizId =
    quizId &&
    Number.isInteger(Number(quizId)) &&
    Number(quizId) > 0
      ? Number(quizId)
      : null;

  // ============================================================
  // NAVIGATION STATE
  // ============================================================

  /**
   * CourseLearningPage truyền vào:
   *
   * {
   *   returnTo: '/courses/12/learn?lessonId=35'
   * }
   *
   * TakeQuizPage giữ lại giá trị này và forward tiếp
   * sang QuizResultPage.
   */
  const navigationState =
    location.state as QuizNavigationState | null;

  const returnTo =
    navigationState?.returnTo;

  /**
   * Không dùng navigate(-1).
   *
   * Nếu Quiz được mở từ CourseLearningPage thì quay đúng
   * về course/lesson trước đó.
   *
   * Nếu người dùng truy cập trực tiếp URL Quiz thì fallback
   * về danh sách khóa học đã đăng ký.
   */
  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, {
        replace: true,
      });
      return;
    }

    navigate('/my-courses', {
      replace: true,
    });
  };

  // ============================================================
  // QUIZ DATA
  // ============================================================

  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useTakeQuiz(parsedQuizId);

  // ============================================================
  // SUBMIT
  // ============================================================

  const submitQuiz = useSubmitQuiz();

  // ============================================================
  // STATE
  // ============================================================

  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * questionId -> selectedChoiceId
   *
   * Backend hiện tại:
   * SubmitQuizAnswerRequest chỉ có 1 selectedChoiceId
   * nên frontend cũng lưu 1 choice cho mỗi question.
   */
  const [answers, setAnswers] = useState<
    Record<number, number | null>
  >({});

  /**
   * Index của câu được đánh dấu.
   */
  const [flagged, setFlagged] = useState<Set<number>>(
    new Set()
  );

  /**
   * Countdown.
   */
  const [remainingSeconds, setRemainingSeconds] =
    useState<number | null>(null);

  /**
   * Tránh auto submit nhiều lần khi timer = 0.
   */
  const [autoSubmitted, setAutoSubmitted] =
    useState(false);

  /**
   * Loading khi lấy kết quả gần nhất.
   */
  const [isLoadingLatestResult, setIsLoadingLatestResult] =
    useState(false);

  /**
   * Modal xác nhận nộp bài.
   */
  const [showSubmitConfirm, setShowSubmitConfirm] =
    useState(false);

  /**
   * Notification thay cho window.alert().
   */
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // ============================================================
  // NOTIFICATION AUTO CLOSE
  // ============================================================

  useEffect(() => {
    if (!notification) return;

    const timer = window.setTimeout(() => {
      setNotification(null);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notification]);

  // ============================================================
  // INITIALIZE TIMER
  // ============================================================

  useEffect(() => {
    if (!quiz) return;

    if (quiz.timeLimitMinutes > 0) {
      setRemainingSeconds(
        quiz.timeLimitMinutes * 60
      );
    } else {
      setRemainingSeconds(null);
    }
  }, [quiz]);

  // ============================================================
  // CURRENT QUESTION
  // ============================================================

  const currentQuestion: TakeQuestionDto | undefined =
    quiz?.questions[currentIndex];

  // ============================================================
  // ANSWERED QUESTIONS
  // ============================================================

  const answeredQuestionIndexes = useMemo(() => {
    if (!quiz) return [];

    return quiz.questions
      .map((question, index) => {
        const selected =
          answers[question.questionId];

        return selected !== undefined &&
          selected !== null
          ? index
          : -1;
      })
      .filter((index) => index !== -1);
  }, [quiz, answers]);

  const answeredCount =
    answeredQuestionIndexes.length;

  // ============================================================
  // SELECT ANSWER
  // ============================================================

  const handleSelectAnswer = (
    questionId: number,
    choiceId: number
  ) => {
    if (!currentQuestion || submitQuiz.isPending) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  };

  // ============================================================
  // FLAG QUESTION
  // ============================================================

  const handleToggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);

      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }

      return next;
    });
  };

  // ============================================================
  // QUESTION NAVIGATION
  // ============================================================

  const handleQuestionChange = (
    index: number
  ) => {
    if (!quiz || submitQuiz.isPending) {
      return;
    }

    if (
      index < 0 ||
      index >= quiz.questions.length
    ) {
      return;
    }

    setCurrentIndex(index);
  };

  // ============================================================
  // NEXT
  // ============================================================

  const handleNext = () => {
    if (!quiz) return;

    if (
      currentIndex <
      quiz.questions.length - 1
    ) {
      setCurrentIndex(
        (prev) => prev + 1
      );
    }
  };

  // ============================================================
  // PREVIOUS
  // ============================================================

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(
        (prev) => prev - 1
      );
    }
  };

  // ============================================================
  // VIEW LATEST RESULT
  // ============================================================

  const handleViewLatestResult = async () => {
    if (!parsedQuizId || isLoadingLatestResult) {
      return;
    }

    try {
      setIsLoadingLatestResult(true);

      const response =
        await quizApi.getLatestQuizResult(
          parsedQuizId
        );

      console.log(
        'Latest result response:',
        response
      );

      /**
       * Backend trả:
       *
       * {
       *   success: true,
       *   data: {
       *     attemptId: 12
       *   }
       * }
       *
       * Nếu request() của project đã unwrap data,
       * response sẽ là:
       *
       * {
       *   attemptId: 12
       * }
       *
       * Vì vậy kiểm tra cả 2 trường hợp.
       */
      const responseData =
        response as {
          success?: boolean;
          data?: {
            attemptId?: number;
          };
          attemptId?: number;
        };

      const attemptId =
        responseData?.data?.attemptId ??
        responseData?.attemptId;

      if (!attemptId) {
        console.error(
          'Không tìm thấy attemptId từ latest-result.',
          response
        );

        setNotification({
          message:
            'Không tìm thấy kết quả Quiz gần nhất.',
          type: 'error',
        });

        return;
      }

      /**
       * Forward returnTo sang QuizResultPage.
       *
       * replace: true để trang lỗi/hết lượt của TakeQuiz
       * không nằm ngay phía sau Result trong history.
       */
      navigate(
        `/quizzes/${parsedQuizId}/result/${attemptId}`,
        {
          replace: true,
          state: {
            returnTo,
          },
        }
      );
    } catch (err) {
      console.error(
        'Không thể lấy kết quả Quiz gần nhất:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'Không thể lấy kết quả Quiz.';

      setNotification({
        message,
        type: 'error',
      });
    } finally {
      setIsLoadingLatestResult(false);
    }
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = (
    autoSubmit = false
  ) => {
    if (
      !quiz ||
      submitQuiz.isPending ||
      autoSubmitted
    ) {
      return;
    }

    /**
     * Nếu hết giờ thì tự động submit.
     * Không hiển thị modal xác nhận.
     */
    if (autoSubmit) {
      setAutoSubmitted(true);
    }

    const submitData = {
      attemptId: quiz.attemptId,

      answers: quiz.questions.map(
        (question) => ({
          questionId:
            question.questionId,

          selectedChoiceId:
            answers[
              question.questionId
            ] ?? null,
        })
      ),
    };

    submitQuiz.mutate(
      {
        quizId: quiz.quizId,
        data: submitData,
      },
      {
        onSuccess: (result) => {
          /**
           * LE16 - View Quiz Result
           *
           * Sau khi submit:
           *
           * CourseLearning
           *      ↓
           * TakeQuiz
           *      ↓
           * QuizResult
           *
           * replace: true loại TakeQuiz khỏi vị trí hiện tại
           * trong history.
           *
           * returnTo được forward sang QuizResultPage để
           * nút "Quay lại" biết phải về đâu.
           */
          navigate(
            `/quizzes/${quiz.quizId}/result/${result.attemptId}`,
            {
              replace: true,
              state: {
                returnTo,
              },
            }
          );
        },
      }
    );
  };

  // ============================================================
  // TIMER
  // ============================================================

  useEffect(() => {
    if (!quiz) return;
    if (quiz.timeLimitMinutes <= 0) return;
    if (remainingSeconds === null) return;
    if (autoSubmitted) return;
    if (submitQuiz.isPending) return;

    if (remainingSeconds === 0) {
      handleSubmit(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;

        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    quiz,
    remainingSeconds,
    autoSubmitted,
    submitQuiz.isPending,
  ]);

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-slate-600">
            Đang tải bài kiểm tra...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (
    isError ||
    !quiz ||
    !currentQuestion
  ) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : '';

    const isMaxAttemptsError =
      errorMessage.includes(
        'maximum number of attempts'
      ) ||
      errorMessage.includes(
        'maximum attempts'
      );

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md w-full shadow-sm">

          {/* ICON */}

          <div
            className={`text-4xl mb-4 ${
              isMaxAttemptsError
                ? 'text-amber-500'
                : 'text-red-500'
            }`}
          >
            {isMaxAttemptsError
              ? '✓'
              : '!'}
          </div>

          {/* TITLE */}

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isMaxAttemptsError
              ? 'Đã hết lượt làm Quiz'
              : 'Không thể tải bài kiểm tra'}
          </h2>

          {/* MESSAGE */}

          <p className="text-slate-600 mb-6">
            {isMaxAttemptsError
              ? 'Bạn đã sử dụng hết số lần được phép làm bài kiểm tra này.'
              : errorMessage ||
                'Không tìm thấy bài kiểm tra.'}
          </p>

          {/* ACTIONS */}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">

            {/* XEM KẾT QUẢ */}

            {isMaxAttemptsError && (
              <button
                type="button"
                onClick={
                  handleViewLatestResult
                }
                disabled={
                  isLoadingLatestResult
                }
                className="px-5 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingLatestResult
                  ? 'Đang tải...'
                  : 'Xem kết quả'}
              </button>
            )}

            {/* QUAY LẠI */}

            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              Quay lại
            </button>

          </div>

          {/* QUIZ ID */}

          <p className="text-xs text-slate-400 mt-6">
            Quiz ID: {parsedQuizId ?? 'null'}
          </p>

        </div>
      </div>
    );
  }

  // ============================================================
  // CURRENT ANSWER
  // ============================================================

  const selectedChoiceId =
    answers[
      currentQuestion.questionId
    ] ?? null;

  /**
   * QuizChoiceList nhận selectedChoiceIds
   * dưới dạng mảng.
   *
   * Backend hiện chỉ lưu 1 choice,
   * nên array này tối đa chỉ có 1 phần tử.
   */
  const selectedChoiceIds =
    selectedChoiceId !== null
      ? [selectedChoiceId]
      : [];

  // ============================================================
  // SUBMIT ERROR
  // ============================================================

  const submitError =
    submitQuiz.error instanceof Error
      ? submitQuiz.error.message
      : '';

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ========================================================
          NOTIFICATION
      ======================================================== */}

      {notification && (
        <div className="fixed right-5 top-5 z-[9999] w-[calc(100%-2.5rem)] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${
              notification.type === 'error'
                ? 'border-red-200'
                : 'border-emerald-200'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                notification.type === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {notification.type === 'error'
                ? '!'
                : '✓'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {notification.type === 'error'
                  ? 'Có lỗi xảy ra'
                  : 'Thành công'}
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() =>
                setNotification(null)
              }
              className="text-lg leading-none text-slate-400 transition hover:text-slate-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          HEADER COMPONENT
      ======================================================== */}

      <QuizHeader
        title={quiz.title}
        attemptNumber={quiz.attemptNumber}
        remainingSeconds={
          remainingSeconds ?? 0
        }
        timeLimitMinutes={
          quiz.timeLimitMinutes
        }
        answeredCount={
          answeredCount
        }
        totalQuestions={
          quiz.questions.length
        }
        onSubmit={() =>
          setShowSubmitConfirm(true)
        }
        submitting={
          submitQuiz.isPending
        }
      />

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="max-w-[1400px] mx-auto px-6 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ====================================================
              LEFT
          ==================================================== */}

          <section>

            {/* Question progress */}

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">

                <span className="font-semibold text-slate-700">
                  CÂU HỎI{' '}
                  {currentIndex + 1}{' '}
                  /{' '}
                  {quiz.questions.length}
                </span>

                <span className="text-slate-500">
                  Đã trả lời:{' '}
                  {answeredCount}/
                  {quiz.questions.length}
                </span>

              </div>

              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${
                      ((currentIndex + 1) /
                        quiz.questions.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* ==================================================
                QUESTION CARD
            ================================================== */}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-7">

              {/* Toolbar */}

              <div className="flex items-center justify-between mb-6">

                <button
                  type="button"
                  onClick={
                    handleToggleFlag
                  }
                  disabled={
                    submitQuiz.isPending
                  }
                  className={`text-sm flex items-center gap-2 ${
                    flagged.has(
                      currentIndex
                    )
                      ? 'text-red-600'
                      : 'text-slate-500 hover:text-slate-800'
                  } disabled:opacity-50`}
                >
                  ⚑

                  {flagged.has(
                    currentIndex
                  )
                    ? 'Bỏ đánh dấu'
                    : 'Đánh dấu câu hỏi'}
                </button>

                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                  {
                    currentQuestion.questionType
                  }
                </span>

              </div>

              {/* Question */}

              <h1 className="text-xl font-semibold leading-relaxed text-slate-900 mb-7">
                {
                  currentQuestion.questionText
                }
              </h1>

              {/* ==================================================
                  CHOICE COMPONENT
              ================================================== */}

              <QuizChoiceList
                questionId={
                  currentQuestion.questionId
                }
                questionType={
                  currentQuestion.questionType
                }
                choices={
                  currentQuestion.choices
                }
                selectedChoiceIds={
                  selectedChoiceIds
                }
                onSelect={
                  handleSelectAnswer
                }
                disabled={
                  submitQuiz.isPending
                }
              />

            </div>

            {/* ==================================================
                SUBMIT ERROR
            ================================================== */}

            {submitError && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {submitError}
              </div>
            )}

            {/* ==================================================
                BOTTOM ACTIONS
            ================================================== */}

            <div className="flex items-center justify-between mt-5">

              <button
                type="button"
                disabled={
                  currentIndex === 0 ||
                  submitQuiz.isPending
                }
                onClick={
                  handlePrevious
                }
                className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>

              <div className="flex items-center gap-3">

                {currentIndex <
                quiz.questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={
                      submitQuiz.isPending
                    }
                    onClick={
                      handleNext
                    }
                    className="px-6 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Lưu & Tiếp →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      submitQuiz.isPending
                    }
                    onClick={() =>
                      setShowSubmitConfirm(true)
                    }
                    className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitQuiz.isPending
                      ? 'Đang nộp...'
                      : 'Nộp bài'}
                  </button>
                )}

              </div>
            </div>

          </section>

          {/* ====================================================
              RIGHT - NAVIGATION COMPONENT
          ==================================================== */}

          <aside className="h-fit lg:sticky lg:top-6">

            <QuizQuestionNavigation
              totalQuestions={
                quiz.questions.length
              }
              currentQuestion={
                currentIndex
              }
              answeredQuestionIndexes={
                answeredQuestionIndexes
              }
              onQuestionChange={
                handleQuestionChange
              }
              disabled={
                submitQuiz.isPending
              }
            />

            {/* ==================================================
                FLAG INFO
            ================================================== */}

            {flagged.size > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

                <p className="text-sm font-semibold text-red-700">
                  Câu đã đánh dấu
                </p>

                <p className="mt-1 text-xs text-red-600">
                  {Array.from(flagged)
                    .sort(
                      (a, b) => a - b
                    )
                    .map(
                      (index) =>
                        index + 1
                    )
                    .join(', ')}
                </p>

              </div>
            )}

          </aside>

        </div>

      </main>

      {/* ========================================================
          SUBMIT CONFIRM MODAL
      ======================================================== */}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4">

          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Đóng"
            disabled={submitQuiz.isPending}
            onClick={() =>
              setShowSubmitConfirm(false)
            }
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          {/* MODAL */}

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-confirm-title"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >

            {/* ICON */}

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-600">
              ?
            </div>

            {/* TITLE */}

            <h2
              id="submit-confirm-title"
              className="mt-4 text-xl font-bold text-slate-900"
            >
              Xác nhận nộp bài
            </h2>

            {/* DESCRIPTION */}

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bạn đã trả lời{' '}
              <span className="font-semibold text-slate-900">
                {answeredCount}/
                {quiz.questions.length}
              </span>{' '}
              câu hỏi.
            </p>

            {/* UNANSWERED WARNING */}

            {answeredCount <
              quiz.questions.length && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm leading-5 text-amber-700">
                  Bạn vẫn còn{' '}
                  <strong>
                    {quiz.questions.length -
                      answeredCount}
                  </strong>{' '}
                  câu chưa trả lời.
                </p>
              </div>
            )}

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Sau khi nộp bài, hệ thống sẽ
              chấm điểm và hiển thị kết quả
              của bạn.
            </p>

            {/* ACTIONS */}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={
                  submitQuiz.isPending
                }
                onClick={() =>
                  setShowSubmitConfirm(false)
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp tục làm
              </button>

              <button
                type="button"
                disabled={
                  submitQuiz.isPending
                }
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmit(false);
                }}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitQuiz.isPending
                  ? 'Đang nộp...'
                  : 'Nộp bài'}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TakeQuizPage;