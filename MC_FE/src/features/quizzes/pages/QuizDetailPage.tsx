import React from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useQuiz } from '../hooks/useQuiz';

interface QuizNavigationState {
  returnTo?: string;
}

const QuizDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams<{
    id: string;
  }>();

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
  // BACK
  // ============================================================

  /**
   * Ưu tiên returnTo được truyền từ trang trước.
   *
   * Ví dụ:
   *
   * CourseLessons#quiz-management
   *        ↓
   * QuizDetail
   *
   * returnTo:
   * /instructor/courses/{courseId}/lessons#quiz-management
   *
   * Nếu không có returnTo nhưng đã load được Quiz,
   * sử dụng courseId của Quiz để quay về đúng Course.
   *
   * Cuối cùng fallback về danh sách Course.
   */
  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, {
        replace: true,
      });

      return;
    }

    if (
      quiz?.courseId !== null &&
      quiz?.courseId !== undefined &&
      Number.isInteger(quiz.courseId) &&
      quiz.courseId > 0
    ) {
      navigate(
        `/instructor/courses/${quiz.courseId}/lessons#quiz-management`,
        {
          replace: true,
        }
      );

      return;
    }

    navigate('/instructor/courses', {
      replace: true,
    });
  };

  // ============================================================
  // EDIT QUIZ
  // ============================================================

  /**
   * Khi đi từ Detail -> Edit,
   * tiếp tục truyền returnTo.
   *
   * Nhờ vậy:
   *
   * CourseLessons
   *      ↓
   * QuizDetail
   *      ↓
   * UpdateQuiz
   *      ↓
   * QuizDetail
   *      ↓
   * CourseLessons
   *
   * vẫn giữ đúng nguồn ban đầu.
   */
  const handleEditQuiz = () => {
    if (!quiz) {
      return;
    }

    const fallbackReturnTo =
      quiz.courseId !== null &&
      quiz.courseId !== undefined &&
      Number.isInteger(quiz.courseId) &&
      quiz.courseId > 0
        ? `/instructor/courses/${quiz.courseId}/lessons#quiz-management`
        : undefined;

    navigate(
      `/instructor/quizzes/${quiz.quizId}/edit`,
      {
        state: {
          returnTo:
            returnTo ??
            fallbackReturnTo,
        },
      }
    );
  };

  // ============================================================
  // INVALID QUIZ ID
  // ============================================================

  if (validQuizId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Quiz ID không hợp lệ
          </h2>

          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">
          Đang tải thông tin Quiz...
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (isError || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Không thể tải Quiz
          </h2>

          <p className="mt-2 text-slate-500">
            {error instanceof Error
              ? error.message
              : 'Quiz không tồn tại hoặc đã xảy ra lỗi.'}
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="mb-2 text-sm text-slate-500 transition hover:text-slate-700"
              >
                ← Quay lại
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                Chi tiết Quiz
              </h1>
            </div>

            <button
              type="button"
              onClick={handleEditQuiz}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              Chỉnh sửa Quiz
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-6xl px-6 py-8">

        {/* ====================================================
            QUIZ INFORMATION
        ==================================================== */}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {quiz.title}
              </h2>

              {quiz.description && (
                <p className="mt-2 text-slate-600">
                  {quiz.description}
                </p>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                quiz.status === 'PUBLISHED'
                  ? 'bg-green-50 text-green-700'
                  : quiz.status === 'ARCHIVED'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              {quiz.status}
            </span>
          </div>

          {/* MAIN INFORMATION */}

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoItem
              label="Quiz ID"
              value={String(
                quiz.quizId
              )}
            />

            <InfoItem
              label="Thời gian"
              value={
                quiz.timeLimitMinutes >
                0
                  ? `${quiz.timeLimitMinutes} phút`
                  : 'Không giới hạn'
              }
            />

            <InfoItem
              label="Điểm đạt"
              value={`${quiz.passingScore}%`}
            />

            <InfoItem
              label="Số lần làm tối đa"
              value={String(
                quiz.maxAttempts
              )}
            />
          </div>

          {/* COURSE / LESSON */}

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
            <InfoItem
              label="Course ID"
              value={
                quiz.courseId !== null &&
                quiz.courseId !==
                  undefined
                  ? String(
                      quiz.courseId
                    )
                  : 'Không có'
              }
            />

            <InfoItem
              label="Lesson ID"
              value={
                quiz.lessonId !== null &&
                quiz.lessonId !==
                  undefined
                  ? String(
                      quiz.lessonId
                    )
                  : 'Không có'
              }
            />
          </div>
        </section>

        {/* ====================================================
            QUESTIONS
        ==================================================== */}

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Câu hỏi
            </h2>

            <span className="text-sm text-slate-500">
              {quiz.questions.length}{' '}
              câu hỏi
            </span>
          </div>

          {quiz.questions.length ===
          0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">
                Quiz chưa có câu hỏi.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {[...quiz.questions]
                .sort(
                  (a, b) =>
                    a.orderIndex -
                    b.orderIndex
                )
                .map(
                  (
                    question,
                    index
                  ) => (
                    <QuestionCard
                      key={
                        question.questionId
                      }
                      questionNumber={
                        index + 1
                      }
                      question={
                        question
                      }
                    />
                  )
                )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// ============================================================
// INFO ITEM
// ============================================================

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: React.FC<
  InfoItemProps
> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-1 text-xs text-slate-500">
        {label}
      </div>

      <div className="font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
};

// ============================================================
// QUESTION CARD
// ============================================================

interface QuestionCardProps {
  questionNumber: number;

  question: {
    questionId: number;
    questionText: string;
    questionType: string;
    explanation?: string | null;

    choices: {
      choiceId: number;
      choiceText: string;
      isCorrect?: boolean;
      orderIndex: number;
    }[];
  };
}

const QuestionCard: React.FC<
  QuestionCardProps
> = ({
  questionNumber,
  question,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-start gap-4">

          {/* QUESTION NUMBER */}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
            {questionNumber}
          </div>

          <div className="flex-1">

            {/* QUESTION TYPE */}

            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {question.questionType}
              </span>
            </div>

            {/* QUESTION TEXT */}

            <h3 className="text-base font-semibold text-slate-900">
              {question.questionText}
            </h3>

            {/* ==================================================
                CHOICES
            ================================================== */}

            <div className="mt-4 space-y-2">
              {[...question.choices]
                .sort(
                  (a, b) =>
                    a.orderIndex -
                    b.orderIndex
                )
                .map(
                  (
                    choice,
                    index
                  ) => (
                    <div
                      key={
                        choice.choiceId
                      }
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        choice.isCorrect
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                          choice.isCorrect
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(
                          65 +
                            index
                        )}
                      </div>

                      <span className="flex-1 text-sm text-slate-800">
                        {
                          choice.choiceText
                        }
                      </span>

                      {choice.isCorrect && (
                        <span className="text-xs font-semibold text-green-700">
                          Đáp án đúng
                        </span>
                      )}
                    </div>
                  )
                )}
            </div>

            {/* ==================================================
                EXPLANATION
            ================================================== */}

            {question.explanation && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4">
                <div className="mb-1 text-xs font-semibold text-blue-700">
                  Giải thích
                </div>

                <p className="text-sm text-blue-900">
                  {
                    question.explanation
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { QuizDetailPage };