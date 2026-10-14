import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { useCreateQuiz } from '../hooks/useQuiz';
import { QuizQuestionEditor } from '../components/QuizQuestionEditor';
import {
  CreateQuestionRequest,
  CreateQuizRequest,
  QuestionType,
  QuizStatus,
} from '../types/quizTypes';
import { ToastType } from '../../../components/common/Toast';

interface CreateQuizPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const CHOICE_TYPES: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'LISTEN_IDENTIFY_ERROR',
  'AUDIO_COMPARISON',
  'LISTEN_CLASSIFY',
];

const createEmptyQuestion = (orderIndex: number): CreateQuestionRequest => ({
  questionText: '',
  questionType: 'SINGLE_CHOICE',
  instruction: null,
  explanation: null,
  points: 1,
  isRequired: true,
  orderIndex,
  choices: [
    { choiceText: '', optionValue: null, isCorrect: false, explanation: null, orderIndex: 1 },
    { choiceText: '', optionValue: null, isCorrect: false, explanation: null, orderIndex: 2 },
  ],
  media: [],
  errorRegions: [],
  annotations: [],
  arrangeItems: [],
  writingConfig: null,
  scenarioNodes: [],
});

const hasAudio = (question: CreateQuestionRequest) =>
  (question.media ?? []).some(
    (media: any) =>
      media.mediaType === 'AUDIO' &&
      typeof media.mediaUrl === 'string' &&
      media.mediaUrl.trim() !== ''
  );

const validateChoices = (
  question: CreateQuestionRequest,
  questionNumber: number
): string | null => {
  const choices = question.choices ?? [];

  if (choices.length < 2) {
    return `Câu ${questionNumber}: phải có ít nhất 2 đáp án.`;
  }

  if (choices.some((choice) => !choice.choiceText.trim())) {
    return `Câu ${questionNumber}: nội dung các đáp án không được để trống.`;
  }

  const correctCount = choices.filter((choice) => choice.isCorrect).length;

  if (question.questionType === 'MULTIPLE_CHOICE') {
    if (correctCount < 1) {
      return `Câu ${questionNumber}: phải có ít nhất 1 đáp án đúng.`;
    }
    return null;
  }

  if (correctCount !== 1) {
    return `Câu ${questionNumber}: phải có đúng 1 đáp án đúng.`;
  }

  return null;
};

const validateQuestion = (
  question: CreateQuestionRequest,
  index: number
): string | null => {
  const number = index + 1;

  if (!question.questionText.trim()) {
    return `Câu ${number}: nội dung câu hỏi không được để trống.`;
  }

  if ((question.points ?? 0) <= 0) {
    return `Câu ${number}: điểm phải lớn hơn 0.`;
  }

  if (CHOICE_TYPES.includes(question.questionType)) {
    const choiceError = validateChoices(question, number);
    if (choiceError) return choiceError;
  }

  switch (question.questionType) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return null;

    case 'TRUE_FALSE': {
      if (question.choices.length !== 2) {
        return `Câu ${number}: dạng Đúng/Sai phải có đúng 2 đáp án.`;
      }
      return null;
    }

    case 'FILL_BLANK': {
      const correctAnswers = (question.choices ?? []).filter(
        (choice) =>
          choice.isCorrect &&
          !!(choice.optionValue?.trim() || choice.choiceText.trim())
      );

      if (correctAnswers.length < 1) {
        return `Câu ${number}: phải nhập ít nhất 1 đáp án đúng cho ô trống.`;
      }
      return null;
    }

    case 'LISTEN_IDENTIFY_ERROR': {
      if (!hasAudio(question)) {
        return `Câu ${number}: Listen & Identify Error phải có audio.`;
      }
      return null;
    }

    case 'LISTEN_LOCATE_ERROR': {
      if (!hasAudio(question)) {
        return `Câu ${number}: Listen & Locate Error phải có audio.`;
      }

      const regions = question.errorRegions ?? [];

      if (regions.length < 1) {
        return `Câu ${number}: phải có ít nhất 1 vùng lỗi trên timeline.`;
      }

      for (let i = 0; i < regions.length; i++) {
        const region: any = regions[i];

        if (
          region.startTimeMs < 0 ||
          region.endTimeMs <= region.startTimeMs
        ) {
          return `Câu ${number}: vùng lỗi ${i + 1} có thời gian không hợp lệ.`;
        }

        if (!region.errorCategory?.trim()) {
          return `Câu ${number}: vùng lỗi ${i + 1} chưa có nhóm lỗi.`;
        }

        if (!region.errorCode?.trim()) {
          return `Câu ${number}: vùng lỗi ${i + 1} chưa có mã lỗi.`;
        }
      }

      return null;
    }

    case 'AUDIO_COMPARISON': {
      const audioCount = (question.media ?? []).filter(
        (media: any) =>
          media.mediaType === 'AUDIO' &&
          typeof media.mediaUrl === 'string' &&
          media.mediaUrl.trim() !== ''
      ).length;

      if (audioCount < 2) {
        return `Câu ${number}: Audio Comparison phải có ít nhất 2 audio.`;
      }

      return null;
    }

    case 'LISTEN_CLASSIFY': {
      if (!hasAudio(question)) {
        return `Câu ${number}: Listen & Classify phải có audio.`;
      }
      return null;
    }

    case 'SCRIPT_ANNOTATION': {
      const annotations = question.annotations ?? [];

      if (annotations.length < 1) {
        return `Câu ${number}: Script Annotation phải có ít nhất 1 annotation.`;
      }

      for (let i = 0; i < annotations.length; i++) {
        const annotation: any = annotations[i];

        if (
          annotation.startIndex < 0 ||
          annotation.endIndex <= annotation.startIndex
        ) {
          return `Câu ${number}: annotation ${i + 1} có vị trí không hợp lệ.`;
        }

        if ((annotation.points ?? 0) <= 0) {
          return `Câu ${number}: điểm annotation ${i + 1} phải lớn hơn 0.`;
        }
      }

      return null;
    }

    case 'SCRIPT_WRITING': {
      const config: any = question.writingConfig;

      if (!config) {
        return `Câu ${number}: Script Writing chưa có cấu hình bài viết.`;
      }

      if (
        config.minWords != null &&
        config.maxWords != null &&
        config.minWords > config.maxWords
      ) {
        return `Câu ${number}: số từ tối thiểu không được lớn hơn số từ tối đa.`;
      }

      if (config.minWords != null && config.minWords < 0) {
        return `Câu ${number}: số từ tối thiểu không hợp lệ.`;
      }

      if (config.maxWords != null && config.maxWords < 0) {
        return `Câu ${number}: số từ tối đa không hợp lệ.`;
      }

      return null;
    }

    case 'ARRANGE_SCRIPT': {
      const items: any[] = question.arrangeItems ?? [];

      if (items.length < 2) {
        return `Câu ${number}: Arrange Script phải có ít nhất 2 đoạn.`;
      }

      if (items.some((item) => !item.content?.trim())) {
        return `Câu ${number}: nội dung các đoạn sắp xếp không được để trống.`;
      }

      const normalItems = items.filter((item) => !item.isDistractor);

      if (normalItems.length < 2) {
        return `Câu ${number}: Arrange Script phải có ít nhất 2 đoạn không phải distractor.`;
      }

      const orders = normalItems.map((item) => item.correctOrder);

      if (
        orders.some(
          (order) =>
            order == null ||
            !Number.isInteger(Number(order)) ||
            Number(order) <= 0
        )
      ) {
        return `Câu ${number}: thứ tự đúng của các đoạn không hợp lệ.`;
      }

      if (new Set(orders.map(Number)).size !== orders.length) {
        return `Câu ${number}: thứ tự đúng của các đoạn không được trùng nhau.`;
      }

      return null;
    }

    case 'ERROR_CORRECTION_LAB': {
      const regions: any[] = question.errorRegions ?? [];

      if (regions.length < 1) {
        return `Câu ${number}: Error Correction Lab phải có ít nhất 1 lỗi.`;
      }

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];

        if (
          region.startTimeMs < 0 ||
          region.endTimeMs <= region.startTimeMs
        ) {
          return `Câu ${number}: lỗi ${i + 1} có khoảng thời gian không hợp lệ.`;
        }

        if (!region.errorCategory?.trim()) {
          return `Câu ${number}: lỗi ${i + 1} chưa có nhóm lỗi.`;
        }

        if (!region.errorCode?.trim()) {
          return `Câu ${number}: lỗi ${i + 1} chưa có mã lỗi.`;
        }

        if ((region.points ?? 0) <= 0) {
          return `Câu ${number}: điểm của lỗi ${i + 1} phải lớn hơn 0.`;
        }
      }

      if ((question.choices ?? []).length > 0) {
        const choiceError = validateChoices(question, number);
        if (choiceError) return choiceError;
      }

      return null;
    }

    case 'SCENARIO_DECISION_TREE': {
      const nodes: any[] = question.scenarioNodes ?? [];

      if (nodes.length < 2) {
        return `Câu ${number}: Scenario phải có ít nhất 2 node.`;
      }

      const keys = nodes.map((node) => node.clientKey?.trim());

      if (keys.some((key) => !key)) {
        return `Câu ${number}: tất cả scenario node phải có Client Key.`;
      }

      if (new Set(keys).size !== keys.length) {
        return `Câu ${number}: Client Key của scenario node không được trùng nhau.`;
      }

      const startNodes = nodes.filter((node) => node.isStartNode);

      if (startNodes.length !== 1) {
        return `Câu ${number}: Scenario phải có đúng 1 Start Node.`;
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!node.content?.trim()) {
          return `Câu ${number}: node ${i + 1} chưa có nội dung.`;
        }

        if (!node.isEndNode) {
          const choices: any[] = node.choices ?? [];

          if (choices.length < 1) {
            return `Câu ${number}: node ${i + 1} chưa phải End Node nên phải có ít nhất 1 lựa chọn.`;
          }

          for (let j = 0; j < choices.length; j++) {
            const choice = choices[j];

            if (!choice.choiceText?.trim()) {
              return `Câu ${number}: lựa chọn ${j + 1} của node ${i + 1} chưa có nội dung.`;
            }

            if (
              !choice.nextNodeClientKey ||
              !keys.includes(choice.nextNodeClientKey)
            ) {
              return `Câu ${number}: lựa chọn ${j + 1} của node ${i + 1} chưa trỏ tới node hợp lệ.`;
            }
          }
        }
      }

      return null;
    }

    case 'ESSAY':
      return null;

    default:
      return `Câu ${number}: dạng câu hỏi không hợp lệ.`;
  }
};

const normalizeQuestion = (
  question: CreateQuestionRequest,
  questionIndex: number
): CreateQuestionRequest => ({
  ...question,
  questionText: question.questionText.trim(),
  instruction: question.instruction?.trim() || null,
  explanation: question.explanation?.trim() || null,
  points: question.points ?? 1,
  isRequired: question.isRequired ?? true,
  orderIndex: questionIndex + 1,

  choices: (question.choices ?? []).map((choice, choiceIndex) => ({
    ...choice,
    choiceText: choice.choiceText.trim(),
    optionValue: choice.optionValue?.trim() || null,
    explanation: choice.explanation?.trim() || null,
    orderIndex: choiceIndex + 1,
  })),

  media: (question.media ?? []).map((media: any, mediaIndex: number) => ({
    ...media,
    mediaUrl: media.mediaUrl?.trim() ?? '',
    label: media.label?.trim() || null,
    orderIndex: mediaIndex + 1,
  })),

  errorRegions: (question.errorRegions ?? []).map((region: any) => ({
    ...region,
    errorCategory: region.errorCategory?.trim() ?? '',
    errorCode: region.errorCode?.trim() ?? '',
    description: region.description?.trim() || null,
    correctionText: region.correctionText?.trim() || null,
  })),

  annotations: (question.annotations ?? []).map((annotation: any) => ({
    ...annotation,
    annotationValue: annotation.annotationValue?.trim() || null,
    explanation: annotation.explanation?.trim() || null,
  })),

  arrangeItems: (question.arrangeItems ?? []).map((item: any) => ({
    ...item,
    content: item.content?.trim() ?? '',
    correctOrder: item.isDistractor ? null : item.correctOrder,
  })),

  writingConfig: question.writingConfig
    ? {
        ...question.writingConfig,
        eventType: question.writingConfig.eventType?.trim() || null,
        audience: question.writingConfig.audience?.trim() || null,
        style: question.writingConfig.style?.trim() || null,
        requiredElementsJson:
          question.writingConfig.requiredElementsJson?.trim() || null,
        gradingRubricJson:
          question.writingConfig.gradingRubricJson?.trim() || null,
      }
    : null,

  scenarioNodes: (question.scenarioNodes ?? []).map(
    (node: any) => ({
      ...node,
      clientKey: node.clientKey?.trim() ?? '',
      title: node.title?.trim() || null,
      content: node.content?.trim() ?? '',
      mediaUrl: node.mediaUrl?.trim() || null,
      choices: (node.choices ?? []).map(
        (choice: any, choiceIndex: number) => ({
          ...choice,
          choiceText: choice.choiceText?.trim() ?? '',
          nextNodeClientKey:
            choice.nextNodeClientKey?.trim() || null,
          feedback: choice.feedback?.trim() || null,
          orderIndex: choiceIndex + 1,
        })
      ),
    })
  ),
});

export const CreateQuizPage: React.FC<CreateQuizPageProps> = ({
  onToast,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createQuizMutation = useCreateQuiz();

  const courseIdParam = searchParams.get('courseId');
  const lessonIdParam = searchParams.get('lessonId');

  const courseId = courseIdParam ? Number(courseIdParam) : null;
  const lessonId = lessonIdParam ? Number(lessonIdParam) : null;

  const isValidCourseId =
    courseId !== null &&
    Number.isInteger(courseId) &&
    courseId > 0;

  const isLessonQuiz =
    lessonId !== null &&
    Number.isInteger(lessonId) &&
    lessonId > 0;

  const quizScopeTitle = isLessonQuiz
    ? 'Tạo Quiz cho bài học'
    : 'Tạo Quiz tổng khóa học';

  const quizScopeDescription = isLessonQuiz
    ? 'Tạo bài kiểm tra và bài tập tương tác cho bài học này.'
    : 'Tạo bài kiểm tra tổng hợp kiến thức của toàn bộ khóa học.';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [passingScore, setPassingScore] = useState(80);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [status, setStatus] = useState<QuizStatus>('DRAFT');
  const [questions, setQuestions] = useState<CreateQuestionRequest[]>([
    createEmptyQuestion(1),
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBack = () => {
    if (isValidCourseId) {
      navigate(`/instructor/courses/${courseId}`);
      return;
    }
    navigate(-1);
  };

  const handleAddQuestion = () => {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(current.length + 1),
    ]);
    setErrorMessage('');
  };

  const handleQuestionChange = (
    index: number,
    updatedQuestion: CreateQuestionRequest
  ) => {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index ? updatedQuestion : question
      )
    );
    setErrorMessage('');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((current) =>
      current
        .filter((_, i) => i !== index)
        .map((question, i) => ({
          ...question,
          orderIndex: i + 1,
        }))
    );
    setErrorMessage('');
  };

  const validateForm = (): string | null => {
    if (!isValidCourseId) {
      return 'Course ID không hợp lệ.';
    }

    if (!title.trim()) {
      return 'Vui lòng nhập tên Quiz.';
    }

    if (timeLimitMinutes < 0) {
      return 'Thời gian làm bài không được nhỏ hơn 0.';
    }

    if (
      !Number.isFinite(passingScore) ||
      passingScore < 0 ||
      passingScore > 100
    ) {
      return 'Điểm đạt phải nằm trong khoảng từ 0 đến 100.';
    }

    if (
      !Number.isInteger(maxAttempts) ||
      maxAttempts <= 0
    ) {
      return 'Số lần làm bài phải là số nguyên lớn hơn 0.';
    }

    if (questions.length === 0) {
      return 'Quiz phải có ít nhất 1 câu hỏi.';
    }

    for (let i = 0; i < questions.length; i++) {
      const error = validateQuestion(questions[i], i);
      if (error) return error;
    }

    return null;
  };

  const handleCreateQuiz = async () => {
    setErrorMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isValidCourseId || courseId === null) return;

    const payload: CreateQuizRequest = {
      courseId,
      lessonId: isLessonQuiz ? lessonId : null,
      title: title.trim(),
      description: description.trim() || null,
      timeLimitMinutes,
      passingScore,
      maxAttempts,
      status,
      questions: questions.map(normalizeQuestion),
    };

    try {
      await createQuizMutation.mutateAsync(payload);

      onToast?.(
        'Tạo Quiz thành công',
        'Bài kiểm tra đã được khởi tạo thành công.',
        'success'
      );

      navigate(-1);
    } catch (error) {
      console.error('Create quiz failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Không thể tạo quiz. Vui lòng thử lại.';

      setErrorMessage(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isValidCourseId) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Không thể tạo quiz
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Course ID không hợp lệ hoặc chưa được cung cấp.
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Quiz Management
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                {quizScopeTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                {quizScopeDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateQuiz}
              disabled={createQuizMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {createQuizMutation.isPending
                ? 'Đang tạo...'
                : 'Tạo Quiz'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Thông tin Quiz
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Thiết lập thông tin chung trước khi thêm các dạng bài tập.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className={labelClass}>Tên Quiz *</span>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Ví dụ: Luyện tập kỹ năng dẫn chương trình"
                className={inputClass}
              />
            </label>

            <label className="md:col-span-2">
              <span className={labelClass}>Mô tả</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Mô tả nội dung và mục tiêu của Quiz..."
                className={`${inputClass} resize-none`}
              />
            </label>

            <label>
              <span className={labelClass}>
                Thời gian làm bài (phút)
              </span>
              <input
                type="number"
                min={0}
                value={timeLimitMinutes}
                onChange={(e) =>
                  setTimeLimitMinutes(
                    Math.max(0, Number(e.target.value))
                  )
                }
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-slate-400">
                0 = không giới hạn thời gian.
              </span>
            </label>

            <label>
              <span className={labelClass}>Điểm đạt (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) =>
                  setPassingScore(Number(e.target.value))
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Số lần được làm</span>
              <input
                type="number"
                min={1}
                step={1}
                value={maxAttempts}
                onChange={(e) =>
                  setMaxAttempts(Number(e.target.value))
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Trạng thái</span>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as QuizStatus)
                }
                className={inputClass}
              >
                <option value="DRAFT">Nháp</option>
                <option value="ACTIVE">Đã xuất bản</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Câu hỏi & bài tập
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quiz hiện có {questions.length} câu hỏi/bài tập.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
              Thêm câu hỏi
            </button>
          </div>

          <div className="space-y-5">
            {questions.map((question, index) => (
              <QuizQuestionEditor
                key={index}
                question={question}
                questionNumber={index + 1}
                onChange={(updatedQuestion) =>
                  handleQuestionChange(index, updatedQuestion)
                }
                onRemove={() => handleRemoveQuestion(index)}
                canRemove={questions.length > 1}
              />
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleBack}
            disabled={createQuizMutation.isPending}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleCreateQuiz}
            disabled={createQuizMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {createQuizMutation.isPending
              ? 'Đang tạo...'
              : 'Tạo Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass =
  'mb-1.5 block text-xs font-bold text-slate-600';

export default CreateQuizPage;