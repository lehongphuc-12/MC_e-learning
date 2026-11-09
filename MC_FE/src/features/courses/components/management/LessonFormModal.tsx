// =============================================================================
// LessonFormModal.tsx  —  Create / Edit Single Lesson Dialog
// Video lessons use file uploads only; legacy document links remain supported for DOCUMENT lessons.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  X, Save, Loader2, Video, Mic2, FileText, ClipboardList,
  Upload, CheckCircle2, Trash2, CloudUpload, Sparkles, Clock, Download, AlertCircle, Layers,
  Music, Play, Pause, Plus, Volume2,
} from 'lucide-react';
import type { Lesson, CreateLessonDto } from '../../types/lessonTypes';
import type { CourseModule } from '../../types/moduleTypes';
import { speakingApi } from '../../api/speakingApi';
import type { SpeakingLevel, BackgroundMusicDto } from '../../types/speakingTypes';

// ─── Types ─────────────────────────────────────────────────────────────────

interface LessonFormModalProps {
  isOpen: boolean;
  existingLesson?: Lesson | null;
  modules?: CourseModule[];
  defaultModuleId?: number | null;
  defaultLessonType?: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
  isSubmitting: boolean;
  onClose: () => void;
  /** Called only after form validation. The parent saves metadata and uploads the optional file. */
  onSubmit: (
    dto: CreateLessonDto,
    file?: File | null,
    onUploadProgress?: (percent: number) => void,
    scriptLevels?: { BEGINNER: string; INTERMEDIATE: string; ADVANCED: string } | null,
    customMusics?: Array<{ title: string; audioUrl: string; cloudinaryPublicId?: string }> | null
  ) => Promise<void> | void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg',
  'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
];

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

const TEMPLATE_MARKDOWN = `# K\u1ecaCH B\u1ea2N LUY\u1ec6N N\u00d3I M\u1eaaU (3 C\u1ea4P \u0110\u1ed8)

## [LEVEL: BEGINNER]
[H\u01af\u1edaNG D\u1eaaN: \u0110\u1ee9ng th\u1eb3ng, hai tay th\u1ea3 l\u1ecfng t\u1ef1 nhi\u00ean, \u00e1nh m\u1eaft h\u01b0\u1edbng v\u1ec1 kh\u00e1n gi\u1ea3, m\u1ec9m c\u01b0\u1eddi nh\u1eb9 nh\u00e0ng]
K\u00ednh th\u01b0a qu\u00fd v\u1ecb quan kh\u00e1ch!
[GI\u1eccNG \u0110\u1eccC: Tone tr\u1ea7m \u1ea5m, trang tr\u1ecdng, t\u1ed1c \u0111\u1ed9 v\u1eeba ph\u1ea3i]
L\u1eddi \u0111\u1ea7u ti\u00ean, cho ph\u00e9p MC \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn to\u00e0n th\u1ec3 qu\u00fd v\u1ecb l\u1eddi ch\u00e0o tr\u00e2n tr\u1ecdng v\u00e0 l\u1eddi ch\u00fac m\u1eebng n\u1ed3ng nhi\u1ec7t nh\u1ea5t.
[NG\u1eaeT NGH\u1ec8: 2 gi\u00e2y]
Ng\u00e0y h\u00f4m nay, ch\u00fang ta c\u00f3 m\u1eb7t t\u1ea1i \u0111\u00e2y \u0111\u1ec3 c\u00f9ng nhau ch\u1ee9ng ki\u1ebfn kho\u1ea3nh kh\u1eafc thi\u00eang li\u00eang nh\u1ea5t c\u1ee7a hai b\u1ea1n tr\u1ebb.
[H\u01af\u1edaNG D\u1eaaN: Nghi\u00eang \u0111\u1ea7u nh\u1eb9, n\u1edf n\u1ee5 c\u01b0\u1eddi \u1ea5m \u00e1p]
T\u00ecnh y\u00eau l\u00e0 m\u1ed9t h\u00e0nh tr\u00ecnh k\u1ef3 di\u1ec7u, v\u00e0 ng\u00e0y h\u00f4m nay ch\u00ednh l\u00e0 kh\u1edfi \u0111\u1ea7u cho m\u1ed9t ch\u01b0\u01a1ng m\u1edbi t\u01b0\u01a1i s\u00e1ng.

## [LEVEL: INTERMEDIATE]
K\u00ednh th\u01b0a qu\u00fd v\u1ecb quan kh\u00e1ch!
[GI\u1eccNG \u0110\u1eccC: Tone tr\u1ea7m \u1ea5m, trang tr\u1ecdng, t\u1ed1c \u0111\u1ed9 v\u1eeba ph\u1ea3i]
L\u1eddi \u0111\u1ea7u ti\u00ean, cho ph\u00e9p MC \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn to\u00e0n th\u1ec3 qu\u00fd v\u1ecb l\u1eddi ch\u00e0o tr\u00e2n tr\u1ecdng v\u00e0 l\u1eddi ch\u00fac m\u1eebng n\u1ed3ng nhi\u1ec7t nh\u1ea5t.
Ng\u00e0y h\u00f4m nay, ch\u00fang ta c\u00f3 m\u1eb7t t\u1ea1i \u0111\u00e2y \u0111\u1ec3 c\u00f9ng nhau ch\u1ee9ng ki\u1ebfn kho\u1ea3nh kh\u1eafc thi\u00eang li\u00eang nh\u1ea5t c\u1ee7a hai b\u1ea1n tr\u1ebb.
[GI\u1eccNG \u0110\u1eccC: N\u00e2ng cao t\u00f4ng gi\u1ecdng \u1edf c\u00e2u cu\u1ed1i, t\u1ea1o s\u1ef1 h\u00e0o h\u1ee9ng]
T\u00ecnh y\u00eau l\u00e0 m\u1ed9t h\u00e0nh tr\u00ecnh k\u1ef3 di\u1ec7u, v\u00e0 ng\u00e0y h\u00f4m nay ch\u00ednh l\u00e0 kh\u1edfi \u0111\u1ea7u cho m\u1ed9t ch\u01b0\u01a1ng m\u1edbi t\u01b0\u01a1i s\u00e1ng.

## [LEVEL: ADVANCED]
K\u00ednh th\u01b0a qu\u00fd v\u1ecb quan kh\u00e1ch! L\u1eddi \u0111\u1ea7u ti\u00ean, cho ph\u00e9p MC \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn to\u00e0n th\u1ec3 qu\u00fd v\u1ecb l\u1eddi ch\u00e0o tr\u00e2n tr\u1ecdng v\u00e0 l\u1eddi ch\u00fac m\u1eebng n\u1ed3ng nhi\u1ec7t nh\u1ea5t.
Ng\u00e0y h\u00f4m nay, ch\u00fang ta c\u00f3 m\u1eb7t t\u1ea1i \u0111\u00e2y \u0111\u1ec3 c\u00f9ng nhau ch\u1ee9ng ki\u1ebfn kho\u1ea3nh kh\u1eafc thi\u00eang li\u00eang nh\u1ea5t c\u1ee7a hai b\u1ea1n tr\u1ebb.
T\u00ecnh y\u00eau l\u00e0 m\u1ed9t h\u00e0nh tr\u00ecnh k\u1ef3 di\u1ec7u, v\u00e0 ng\u00e0y h\u00f4m nay ch\u00ednh l\u00e0 kh\u1edfi \u0111\u1ea7u cho m\u1ed9t ch\u01b0\u01a1ng m\u1edbi t\u01b0\u01a1i s\u00e1ng.
`;


function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const LessonFormModal: React.FC<LessonFormModalProps> = ({
  isOpen,
  existingLesson,
  modules = [],
  defaultModuleId,
  defaultLessonType,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditMode = !!existingLesson;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [lessonType, setLessonType] = useState<'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT'>('VIDEO');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Video upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideoPreviewUrl, setSelectedVideoPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  // ─── Speaking Script (3 Levels) Upload & Parser State ──────────────────
  const [scriptDocFile, setScriptDocFile] = useState<File | null>(null);
  const [isParsingScript, setIsParsingScript] = useState(false);
  const [scriptParseError, setScriptParseError] = useState<string | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<SpeakingLevel>('BEGINNER');
  const [scriptLevels, setScriptLevels] = useState<{
    BEGINNER: string;
    INTERMEDIATE: string;
    ADVANCED: string;
  }>({
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  });
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showOptionalVideo, setShowOptionalVideo] = useState(false);

  // ─── Background Music State & Handlers ────────────────────────────────────
  interface CustomMusicItem {
    tempId: number;
    title: string;
    audioUrl: string;
    cloudinaryPublicId?: string;
    fileSizeMb?: string;
    isUploading?: boolean;
    uploadError?: string | null;
  }

  const [defaultMusics, setDefaultMusics] = useState<BackgroundMusicDto[]>([
    { musicId: 2, title: 'Sang trọng (Formal)', audioUrl: 'https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227354/background-music/system/sang_trong.mp3', isSystemDefault: true },
    { musicId: 4, title: 'Sâu lắng (Emotional)', audioUrl: 'https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227359/background-music/system/truyen_cam_hung.mp3', isSystemDefault: true },
    { musicId: 3, title: 'Hào hứng (Energetic)', audioUrl: 'https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227356/background-music/system/soi_dong.mp3', isSystemDefault: true },
    { musicId: 1, title: 'Nhẹ nhàng (Soft Ambient)', audioUrl: 'https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227349/background-music/system/lang_man.mp3', isSystemDefault: true },
  ]);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState<boolean>(false);
  const [savedLessonMusics, setSavedLessonMusics] = useState<BackgroundMusicDto[]>([]);
  const [customMusics, setCustomMusics] = useState<CustomMusicItem[]>([]);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const customMusicInputRef = useRef<HTMLInputElement>(null);

  // Load musics when modal opens
  useEffect(() => {
    if (!isOpen || lessonType !== 'ASSIGNMENT') return;

    let isMounted = true;
    setIsLoadingDefaults(true);

    // Fetch system default musics
    speakingApi.getDefaultMusics()
      .then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setDefaultMusics(res.data);
        }
      })
      .catch((err) => console.warn('Could not load default musics from API, using fallback:', err))
      .finally(() => {
        if (isMounted) setIsLoadingDefaults(false);
      });

    // If editing existing lesson, fetch its custom musics
    if (existingLesson?.lessonId) {
      speakingApi.getMusicsForLesson(existingLesson.lessonId)
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setSavedLessonMusics(res.data.filter((m) => !m.isSystemDefault));
          }
        })
        .catch((err) => console.warn('Could not load lesson musics:', err));
    } else {
      setSavedLessonMusics([]);
    }

    // Cleanup staged musics on modal open
    setCustomMusics([]);

    return () => {
      isMounted = false;
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPlayingAudioUrl(null);
    };
  }, [isOpen, lessonType, existingLesson?.lessonId]);

  // Audio preview toggle
  const handleTogglePreview = (audioUrl: string) => {
    if (playingAudioUrl === audioUrl) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPlayingAudioUrl(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      previewAudioRef.current = audio;
      setPlayingAudioUrl(audioUrl);
      audio.onended = () => {
        setPlayingAudioUrl(null);
      };
      audio.play().catch((err) => {
        console.warn('Audio preview error:', err);
        setPlayingAudioUrl(null);
      });
    }
  };

  const handleSelectCustomMusicFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Dung lượng tập tin nhạc không được vượt quá 5MB.');
      e.target.value = '';
      return;
    }

    const title = file.name.replace(/\.[^/.]+$/, '');
    const tempId = Date.now();
    const tempPreviewUrl = URL.createObjectURL(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    // 1. Thêm ngay vào state với trạng thái isUploading = true để hiển thị spinner
    setCustomMusics((prev) => [
      ...prev,
      {
        tempId,
        title,
        audioUrl: tempPreviewUrl,
        fileSizeMb: sizeMb,
        isUploading: true,
      },
    ]);

    e.target.value = '';

    // 2. Kích hoạt Pre-upload ngay lập tức lên Cloudinary dưới dạng background task
    try {
      const res = await speakingApi.preUploadMusic(file, title);
      if (res.success && res.data) {
        setCustomMusics((prev) =>
          prev.map((m) =>
            m.tempId === tempId
              ? {
                  ...m,
                  audioUrl: res.data.audioUrl,
                  cloudinaryPublicId: res.data.cloudinaryPublicId,
                  isUploading: false,
                }
              : m
          )
        );
      } else {
        setCustomMusics((prev) =>
          prev.map((m) =>
            m.tempId === tempId
              ? {
                  ...m,
                  isUploading: false,
                  uploadError: res.message || 'Lỗi khi tải lên',
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setCustomMusics((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? {
                ...m,
                isUploading: false,
                uploadError: err?.message || 'Không thể tải lên máy chủ',
              }
            : m
        )
      );
    }
  };

  const handleRemoveCustomMusic = (tempId: number) => {
    setCustomMusics((prev) => {
      const target = prev.find((m) => m.tempId === tempId);
      if (target) {
        if (playingAudioUrl === target.audioUrl) {
          if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
          }
          setPlayingAudioUrl(null);
        }
        if (target.audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.audioUrl);
        }
      }
      return prev.filter((m) => m.tempId !== tempId);
    });
  };

  const handleDeleteSavedMusic = async (musicId: number, musicTitle: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài nhạc "${musicTitle}" khỏi bài học này?`)) return;
    try {
      const res = await speakingApi.deleteMusic(musicId);
      if (res.success) {
        setSavedLessonMusics((prev) => prev.filter((m) => m.musicId !== musicId));
        if (playingAudioUrl) {
          const match = savedLessonMusics.find((m) => m.musicId === musicId);
          if (match && playingAudioUrl === match.audioUrl) {
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              previewAudioRef.current = null;
            }
            setPlayingAudioUrl(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to delete music:', err);
      alert('Không thể xóa bài nhạc. Vui lòng thử lại.');
    }
  };


  // Preview the selected local file without uploading it or exposing the saved source URL.
  useEffect(() => {
    if (!selectedFile) {
      setSelectedVideoPreviewUrl(null);
      return;
    }

    const localUrl = URL.createObjectURL(selectedFile);
    setSelectedVideoPreviewUrl(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [selectedFile]);

  // ─── Reset when modal opens / lesson changes ───────────────────────────

  useEffect(() => {
    if (existingLesson) {
      setTitle(existingLesson.title);
      setDescription(existingLesson.description ?? '');
      // videoUrl is a legacy field used only for DOCUMENT links. Never put an
      // R2 playback URL in form state: it is temporary and must not be saved as metadata.
      setVideoUrl(existingLesson.lessonType === 'DOCUMENT' ? (existingLesson.videoUrl ?? '') : '');
      setModuleId(existingLesson.moduleId ?? null);
      setLessonType(existingLesson.lessonType || 'VIDEO');

      // Sync duration with detected duration or content reading time
      let computedMins = existingLesson.durationMinutes;
      try {
        const cached = localStorage.getItem(`mseek_lesson_duration_${existingLesson.lessonId}`);
        if (cached) {
          const sec = parseFloat(cached);
          if (!isNaN(sec) && sec > 0) {
            computedMins = Math.max(1, Math.round(sec / 60));
          }
        } else if (!existingLesson.videoUrl && !existingLesson.hasVideo && (computedMins > 20 || computedMins === 0)) {
          computedMins = calculateDurationFromContent(existingLesson.description ?? '');
        }
      } catch (_) {}

      setDurationMinutes(computedMins);
      setOrderIndex(existingLesson.orderIndex);
      setIsPreview(existingLesson.isPreview);
    } else {
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setModuleId(defaultModuleId ?? (modules.length > 0 ? modules[0].moduleId : null));
      setLessonType(defaultLessonType || 'VIDEO');
      setDurationMinutes(10);
      setOrderIndex(1);
      setIsPreview(false);
      setScriptLevels({
        BEGINNER: '',
        INTERMEDIATE: '',
        ADVANCED: '',
      });
      setScriptDocFile(null);
      setScriptParseError(null);
    }
    setErrorMsg(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
  }, [existingLesson, isOpen, defaultModuleId, defaultLessonType, modules]);
  // ─── Duration calculation & auto-detection ───────────────────────────

  // Auto-calculate reading duration from description text content
  const calculateDurationFromContent = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return 10;
    // Average reading speed ~ 150 words per minute
    return Math.max(1, Math.ceil(words / 150));
  };

  // Auto-detect duration when direct video URL is entered
  useEffect(() => {
    if (!videoUrl || videoUrl.trim() === '') return;

    const isDirectVideo =
      videoUrl.endsWith('.mp4') ||
      videoUrl.endsWith('.webm') ||
      videoUrl.endsWith('.ogg') ||
      videoUrl.includes('r2.cloudflarestorage.com') ||
      videoUrl.includes('res.cloudinary.com') ||
      videoUrl.includes('storage.googleapis.com');

    if (isDirectVideo) {
      try {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.src = videoUrl;
        v.onloadedmetadata = () => {
          if (v.duration && !isNaN(v.duration) && v.duration > 0) {
            const mins = Math.max(1, Math.round(v.duration / 60));
            setDurationMinutes(mins);
          }
        };
      } catch (_) {}
    }
  }, [videoUrl]);

  const handleAutoCalculateDuration = () => {
    if (selectedFile) {
      try {
        const v = document.createElement('video');
        v.preload = 'metadata';
        const objUrl = URL.createObjectURL(selectedFile);
        v.src = objUrl;
        v.onloadedmetadata = () => {
          if (v.duration && v.duration > 0) {
            setDurationMinutes(Math.max(1, Math.round(v.duration / 60)));
          }
          URL.revokeObjectURL(objUrl);
        };
      } catch (_) {}
      return;
    }

    if (videoUrl) {
      const isDirect = !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be');
      if (isDirect) {
        try {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = videoUrl;
          v.onloadedmetadata = () => {
            if (v.duration && v.duration > 0) {
              setDurationMinutes(Math.max(1, Math.round(v.duration / 60)));
            }
          };
        } catch (_) {}
        return;
      }
    }

    // Otherwise calculate from description content
    setDurationMinutes(calculateDurationFromContent(description));
  };

  
  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kich_ban_mau_3_level.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.docx', '.txt', '.md'];
    if (!allowed.includes(ext)) {
      setScriptParseError('Chỉ hỗ trợ tập tin định dạng .docx, .txt hoặc .md');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScriptParseError('Dung lượng tập tin vượt quá giới hạn 10MB.');
      return;
    }

    setScriptDocFile(file);
    setScriptParseError(null);

    // Auto trigger parse immediately
    triggerParseScriptFile(file);
  };

  const triggerParseScriptFile = async (fileToParse: File) => {
    setIsParsingScript(true);
    setScriptParseError(null);
    try {
      const res = await speakingApi.parseScriptFileDirect(fileToParse);
      if (res.success && res.data) {
        const newLevels = {
          BEGINNER: '',
          INTERMEDIATE: '',
          ADVANCED: '',
        };
        res.data.levels.forEach((lvl) => {
          if (lvl.level === 'BEGINNER' || lvl.level === 'INTERMEDIATE' || lvl.level === 'ADVANCED') {
            newLevels[lvl.level] = lvl.content;
          }
        });
        setScriptLevels(newLevels);

        // Auto populate description with beginner content if description is empty
        if (!description.trim() && newLevels.BEGINNER) {
          const cleanDesc = newLevels.BEGINNER.replace(/\[[^\]]*\]/g, '').trim();
          setDescription(cleanDesc);
          setDurationMinutes(calculateDurationFromContent(cleanDesc));
        }
      } else {
        setScriptParseError(res.message || 'Không thể phân tách cấp độ kịch bản từ tập tin.');
      }
    } catch (err: any) {
      setScriptParseError(err.message || 'Lỗi kết nối khi phân tích tập tin.');
    } finally {
      setIsParsingScript(false);
    }
  };

  const hasScriptContent = Boolean(
    scriptLevels?.BEGINNER?.trim() || scriptLevels?.INTERMEDIATE?.trim() || scriptLevels?.ADVANCED?.trim()
  );

  if (!isOpen) return null;

  // ─── File selection ────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(null);
    setUploadError(null);
    setUploadProgress(0);

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setUploadError('Định dạng không hỗ trợ. Vui lòng chọn file video (mp4, webm, mov, avi, mkv).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File quá lớn (${formatBytes(file.size)}). Giới hạn tối đa là 500 MB.`);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    // Auto-detect duration from file
    try {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const objUrl = URL.createObjectURL(file);
      tempVideo.src = objUrl;
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration && !isNaN(tempVideo.duration) && tempVideo.duration > 0) {
          const mins = Math.max(1, Math.round(tempVideo.duration / 60));
          setDurationMinutes(mins);
        }
        URL.revokeObjectURL(objUrl);
      };
    } catch (_) {}
  };

  // ─── Direct upload to R2 (edit mode only) ─────────────────────────────

  // ─── Save form and upload any selected file only after validation ─────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting || isUploading) return;
    setErrorMsg(null);
    if (uploadError && !selectedFile) {
      setErrorMsg(uploadError);
      return;
    }
    setUploadError(null);
    if (!title.trim()) {
      setErrorMsg('Tên bài học / bài tập không được để trống.');
      return;
    }
    if (
      isEditMode &&
      lessonType === 'VIDEO' &&
      existingLesson?.videoUrl &&
      !existingLesson.requiresPlaybackUrl &&
      !selectedFile
    ) {
      setErrorMsg('Bài học này vẫn đang dùng link video cũ. Hãy chọn file video từ thiết bị để chuyển video lên R2 trước khi lưu.');
      return;
    }
    if (lessonType !== 'ASSIGNMENT' && modules.length > 0 && !moduleId) {
      setErrorMsg('Vui lòng chọn chương học cho bài học.');
      return;
    }
    if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1) {
      setErrorMsg('Thời lượng phải là số nguyên từ 1 phút trở lên.');
      return;
    }
    if (lessonType !== 'ASSIGNMENT' && (!Number.isInteger(Number(orderIndex)) || Number(orderIndex) < 1)) {
      setErrorMsg('Thứ tự bài học phải là số nguyên từ 1 trở lên.');
      return;
    }

    submitLockRef.current = true;
    setIsUploading(Boolean(selectedFile));
    setUploadProgress(0);
    try {
      const baseScript =
        scriptLevels?.BEGINNER?.trim() ||
        scriptLevels?.INTERMEDIATE?.trim() ||
        scriptLevels?.ADVANCED?.trim() ||
        description.trim();

      const levelsPayload =
        lessonType === 'ASSIGNMENT' && baseScript
          ? {
              BEGINNER: scriptLevels?.BEGINNER?.trim() || baseScript,
              INTERMEDIATE: scriptLevels?.INTERMEDIATE?.trim() || baseScript,
              ADVANCED: scriptLevels?.ADVANCED?.trim() || baseScript,
            }
          : null;

      const customMusicsPayload = customMusics
        .filter((m) => !m.uploadError && !m.isUploading && m.audioUrl)
        .map((m) => ({
          title: m.title,
          audioUrl: m.audioUrl,
          cloudinaryPublicId: m.cloudinaryPublicId,
        }));
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        // Video lessons are changed only by selecting a file and uploading it.
        // Preserve document links, but never persist a temporary playback URL.
        videoUrl: lessonType === 'DOCUMENT' ? (videoUrl.trim() || undefined) : undefined,
        moduleId: lessonType === 'ASSIGNMENT' ? undefined : (moduleId ?? undefined),
        lessonType,
        durationMinutes: Number(durationMinutes),
        orderIndex: Number(orderIndex) || 1,
        isPreview,
        status: 'ACTIVE',
      }, selectedFile, (percent) => setUploadProgress(percent), levelsPayload, customMusicsPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu bài học. Vui lòng thử lại.';
      if (selectedFile && isEditMode) setUploadError(message);
      else setErrorMsg(message);
    } finally {
      setIsUploading(false);
      submitLockRef.current = false;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  const isVideoLesson = lessonType === 'VIDEO' || lessonType === 'ASSIGNMENT';
  const previewVideoUrl = selectedVideoPreviewUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={isSubmitting || isUploading ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-inner ${lessonType === 'ASSIGNMENT'
              ? 'bg-purple-100 text-purple-600'
              : 'bg-blue-100 text-blue-600'
              }`}>
              {lessonType === 'ASSIGNMENT' ? <Mic2 className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode
                  ? lessonType === 'ASSIGNMENT' ? 'Chỉnh sửa Bài tập nói tổng khóa' : 'Chỉnh sửa bài học'
                  : lessonType === 'ASSIGNMENT' ? 'Tạo Bài tập nói (Speaking Assignment)' : 'Thêm bài học mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {lessonType === 'ASSIGNMENT'
                  ? 'Cấu hình đề bài tập thu âm giọng nói dành cho học viên cuối khóa học'
                  : 'Nhập thông tin bài giảng video hoặc tài liệu học tập'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Row: Module Select & Lesson Type (Only for non-ASSIGNMENT) */}
          {lessonType !== 'ASSIGNMENT' && (
            <div className={`grid grid-cols-1 ${modules.length > 0 ? 'sm:grid-cols-2' : ''} gap-4`}>
              {/* Module Select */}
              {modules.length > 0 && (
                <div>
                  <label htmlFor="lesson-module" className="block text-xs font-bold text-slate-700 mb-1">
                    Chương học (Module) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="lesson-module"
                    required
                    value={moduleId ?? ''}
                    onChange={(e) => setModuleId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
                  >
                    <option value="">-- Chưa phân vào chương --</option>
                    {modules.map((m) => (
                      <option key={m.moduleId} value={m.moduleId}>
                        Chương {m.orderIndex}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lesson Type Select */}
              <div>
                <label htmlFor="lesson-type" className="block text-xs font-bold text-slate-700 mb-1">
                  Loại bài học / Bài tập
                </label>
                <select
                  id="lesson-type"
                  value={lessonType}
                  onChange={(e) => {
                    const nextType = e.target.value as 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT';
                    setLessonType(nextType);
                    if (nextType !== 'VIDEO' && nextType !== 'ASSIGNMENT') {
                      setSelectedFile(null);
                      setUploadError(null);
                      setUploadProgress(0);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                    if (nextType !== 'DOCUMENT') setVideoUrl('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all font-semibold"
                >
                  <option value="VIDEO">📹 Video bài giảng</option>
                  <option value="DOCUMENT">📄 Tài liệu lý thuyết</option>
                  <option value="QUIZ">❓ Bài kiểm tra Quiz</option>
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="lesson-title" className="block text-xs font-bold text-slate-700 mb-1">
              {lessonType === 'ASSIGNMENT' ? 'Tên Bài tập nói tổng khóa' : 'Tên bài học'} <span className="text-red-500">*</span>
            </label>
            <input
              id="lesson-title"
              type="text"
              required
              placeholder={
                lessonType === 'ASSIGNMENT'
                  ? 'Ví dụ: Bài tập nói cuối khóa: Biên soạn & Dẫn trực tiếp tiệc cưới'
                  : 'Ví dụ: Bài 1 - Kỹ thuật lấy hơi bụng và kiểm soát giọng nói'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
            />
          </div>

          {/* ══════════════════════════════════════════════
              VIDEO / AUDIO SECTION
              ══════════════════════════════════════════════ */}
          {/* ══════════════════════════════════════════════════════════════
              SPEAKING ASSIGNMENT: KỊCH BẢN NÓI (3 CẤP ĐỘ)
              ══════════════════════════════════════════════════════════════ */}
          {lessonType === 'ASSIGNMENT' && (
            <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/40 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      KỊCH BẢN NÓI (.docx, .txt, .md) — PHÂN TÁCH 3 CẤP ĐỘ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tải 1 file Word (.docx), Text (.txt) hoặc Markdown (.md), hệ thống C# thuần sẽ tự động chuẩn hóa và tách thành 3 cấp độ (Beginner, Intermediate, Advanced).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải template mẫu (.md)</span>
                </button>
              </div>

              {/* Error if any */}
              {scriptParseError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{scriptParseError}</span>
                </div>
              )}

              {/* Dropzone for Script File (.docx, .txt, .md) */}
              <div
                onClick={() => docInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  scriptDocFile
                    ? 'border-purple-500 bg-purple-100/60 shadow-inner'
                    : 'border-purple-300 hover:border-purple-500 bg-white hover:bg-purple-50/40'
                }`}
              >
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".docx,.txt,.md"
                  onChange={handleDocFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2 shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  {scriptDocFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">{scriptDocFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(scriptDocFile.size / 1024).toFixed(1)} KB · Bấm để đổi file khác
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Kéo thả file kịch bản (.docx, .txt, .md) vào đây hoặc <span className="text-purple-600 underline font-black">bấm để chọn file</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Hỗ trợ file Word (.docx), Văn bản UTF-8 (.txt), Markdown (.md) — Tối đa 10 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isParsingScript && (
                <div className="p-3 bg-white rounded-xl border border-purple-200 flex items-center justify-center gap-2 text-xs font-bold text-purple-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích và bóc tách kịch bản thành 3 cấp độ trong bộ nhớ C#...</span>
                </div>
              )}

              {/* 3-Level Tabs & Inline Editor */}
              {hasScriptContent && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                      <Layers className="h-3.5 w-3.5 text-purple-600" />
                      Xem trước & Hiệu chỉnh 3 Cấp độ
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Có thể chỉnh sửa trực tiếp nội dung từng cấp độ bên dưới
                    </span>
                  </div>

                  {/* Level Switcher Tabs */}
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'BEGINNER', label: '🌱 Dễ (Beginner)', note: 'Đủ hướng dẫn + ngắt nghỉ' },
                        { key: 'INTERMEDIATE', label: '⚡ Trung bình (Inter)', note: 'Chỉ giữ giọng đọc' },
                        { key: 'ADVANCED', label: '🔥 Chuyên nghiệp (Adv)', note: '100% Lời thoại thuần' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveScriptTab(tab.key)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          activeScriptTab === tab.key
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 font-bold scale-[1.01]'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <p className="text-xs">{tab.label}</p>
                        <p className={`text-[10px] truncate ${activeScriptTab === tab.key ? 'text-purple-100' : 'text-slate-400'}`}>
                          {tab.note}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Tab Textarea Editor */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    <textarea
                      rows={6}
                      value={scriptLevels?.[activeScriptTab] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScriptLevels((prev) => ({ ...prev, [activeScriptTab]: val }));
                        // Auto-sync clean text to description
                        if (activeScriptTab === 'BEGINNER' || activeScriptTab === 'ADVANCED') {
                          const clean = val.replace(/\[[^\]]*\]/g, '').trim();
                          setDescription(clean);
                          setDurationMinutes(calculateDurationFromContent(clean));
                        }
                      }}
                      placeholder={`Nhập nội dung cho cấp độ ${activeScriptTab}...`}
                      className="w-full text-xs text-slate-800 leading-relaxed font-mono focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Optional Collapsible for Video Instruction */}
              <div className="pt-2 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setShowOptionalVideo((prev) => !prev)}
                  className="text-xs font-bold text-slate-500 hover:text-purple-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{showOptionalVideo ? 'Ẩn' : '+ Thêm'} Audio / Video hướng dẫn mẫu (Không bắt buộc)</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIDEO SECTION (For VIDEO lessons, or optional for ASSIGNMENT)
              ══════════════════════════════════════════════════════════════ */}
          {(lessonType === 'VIDEO' || (lessonType === 'ASSIGNMENT' && showOptionalVideo)) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lessonType === 'ASSIGNMENT' ? 'Audio / Video hướng dẫn đề bài (tùy chọn)' : 'Video bài giảng'}
                </span>
              </div>

              {/* File upload input */}
              <div className="space-y-3">
                  {/* Drag-and-drop / click zone */}
                  <div
                    onClick={() => {
                      if (!isSubmitting && !isUploading) fileInputRef.current?.click();
                    }}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all ${isSubmitting || isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedFile
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg"
                      className="hidden"
                      disabled={isSubmitting || isUploading}
                      onChange={handleFileChange}
                    />

                    {!selectedFile ? (
                      <>
                        <Upload className="h-8 w-8 text-slate-400" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">
                            Kéo thả file video vào đây hoặc <span className="text-blue-600">bấm để chọn</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Hỗ trợ: MP4, WebM, MOV, AVI, MKV — Tối đa 500 MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <Video className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={isSubmitting || isUploading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setUploadError(null);
                            setUploadProgress(0);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload error */}
                  {uploadError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {uploadError}
                    </div>
                  )}

                  {/* Progress bar */}
                  {isUploading && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">Đang upload lên Cloudflare R2…</span>
                        <span className="text-xs font-bold text-blue-700">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isEditMode ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800 flex items-center gap-2">
                      <CloudUpload className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>Video chỉ được tải lên R2 khi bạn nhấn <strong>Lưu thay đổi</strong>. Có thể hủy trước khi lưu mà không tạo file trên R2.</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>File chỉ được tải lên R2 sau khi bạn nhấn <strong>Tạo bài học</strong>. Có thể hủy trước đó mà không tạo file trên R2.</span>
                    </div>
                  )}
                  {isEditMode && lessonType === 'VIDEO' && existingLesson?.videoUrl && !existingLesson.requiresPlaybackUrl && !selectedFile && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                      Bài học đang tham chiếu video ngoài (Drive/YouTube). Link này không phát trong khu vực học viên; chọn file video mới để chuyển bài học sang R2.
                    </div>
                  )}
              </div>

              {/* Video Live Preview Player */}
              {previewVideoUrl && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-900 p-2.5 shadow-inner space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                    <span className="flex items-center gap-1.5 text-blue-300">
                      <Video className="h-3.5 w-3.5" />
                      Xem trước video đã chọn (chưa tải lên)
                    </span>
                  </div>
                  <video
                    src={previewVideoUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      if (dur && dur > 0) {
                        setDurationMinutes(Math.max(1, Math.round(dur / 60)));
                      }
                    }}
                    className="w-full max-h-56 rounded-lg bg-black border border-slate-800 shadow-md"
                  />
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              DOCUMENT SECTION (Tài liệu lý thuyết)
              ══════════════════════════════════════════════ */}
          {lessonType === 'DOCUMENT' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Đính kèm File tài liệu / Link đọc lý thuyết
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Đường dẫn tài liệu (PDF, Google Docs, Slides...)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... hoặc link tài liệu PDF"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-50 transition-all"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              QUIZ SECTION (Bài kiểm tra Quiz)
              ══════════════════════════════════════════════ */}
          {lessonType === 'QUIZ' && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Bài kiểm tra Trắc nghiệm (Quiz)
                </span>
              </div>
              <p className="text-xs text-purple-700">
                💡 Bài học trắc nghiệm sẽ được tạo thành công. Sau khi lưu, bạn có thể tạo và chỉnh sửa các câu hỏi trắc nghiệm ngay trên giao diện danh sách bài học.
              </p>
            </div>
          )}

          {/* Description / Prompt */}
          <div>
            <label htmlFor="lesson-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {lessonType === 'ASSIGNMENT' ? 'Đề bài / Yêu cầu thu âm (Nội dung học viên sẽ đọc để ghi âm)' : 'Mô tả ngắn bài học'}
            </label>
            <textarea
              id="lesson-desc"
              rows={4}
              placeholder={
                lessonType === 'ASSIGNMENT'
                  ? 'Ví dụ: Kính thưa quan khách hai họ, lời đầu tiên cho phép MC Hoàng Nam gửi lời chào trân trọng nhất. Đề nghị học viên đọc đoạn kịch bản này với giọng ấm áp, vừa phải trong khoảng 2 phút...'
                  : 'Nội dung chính học viên sẽ thu hoạch được sau bài học này...'
              }
              value={description}
              onChange={(e) => {
                const val = e.target.value;
                setDescription(val);
                // Auto-update duration from content if no video is specified
                if (!videoUrl && !selectedFile && !isEditMode) {
                  setDurationMinutes(calculateDurationFromContent(val));
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all resize-none"
            />
          </div>

          {/* Row: Duration & OrderIndex */}
          <div className={`grid ${lessonType === 'ASSIGNMENT' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="lesson-duration" className="block text-xs font-bold text-slate-700">
                  Thời lượng (Phút) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoCalculateDuration}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Tự động tính thời lượng dựa theo Video hoặc độ dài Nội dung bài học"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Tự tính theo {videoUrl || selectedFile ? 'video' : 'nội dung'}</span>
                </button>
              </div>
              <input
                id="lesson-duration"
                type="number"
                min="1"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
              />
              <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                <span>
                  {videoUrl || selectedFile
                    ? 'Tự cập nhật theo video (hoặc bấm nút trên để tính lại).'
                    : 'Tự cập nhật theo độ dài nội dung (ước tính ~150 từ/phút, mặc định 10 phút).'}
                </span>
              </p>
            </div>

            {lessonType !== 'ASSIGNMENT' && (
              <div>
                <label htmlFor="lesson-order" className="block text-xs font-bold text-slate-700 mb-1">
                  Thứ tự bài học (#) <span className="text-red-500">*</span>
                </label>
                <input
                  id="lesson-order"
                  type="number"
                  min="1"
                  required
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all"
                />
              </div>
            )}
          </div>

          {/* IsPreview Checkbox (Only for non-ASSIGNMENT) */}
          {lessonType !== 'ASSIGNMENT' && (
            <div className="flex items-center gap-3 pt-2">
              <input
                id="lesson-ispreview"
                type="checkbox"
                checked={isPreview}
                onChange={(e) => setIsPreview(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="lesson-ispreview" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Cho phép học viên xem thử miễn phí (Free Preview)
              </label>
            </div>
          )}

          {/* =========================================================================
              CARD: CẤU HÌNH NHẠC NỀN LUYỆN NÓI (BACKGROUND MUSIC)
          ========================================================================== */}
          {lessonType === 'ASSIGNMENT' && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-purple-50/20 p-5 space-y-4 shadow-2xs">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Music className="h-4 w-4 text-indigo-600" />
                    <span>🎵 Cấu hình Nhạc nền luyện nói (Background Music)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Nhạc nền giúp học viên cảm nhận nhịp điệu khi luyện đọc kịch bản MC. Nhạc phát riêng qua loa/tai nghe và hoàn toàn <strong className="text-indigo-900 font-bold">KHÔNG lẫn vào file ghi âm nộp bài</strong>.
                  </p>
                </div>
                {isLoadingDefaults && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang tải...</span>
                  </div>
                )}
              </div>

              {/* A. Danh sách 4 bản nhạc hệ thống (System Presets) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Nhạc hệ thống có sẵn (4 bài mặc định):</span>
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    Học viên tự do lựa chọn khi luyện nói
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {defaultMusics.map((music) => {
                    const isPlaying = playingAudioUrl === music.audioUrl;
                    return (
                      <div
                        key={music.musicId}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isPlaying
                            ? 'border-indigo-400 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-indigo-200 shadow-2xs'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Music className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate" title={music.title}>
                              {music.title}
                            </span>
                          </div>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            Mặc định hệ thống
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTogglePreview(music.audioUrl)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            isPlaying
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={isPlaying ? 'Dừng nghe thử' : 'Nghe thử'}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="h-3 w-3 fill-current" />
                              <span>Dừng</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-current" />
                              <span>Nghe thử</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* B. Khu vực Nhạc riêng của bài học (Custom Music) */}
              <div className="space-y-3 pt-2 border-t border-indigo-100/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Nhạc nền riêng của bài học này:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => customMusicInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Tải lên nhạc nền riêng (.mp3, tối đa 5MB)</span>
                  </button>
                  <input
                    ref={customMusicInputRef}
                    type="file"
                    accept=".mp3,audio/mpeg,audio/wav,audio/ogg"
                    className="hidden"
                    onChange={handleSelectCustomMusicFile}
                  />
                </div>

                {/* Danh sách các bài nhạc riêng đã thêm hoặc đã lưu */}
                {(savedLessonMusics.length > 0 || customMusics.length > 0) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Nhạc đã có trên server (nếu đang ở chế độ edit) */}
                    {savedLessonMusics.map((m) => {
                      const isPlaying = playingAudioUrl === m.audioUrl;
                      return (
                        <div
                          key={`saved-${m.musicId}`}
                          className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-all shadow-2xs ${
                            isPlaying ? 'border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-500/20' : 'border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <Music className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate" title={m.title}>
                                {m.title}
                              </span>
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Đã lưu trên bài học
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePreview(m.audioUrl)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isPlaying
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                              <span>{isPlaying ? 'Dừng' : 'Nghe'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSavedMusic(m.musicId, m.title)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa bài nhạc này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Nhạc riêng tự tải lên (Pre-uploaded) */}
                    {customMusics.map((item) => {
                      const isPlaying = playingAudioUrl === item.audioUrl;
                      return (
                        <div
                          key={item.tempId}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            item.uploadError
                              ? 'border-rose-200 bg-rose-50/40'
                              : item.isUploading
                              ? 'border-indigo-300 bg-indigo-50/50 animate-pulse'
                              : isPlaying
                              ? 'border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                              : 'border-indigo-200 bg-white shadow-2xs'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <Music className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate" title={item.title}>
                                {item.title}
                              </span>
                            </div>
                            
                            {item.isUploading ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                <span>Đang tải lên Cloudinary ({item.fileSizeMb} MB)...</span>
                              </span>
                            ) : item.uploadError ? (
                              <span className="inline-block mt-1 text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                                ⚠️ {item.uploadError}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Đã sẵn sàng ({item.fileSizeMb} MB)</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePreview(item.audioUrl)}
                              disabled={item.isUploading}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                                isPlaying
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                              <span>{isPlaying ? 'Dừng' : 'Nghe'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomMusic(item.tempId)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa bài nhạc này"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <p className="text-xs text-slate-500">
                      Chưa tải lên bài nhạc riêng nào. Bài tập này sẽ sử dụng 4 bài nhạc nền hệ thống ở trên.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer ${lessonType === 'ASSIGNMENT'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading && selectedFile ? `Đang lưu và tải video lên R2 (${uploadProgress}%)…` : 'Đang lưu...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode
                    ? (lessonType === 'ASSIGNMENT' ? 'Lưu Bài tập nói' : 'Lưu thay đổi')
                    : (lessonType === 'ASSIGNMENT' ? 'Tạo Bài tập nói' : 'Tạo bài học')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
