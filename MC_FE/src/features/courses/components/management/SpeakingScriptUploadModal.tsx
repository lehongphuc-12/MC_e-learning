import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
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
  getSpeakingScopeInfo,
} from '../../types/speakingTypes';
import { ToastType } from '../../../../components/common/Toast';
import type { CourseModule } from '../../types/moduleTypes';
import type { Lesson } from '../../types/lessonTypes';

interface SpeakingScriptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: number | null;
  lessonTitle?: string;
  courseId?: number;
  courseTitle?: string;
  initialScope?: SpeakingScope;
  scriptToEdit?: SpeakingScriptDto | null;
  coursesList?: { courseId: number; title: string }[];
  onSuccess?: () => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

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

export const SpeakingScriptUploadModal: React.FC<SpeakingScriptUploadModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  courseId,
  courseTitle,
  initialScope = 'FINAL',
  scriptToEdit = null,
  coursesList,
  onSuccess,
  onToast,
}) => {
  // Scope and Hierarchy States
  const [scope, setScope] = useState<SpeakingScope>(
    scriptToEdit?.scope || initialScope || 'FINAL'
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number>(
    scriptToEdit?.courseId || courseId || 0
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(
    scriptToEdit?.moduleId ?? null
  );
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    scriptToEdit?.lessonId ?? lessonId ?? null
  );

  // Dynamic Options
  const [availableCourses, setAvailableCourses] = useState<{ courseId: number; title: string }[]>(
    coursesList || []
  );
  const [availableModules, setAvailableModules] = useState<CourseModule[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  // Script & Levels States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [scriptTitle, setScriptTitle] = useState(
    scriptToEdit?.title || lessonTitle || ''
  );
  const [originalContent, setOriginalContent] = useState(
    scriptToEdit?.originalContent || ''
  );
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

  // Initialize or reset when opened
  useEffect(() => {
    if (!isOpen) return;

    if (scriptToEdit) {
      setScope(scriptToEdit.scope || 'FINAL');
      setSelectedCourseId(scriptToEdit.courseId);
      setSelectedModuleId(scriptToEdit.moduleId ?? null);
      setSelectedLessonId(scriptToEdit.lessonId ?? null);
      setScriptTitle(scriptToEdit.title || '');
      setOriginalContent(scriptToEdit.originalContent || '');

      const newContents: Record<SpeakingLevel, string> = {
        BEGINNER: '',
        INTERMEDIATE: '',
        ADVANCED: '',
      };
      scriptToEdit.levels?.forEach((lvl) => {
        newContents[lvl.level] = lvl.content;
      });
      setEditableContents(newContents);
    } else {
      setScope(initialScope || 'FINAL');
      if (courseId) setSelectedCourseId(courseId);
      if (lessonId) setSelectedLessonId(lessonId);
      if (lessonTitle) setScriptTitle(lessonTitle);
    }
    setErrorMsg(null);
    setValidationErrors([]);
  }, [isOpen, scriptToEdit, courseId, lessonId, lessonTitle, initialScope]);

  // Load Courses list if empty
  useEffect(() => {
    if (!isOpen) return;
    if (availableCourses.length === 0) {
      courseApi.getInstructorCourses({ page: 1, limit: 100 }).then((res) => {
        const list = (res.data ?? []).map((c) => ({ courseId: c.courseId, title: c.title }));
        setAvailableCourses(list);
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(list[0].courseId);
        }
      }).catch(console.error);
    }
  }, [isOpen, availableCourses.length, selectedCourseId]);

  // Load modules & lessons when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId || !isOpen) return;

    setIsLoadingHierarchy(true);
    Promise.all([
      moduleApi.getModulesByCourseId(selectedCourseId).catch(() => []),
      lessonApi.getLessonsByCourseId(selectedCourseId).catch(() => []),
    ]).then(([mods, less]) => {
      setAvailableModules(mods);
      setAvailableLessons(less);
    }).finally(() => {
      setIsLoadingHierarchy(false);
    });
  }, [selectedCourseId, isOpen]);

  // Load musics
  useEffect(() => {
    if (!isOpen) return;
    loadMusics();
  }, [isOpen, selectedLessonId]);

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
        }
      }
    } catch (err: any) {
      onToast?.('Lỗi tải lên nhạc nền', err.message || 'Đã xảy ra lỗi.', 'error');
    } finally {
      setIsUploadingMusic(false);
    }
  };

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

        if (onToast) onToast('Phân tích thành công!', 'Kịch bản đã được tách thành 3 cấp độ.', 'success');
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

  const handleSaveAndPublish = async () => {
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

    const hasContent = editableContents.BEGINNER.trim() ||
      editableContents.INTERMEDIATE.trim() ||
      editableContents.ADVANCED.trim();

    if (!hasContent) {
      setErrorMsg('Vui lòng cung cấp nội dung kịch bản cho ít nhất một cấp độ.');
      return;
    }

    // Auto fallback for empty levels
    const validFallback = editableContents.BEGINNER.trim() ||
      editableContents.INTERMEDIATE.trim() ||
      editableContents.ADVANCED.trim() ||
      originalContent.trim();

    const finalLevels = [
      { level: 'BEGINNER' as SpeakingLevel, content: editableContents.BEGINNER.trim() || validFallback },
      { level: 'INTERMEDIATE' as SpeakingLevel, content: editableContents.INTERMEDIATE.trim() || validFallback },
      { level: 'ADVANCED' as SpeakingLevel, content: editableContents.ADVANCED.trim() || validFallback },
    ];

    setIsPublishing(true);
    setErrorMsg(null);

    try {
      if (scriptToEdit) {
        const res = await speakingApi.updateSpeakingScript(scriptToEdit.scriptId, {
          courseId: selectedCourseId,
          scope,
          moduleId: scope === 'CHAPTER' ? selectedModuleId : (scope === 'LESSON' ? selectedModuleId : null),
          lessonId: scope === 'LESSON' ? selectedLessonId : null,
          title: scriptTitle.trim(),
          originalContent,
          levels: finalLevels,
          passingScore: 80,
        });

        if (res.success) {
          if (onToast) onToast('Cập nhật thành công!', 'Bài tập luyện nói đã được lưu thành công.', 'success');
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMsg(res.message || 'Không thể cập nhật bài tập nói.');
        }
      } else {
        const res = await speakingApi.createSpeakingScript({
          courseId: selectedCourseId,
          scope,
          moduleId: scope === 'CHAPTER' ? selectedModuleId : (scope === 'LESSON' ? selectedModuleId : null),
          lessonId: scope === 'LESSON' ? selectedLessonId : null,
          title: scriptTitle.trim(),
          originalContent,
          levels: finalLevels,
          passingScore: 80,
        });

        if (res.success) {
          if (onToast) onToast('Tạo bài nói thành công!', 'Bài tập luyện nói 3 cấp độ đã được xuất bản.', 'success');
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMsg(res.message || 'Không thể tạo bài tập nói.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi lưu bài tập nói.');
    } finally {
      setIsPublishing(false);
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

  if (!isOpen) return null;

  const currentScopeInfo = getSpeakingScopeInfo(scope);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 md:px-7 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-700 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{scriptToEdit ? 'CHỈNH SỬA BÀI TẬP NÓI' : 'TẠO BÀI TẬP NÓI MỚI (3 CẤP ĐỘ)'}</span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              {scriptTitle || 'Kịch bản luyện nói Studio'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{errorMsg}</p>
                {validationErrors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5 opacity-90">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 1. Scope & Hierarchy Config */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                Phạm vi áp dụng (Scope) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { key: 'LESSON', label: 'Bài học hằng ngày', desc: 'Gắn theo từng bài giảng' },
                    { key: 'CHAPTER', label: 'Theo chương', desc: 'Đánh giá kỹ năng sau mỗi chương' },
                    { key: 'FINAL', label: 'Tổng cuối khóa', desc: 'Bài thi nói tổng kết khóa học' },
                  ] as const
                ).map((s) => {
                  const isSel = scope === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setScope(s.key)}
                      className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-black">{s.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cascading Course -> Module -> Lesson */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Khóa học *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const cId = Number(e.target.value);
                    setSelectedCourseId(cId);
                    setSelectedModuleId(null);
                    setSelectedLessonId(null);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={0}>-- Chọn khóa học --</option>
                  {availableCourses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {(scope === 'CHAPTER' || scope === 'LESSON') && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> Chương / Module {scope === 'CHAPTER' ? '*' : ''}
                  </label>
                  <select
                    value={selectedModuleId || ''}
                    onChange={(e) => {
                      const mId = e.target.value ? Number(e.target.value) : null;
                      setSelectedModuleId(mId);
                      setSelectedLessonId(null);
                    }}
                    disabled={!selectedCourseId || isLoadingHierarchy}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  >
                    <option value="">-- Chọn chương --</option>
                    {availableModules.map((m) => (
                      <option key={m.moduleId} value={m.moduleId}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'LESSON' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-sky-500" /> Bài học *
                  </label>
                  <select
                    value={selectedLessonId || ''}
                    onChange={(e) => {
                      const lId = e.target.value ? Number(e.target.value) : null;
                      setSelectedLessonId(lId);
                      const matched = availableLessons.find((l) => l.lessonId === lId);
                      if (matched && !scriptTitle) setScriptTitle(matched.title);
                    }}
                    disabled={!selectedCourseId || isLoadingHierarchy}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
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
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Tiêu đề bài tập nói *
              </label>
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="VD: Bài thi cuối khóa: Lời dẫn Khai mạc & Nghi thức Rót rượu Champagne"
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 2. File Upload / Auto Parser Box */}
          <div className="p-5 md:p-6 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center text-center relative hover:bg-blue-50/50 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".docx,.txt,.md"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Tải lên tài liệu kịch bản (.docx, .txt, .md)
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Hệ thống sẽ tự động phân tích và trích xuất thành 3 cấp độ: <b>Dễ (Beginner)</b>,{' '}
              <b>Trung bình (Intermediate)</b>, và <b>Chuyên nghiệp (Advanced)</b>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang phân tích kịch bản...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Chọn tập tin từ máy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Tải kịch bản mẫu (.md)</span>
              </button>
            </div>
          </div>

          {/* 3. 3-Level Studio Editors */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
            <div className="border-b border-slate-200 bg-slate-50 p-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: 'BEGINNER', label: '1. Dễ (Beginner)', badge: 'Đầy đủ nhịp thở & focus' },
                    { key: 'INTERMEDIATE', label: '2. Trung bình', badge: 'Điểm nhấn & gợi ý' },
                    { key: 'ADVANCED', label: '3. Chuyên nghiệp', badge: 'Kịch bản trơn thực chiến' },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('EDIT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'EDIT'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('PREVIEW')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'PREVIEW'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trước</span>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {viewMode === 'EDIT' ? (
                <div>
                  <textarea
                    rows={12}
                    value={editableContents[activeTab]}
                    onChange={(e) =>
                      setEditableContents((prev) => ({
                        ...prev,
                        [activeTab]: e.target.value,
                      }))
                    }
                    placeholder={`Nhập nội dung kịch bản cho cấp độ ${activeTab}... Bạn có thể sử dụng các tag: [HƯỚNG DẪN: ...], [GIỌNG ĐỌC: ...], [NGẮT NGHỈ: 2s]`}
                    className="w-full text-xs md:text-sm font-mono leading-relaxed p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 resize-y"
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>
                      Hỗ trợ tag: <code>[HƯỚNG DẪN: ...]</code>, <code>[GIỌNG ĐỌC: ...]</code>,{' '}
                      <code>[NGẮT NGHỈ: Xs]</code>
                    </span>
                    <span>{editableContents[activeTab].length} ký tự</span>
                  </div>
                </div>
              ) : (
                <div className="min-h-[240px] p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  {renderFormattedPreview(editableContents[activeTab])}
                </div>
              )}
            </div>
          </div>

          {/* 4. Background Music Section */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Nhạc nền luyện nói Studio ({musics.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Học viên có thể chọn nhạc nền khi luyện nói
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {musics.map((m) => {
                const isPlaying = previewPlayingId === m.musicId;
                return (
                  <div
                    key={m.musicId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(m)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                          isPlaying
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <span className="text-xs font-bold text-slate-700 truncate">{m.title}</span>
                    </div>
                    {m.isSystemDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Hệ thống
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:px-7 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${currentScopeInfo.badgeClass}`}>
              {currentScopeInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={isPublishing}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu kịch bản...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{scriptToEdit ? 'Lưu thay đổi' : 'Xuất bản kịch bản'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
