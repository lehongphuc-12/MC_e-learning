import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, CalendarClock, ClipboardList, Clock3, Target, RotateCcw, FileQuestion, CheckCircle2, Mic2, Sparkles, ShieldCheck } from 'lucide-react';
import { useCreateQuiz } from '../hooks/useQuiz';
import { QuizQuestionEditor } from '../components/QuizQuestionEditor';
import { CreateQuestionRequest, CreateQuizRequest, QuestionType, QuizStatus } from '../types/quizTypes';
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
const hasAudioOrYouTubeVideo = (question: CreateQuestionRequest): boolean =>
  (question.media ?? []).some((media) => {
    const type = String(media.mediaType ?? '').toUpperCase();
    const url = String(media.mediaUrl ?? '').trim();
    if (!url) return false;
    if (type === 'AUDIO') return true;
    if (type !== 'VIDEO') return false;
    if (/^https:\/\/res\.cloudinary\.com\//i.test(url)) return true;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.split('/').filter(Boolean);
      const validId = (id: string | null | undefined) => !!id && /^[a-zA-Z0-9\_-]{11}$/.test(id);
      if (host === 'youtu.be' || host === 'www.youtu.be') return validId(path[0]);
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        if (path[0] === 'watch') return validId(parsed.searchParams.get('v'));
        if (['embed', 'shorts', 'live'].includes(path[0])) return validId(path[1]);
      }
      return false;
    } catch {
      return false;
    }
  });
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
      if (!hasAudioOrYouTubeVideo(question)) {
        return `Câu ${number}: Listen & Identify Error phải có audio, video tải lên hoặc video YouTube hợp lệ.`;
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
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
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
    if (availableFrom && Number.isNaN(new Date(availableFrom).getTime())) return 'Ngày giờ bắt đầu không hợp lệ.';
    if (availableUntil && Number.isNaN(new Date(availableUntil).getTime())) return 'Ngày giờ kết thúc không hợp lệ.';
    if (availableFrom && availableUntil && new Date(availableUntil).getTime() <= new Date(availableFrom).getTime()) return 'Ngày giờ kết thúc phải sau ngày giờ bắt đầu.';
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
      availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
      availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
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
    return <div className="min-h-[60vh] bg-[#E5EEFC] px-4 py-12"><div className="mx-auto max-w-xl rounded-3xl border border-[#C7D9F3] bg-white p-8 text-center shadow-lg"><h1 className="text-xl font-extrabold text-[#102B59]">Không thể tạo Quiz</h1><p className="mt-2 text-sm text-[#627798]">Course ID không hợp lệ hoặc chưa được cung cấp.</p><button type="button" onClick={() => navigate(-1)} className="mt-6 rounded-xl bg-[#145CE3] px-5 py-2.5 font-bold text-white transition hover:bg-[#0C46BA]">Quay lại</button></div></div>;
  }
  const totalPoints = questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const statusLabel = status === 'DRAFT' ? 'Bản nháp' : status === 'ACTIVE' ? 'Đã xuất bản' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Lưu trữ';
  return (
    <div className="mseek-quiz-create relative min-h-screen overflow-hidden bg-[#DFEAFB] text-[#102B59]">
      <style>{`
        @keyframes mseekRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mseekWave { 0%,100% { transform: scaleY(.5); opacity: .55; } 50% { transform: scaleY(1); opacity: 1; } }
        @keyframes mseekGlow { 0%,100% { opacity: .35; transform: translate3d(0,0,0); } 50% { opacity: .6; transform: translate3d(-16px,12px,0); } }
        .mseek-quiz-create .mseek-enter { animation: mseekRise .65s cubic-bezier(.2,.8,.2,1) both; }
        .mseek-quiz-create .mseek-delay-1 { animation-delay: .08s; }
        .mseek-quiz-create .mseek-delay-2 { animation-delay: .16s; }
        .mseek-quiz-create .mseek-delay-3 { animation-delay: .24s; }
        .mseek-quiz-create .mseek-delay-4 { animation-delay: .32s; }
        .mseek-quiz-create .mseek-wave { transform-origin: center; animation: mseekWave 1.6s ease-in-out infinite; }
        .mseek-quiz-create .mseek-glow { animation: mseekGlow 9s ease-in-out infinite; }
        .mseek-quiz-create .mseek-card { transition: box-shadow .3s ease, border-color .3s ease; }
        .mseek-quiz-create .mseek-card:hover { border-color: #A9C7F0; box-shadow: 0 18px 38px -24px rgba(13,57,117,.35); }
        .mseek-quiz-create button { transition: transform .2s ease, background-color .2s ease, box-shadow .2s ease, opacity .2s ease; }
        .mseek-quiz-create button:not(:disabled):active { transform: scale(.98); }
        @media (prefers-reduced-motion: reduce) { .mseek-quiz-create .mseek-enter, .mseek-quiz-create .mseek-wave, .mseek-quiz-create .mseek-glow { animation: none !important; } .mseek-quiz-create *, .mseek-quiz-create *::before, .mseek-quiz-create *::after { transition-duration: .01ms !important; } }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-[#C8DCF9] via-[#D7E6FB] to-transparent" />
      <div className="pointer-events-none mseek-glow absolute -right-28 top-28 h-80 w-80 rounded-full bg-[#8DB8FA]/25 blur-3xl" />
      <div className="relative mx-auto max-w-[1380px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mseek-enter relative mb-5 overflow-hidden rounded-[26px] border border-[#1D58B8] bg-[#0C326D] px-5 py-6 shadow-[0_18px_45px_-20px_rgba(12,50,109,0.5)] sm:px-8 sm:py-7" style={{background:'linear-gradient(112deg,#092855 0%,#12488F 60%,#1D63C5 100%)'}}>
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[32px] border-white/[0.05]" />
          <div className="pointer-events-none absolute right-16 top-10 hidden items-end gap-1 opacity-30 md:flex">{[20,40,28,60,36,78,48,26,54,30,70,38,22].map((h,i)=><span key={i} className="mseek-wave w-1.5 rounded-full bg-[#8CC7FF]" style={{height:h,animationDelay:`${i*0.11}s`}} />)}</div>
          <button type="button" onClick={handleBack} className="relative mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Quay lại</button>
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9EC9FF]"><Sparkles className="h-3.5 w-3.5 text-[#FFD16D]" /> MSEEK Academy / Quiz Management</p><h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[32px]">{quizScopeTitle}</h1><p className="mt-2 text-sm leading-relaxed text-[#D1E5FF]">{quizScopeDescription}</p><div className="mt-4 flex gap-1.5"><span className="h-1 w-10 rounded-full bg-[#FFD166]"/><span className="h-1 w-6 rounded-full bg-[#7BC4FF]"/><span className="h-1 w-4 rounded-full bg-[#58D5A2]"/></div></div>
            <button type="button" onClick={handleCreateQuiz} disabled={createQuizMutation.isPending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFD166] px-6 py-3 text-sm font-extrabold text-[#123465] shadow-[0_7px_22px_rgba(255,209,102,0.25)] transition hover:-translate-y-0.5 hover:bg-[#FFDA85] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{createQuizMutation.isPending?'Đang tạo...':'Tạo Quiz'}</button>
          </div>
        </div>
        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div>}
        <div className="mseek-enter mseek-delay-1 mb-5 grid gap-3 rounded-2xl border border-[#C7D9F3] bg-white/90 p-3 shadow-[0_8px_25px_-18px_rgba(13,57,117,0.35)] sm:grid-cols-3">
          {[{n:'01',name:'Thông tin chung',desc:'Thiết lập Quiz',active:true},{n:'02',name:'Thêm câu hỏi',desc:'Biên soạn nội dung',active:false},{n:'03',name:'Kiểm tra & tạo',desc:'Hoàn tất Quiz',active:false}].map(step=><div key={step.n} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${step.active?'bg-[#E9F1FF]':'bg-[#F7F9FE]'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${step.active?'bg-[#1764E9] text-white':'bg-[#E5ECF7] text-[#7890B4]'}`}>{step.n}</span><div><p className={`text-sm font-bold ${step.active?'text-[#10356E]':'text-[#63799B]'}`}>{step.name}</p><p className="text-[11px] text-[#7C90AC]">{step.desc}</p></div></div>)}
        </div>
        <div className="mseek-enter mseek-delay-2 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_315px]">
          <main className="min-w-0 space-y-5">
            <section className="mseek-card rounded-[22px] border border-[#C9D9EF] bg-white p-5 shadow-[0_10px_35px_-22px_rgba(15,56,113,0.35)] sm:p-6">
              <div className="mb-6 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F1FF] text-[#1764E9]"><ClipboardList className="h-5 w-5"/></span><div><h2 className="text-lg font-extrabold text-[#102B59]">Thông tin Quiz</h2><p className="text-xs text-[#7488A7]">Thiết lập các thông tin cơ bản của bài kiểm tra.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className={labelClass}>Tên Quiz <span className="text-red-500">*</span></span><input value={title} onChange={e=>{setTitle(e.target.value);setErrorMessage('');}} placeholder="Ví dụ: Luyện tập kỹ năng dẫn chương trình" className={inputClass}/></label>
                <label className="sm:col-span-2"><span className={labelClass}>Mô tả</span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Mô tả nội dung và mục tiêu của Quiz..." className={`${inputClass} resize-none`}/></label>
                <label><span className={labelClass}>Trạng thái</span><select value={status} onChange={e=>setStatus(e.target.value as QuizStatus)} className={inputClass}><option value="DRAFT">Nháp</option><option value="ACTIVE">Đã xuất bản</option><option value="INACTIVE">Ngừng hoạt động</option><option value="ARCHIVED">Lưu trữ</option></select></label>
                <label><span className={labelClass}>Thời gian làm bài (phút)</span><input type="number" min={0} value={timeLimitMinutes} onChange={e=>setTimeLimitMinutes(Math.max(0,Number(e.target.value)))} className={inputClass}/><span className="mt-1 block text-[11px] text-[#8494AB]">0 = không giới hạn thời gian.</span></label>
                <label><span className={labelClass}>Điểm đạt (%)</span><input type="number" min={0} max={100} value={passingScore} onChange={e=>setPassingScore(Number(e.target.value))} className={inputClass}/></label>
                <label><span className={labelClass}>Số lần được làm</span><input type="number" min={1} step={1} value={maxAttempts} onChange={e=>setMaxAttempts(Number(e.target.value))} className={inputClass}/></label>
                <div className="sm:col-span-2 rounded-2xl border border-[#BDD5F6] bg-[#EDF5FF] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2 text-[#174987]"><CalendarClock className="h-5 w-5"/><h3 className="text-sm font-extrabold">Lịch mở và đóng Quiz</h3></div><div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Ngày và giờ bắt đầu</span><input type="datetime-local" value={availableFrom} onChange={e=>{setAvailableFrom(e.target.value);setErrorMessage('');}} className={inputClass}/></label><label><span className={labelClass}>Ngày và giờ kết thúc</span><input type="datetime-local" min={availableFrom||undefined} value={availableUntil} onChange={e=>{setAvailableUntil(e.target.value);setErrorMessage('');}} className={inputClass}/></label></div><p className="mt-3 text-xs text-[#607DA4]">Để trống nếu không giới hạn. Giờ theo thiết bị, lưu UTC.</p></div>
              </div>
            </section>
            <section className="mseek-card rounded-[22px] border border-[#C9D9EF] bg-white p-5 shadow-[0_10px_35px_-22px_rgba(15,56,113,0.35)] sm:p-6"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F1FF] text-[#1764E9]"><FileQuestion className="h-5 w-5"/></span><div><h2 className="text-lg font-extrabold">Câu hỏi & bài tập</h2><p className="text-xs text-[#7488A7]">Quiz hiện có {questions.length} câu hỏi/bài tập.</p></div></div><button type="button" onClick={handleAddQuestion} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1764E9] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#104DBB]"><Plus className="h-4 w-4"/>Thêm câu hỏi</button></div><div className="space-y-4">{questions.map((question,index)=><QuizQuestionEditor key={index} question={question} questionNumber={index+1} onChange={updatedQuestion=>handleQuestionChange(index,updatedQuestion)} onRemove={()=>handleRemoveQuestion(index)} canRemove={questions.length>1}/>)}</div></section>
            <div className="flex flex-col-reverse gap-3 border-t border-[#BDD1EB] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={handleBack} disabled={createQuizMutation.isPending} className="rounded-xl border border-[#B9CDEA] bg-white px-6 py-3 text-sm font-bold text-[#37567F] transition hover:bg-[#F2F7FF] disabled:opacity-60">Hủy</button><button type="button" onClick={handleCreateQuiz} disabled={createQuizMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1764E9] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#104DBB] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4"/>{createQuizMutation.isPending?'Đang tạo...':'Tạo Quiz'}</button></div>
          </main>
          <aside className="space-y-4 lg:sticky lg:top-5"><section className="mseek-card rounded-[22px] border border-[#C9D9EF] bg-white p-4 shadow-[0_10px_35px_-22px_rgba(15,56,113,0.35)]"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F1FF] text-[#1764E9]"><Target className="h-5 w-5"/></span><div><h3 className="font-extrabold">Tổng quan Quiz</h3><p className="text-xs text-[#7488A7]">Dữ liệu đang biên soạn</p></div></div><div className="grid grid-cols-2 gap-2.5"><div className="rounded-xl border border-[#DFE9F8] bg-[#F6F9FF] p-3"><FileQuestion className="mb-2 h-5 w-5 text-[#1764E9]"/><p className="text-xl font-black">{questions.length}</p><p className="text-[11px] text-[#7488A7]">Tổng câu hỏi</p></div><div className="rounded-xl border border-[#F7E6BB] bg-[#FFF9E9] p-3"><Target className="mb-2 h-5 w-5 text-[#D59A18]"/><p className="text-xl font-black">{totalPoints}</p><p className="text-[11px] text-[#937A42]">Tổng điểm</p></div><div className="rounded-xl border border-[#D9EEE7] bg-[#F1FBF7] p-3"><Clock3 className="mb-2 h-5 w-5 text-[#1B9D72]"/><p className="text-lg font-black">{timeLimitMinutes===0?'∞':`${timeLimitMinutes} phút`}</p><p className="text-[11px] text-[#658D7E]">Thời gian</p></div><div className="rounded-xl border border-[#DFE9F8] bg-[#F6F9FF] p-3"><CheckCircle2 className="mb-2 h-5 w-5 text-[#1764E9]"/><p className="text-sm font-black">{statusLabel}</p><p className="text-[11px] text-[#7488A7]">Trạng thái</p></div></div></section>
            <section className="mseek-card rounded-[22px] border border-[#F1DCA9] bg-[#FFF8E7] p-4"><div className="mb-3 flex items-center gap-2 font-extrabold text-[#986A0E]"><Sparkles className="h-5 w-5"/>Mẹo tạo Quiz hiệu quả</div><div className="space-y-3 text-xs leading-relaxed text-[#785F2F]"><p>• Đặt tên Quiz rõ ràng, dễ hiểu.</p><p>• Kết hợp nhiều dạng câu hỏi.</p><p>• Kiểm tra thời gian và điểm đạt trước khi tạo.</p><p>• Đảm bảo nội dung phù hợp với mục tiêu luyện giọng MC.</p></div></section>
            <section className="mseek-card rounded-[22px] border border-[#C8DAF3] bg-[#EAF3FF] p-4"><div className="flex items-start gap-3"><Mic2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1764E9]"/><div><h3 className="text-sm font-extrabold text-[#153F7B]">MSEEK Voice Academy</h3><p className="mt-1.5 text-xs leading-relaxed text-[#607DA4]">Biên soạn bài tập luyện giọng, nghe và xử lý tình huống cho học viên MC.</p></div></div></section>
          </aside>
        </div>
      </div>
    </div>
  );
};
const inputClass = 'w-full rounded-xl border border-[#C7D7EC] bg-[#FAFCFF] px-3.5 py-3 text-sm text-[#17345F] outline-none transition placeholder:text-[#91A3BE] focus:border-[#2771EE] focus:bg-white focus:ring-4 focus:ring-[#DCEAFF]';
const labelClass = 'mb-1.5 block text-xs font-bold text-[#244572]';
export default CreateQuizPage;
