import React from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useQuizResult } from '../hooks/useQuiz';

interface QuizNavigationState {
  returnTo?: string;
}

export const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    quizId: quizIdParam,
    attemptId: attemptIdParam,
  } = useParams<{
    quizId: string;
    attemptId: string;
  }>();

  // =========================
  // NAVIGATION STATE
  // =========================

  /**
   * Flow:
   *
   * CourseLearningPage
   *    ↓ state.returnTo
   * TakeQuizPage
   *    ↓ state.returnTo
   * QuizResultPage
   *
   * Ví dụ:
   * returnTo = "/courses/12/learn?lessonId=35"
   */
  const navigationState =
    location.state as QuizNavigationState | null;

  const returnTo =
    navigationState?.returnTo;

  /**
   * Không sử dụng navigate(-1) tại Result.
   *
   * Nếu dùng navigate(-1), browser history có thể đưa
   * người dùng quay lại TakeQuizPage vừa nộp xong.
   *
   * Thay vào đó quay trực tiếp về CourseLearningPage
   * đã được lưu trong returnTo.
   */
  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, {
        replace: true,
      });

      return;
    }

    /**
     * Fallback khi user truy cập trực tiếp URL Result
     * hoặc refresh làm mất navigation state.
     */
    navigate('/my-courses', {
      replace: true,
    });
  };

  // =========================
  // PARAMS
  // =========================

  const quizId = quizIdParam
    ? Number(quizIdParam)
    : null;

  const attemptId = attemptIdParam
    ? Number(attemptIdParam)
    : null;

  const validQuizId =
    quizId !== null &&
    Number.isInteger(quizId) &&
    quizId > 0
      ? quizId
      : null;

  const validAttemptId =
    attemptId !== null &&
    Number.isInteger(attemptId) &&
    attemptId > 0
      ? attemptId
      : null;

  // =========================
  // GET QUIZ RESULT
  // =========================

  const {
    data: result,
    isLoading,
    isError,
    error,
  } = useQuizResult(
    validQuizId,
    validAttemptId
  );

  // =========================
  // INVALID PARAMS
  // =========================

  if (
    validQuizId === null ||
    validAttemptId === null
  ) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Không thể xem kết quả
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quiz ID hoặc Attempt ID không hợp lệ.
            </p>

            <button
              type="button"
              onClick={handleBack}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // LOADING
  // =========================

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Đang tải kết quả...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (isError || !result) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
              !
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Không thể tải kết quả
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error instanceof Error
                ? error.message
                : 'Đã xảy ra lỗi khi tải kết quả bài quiz.'}
            </p>

            <button
              type="button"
              onClick={handleBack}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // STATISTICS
  // =========================

  const totalQuestions =
    result.answers.length;

  const correctAnswers =
    result.answers.filter(
      (answer) => answer.isCorrect
    ).length;

  const wrongAnswers =
    totalQuestions - correctAnswers;

  const answeredQuestions =
    result.answers.filter(
      (answer) =>
        answer.selectedChoiceId !== null
    ).length;

  // =========================
  // DATE FORMAT
  // =========================

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return '—';
    }

    return new Date(value).toLocaleString(
      'vi-VN',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      }
    );
  };

  // =========================
  // RETAKE QUIZ
  // =========================

  /**
   * Khi làm lại Quiz, tiếp tục giữ returnTo.
   *
   * Flow:
   *
   * Result
   *   ↓ Làm lại
   * TakeQuiz
   *   ↓ Submit
   * Result
   *   ↓ Quay lại
   * CourseLearning
   */
  const handleRetakeQuiz = () => {
    navigate(
      `/quizzes/${result.quizId}/take`,
      {
        replace: true,
        state: {
          returnTo,
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            ← Quay lại
          </button>

          <p className="text-sm font-medium text-blue-600">
            Kết quả bài kiểm tra
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            {result.quizTitle}
          </h1>
        </div>

        {/* =========================
            RESULT SUMMARY
        ========================= */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

            {/* SCORE */}

            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                Điểm số
              </p>

              <p className="mt-2 text-5xl font-bold text-slate-900">
                {result.score}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Điểm đạt: {result.passingScore}
              </p>
            </div>

            {/* PASS STATUS */}

            <div
              className={`flex flex-col items-center justify-center rounded-2xl p-6 text-center ${
                result.isPassed
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                  result.isPassed
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {result.isPassed
                  ? '✓'
                  : '✕'}
              </div>

              <p
                className={`mt-3 text-lg font-bold ${
                  result.isPassed
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}
              >
                {result.isPassed
                  ? 'Đạt'
                  : 'Chưa đạt'}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {result.isPassed
                  ? 'Bạn đã đạt yêu cầu của bài quiz.'
                  : 'Bạn chưa đạt điểm yêu cầu.'}
              </p>
            </div>

            {/* CORRECT ANSWERS */}

            <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                Câu trả lời đúng
              </p>

              <p className="mt-2 text-5xl font-bold text-blue-600">
                {correctAnswers}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                / {totalQuestions} câu
              </p>
            </div>
          </div>

          {/* =========================
              STATISTICS
          ========================= */}

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">
                Tổng số câu
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {totalQuestions}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-600">
                Đúng
              </p>

              <p className="mt-1 text-xl font-bold text-green-700">
                {correctAnswers}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs text-red-600">
                Sai
              </p>

              <p className="mt-1 text-xl font-bold text-red-700">
                {wrongAnswers}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600">
                Đã trả lời
              </p>

              <p className="mt-1 text-xl font-bold text-blue-700">
                {answeredQuestions}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            ATTEMPT INFORMATION
        ========================= */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Thông tin lần làm bài
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                Lần thử
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Lần {result.attemptNumber}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Bắt đầu
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  result.startedAt
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Nộp bài
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  result.submittedAt
                )}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            ANSWER REVIEW
        ========================= */}

        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Chi tiết câu trả lời
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Xem lại đáp án bạn đã chọn và đáp
              án đúng.
            </p>
          </div>

          <div className="space-y-4">
            {result.answers.map(
              (answer, index) => (
                <div
                  key={answer.questionId}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    answer.isCorrect
                      ? 'border-green-200'
                      : 'border-red-200'
                  }`}
                >
                  {/* QUESTION */}

                  <div className="flex gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        answer.isCorrect
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold leading-6 text-slate-900">
                        {answer.questionText}
                      </p>
                    </div>

                    <div
                      className={`shrink-0 text-sm font-semibold ${
                        answer.isCorrect
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {answer.isCorrect
                        ? 'Đúng'
                        : 'Sai'}
                    </div>
                  </div>

                  {/* SELECTED ANSWER */}

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Câu trả lời của bạn
                    </p>

                    <p
                      className={`mt-1 text-sm font-medium ${
                        answer.selectedChoiceText
                          ? 'text-slate-800'
                          : 'italic text-slate-400'
                      }`}
                    >
                      {answer.selectedChoiceText ??
                        'Chưa trả lời'}
                    </p>
                  </div>

                  {/* CORRECT ANSWER */}

                  {!answer.isCorrect && (
                    <div className="mt-3 rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-medium text-green-600">
                        Đáp án đúng
                      </p>

                      <p className="mt-1 text-sm font-medium text-green-700">
                        {answer.correctChoiceText ??
                          'Không có dữ liệu'}
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRetakeQuiz}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Làm lại Quiz
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResultPage;