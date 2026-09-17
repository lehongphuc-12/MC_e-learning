import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useTakeQuiz,
  useSubmitQuiz,
} from '../hooks/useQuiz';

import { QuizHeader } from '../components/QuizHeader';
import { QuizChoiceList } from '../components/QuizChoiceList';
import { QuizQuestionNavigation } from '../components/QuizQuestionNavigation';

import {
  TakeQuestionDto,
} from '../types/quizTypes';

export const TakeQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();

  const parsedQuizId =
  quizId && Number.isInteger(Number(quizId)) && Number(quizId) > 0
    ? Number(quizId)
    : null;

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

    if (!autoSubmit) {
      const confirmed = window.confirm(
        'Bạn có chắc chắn muốn nộp bài không?'
      );

      if (!confirmed) {
        return;
      }
    }

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
       * Backend submit trả về attemptId.
       *
       * Route:
       * /quizzes/:quizId/result/:attemptId
       */
      navigate(
        `/quizzes/${quiz.quizId}/result/${result.attemptId}`
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

      return prev - 1;
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
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center max-w-md w-full shadow-sm">
        <div className="text-red-500 text-4xl mb-4">
          !
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Không thể tải bài kiểm tra
        </h2>

        <p className="text-slate-600 mb-2">
          {error instanceof Error
            ? error.message
            : 'Không tìm thấy bài kiểm tra.'}
        </p>

        <p className="text-xs text-slate-400 mb-6">
          Quiz ID: {parsedQuizId ?? 'null'}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
        >
          Quay lại
        </button>
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
          HEADER COMPONENT
      ======================================================== */}

<QuizHeader
  title={quiz.title}
  attemptNumber={quiz.attemptNumber}
  remainingSeconds={remainingSeconds ?? 0}
  timeLimitMinutes={quiz.timeLimitMinutes}
  answeredCount={answeredCount}
  totalQuestions={quiz.questions.length}
  onSubmit={() => handleSubmit(false)}
  submitting={submitQuiz.isPending}
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
                  CÂU HỎI {currentIndex + 1}{' '}
                  / {quiz.questions.length}
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
                  {currentQuestion.questionType}
                </span>

              </div>

              {/* Question */}

              <h1 className="text-xl font-semibold leading-relaxed text-slate-900 mb-7">
                {currentQuestion.questionText}
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
                      handleSubmit(false)
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
    </div>
  );
};

export default TakeQuizPage;