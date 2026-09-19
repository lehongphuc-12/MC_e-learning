import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuiz } from '../hooks/useQuiz';

 const QuizDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const quizId = id ? Number(id) : null;

  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useQuiz(quizId);

  if (!quizId || Number.isNaN(quizId)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Quiz ID không hợp lệ
          </h2>

          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">
          Đang tải thông tin Quiz...
        </div>
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="text-sm text-slate-500 hover:text-slate-700 mb-2"
              >
                ← Quay lại
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                Chi tiết Quiz
              </h1>
            </div>

            <button
              onClick={() =>
                navigate(`/instructor/quizzes/${quiz.quizId}/edit`)
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Chỉnh sửa Quiz
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Quiz Information */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
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
              className={`px-3 py-1 rounded-full text-sm font-medium ${
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <InfoItem
              label="Quiz ID"
              value={String(quiz.quizId)}
            />

            <InfoItem
              label="Thời gian"
              value={
                quiz.timeLimitMinutes > 0
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
              value={String(quiz.maxAttempts)}
            />
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              label="Course ID"
              value={
                quiz.courseId !== null && quiz.courseId !== undefined
                  ? String(quiz.courseId)
                  : 'Không có'
              }
            />

            <InfoItem
              label="Lesson ID"
              value={
                quiz.lessonId !== null && quiz.lessonId !== undefined
                  ? String(quiz.lessonId)
                  : 'Không có'
              }
            />
          </div>
        </section>

        {/* Questions */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Câu hỏi
            </h2>

            <span className="text-sm text-slate-500">
              {quiz.questions.length} câu hỏi
            </span>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-500">
                Quiz chưa có câu hỏi.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {quiz.questions
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((question, index) => (
                  <QuestionCard
                    key={question.questionId}
                    questionNumber={index + 1}
                    question={question}
                  />
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="text-xs text-slate-500 mb-1">
        {label}
      </div>

      <div className="font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
};

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

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  question,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
            {questionNumber}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {question.questionType}
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              {question.questionText}
            </h3>

            {/* Choices */}
            <div className="mt-4 space-y-2">
              {question.choices
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((choice, index) => (
                  <div
                    key={choice.choiceId}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      choice.isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                        choice.isCorrect
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>

                    <span className="flex-1 text-sm text-slate-800">
                      {choice.choiceText}
                    </span>

                    {choice.isCorrect && (
                      <span className="text-xs font-semibold text-green-700">
                        Đáp án đúng
                      </span>
                    )}
                  </div>
                ))}
            </div>

            {/* Explanation */}
            {question.explanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-xs font-semibold text-blue-700 mb-1">
                  Giải thích
                </div>

                <p className="text-sm text-blue-900">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDetailPage;
export { QuizDetailPage };