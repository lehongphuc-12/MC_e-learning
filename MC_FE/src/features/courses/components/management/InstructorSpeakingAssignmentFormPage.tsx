import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Mic2,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  Layers,
  Edit3,
  Eye,
  Save,
  Trash2,
  Music,
  Play,
  Pause,
  Plus,
  Loader2,
  BookOpen,
  FolderOpen,
  ArrowLeft,
  Scale,
  Wand2,
  Info,
  Check,
  ShieldCheck,
  Volume2,
  CheckCircle,
  Lock,
  Headphones,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { speakingApi } from '../../api/speakingApi';
import { courseApi } from '../../api/courseApi';
import { moduleApi } from '../../api/moduleApi';
import { lessonApi } from '../../api/lessonApi';
import {
  SpeakingLevel,
  SpeakingScope,
  ParsePreviewDto,
  SpeakingScriptDto,
  BackgroundMusicDto,
  SaveRubricCriterionDto,
  getSpeakingScopeInfo,
} from '../../types/speakingTypes';
import { ToastType } from '../../../../components/common/Toast';
import type { CourseModule } from '../../types/moduleTypes';
import type { Lesson } from '../../types/lessonTypes';

interface InstructorSpeakingAssignmentFormPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const cardClass = 'rounded-[20px] border border-blue-100 bg-white p-6 shadow-[0_4px_22px_rgba(30,58,138,0.055)] transition-all';

const TEMPLATE_MARKDOWN = `# KỊCH BẢN LUYỆN NÓI MẪU (3 CẤP ĐỘ)

## [LEVEL: BEGINNER]
[HƯỚNG DẪN: Đứng thẳng, hai tay thả lỏng tự nhiên, ánh mắt hướng về khán giả, mỉm cười nhẹ nhàng]
Kính thưa quý vị quan khách!
[GIỌNG ĐỌC: Tone trầm ấm, trang trọng, tốc độ vừa phải]
Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
[NGẮT NGHỈ: 2 giây]
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
[HƯỚNG DẪN: Nghiêng đầu nhẹ, nở nụ cười ấm áp]
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.

## [LEVEL: INTERMEDIATE]
Kính thưa quý vị quan khách!
[GIỌNG ĐỌC: Tone trầm ấm, trang trọng, tốc độ vừa phải]
Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
[GIỌNG ĐỌC: Nâng cao tông giọng ở câu cuối, tạo sự hào hứng]
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.

## [LEVEL: ADVANCED]
Kính thưa quý vị quan khách! Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.
`;

// Danh sách 3 tiêu chí bắt buộc
const MANDATORY_CRITERIA: SaveRubricCriterionDto[] = [
  { code: 'C01', name: 'Phát âm & thanh điệu', weightPercentage: 18, isMandatory: true, orderIndex: 1 },
  { code: 'C02', name: 'Độ rõ lời', weightPercentage: 10, isMandatory: true, orderIndex: 2 },
  { code: 'C03', name: 'Độ chính xác nội dung', weightPercentage: 7, isMandatory: true, orderIndex: 3 },
];

// Danh sách tiêu chí đề xuất gợi ý
const SUGGESTED_CRITERIA: SaveRubricCriterionDto[] = [
  { code: 'C04', name: 'Hơi thở & cột hơi', weightPercentage: 10, isMandatory: false, orderIndex: 4 },
  { code: 'C05', name: 'Tốc độ & độ trôi chảy', weightPercentage: 12, isMandatory: false, orderIndex: 5 },
  { code: 'C06', name: 'Ngắt nghỉ & nhịp điệu', weightPercentage: 10, isMandatory: false, orderIndex: 6 },
  { code: 'C07', name: 'Ngữ điệu & nhấn giọng', weightPercentage: 13, isMandatory: false, orderIndex: 7 },
  { code: 'C08', name: 'Âm lượng & độ ổn định', weightPercentage: 5, isMandatory: false, orderIndex: 8 },
  { code: 'C09', name: 'Chất lượng/chất giọng', weightPercentage: 5, isMandatory: false, orderIndex: 9 },
];

export const InstructorSpeakingAssignmentFormPage: React.FC<InstructorSpeakingAssignmentFormPageProps> = ({
  onToast,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);

  // Core Form States
  const [scope, setScope] = useState<SpeakingScope>(
    (searchParams.get('scope') as SpeakingScope) || 'FINAL'
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number>(
    searchParams.get('courseId') ? Number(searchParams.get('courseId')) : 0
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [scriptType, setScriptType] = useState<'Scripted' | 'OpenPrompt'>('Scripted');
  const [promptContent, setPromptContent] = useState('');
  const [structureHints, setStructureHints] = useState('');
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number | ''>('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [passingScore, setPassingScore] = useState<number>(80);
  const [originalContent, setOriginalContent] = useState('');
  const [selectedBackgroundMusicId, setSelectedBackgroundMusicId] = useState<number | null>(null);

  // Course Hierarchy Options
  const [availableCourses, setAvailableCourses] = useState<{ courseId: number; title: string }[]>([]);
  const [availableModules, setAvailableModules] = useState<CourseModule[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);

  // Script Levels States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<SpeakingLevel>('BEGINNER');
  const [editableContents, setEditableContents] = useState<Record<SpeakingLevel, string>>({
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  });
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Background Music States
  const [musics, setMusics] = useState<BackgroundMusicDto[]>([]);
  const [isLoadingMusics, setIsLoadingMusics] = useState<boolean>(false);
  const [previewPlayingId, setPreviewPlayingId] = useState<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [uploadMusicTitle, setUploadMusicTitle] = useState<string>('');
  const [uploadMusicFile, setUploadMusicFile] = useState<File | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState<boolean>(false);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);

  // Rubric Criteria States
  const [criteria, setCriteria] = useState<SaveRubricCriterionDto[]>([...MANDATORY_CRITERIA]);
  const [customCriterionCode, setCustomCriterionCode] = useState('');
  const [customCriterionName, setCustomCriterionName] = useState('');
  const [customCriterionWeight, setCustomCriterionWeight] = useState<number>(10);
  const [showAddCustomCriterion, setShowAddCustomCriterion] = useState(false);

  // Instructor Guidance & Sample Audio States
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [sampleAudioFile, setSampleAudioFile] = useState<File | null>(null);
  const [sampleAudioPreviewUrl, setSampleAudioPreviewUrl] = useState<string | null>(null);
  const [instructorNote, setInstructorNote] = useState<string>('');
  const [isUploadingSampleAudio, setIsUploadingSampleAudio] = useState<boolean>(false);
  const sampleAudioInputRef = useRef<HTMLInputElement | null>(null);

  // Tính toán động tổng trọng số %
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);
  }, [criteria]);

  // Khóa thêm tiêu chí khi tổng trọng số >= 100%
  const isMaxWeightReached = totalWeight >= 100;

  // Load danh sách khóa học của giảng viên
  const loadCourses = useCallback(async () => {
    try {
      const res = await courseApi.getInstructorCourses({ page: 1, limit: 100 });
      const list = (res.data ?? []).map((c) => ({ courseId: c.courseId, title: c.title }));
      setAvailableCourses(list);
      return list;
    } catch (err) {
      console.error('Error fetching courses:', err);
      return [];
    }
  }, []);

  // Fetch Hierarchy (Modules & Lessons) theo CourseId
  const loadHierarchyForCourse = useCallback(async (courseId: number) => {
    if (!courseId) return;
    setIsLoadingHierarchy(true);
    try {
      const [mods, less] = await Promise.all([
        moduleApi.getModulesByCourseId(courseId).catch(() => []),
        lessonApi.getLessonsByCourseId(courseId).catch(() => []),
      ]);
      setAvailableModules(mods);
      setAvailableLessons(less);
    } catch (err) {
      console.error('Error loading hierarchy:', err);
    } finally {
      setIsLoadingHierarchy(false);
    }
  }, []);

  // Khởi tạo dữ liệu khi vào trang: Phân biệt rõ giữa Edit và Create
  useEffect(() => {
    let cancelled = false;

    const initData = async () => {
      const coursesList = await loadCourses();

      if (isEditMode && id) {
        const scriptId = Number(id);
        if (!scriptId) return;

        setIsLoadingScript(true);
        try {
          const res = await speakingApi.getSpeakingScriptById(scriptId);
          if (cancelled) return;

          if (res.success && res.data) {
            const s = res.data;

            // 1. Map Scope, Khóa học, Tiêu đề, Điểm chuẩn, Nội dung gốc, Hướng dẫn & Audio mẫu
            setScope(s.scope || 'FINAL');
            const isOP = s.scriptType === 'OpenPrompt' || s.scriptType === 2;
            setScriptType(isOP ? 'OpenPrompt' : 'Scripted');
            setPromptContent(s.promptContent || '');
            setStructureHints(s.structureHints || '');
            setTargetDurationSeconds(s.targetDurationSeconds ?? '');
            setSelectedCourseId(s.courseId);
            setScriptTitle(s.title || '');
            setOriginalContent(s.originalContent || '');
            setPassingScore(s.passingScore ?? 80);
            setSelectedBackgroundMusicId(s.backgroundMusicId ?? null);
            setSampleAudioUrl(s.sampleAudioUrl || null);
            setSampleAudioPreviewUrl(s.sampleAudioUrl || null);
            setInstructorNote(s.instructorNote || '');

            // 2. Fetch Modules & Lessons của khóa học này ngay lập tức để đồng bộ dropdown
            if (s.courseId) {
              setIsLoadingHierarchy(true);
              const [mods, less] = await Promise.all([
                moduleApi.getModulesByCourseId(s.courseId).catch(() => []),
                lessonApi.getLessonsByCourseId(s.courseId).catch(() => []),
              ]);
              if (!cancelled) {
                setAvailableModules(mods);
                setAvailableLessons(less);
                setSelectedModuleId(s.moduleId ?? s.chapterId ?? null);
                setSelectedLessonId(s.lessonId ?? null);
                setIsLoadingHierarchy(false);
              }
            }

            // 3. Map nội dung 3 cấp độ
            const contents: Record<SpeakingLevel, string> = {
              BEGINNER: '',
              INTERMEDIATE: '',
              ADVANCED: '',
            };
            s.levels?.forEach((lvl) => {
              contents[lvl.level] = lvl.content;
            });
            setEditableContents(contents);

            // 4. Map Rubric Criteria đã lưu trong DB (nếu có thì giữ nguyên 100%)
            if (s.rubricCriteria && s.rubricCriteria.length > 0) {
              setCriteria(
                s.rubricCriteria.map((c) => ({
                  code: c.code,
                  name: c.name,
                  weightPercentage: Number(c.weightPercentage),
                  isMandatory: Boolean(c.isMandatory || c.code === 'C01' || c.code === 'C02' || c.code === 'C03'),
                  orderIndex: c.orderIndex,
                }))
              );
            } else {
              // Chỉ nạp 3 tiêu chí mặc định nếu bài tập cũ trước đây chưa có rubric
              setCriteria([...MANDATORY_CRITERIA]);
            }
          } else {
            setErrorMsg(res.message || 'Không tìm thấy bài tập nói.');
          }
        } catch (err: any) {
          if (!cancelled) setErrorMsg(err.message || 'Không thể tải thông tin bài tập nói.');
        } finally {
          if (!cancelled) setIsLoadingScript(false);
        }
      } else {
        // Chế độ Create: chỉ gán giá trị mặc định nếu có param hoặc chọn khóa đầu tiên
        if (!selectedCourseId && coursesList.length > 0) {
          const firstCourseId = coursesList[0].courseId;
          setSelectedCourseId(firstCourseId);
          loadHierarchyForCourse(firstCourseId);
        } else if (selectedCourseId) {
          loadHierarchyForCourse(selectedCourseId);
        }
      }
    };

    initData();

    return () => {
      cancelled = true;
    };
  }, [id, isEditMode]);

  // Khi người dùng tự tay đổi Khóa học ở dropdown (chỉ khi không đang load script)
  const handleCourseChange = (newCourseId: number) => {
    setSelectedCourseId(newCourseId);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    if (newCourseId) {
      loadHierarchyForCourse(newCourseId);
    } else {
      setAvailableModules([]);
      setAvailableLessons([]);
    }
  };

  // Load danh sách bài nhạc nền
  useEffect(() => {
    loadMusics();
  }, [selectedLessonId]);

  const loadMusics = async () => {
    setIsLoadingMusics(true);
    try {
      if (selectedLessonId) {
        const res = await speakingApi.getMusicsForLesson(selectedLessonId);
        if (res.success && res.data) {
          setMusics(res.data);
          return;
        }
      }
      const defaultRes = await speakingApi.getDefaultMusics();
      if (defaultRes.success && defaultRes.data) {
        setMusics(defaultRes.data);
      }
    } catch (err) {
      console.error('Error fetching musics:', err);
    } finally {
      setIsLoadingMusics(false);
    }
  };

  const handleTogglePreview = (music: BackgroundMusicDto) => {
    if (previewPlayingId === music.musicId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewPlayingId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(music.audioUrl);
      audio.volume = 0.5;
      previewAudioRef.current = audio;
      setPreviewPlayingId(music.musicId);
      audio.onended = () => {
        setPreviewPlayingId(null);
      };
      audio.play().catch((err) => {
        console.warn('Audio preview error:', err);
        setPreviewPlayingId(null);
      });
    }
  };

  const handleUploadMusic = async () => {
    if (!uploadMusicFile) {
      onToast?.('Thiếu tập tin', 'Vui lòng chọn file âm thanh (.mp3, .wav, .ogg)', 'warning');
      return;
    }
    const title = uploadMusicTitle.trim() || uploadMusicFile.name.replace(/\.[^/.]+$/, '');

    setIsUploadingMusic(true);
    try {
      if (selectedLessonId) {
        const res = await speakingApi.uploadMusicForLesson(selectedLessonId, uploadMusicFile, title);
        if (res.success) {
          onToast?.('Tải lên thành công!', `Nhạc nền "${title}" đã được thêm vào bài tập.`, 'success');
          setUploadMusicTitle('');
          setUploadMusicFile(null);
          if (musicFileInputRef.current) musicFileInputRef.current.value = '';
          loadMusics();
        } else {
          onToast?.('Tải lên thất bại', res.message || 'Không thể tải nhạc nền.', 'error');
        }
      } else {
        const res = await speakingApi.preUploadMusic(uploadMusicFile, title);
        if (res.success) {
          onToast?.('Tải lên thành công!', `Nhạc nền "${title}" đã sẵn sàng.`, 'success');
          setUploadMusicTitle('');
          setUploadMusicFile(null);
          if (musicFileInputRef.current) musicFileInputRef.current.value = '';
          loadMusics();
        }
      }
    } catch (err: any) {
      onToast?.('Lỗi tải lên nhạc nền', err.message || 'Đã xảy ra lỗi.', 'error');
    } finally {
      setIsUploadingMusic(false);
    }
  };

  // Sample Audio Handlers
  const handleSampleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSampleAudioFile(file);
      const preview = URL.createObjectURL(file);
      setSampleAudioPreviewUrl(preview);
      onToast?.('Đã chọn file audio mẫu', `File: ${file.name}`, 'info');
    }
  };

  const handleRemoveSampleAudio = () => {
    setSampleAudioFile(null);
    setSampleAudioPreviewUrl(null);
    setSampleAudioUrl(null);
    if (sampleAudioInputRef.current) {
      sampleAudioInputRef.current.value = '';
    }
    onToast?.('Đã gỡ bỏ audio mẫu', 'Audio mẫu sẽ được xóa khi lưu bài tập.', 'info');
  };

  // Parsing file kịch bản
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setValidationErrors([]);
      handleParseFile(file);
    }
  };

  const handleParseFile = async (file: File) => {
    setIsParsing(true);
    setErrorMsg(null);
    setValidationErrors([]);

    try {
      const res = await speakingApi.parseScriptFileDirect(file);

      if (res.success && res.data) {
        const data: ParsePreviewDto = res.data;
        setOriginalContent(data.originalContent || '');

        const newContents: Record<SpeakingLevel, string> = {
          BEGINNER: '',
          INTERMEDIATE: '',
          ADVANCED: '',
        };

        data.levels.forEach((lvl) => {
          newContents[lvl.level] = lvl.content;
        });

        setEditableContents(newContents);

        if (!scriptTitle.trim()) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setScriptTitle(fileNameWithoutExt);
        }

        onToast?.('Phân tích thành công!', 'Kịch bản đã được tách thành 3 cấp độ.', 'success');
      } else {
        setErrorMsg(res.message || 'Không thể phân tích kịch bản.');
        if (res.errors && res.errors.length > 0) {
          setValidationErrors(res.errors);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi phân tích file kịch bản.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kich-ban-mau-3-cap-do.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Rubric Handlers
  const handleCriterionWeightChange = (index: number, newWeight: number) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], weightPercentage: Math.max(0, newWeight) };
      return next;
    });
  };

  const handleAddSuggestedCriterion = (suggested: SaveRubricCriterionDto) => {
    if (isMaxWeightReached) {
      onToast?.('Đã đủ 100%', 'Đã đạt tối đa 100% trọng số. Hãy giảm % của tiêu chí khác nếu muốn thêm mới.', 'warning');
      return;
    }
    if (criteria.some((c) => c.code === suggested.code)) {
      onToast?.('Tiêu chí đã có', `Tiêu chí ${suggested.code} đã nằm trong danh sách.`, 'info');
      return;
    }
    setCriteria((prev) => [
      ...prev,
      {
        ...suggested,
        orderIndex: prev.length + 1,
      },
    ]);
    onToast?.('Đã thêm tiêu chí', `Đã thêm ${suggested.code} - ${suggested.name} (${suggested.weightPercentage}%).`, 'success');
  };

  const handleAddCustomCriterion = () => {
    if (isMaxWeightReached) {
      onToast?.('Đã đủ 100%', 'Đã đạt tối đa 100% trọng số. Hãy giảm % của tiêu chí khác nếu muốn thêm mới.', 'warning');
      return;
    }
    const name = customCriterionName.trim();
    if (!name) {
      onToast?.('Thiếu thông tin', 'Vui lòng nhập tên tiêu chí chấm điểm.', 'warning');
      return;
    }
    const code = customCriterionCode.trim() || `C${(criteria.length + 1).toString().padStart(2, '0')}`;
    const weight = Math.max(1, customCriterionWeight);

    if (criteria.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
      onToast?.('Mã đã tồn tại', `Mã tiêu chí "${code}" đã có trong danh sách.`, 'warning');
      return;
    }

    setCriteria((prev) => [
      ...prev,
      {
        code,
        name,
        weightPercentage: weight,
        isMandatory: false,
        orderIndex: prev.length + 1,
      },
    ]);

    setCustomCriterionCode('');
    setCustomCriterionName('');
    setCustomCriterionWeight(10);
    setShowAddCustomCriterion(false);
    onToast?.('Thành công', `Đã thêm tiêu chí tùy chỉnh "${name}".`, 'success');
  };

  const handleDeleteCriterion = (index: number) => {
    const target = criteria[index];
    if (target.isMandatory || target.code === 'C01' || target.code === 'C02' || target.code === 'C03') {
      onToast?.('Không thể xóa', '3 tiêu chí cơ bản C01, C02, C03 là bắt buộc.', 'warning');
      return;
    }
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  // Tự động cân bằng 100%
  const handleAutoBalance = () => {
    if (criteria.length === 0) return;
    const currentSum = criteria.reduce((sum, c) => sum + (Number(c.weightPercentage) || 0), 0);
    if (currentSum <= 0) {
      const equalShare = Math.floor(100 / criteria.length);
      const remainder = 100 - equalShare * criteria.length;
      setCriteria((prev) =>
        prev.map((c, idx) => ({
          ...c,
          weightPercentage: equalShare + (idx === 0 ? remainder : 0),
        }))
      );
      onToast?.('Đã cân bằng', 'Đã phân bổ đều 100% cho các tiêu chí.', 'success');
      return;
    }

    let allocated = 0;
    const newCriteria = criteria.map((c, idx) => {
      if (idx === criteria.length - 1) {
        return {
          ...c,
          weightPercentage: Math.max(1, 100 - allocated),
        };
      }
      const scaled = Math.round((c.weightPercentage / currentSum) * 100);
      allocated += scaled;
      return {
        ...c,
        weightPercentage: Math.max(1, scaled),
      };
    });

    setCriteria(newCriteria);
    onToast?.('Đã cân bằng 100%', 'Trọng số các tiêu chí đã được tự động chuẩn hóa về 100%.', 'success');
  };

  // Submit Form: Save hoặc Publish
  const handleSubmit = async () => {
    if (!scriptTitle.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho bài tập nói.');
      return;
    }

    if (!selectedCourseId) {
      setErrorMsg('Vui lòng chọn khóa học cho bài tập nói.');
      return;
    }

    if (scope === 'CHAPTER' && !selectedModuleId) {
      setErrorMsg('Vui lòng chọn chương áp dụng cho bài tập nói.');
      return;
    }

    if (scope === 'LESSON' && !selectedLessonId) {
      setErrorMsg('Vui lòng chọn bài học áp dụng cho bài tập nói.');
      return;
    }

    if (scriptType === 'OpenPrompt') {
      if (!promptContent.trim()) {
        setErrorMsg('Vui lòng nhập nội dung đề bài / tình huống mở cho bài tập nói.');
        return;
      }
    } else {
      const hasContent =
        editableContents.BEGINNER.trim() ||
        editableContents.INTERMEDIATE.trim() ||
        editableContents.ADVANCED.trim();

      if (!hasContent) {
        setErrorMsg('Vui lòng cung cấp nội dung kịch bản cho ít nhất một cấp độ.');
        return;
      }
    }

    // CHẶN TUYỆT ĐỐI NẾU TỔNG TRỌNG SỐ VƯỢT QUÁ 100% (KHÔNG LƯU THAY ĐỔI, KHÔNG TẠO BÀI NÓI)
    if (totalWeight > 100) {
      const msg = `Tổng trọng số các tiêu chí chấm điểm hiện tại là ${totalWeight}%, vượt quá 100%! Hệ thống không lưu thay đổi và không cho phép tạo bài nói khi tổng trọng số vượt quá 100%. Vui lòng giảm % trọng số của các tiêu chí hoặc nhấn nút "Cân bằng 100%".`;
      setErrorMsg(msg);
      onToast?.(
        'Không thể lưu bài tập!',
        `Tổng trọng số tiêu chí (${totalWeight}%) đã vượt quá 100%. Không thể lưu thay đổi!`,
        'error'
      );
      return;
    }

    // Cảnh báo nhắc nhở nếu chưa đủ 100%
    if (Math.round(totalWeight) < 100) {
      const confirmProceed = window.confirm(
        `Tổng trọng số tiêu chí hiện tại là ${totalWeight}%, chưa đủ 100%. Bạn có chắc chắn muốn tiếp tục lưu không? (Khuyến nghị đủ 100% để đảm bảo tính chính xác khi chấm điểm)`
      );
      if (!confirmProceed) return;
    }

    // Tự động fallback nội dung cho cấp độ còn trống nếu là Scripted
    const validFallback =
      editableContents.BEGINNER.trim() ||
      editableContents.INTERMEDIATE.trim() ||
      editableContents.ADVANCED.trim() ||
      originalContent.trim();

    const finalLevels = scriptType === 'Scripted' ? [
      { level: 'BEGINNER' as SpeakingLevel, content: editableContents.BEGINNER.trim() || validFallback },
      { level: 'INTERMEDIATE' as SpeakingLevel, content: editableContents.INTERMEDIATE.trim() || validFallback },
      { level: 'ADVANCED' as SpeakingLevel, content: editableContents.ADVANCED.trim() || validFallback },
    ] : [];

    setIsSubmitting(true);
    setErrorMsg(null);

    const targetModuleId = scope === 'CHAPTER' ? selectedModuleId : scope === 'LESSON' ? selectedModuleId : null;

    try {
      // 1. Tải lên file audio mẫu nếu giảng viên đã chọn file mới
      let finalSampleAudioUrl = sampleAudioUrl;
      if (sampleAudioFile) {
        setIsUploadingSampleAudio(true);
        try {
          const uploadRes = await speakingApi.uploadSampleAudio(sampleAudioFile);
          if (uploadRes.success && uploadRes.data) {
            finalSampleAudioUrl = uploadRes.data;
          } else {
            setErrorMsg(uploadRes.message || 'Không thể tải lên file audio mẫu.');
            setIsSubmitting(false);
            setIsUploadingSampleAudio(false);
            return;
          }
        } catch (upErr: any) {
          setErrorMsg(upErr.message || 'Đã xảy ra lỗi khi tải lên file audio mẫu.');
          setIsSubmitting(false);
          setIsUploadingSampleAudio(false);
          return;
        } finally {
          setIsUploadingSampleAudio(false);
        }
      }

      const shouldClearSampleAudio = isEditMode && !finalSampleAudioUrl && !sampleAudioFile;

      if (isEditMode && id) {
        const res = await speakingApi.updateSpeakingScript(Number(id), {
          courseId: selectedCourseId,
          scope,
          scriptType,
          promptContent: scriptType === 'OpenPrompt' ? promptContent.trim() : null,
          structureHints: scriptType === 'OpenPrompt' && structureHints.trim() ? structureHints.trim() : null,
          targetDurationSeconds: scriptType === 'OpenPrompt' && Number(targetDurationSeconds) > 0 ? Number(targetDurationSeconds) : null,
          moduleId: targetModuleId,
          chapterId: targetModuleId,
          lessonId: scope === 'LESSON' ? selectedLessonId : null,
          backgroundMusicId: selectedBackgroundMusicId,
          sampleAudioUrl: finalSampleAudioUrl,
          instructorNote: instructorNote.trim() || null,
          clearSampleAudio: shouldClearSampleAudio,
          title: scriptTitle.trim(),
          originalContent: scriptType === 'Scripted' ? originalContent : undefined,
          passingScore,
          levels: scriptType === 'Scripted' ? finalLevels : [],
          rubricCriteria: criteria,
        });

        if (res.success) {
          onToast?.('Cập nhật thành công!', 'Bài tập luyện nói đã được lưu thành công.', 'success');
          navigate('/instructor/speaking-assignments');
        } else {
          setErrorMsg(res.message || 'Không thể cập nhật bài tập nói.');
        }
      } else {
        const res = await speakingApi.createSpeakingScript({
          courseId: selectedCourseId,
          scope,
          scriptType,
          promptContent: scriptType === 'OpenPrompt' ? promptContent.trim() : null,
          structureHints: scriptType === 'OpenPrompt' && structureHints.trim() ? structureHints.trim() : null,
          targetDurationSeconds: scriptType === 'OpenPrompt' && Number(targetDurationSeconds) > 0 ? Number(targetDurationSeconds) : null,
          moduleId: targetModuleId,
          chapterId: targetModuleId,
          lessonId: scope === 'LESSON' ? selectedLessonId : null,
          backgroundMusicId: selectedBackgroundMusicId,
          sampleAudioUrl: finalSampleAudioUrl,
          instructorNote: instructorNote.trim() || null,
          title: scriptTitle.trim(),
          originalContent: scriptType === 'Scripted' ? originalContent : undefined,
          passingScore,
          levels: scriptType === 'Scripted' ? finalLevels : [],
          rubricCriteria: criteria,
        });

        if (res.success) {
          onToast?.('Tạo bài nói thành công!', 'Bài tập luyện nói 3 cấp độ đã được xuất bản.', 'success');
          navigate('/instructor/speaking-assignments');
        } else {
          setErrorMsg(res.message || 'Không thể tạo bài tập nói.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi lưu bài tập nói.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormattedPreview = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">Chưa có nội dung cho cấp độ này.</p>;

    const paragraphs = text.split('\n');

    return (
      <div className="space-y-4">
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) return <div key={pIdx} className="h-2" />;

          const tagRegex = /(\[[^\]]+\])/g;
          const parts = para.split(tagRegex);

          return (
            <div key={pIdx} className="leading-relaxed text-slate-800 text-sm">
              {parts.map((part, idx) => {
                if (part.startsWith('[HƯỚNG DẪN:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 mr-2"
                    >
                      💡 {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[GIỌNG ĐỌC:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 mr-2"
                    >
                      🎙️ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[NGẮT NGHỈ:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 mr-2"
                    >
                      ⏳ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoadingScript) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-8 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-semibold text-slate-700">Đang tải toàn bộ dữ liệu bài tập nói...</p>
      </div>
    );
  }

  const scopeInfo = getSpeakingScopeInfo(scope);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24">
      {/* HEADER BANNER MSEEK SIGNATURE */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white shadow-lg border-b border-blue-900/40">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => navigate('/instructor/speaking-assignments')}
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer shadow-xs"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-bold text-blue-200 border border-blue-400/30">
                    <Mic2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>SPEAKING STUDIO</span>
                  </span>
                  <span
                    className="rounded-full px-3 py-0.5 text-xs font-extrabold tracking-wide uppercase border shadow-xs"
                    style={{
                      backgroundColor: `${scopeInfo.color}25`,
                      color: '#ffffff',
                      borderColor: `${scopeInfo.color}60`,
                    }}
                  >
                    {scopeInfo.badge}
                  </span>
                  {isEditMode ? (
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                      Chế độ chỉnh sửa ID #{id}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/30">
                      Tạo bài mới
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isEditMode ? 'Chỉnh sửa Kịch bản & Tiêu chí bài tập nói' : 'Biên soạn Kịch bản luyện nói Studio'}
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl font-medium">
                  Tải lên kịch bản Word/Text, phân tách 3 cấp độ nói, gắn nhạc nền chuẩn sân khấu và cấu hình bảng tiêu chí chấm điểm (Rubric).
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                type="button"
                onClick={() => navigate('/instructor/speaking-assignments')}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isParsing || totalWeight > 100}
                title={totalWeight > 100 ? `Không thể lưu: Tổng trọng số tiêu chí đang là ${totalWeight}%, vượt quá 100%!` : undefined}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all border ${
                  totalWeight > 100
                    ? 'bg-rose-700/80 border-rose-500/50 opacity-60 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30 hover:brightness-110 active:scale-95 border-blue-400/40 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEditMode ? 'Lưu cập nhật' : 'Xuất bản kịch bản'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{errorMsg}</p>
              {validationErrors.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-red-700 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (5 COLS): Phạm vi, Khóa học, Tiêu chí Rubric & Nhạc nền */}
          <div className="lg:col-span-5 space-y-6">
            {/* KHỐI 1: Phạm vi & Khóa học */}
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Phạm vi & Khóa học</h2>
                    <p className="text-[11px] text-slate-500">Cấu hình cấp độ bài thi trong hệ thống</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Scope selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phạm vi bài tập nói <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'LESSON' as SpeakingScope, label: 'Bài học', desc: 'Thực hành ngày' },
                      { key: 'CHAPTER' as SpeakingScope, label: 'Theo chương', desc: 'Kiểm tra Module' },
                      { key: 'FINAL' as SpeakingScope, label: 'Cuối khóa', desc: 'Tốt nghiệp' },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setScope(s.key)}
                        className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          scope === s.key
                            ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">{s.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Khóa học áp dụng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={0}>-- Chọn khóa học --</option>
                    {availableCourses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter Select if Scope != FINAL */}
                {(scope === 'CHAPTER' || scope === 'LESSON') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Chương học (Module) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedModuleId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedModuleId(val);
                        setSelectedLessonId(null);
                      }}
                      disabled={isLoadingHierarchy || availableModules.length === 0}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">-- Chọn chương học --</option>
                      {availableModules.map((m) => (
                        <option key={m.moduleId} value={m.moduleId}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lesson Select if Scope == LESSON */}
                {scope === 'LESSON' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Bài học áp dụng <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLessonId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedLessonId(val);
                        if (val && !scriptTitle) {
                          const found = availableLessons.find((l) => l.lessonId === val);
                          if (found) setScriptTitle(found.title);
                        }
                      }}
                      disabled={isLoadingHierarchy || !selectedModuleId}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">-- Chọn bài học --</option>
                      {availableLessons
                        .filter((l) => !selectedModuleId || l.moduleId === selectedModuleId)
                        .map((l) => (
                          <option key={l.lessonId} value={l.lessonId}>
                            {l.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tiêu đề bài tập nói <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="Ví dụ: Kịch bản MC Khai tiệc Tân hôn & Chúc rượu..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Passing Score */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Điểm đạt chuẩn đầu ra (thang 100)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value) || 80)}
                      className="w-28 rounded-xl border border-blue-200 bg-blue-50/40 px-3.5 py-2 text-xs font-bold text-blue-700 text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-xs text-slate-500">Mặc định 80.00 điểm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KHỐI 2: Quản lý Rubric Tiêu chí chấm điểm */}
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Tiêu chí chấm điểm (Rubric)</h2>
                    <p className="text-[11px] text-slate-500">Thiết lập trọng số % theo chuẩn MC</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                  title="Tự động phân bổ lại trọng số để tổng bằng 100%"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Cân bằng 100%</span>
                </button>
              </div>

              {/* Thanh tiến trình & Visual Indicator tổng trọng số */}
              <div
                className={`mb-4 rounded-2xl border p-3.5 transition-all ${
                  Math.round(totalWeight) === 100
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : totalWeight > 100
                    ? 'bg-rose-50/60 border-rose-200'
                    : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    Tổng trọng số các tiêu chí:
                  </span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full text-[11px] border shadow-2xs ${
                      Math.round(totalWeight) === 100
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : totalWeight > 100
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {totalWeight}% {Math.round(totalWeight) === 100 ? '✓ Đạt chuẩn 100%' : totalWeight > 100 ? '⚠️ Vượt quá 100%' : '⚠️ Chưa đủ 100%'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      Math.round(totalWeight) === 100
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : totalWeight > 100
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, totalWeight)}%` }}
                  />
                </div>

                {/* Cảnh báo chặn lưu khi vượt quá 100% */}
                {totalWeight > 100 && (
                  <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 shadow-xs animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">
                        Tổng trọng số hiện tại là {totalWeight}% (vượt quá 100%)!
                      </p>
                      <p className="mt-0.5 text-rose-700 leading-relaxed font-normal">
                        Hệ thống chặn không cho phép lưu thay đổi và không tạo bài nói khi vượt quá 100%. Vui lòng giảm bớt % của các tiêu chí hoặc nhấn &ldquo;Cân bằng 100%&rdquo;.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Danh sách tiêu chí hiện có */}
              <div className="space-y-2 mb-4">
                {criteria.map((c, index) => {
                  const isMandatory = c.isMandatory || c.code === 'C01' || c.code === 'C02' || c.code === 'C03';
                  return (
                    <div
                      key={c.code}
                      className="flex items-center justify-between gap-3 rounded-xl border border-blue-50 bg-white p-3 hover:border-blue-200 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-mono font-bold text-blue-700 shrink-0">
                          {c.code}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                          {isMandatory && (
                            <span className="inline-block text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200/50">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={c.weightPercentage}
                            onChange={(e) => handleCriterionWeightChange(index, Number(e.target.value) || 0)}
                            className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 text-center focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                        {!isMandatory && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCriterion(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tiêu chí"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nút / Form Thêm tiêu chí tùy chỉnh (Có khóa khi totalWeight >= 100%) */}
              {showAddCustomCriterion ? (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-blue-600" /> Thêm tiêu chí tùy chỉnh
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomCriterion(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Mã (VD: C10)"
                      value={customCriterionCode}
                      onChange={(e) => setCustomCriterionCode(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Tên tiêu chí..."
                      value={customCriterionName}
                      onChange={(e) => setCustomCriterionName(e.target.value)}
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-slate-600">Trọng số:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={customCriterionWeight}
                        onChange={(e) => setCustomCriterionWeight(Number(e.target.value) || 10)}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-bold"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomCriterion}
                      disabled={isMaxWeightReached}
                      className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Lưu tiêu chí
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <button
                    type="button"
                    disabled={isMaxWeightReached}
                    onClick={() => setShowAddCustomCriterion(true)}
                    title={isMaxWeightReached ? 'Đã đạt tối đa 100% trọng số' : undefined}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-bold transition-all ${
                      isMaxWeightReached
                        ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-50 cursor-not-allowed'
                        : 'border-blue-300 bg-blue-50/30 text-blue-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-800 cursor-pointer'
                    }`}
                  >
                    {isMaxWeightReached ? <Lock className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Thêm tiêu chí mới</span>
                  </button>
                  {isMaxWeightReached && (
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-400 text-center flex items-center justify-center gap-1">
                      <Info className="h-3 w-3" /> Đã đạt tối đa 100% trọng số
                    </p>
                  )}
                </div>
              )}

              {/* Tiêu chí đề xuất gợi ý (Khóa khi totalWeight >= 100%) */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Tiêu chí đề xuất gợi ý:
                  </span>
                  {isMaxWeightReached && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Đã đạt 100% trọng số
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_CRITERIA.map((sug) => {
                    const isAdded = criteria.some((c) => c.code === sug.code);
                    const isDisabled = isAdded || isMaxWeightReached;

                    return (
                      <button
                        key={sug.code}
                        type="button"
                        onClick={() => handleAddSuggestedCriterion(sug)}
                        disabled={isDisabled}
                        title={
                          isAdded
                            ? 'Tiêu chí đã có trong danh sách'
                            : isMaxWeightReached
                            ? 'Đã đạt tối đa 100% trọng số'
                            : `Thêm tiêu chí ${sug.name}`
                        }
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          isAdded
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                            : isMaxWeightReached
                            ? 'bg-slate-50 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : isMaxWeightReached ? (
                          <Lock className="h-3 w-3 text-slate-400" />
                        ) : (
                          <Plus className="h-3 w-3 text-blue-500" />
                        )}
                        <span>
                          {sug.code} - {sug.name} ({sug.weightPercentage}%)
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isMaxWeightReached && (
                  <p className="mt-2 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Đã đạt tối đa 100% trọng số. Hãy giảm % của tiêu chí khác nếu muốn thêm mới.</span>
                  </p>
                )}
              </div>
            </div>

            {/* KHỐI 3: Cấu hình nhạc nền */}
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                    <Music className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Cấu hình nhạc nền</h2>
                    <p className="text-[11px] text-slate-500">Nhạc nền phát khi học viên thu âm bài nói</p>
                  </div>
                </div>

                {selectedBackgroundMusicId ? (
                  <button
                    type="button"
                    onClick={() => setSelectedBackgroundMusicId(null)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Bỏ chọn nhạc
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">Chưa gắn nhạc</span>
                )}
              </div>

              {isLoadingMusics ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                </div>
              ) : musics.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Chưa có nhạc nền nào. Hãy tải lên nhạc nền mới bên dưới.
                </p>
              ) : (
                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
                  {musics.map((m) => {
                    const isSelected = selectedBackgroundMusicId === m.musicId;
                    return (
                      <div
                        key={m.musicId}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                          isSelected
                            ? 'border-purple-300 bg-purple-50/70 ring-1 ring-purple-400'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePreview(m)}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
                              previewPlayingId === m.musicId
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                            title={previewPlayingId === m.musicId ? 'Tạm dừng' : 'Nghe thử'}
                          >
                            {previewPlayingId === m.musicId ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate block">
                              {m.title}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-purple-700 flex items-center gap-0.5">
                                <CheckCircle className="h-3 w-3" /> Đang chọn làm nhạc nền bài nói
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedBackgroundMusicId(isSelected ? null : m.musicId)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700'
                            }`}
                          >
                            {isSelected ? 'Đang chọn' : 'Chọn bài này'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload nhạc nền mới */}
              <div className="border-t border-slate-100 pt-3">
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  Tải lên nhạc nền mới (.mp3, .wav):
                </span>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Tên bài nhạc..."
                    value={uploadMusicTitle}
                    onChange={(e) => setUploadMusicTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-purple-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={musicFileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadMusicFile(e.target.files[0]);
                        }
                      }}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={handleUploadMusic}
                      disabled={isUploadingMusic || !uploadMusicFile}
                      className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isUploadingMusic ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      <span>Tải lên</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7 COLS): Tải file kịch bản & Biên soạn 3 Cấp độ nói */}
          <div className="lg:col-span-7 space-y-6">
            {/* KHỐI CHỌN LOẠI BÀI NÓI (SCRIPT TYPE) */}
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Hình thức bài tập nói</h2>
                    <p className="text-[11px] text-slate-500">Chọn chế độ có kịch bản cuộn chữ hoặc đề mở ứng biến tự do</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScriptType('Scripted')}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    scriptType === 'Scripted'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Có kịch bản (Teleprompter)
                    </span>
                    {scriptType === 'Scripted' && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Có văn bản mẫu cuộn chữ tự động, phân tách 3 cấp độ (Beginner, Intermediate, Advanced) và so khớp phát âm AI.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScriptType('OpenPrompt')}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    scriptType === 'OpenPrompt'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Đề mở / Ứng biến (Cue Card)
                    </span>
                    {scriptType === 'OpenPrompt' && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đưa ra tình huống thực tế. Học viên tự lập dàn ý ngắn (Cue Card) và ứng biến nói theo thời lượng mục tiêu.
                  </p>
                </button>
              </div>
            </div>

            {scriptType === 'OpenPrompt' ? (
              /* KHỐI BIÊN SOẠN ĐỀ MỞ (OPEN PROMPT) */
              <div className={cardClass}>
                <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Nội dung Đề bài & Tình huống mở</h2>
                      <p className="text-[11px] text-slate-500">Cung cấp tình huống thực tế và gợi ý cấu trúc để học viên chuẩn bị nói</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Prompt Content */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nội dung Đề bài / Tình huống thực tế <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={8}
                      value={promptContent}
                      onChange={(e) => setPromptContent(e.target.value)}
                      placeholder="Ví dụ: Bạn là MC dẫn chương trình Lễ Khai mạc Hội thao Doanh nghiệp mở rộng 2026. Hãy chào mừng đại biểu, công bố thể thức thi đấu và phát biểu truyền cảm hứng..."
                      className="w-full rounded-2xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50/30"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Đề bài sẽ hiển thị ở cột bên trái trong không gian làm bài của học viên.
                    </p>
                  </div>

                  {/* Structure Hints */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Gợi ý sườn bài / Từ khóa chính (Tùy chọn)
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Học viên có thể bấm xem gợi ý nếu cần</span>
                    </label>
                    <textarea
                      rows={5}
                      value={structureHints}
                      onChange={(e) => setStructureHints(e.target.value)}
                      placeholder="Ví dụ:&#10;• Phần 1 (30s): Lời chào trân trọng, nêu bối cảnh buổi lễ&#10;• Phần 2 (60s): Tinh thần thể thao 'Đoàn kết - Trung thực - Cao thượng'&#10;• Phần 3 (30s): Tuyên bố khai mạc & lời chúc các vận động viên"
                      className="w-full rounded-2xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50/30 font-mono"
                    />
                  </div>

                  {/* Target Duration Seconds */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" /> Thời lượng nói mục tiêu (Giây - Tùy chọn)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={1800}
                        step={10}
                        value={targetDurationSeconds ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setTargetDurationSeconds(val);
                        }}
                        placeholder="120"
                        className="w-36 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <span className="text-xs text-slate-500">
                        {targetDurationSeconds && Number(targetDurationSeconds) > 0
                          ? `Tương đương ~${Math.floor(Number(targetDurationSeconds) / 60)} phút ${Number(targetDurationSeconds) % 60 > 0 ? `${Number(targetDurationSeconds) % 60} giây` : ''}`
                          : 'Không giới hạn thời lượng cụ thể'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* KHỐI 4: Tải file kịch bản */}
                <div className={cardClass}>
                  <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Tải lên file kịch bản (.docx, .txt, .md)</h2>
                        <p className="text-[11px] text-slate-500">Tự động phân tách 3 cấp độ nói thông minh</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Tải kịch bản mẫu (.md)</span>
                    </button>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-6 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.txt,.md"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="mb-3 rounded-2xl bg-blue-100 p-3 text-blue-700 group-hover:scale-110 transition-transform shadow-xs">
                      {isParsing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      ) : (
                        <UploadCloud className="h-6 w-6" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedFile ? (
                        <span className="text-blue-700 font-extrabold">{selectedFile.name}</span>
                      ) : (
                        <>Kéo thả file kịch bản hoặc <span className="text-blue-600 underline">chọn từ máy tính</span></>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Hỗ trợ Word (.docx), Markdown (.md), Text (.txt) - Hệ thống tự bóc tách thẻ đạo diễn
                    </p>
                  </div>
                </div>

                {/* KHỐI 5: Studio 3 Cấp độ nói */}
                <div className={cardClass}>
                  {/* Studio Header & Mode Switches */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-50 pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Biên soạn 3 Cấp độ luyện nói</h2>
                        <p className="text-[11px] text-slate-500">Beginner (Dễ) • Intermediate (Trung bình) • Advanced (Chuyên nghiệp)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setViewMode('EDIT')}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'EDIT'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('PREVIEW')}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'PREVIEW'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem trước</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Level Tabs */}
                  <div className="flex items-center gap-2 mb-4">
                    {[
                      { key: 'BEGINNER' as SpeakingLevel, label: 'Cấp độ 1: Dễ (Beginner)', color: 'text-emerald-800 bg-emerald-50 border-emerald-300 ring-emerald-500' },
                      { key: 'INTERMEDIATE' as SpeakingLevel, label: 'Cấp độ 2: Trung bình', color: 'text-blue-800 bg-blue-50 border-blue-300 ring-blue-500' },
                      { key: 'ADVANCED' as SpeakingLevel, label: 'Cấp độ 3: Chuyên nghiệp', color: 'text-purple-800 bg-purple-50 border-purple-300 ring-purple-500' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 rounded-xl border py-2.5 px-3 text-xs font-black transition-all text-center cursor-pointer ${
                          activeTab === tab.key
                            ? `${tab.color} ring-2 ring-offset-1 shadow-xs`
                            : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tag Legend Hint */}
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50/50 p-3 text-[11px] text-slate-700 border border-blue-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-blue-600" /> Thẻ kịch bản gợi ý:
                    </span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800 border border-blue-200">
                      [HƯỚNG DẪN: ...]
                    </span>
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-bold text-purple-800 border border-purple-200">
                      [GIỌNG ĐỌC: ...]
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800 border border-amber-200">
                      [NGẮT NGHỈ: 2s]
                    </span>
                  </div>

                  {/* Main Content Area: Edit vs Preview */}
                  {viewMode === 'EDIT' ? (
                    <div>
                      <textarea
                        rows={16}
                        value={editableContents[activeTab]}
                        onChange={(e) =>
                          setEditableContents((prev) => ({
                            ...prev,
                            [activeTab]: e.target.value,
                          }))
                        }
                        placeholder={`Nhập nội dung kịch bản cho ${activeTab} kèm các chỉ dẫn đạo diễn [HƯỚNG DẪN:...], [GIỌNG ĐỌC:...]...`}
                        className="w-full rounded-2xl border border-slate-200 p-4 font-mono text-xs leading-relaxed text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50/30"
                      />
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span className="font-medium">
                          Số từ: {editableContents[activeTab].trim() ? editableContents[activeTab].trim().split(/\s+/).length : 0} từ
                        </span>
                        <span className="text-blue-600 font-medium">Hệ thống tự động loại bỏ thẻ đạo diễn khi so khớp phát âm AI</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 min-h-[380px]">
                      {renderFormattedPreview(editableContents[activeTab])}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* KHỐI 6: Hướng dẫn & Audio đọc mẫu từ giảng viên (Không bắt buộc) */}
            <div className={cardClass}>
              <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Hướng dẫn & Audio đọc mẫu từ giảng viên{' '}
                      <span className="text-xs font-normal text-slate-400">(Không bắt buộc)</span>
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Cung cấp audio đọc mẫu và lưu ý về ngữ điệu, cảm xúc cho học viên
                    </p>
                  </div>
                </div>

                {(sampleAudioPreviewUrl || instructorNote) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle className="h-3 w-3" /> Đã có hướng dẫn
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* 1. Audio đọc mẫu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-indigo-600" /> Audio giảng viên đọc mẫu (.mp3, .wav, .m4a, .aac)
                    </span>
                    {sampleAudioPreviewUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveSampleAudio}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Gỡ bỏ file mẫu
                      </button>
                    )}
                  </label>

                  {sampleAudioPreviewUrl ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {sampleAudioFile ? `File mới chọn: ${sampleAudioFile.name}` : 'File audio mẫu hiện tại trên hệ thống'}
                        </span>
                        <span className="text-[10px] text-indigo-500 font-medium">Sẵn sàng phát</span>
                      </div>
                      <audio controls src={sampleAudioPreviewUrl} className="w-full h-9 rounded-lg" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          {sampleAudioFile ? 'File sẽ tự động tải lên khi bạn nhấn Lưu / Xuất bản.' : 'Bạn có thể tải file khác để thay thế.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => sampleAudioInputRef.current?.click()}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          Đổi file khác
                        </button>
                        <input
                          ref={sampleAudioInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleSampleAudioChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => sampleAudioInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                    >
                      <input
                        ref={sampleAudioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleSampleAudioChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-2xs group-hover:scale-110 transition-transform">
                          <UploadCloud className="h-4 w-4 text-indigo-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Chọn hoặc kéo thả file âm thanh đọc mẫu vào đây
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Hỗ trợ MP3, WAV, M4A, AAC (Dung lượng khuyến nghị dưới 20MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Dặn dò của giảng viên */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5 text-indigo-600" /> Dặn dò & Lưu ý của giảng viên
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">Hiển thị trong phòng luyện nói</span>
                  </label>
                  <textarea
                    rows={4}
                    value={instructorNote}
                    onChange={(e) => setInstructorNote(e.target.value)}
                    placeholder="Nhập dặn dò về nhịp thở, ngữ điệu, điểm nhấn hoặc lỗi cần tránh (Ví dụ: Hãy chú ý ngắt nghỉ đúng 2 giây sau câu chào mở đầu. Đoạn cao trào hãy mở khẩu hình rộng hơn để giọng vang...)"
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-slate-50/30"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Nội dung này sẽ hiển thị trực quan ngay trên Teleprompter để học viên đọc trước khi thu âm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
