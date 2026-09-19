import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCreateQuiz } from '../hooks/useQuiz';
import { QuizQuestionEditor } from '../components/QuizQuestionEditor';

import {
  CreateQuestionRequest,
  CreateQuizRequest,
  QuizStatus,
} from '../types/quizTypes';
import { ToastType } from '../../../components/common/Toast';

interface CreateQuizPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const createEmptyQuestion = (
  orderIndex: number
): CreateQuestionRequest => ({
  questionText: '',
  questionType: 'SINGLE_CHOICE',
  explanation: '',
  orderIndex,
  choices: [
    {
      choiceText: '',
      isCorrect: false,
      orderIndex: 1,
    },
    {
      choiceText: '',
      isCorrect: false,
      orderIndex: 2,
    },
  ],
});

export const CreateQuizPage: React.FC<CreateQuizPageProps> = ({ onToast }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const createQuizMutation = useCreateQuiz();

  // =========================
  // COURSE / LESSON
  // =========================
  const courseIdParam = searchParams.get('courseId');
  const lessonIdParam = searchParams.get('lessonId');

  const courseId = courseIdParam
    ? Number(courseIdParam)
    : null;

  const lessonId = lessonIdParam
    ? Number(lessonIdParam)
    : null;

  // =========================
  // QUIZ SCOPE
  // =========================
  const isLessonQuiz =
    lessonId !== null &&
    Number.isInteger(lessonId) &&
    lessonId > 0;

  const quizScopeTitle = isLessonQuiz
    ? 'Tạo Quiz cho bài học'
    : 'Tạo Quiz tổng khóa học';

  const quizScopeDescription = isLessonQuiz
    ? 'Tạo bài kiểm tra kiến thức cho bài học này.'
    : 'Tạo bài kiểm tra tổng hợp kiến thức của toàn bộ khóa học.';

  // =========================
  // QUIZ INFORMATION
  // =========================
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [timeLimitMinutes, setTimeLimitMinutes] =
    useState(0);

  const [passingScore, setPassingScore] =
    useState(80);

  const [maxAttempts, setMaxAttempts] =
    useState(1);

  const [status, setStatus] =
    useState<QuizStatus>('DRAFT');

  // =========================
  // QUESTIONS
  // =========================
  const [questions, setQuestions] =
    useState<CreateQuestionRequest[]>([
      createEmptyQuestion(1),
    ]);

  // =========================
  // VALIDATION
  // =========================
  const [errorMessage, setErrorMessage] =
    useState('');

  // =========================
  // BACK
  // =========================
  const handleBack = () => {
    navigate(`/instructor/courses/${courseId}`);
  };

  // =========================
  // ADD QUESTION
  // =========================
  const handleAddQuestion = () => {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(
        current.length + 1
      ),
    ]);

    setErrorMessage('');
  };

  // =========================
  // UPDATE QUESTION
  // =========================
  const handleQuestionChange = (
    index: number,
    question: CreateQuestionRequest
  ) => {
    setQuestions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? question
          : item
      )
    );

    setErrorMessage('');
  };

  // =========================
  // REMOVE QUESTION
  // =========================
  const handleRemoveQuestion = (
    index: number
  ) => {
    if (questions.length <= 1) {
      return;
    }

    setQuestions((current) =>
      current
        .filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
        .map((question, itemIndex) => ({
          ...question,
          orderIndex: itemIndex + 1,
        }))
    );

    setErrorMessage('');
  };

  // =========================
  // VALIDATE FORM
  // =========================
  const validateForm = (): string | null => {
    if (
      courseId === null ||
      !Number.isInteger(courseId) ||
      courseId <= 0
    ) {
      return 'Không tìm thấy Course ID hợp lệ.';
    }

    if (!title.trim()) {
      return 'Vui lòng nhập tiêu đề quiz.';
    }

    if (title.trim().length > 255) {
      return 'Tiêu đề quiz không được vượt quá 255 ký tự.';
    }

    if (timeLimitMinutes < 0) {
      return 'Thời gian làm bài không hợp lệ.';
    }

    if (
      passingScore < 0 ||
      passingScore > 100
    ) {
      return 'Điểm đạt phải nằm trong khoảng từ 0 đến 100.';
    }

    if (maxAttempts < 1) {
      return 'Số lần làm bài phải lớn hơn hoặc bằng 1.';
    }

    if (questions.length < 1) {
      return 'Quiz phải có ít nhất một câu hỏi.';
    }

    for (
      let questionIndex = 0;
      questionIndex < questions.length;
      questionIndex++
    ) {
      const question =
        questions[questionIndex];

      const questionNumber =
        questionIndex + 1;

      if (!question.questionText.trim()) {
        return `Vui lòng nhập nội dung câu hỏi ${questionNumber}.`;
      }

      if (question.choices.length < 2) {
        return `Câu hỏi ${questionNumber} phải có ít nhất 2 đáp án.`;
      }

      const hasEmptyChoice =
        question.choices.some(
          (choice) =>
            !choice.choiceText.trim()
        );

      if (hasEmptyChoice) {
        return `Vui lòng nhập đầy đủ đáp án cho câu hỏi ${questionNumber}.`;
      }

      const correctChoices =
        question.choices.filter(
          (choice) => choice.isCorrect
        );

      if (correctChoices.length === 0) {
        return `Vui lòng chọn đáp án đúng cho câu hỏi ${questionNumber}.`;
      }

      if (
        question.questionType !==
          'MULTIPLE_CHOICE' &&
        correctChoices.length > 1
      ) {
        return `Câu hỏi ${questionNumber} chỉ được có một đáp án đúng.`;
      }

      if (
        question.questionType ===
          'MULTIPLE_CHOICE' &&
        correctChoices.length < 1
      ) {
        return `Câu hỏi ${questionNumber} phải có ít nhất một đáp án đúng.`;
      }
    }

    return null;
  };

  // =========================
  // CREATE QUIZ
  // =========================
  const handleCreateQuiz = async () => {
    setErrorMessage('');

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    if (
      courseId === null ||
      !Number.isInteger(courseId)
    ) {
      return;
    }

    const payload: CreateQuizRequest = {
      courseId,

      /*
       * Quiz tổng khóa học:
       * lessonId = null
       *
       * Quiz bài học:
       * lessonId = ID của lesson
       */
      lessonId:
        lessonId !== null &&
        Number.isInteger(lessonId) &&
        lessonId > 0
          ? lessonId
          : null,

      title: title.trim(),

      description:
        description.trim() || null,

      timeLimitMinutes,

      passingScore,

      maxAttempts,

      status,

      questions: questions.map(
        (question, questionIndex) => ({
          ...question,

          questionText:
            question.questionText.trim(),

          explanation:
            question.explanation?.trim() ||
            null,

          orderIndex:
            questionIndex + 1,

          choices:
            question.choices.map(
              (choice, choiceIndex) => ({
                ...choice,

                choiceText:
                  choice.choiceText.trim(),

                orderIndex:
                  choiceIndex + 1,
              })
            ),
        })
      ),
    };

    try {
      const createdQuiz =
        await createQuizMutation.mutateAsync(
          payload
        );

      /*
       * Tạo thành công
       * → quay về trang trước đó (ví dụ: trang quản lý khóa học / bài học)
       */
      onToast?.('Tạo Quiz thành công', 'Bài kiểm tra đã được khởi tạo thành công.', 'success');
      navigate(-1);
    } catch (error) {
      console.error(
        'Create quiz failed:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Không thể tạo quiz. Vui lòng thử lại.';

      setErrorMessage(message);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // =========================
  // INVALID COURSE
  // =========================
  if (
    courseId === null ||
    !Number.isInteger(courseId) ||
    courseId <= 0
  ) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Không thể tạo quiz
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Course ID không hợp lệ hoặc
              chưa được cung cấp.
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =========================
            PAGE HEADER
        ========================= */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            ← Quay lại khóa học
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {quizScopeTitle}
            </h1>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                isLessonQuiz
                  ? 'bg-violet-50 text-violet-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isLessonQuiz
                ? 'Quiz bài học'
                : 'Quiz tổng khóa học'}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {quizScopeDescription}
          </p>
        </div>

        {/* =========================
            ERROR
        ========================= */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mt-0.5 font-bold text-red-500">
              !
            </div>

            <div>
              <p className="text-sm font-semibold text-red-700">
                Không thể tạo quiz
              </p>

              <p className="mt-1 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* =========================
            QUIZ INFORMATION
        ========================= */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Thông tin Quiz
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Thiết lập thông tin cơ bản cho bài
              kiểm tra.
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
                  setTitle(event.target.value)
                }
                placeholder={
                  isLessonQuiz
                    ? 'Ví dụ: Quiz bài học Lễ Vu Quy'
                    : 'Ví dụ: Quiz tổng kết MC Đám Cưới'
                }
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
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder={
                  isLessonQuiz
                    ? 'Nhập mô tả cho bài quiz của bài học...'
                    : 'Nhập mô tả cho bài quiz tổng khóa học...'
                }
                rows={3}
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
                    value={timeLimitMinutes}
                    onChange={(event) =>
                      setTimeLimitMinutes(
                        Math.max(
                          0,
                          Number(
                            event.target.value
                          )
                        )
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-16 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    phút
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  0 = không giới hạn
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
                    value={passingScore}
                    onChange={(event) =>
                      setPassingScore(
                        Number(
                          event.target.value
                        )
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
                  value={maxAttempts}
                  onChange={(event) =>
                    setMaxAttempts(
                      Math.max(
                        1,
                        Number(
                          event.target.value
                        )
                      )
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
                    event.target.value as QuizStatus
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
              >
                <option value="DRAFT">
                  Nháp
                </option>

                <option value="ACTIVE">
                  Đã xuất bản
                </option>

                <option value="ARCHIVED">
                  Lưu trữ
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================
            QUESTIONS
        ========================= */}
        <div className="mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Câu hỏi
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Thêm câu hỏi và thiết lập đáp án
                đúng.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {questions.length} câu hỏi
            </span>
          </div>

          <div className="space-y-5">
            {questions.map(
              (question, index) => (
                <QuizQuestionEditor
                  key={`question-${index}`}
                  question={question}
                  questionNumber={index + 1}
                  onChange={(updatedQuestion) =>
                    handleQuestionChange(
                      index,
                      updatedQuestion
                    )
                  }
                  onRemove={() =>
                    handleRemoveQuestion(
                      index
                    )
                  }
                  canRemove={
                    questions.length > 1
                  }
                />
              )
            )}
          </div>

          {/* ADD QUESTION */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="mt-5 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
          >
            + Thêm câu hỏi
          </button>
        </div>

        {/* =========================
            ACTIONS
        ========================= */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

          {/* CANCEL */}
          <button
            type="button"
            onClick={handleBack}
            disabled={
              createQuizMutation.isPending
            }
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>

          {/* CREATE */}
          <button
            type="button"
            onClick={handleCreateQuiz}
            disabled={
              createQuizMutation.isPending
            }
            className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isLessonQuiz
                ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {createQuizMutation.isPending
              ? 'Đang tạo quiz...'
              : isLessonQuiz
                ? 'Tạo Quiz bài học'
                : 'Tạo Quiz tổng khóa học'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizPage;