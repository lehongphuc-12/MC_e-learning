import { LearnerQuizHistoryActions } from '../../quizzes/pages/LearnerQuizHistoryActions';
// =============================================================================
// CourseLearningPage.tsx — Course Video Player / Learning Page
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Clock,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  Eye,
  Menu,
  X,
  Video,
  FileText,
  MessageSquare,
  Sparkles,
  RotateCcw,
  Layers,
  ChevronDown,
  Award,
  ClipboardList,
  Mic,
  Square,
  Send,
  Volume2,
  AlertCircle,
  Sliders,
  UploadCloud,
  FileAudio,
  Download,
  LockKeyhole,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WaveformVisualizer } from '@/components/ui/waveform-visualizer';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { BackgroundMusicControl } from './BackgroundMusicControl';

import { useCourseDetail } from '../hooks/useInstructorCourses';
import { useCourseLessons } from '../hooks/useLessonQueries';
import { useCourseModules } from '../hooks/useModuleQueries';
import {
  useCourseProgress,
  useUpdateLessonProgress,
} from '../hooks/useLearningQueries';
import {
  useCourseCertificate,
  useIssueCertificate,
} from '../hooks/useCertificateQueries';
import { CertificateModal } from './CertificateModal';
import { CourseChatDrawer } from './CourseChatDrawer';
import { useAuthStore } from '../../../store/useAuthStore';
import { lessonApi } from '../api/lessonApi';

import type { Lesson } from '../types/lessonTypes';
import type { Certificate } from '../types/learningTypes';

import { useQuizzesByCourse } from '../../quizzes/hooks/useQuiz';
import { speakingApi, SpeakingSubmissionDto } from '../api/speakingApi';
import { SpeakingLevel, SpeakingScriptDto } from '../types/speakingTypes';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw as ResetIcon,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Flame,
  Zap,
  Sprout,
  Hourglass,
} from 'lucide-react';
import { request } from '../../../services/api';

// =============================================================================
// LearnerSpeakingWorkspace — Voice Recording & Submission for Learners
// =============================================================================

interface LearnerSpeakingWorkspaceProps {
  lesson: Lesson;
  courseId: number;
  onMarkComplete?: (lessonId: number) => void;
}

const LEVEL_TABS: Array<{
  key: SpeakingLevel;
  icon: string;
  label: string;
  desc: string;
}> = [
  {
    key: 'BEGINNER',
    icon: '🌱',
    label: 'Dễ (Beginner)',
    desc: 'Kèm đầy đủ hướng dẫn & nhịp thở',
  },
  {
    key: 'INTERMEDIATE',
    icon: '⚡',
    label: 'Trung bình (Intermediate)',
    desc: 'Gợi ý ngữ điệu & điểm nhấn',
  },
  {
    key: 'ADVANCED',
    icon: '🔥',
    label: 'Chuyên nghiệp (Advanced)',
    desc: 'Kịch bản thuần, thử thách phản xạ',
  },
];

const LearnerSpeakingWorkspace: React.FC<LearnerSpeakingWorkspaceProps> = ({
  lesson,
  courseId,
  onMarkComplete,
}) => {
  // Submission & Remote State
  const [submission, setSubmission] = useState<SpeakingSubmissionDto | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState<boolean>(true);
  const [scriptData, setScriptData] = useState<SpeakingScriptDto | null>(null);
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(true);

  // Active Practice Level
  const [selectedLevel, setSelectedLevel] = useState<SpeakingLevel>('BEGINNER');

  // Background Music Hook (Independent audio element)
  const bgMusic = useBackgroundMusic(lesson.lessonId);

  // Teleprompter Auto-Scroll Engine (60fps requestAnimationFrame)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1.0); // 0.4x - 2.5x
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('large');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePauseCountdown, setActivePauseCountdown] = useState<number | null>(null);
  const [isPausedByTag, setIsPausedByTag] = useState<boolean>(false);
  const [activeParaIndex, setActiveParaIndex] = useState<number>(0);

  const teleprompterRef = useRef<HTMLDivElement | null>(null);
  const teleprompterWrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const pausedTagsHitRef = useRef<Set<number>>(new Set());
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // High-precision scroll accumulator & Stale-closure avoidance refs
  const speedRef = useRef<number>(scrollSpeed);
  const accumulatedScrollRef = useRef<number>(0);

  // Keep speedRef always in sync with slider state immediately
  useEffect(() => {
    speedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  // Countdown & Auto-Sync State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoScrollOnRecord, setAutoScrollOnRecord] = useState<boolean>(true);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Recording & Hardware State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [learnerNote, setLearnerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReRecording, setIsReRecording] = useState<boolean>(false);

  // Audio Device & Mode
  const [submissionMode, setSubmissionMode] = useState<'MIC' | 'UPLOAD'>('MIC');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Upload Local File State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load connected microphones
  const loadAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioInputs = devices.filter((d) => d.kind === 'audioinput');

      if (audioInputs.length > 0 && audioInputs.some((d) => !d.label)) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach((track) => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((d) => d.kind === 'audioinput');
        } catch (e) {
          // ignore
        }
      }

      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating audio devices:', err);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
      };
    }
  }, []);

  // Fetch script & submission when lesson changes
  useEffect(() => {
    let alive = true;

    // Reset playback & recording
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    pausedTagsHitRef.current.clear();
    setActivePauseCountdown(null);
    setIsPausedByTag(false);

    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }

    // Reset recording states
    setIsRecording(false);
    bgMusic.pause();
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setUploadedFile(null);
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
      setUploadedAudioUrl(null);
    }
    setLearnerNote('');
    setIsReRecording(false);

    // 1. Fetch speaking script (3 levels)
    setIsLoadingScript(true);
    speakingApi
      .getScriptByLesson(lesson.lessonId)
      .then((res) => {
        if (alive) {
          if (res.success && res.data) {
            setScriptData(res.data);
          } else {
            setScriptData(null);
          }
        }
      })
      .catch(() => {
        if (alive) setScriptData(null);
      })
      .finally(() => {
        if (alive) setIsLoadingScript(false);
      });

    // 2. Fetch latest student submission
    setIsLoadingSubmission(true);
    setErrorMsg(null);
    speakingApi
      .getLatestSubmissionByLesson(lesson.lessonId)
      .then((res) => {
        if (alive) {
          if (res.success && res.data) {
            setSubmission(res.data);
            if (res.data.status === 'GRADED' && onMarkComplete) {
              onMarkComplete(lesson.lessonId);
            }
          } else {
            setSubmission(null);
          }
        }
      })
      .catch(() => {
        if (alive) setSubmission(null);
      })
      .finally(() => {
        if (alive) setIsLoadingSubmission(false);
      });

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [lesson.lessonId]);

  // Helper function to strictly filter tags according to each level specification
  const filterContentByLevel = (text: string, level: SpeakingLevel): string => {
    if (!text) return '';
    if (level === 'ADVANCED') {
      // 100% pure script: completely remove any tag enclosed in [...]
      return text.replace(/\[[^\]]+\]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }
    if (level === 'INTERMEDIATE') {
      // Intermediate: keep text + [GIỌNG ĐỌC], completely strip [HƯỚNG DẪN] and [NGẮT NGHỈ]
      let filtered = text.replace(/\[HƯỚNG DẪN:[^\]]*\]/gi, '');
      filtered = filtered.replace(/\[NGẮT NGHỈ:[^\]]*\]/gi, '');
      return filtered.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }
    // BEGINNER: keep text + all guidance tags
    return text.trim();
  };

  // Active level script text with guaranteed level-based filtering & multi-tier fallback
  const currentLevelContent = useMemo(() => {
    let raw = '';

    // 1. Check if the exact selectedLevel has non-empty content
    if (scriptData && scriptData.levels && scriptData.levels.length > 0) {
      const matched = scriptData.levels.find((l) => l.level === selectedLevel);
      if (matched && matched.content && matched.content.trim()) {
        raw = matched.content.trim();
      }
    }

    // 2. If current level is empty or whitespace, fallback to ANY other level in scriptData with content (e.g. ADVANCED)
    if (!raw && scriptData && scriptData.levels && scriptData.levels.length > 0) {
      const anyLevelWithContent = scriptData.levels.find(
        (l) => l.content && l.content.trim().length > 0
      );
      if (anyLevelWithContent && anyLevelWithContent.content) {
        raw = anyLevelWithContent.content.trim();
      }
    }

    // 3. Fallback to lesson.description if still empty
    if (!raw && lesson.description && lesson.description.trim()) {
      raw = lesson.description.trim();
    }

    // 4. Default fallback sample script if all sources are completely empty
    if (!raw) {
      raw = 'Kính thưa toàn thể quý vị đại biểu, các vị khách quý cùng toàn thể cán bộ nhân viên đã có mặt đông đủ trong buổi lễ ngày hôm nay! Lời đầu tiên, cho phép tôi được gửi đến quý vị lời chào trân trọng nhất. Chúc buổi lễ diễn ra thành công tốt đẹp.';
    }

    return filterContentByLevel(raw, selectedLevel);
  }, [scriptData, selectedLevel, lesson.description]);

  // Clean script for scoring (without any [...] tags)
  const cleanScriptForScoring = useMemo(() => {
    if (scriptData && scriptData.levels) {
      const matched = scriptData.levels.find((l) => l.level === selectedLevel);
      if (matched?.cleanScriptForScoring && matched.cleanScriptForScoring.trim()) {
        return matched.cleanScriptForScoring.trim();
      }
      const anyLevel = scriptData.levels.find((l) => l.cleanScriptForScoring && l.cleanScriptForScoring.trim());
      if (anyLevel?.cleanScriptForScoring && anyLevel.cleanScriptForScoring.trim()) {
        return anyLevel.cleanScriptForScoring.trim();
      }
    }
    return currentLevelContent.replace(/\[[^\]]*\]/g, '').trim();
  }, [scriptData, selectedLevel, currentLevelContent]);

  // Interface for Teleprompter Structured Spoken Lines
  interface TeleprompterCueItem {
    id: number;
    text: string;
    guide?: string;
    tone?: string;
    pauseSeconds?: number;
  }

  // Segment script by punctuation (, . ! ? ;) and associate tags as lightweight cues
  const teleprompterItems = useMemo<TeleprompterCueItem[]>(() => {
    if (!currentLevelContent) return [];

    const rawLines = currentLevelContent.split('\n').map((l) => l.trim()).filter(Boolean);
    const items: TeleprompterCueItem[] = [];
    let pendingGuide: string | undefined = undefined;
    let pendingTone: string | undefined = undefined;

    for (const line of rawLines) {
      // 1. Standalone Guide Tag
      if (line.startsWith('[HƯỚNG DẪN:')) {
        if (selectedLevel === 'BEGINNER') {
          pendingGuide = line.replace(/\[HƯỚNG DẪN:\s*|\]/gi, '').trim();
        }
        continue;
      }

      // 2. Standalone Tone Tag
      if (line.startsWith('[GIỌNG ĐỌC:')) {
        if (selectedLevel !== 'ADVANCED') {
          pendingTone = line.replace(/\[GIỌNG ĐỌC:\s*|\]/gi, '').trim();
        }
        continue;
      }

      // 3. Standalone Pause Tag
      if (line.startsWith('[NGẮT NGHỈ:')) {
        if (selectedLevel === 'BEGINNER' && items.length > 0) {
          const m = line.match(/\[NGẮT NGHỈ:\s*(\d+)\s*giây\]/i);
          items[items.length - 1].pauseSeconds = m ? parseInt(m[1], 10) : 2;
        }
        continue;
      }

      // 4. Line with spoken text and possible embedded tags
      let currentGuide = pendingGuide;
      pendingGuide = undefined;
      let currentTone = pendingTone;
      pendingTone = undefined;

      let textOnly = line;
      let linePause: number | undefined = undefined;

      // Extract embedded pause tag
      textOnly = textOnly.replace(/\[NGẮT NGHỈ:\s*(\d+)\s*giây\]/gi, (_, s) => {
        if (selectedLevel === 'BEGINNER') linePause = parseInt(s, 10);
        return '';
      });

      // Extract embedded guide tag
      textOnly = textOnly.replace(/\[HƯỚNG DẪN:[^\]]*\]/gi, (g) => {
        if (selectedLevel === 'BEGINNER' && !currentGuide) {
          currentGuide = g.replace(/\[HƯỚNG DẪN:\s*|\]/gi, '').trim();
        }
        return '';
      });

      // Extract embedded tone tag
      textOnly = textOnly.replace(/\[GIỌNG ĐỌC:[^\]]*\]/gi, (t) => {
        if (selectedLevel !== 'ADVANCED' && !currentTone) {
          currentTone = t.replace(/\[GIỌNG ĐỌC:\s*|\]/gi, '').trim();
        }
        return '';
      });

      // Strip any other tags for ADVANCED level
      if (selectedLevel === 'ADVANCED') {
        textOnly = textOnly.replace(/\[[^\]]+\]/g, '');
      }

      textOnly = textOnly.trim();
      if (!textOnly) continue;

      // Automatically break into new lines after punctuation: comma (,), period (.), exclamation (!), question (?), semicolon (;)
      // Regex captures tokens ending with delimiter, e.g. "Kính thưa toàn thể quý vị đại biểu,"
      const clauses = textOnly.match(/[^,.?!;]+(?:[,.?!;]+|$)/g) || [textOnly];
      const cleanedClauses = clauses.map((c) => c.trim()).filter(Boolean);

      cleanedClauses.forEach((clause, cIdx) => {
        items.push({
          id: items.length,
          text: clause,
          guide: cIdx === 0 ? currentGuide : undefined,
          tone: cIdx === 0 ? currentTone : undefined,
          pauseSeconds: cIdx === cleanedClauses.length - 1 ? linePause : undefined,
        });
        currentGuide = undefined;
        currentTone = undefined;
      });
    }

    return items;
  }, [currentLevelContent, selectedLevel]);

  // Auto-scroll loop using requestAnimationFrame with sub-pixel float accumulator
  useEffect(() => {
    if (!isPlaying || isPausedByTag) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const container = teleprompterRef.current;
    if (!container) return;

    // Initialize accumulator to actual current scrollTop to prevent jumps
    accumulatedScrollRef.current = container.scrollTop;
    lastTimestampRef.current = performance.now();

    // BASE_SPEED: 0.55 px per frame at 60fps (~33 px/s at 1.0x) - natural, comfortable speaking pace
    const BASE_SPEED = 0.55;

    const loop = (timestamp: number) => {
      if (!teleprompterRef.current) return;

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Normalize delta against 60fps (16.67ms) to keep speed consistent on 60Hz/120Hz/144Hz displays
      const deltaFactor = delta > 0 && delta < 100 ? delta / 16.67 : 1;

      // High-precision sub-pixel step: avoids browser integer truncation when speed < 0.9x
      const step = BASE_SPEED * speedRef.current * deltaFactor;
      accumulatedScrollRef.current += step;
      teleprompterRef.current.scrollTop = accumulatedScrollRef.current;

      const currentContainer = teleprompterRef.current;
      const containerRect = currentContainer.getBoundingClientRect();
      const triggerLine = containerRect.top + containerRect.height * 0.35; // 35% viewport trigger

      // Calculate active highlighted spoken line
      const lineEls = currentContainer.querySelectorAll<HTMLDivElement>('[data-line-id]');
      lineEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerLine && rect.bottom >= triggerLine) {
          const idx = Number(el.dataset.lineId || 0);
          setActiveParaIndex(idx);
        }
      });

      // Pause Tag Detection: ONLY FOR BEGINNER LEVEL
      if (selectedLevel === 'BEGINNER') {
        const pauseEls = currentContainer.querySelectorAll<HTMLElement>('[data-pause-seconds]');
        for (let i = 0; i < pauseEls.length; i++) {
          const el = pauseEls[i];
          const tagId = Number(el.dataset.pauseId);
          if (pausedTagsHitRef.current.has(tagId)) continue;

          const rect = el.getBoundingClientRect();
          // Check if pause tag reached the trigger line
          if (rect.top <= triggerLine && rect.bottom >= triggerLine - 40) {
            pausedTagsHitRef.current.add(tagId);
            const seconds = parseInt(el.dataset.pauseSeconds || '2', 10);

            // Pause Teleprompter
            setIsPausedByTag(true);
            setActivePauseCountdown(seconds);

            let remaining = seconds;
            if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
            pauseTimerRef.current = setInterval(() => {
              remaining -= 1;
              if (remaining <= 0) {
                if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
                setActivePauseCountdown(null);
                setIsPausedByTag(false);
                // Resync accumulator after pause
                if (teleprompterRef.current) {
                  accumulatedScrollRef.current = teleprompterRef.current.scrollTop;
                }
              } else {
                setActivePauseCountdown(remaining);
              }
            }, 1000);

            return; // stop RAF loop during pause
          }
        }
      }

      // Check if reached bottom
      if (currentContainer.scrollTop + currentContainer.clientHeight >= currentContainer.scrollHeight - 5) {
        setIsPlaying(false);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, isPausedByTag, selectedLevel]);

  const handleResetScroll = () => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    pausedTagsHitRef.current.clear();
    setActivePauseCountdown(null);
    setIsPausedByTag(false);
    setActiveParaIndex(0);
    accumulatedScrollRef.current = 0;
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFullscreen = () => {
    if (!teleprompterWrapperRef.current) return;
    if (!document.fullscreenElement) {
      teleprompterWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Audio Recording Handlers
  const executeActualStartRecording = async () => {
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Play background music if learner selected one
      if (bgMusic.selectedMusicId) {
        void bgMusic.play();
      }

      // Auto scroll teleprompter if enabled
      if (autoScrollOnRecord && !isPlaying) {
        setIsPlaying(true);
      }

      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error opening microphone:', err);
      setErrorMsg('Không thể truy cập Micrô! Vui lòng cấp quyền sử dụng micrô trên trình duyệt.');
    }
  };

  const handleStartRecording = () => {
    if (isRecording || countdown !== null) return;
    setErrorMsg(null);

    // 3.. 2.. 1.. Studio countdown before recording & auto-scrolling
    setCountdown(3);
    let current = 3;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        executeActualStartRecording();
      } else {
        setCountdown(current);
      }
    }, 1000);
  };

  const handleSkipCountdown = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdown(null);
    executeActualStartRecording();
  };

  const handleStopRecording = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      setCountdown(null);
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      bgMusic.pause();
      if (autoScrollOnRecord) {
        setIsPlaying(false);
      }
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
    }
  };

  const handleResetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext) && !file.type.startsWith('audio/')) {
      setErrorMsg('Vui lòng chọn file âm thanh hợp lệ (.mp3, .wav, .m4a, .ogg, .webm, .aac)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Dung lượng file vượt quá 50MB.');
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);
  };

  const handleResetUploadedFile = () => {
    setUploadedFile(null);
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
      setUploadedAudioUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitAssignment = async () => {
    const fileToUpload = submissionMode === 'MIC' ? audioBlob : uploadedFile;
    if (!fileToUpload) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('LessonId', lesson.lessonId.toString());

      if (fileToUpload instanceof File) {
        formData.append('AudioFile', fileToUpload, fileToUpload.name);
      } else {
        formData.append('AudioFile', fileToUpload, `speaking_record_${Date.now()}.webm`);
      }

      if (learnerNote.trim()) {
        formData.append('Note', learnerNote.trim());
      }

      const res = await speakingApi.submitSpeakingAssignment(formData);
      if (res.success && res.data) {
        setSubmission(res.data);
        setIsReRecording(false);
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        setUploadedFile(null);
        if (uploadedAudioUrl) {
          URL.revokeObjectURL(uploadedAudioUrl);
          setUploadedAudioUrl(null);
        }
        if (res.data.status === 'GRADED' && onMarkComplete) {
          onMarkComplete(lesson.lessonId);
        }
      } else {
        setErrorMsg(res.message || 'Không thể nộp bài thu âm. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Submit speaking assignment error:', err);
      setErrorMsg('Đã xảy ra lỗi khi nộp bài ghi âm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] text-slate-900 overflow-y-auto scrollbar-thin">
      {/* ── Top Bar: Title & Level Switcher ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 md:px-8 shadow-xs sticky top-0 z-30">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-1">
              <Mic className="w-3.5 h-3.5" />
              <span>PHÒNG LUYỆN NÓI STUDIO TELEPROMPTER</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {lesson.title}
              {lesson.isLocked && (
                <span className="ml-2 text-xs font-semibold text-slate-400">· Chưa mở khóa</span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Thời lượng: {lesson.durationMinutes || 15} phút</span>
            </div>
          </div>
        </div>

        {/* ── 4.1 Bộ chọn Level (Level Switcher Tabs) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {LEVEL_TABS.map((tab) => {
            const isSelected = selectedLevel === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedLevel(tab.key);
                  handleResetScroll();
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.01]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tab.icon}</span>
                  <div>
                    <h4 className="text-xs font-black tracking-tight">{tab.label}</h4>
                    <p
                      className={`text-[11px] ${
                        isSelected ? 'text-blue-100 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {tab.desc}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className="mx-5 md:mx-8 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Existing Graded / Submitted Banner ── */}
      {submission && !isReRecording && (
        <div className="mx-5 md:mx-8 mt-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {submission.status === 'GRADED' ? (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ĐÃ ĐƯỢC CHẤM ĐIỂM
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  ĐÃ NỘP - CHỜ GIẢNG VIÊN ĐÁNH GIÁ
                </span>
              )}
            </div>

            <button
              onClick={() => setIsReRecording(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer border border-blue-200"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Luyện tập lại / Thu lại bài</span>
            </button>
          </div>

          {submission.status === 'GRADED' && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Điểm số đạt được:
                </span>
                <p className="text-2xl font-black text-emerald-700">
                  {submission.score} <span className="text-sm font-semibold text-emerald-500">/ 100</span>
                </p>
                {submission.feedback && (
                  <p className="text-xs text-emerald-900 italic mt-1">
                    "{submission.feedback}"
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-emerald-800">
                {submission.gradedByName && <p>Chấm bởi: <b>{submission.gradedByName}</b></p>}
              </div>
            </div>
          )}

          {submission.audioUrl && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">Bản ghi âm đã nộp:</p>
              <audio src={submission.audioUrl} controls className="w-full h-10" />
            </div>
          )}
        </div>
      )}

      {/* ── Main Area: Teleprompter Studio & Integrated Action Bar (4.2 & 4.3) ── */}
      <div className="p-4 md:p-8 flex-1 flex flex-col space-y-3">
        <div
          ref={teleprompterWrapperRef}
          className={`rounded-3xl border border-slate-300/80 bg-slate-900 text-white shadow-2xl flex flex-col overflow-hidden transition-all relative ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[540px] md:h-[620px]'
          }`}
        >
          {/* 3.. 2.. 1.. Countdown Overlay before Auto Recording & Auto Scrolling */}
          {countdown !== null && (
            <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
              <div className="relative flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
                <span className="absolute text-6xl font-black text-white font-mono animate-pulse">
                  {countdown}
                </span>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-200">
                Chuẩn bị lấy hơi... Kịch bản và thu âm sẽ tự động bắt đầu!
              </p>
              <button
                type="button"
                onClick={handleSkipCountdown}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 font-semibold cursor-pointer transition-all"
              >
                Bỏ qua đếm ngược & Thu ngay
              </button>
            </div>
          )}

          {/* Teleprompter Top Control Bar */}
          <div className="px-3.5 py-2.5 bg-slate-800/95 border-b border-slate-700 flex flex-nowrap items-center justify-between gap-2 z-10 backdrop-blur-md overflow-x-auto">
            {/* Play / Pause / Reset */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-md whitespace-nowrap shrink-0 ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>TẠM DỪNG</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>CUỘN CHỮ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetScroll}
                className="p-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                title="Cuộn về đầu"
              >
                <ResetIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Slider Control */}
            <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-700/60 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                Tốc độ: <b className="text-blue-400 font-mono">{scrollSpeed.toFixed(1)}x</b>
              </span>
              <input
                type="range"
                min={0.4}
                max={2.0}
                step={0.1}
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                className="w-16 sm:w-24 md:w-28 accent-blue-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Font size toggle & Fullscreen - Fix cứng width để không bao giờ bị nhảy dòng */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFontSize((s) => (s === 'normal' ? 'large' : 'normal'))}
                className="w-[125px] py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 border border-slate-600/40"
              >
                Cỡ chữ: {fontSize === 'large' ? 'To (Studio)' : 'Vừa'}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Studio Focus Eye Line indicator */}
          <div className="absolute top-[35%] left-0 right-0 h-12 bg-blue-500/10 pointer-events-none border-y border-blue-400/20 z-0 flex items-center justify-between px-4">
            <span className="text-[9px] font-bold tracking-widest text-blue-400/50 uppercase">
              TIÊU ĐIỂM ĐỌC
            </span>
            <span className="text-[9px] font-bold tracking-widest text-blue-400/50 uppercase">
              STUDIO FOCUS LINE
            </span>
          </div>

          {/* ── Scrollable Script Content Viewport (Tự động xuống dòng theo dấu phẩy & chấm) ── */}
          <div
            ref={teleprompterRef}
            onScroll={(e) => { if (!isPlaying) accumulatedScrollRef.current = e.currentTarget.scrollTop; }}
            className="flex-1 overflow-y-auto px-6 md:px-16 pt-16 pb-44 space-y-3.5 scrollbar-none select-none"
            style={{ scrollBehavior: 'auto' }}
          >
            {isLoadingScript ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs">Đang chuẩn bị kịch bản studio...</p>
              </div>
            ) : teleprompterItems.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-base font-semibold">Chưa có kịch bản cho cấp độ này.</p>
              </div>
            ) : (
              teleprompterItems.map((item) => {
                const isActive = activeParaIndex === item.id;
                const isCurrentPaused = isPausedByTag && activePauseCountdown !== null && item.pauseSeconds;

                return (
                  <div
                    key={item.id}
                    data-line-id={item.id}
                    className={`transition-all duration-200 py-1.5 px-3 rounded-xl ${
                      isActive
                        ? 'text-white scale-[1.02] drop-shadow-md'
                        : 'opacity-30 text-slate-400 hover:opacity-70'
                    }`}
                  >
                    {/* Thẻ Hướng dẫn & Giọng đọc: CHỈ là chip siêu nhỏ (11-12px) nằm ngay trên câu, KHÔNG viền to, KHÔNG chiếm chỗ */}
                    {(item.guide || item.tone) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1 select-none">
                        {item.guide && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-amber-400/10 text-amber-300 border border-amber-400/20 italic">
                            💡 {item.guide}
                          </span>
                        )}
                        {item.tone && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 italic">
                            🎙️ {item.tone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* LỜI THOẠI CHÍNH: To, rõ nét (1.5rem - 1.875rem), ngắt theo dấu phẩy & chấm */}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p
                        className={`font-extrabold tracking-tight transition-colors duration-200 ${
                          fontSize === 'large'
                            ? 'text-2xl md:text-3xl leading-snug'
                            : 'text-xl md:text-2xl leading-normal'
                        } ${isActive ? 'text-white' : 'text-slate-300'}`}
                      >
                        {item.text}
                      </p>

                      {/* Thẻ Ngắt nghỉ: Gắn nhỏ gọn ở cuối vế câu, khi chạm tới chỉ hover nhẹ lên, KHÔNG giật giật nháy nháy */}
                      {item.pauseSeconds && (
                        <span
                          data-pause-id={item.id}
                          data-pause-seconds={item.pauseSeconds}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold transition-all duration-300 select-none ${
                            isCurrentPaused
                              ? 'bg-amber-400/30 text-amber-200 border border-amber-300/50 scale-105 shadow-xs'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-400/25'
                          }`}
                        >
                          ⏳ {isCurrentPaused ? `Nghỉ (${activePauseCountdown}s)...` : `${item.pauseSeconds}s`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Extra padding at bottom so last text reaches focus line */}
            <div className="h-44" />
          </div>

          {/* ── 4.3 Integrated Bottom Action Bar (Cố định ở chân khung Teleprompter) ── */}
          <div className="border-t border-slate-700/80 bg-slate-900/95 px-4 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 z-10 backdrop-blur-md">
            {/* Left: Record Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {submissionMode === 'MIC' ? (
                <>
                  {!isRecording && !audioBlob && (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={countdown !== null}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-500/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4 fill-current" />
                      <span>{countdown !== null ? `BẮT ĐẦU TRONG ${countdown}S...` : 'BẮT ĐẦU THU ÂM'}</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-500/60 text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                    >
                      <Square className="w-4 h-4 fill-current text-rose-500" />
                      <span>DỪNG THU ÂM</span>
                    </button>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <audio src={audioUrl || ''} controls className="h-8 w-36 sm:w-44 shrink-0" />
                      <button
                        type="button"
                        onClick={handleResetRecording}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                        title="Thu lại từ đầu"
                      >
                        Thu lại
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Upload local file */
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.ogg,.webm,.aac"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="flex items-center gap-2">
                      <audio src={uploadedAudioUrl || ''} controls className="h-8 w-36 sm:w-44" />
                      <button
                        type="button"
                        onClick={handleResetUploadedFile}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
                        title="Bỏ chọn file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                      <span>Chọn file MP3/Audio</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Middle: Fixed Tabular Timer & Waveform (Không giật layout) */}
            <div className="flex items-center gap-2.5 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-700/60 shrink-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isRecording ? 'bg-rose-500 shadow-sm shadow-rose-500/80 ring-2 ring-rose-500/30' : 'bg-slate-600'
                }`}
              />
              <span className="tabular-nums font-mono w-14 text-center text-xs font-black text-slate-200 shrink-0">
                {formatTime(recordingTime)}
              </span>
              <div className="w-24 sm:w-32 h-6 flex items-center justify-center overflow-hidden shrink-0">
                <WaveformVisualizer
                  isPlaying={isRecording}
                  barCount={16}
                  barColor={isRecording ? 'bg-rose-500' : 'bg-slate-600'}
                  size="sm"
                />
              </div>
            </div>

            {/* Right: Background Music, Submit Button & Auto Scroll Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <BackgroundMusicControl
                musics={bgMusic.musics}
                selectedMusicId={bgMusic.selectedMusicId}
                setSelectedMusicId={bgMusic.setSelectedMusicId}
                volume={bgMusic.volume}
                changeVolume={bgMusic.changeVolume}
                isLoading={bgMusic.isLoading}
              />

              <label className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScrollOnRecord}
                  onChange={(e) => setAutoScrollOnRecord(e.target.checked)}
                  className="rounded accent-blue-500"
                />
                <span>Tự cuộn khi thu</span>
              </label>

              {submissionMode === 'MIC' && audioDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 max-w-[120px] truncate focus:outline-none shrink-0"
                >
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Micro ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || (!audioBlob && !uploadedFile)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang nộp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>NỘP BÀI THI NÓI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sub-bar: Input Mode (Mic vs MP3) & Note to Instructor ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 shrink-0">Nguồn thu:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSubmissionMode('MIC')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  submissionMode === 'MIC'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Micro trực tiếp
              </button>
              <button
                type="button"
                onClick={() => setSubmissionMode('UPLOAD')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  submissionMode === 'UPLOAD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tải file MP3 / Audio
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-[200px]">
            <span className="font-bold text-slate-500 shrink-0">Ghi chú gửi giảng viên:</span>
            <input
              type="text"
              value={learnerNote}
              onChange={(e) => setLearnerNote(e.target.value)}
              placeholder="Nhập ghi chú cho bài nộp (không bắt buộc)..."
              className="flex-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export function getEmbedVideoUrl(url?: string): string | null {
  if (!url) return null;

  // Handle YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    
    try {
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      const urlObj = new URL(formattedUrl);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname === '/watch') {
          videoId = urlObj.searchParams.get('v') || '';
        } else if (urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1];
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1];
        } else if (urlObj.pathname.startsWith('/v/')) {
          videoId = urlObj.pathname.split('/v/')[1];
        }
      } else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      }
    } catch (e) {
      // Fallback regex if URL parsing fails
      const ytMatch = url.match(/(?:youtu\.be\/|v\/|u\/\w+\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
      if (ytMatch && ytMatch[1]) {
        videoId = ytMatch[1];
      }
    }

    if (videoId) {
      // Origin is required for enablejsapi=1 to work properly without errors
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
    }
  }

  // Handle Vimeo
  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch && vimeoMatch[3]) {
      return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&api=1&player_id=video-player-iframe`;
    }
  }

  // Handle Google Drive
  if (url.includes('drive.google.com')) {
    const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
    }
  }

  return url;
}

/** Only these provider hosts are embeds; signed R2 URLs are direct video sources. */
function isThirdPartyVideoUrl(url?: string): boolean {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'youtu.be' ||
      hostname === 'youtube.com' || hostname.endsWith('.youtube.com') ||
      hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com') ||
      hostname === 'drive.google.com' || hostname === 'docs.google.com';
  } catch {
    return false;
  }
}

export const CourseLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const courseId = id ? Number(id) : 0;

  const initialLessonId = searchParams.get('lessonId')
    ? Number(searchParams.get('lessonId'))
    : null;

  const user = useAuthStore((state) => state.user);

  // ===========================================================================
  // Data fetching
  // ===========================================================================

  const {
    data: course,
    isLoading: isCourseLoading,
  } = useCourseDetail(courseId);

  const {
    data: lessons = [],
    isLoading: isLessonsLoading,
  } = useCourseLessons(courseId);

  const { data: modules = [] } = useCourseModules(courseId);
  const learningQueryClient = useQueryClient();
  useEffect(() => { void learningQueryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] }); }, [courseId, learningQueryClient]);

  const {
    data: quizzes = [],
    isLoading: isQuizzesLoading,
  } = useQuizzesByCourse(courseId);

  // Real progress & certificate queries
  const { data: progressData } = useCourseProgress(courseId);

  const updateProgressMutation =
    useUpdateLessonProgress(courseId);

  const { data: certificate } =
    useCourseCertificate(courseId);

  const issueCertMutation =
    useIssueCertificate(courseId);

  // Real materials attached to the course or current lesson.
  const [courseMaterials, setCourseMaterials] = useState<Array<{ materialId: number; lessonId: number | null; title: string; fileUrl: string; materialType: string | null }>>([]);
  const [materialsError, setMaterialsError] = useState(false);
  useEffect(() => {
    let alive = true;
    setCourseMaterials([]);
    setMaterialsError(false);
    if (!courseId || !user?.id) return;
    request<{ success: boolean; data: Array<{ materialId: number; lessonId: number | null; title: string; fileUrl: string; materialType: string | null }> }>(`/courses/${courseId}/materials`)
      .then(res => { if (alive) setCourseMaterials(res.data ?? []); })
      .catch(() => { if (alive) setMaterialsError(true); });
    return () => { alive = false; };
  }, [courseId, user?.id]);

  // ===========================================================================
  // Sort modules by orderIndex
  // ===========================================================================

  const sortedModules = useMemo(() => {
    return [...modules].sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );
  }, [modules]);

  // ===========================================================================
  // Organize lessons by module and build a single sequential orderedLessons
  // ===========================================================================

  const {
    lessonsByModule,
    unassignedLessons,
    speakingAssignmentLessons,
    orderedLessons,
  } = useMemo(() => {
    const byMod: Record<number, Lesson[]> = {};
    const unassigned: Lesson[] = [];
    const speakingAssignments: Lesson[] = [];

    lessons.forEach((l) => {
      const isAssignment = l.lessonType?.toUpperCase() === 'ASSIGNMENT';

      if (isAssignment) {
        speakingAssignments.push(l);
      } else if (l.moduleId) {
        if (!byMod[l.moduleId]) {
          byMod[l.moduleId] = [];
        }

        byMod[l.moduleId].push(l);
      } else {
        unassigned.push(l);
      }
    });

    // Sort lessons inside each module by orderIndex
    Object.keys(byMod).forEach((modIdKey) => {
      const modId = Number(modIdKey);

      byMod[modId].sort(
        (a, b) =>
          (a.orderIndex ?? 0) -
          (b.orderIndex ?? 0),
      );
    });

    unassigned.sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );

    speakingAssignments.sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );

    // Construct flat ordered list following module sequence
    const ordered: Lesson[] = [];

    sortedModules.forEach((mod) => {
      if (byMod[mod.moduleId]) {
        ordered.push(...byMod[mod.moduleId]);
      }
    });

    ordered.push(...unassigned);
    ordered.push(...speakingAssignments);

    // Fallback if modules aren't used yet
    const finalOrdered =
      ordered.length > 0
        ? ordered
        : [...lessons].sort(
            (a, b) =>
              (a.orderIndex ?? 0) -
              (b.orderIndex ?? 0),
          );

    return {
      lessonsByModule: byMod,
      unassignedLessons: unassigned,
      speakingAssignmentLessons: speakingAssignments,
      orderedLessons: finalOrdered,
    };
  }, [lessons, sortedModules]);

  // ===========================================================================
  // Active state
  // ===========================================================================

  const [activeLesson, setActiveLesson] =
    useState<Lesson | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const pendingVideoPositionRef = useRef<number | null>(null);
  const shouldResumeVideoRef = useRef(false);
  const retriedPlaybackLessonRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeLesson) return;
    const refreshed = orderedLessons.find(l => l.lessonId === activeLesson.lessonId);
    if (refreshed?.isLocked) {
      setActiveLesson(orderedLessons.find(l => !l.isLocked) || null);
    } else if (refreshed && (refreshed.isLocked !== activeLesson.isLocked || refreshed.videoUrl !== activeLesson.videoUrl)) {
      setActiveLesson(refreshed);
    }
  }, [orderedLessons, activeLesson]);

  const lessonMaterials = courseMaterials.filter(m => m.lessonId == null || (activeLesson?.isLocked !== true && m.lessonId === activeLesson?.lessonId));

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(true);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'overview' | 'notes' | 'discussion'>(
      'overview',
    );

  const [completedLessonIds, setCompletedLessonIds] =
    useState<number[]>([]);

  const [isVideoEnded, setIsVideoEnded] =
    useState(false);

  const [isCertModalOpen, setIsCertModalOpen] =
    useState(false);

  const [activeCert, setActiveCert] =
    useState<Certificate | null>(null);

  // Accordion state for sidebar modules
  const [collapsedModules, setCollapsedModules] =
    useState<Record<number, boolean>>({});

  // Dynamic video durations in seconds (mapped by lessonId)
  const [detectedDurations, setDetectedDurations] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mseek_lesson_duration_')) {
          const lId = Number(key.replace('mseek_lesson_duration_', ''));
          const val = parseFloat(localStorage.getItem(key) || '');
          if (!isNaN(lId) && !isNaN(val) && val > 0) {
            initial[lId] = val;
          }
        }
      }
    } catch (_) {}
    return initial;
  });

  const handleSaveLessonDuration = (lessonId: number, durationSec: number) => {
    if (!lessonId || isNaN(durationSec) || durationSec <= 0) return;
    const rounded = Math.round(durationSec);
    try {
      localStorage.setItem(`mseek_lesson_duration_${lessonId}`, rounded.toString());
    } catch (_) {}
    setDetectedDurations((prev) => {
      if (prev[lessonId] === rounded) return prev;
      return { ...prev, [lessonId]: rounded };
    });
  };

  // Pre-load durations for direct video files in the playlist in background
  useEffect(() => {
    orderedLessons.forEach((l) => {
      if (l.hasVideo) {
        if (detectedDurations[l.lessonId]) return;

        // Learner DTOs no longer expose source URLs; signed playback URLs are requested per active lesson.
        if (l.videoUrl && !getEmbedVideoUrl(l.videoUrl)) {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = l.videoUrl;
          v.onloadedmetadata = () => {
            if (v.duration && !isNaN(v.duration) && v.duration > 0) {
              handleSaveLessonDuration(l.lessonId, v.duration);
            }
          };
        }
      }
    });
  }, [orderedLessons, detectedDurations]);

  // Format lesson duration: if no video => calculate by content or default '10 phút', if has video => actual video duration
  const getLessonDuration = (lesson?: Lesson | null): string => {
    if (!lesson) return '10 phút';
    const hasVideo = !!(
      lesson.hasVideo &&
      lesson.lessonType?.toUpperCase() !== 'ASSIGNMENT'
    );
    if (!hasVideo) {
      // Calculate according to content length
      const desc = (lesson.description || '').trim();
      const wordCount = desc.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 20) {
        const readingMins = Math.max(1, Math.ceil(wordCount / 150));
        return `${readingMins} phút`;
      }
      if (lesson.durationMinutes && lesson.durationMinutes > 0 && lesson.durationMinutes !== 10) {
        return `${lesson.durationMinutes} phút`;
      }
      return '10 phút';
    }

    const durationSec = detectedDurations[lesson.lessonId];
    if (durationSec && durationSec > 0) {
      const totalSecs = Math.round(durationSec);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // If video duration is not yet detected, check if lesson has custom durationMinutes from DB
    if (
      lesson.durationMinutes &&
      lesson.durationMinutes > 0 &&
      lesson.durationMinutes !== 10 &&
      lesson.durationMinutes !== 35
    ) {
      return `${lesson.durationMinutes} phút`;
    }

    // If no video duration yet, check content
    const desc = (lesson.description || '').trim();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20) {
      const readingMins = Math.max(1, Math.ceil(wordCount / 150));
      return `${readingMins} phút`;
    }

    // Default when video is not loaded yet
    return '10 phút';
  };

  // ===========================================================================
  // Sync activeCert from query
  // ===========================================================================

  useEffect(() => {
    if (certificate) {
      setActiveCert(certificate);
    }
  }, [certificate]);

  // ===========================================================================
  // LocalStorage storage key for persistent fallback progress
  // ===========================================================================

  const storageKey = user?.id
    ? `mc_completed_lessons_${user.id}_${courseId}`
    : `mc_completed_lessons_guest_${courseId}`;

  // ===========================================================================
  // Sync completed lesson IDs from LocalStorage & backend progress
  // ===========================================================================

  // Only the authenticated learner's backend progress is authoritative.
  // Never import old browser completions into another account's database.
  useEffect(() => {
    setCompletedLessonIds([]);
    hasMarkedEndedRef.current = {};
    watchedSecondsRef.current = {};
    lastPlaybackRef.current = null;
    videoCompletionTriggeredRef.current = {};
    setVideoWatchProgress({});
  }, [user?.id, courseId]);

  useEffect(() => {
    if (!user?.id || !progressData) return;
    const backendCompleted = (progressData.lessonProgresses ?? [])
      .filter((lp) => lp.isCompleted).map((lp) => lp.lessonId);
    setCompletedLessonIds(backendCompleted);
    try { localStorage.setItem(storageKey, JSON.stringify(backendCompleted)); } catch (_) {}
  }, [progressData, storageKey, user?.id]);

  const toggleModuleCollapse = (
    moduleId: number,
  ) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // ===========================================================================
  // Direct back to lessons management page
  // ===========================================================================

  const handleBackToLessons = () => {
    if (courseId) {
      navigate(
        `/instructor/courses/${courseId}/lessons`,
      );
    } else {
      navigate('/instructor/courses');
    }
  };

  // ===========================================================================
  // Reset video ended state when activeLesson changes
  // ===========================================================================

  useEffect(() => {
    setIsVideoEnded(false);
    lastPlaybackRef.current = null;
  }, [activeLesson?.lessonId]);

  const hasMarkedEndedRef =
    useRef<Record<number, boolean>>({});

  // ===========================================================================
  // Handle explicit lesson completion
  // ===========================================================================

  const handleMarkLessonComplete = (
    lessonId: number,
    isCompleted: boolean,
  ) => {
    if (
      isCompleted &&
      hasMarkedEndedRef.current[lessonId]
    ) {
      return;
    }

    if (isCompleted) {
      hasMarkedEndedRef.current[lessonId] = true;
    } else {
      delete hasMarkedEndedRef.current[lessonId];
    }

    setCompletedLessonIds((prev) => {
      const nextCompleted = isCompleted
        ? prev.includes(lessonId)
          ? prev
          : [...prev, lessonId]
        : prev.filter(
            (id) => id !== lessonId,
          );

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(nextCompleted),
        );
      } catch (_) {}

      return nextCompleted;
    });

    updateProgressMutation.mutate({
      lessonId,
      dto: {
        isCompleted,
      },
    });
  };

  const activeLessonRef =
    useRef<Lesson | null>(null);

  useEffect(() => {
    activeLessonRef.current = activeLesson;
  }, [activeLesson]);

  // All learner playback uses the backend-issued, enrollment-checked R2 URL.
  const effectiveVideoUrl = playbackUrl;
  const embedUrl = getEmbedVideoUrl(effectiveVideoUrl);

  // ===========================================================================
  // Quiz logic
  // ===========================================================================

  // A lesson may contain multiple required practice quizzes; expose every one
  // so the learner can complete all gates rather than becoming stuck after the first.
  const getQuizzesForLesson = (lessonId: number) => quizzes.filter(
    quiz => quiz.lessonId === lessonId && quiz.purpose === 'PRACTICE',
  );

  // Overall course quiz: lessonId === null
  const overallQuiz = quizzes.find(
    quiz => quiz.purpose === 'FINAL_ASSESSMENT' &&
      (quiz.status === 'ACTIVE' || quiz.status === 'ARCHIVED' || quiz.status === 'INACTIVE'),
  );

  // ===========================================================================
  // Quiz navigation
  //
  // Khi mở Quiz, lưu lại chính xác CourseLearningPage hiện tại.
  // TakeQuizPage sẽ forward returnTo này sang QuizResultPage.
  // QuizResultPage dùng returnTo để quay lại CourseLearning thay vì navigate(-1).
  // ===========================================================================

  const getQuizReturnTo = (lessonId?: number) => {
    if (!courseId) {
      return '/';
    }

    if (lessonId) {
      return `/courses/${courseId}/learn?lessonId=${lessonId}`;
    }

    if (activeLesson?.lessonId) {
      return `/courses/${courseId}/learn?lessonId=${activeLesson.lessonId}`;
    }

    return `/courses/${courseId}/learn`;
  };

  const handleTakeQuiz = (
    quizId: number,
    lessonId?: number,
  ) => {
    if (lessonId && orderedLessons.find(l => l.lessonId === lessonId)?.isLocked) return;
    navigate(
      `/quizzes/${quizId}/take`,
      {
        state: {
          returnTo:
            getQuizReturnTo(lessonId),
        },
      },
    );
  };

  const renderQuizButton = (lessonId: number) => {
    const lessonQuizzes = getQuizzesForLesson(lessonId);
    if (!lessonQuizzes.length) return null;
    if (orderedLessons.find(l => l.lessonId === lessonId)?.isLocked)
      return <p className="ml-7 mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><LockKeyhole size={12}/> Mở khóa bài học để làm Quiz</p>;
    return <div className="ml-7 mt-1 max-w-md space-y-2">{lessonQuizzes.map(quiz => (
      <div key={quiz.quizId} className="rounded-lg border border-slate-100 bg-white p-2">
        <p className="mb-1 text-[11px] font-semibold text-slate-700">{quiz.title}</p>
        {quiz.status === 'ACTIVE' ? <LearnerQuizHistoryActions quizId={quiz.quizId} maxAttempts={quiz.maxAttempts} passingScore={quiz.passingScore} returnTo={getQuizReturnTo(lessonId)} onTake={() => handleTakeQuiz(quiz.quizId, lessonId)} />
          : quiz.status === 'ARCHIVED' ? <p className="text-[11px] text-amber-700">{quiz.availableFrom ? `Đang lên lịch mở: ${new Date(quiz.availableFrom).toLocaleString('vi-VN')}` : 'Quiz đang được lưu trữ.'}</p>
          : <p className="text-[11px] text-slate-500">Quiz hiện đang ngừng hoạt động.</p>}
      </div>
    ))}</div>;
  };
  // Bài tập hằng ngày gắn với bài học được tính vào điều kiện mở bài học/chương tiếp theo.
  const renderDailyPracticeButtons = (lessonId: number) => {
    const dailyQuizzes = quizzes.filter(q =>
      q.lessonId === lessonId &&
      q.purpose === 'DAILY_PRACTICE' &&
      (q.status === 'ACTIVE' || q.status === 'ARCHIVED' || q.status === 'INACTIVE')
    );
    if (dailyQuizzes.length === 0) return null;
    if (orderedLessons.find(l => l.lessonId === lessonId)?.isLocked)
      return <p className="ml-7 mt-1 text-[11px] text-slate-500">Mở khóa bài học để làm luyện tập hằng ngày.</p>;
    return <div className="ml-7 mt-1 space-y-2">{dailyQuizzes.map(q => (
      <div key={q.quizId} className="rounded-lg border border-sky-100 bg-sky-50/70 p-2">
        <p className="text-[11px] font-bold text-sky-800">Luyện tập hằng ngày: {q.title}</p>
        {q.status === 'ACTIVE' ? <LearnerQuizHistoryActions quizId={q.quizId} maxAttempts={q.maxAttempts} passingScore={q.passingScore} returnTo={getQuizReturnTo(lessonId)} onTake={() => handleTakeQuiz(q.quizId, lessonId)} />
          : q.status === 'ARCHIVED' ? <p className="text-[11px] text-amber-700">{q.availableFrom ? `Đang lên lịch mở: ${new Date(q.availableFrom).toLocaleString('vi-VN')}` : 'Bài luyện tập đang được lưu trữ.'}</p>
          : <p className="text-[11px] text-slate-500">Bài luyện tập hiện đang ngừng hoạt động.</p>}
      </div>
    ))}</div>;
  };


  // ===========================================================================
  // Load YouTube Iframe API script dynamically
  // ===========================================================================

  useEffect(() => {
    const win = window as any;

    if (!win.YT) {
      const tag =
        document.createElement('script');

      tag.src =
        'https://www.youtube.com/iframe_api';

      const firstScriptTag =
        document.getElementsByTagName(
          'script',
        )[0];

      firstScriptTag?.parentNode?.insertBefore(
        tag,
        firstScriptTag,
      );
    }
  }, []);

  // ===========================================================================
  // Track YouTube Player via window.YT.Player
  // ===========================================================================

  const ytPlayerRef =
    useRef<any>(null);

  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (
      !embedUrl ||
      !embedUrl.includes('youtube.com')
    ) {
      return;
    }

    let intervalId: any = null;

    const initYTPlayer = () => {
      const win = window as any;

      if (!win.YT || !win.YT.Player) {
        return;
      }

      try {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (_) {}
        }

        ytPlayerRef.current =
          new win.YT.Player(
            'video-player-iframe',
            {
              events: {
                onReady: (event: any) => {
                  try {
                    const dur = event.target.getDuration();
                    if (dur && dur > 0 && activeLessonRef.current) {
                      handleSaveLessonDuration(activeLessonRef.current.lessonId, dur);
                    }
                  } catch (_) {}
                },
                onStateChange: (
                  event: any,
                ) => {
                  // 0 means ENDED
                  if (event.data === 0) {
                    const current = activeLessonRef.current;
                    const duration = event.target?.getDuration?.() || 0;
                    if (!current) return;
                    if (!videoCompletionTriggeredRef.current[current.lessonId]) {
                      videoCompletionTriggeredRef.current[current.lessonId] = true;
                      handleMarkLessonComplete(current.lessonId, true);
                    }
                    setIsVideoEnded(true);
                  }
                },
              },
            },
          );

        // Interval checking current time vs duration
        intervalId = setInterval(() => {
          if (
            ytPlayerRef.current &&
            typeof ytPlayerRef.current
              .getCurrentTime ===
              'function'
          ) {
            try {
              const currentTime =
                ytPlayerRef.current.getCurrentTime();

              const duration =
                ytPlayerRef.current.getDuration();

              if (
                typeof currentTime ===
                  'number' &&
                typeof duration ===
                  'number' &&
                duration > 0
              ) {
                if (activeLessonRef.current) {
                  handleSaveLessonDuration(
                    activeLessonRef.current.lessonId,
                    duration,
                  );
                }

                handleVideoTimeUpdate(
                  currentTime,
                );
                const watchedEnough = activeLessonRef.current ? recordActualPlayback(activeLessonRef.current.lessonId, currentTime, duration) : false;

                if (watchedEnough && currentTime >= duration * 0.95 && !videoCompletionTriggeredRef.current[activeLessonRef.current?.lessonId || 0]) {
                  videoCompletionTriggeredRef.current[activeLessonRef.current!.lessonId] = true;
                  if (
                    activeLessonRef.current
                  ) {
                    handleMarkLessonComplete(
                      activeLessonRef.current
                        .lessonId,
                      true,
                    );
                  }
                }
              }
            } catch (_) {}
          }
        }, 1000);
      } catch (error) { ytPlayerRef.current = null; console.error('[CourseLearning] Cannot attach YouTube player', error); }
    };

    const win = window as any;

    // Wait for BOTH the YouTube API and the actual iframe to be mounted.
    // The old code tried YT.Player before React had rendered the iframe,
    // silently swallowed the error, and never retried.
    let apiWaitTimer: ReturnType<typeof setInterval> | null = null;
    let initialized = false;
    let attempts = 0;
    const tryInit = () => {
      if (initialized) return;
      const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
      if (!iframe || !iframe.src.includes('youtube.com/embed/')) return;
      if (!win.YT?.Player) return;
      try {
        initYTPlayer();
        initialized = !!ytPlayerRef.current;
        if (initialized && apiWaitTimer) { clearInterval(apiWaitTimer); apiWaitTimer = null; }
      } catch (error) { console.error('[CourseLearning] YouTube player initialization failed', error); }
    };
    tryInit();
    if (!initialized) apiWaitTimer = setInterval(() => {
      tryInit();
      if (++attempts >= 100 && apiWaitTimer) {
        clearInterval(apiWaitTimer);
        apiWaitTimer = null;
        console.warn('[CourseLearning] YouTube iframe/API unavailable after 30 seconds');
      }
    }, 300);

    return () => {
      if (apiWaitTimer) clearInterval(apiWaitTimer);
      if (intervalId) {
        clearInterval(intervalId);
      }

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}

        ytPlayerRef.current = null;
      }
    };
  }, [
    activeLesson?.lessonId,
    embedUrl,
    replayKey,
  ]);

  // ===========================================================================
  // Detect video completion via window postMessage
  // ===========================================================================

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent,
    ) => {
      try {
        const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
        if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;
        let data = event.data;

        if (typeof data === 'string') {
          if (data.startsWith('{')) {
            data = JSON.parse(data);
          } else {
            return;
          }
        }

        if (
          !data ||
          typeof data !== 'object'
        ) {
          return;
        }

        // Vimeo player.js postMessage: { event: 'timeupdate', data: { seconds, duration, percent } }.
        // Google Drive preview does not expose playback events to third-party pages.
        if (iframe.src.includes('player.vimeo.com')) {
          if (!/^https:\/\/(?:player\.)?vimeo\.com$/.test(event.origin)) return;
          const payload = data.data || {};
          const seconds = Number(payload.seconds ?? payload.currentTime);
          const length = Number(payload.duration);
          if (Number.isFinite(length) && length > 0 && activeLessonRef.current) handleSaveLessonDuration(activeLessonRef.current.lessonId, length);
          if (Number.isFinite(seconds) && Number.isFinite(length) && length > 0 && activeLessonRef.current) {
            handleVideoTimeUpdate(seconds);
            const current = activeLessonRef.current;
            if (recordActualPlayback(current.lessonId, seconds, length) && !videoCompletionTriggeredRef.current[current.lessonId]) {
              videoCompletionTriggeredRef.current[current.lessonId] = true;
              handleMarkLessonComplete(current.lessonId, true);
            }
          }
          if (data.event === 'ended' && activeLessonRef.current) {
            const current = activeLessonRef.current;
            if (!videoCompletionTriggeredRef.current[current.lessonId]) {
              videoCompletionTriggeredRef.current[current.lessonId] = true;
              handleMarkLessonComplete(current.lessonId, true);
            }
            setVideoWatchProgress(prev => ({ ...prev, [current.lessonId]: 100 }));
            setIsVideoEnded(true);
          }
          return;
        }
        if (!/^https:\/\/(?:www\.|www-nocookie\.)?youtube\.com$/.test(event.origin)) return;
        const info =
          data.info || data;

        const playerState =
          info?.playerState ??
          data?.playerState;

        const currentTime =
          info?.currentTime ??
          data?.currentTime;

        const duration =
          info?.duration ??
          data?.duration;

        // Automatically save detected duration whenever received from video player
        if (typeof duration === 'number' && duration > 0 && !isNaN(duration)) {
          if (activeLessonRef.current) {
            handleSaveLessonDuration(
              activeLessonRef.current.lessonId,
              duration,
            );
          }
        }

        // Track playback progress
        if (typeof currentTime === 'number' && currentTime > 0 && !isNaN(currentTime)) {
          handleVideoTimeUpdate(currentTime);
        }

        const isEndedByState =
          data.event === 'finish' ||
          data.ended === true ||
          (data.event ===
            'onStateChange' &&
            (info === 0 ||
              data.info === 0)) ||
          playerState === 0;

        const watchedEnough = activeLessonRef.current && typeof currentTime === 'number' && typeof duration === 'number'
          ? recordActualPlayback(activeLessonRef.current.lessonId, currentTime, duration) : false;
        if (isEndedByState && activeLessonRef.current) {
          const currentTargetLesson = activeLessonRef.current;
          if (!videoCompletionTriggeredRef.current[currentTargetLesson.lessonId]) {
            videoCompletionTriggeredRef.current[currentTargetLesson.lessonId] = true;
            handleMarkLessonComplete(currentTargetLesson.lessonId, true);
          }
          setIsVideoEnded(true);
        } else if (
          watchedEnough && typeof currentTime === 'number' && typeof duration === 'number' && currentTime >= duration * 0.95 && activeLessonRef.current && !videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId]
        ) {
          videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId] = true;
          const currentTargetLesson =
            activeLessonRef.current;

          if (currentTargetLesson) {
            handleMarkLessonComplete(
              currentTargetLesson.lessonId,
              true,
            );
          }
        }
      } catch (_) {}
    };

    window.addEventListener(
      'message',
      handleMessage,
    );

    // Periodically ping YouTube iframe to request duration metadata
    const pingTimer = setInterval(() => {
      const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          if (iframe.src.includes('player.vimeo.com')) {
            for (const eventName of ['timeupdate', 'ended', 'loaded']) iframe.contentWindow.postMessage({ method: 'addEventListener', value: eventName }, 'https://player.vimeo.com');
            return;
          }
          if (!iframe.src.includes('youtube.com')) return;
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), 'https://www.youtube.com');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getDuration', args: [] }), '*');
        } catch (_) {}
      }
    }, 1000);

    return () => {
      clearInterval(pingTimer);
      window.removeEventListener(
        'message',
        handleMessage,
      );
    };
  }, []);

  // ===========================================================================
  // Sync active lesson from URL or select first UNCOMPLETED lesson by default
  // ===========================================================================

  useEffect(() => {
    if (orderedLessons.length > 0) {
      if (initialLessonId) {
        const found =
          orderedLessons.find(
            (l) =>
              l.lessonId ===
              initialLessonId,
          );

        if (found && !found.isLocked) {
          setActiveLesson(found);
          return;
        }
      }

      if (
        !activeLesson ||
        !orderedLessons.some(
          (l) =>
            l.lessonId ===
            activeLesson.lessonId,
        )
      ) {
        const firstUncompleted =
          orderedLessons.find(
            (l) =>
              !l.isLocked && !completedLessonIds.includes(
                l.lessonId,
              ),
          );

        const targetLesson =
          firstUncompleted ||
          orderedLessons.find(l => !l.isLocked) || null;

        setActiveLesson(
          targetLesson,
        );
      }
    }
  }, [
    orderedLessons,
    initialLessonId,
    completedLessonIds,
  ]);

  // ===========================================================================
  // Handle lesson selection
  // ===========================================================================

  const handleSelectLesson = (
    lesson: Lesson,
  ) => {
    if (lesson.isLocked) return;
    setIsVideoEnded(false);
    setReplayKey(0);
    setActiveLesson(lesson);

    setSearchParams(
      {
        lessonId:
          lesson.lessonId.toString(),
      },
      {
        replace: true,
      },
    );
  };

  // Khi học viên đạt bài tập/bài đánh giá và quay lại khóa học,
  // tự chuyển đến bài học kế tiếp nếu Backend đã xác nhận bài đó được mở.
  const autoAdvanceAfterQuiz = Boolean(
    (location.state as { autoAdvanceAfterQuiz?: boolean } | null)?.autoAdvanceAfterQuiz,
  );

  useEffect(() => {
    if (!autoAdvanceAfterQuiz || !activeLesson) return;
    if (!completedLessonIds.includes(activeLesson.lessonId)) return;

    const currentPosition = orderedLessons.findIndex(
      lesson => lesson.lessonId === activeLesson.lessonId,
    );
    if (currentPosition < 0) return;

    const nextUnlockedLesson = orderedLessons
      .slice(currentPosition + 1)
      .find(lesson =>
        !lesson.isLocked &&
        !completedLessonIds.includes(lesson.lessonId),
      );

    // Nếu còn bài tập hoặc bài đánh giá chưa đạt, Backend vẫn khóa bài kế tiếp.
    // Giữ nguyên trang hiện tại; sau khi đạt bài còn thiếu, kết quả sẽ quay lại đây.
    if (!nextUnlockedLesson) return;

    setIsVideoEnded(false);
    setReplayKey(0);
    setActiveLesson(nextUnlockedLesson);
    navigate(
      `/courses/${courseId}/learn?lessonId=${nextUnlockedLesson.lessonId}`,
      { replace: true, state: null },
    );
  }, [
    autoAdvanceAfterQuiz,
    activeLesson?.lessonId,
    completedLessonIds,
    orderedLessons,
    courseId,
    navigate,
  ]);

  // ===========================================================================
  // Handle video playback time updates
  // ===========================================================================

  const watchedSecondsRef = useRef<Record<number, number>>({});
  const [videoWatchProgress, setVideoWatchProgress] = useState<Record<number, number>>({});
  const videoCompletionTriggeredRef = useRef<Record<number, boolean>>({});
  const lastPlaybackRef = useRef<{ lessonId: number; position: number; at: number } | null>(null);
  const recordActualPlayback = (lessonId: number, position: number, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return false;
    const percent = Math.max(0, Math.min(100, Math.floor(position / duration * 100)));
    setVideoWatchProgress(prev => prev[lessonId] === percent ? prev : { ...prev, [lessonId]: percent });
    // Video lessons complete at the 95% playback position (including YouTube and direct video).
    return position >= duration * 0.95;
  };
  const lastUpdatedSecRef =
    useRef<number>(0);

  const handleVideoTimeUpdate = (
    currentTime: number,
  ) => {
    const currentSec =
      Math.floor(currentTime);

    if (
      activeLessonRef.current &&
      currentSec > 0 &&
      currentSec !==
        lastUpdatedSecRef.current &&
      currentSec % 5 === 0
    ) {
      lastUpdatedSecRef.current =
        currentSec;

      updateProgressMutation.mutate({
        lessonId:
          activeLessonRef.current!.lessonId,
        dto: {
          lastPositionSeconds:
            currentSec,
          timeSpentSeconds:
            currentSec,
        },
      });
    }
  };

  // ===========================================================================
  // Toggle lesson completed checkmark
  // ===========================================================================

  const toggleComplete = (
    lessonId: number,
  ) => {
    const isCurrentlyDone =
      completedLessonIds.includes(
        lessonId,
      );

    handleMarkLessonComplete(
      lessonId,
      !isCurrentlyDone,
    );
  };

  // ===========================================================================
  // Sequential Navigation handlers
  // ===========================================================================

  const currentIndex =
    orderedLessons.findIndex(
      (l) =>
        l.lessonId ===
        activeLesson?.lessonId,
    );

  const prevLesson =
    currentIndex > 0
      ? orderedLessons[
          currentIndex - 1
        ]
      : null;

  const nextLesson =
    currentIndex >= 0 &&
    currentIndex <
      orderedLessons.length - 1
      ? orderedLessons[
          currentIndex + 1
        ]
      : null;

  // Automatically advance after a video finishes; do not skip assignments or quizzes.
  const [autoNextSeconds, setAutoNextSeconds] = useState(5);
  const [autoNextCancelled, setAutoNextCancelled] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setPlaybackUrl(null);
    pendingVideoPositionRef.current = null;
    shouldResumeVideoRef.current = false;

    // Request playback for every lesson marked as having video. The backend rejects legacy sources for learners.
    if (!activeLesson?.hasVideo) return;

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const issueUrl = async () => {
      const video = videoElementRef.current;
      if (video?.dataset.lessonId === String(activeLesson.lessonId) && Number.isFinite(video.currentTime) && video.currentTime > 0) {
        pendingVideoPositionRef.current = video.currentTime;
        shouldResumeVideoRef.current = !video.paused;
      }

      const playback = await lessonApi.getPlaybackUrl(activeLesson.lessonId);
      if (cancelled) return;

      // Direct R2 URLs are truthy too, so identify external providers by host
      // instead of using getEmbedVideoUrl as a boolean test.
      if (isThirdPartyVideoUrl(playback.url))
        throw new Error('Third-party video sources are disabled for course playback.');

      setPlaybackUrl(playback.url);
      const expiresIn = Date.parse(playback.expiresAt) - Date.now();
      refreshTimer = setTimeout(() => {
        void issueUrl().catch(() => {});
      }, Math.max(30_000, expiresIn - 60_000));
    };

    void issueUrl().catch(() => setPlaybackUrl(null));
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [activeLesson?.lessonId, activeLesson?.hasVideo]);
  useEffect(() => {
    if (isVideoEnded) { setAutoNextSeconds(5); setAutoNextCancelled(false); }
  }, [isVideoEnded]);
  const handleReplayVideo = () => {
    setAutoNextCancelled(true);
    setIsVideoEnded(false);
    const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
    const url = effectiveVideoUrl || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try { ytPlayerRef.current?.seekTo?.(0, true); ytPlayerRef.current?.playVideo?.(); } catch (_) { setReplayKey(k => k + 1); }
    } else if (url.includes('vimeo.com') && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ method: 'setCurrentTime', value: 0 }, 'https://player.vimeo.com');
      iframe.contentWindow.postMessage({ method: 'play' }, 'https://player.vimeo.com');
    } else if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
      void videoElementRef.current.play().catch(() => {});
    } else { setReplayKey(k => k + 1); }
  };
  useEffect(() => {
    setAutoNextSeconds(5);
    setAutoNextCancelled(false);
  }, [activeLesson?.lessonId]);

  // Chỉ trạng thái khóa của bài tiếp theo mới quyết định có được tự chuyển hay không.
  // Không chặn chỉ vì bài hiện tại có quiz ACTIVE: DAILY_PRACTICE có thể là bài bổ trợ,
  // còn quiz/bài tập bắt buộc phải được backend phản ánh bằng nextLesson.isLocked.
  useEffect(() => {
    // Lấy bài kế tiếp trực tiếp từ danh sách mới nhất để tránh dùng dữ liệu cũ.
    const latestNextLesson =
      currentIndex >= 0
        ? orderedLessons[currentIndex + 1] ?? null
        : null;

    // Chỉ tự chuyển khi video đã kết thúc và bài kế tiếp đã được backend mở khóa.
    // Không chặn chỉ vì bài hiện tại có quiz ACTIVE: một số DAILY_PRACTICE là bài bổ trợ;
    // các bài tập/quiz bắt buộc phải được backend phản ánh qua trạng thái isLocked.
    if (
      !isVideoEnded ||
      !latestNextLesson ||
      latestNextLesson.isLocked ||
      autoNextCancelled ||
      !effectiveVideoUrl?.trim() ||
      activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT'
    ) {
      return;
    }

    if (autoNextSeconds <= 0) {
      handleSelectLesson(latestNextLesson);
      return;
    }

    const timer = window.setTimeout(
      () => setAutoNextSeconds(seconds => Math.max(0, seconds - 1)),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [
    isVideoEnded,
    currentIndex,
    orderedLessons,
    autoNextCancelled,
    autoNextSeconds,
    activeLesson?.lessonId,
    activeLesson?.videoUrl,
    activeLesson?.lessonType,
    effectiveVideoUrl,
  ]);

  // ===========================================================================
  // Total duration
  // ===========================================================================

  const totalDuration = orderedLessons.reduce((sum, l) => {
    const hasVideo = !!(
      l.hasVideo &&
      l.lessonType?.toUpperCase() !== 'ASSIGNMENT'
    );
    if (hasVideo) {
      const sec = detectedDurations[l.lessonId];
      if (sec && sec > 0) {
        return sum + Math.max(1, Math.round(sec / 60));
      }
      if (l.durationMinutes && l.durationMinutes > 0 && l.durationMinutes !== 10 && l.durationMinutes !== 35) {
        return sum + l.durationMinutes;
      }
    }
    const desc = (l.description || '').trim();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20) {
      return sum + Math.max(1, Math.ceil(wordCount / 150));
    }
    return sum + (l.durationMinutes || 10);
  }, 0);

  // ===========================================================================
  // Loading state
  // ===========================================================================

  if (
    isCourseLoading ||
    isLessonsLoading ||
    isQuizzesLoading
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f7fa] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />

          <p className="text-xs font-medium text-slate-500">
            Đang tải không gian học tập...
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Completion
  // ===========================================================================

  const totalLessonCount =
    orderedLessons.length;

  const localPercentage =
    totalLessonCount > 0
      ? Math.round(
          (completedLessonIds.length /
            totalLessonCount) *
            100,
        )
      : 0;

  const completionPercentage =
    Math.max(
      progressData?.completionPercentage ??
        0,
      localPercentage,
    );

  const is100Percent =
    completionPercentage >=
      100 ||
    (totalLessonCount > 0 &&
      completedLessonIds.length >=
        totalLessonCount);

  // ===========================================================================
  // Certificate
  // ===========================================================================

  const handleOpenCertificate =
    async () => {
      let certToDisplay =
        activeCert || certificate;

      if (!certToDisplay && courseId) {
        try {
          const issued =
            await issueCertMutation.mutateAsync();

          if (issued) {
            certToDisplay = issued;
            setActiveCert(issued);
          }
        } catch (err) {
          console.warn(
            'Backend issue certificate error, fallback to local certificate:',
            err,
          );
        }
      }

      if (!certToDisplay) {
        certToDisplay = {
          certificateId: 1,
          enrollmentId:
            progressData?.enrollmentId ||
            1,
          learnerId:
            Number(user?.id) || 1,
          learnerName:
            user?.name ||
            (user as any)?.fullName ||
            'Học viên',
          courseId: courseId,
          courseTitle:
            course?.title ||
            'Kỹ Thuật Xử Lý Kịch Bản MC & Biến Tấu Linh Hoạt',
          instructorName:
            'Giảng Viên MSEEK Academy',
          certificateCode:
            progressData?.certificateCode ||
            `CERT-2026-${Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase()}`,
          issuedAt:
            new Date().toISOString(),
          completionPercentage: 100,
          grade: 'EXCELLENT',
          status: 'ACTIVE',
        };

        setActiveCert(
          certToDisplay,
        );
      }

      setIsCertModalOpen(true);
    };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="mseek-light-studio flex h-screen w-full flex-col bg-[#eaf3ff] text-slate-900 overflow-hidden font-sans">
      <style>{`
        .mseek-light-studio{background:linear-gradient(145deg,#dbeaff 0%,#f0f7ff 50%,#dceaff 100%);color:#101d50}
        .mseek-topbar{backdrop-filter:blur(16px);background:linear-gradient(90deg,#f9fcff,#e9f2ff 55%,#edf3ff);border-color:#c9ddff}
        .mseek-stage-hero{background:linear-gradient(90deg,rgba(222,235,255,.92) 0%,rgba(199,221,255,.60) 43%,rgba(191,214,255,.13) 78%),url('/images/mseek-mc-blue-banner.png') center/cover no-repeat,#bcd5ff;min-height:132px}
        .mseek-stage-glow{background:radial-gradient(circle at 24% 0%,rgba(255,255,255,.68),transparent 34%);pointer-events:none}
        .mseek-stage-mic{animation:mseekFloat 5s ease-in-out infinite}
        .mseek-stage-main{background:transparent}
        .mseek-curriculum,.mseek-right-rail{box-shadow:0 8px 32px rgba(18,69,154,.08)}
        .mseek-light-studio button{transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease,border-color .2s ease}
        .mseek-light-studio button:not(:disabled):active{transform:scale(.97)}
        .mseek-light-studio button:focus-visible{outline:3px solid #93baff;outline-offset:3px}
        .mseek-light-studio .shadow-2xl{box-shadow:0 16px 38px rgba(26,75,156,.12)}
        .mseek-light-studio .shadow-xl{box-shadow:0 10px 30px rgba(26,75,156,.10)}
        .mseek-light-studio .shadow-lg{box-shadow:0 6px 24px rgba(26,75,156,.09)}
        .mseek-light-studio audio{accent-color:#1557f5}
        .mseek-light-studio .bg-violet-600{background-color:#1654f5}
        .mseek-light-studio .hover\:bg-violet-700:hover{background-color:#0c3fce}
        .mseek-light-studio .text-violet-700{color:#1648c7}
        .mseek-light-studio .text-violet-600{color:#1554e8}
        .mseek-light-studio .border-violet-100{border-color:#d5e4ff}
        .mseek-light-studio .border-violet-200{border-color:#bed5ff}
        .mseek-light-studio .bg-violet-50{background-color:#eef5ff}
        .mseek-light-studio .bg-violet-100{background-color:#dceaff}
        @keyframes mseekFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @media(max-width:1279px){.mseek-right-rail{display:none}}
        @media(max-width:767px){.mseek-curriculum{width:min(80vw,320px)}.mseek-stage-hero{padding:14px 16px;min-height:112px}}
        @media(prefers-reduced-motion:reduce){.mseek-stage-mic{animation:none}.mseek-light-studio *{transition-duration:.01ms!important;animation-duration:.01ms!important}}
      `}</style>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}

      <header className="mseek-topbar flex min-h-16 shrink-0 items-center justify-between border-b border-blue-100 bg-white/95 px-4 md:px-6 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLessons}
            title="Quay lại quản lý bài học"
            className="flex items-center gap-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-violet-600 border border-slate-200 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />

            <span>
              Thoát / Về quản lý bài học
            </span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200" />

          <div>
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <span>
                {course?.title ??
                  'Chi tiết khóa học'}
              </span>
            </h1>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <span>
                {sortedModules.length}{' '}
                Chương
              </span>

              <span>•</span>

              <span>
                {totalLessonCount}{' '}
                bài học
              </span>

              <span>•</span>

              <span>
                {totalDuration} phút
              </span>
            </p>
          </div>
        </div>

        {/* Right header action */}

        <div className="flex items-center gap-3">
          {/* Progress Badge */}

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700 font-semibold">
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    completionPercentage,
                  )}%`,
                }}
              />
            </div>

            <span className="text-[11px] text-blue-700 font-black">
              {completionPercentage}%
            </span>
          </div>

          {/* Certificate Button */}

          {(is100Percent ||
            certificate ||
            progressData?.certificateCode) && (
            <button
              onClick={
                handleOpenCertificate
              }
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Award className="h-4 w-4" />

              <span>
                {certificate ||
                progressData?.certificateCode
                  ? 'Xem Chứng Chỉ'
                  : 'Nhận Chứng Chỉ'}
              </span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs text-violet-700 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />

            <span>
              Bài{' '}
              {currentIndex >= 0
                ? currentIndex + 1
                : 1}{' '}
              / {totalLessonCount}
            </span>
          </div>

          {/* Course Content Q&A Trigger */}
          <button
            onClick={() => setIsAiChatOpen(!isAiChatOpen)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border shadow-xs ${
              isAiChatOpen
                ? 'bg-violet-700 text-white border-violet-700 shadow-violet-500/20'
                : 'bg-white text-violet-700 hover:bg-violet-50 border-violet-200'
            }`}
            title="Hỏi đáp nội dung bài giảng"
          >
            <MessageSquare className={`h-4 w-4 ${isAiChatOpen ? 'text-white' : 'text-violet-600'}`} />
            <span className="hidden sm:inline">
              Hỏi đáp bài học
            </span>
          </button>

          <button
            onClick={() =>
              setIsSidebarOpen(
                !isSidebarOpen,
              )
            }
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm shadow-violet-500/20"
          >
            {isSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}

            <span className="hidden sm:inline">
              {isSidebarOpen
                ? 'Ẩn danh sách'
                : 'Danh sách bài học'}
            </span>
          </button>
        </div>
      </header>

      {/* Course banner: dynamic title, decorative background only */}
      <section className="mseek-stage-hero relative shrink-0 overflow-hidden rounded-b-2xl border-b border-blue-200 px-5 py-4 md:px-8 md:py-5">
        <div className="mseek-stage-glow absolute inset-0" />
        <div className="relative z-10 flex min-h-[86px] items-center gap-4">
          <div className="mseek-stage-mic flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/90 shadow-lg"><BookOpen className="h-7 w-7 text-blue-600" /></div>
          <div className="min-w-0 max-w-[min(65%,760px)]">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[.16em] text-blue-700">MSEEK · MC VOICE STUDIO</p>
            <h2 className="text-lg font-black tracking-tight text-[#09236c] md:text-2xl">{course?.title || 'Hành trình làm chủ giọng nói'}</h2>
            <p className="mt-1 text-xs font-medium text-blue-700">Tự tin cất tiếng · Truyền cảm hứng · Tỏa sáng trên sân khấu</p>
          </div>
        </div>
      </section>

      {/* ── Main Container ──────────────────────────────────────────────── */}

      <div className="flex flex-1 overflow-hidden relative flex-row-reverse">
        {/* Right study summary: only data already available in this page */}
        <aside className="mseek-right-rail hidden w-[286px] shrink-0 flex-col gap-3 overflow-y-auto bg-transparent p-3 xl:flex">
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><Award className="h-4 w-4 text-blue-600"/> Tiến độ học tập</h3>
            <div className="flex items-center gap-4">
              <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full" style={{background:`conic-gradient(#1554f5 ${Math.min(100,completionPercentage)}%,#dbe8ff 0)`}}>
                <div className="grid h-[69px] w-[69px] place-items-center rounded-full bg-white text-xl font-black text-blue-700">{completionPercentage}%</div>
              </div>
              <div className="space-y-2 text-[11px] text-slate-600"><p>✓ Đã hoàn thành <b>{completedLessonIds.length}/{totalLessonCount} bài</b></p><p>◷ Tổng thời lượng: <b>{totalDuration} phút</b></p><p>▣ Bài hiện tại: <b>{currentIndex >= 0 ? currentIndex+1 : 1}/{totalLessonCount}</b></p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><FileText className="h-4 w-4 text-blue-600"/> Thông tin bài học</h3>
            <p className="text-xs font-bold text-blue-700">{activeLesson?.title || 'Chọn bài học để bắt đầu'}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{activeLesson?.description || 'Xem nội dung, học qua video và thực hành luyện giọng theo lộ trình.'}</p>
            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">Thời lượng: {getLessonDuration(activeLesson)}</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><Mic className="h-4 w-4 text-blue-600"/> Luyện tập giọng nói</h3>
            <p className="text-xs leading-relaxed text-slate-600">Chọn bài tập nói trong lộ trình để ghi âm hoặc tải tệp âm thanh lên cho giảng viên đánh giá.</p>
            <div className="mt-4 flex h-12 items-center justify-center gap-[3px]">{[12,22,32,18,38,26,14,34,43,19,30,17,40,23,12,35,26,15,33,20,38,16,27,12].map((h,i)=><span key={i} className="w-[3px] rounded-full bg-blue-400/80" style={{height:h}}/>)}</div>
          </div>
        </aside>
        {/* Left / Center Main Content */}

        <main className="mseek-stage-main min-w-0 flex-1 overflow-y-auto bg-transparent p-3 md:p-4 scrollbar-thin scrollbar-thumb-violet-300">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Main Workspace Container (Video or Speaking Assignment) */}

            <div
              onContextMenu={(event) => event.preventDefault()}
              className={`relative w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xl group ${
                activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
                (!effectiveVideoUrl && activeLesson !== null && !activeLesson.hasVideo)
                  ? 'min-h-[550px] bg-[#f4f7fa]'
                  : 'aspect-video bg-black'
              }`}
            >
              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ? (
                <LearnerSpeakingWorkspace
                  lesson={activeLesson}
                  courseId={courseId}
                  onMarkComplete={(lessonId) =>
                    handleMarkLessonComplete(lessonId, true)
                  }
                />
              ) : (
                <>
                  {/* Custom Completion Overlay */}

                  {isVideoEnded && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#f4f7fa]/95 backdrop-blur-md p-6 text-center animate-fadeIn">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        Bạn đã hoàn thành bài học này!
                      </h3>

                      <p className="mt-1.5 text-xs text-slate-600 max-w-md line-clamp-2">
                        {activeLesson?.title}
                      </p>

                      {nextLesson && !nextLesson.isLocked && (
                        <div className="mt-3 text-xs text-slate-600">
                          {autoNextCancelled
                            ? 'Đã hủy tự chuyển bài.'
                            : `Tự chuyển sang bài tiếp theo sau ${autoNextSeconds} giây.`}
                        </div>
                      )}
                      {nextLesson?.isLocked && (
                        <div className="mt-3 text-xs font-medium text-amber-700">
                          Bài tiếp theo đang khóa. Hãy hoàn thành bài tập bắt buộc để tiếp tục.
                        </div>
                      )}
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleReplayVideo}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-slate-900 transition-all cursor-pointer border border-slate-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Xem lại video
                        </button>

                        {nextLesson && (
                          <button
                            disabled={nextLesson.isLocked}
                            onClick={() => handleSelectLesson(nextLesson)}
                            title={nextLesson.isLocked ? (nextLesson.lockReason || 'Hoàn thành bài tập bắt buộc để mở khóa') : 'Chuyển sang bài tiếp theo'}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white shadow-violet-500/30 hover:bg-violet-500 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span>
                              Bài tiếp theo: {nextLesson.title}
                            </span>

                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {embedUrl ? (
                    embedUrl.includes('youtube.com') ||
                    embedUrl.includes('vimeo.com') ||
                    embedUrl.includes('drive.google.com') ? (
                      <iframe
                        key={`${activeLesson?.lessonId}-${replayKey}`}
                        id="video-player-iframe"
                        src={embedUrl}
                        title={activeLesson?.title}
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        ref={videoElementRef}
                        data-lesson-id={activeLesson?.lessonId}
                        key={`${activeLesson?.lessonId}-${replayKey}`}
                        src={embedUrl}
                        controls
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        disableRemotePlayback
                        draggable={false}
                        onContextMenu={(event) => event.preventDefault()}
                        autoPlay
                        onLoadedMetadata={(e) => {
                          retriedPlaybackLessonRef.current = null;
                          if (pendingVideoPositionRef.current !== null) {
                            const shouldResume = shouldResumeVideoRef.current;
                            e.currentTarget.currentTime = pendingVideoPositionRef.current;
                            pendingVideoPositionRef.current = null;
                            shouldResumeVideoRef.current = false;
                            if (shouldResume) void e.currentTarget.play().catch(() => {});
                            else e.currentTarget.pause();
                          }
                          if (activeLesson && e.currentTarget.duration) {
                            handleSaveLessonDuration(
                              activeLesson.lessonId,
                              e.currentTarget.duration,
                            );
                          }
                        }}
                        onError={(e) => {
                          if (!activeLesson?.hasVideo || retriedPlaybackLessonRef.current === activeLesson.lessonId) return;
                          retriedPlaybackLessonRef.current = activeLesson.lessonId;
                          const video = e.currentTarget;
                          pendingVideoPositionRef.current = video.currentTime;
                          shouldResumeVideoRef.current = !video.paused;
                          void lessonApi.getPlaybackUrl(activeLesson.lessonId)
                            .then((playback) => {
                              if (!isThirdPartyVideoUrl(playback.url)) setPlaybackUrl(playback.url);
                            })
                            .catch(() => {});
                        }}
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget;
                          const lessonId = activeLesson?.lessonId;

                          handleVideoTimeUpdate(v.currentTime);
                          const watchedEnough = lessonId
                            ? recordActualPlayback(lessonId, v.currentTime, v.duration)
                            : false;

                          // Ghi nhận hoàn thành khi đã xem đủ 95% thời lượng.
                          if (watchedEnough && lessonId && !videoCompletionTriggeredRef.current[lessonId]) {
                            videoCompletionTriggeredRef.current[lessonId] = true;
                            handleMarkLessonComplete(lessonId, true);
                          }

                          // Một số trình duyệt không phát onEnded ổn định với video nhúng/tệp trực tiếp.
                          // Khi đầu phát đã đến sát cuối video, chủ động bật luồng tự chuyển bài.
                          if (
                            lessonId &&
                            Number.isFinite(v.duration) &&
                            v.duration > 0 &&
                            (v.ended || v.currentTime >= v.duration - 0.75)
                          ) {
                            if (!videoCompletionTriggeredRef.current[lessonId]) {
                              videoCompletionTriggeredRef.current[lessonId] = true;
                              handleMarkLessonComplete(lessonId, true);
                            }
                            setVideoWatchProgress(prev => prev[lessonId] === 100 ? prev : { ...prev, [lessonId]: 100 });
                            setIsVideoEnded(true);
                          }
                        }}
                        onPause={(e) =>
                          handleVideoTimeUpdate(e.currentTarget.currentTime)
                        }
                        onEnded={() => {
                          const lessonId = activeLesson?.lessonId;
                          if (!lessonId) return;
                          if (!videoCompletionTriggeredRef.current[lessonId]) {
                            videoCompletionTriggeredRef.current[lessonId] = true;
                            handleMarkLessonComplete(lessonId, true);
                          }
                          setVideoWatchProgress(prev => prev[lessonId] === 100 ? prev : { ...prev, [lessonId]: 100 });
                          setIsVideoEnded(true);
                        }}
                        className="h-full w-full object-contain"
                      >
                        Trình duyệt của bạn không hỗ trợ phát video HTML5.
                      </video>
                    )
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-slate-950">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-3">
                        <Video className="h-8 w-8" />
                      </div>

                      <h3 className="text-base font-bold text-white">
                        Chưa chọn hoặc chưa có Video bài học
                      </h3>

                      <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        {activeLesson
                          ? activeLesson.hasVideo
                            ? 'Bài học chưa có video upload lên kho riêng của MSEEK hoặc bạn chưa được cấp quyền phát. Hãy liên hệ giảng viên.'
                            : 'Bài học này chưa được cập nhật liên kết Video. Vui lòng chọn bài học khác.'
                          : 'Vui lòng chọn bài học từ danh sách bên phải để bắt đầu xem video.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Navigation & Controls Bar */}

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm">
              <button
                disabled={!prevLesson}
                onClick={() =>
                  prevLesson &&
                  handleSelectLesson(
                    prevLesson,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-violet-600 border border-slate-300 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" />

                <span className="hidden sm:inline text-slate-900 font-bold">
                  Bài trước:
                </span>

                <span className="truncate max-w-[140px] text-slate-600">
                  {prevLesson
                    ? prevLesson.title
                    : '---'}
                </span>
              </button>

              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
              (!effectiveVideoUrl && activeLesson !== null && !activeLesson.hasVideo) ? (
                <div
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border transition-all ${
                    activeLesson && completedLessonIds.includes(activeLesson.lessonId)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                  }`}
                >
                  {activeLesson && completedLessonIds.includes(activeLesson.lessonId) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Đã hoàn thành (Đã chấm điểm)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                      <span>Chờ Giảng viên chấm điểm...</span>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() =>
                    activeLesson && !effectiveVideoUrl?.trim() && !activeLesson.hasVideo &&
                    toggleComplete(activeLesson.lessonId)
                  }
                  disabled={!!effectiveVideoUrl?.trim() || !!activeLesson?.hasVideo}
                  title={effectiveVideoUrl?.trim() || activeLesson?.hasVideo ? 'Bài video được tự động hoàn thành khi xem đủ 95%' : 'Đánh dấu đã đọc xong bài lý thuyết'}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                    activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-300'
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 ${activeLesson && completedLessonIds.includes(activeLesson.lessonId) ? 'text-emerald-600' : 'text-slate-400'}`} />

                  <span>
                    {activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'Đã hoàn thành'
                      : effectiveVideoUrl?.trim() || activeLesson?.hasVideo ? 'Tự hoàn thành khi xem 95%' : 'Đã đọc xong – Đánh dấu hoàn thành'}
                  </span>
                </button>
              )}

              <button
                disabled={!nextLesson}
                onClick={() =>
                  nextLesson &&
                  handleSelectLesson(
                    nextLesson,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-600 transition-all cursor-pointer shadow-md shadow-violet-500/20"
              >
                <span className="hidden sm:inline">
                  Bài tiếp:
                </span>

                <span className="truncate max-w-[140px]">
                  {nextLesson
                    ? nextLesson.title
                    : '---'}
                </span>

                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Lesson Title & Info */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200">
                      Bài #
                      {activeLesson?.orderIndex ??
                        (currentIndex >= 0
                          ? currentIndex + 1
                          : 1)}
                    </span>

                    {activeLesson?.isPreview && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <Eye className="h-3 w-3 text-emerald-600" />
                        Xem thử
                      </span>
                    )}

                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />

                      {getLessonDuration(activeLesson)}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeLesson?.title ??
                      'Bài học chưa có tiêu đề'}
                  </h2>
                </div>

              </div>

              {/* Tabs */}

              <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold text-slate-500 pt-2">
                <button
                  onClick={() =>
                    setActiveTab(
                      'overview',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'overview'
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Mô tả bài học

                  {activeTab ===
                    'overview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      'notes',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'notes'
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Tài liệu & Ghi chú

                  {activeTab ===
                    'notes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      'discussion',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'discussion'
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Thảo luận & Hỏi đáp

                  {activeTab ===
                    'discussion' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>
              </div>

              {/* Tab Content */}

              <div className="pt-2 text-xs text-slate-600 leading-relaxed">
                {activeTab ===
                  'overview' && (
                  <p className="whitespace-pre-line text-slate-600 text-sm">
                    {activeLesson?.description ||
                      'Bài học này chưa có nội dung mô tả chi tiết.'}
                  </p>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-slate-500">Tài liệu học tập được giảng viên đính kèm cho bài học và khóa học:</p>
                    {materialsError ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700">Không thể tải danh sách tài liệu. Vui lòng thử tải lại trang.</p> : lessonMaterials.length === 0 ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">Bài học hiện chưa có tài liệu đính kèm.</p> : lessonMaterials.map(material => (
                      <div key={material.materialId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <FileText className="h-5 w-5 shrink-0 text-violet-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{material.title}</p>
                          <p className="text-[11px] text-slate-500">{material.lessonId == null ? 'Tài liệu chung của khóa học' : 'Tài liệu bài học'}</p>
                        </div>
                        <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" download className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700" title="Tải hoặc mở tài liệu">
                          <Download className="h-4 w-4" /> Tải xuống
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab ===
                  'discussion' && (
                  <div className="space-y-3">
                    <p className="text-slate-500">
                      Bình luận và trao đổi ý kiến với học viên & giảng viên:
                    </p>

                    <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200">
                      <MessageSquare className="h-5 w-5 text-violet-600" />

                      <input
                        type="text"
                        placeholder="Viết câu hỏi hoặc nhận xét của bạn..."
                        className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar Playlist ───────────────────────────────────── */}

        {/* Mobile Backdrop when playlist sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {isSidebarOpen && (
          <aside className="mseek-curriculum fixed inset-y-0 right-0 z-40 w-[85vw] max-w-[340px] lg:static lg:w-[310px] shrink-0 border-l lg:border-r border-violet-100 bg-white shadow-2xl lg:shadow-none flex flex-col h-full transition-all duration-300">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-violet-600" />
                  Lộ trình học tập
                </h3>

                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {completedLessonIds.length}/
                  {totalLessonCount}{' '}
                  bài đã xem
                </p>
              </div>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Đóng danh sách bài học"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lesson List grouped by Modules */}

            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-300">
              {totalLessonCount ===
              0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Chưa có bài học nào trong khóa học này.
                </div>
              ) : sortedModules.length >
                0 ? (
                <>
                  {sortedModules.map(
                    (mod) => {
                      const modLessons =
                        lessonsByModule[
                          mod.moduleId
                        ] || [];
                      const chapterQuiz = quizzes.find(q =>
                        q.purpose === 'CHAPTER_ASSESSMENT' &&
                        q.moduleId === mod.moduleId &&
                        (q.status === 'ACTIVE' || q.status === 'ARCHIVED' || q.status === 'INACTIVE')
                      );

                      const isCollapsed =
                        collapsedModules[
                          mod.moduleId
                        ];

                      return (
                        <div
                          key={
                            mod.moduleId
                          }
                          className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                        >
                          {/* Module Header */}

                          <button
                            onClick={() =>
                              toggleModuleCollapse(
                                mod.moduleId,
                              )
                            }
                            className="w-full flex items-center justify-between p-3 bg-slate-50/80 hover:bg-violet-50/50 text-left transition-colors cursor-pointer border-b border-slate-100"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Layers className="h-3.5 w-3.5 text-violet-600 shrink-0" />

                              <span className="text-xs font-bold text-slate-800 truncate">
                                Chương{' '}
                                {
                                  mod.orderIndex
                                }
                                :{' '}
                                {mod.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-slate-500">
                              <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold border border-violet-200/60">
                                {
                                  modLessons.length
                                }
                              </span>

                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Module Lessons List */}

                          {!isCollapsed && (
                            <div className="p-1 space-y-1">
                              {modLessons.length ===
                              0 ? (
                                <div className="p-3 text-[11px] text-slate-500 text-center italic">
                                  Chưa có bài học
                                </div>
                              ) : (
                                modLessons.map(
                                  (lesson) => {
                                    const isActive =
                                      lesson.lessonId ===
                                      activeLesson?.lessonId;

                                    const isCompleted =
                                      completedLessonIds.includes(
                                        lesson.lessonId,
                                      );

                                    return (
                                      <div
                                        key={
                                          lesson.lessonId
                                        }
                                        className="space-y-1"
                                      >
                                        {/* Lesson */}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectLesson(lesson)
                                          }
                                          disabled={lesson.isLocked}
                                          title={lesson.isLocked ? (lesson.lockReason || 'Cần PASS bài kiểm tra trước đó') : undefined}
                                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                            isActive
                                              ? 'bg-violet-50 border border-violet-300 text-violet-900 shadow-2xs font-bold'
                                              : 'hover:bg-slate-100/70 border border-transparent text-slate-700'
                                          }`}
                                        >
                                          <div className="shrink-0 mt-0.5">
                                            {lesson.isLocked ? (
                                              <LockKeyhole className="h-4 w-4 text-slate-400" />
                                            ) : isCompleted ? (
                                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : isActive ? (
                                              <PlayCircle className="h-4 w-4 text-violet-600 animate-pulse" />
                                            ) : (
                                              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                                #
                                                {
                                                  lesson.orderIndex
                                                }
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <p
                                              className={`line-clamp-2 ${
                                                isActive
                                                  ? 'text-violet-700 font-bold'
                                                  : 'text-slate-800 font-medium'
                                              }`}
                                            >
                                              {
                                                lesson.title
                                              }
                                            </p>

                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                              <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-slate-400" />

                                                {getLessonDuration(lesson)}
                                              </span>

                                              {lesson.isPreview && (
                                                <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 font-bold">
                                                  Xem thử
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </button>

                                        {/* Quiz của lesson */}

                                        {renderQuizButton(
                                          lesson.lessonId,
                                        )}

                                        {renderDailyPracticeButtons(lesson.lessonId)}
                                      </div>
                                    );
                                  },
                                )
                              )}
                            </div>
                          )}
                          {!isCollapsed && chapterQuiz && (
                            <div className="mx-2 mb-2 mt-1 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                              <div className="flex items-start gap-2">
                                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-extrabold text-amber-950">Bài đánh giá {mod.title}</p>
                                  <p className="mt-1 text-[10px] leading-4 text-amber-800">Hoàn thành video và đạt tất cả bài luyện tập đã đến ngày mở trong chương để làm bài đánh giá. Đạt từ 80% để mở chương tiếp theo.</p>
                                  {chapterQuiz.status === 'ACTIVE' && chapterQuiz.isLocked ? (
                                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800"><LockKeyhole size={12}/>{chapterQuiz.lockReason || 'Hoàn thành và PASS tất cả Quiz luyện tập trong chương để mở bài đánh giá.'}</p>
                                  ) : chapterQuiz.status === 'ACTIVE' ? (
                                    <div className="mt-2">
                                      <LearnerQuizHistoryActions
                                        quizId={chapterQuiz.quizId}
                                        maxAttempts={chapterQuiz.maxAttempts}
                                        passingScore={chapterQuiz.passingScore}
                                        returnTo={getQuizReturnTo()}
                                        onTake={() => handleTakeQuiz(chapterQuiz.quizId)}
                                      />
                                    </div>
                                  ) : chapterQuiz.status === 'ARCHIVED' ? (
                                    <p className="mt-2 text-[11px] font-semibold text-amber-800">
                                      {chapterQuiz.availableFrom
                                        ? `Đang lên lịch mở: ${new Date(chapterQuiz.availableFrom).toLocaleString('vi-VN')}`
                                        : 'Bài đánh giá đang được lưu trữ.'}
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-[11px] font-semibold text-slate-500">Bài đánh giá hiện đang ngừng hoạt động.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {!isCollapsed && !chapterQuiz && modLessons.length > 0 && (
                            <p className="mx-3 mb-3 mt-1 rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-[10px] leading-4 text-amber-800">
                              Chương này chưa có bài đánh giá chương. Học viên cần bài đánh giá này sau khi hoàn thành các Quiz từng bài để mở chương tiếp theo.
                            </p>
                          )}
                        </div>
                      );
                    },
                  )}

                  {/* Unassigned lessons */}

                  {unassignedLessons.length >
                    0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="p-3 bg-slate-50 text-xs font-bold text-slate-800 border-b border-slate-100 flex items-center justify-between">
                        <span>
                          Bài học tự do (
                          {
                            unassignedLessons.length
                          }
                          )
                        </span>
                      </div>

                      <div className="p-1 space-y-1">
                        {unassignedLessons.map(
                          (lesson) => {
                            const isActive =
                              lesson.lessonId ===
                              activeLesson?.lessonId;

                            const isCompleted =
                              completedLessonIds.includes(
                                lesson.lessonId,
                              );

                            return (
                              <div
                                key={
                                  lesson.lessonId
                                }
                                className="space-y-1"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectLesson(lesson)}
                                  disabled={lesson.isLocked}
                                  title={lesson.isLocked ? (lesson.lockReason || 'Cần PASS bài kiểm tra trước đó') : undefined}
                                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs'
                                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                  }`}
                                >
                                  <div className="shrink-0 mt-0.5">
                                    {lesson.isLocked ? (
                                              <LockKeyhole className="h-4 w-4 text-slate-400" />
                                            ) : isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : isActive ? (
                                      <PlayCircle className="h-4 w-4 text-amber-600 animate-pulse" />
                                    ) : (
                                      <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                        #
                                        {
                                          lesson.orderIndex
                                        }
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`line-clamp-2 ${
                                        isActive
                                          ? 'text-amber-800 font-bold'
                                          : 'text-slate-700 font-medium'
                                      }`}
                                    >
                                      {
                                        lesson.title
                                      }
                                    </p>

                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        {getLessonDuration(lesson)}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                {renderQuizButton(
                                  lesson.lessonId,
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {/* Speaking Assignments Section */}

                  {speakingAssignmentLessons.length > 0 && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Mic className="h-4 w-4 text-purple-600 animate-pulse" />
                          <span>Bài thi nói cuối khóa ({speakingAssignmentLessons.length})</span>
                        </span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                          SPEAKING
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {speakingAssignmentLessons.map((lesson) => {
                          const isActive =
                            lesson.lessonId === activeLesson?.lessonId;
                          const isCompleted =
                            completedLessonIds.includes(lesson.lessonId);

                          return (
                            <button
                              key={lesson.lessonId}
                              type="button"
                              onClick={() => handleSelectLesson(lesson)}
                              disabled={lesson.isLocked}
                              title={lesson.isLocked ? (lesson.lockReason || 'Cần PASS bài kiểm tra trước đó') : undefined}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 border border-purple-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {lesson.isLocked ? (
                                              <LockKeyhole className="h-4 w-4 text-slate-400" />
                                            ) : isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <Mic className="h-4 w-4 text-purple-500 shrink-0" />
                                )}
                                <span className="font-bold truncate">
                                  {lesson.title}{lesson.isLocked && <span className="ml-2 text-[10px] font-semibold text-slate-400">· Chưa mở khóa</span>}
                                </span>
                              </div>

                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                              }`}>
                                Làm bài
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Course-wide daily practice (does not affect progression). */}
                  {quizzes.filter(q => q.purpose === 'DAILY_PRACTICE' && q.lessonId == null && (q.status === 'ACTIVE' || q.status === 'ARCHIVED' || q.status === 'INACTIVE')).length > 0 && (
                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 border border-sky-200">
                          <CalendarDays className="h-4 w-4 text-sky-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-sky-950">Bài luyện tập hằng ngày</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">Bài luyện tập bổ sung, không ảnh hưởng điều kiện mở khóa bài học hoặc chương.</p>
                          {quizzes.filter(q => q.purpose === 'DAILY_PRACTICE' && q.lessonId == null && (q.status === 'ACTIVE' || q.status === 'ARCHIVED' || q.status === 'INACTIVE')).map(q => (
                            <div key={q.quizId} className="mt-2 rounded-lg border border-sky-100 bg-white p-2">
                              <p className="text-[11px] font-semibold text-sky-900">{q.title}</p>
                              {q.status === 'ACTIVE' ? <LearnerQuizHistoryActions quizId={q.quizId} maxAttempts={q.maxAttempts} passingScore={q.passingScore} returnTo={getQuizReturnTo()} onTake={() => handleTakeQuiz(q.quizId)} />
                                : q.status === 'ARCHIVED' ? <p className="mt-1 text-[11px] text-amber-700">{q.availableFrom ? `Đang lên lịch mở: ${new Date(q.availableFrom).toLocaleString('vi-VN')}` : 'Bài luyện tập đang được lưu trữ.'}</p>
                                : <p className="mt-1 text-[11px] text-slate-500">Bài luyện tập hiện đang ngừng hoạt động.</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =====================================================
                      OVERALL COURSE QUIZ
                  ===================================================== */}

                  {overallQuiz && (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 border border-violet-200">
                          <Award className="h-4 w-4 text-violet-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-violet-950">
                            Quiz tổng hợp khóa học
                          </p>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                            Kiểm tra tổng hợp kiến thức của toàn bộ khóa học.
                          </p>

                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                            <span>
                              {
                                overallQuiz.questionCount ??
                                0
                              }{' '}
                              câu hỏi
                            </span>

                            <span>•</span>

                            <span>
                              {
                                overallQuiz.timeLimitMinutes ??
                                0
                              }{' '}
                              phút
                            </span>

                            <span>•</span>

                            <span>
                              Đạt{' '}
                              {
                                overallQuiz.passingScore ??
                                0
                              }
                              %
                            </span>
                          </div>

                          <div className="mt-3">
                            {overallQuiz.status === 'ACTIVE' && overallQuiz.isLocked ? (
                              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-800"><LockKeyhole size={12}/>{overallQuiz.lockReason || 'PASS tất cả bài học và bài đánh giá chương để mở Quiz tổng kết.'}</p>
                            ) : overallQuiz.status === 'ACTIVE' ? (
                              <LearnerQuizHistoryActions
                                quizId={overallQuiz.quizId}
                                maxAttempts={overallQuiz.maxAttempts}
                                passingScore={overallQuiz.passingScore}
                                returnTo={getQuizReturnTo(activeLesson?.lessonId)}
                                onTake={() => handleTakeQuiz(overallQuiz.quizId)}
                              />
                            ) : overallQuiz.status === 'ARCHIVED' ? (
                              <p className="text-[11px] font-semibold text-violet-700">{overallQuiz.availableFrom ? `Đang lên lịch mở: ${new Date(overallQuiz.availableFrom).toLocaleString('vi-VN')}` : 'Quiz tổng kết đang được lưu trữ.'}</p>
                            ) : (
                              <p className="text-[11px] text-slate-500">Quiz tổng kết hiện đang ngừng hoạt động.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Fallback flat list if no modules created yet */

                orderedLessons.map(
                  (lesson) => {
                    const isActive =
                      lesson.lessonId ===
                      activeLesson?.lessonId;

                    const isCompleted =
                      completedLessonIds.includes(
                        lesson.lessonId,
                      );

                    return (
                      <div
                        key={
                          lesson.lessonId
                        }
                        className="space-y-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectLesson(
                              lesson,
                            )
                          }
                          className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-violet-50 border border-violet-300 text-violet-900 shadow-2xs'
                              : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {lesson.isLocked ? (
                                              <LockKeyhole className="h-4 w-4 text-slate-400" />
                                            ) : isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : isActive ? (
                              <PlayCircle className="h-4 w-4 text-violet-600 animate-pulse" />
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                #
                                {
                                  lesson.orderIndex
                                }
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`line-clamp-2 ${
                                isActive
                                  ? 'text-violet-700 font-bold'
                                  : 'text-slate-800 font-medium'
                              }`}
                            >
                              {
                                lesson.title
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />

                                {getLessonDuration(lesson)}
                              </span>
                            </div>
                          </div>
                        </button>

                        {renderQuizButton(
                          lesson.lessonId,
                        )}
                      </div>
                    );
                  },
                )
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Certificate Modal */}

      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() =>
          setIsCertModalOpen(false)
        }
        certificate={
          activeCert ||
          certificate ||
          null
        }
        courseTitle={
          course?.title
        }
        learnerName={
          user?.name ||
          (user as any)?.fullName ||
          'Học viên'
        }
      />

      {/* AI Mentor RAG Chat Drawer */}
      <CourseChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        courseId={courseId}
        courseTitle={course?.title}
        activeLesson={activeLesson ? {
          lessonId: activeLesson.lessonId,
          title: activeLesson.title,
          lessonType: activeLesson.lessonType
        } : null}
        onSelectLesson={(targetLessonId) => {
          const found = lessons.find((l) => l.lessonId === targetLessonId);
          if (found) {
            handleSelectLesson(found);
          }
        }}
      />
    </div>
  );
};
