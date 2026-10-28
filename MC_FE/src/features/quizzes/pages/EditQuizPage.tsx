import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, CalendarClock, Mic2, ClipboardList, Clock3, Target, FileQuestion, CheckCircle2, Sparkles, Lightbulb, Headphones, ShieldCheck, ChevronDown, ChevronUp, Copy, Trash2, GripVertical, AlertCircle, Loader2 } from 'lucide-react';
import { useQuiz, useUpdateQuiz } from '../hooks/useQuiz';
import { QuizQuestionEditor } from '../components/QuizQuestionEditor';
import { CreateQuestionRequest, QuestionDto, QuestionType, QuizStatus, UpdateChoiceRequest, UpdateQuestionRequest, UpdateQuizRequest } from '../types/quizTypes';
import { ToastType } from '../../../components/common/Toast';
interface EditQuizPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}
interface QuestionIdentity {
  questionId: number;
  choiceIds: number[];
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
const mapQuestionDtoToForm = (question: QuestionDto): CreateQuestionRequest => ({
  questionText: question.questionText ?? '',
  questionType: question.questionType,
  instruction: question.instruction ?? null,
  explanation: question.explanation ?? null,
  points: question.points ?? 1,
  isRequired: question.isRequired ?? true,
  orderIndex: question.orderIndex,
  choices: (question.choices ?? []).map((choice) => ({
    choiceText: choice.choiceText ?? '',
    optionValue: choice.optionValue ?? null,
    isCorrect: choice.isCorrect ?? false,
    explanation: choice.explanation ?? null,
    orderIndex: choice.orderIndex,
  })),
  media: (question.media ?? []).map((media) => ({ ...media })),
  errorRegions: (question.errorRegions ?? []).map((region) => ({ ...region })),
  annotations: (question.annotations ?? []).map((annotation) => ({ ...annotation })),
  arrangeItems: (question.arrangeItems ?? []).map((item) => ({ ...item })),
  writingConfig: question.writingConfig ? { ...question.writingConfig } : null,
  scenarioNodes: (question.scenarioNodes ?? []).map((node) => ({
    ...node,
    choices: (node.choices ?? []).map((choice) => ({ ...choice })),
  })),
});
const getQuestionIdentity = (question: QuestionDto): QuestionIdentity => ({
  questionId: question.questionId,
  choiceIds: (question.choices ?? []).map((choice) => choice.choiceId),
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
      const validId = (id: string | null | undefined) => !!id && /^[a-zA-Z0-9_-]{11}$/.test(id);
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
  number: number
): string | null => {
  const choices = question.choices ?? [];
  if (choices.length < 2) {
    return `Câu ${number}: phải có ít nhất 2 đáp án.`;
  }
  if (choices.some((choice) => !choice.choiceText.trim())) {
    return `Câu ${number}: nội dung các đáp án không được để trống.`;
  }
  const correctCount = choices.filter((choice) => choice.isCorrect).length;
  if (question.questionType === 'MULTIPLE_CHOICE') {
    if (correctCount < 1) {
      return `Câu ${number}: phải có ít nhất 1 đáp án đúng.`;
    }
    return null;
  }
  if (correctCount !== 1) {
    return `Câu ${number}: phải có đúng 1 đáp án đúng.`;
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
    case 'TRUE_FALSE':
      if ((question.choices ?? []).length !== 2) {
        return `Câu ${number}: dạng Đúng/Sai phải có đúng 2 đáp án.`;
      }
      return null;
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
    case 'LISTEN_IDENTIFY_ERROR':
      if (!hasAudioOrYouTubeVideo(question)) {
        return `Câu ${number}: Listen & Identify Error phải có audio, video tải lên hoặc video YouTube hợp lệ.`;
      }
      return null;
    case 'LISTEN_LOCATE_ERROR': {
      if (!hasAudio(question)) {
        return `Câu ${number}: Listen & Locate Error phải có audio.`;
      }
      const regions: any[] = question.errorRegions ?? [];
      if (regions.length < 1) {
        return `Câu ${number}: phải có ít nhất 1 vùng lỗi trên timeline.`;
      }
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        if (region.startTimeMs < 0 || region.endTimeMs <= region.startTimeMs) {
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
    case 'LISTEN_CLASSIFY':
      if (!hasAudio(question)) {
        return `Câu ${number}: Listen & Classify phải có audio.`;
      }
      return null;
    case 'SCRIPT_ANNOTATION': {
      const annotations: any[] = question.annotations ?? [];
      if (annotations.length < 1) {
        return `Câu ${number}: Script Annotation phải có ít nhất 1 annotation.`;
      }
      for (let i = 0; i < annotations.length; i++) {
        const annotation = annotations[i];
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
        if (region.startTimeMs < 0 || region.endTimeMs <= region.startTimeMs) {
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
        return `Câu ${number}: tất cả Scenario Node phải có Client Key.`;
      }
      if (new Set(keys).size !== keys.length) {
        return `Câu ${number}: Client Key của Scenario Node không được trùng nhau.`;
      }
      if (nodes.filter((node) => node.isStartNode).length !== 1) {
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
  scenarioNodes: (question.scenarioNodes ?? []).map((node: any) => ({
    ...node,
    clientKey: node.clientKey?.trim() ?? '',
    title: node.title?.trim() || null,
    content: node.content?.trim() ?? '',
    mediaUrl: node.mediaUrl?.trim() || null,
    choices: (node.choices ?? []).map(
      (choice: any, choiceIndex: number) => ({
        ...choice,
        choiceText: choice.choiceText?.trim() ?? '',
        nextNodeClientKey: choice.nextNodeClientKey?.trim() || null,
        feedback: choice.feedback?.trim() || null,
        orderIndex: choiceIndex + 1,
      })
    ),
  })),
});
const toLocalDateTimeInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
export const EditQuizPage: React.FC<EditQuizPageProps> = ({ onToast }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const parsedQuizId = id ? Number(id) : null;
  const validQuizId =
    parsedQuizId !== null &&
    Number.isInteger(parsedQuizId) &&
    parsedQuizId > 0
      ? parsedQuizId
      : null;
  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useQuiz(validQuizId);
  const updateQuizMutation = useUpdateQuiz();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [passingScore, setPassingScore] = useState(80);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [status, setStatus] = useState<QuizStatus>('DRAFT');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [questions, setQuestions] = useState<CreateQuestionRequest[]>([]);
  const [identities, setIdentities] = useState<QuestionIdentity[]>([]);
  const [initializedQuizId, setInitializedQuizId] = useState<number | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  useEffect(() => {
    if (!quiz || initializedQuizId === quiz.quizId) return;
    setTitle(quiz.title ?? '');
    setDescription(quiz.description ?? '');
    setTimeLimitMinutes(quiz.timeLimitMinutes ?? 0);
    setPassingScore(quiz.passingScore ?? 80);
    setMaxAttempts(quiz.maxAttempts ?? 1);
    setStatus(quiz.status ?? 'DRAFT');
    setAvailableFrom(toLocalDateTimeInput(quiz.availableFrom));
    setAvailableUntil(toLocalDateTimeInput(quiz.availableUntil));
    const sortedQuestions = [...(quiz.questions ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    setQuestions(sortedQuestions.map(mapQuestionDtoToForm));
    setIdentities(sortedQuestions.map(getQuestionIdentity));
    setInitializedQuizId(quiz.quizId);
  }, [quiz, initializedQuizId]);
  const handleAddQuestion = () => {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(current.length + 1),
    ]);
    setIdentities((current) => [
      ...current,
      { questionId: 0, choiceIds: [0, 0] },
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
    setIdentities((current) =>
      current.map((identity, i) => {
        if (i !== index) return identity;
        const choiceIds = updatedQuestion.choices.map(
          (_, choiceIndex) => identity.choiceIds[choiceIndex] ?? 0
        );
        return { ...identity, choiceIds };
      })
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
    setIdentities((current) =>
      current.filter((_, i) => i !== index)
    );
    setErrorMessage('');
  };
  const toggleQuestion = (index: number) => setExpandedQuestions(current => current.includes(index) ? current.filter(i => i !== index) : [...current, index]);
  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions(current => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next.map((q, i) => ({ ...q, orderIndex: i + 1 })); });
    setIdentities(current => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
    setExpandedQuestions(current => current.map(i => i === index ? target : i === target ? index : i));
  };
  const handleDuplicateQuestion = (index: number) => {
    const original = questions[index];
    const duplicate: CreateQuestionRequest = { ...original, choices: original.choices.map(c => ({ ...c })), media: (original.media ?? []).map(m => ({ ...m })), errorRegions: (original.errorRegions ?? []).map(r => ({ ...r })), annotations: (original.annotations ?? []).map(a => ({ ...a })), arrangeItems: (original.arrangeItems ?? []).map(a => ({ ...a })), writingConfig: original.writingConfig ? { ...original.writingConfig } : null, scenarioNodes: (original.scenarioNodes ?? []).map((n: NonNullable<CreateQuestionRequest['scenarioNodes']>[number]) => ({ ...n, choices: (n.choices ?? []).map((c: NonNullable<typeof n.choices>[number]) => ({ ...c })) })) };
    setQuestions(current => { const next = [...current]; next.splice(index + 1, 0, duplicate); return next.map((q, i) => ({ ...q, orderIndex: i + 1 })); });
    setIdentities(current => { const next = [...current]; next.splice(index + 1, 0, { questionId: 0, choiceIds: duplicate.choices.map(() => 0) }); return next; });
    setExpandedQuestions(current => [...current.map(i => i > index ? i + 1 : i), index + 1]);
    setErrorMessage('');
  };
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', ACTIVE: 'Đã xuất bản', INACTIVE: 'Ngừng hoạt động', ARCHIVED: 'Lưu trữ' };
  const handleAddAndExpand = () => { setExpandedQuestions(current => [...current, questions.length]); handleAddQuestion(); };
  const handleRemoveAndCollapse = (index: number) => { handleRemoveQuestion(index); setExpandedQuestions(current => current.filter(i => i !== index).map(i => i > index ? i - 1 : i)); };
  const validateForm = (): string | null => {
    if (availableFrom && Number.isNaN(new Date(availableFrom).getTime())) return 'Ngày giờ bắt đầu không hợp lệ.';
    if (availableUntil && Number.isNaN(new Date(availableUntil).getTime())) return 'Ngày giờ kết thúc không hợp lệ.';
    if (availableFrom && availableUntil && new Date(availableUntil).getTime() <= new Date(availableFrom).getTime()) return 'Ngày giờ kết thúc phải sau ngày giờ bắt đầu.';
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
    if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
      return 'Số lần làm bài phải là số nguyên lớn hơn 0.';
    }
    if (questions.length === 0) {
      return 'Quiz phải có ít nhất 1 câu hỏi.';
    }
    for (let i = 0; i < questions.length; i++) {
      const questionError = validateQuestion(questions[i], i);
      if (questionError) return questionError;
    }
    return null;
  };
  const handleUpdateQuiz = async () => {
    setErrorMessage('');
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (validQuizId === null) {
      setErrorMessage('Quiz ID không hợp lệ.');
      return;
    }
    const normalizedQuestions = questions.map(normalizeQuestion);
    const updateQuestions: UpdateQuestionRequest[] =
      normalizedQuestions.map((question, questionIndex) => {
        const identity = identities[questionIndex] ?? {
          questionId: 0,
          choiceIds: [],
        };
        const choices: UpdateChoiceRequest[] = question.choices.map(
          (choice, choiceIndex) => ({
            ...choice,
            choiceId: identity.choiceIds[choiceIndex] ?? 0,
          })
        );
        return {
          ...question,
          questionId: identity.questionId,
          choices,
        };
      });
    const payload: UpdateQuizRequest = {
      title: title.trim(),
      description: description.trim() || null,
      timeLimitMinutes,
      passingScore,
      maxAttempts,
      status,
      availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
      availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
      questions: updateQuestions,
    };
    try {
      await updateQuizMutation.mutateAsync({
        quizId: validQuizId,
        data: payload,
      });
      onToast?.(
        'Cập nhật thành công',
        'Bài kiểm tra đã được cập nhật thành công.',
        'success'
      );
      navigate(-1);
    } catch (err) {
      console.error('Update quiz failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật quiz. Vui lòng thử lại.';
      setErrorMessage(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  if (validQuizId === null) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Không thể chỉnh sửa Quiz
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quiz ID không hợp lệ hoặc chưa được cung cấp.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Đang tải Quiz...
          </p>
        </div>
      </div>
    );
  }
  if (isError || !quiz) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Không thể tải Quiz
          </h1>
          <p className="mt-2 text-sm text-red-500">
            {error instanceof Error
              ? error.message
              : 'Quiz không tồn tại hoặc không thể tải dữ liệu.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#eaf2fd] pb-12 text-[#10265b]">
      <style>{`@keyframes eq-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes eq-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}@keyframes eq-glow{0%,100%{opacity:.45;transform:translateX(0)}50%{opacity:.8;transform:translateX(15px)}}.eq-rise{animation:eq-rise .55s ease both}.eq-card{transition:box-shadow .25s ease,transform .25s ease}.eq-card:hover{box-shadow:0 14px 36px rgba(31,89,167,.09)}.eq-wave span{display:block;width:3px;border-radius:6px;background:#70c6ff;animation:eq-wave 1.3s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.eq-rise,.eq-wave span{animation:none!important}.eq-card{transition:none!important}}`}</style>
      <header className="relative overflow-hidden bg-gradient-to-r from-[#071c50] via-[#0752ba] to-[#092c76] text-white">
        <div className="pointer-events-none absolute -right-16 -top-32 h-96 w-[650px] rounded-full border-[70px] border-blue-400/10 rotate-[-18deg]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-[650px] rounded-[100%] bg-blue-400/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1460px] items-center justify-between gap-6 px-5 pb-12 pt-5 sm:px-8 lg:px-10">
          <div className="eq-rise relative z-10 max-w-3xl">
            <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Quay lại</button>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-blue-100">Quiz Management / Chỉnh sửa Quiz</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Chỉnh sửa Quiz</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/90">Cập nhật thông tin, chỉnh sửa câu hỏi và thiết lập cấu hình phù hợp với mục tiêu bài học.</p>
            <div className="mt-4 flex items-center gap-2"><span className="h-1.5 w-14 rounded-full bg-amber-300" /><span className="h-1.5 w-8 rounded-full bg-sky-300" /><span className="h-1.5 w-6 rounded-full bg-emerald-300" /></div>
            <p className="mt-3 text-xs text-blue-100/80">Quiz #{quiz.quizId} · {quiz.lessonId ? `Lesson #${quiz.lessonId}` : 'Quiz tổng khóa học'}</p>
          </div>
          <div className="pointer-events-none hidden items-center gap-5 lg:flex">
            <div className="eq-wave flex h-20 items-center gap-1">{Array.from({length:19}, (_,i) => <span key={i} style={{height:`${14+(i*17%55)}px`,animationDelay:`${i*.09}s`}} />)}</div>
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-sky-300/25 bg-white/10 shadow-[0_0_65px_rgba(80,185,255,.25)]"><Mic2 className="h-20 w-20 text-sky-100 drop-shadow-lg" /><Sparkles className="absolute -right-2 top-1 h-6 w-6 text-amber-200" /></div>
          </div>
        </div>
      </header>
      <div className="relative z-10 mx-auto -mt-6 max-w-[1460px] px-4 sm:px-7 lg:px-9">
        {errorMessage && <div role="alert" className="eq-rise mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{errorMessage}</div>}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
          <main className="min-w-0 space-y-4">
            <section className="eq-rise eq-card rounded-[22px] border border-[#dce8fa] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><ClipboardList className="h-6 w-6" /></div><div><h2 className="text-base font-extrabold">Thông tin Quiz</h2><p className="text-xs text-slate-500">Cập nhật các thông tin cơ bản của bài kiểm tra.</p></div></div>
              <div className="grid gap-x-5 gap-y-4 md:grid-cols-[minmax(0,1fr)_230px]">
                <label className="block"><span className={labelClass}>Tên Quiz <span className="text-red-500">*</span></span><input value={title} onChange={e => {setTitle(e.target.value);setErrorMessage('');}} className={inputClass} placeholder="Nhập tên bài kiểm tra" /></label>
                <label className="block"><span className={labelClass}>Trạng thái</span><select value={status} onChange={e => setStatus(e.target.value as QuizStatus)} className={inputClass}><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đã xuất bản</option><option value="INACTIVE">Ngừng hoạt động</option><option value="ARCHIVED">Lưu trữ</option></select></label>
                <label className="block"><span className={labelClass}>Mô tả</span><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Mô tả nội dung bài kiểm tra" /></label>
                <label className="block"><span className={labelClass}>Thời gian làm bài (phút)</span><input type="number" min={0} value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(Math.max(0,Number(e.target.value)))} className={inputClass} /><span className="mt-1 block text-[11px] text-slate-400">0 = không giới hạn thời gian.</span></label>
                <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
                  <label><span className={labelClass}>Thời gian mở</span><input type="datetime-local" value={availableFrom} onChange={e => {setAvailableFrom(e.target.value);setErrorMessage('');}} className={inputClass} /></label>
                  <label><span className={labelClass}>Thời gian đóng</span><input type="datetime-local" min={availableFrom || undefined} value={availableUntil} onChange={e => {setAvailableUntil(e.target.value);setErrorMessage('');}} className={inputClass} /></label>
                </div>
                <div className="md:col-span-2 grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Điểm đạt (%)</span><input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className={inputClass} /></label><label><span className={labelClass}>Số lần được làm</span><input type="number" min={1} step={1} value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className={inputClass} /></label></div>
                <p className="md:col-span-2 -mt-1 flex items-center gap-2 text-[11px] text-slate-400"><CalendarClock className="h-3.5 w-3.5" /> Để trống lịch nếu không giới hạn. Thời gian nhập theo thiết bị và lưu dưới dạng UTC.</p>
              </div>
            </section>
            <section className="eq-rise eq-card rounded-[22px] border border-[#dce8fa] bg-white p-5 shadow-sm sm:p-6" style={{animationDelay:'.08s'}}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><FileQuestion className="h-6 w-6" /></div><div><h2 className="text-base font-extrabold">Danh sách câu hỏi</h2><p className="text-xs text-slate-500">{questions.length} câu hỏi · Mở từng câu để chỉnh sửa nội dung.</p></div></div><button type="button" onClick={handleAddAndExpand} className="inline-flex items-center gap-2 rounded-xl bg-[#0865f6] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm câu hỏi</button></div>
              <div className="space-y-3">
                {questions.map((question,index) => { const expanded = expandedQuestions.includes(index); return <div key={`${identities[index]?.questionId ?? 0}-${index}`} className="overflow-hidden rounded-xl border border-[#dbe6f6] bg-white transition hover:border-blue-200 hover:shadow-sm">
                  <div className="flex items-start gap-2 px-3 py-3 sm:px-4"><GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-extrabold">Câu {index+1}</span><span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{question.questionType.replaceAll('_',' ')}</span><span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">{question.points ?? 0} điểm</span>{question.isRequired && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Bắt buộc</span>}</div><p className="mt-1.5 truncate text-xs text-slate-600">{question.questionText || 'Câu hỏi chưa có nội dung'}</p></div>
                    <div className="flex shrink-0 items-center gap-1"><button type="button" title="Di chuyển lên" disabled={index===0} onClick={() => handleMoveQuestion(index,-1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button type="button" title="Di chuyển xuống" disabled={index===questions.length-1} onClick={() => handleMoveQuestion(index,1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button><button type="button" title="Nhân bản câu hỏi" onClick={() => handleDuplicateQuestion(index)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-blue-50"><Copy className="h-4 w-4" /></button><button type="button" title={expanded?'Thu gọn':'Chỉnh sửa'} onClick={() => toggleQuestion(index)} className="rounded-lg border border-blue-200 p-1.5 text-blue-600 hover:bg-blue-50">{expanded?<ChevronUp className="h-4 w-4" />:<ChevronDown className="h-4 w-4" />}</button><button type="button" title="Xóa câu hỏi" disabled={questions.length<=1} onClick={() => handleRemoveAndCollapse(index)} className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>
                  </div>
                  {expanded && <div className="border-t border-[#e6edf9] bg-[#f8fbff] p-3 sm:p-4"><QuizQuestionEditor question={question} questionNumber={index+1} onChange={updated => handleQuestionChange(index,updated)} onRemove={() => handleRemoveAndCollapse(index)} canRemove={questions.length>1} /></div>}
                </div>; })}
              </div>
            </section>
            <div className="flex flex-wrap justify-end gap-3 pb-6"><button type="button" disabled={updateQuizMutation.isPending} onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Hủy</button><button type="button" disabled={updateQuizMutation.isPending} onClick={handleUpdateQuiz} className="inline-flex items-center gap-2 rounded-xl bg-[#0865f6] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60">{updateQuizMutation.isPending?<Loader2 className="h-4 w-4 animate-spin" />:<Save className="h-4 w-4" />}{updateQuizMutation.isPending?'Đang lưu...':'Lưu thay đổi'}</button></div>
          </main>
          <aside className="space-y-4 xl:sticky xl:top-5">
            <section className="eq-rise eq-card rounded-[22px] border border-[#dce8fa] bg-white p-5 shadow-sm" style={{animationDelay:'.1s'}}><div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Target className="h-6 w-6" /></div><div><h2 className="text-base font-extrabold">Tổng quan Quiz</h2><p className="text-xs text-slate-500">Thông tin và thống kê nhanh</p></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-blue-50 bg-[#f5f9ff] p-3"><FileQuestion className="mb-2 h-5 w-5 text-blue-600" /><strong className="block text-lg font-black">{questions.length}</strong><span className="text-[11px] text-slate-500">Tổng câu hỏi</span></div><div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"><Sparkles className="mb-2 h-5 w-5 text-amber-500" /><strong className="block text-lg font-black">{totalPoints}</strong><span className="text-[11px] text-slate-500">Tổng điểm</span></div><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><Clock3 className="mb-2 h-5 w-5 text-emerald-600" /><strong className="block text-lg font-black">{timeLimitMinutes || '∞'}</strong><span className="text-[11px] text-slate-500">{timeLimitMinutes?'Phút làm bài':'Không giới hạn'}</span></div><div className="rounded-xl border border-blue-50 bg-[#f7f7ff] p-3"><ShieldCheck className="mb-2 h-5 w-5 text-blue-600" /><strong className="block truncate text-sm font-extrabold">{statusLabel[status] || status}</strong><span className="text-[11px] text-slate-500">Trạng thái</span></div></div><div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-500">Điểm đạt</span><span className="font-extrabold text-blue-700">{passingScore}%</span></div></section>
            <section className="eq-rise rounded-[22px] border border-amber-100 bg-[#fff9ed] p-5" style={{animationDelay:'.16s'}}><h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-800"><Lightbulb className="h-5 w-5 text-amber-500" /> Mẹo chỉnh sửa hiệu quả</h3><div className="mt-4 space-y-3">{['Kiểm tra nội dung câu hỏi trước khi lưu','Đảm bảo đáp án đúng cho mỗi câu hỏi','Cung cấp hướng dẫn chi tiết cho học viên','Thiết lập thời gian phù hợp','Kiểm tra lại Quiz sau khi cập nhật'].map(item => <div key={item} className="flex items-start gap-2 text-xs leading-5 text-[#25406b]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />{item}</div>)}</div></section>
            <section className="eq-rise rounded-[22px] border border-blue-100 bg-[#eff6ff] p-5" style={{animationDelay:'.22s'}}><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-100 p-3 text-blue-600"><Headphones className="h-6 w-6" /></div><div><h3 className="text-sm font-extrabold">Cần hỗ trợ?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Mở từng câu hỏi để sử dụng đầy đủ bộ công cụ chỉnh sửa nội dung, âm thanh và đáp án.</p></div></div></section>
          </aside>
        </div>
      </div>
    </div>
  );
};
const inputClass = 'w-full rounded-xl border border-[#d5e1f2] bg-white px-3.5 py-2.5 text-sm text-[#18305c] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400';
const labelClass = 'mb-1.5 block text-xs font-bold text-[#18305c]';
export default EditQuizPage;
