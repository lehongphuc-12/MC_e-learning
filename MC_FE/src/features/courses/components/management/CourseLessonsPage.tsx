// =============================================================================
// CourseLessonsPage.tsx
// Curriculum Builder / Module & Lesson Management Page
// =============================================================================

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import QuizImportStudio from '../../../quizzes/components/QuizImportStudio';
import QuizSyncStudio from '../../../quizzes/components/QuizSyncStudio';
import { quizImportApi } from '../../../quizzes/api/quizImportApi';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  PlusCircle,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Eye,
  Edit2,
  Trash2,
  ImageOff,
  Sparkles,
  ExternalLink,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Layers,
  FolderPlus,
  Paperclip,
  ClipboardList,
  Plus,
  Users,
  GripVertical,
  Send,
  Mic2,
  FileUp,
  Search,
  GitCompareArrows,
  CloudUpload,
  ShieldCheck,
  Video, FileText, MoreVertical, LayoutGrid, List, CheckCircle2, Menu, BarChart3, Upload, SlidersHorizontal,
} from 'lucide-react';
import { CourseStudentsModal } from './CourseStudentsModal';
import { IncompleteCourseModal } from './IncompleteCourseModal';

import { useCourseDetail } from '../../hooks/useInstructorCourses';
import { useSubmitForApproval } from '../../hooks/useCourseMutations';

import { useQuizzesByCourse } from '../../../quizzes/hooks/useQuiz';

import {
  useCourseLessons,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  lessonQueryKeys,
} from '../../hooks/useLessonQueries';

import { lessonApi } from '../../api/lessonApi';

import {
  useCourseModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
} from '../../hooks/useModuleQueries';

import { LessonFormModal } from './LessonFormModal';
import { LessonStatusModal } from './LessonStatusModal';
import { ImportLessonModal } from './ImportLessonModal';
import { ModuleFormModal } from './ModuleFormModal';
import { ImportModuleModal } from './ImportModuleModal';
import { CourseMaterialModal } from './CourseMaterialModal';
import { CourseStatusBadge } from './CourseStatusBadge';

import type { Lesson, CreateLessonDto } from '../../types/lessonTypes';
import type { CourseModule, CreateModuleDto } from '../../types/moduleTypes';

export const CourseLessonsPage: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [quizImportOpen, setQuizImportOpen] = useState(false);
  const [quizSyncTarget, setQuizSyncTarget] = useState<{ id: number; title: string } | null>(null);
  const [quizSearch, setQuizSearch] = useState('');
  const [lessonSearch, setLessonSearch] = useState('');
  const [contentTab, setContentTab] = useState<'lessons' | 'quizzes' | 'materials' | 'assignments'>('lessons');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [quizExporting, setQuizExporting] = useState<number | null>(null);
  const [quizNotice, setQuizNotice] = useState('');
  const queryClient = useQueryClient();

  const { id, courseId: courseIdParam } = useParams<{ id?: string; courseId?: string }>();
  const rawCourseId = courseIdParam ?? id;
  const parsedCourseId = Number(rawCourseId);
  const courseId = rawCourseId && Number.isInteger(parsedCourseId) && parsedCourseId > 0 ? parsedCourseId : 0;

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);

  const { data: lessons = [], isLoading: isLessonsLoading, refetch: refetchLessons } =
    useCourseLessons(courseId);

  const { data: modules = [], isLoading: isModulesLoading } =
    useCourseModules(courseId);

  const { data: quizzes = [], isLoading: isQuizzesLoading } =
    useQuizzesByCourse(courseId);

  // ===========================================================================
  // ACCORDION STATE
  // ===========================================================================

  const [collapsedModules, setCollapsedModules] = useState<
    Record<number, boolean>
  >({});

  // ===========================================================================
  // DRAG & DROP STATE
  // ===========================================================================

  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);

  const [dragOverLessonId, setDragOverLessonId] = useState<number | null>(null);

  // ===========================================================================
  // LESSON MODAL STATE
  // ===========================================================================

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  const [isLessonImportModalOpen, setIsLessonImportModalOpen] =
    useState(false);

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [targetModuleId, setTargetModuleId] = useState<number | null>(null);

  const [targetLessonType, setTargetLessonType] = useState<'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'ASSIGNMENT'>('VIDEO');

  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  // ===========================================================================
  // MODULE MODAL STATE
  // ===========================================================================

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);

  const [isModuleImportModalOpen, setIsModuleImportModalOpen] =
    useState(false);

  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(
    null
  );

  // ===========================================================================
  // MATERIAL MODAL STATE
  // ===========================================================================

  const [materialTarget, setMaterialTarget] = useState<{
    lessonId?: number | null;
    lessonTitle?: string | null;
  } | null>(null);

  // ===========================================================================
  // APPROVAL STATE
  // ===========================================================================

  const { mutate: submitForApproval, isPending: isSubmittingForApproval } =
    useSubmitForApproval();

  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);

  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<
    string | null
  >(null);

  // ===========================================================================
  // STUDENT MODAL
  // ===========================================================================

  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);

  // Status Notification Modal State
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
    reason?: string | null;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    reason: null,
  });

  // ===========================================================================
  // MUTATIONS
  // ===========================================================================

  const { mutateAsync: createLessonAsync, isPending: isCreatingLesson } =
    useCreateLesson(courseId);

  const { mutateAsync: updateLessonAsync, isPending: isUpdatingLesson } =
    useUpdateLesson(courseId);

  const { mutate: deleteLesson, isPending: isDeletingLesson } =
    useDeleteLesson(courseId);

  const { mutate: createModule, isPending: isCreatingModule } =
    useCreateModule(courseId);

  const { mutate: updateModule, isPending: isUpdatingModule } =
    useUpdateModule(courseId);

  const { mutate: deleteModule, isPending: isDeletingModule } =
    useDeleteModule(courseId);

  // ===========================================================================
  // ===========================================================================
  // DURATION SYNCHRONIZATION & ESTIMATION
  // ===========================================================================

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

  // Pre-load durations for direct video files in background
  useEffect(() => {
    lessons.forEach((l) => {
      if (l.videoUrl && l.videoUrl.trim() !== '') {
        if (detectedDurations[l.lessonId]) return;

        const isEmbed =
          l.videoUrl.includes('youtube.com') ||
          l.videoUrl.includes('youtu.be') ||
          l.videoUrl.includes('vimeo.com') ||
          l.videoUrl.includes('drive.google.com');

        if (!isEmbed) {
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
  }, [lessons, detectedDurations]);

  // Format lesson duration for display
  const getLessonDuration = (lesson: Lesson): string => {
    const hasVideo = !!(
      lesson.videoUrl &&
      lesson.videoUrl.trim() !== '' &&
      lesson.lessonType !== 'ASSIGNMENT'
    );

    if (!hasVideo) {
      const desc = (lesson.description || '').trim();
      const wordCount = desc.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 20) {
        const readingMins = Math.max(1, Math.ceil(wordCount / 150));
        return `${readingMins} phút`;
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

    // Default when video is not loaded yet
    return '10 phút';
  };

  // Duration in minutes for mathematical totals
  const getLessonDurationMinutes = (lesson: Lesson): number => {
    const hasVideo = !!(
      lesson.videoUrl &&
      lesson.videoUrl.trim() !== '' &&
      lesson.lessonType !== 'ASSIGNMENT'
    );

    if (hasVideo) {
      const durationSec = detectedDurations[lesson.lessonId];
      if (durationSec && durationSec > 0) {
        return Math.max(1, Math.round(durationSec / 60));
      }
      return 10;
    }

    const desc = (lesson.description || '').trim();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20) {
      return Math.max(1, Math.ceil(wordCount / 150));
    }
    return 10;
  };

  const totalDuration = lessons.reduce(
    (sum, lesson) => sum + getLessonDurationMinutes(lesson),
    0
  );

  const [isSyncingDurations, setIsSyncingDurations] = useState(false);

  const handleSyncAllDurations = async () => {
    setIsSyncingDurations(true);
    let updatedCount = 0;
    try {
      for (const lesson of lessons) {
        const targetMinutes = getLessonDurationMinutes(lesson);
        if (targetMinutes !== lesson.durationMinutes) {
          await updateLessonAsync({
            lessonId: lesson.lessonId,
            dto: {
              title: lesson.title,
              description: lesson.description,
              durationMinutes: targetMinutes,
              orderIndex: lesson.orderIndex,
              moduleId: lesson.moduleId,
              lessonType: lesson.lessonType,
              isPreview: lesson.isPreview,
              status: lesson.status,
              videoUrl: lesson.videoUrl,
            },
          });
          updatedCount++;
        }
      }
      await queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Đồng bộ thời lượng thành công',
        message: `Đã tự động cập nhật thời lượng cho ${updatedCount} bài học theo video thực tế và nội dung bài học vào cơ sở dữ liệu.`,
      });
    } catch (err: any) {
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Đồng bộ thời lượng thất bại',
        message: err?.message || 'Có lỗi xảy ra khi đồng bộ thời lượng.',
      });
    } finally {
      setIsSyncingDurations(false);
    }
  };

  // ===========================================================================
  // MODULE COLLAPSE
  // ===========================================================================

  const toggleModuleCollapse = (moduleId: number) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // ===========================================================================
  // SEND COURSE FOR APPROVAL
  // ===========================================================================

  const handleSendForApproval = () => {
    const missing: string[] = [];

    if (!course?.title || !course.title.trim()) {
      missing.push('Tên khóa học chưa điền');
    }

    if (!course?.categoryId) {
      missing.push('Chưa chọn Danh mục khóa học');
    }

    if (!course?.description || !course.description.trim()) {
      missing.push('Mô tả khóa học chưa có');
    }

    if (modules.length === 0) {
      missing.push('Chưa tạo Chương học (Module) nào');
    }

    if (lessons.length === 0) {
      missing.push('Chưa tạo Bài học (Lesson) nào');
    }

    const hasSpeakingAssignment = lessons.some((l) => l.lessonType === 'ASSIGNMENT');
    if (!hasSpeakingAssignment) {
      missing.push('Chưa tạo Bài tập nói (Speaking Assignment) cuối khóa nào');
    }

    if (missing.length > 0) {
      setMissingRequirements(missing);
      setIsIncompleteModalOpen(true);
      return;
    }

    submitForApproval(
      { courseId },
      {
        onSuccess: () => {
          setApprovalSuccessMessage(
            'Khóa học đã được gửi cho Admin phê duyệt thành công!'
          );

          setTimeout(() => {
            setApprovalSuccessMessage(null);
          }, 5000);
        },

        onError: (err: any) => {
          const msg =
            err?.message || 'Không thể gửi duyệt bài. Vui lòng kiểm tra lại.';

          setMissingRequirements([msg]);
          setIsIncompleteModalOpen(true);
        },
      }
    );
  };

  // ===========================================================================
  // DRAG & DROP LESSON HANDLERS
  // ===========================================================================

  const handleLessonDragStart = (e: React.DragEvent, lesson: Lesson) => {
    e.dataTransfer.effectAllowed = 'move';

    e.dataTransfer.setData('text/plain', String(lesson.lessonId));

    setDraggedLesson(lesson);
  };

  const handleLessonDragOver = (e: React.DragEvent, targetLesson: Lesson) => {
    e.preventDefault();

    e.dataTransfer.dropEffect = 'move';

    if (dragOverLessonId !== targetLesson.lessonId) {
      setDragOverLessonId(targetLesson.lessonId);
    }
  };

  const handleLessonDragEnd = () => {
    setDraggedLesson(null);
    setDragOverLessonId(null);
  };

  const handleLessonDrop = (e: React.DragEvent, targetLesson: Lesson) => {
    e.preventDefault();

    setDragOverLessonId(null);

    if (!draggedLesson || draggedLesson.lessonId === targetLesson.lessonId) {
      setDraggedLesson(null);
      return;
    }

    const targetModuleId = targetLesson.moduleId;

    const moduleLessons = lessons
      .filter((lesson) => lesson.moduleId === targetModuleId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    let reordered: Lesson[] = [...moduleLessons];

    const draggedIdx = reordered.findIndex(
      (lesson) => lesson.lessonId === draggedLesson.lessonId
    );

    const targetIdx = reordered.findIndex(
      (lesson) => lesson.lessonId === targetLesson.lessonId
    );

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [moved] = reordered.splice(draggedIdx, 1);

      reordered.splice(targetIdx, 0, moved);
    } else {
      const filtered = reordered.filter(
        (lesson) => lesson.lessonId !== draggedLesson.lessonId
      );

      const insertIdx = targetIdx !== -1 ? targetIdx : filtered.length;

      filtered.splice(insertIdx, 0, {
        ...draggedLesson,
        moduleId: targetModuleId,
      });

      reordered = filtered;
    }

    reordered.forEach((lesson, index) => {
      const newOrderIndex = index + 1;

      if (
        lesson.orderIndex !== newOrderIndex ||
        lesson.moduleId !== targetModuleId
      ) {
        void updateLessonAsync({

          lessonId: lesson.lessonId,

          dto: {
            title: lesson.title,
            description: lesson.description,
            durationMinutes: lesson.durationMinutes,
            isPreview: lesson.isPreview,
            status: lesson.status,
            videoUrl: lesson.videoUrl,
            moduleId: targetModuleId,
            orderIndex: newOrderIndex,
          },
        });
      }
    });

    setDraggedLesson(null);
  };

  // ===========================================================================
  // LESSON ACTIONS
  // ===========================================================================

  const handleOpenCreateLesson = (moduleId?: number | null) => {
    setEditingLesson(null);
    setTargetModuleId(moduleId ?? null);
    setTargetLessonType('VIDEO');
    setIsLessonModalOpen(true);
  };

  const handleOpenCreateSpeakingAssignment = (moduleId?: number | null) => {
    setEditingLesson(null);
    setTargetModuleId(moduleId ?? null);
    setTargetLessonType('ASSIGNMENT');
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setTargetModuleId(lesson.moduleId ?? null);
    setTargetLessonType(lesson.lessonType || 'VIDEO');
    setIsLessonModalOpen(true);
  };

  const handleLessonFormSubmit = async (dto: CreateLessonDto, file?: File | null) => {
    try {
      if (editingLesson) {
        await updateLessonAsync({
          lessonId: editingLesson.lessonId,
          dto,
        });

        if (file && editingLesson.lessonId) {
          try {
            await lessonApi.uploadVideo(editingLesson.lessonId, file);
          } catch (uploadErr: any) {
            console.error('File upload error:', uploadErr);
            const reason = uploadErr?.response?.data?.message || uploadErr?.message || String(uploadErr);
            setIsLessonModalOpen(false);
            setEditingLesson(null);
            setStatusModal({
              isOpen: true,
              type: 'error',
              title: 'Cập nhật bài học thành công nhưng tải video thất bại',
              message: `Bài học "${dto.title}" đã được lưu thông tin, nhưng quá trình tải file video lên Cloudflare R2 gặp sự cố.`,
              reason: reason,
            });
            await queryClient.invalidateQueries({
              queryKey: lessonQueryKeys.courseLessons(courseId),
            });
            refetchLessons?.();
            return;
          }
        }

        setIsLessonModalOpen(false);
        setEditingLesson(null);
        setTargetLessonType('VIDEO');
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Cập nhật bài học thành công!',
          message: `Bài học "${dto.title}" đã được cập nhật thông tin thành công${file ? ' và video đã tải lên.' : '.'}`,
          reason: null,
        });
      } else {
        const createdLesson = await createLessonAsync(dto);

        if (file && createdLesson?.lessonId) {
          try {
            await lessonApi.uploadVideo(createdLesson.lessonId, file);
          } catch (uploadErr: any) {
            console.error('File upload error:', uploadErr);
            const reason = uploadErr?.response?.data?.message || uploadErr?.message || String(uploadErr);
            setIsLessonModalOpen(false);
            setEditingLesson(null);
            setStatusModal({
              isOpen: true,
              type: 'error',
              title: 'Tạo bài học thành công nhưng tải video thất bại',
              message: `Bài học "${dto.title}" đã khởi tạo trong cơ sở dữ liệu, nhưng không thể đẩy file video lên máy chủ Cloudflare R2.`,
              reason: reason,
            });
            await queryClient.invalidateQueries({
              queryKey: lessonQueryKeys.courseLessons(courseId),
            });
            refetchLessons?.();
            return;
          }
        }

        setIsLessonModalOpen(false);
        setEditingLesson(null);
        setTargetLessonType('VIDEO');
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Tạo bài học thành công!',
          message: `Bài học "${dto.title}" đã được tạo thành công${file ? ' cùng với video đi kèm.' : '.'}`,
          reason: null,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: lessonQueryKeys.courseLessons(courseId),
      });
      refetchLessons?.();
    } catch (err: any) {
      console.error('Lesson submit error:', err);
      const reason = err?.response?.data?.message || err?.message || String(err);
      setIsLessonModalOpen(false);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: editingLesson ? 'Cập nhật bài học thất bại' : 'Tạo bài học thất bại',
        message: `Đã xảy ra lỗi trong quá trình lưu thông tin bài học "${dto.title}" vào hệ thống.`,
        reason: reason,
      });
    }
  };

  const handleDeleteLessonConfirm = () => {
    if (!lessonToDelete) {
      return;
    }

    deleteLesson(lessonToDelete.lessonId, {
      onSuccess: () => setLessonToDelete(null),
    });
  };

  // ===========================================================================
  // MODULE ACTIONS
  // ===========================================================================

  const handleOpenCreateModule = () => {
    setEditingModule(null);
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setIsModuleModalOpen(true);
  };

  const handleModuleFormSubmit = (dto: CreateModuleDto) => {
    if (editingModule) {
      updateModule(
        {
          moduleId: editingModule.moduleId,
          dto,
        },
        {
          onSuccess: () => {
            setIsModuleModalOpen(false);
            setEditingModule(null);
          },
        }
      );
    } else {
      createModule(dto, {
        onSuccess: () => {
          setIsModuleModalOpen(false);
        },
      });
    }
  };

  const handleDeleteModuleConfirm = () => {
    if (!moduleToDelete) {
      return;
    }

    deleteModule(moduleToDelete.moduleId, {
      onSuccess: () => setModuleToDelete(null),
    });
  };

  // ===========================================================================
  // LOADING
  // ===========================================================================

  if (isCourseLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ===========================================================================
  // GROUP LESSONS BY MODULE
  // ===========================================================================

  const lessonsByModule: Record<number, Lesson[]> = {};

  const unassignedLessons: Lesson[] = [];

  lessons.forEach((lesson) => {
    // Speaking Assignments belong exclusively to the overall course section
    if (lesson.lessonType === 'ASSIGNMENT') {
      return;
    }

    if (lesson.moduleId) {
      if (!lessonsByModule[lesson.moduleId]) {
        lessonsByModule[lesson.moduleId] = [];
      }

      lessonsByModule[lesson.moduleId].push(lesson);
    } else {
      unassignedLessons.push(lesson);
    }
  });

  // ===========================================================================
  // FIND LESSON BELONGING TO QUIZ
  // ===========================================================================
  //
  // Quiz relationship:
  // lessonId === null  -> Overall course quiz
  // lessonId !== null  -> Quiz of specific lesson
  //
  // Không dựa vào tên Quiz.
  // ===========================================================================

  const getQuizLesson = (quiz: (typeof quizzes)[number]) => {
    if (quiz.lessonId == null) {
      return null;
    }

    return lessons.find((lesson) => lesson.lessonId === quiz.lessonId);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-[#f5f8fe] pb-16">
      {/* COURSE HERO */}
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6">
        <div className="relative overflow-hidden rounded-[24px] bg-[#071d53] px-6 py-7 text-white shadow-[0_18px_45px_-22px_rgba(5,45,140,.6)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_75%,rgba(0,125,255,.55),transparent_48%),linear-gradient(120deg,#061a48_10%,#0648bf_75%,#061a48)]" />
          <div className="pointer-events-none absolute -right-12 top-[-80px] h-[350px] w-[500px] rotate-[-16deg] rounded-full border-[45px] border-blue-400/10" />
          <div className="pointer-events-none absolute right-[7%] top-1/2 hidden -translate-y-1/2 items-center gap-[5px] opacity-60 lg:flex">{Array.from({length:43},(_,i)=><span key={i} className="w-[3px] rounded-full bg-cyan-300" style={{height:`${10+Math.abs(Math.sin(i*1.8)*Math.cos(i*.35))*105}px`}} />)}</div>
          <Mic2 className="pointer-events-none absolute bottom-[-65px] right-[11%] hidden h-[260px] w-[260px] rotate-[-13deg] text-cyan-200/30 drop-shadow-2xl lg:block" strokeWidth={1.2}/>
          <div className="relative z-10 max-w-[850px]">
            <button onClick={()=>navigate('/instructor/courses')} className="mb-6 inline-flex items-center gap-2 rounded-lg bg-blue-600/60 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"><ArrowLeft size={15}/> Quay lại khóa học</button>
            <p className="mb-2 text-sm text-blue-100">Quản lý nội dung khóa học</p>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[30px]">{course?.title || 'Khóa học'}</h1>{course?.status && <CourseStatusBadge status={course.status} size="sm"/>}</div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/85">{course?.description || 'Xây dựng nội dung luyện giọng, phát âm và truyền đạt chuyên nghiệp qua từng bài học.'}</p>
          </div>
        </div>
        {/* NAVIGATION TABS */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
          {([{key:'lessons',label:'Bài giảng',count:lessons.filter(l=>l.lessonType!=='ASSIGNMENT').length,icon:PlayCircle},{key:'quizzes',label:'Quiz',count:quizzes.length,icon:ClipboardList},{key:'materials',label:'Tài liệu',icon:FileText},{key:'assignments',label:'Bài tập nói',count:lessons.filter(l=>l.lessonType==='ASSIGNMENT').length,icon:Mic2}] as const).map(tab=><button key={tab.key} onClick={()=>{setContentTab(tab.key);if(tab.key==='quizzes')document.getElementById('quiz-management')?.scrollIntoView({behavior:'smooth',block:'start'});if(tab.key==='assignments')document.getElementById('speaking-assignment-management')?.scrollIntoView({behavior:'smooth',block:'start'});if(tab.key==='materials')setMaterialTarget({lessonId:null});}} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${contentTab===tab.key?'bg-[#0754ef] text-white shadow-lg shadow-blue-600/20':'bg-[#f4f8ff] text-[#173c81] hover:bg-blue-100'}`}><tab.icon size={16}/>{tab.label}{'count' in tab && <span className="opacity-75">({tab.count})</span>}</button>)}
          <button onClick={()=>navigate(`/courses/${courseId}/learn`)} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50"><Eye size={16}/> Xem trước khóa học</button>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {([{label:'Tổng số bài giảng',value:lessons.filter(l=>l.lessonType!=='ASSIGNMENT').length,icon:PlayCircle,color:'text-blue-600',bg:'bg-blue-50'},{label:'Tổng số Quiz',value:quizzes.length,icon:ClipboardList,color:'text-blue-600',bg:'bg-blue-50'},{label:'Số chương học',value:modules.length,icon:Layers,color:'text-emerald-600',bg:'bg-emerald-50'},{label:'Thời lượng dự kiến',value:`${Math.floor(totalDuration/60)} giờ ${totalDuration%60} phút`,icon:Clock,color:'text-amber-600',bg:'bg-amber-50'}] as const).map(stat=><div key={stat.label} className="flex min-h-[105px] items-center gap-3 rounded-2xl border border-[#e8effb] bg-white p-4 shadow-sm"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={24}/></div><div className="min-w-0"><p className="text-xs font-medium text-[#52709f]">{stat.label}</p><p className="mt-1 text-lg font-extrabold text-[#0a245c]">{stat.value}</p></div></div>)}
            </div>
            <div className="rounded-2xl border border-[#e8effb] bg-white p-3 shadow-sm"><div className="flex flex-wrap items-center gap-2"><label className="relative min-w-[180px] flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"/><input value={lessonSearch} onChange={e=>setLessonSearch(e.target.value)} placeholder="Tìm kiếm bài học..." className="w-full rounded-xl border border-[#dbe6f8] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"/></label><button onClick={()=>setCollapsedModules({})} className="rounded-xl border border-blue-100 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Mở tất cả</button><button onClick={()=>setCollapsedModules(Object.fromEntries(modules.map(m=>[m.moduleId,true])))} className="rounded-xl border border-blue-100 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Thu gọn</button></div></div>
            {isModulesLoading||isLessonsLoading?<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 animate-pulse rounded-2xl bg-blue-100/60"/>)}</div>:modules.length===0&&lessons.filter(l=>l.lessonType!=='ASSIGNMENT').length===0?<div className="rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center"><Layers className="mx-auto mb-3 text-blue-600" size={36}/><h3 className="font-bold text-[#0a245c]">Khóa học chưa có chương và bài học</h3><p className="mt-2 text-sm text-slate-500">Tạo chương đầu tiên hoặc nhập dữ liệu từ CSV.</p><button onClick={handleOpenCreateModule} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">+ Thêm chương</button></div>:<>
              {[...modules].sort((a,b)=>a.orderIndex-b.orderIndex).map(mod=>{const moduleLessons=(lessonsByModule[mod.moduleId]||[]).sort((a,b)=>a.orderIndex-b.orderIndex);const visible=moduleLessons.filter(l=>`${l.title} ${l.description||''}`.toLowerCase().includes(lessonSearch.toLowerCase()));if(lessonSearch&&!visible.length&&!mod.title.toLowerCase().includes(lessonSearch.toLowerCase()))return null;const collapsed=collapsedModules[mod.moduleId]&&!lessonSearch;return <section key={mod.moduleId} className="overflow-hidden rounded-2xl border border-[#e5edfa] bg-white shadow-sm"><div className="flex items-center gap-3 bg-[#f0f6ff] px-4 py-3"><button onClick={()=>toggleModuleCollapse(mod.moduleId)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Layers size={19}/></button><button onClick={()=>toggleModuleCollapse(mod.moduleId)} className="min-w-0 flex-1 text-left"><h3 className="truncate text-sm font-extrabold text-[#0a245c]">Chương {mod.orderIndex}: {mod.title}</h3><p className="mt-1 text-xs text-[#5071a7]">{moduleLessons.length} bài học · {moduleLessons.reduce((n,l)=>n+getLessonDurationMinutes(l),0)} phút</p></button><button title="Thêm bài học" onClick={()=>handleOpenCreateLesson(mod.moduleId)} className="rounded-lg p-2 text-blue-600 hover:bg-white"><Plus size={17}/></button><button title="Sửa chương" onClick={()=>handleOpenEditModule(mod)} className="rounded-lg p-2 text-blue-600 hover:bg-white"><Edit2 size={16}/></button><button title="Xóa chương" onClick={()=>setModuleToDelete(mod)} className="rounded-lg p-2 text-rose-500 hover:bg-white"><Trash2 size={16}/></button><button onClick={()=>toggleModuleCollapse(mod.moduleId)} className="rounded-lg p-2 text-blue-600 hover:bg-white">{collapsed?<ChevronDown size={18}/>:<ChevronDown size={18} className="rotate-180"/>}</button></div>
                {!collapsed&&<div className="divide-y divide-[#eaf0fa] px-3">{visible.length?visible.map((lesson,i)=><div key={lesson.lessonId} draggable onDragStart={e=>handleLessonDragStart(e,lesson)} onDragOver={e=>handleLessonDragOver(e,lesson)} onDrop={e=>handleLessonDrop(e,lesson)} onDragEnd={handleLessonDragEnd} className={`group flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-[#f6f9ff] ${dragOverLessonId===lesson.lessonId?'bg-blue-100':''}`}><GripVertical size={15} className="shrink-0 cursor-grab text-slate-300"/><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf3ff] text-xs font-bold text-blue-700">{lesson.orderIndex||i+1}</span><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-blue-600">{lesson.lessonType==='DOCUMENT'?<FileText size={20}/>:lesson.lessonType==='QUIZ'?<ClipboardList size={20}/>:<PlayCircle size={20}/>}</div><button onClick={()=>navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold text-[#0a245c] group-hover:text-blue-600">{lesson.title}</p><p className="mt-1 truncate text-xs text-[#6883ae]">{lesson.lessonType==='DOCUMENT'?'Tài liệu':lesson.lessonType==='QUIZ'?'Quiz':'Bài giảng'} · {getLessonDuration(lesson)} {lesson.isPreview?'· Cho phép xem thử':''}</p></button><span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex">{lesson.isPreview?'Xem thử':'Đã tạo'}</span><button title="Xem bài học" onClick={()=>navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Eye size={16}/></button><button title="Chỉnh sửa" onClick={()=>handleOpenEditLesson(lesson)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit2 size={16}/></button><div className="group/menu relative"><button title="Thêm thao tác" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><MoreVertical size={16}/></button><div className="invisible absolute right-0 top-8 z-20 w-48 rounded-xl border border-blue-100 bg-white p-1 opacity-0 shadow-xl transition group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100"><button onClick={()=>setMaterialTarget({lessonId:lesson.lessonId,lessonTitle:lesson.title})} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50">Tài liệu bài học</button><button onClick={()=>navigate(`/instructor/quizzes/new?courseId=${courseId}&lessonId=${lesson.lessonId}`)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50">Tạo Quiz cho bài học</button>{lesson.videoUrl&&<a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-xs hover:bg-blue-50">Mở video gốc</a>}<button onClick={()=>setLessonToDelete(lesson)} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">Xóa bài học</button></div></div></div>):<div className="py-8 text-center text-xs text-slate-400">{lessonSearch?'Không có bài học phù hợp':'Chưa có bài học trong chương này'}</div>}<button onClick={()=>handleOpenCreateLesson(mod.moduleId)} className="w-full py-3 text-left text-xs font-bold text-blue-600 hover:text-blue-800">+ Thêm bài học</button></div>}</section>})}
              {unassignedLessons.filter(l=>`${l.title} ${l.description||''}`.toLowerCase().includes(lessonSearch.toLowerCase())).length>0&&<section className="rounded-2xl border border-amber-200 bg-white p-4"><h3 className="mb-3 font-bold text-amber-800">Bài học chưa phân chương</h3>{unassignedLessons.filter(l=>`${l.title} ${l.description||''}`.toLowerCase().includes(lessonSearch.toLowerCase())).map(lesson=><div key={lesson.lessonId} draggable onDragStart={e=>handleLessonDragStart(e,lesson)} onDragEnd={handleLessonDragEnd} className="flex items-center gap-3 border-t border-amber-100 py-3"><GripVertical size={15} className="text-amber-400"/><BookOpen size={18} className="text-blue-600"/><span className="min-w-0 flex-1 truncate text-sm font-semibold">{lesson.title}</span><button onClick={()=>setMaterialTarget({lessonId:lesson.lessonId,lessonTitle:lesson.title})} title="Tài liệu"><Paperclip size={16}/></button><button onClick={()=>navigate(`/instructor/quizzes/new?courseId=${courseId}&lessonId=${lesson.lessonId}`)} title="Tạo Quiz"><ClipboardList size={16}/></button><button onClick={()=>handleOpenEditLesson(lesson)} title="Sửa / Gán chương"><Edit2 size={16}/></button><button onClick={()=>setLessonToDelete(lesson)} title="Xóa"><Trash2 size={16} className="text-rose-500"/></button></div>)}</section>}
            </>}
          </main>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#e8effb] bg-white p-4 shadow-sm"><div className="relative"><button onClick={()=>setAddMenuOpen(!addMenuOpen)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0754ef] px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"><Plus size={18}/> Thêm nội dung <ChevronDown size={16}/></button>{addMenuOpen&&<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-blue-100 bg-white p-2 shadow-xl">{[{label:'Thêm chương',action:handleOpenCreateModule},{label:'Thêm bài giảng',action:()=>handleOpenCreateLesson(modules[0]?.moduleId)},{label:'Thêm Quiz',action:()=>navigate(`/instructor/quizzes/new?courseId=${courseId}`)},{label:'Thêm tài liệu',action:()=>setMaterialTarget({lessonId:null})},{label:'Thêm bài tập nói',action:()=>handleOpenCreateSpeakingAssignment(null)},{label:'Nhập từ CSV',action:()=>setIsModuleImportModalOpen(true)}].map(item=><button key={item.label} onClick={()=>{setAddMenuOpen(false);item.action()}} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#15376f] hover:bg-blue-50">{item.label}</button>)}</div>}</div><h3 className="mb-3 mt-5 text-sm font-extrabold text-[#0a245c]">Thao tác nhanh</h3><div className="grid grid-cols-2 gap-2">{[{label:'Thêm chương',icon:FolderPlus,action:handleOpenCreateModule},{label:'Thêm bài học',icon:PlusCircle,action:()=>handleOpenCreateLesson(modules[0]?.moduleId)},{label:'Nhập CSV',icon:FileSpreadsheet,action:()=>setIsModuleImportModalOpen(true)},{label:'Đồng bộ Quiz',icon:GitCompareArrows,action:()=>document.getElementById('quiz-management')?.scrollIntoView({behavior:'smooth'})},{label:'Chấm bài nói',icon:Mic2,action:()=>navigate(`/instructor/courses/${courseId}/speaking`)},{label:'Học viên',icon:Users,action:()=>setIsStudentsModalOpen(true)}].map(item=><button key={item.label} onClick={item.action} className="flex items-center justify-center gap-2 rounded-xl border border-[#dce8fb] bg-[#f9fbff] px-2 py-3 text-[11px] font-semibold text-[#17448e] hover:bg-blue-50"><item.icon size={15}/>{item.label}</button>)}</div></div>
            <div className="rounded-2xl border border-[#e8effb] bg-white p-4 shadow-sm"><h3 className="mb-4 text-sm font-extrabold text-[#0a245c]">Thông tin khóa học</h3><div className="flex gap-3">{course?.thumbnailUrl?<img src={course.thumbnailUrl} alt={course.title} className="h-20 w-20 rounded-xl object-cover"/>:<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-100"><Mic2 size={30} className="text-blue-600"/></div>}<div className="min-w-0"><p className="line-clamp-3 text-sm font-bold text-[#0a245c]">{course?.title}</p>{course?.status&&<div className="mt-2"><CourseStatusBadge status={course.status} size="sm"/></div>}</div></div><div className="mt-4 space-y-3 border-t border-blue-50 pt-4 text-xs text-[#52709f]"><p className="flex justify-between"><span>Chương học</span><strong className="text-[#0a245c]">{modules.length}</strong></p><p className="flex justify-between"><span>Bài học</span><strong className="text-[#0a245c]">{lessons.length}</strong></p><p className="flex justify-between"><span>Quiz</span><strong className="text-[#0a245c]">{quizzes.length}</strong></p><p className="flex justify-between"><span>Thời lượng dự kiến</span><strong className="text-[#0a245c]">{totalDuration} phút</strong></p></div><button onClick={()=>navigate('/instructor/courses')} className="mt-4 w-full rounded-xl border border-blue-200 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Quản lý khóa học</button></div>
            <div className="rounded-2xl border border-[#e8effb] bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-extrabold text-[#0a245c]">Cập nhật & phê duyệt</h3><button onClick={handleSyncAllDurations} disabled={isSyncingDurations} className="mb-2 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{isSyncingDurations?'Đang đồng bộ...':'Đồng bộ thời lượng bài học'}</button>{(course?.status==='DRAFT'||course?.status==='REJECTED')&&<button onClick={handleSendForApproval} disabled={isSubmittingForApproval} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0754ef] py-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Send size={15}/> Gửi duyệt khóa học</button>}<p className="mt-3 rounded-xl bg-[#edf5ff] p-3 text-xs leading-relaxed text-[#4167a1]">Sau khi hoàn thành nội dung, hãy kiểm tra bài học, Quiz và bài tập nói trước khi gửi duyệt.</p></div>
          </aside>
        </div>
      </div>

      {/* =====================================================================
          COURSE-LEVEL SPEAKING ASSIGNMENT MANAGEMENT
      ====================================================================== */}

      <div id="speaking-assignment-management" className="mx-auto max-w-[1500px] px-6 pt-10">
        <div className="overflow-hidden rounded-[30px] border border-[#d8e6ff] bg-white shadow-[0_12px_35px_-18px_rgba(7,84,239,0.18)] transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/10">
          {/* HEADER */}
          <div className="flex flex-col gap-4 border-b border-[#e0eaff] bg-gradient-to-r from-[#f1f6ff] via-[#f8fbff] to-[#f1f6ff] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#cfe0ff] bg-[#e8f1ff] text-[#0754ef] shadow-sm">
                <Mic2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Bài tập nói (Speaking Assignment) Tổng khóa học
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Bài thu âm giọng nói dành cho học viên thực hành & nộp điểm cuối khóa (Admin yêu cầu bắt buộc)
                </p>
              </div>
            </div>

            {!lessons.some((l) => l.lessonType === 'ASSIGNMENT') && (
              <button
                type="button"
                onClick={() => handleOpenCreateSpeakingAssignment(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0754ef] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-[#0644c4] active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Tạo Bài tập nói tổng khóa
              </button>
            )}
          </div>

          {/* CONTENT */}
          {(() => {
            const assignment = lessons.find((l) => l.lessonType === 'ASSIGNMENT');
            if (assignment) {
              return (
                <div className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-[#e0eaff] bg-[#f8fbff] p-5">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f1ff] px-2.5 py-0.5 text-xs font-extrabold text-[#17448e]">
                          🎙️ Bài tập nói tổng khóa
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          • {assignment.durationMinutes} phút dự kiến
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          {assignment.description}
                        </p>
                      )}
                      {assignment.videoUrl && (
                        <div className="pt-1">
                          <a
                            href={assignment.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0754ef] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Link Audio mẫu / Hướng dẫn đề bài</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleOpenEditLesson(assignment)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#cfe0ff] bg-white px-3.5 py-2 text-xs font-bold text-[#17448e] shadow-xs hover:bg-[#f1f6ff] active:scale-95 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        onClick={() => setLessonToDelete(assignment)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 shadow-xs hover:bg-red-50 active:scale-95 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center px-6 py-7 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1f6ff] text-[#b58a40]">
                  <Mic2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Chưa tạo Bài tập nói tổng khóa</h4>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-500">
                  Mỗi khóa học cần có 1 Bài tập nói tổng cuối khóa để học viên nộp bản thu âm cho Giảng viên chấm điểm. Khóa học chỉ có thể gửi Admin duyệt khi đã tạo bài tập này.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateSpeakingAssignment(null)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0754ef] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#0644c4] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Tạo Bài tập nói ngay
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* =====================================================================
          QUIZ MANAGEMENT  (đã được chuyển xuống cuối trang)
      ====================================================================== */}

      <div id="quiz-management" className="mx-auto max-w-[1500px] px-6 pt-10 scroll-mt-28">
        <div className="overflow-hidden rounded-[30px] border border-[#d8e6ff] bg-white shadow-[0_12px_35px_-18px_rgba(7,84,239,0.18)] transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/10">
          {/* QUIZ HEADER */}

          <div className="relative flex flex-col gap-4 overflow-hidden border-b border-[#e0eaff] bg-gradient-to-r from-[#f1f6ff] via-[#f8fbff] to-[#f1f6ff] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#cfe0ff] bg-[#e8f1ff] text-[#0754ef]">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Quản lý Quiz
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {quizzes.length} bài kiểm tra trong khóa học
                </p>
              </div>
            </div>

            {/* CREATE OVERALL COURSE QUIZ */}

            <button
              type="button"
              onClick={() =>
                navigate(`/instructor/quizzes/new?courseId=${courseId}`)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0754ef] px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0644c4] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tạo Quiz tổng khóa học
            </button>
          </div>

          {/* IMPORT / SEARCH: luôn hiển thị, kể cả khi chưa có Quiz */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-6 py-3.5">
            <motion.button type="button" whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => setQuizImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#e0eaff] bg-[#f3f8ff] px-5 py-3 text-sm font-bold text-[#102947] shadow-sm hover:bg-[#e8f1ff]">
              <FileUp size={18} className="text-[#0754ef]"/> Import Excel / Google Sheets
            </motion.button>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6ff] px-3 py-2.5 text-xs font-semibold text-[#17448e]"><ShieldCheck size={16}/> Đồng bộ tự động sau khi thiết lập baseline</div>
            <label className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={quizSearch} onChange={e => setQuizSearch(e.target.value)} placeholder="Tìm bài kiểm tra..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#3b82f6]"/></label>
          </div>
          {quizNotice && <p role="status" className="mx-6 mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{quizNotice}</p>}

          {/* QUIZ CONTENT */}

          {isQuizzesLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f6ff] text-[#0754ef]">
                <ClipboardList className="h-7 w-7" />
              </div>

              <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                Chưa có Quiz nào
              </h3>

              <p className="mt-1 max-w-md text-xs text-slate-500">
                Tạo bài kiểm tra để đánh giá kiến thức của học viên trong khóa
                học này.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(`/instructor/quizzes/new?courseId=${courseId}`)
                }
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0754ef] px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0644c4] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Tạo Quiz tổng khóa học
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Quiz</th>
                    <th className="px-6 py-3">Phạm vi</th>
                    <th className="px-4 py-3">Câu hỏi</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Điểm đạt</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {quizzes.filter(quiz => `${quiz.title} ${quiz.description || ''}`.toLowerCase().includes(quizSearch.trim().toLowerCase())).map((quiz) => {
                    const lesson = getQuizLesson(quiz);

                    return (
                      <tr
                        key={quiz.quizId}
                        className="group transition-colors hover:bg-[#f1f6ff]"
                      >
                        {/* QUIZ */}

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {quiz.title}
                            </p>

                            {quiz.description && (
                              <p className="mt-0.5 max-w-md truncate text-xs text-slate-500">
                                {quiz.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* QUIZ SCOPE */}

                        <td className="px-6 py-4">
                          {quiz.lessonId == null ? (
                            /* OVERALL COURSE QUIZ */

                            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1f6ff] px-3 py-2 text-[11px] font-semibold text-[#17448e]">
                              <ClipboardList className="h-3.5 w-3.5" />
                              <span>Quiz tổng khóa học</span>
                            </div>
                          ) : lesson ? (
                            /* LESSON QUIZ */

                            <div className="max-w-xs">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#0754ef]" />

                                <span className="font-semibold text-[#17448e]">
                                  Bài học
                                </span>
                              </div>

                              <p
                                className="mt-1 line-clamp-2 text-xs font-medium text-slate-700"
                                title={lesson.title}
                              >
                                {lesson.title}
                              </p>

                              <p className="mt-0.5 text-[10px] text-slate-400">
                                Lesson ID: {lesson.lessonId}
                              </p>
                            </div>
                          ) : (
                            /* LESSON NOT FOUND */

                            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Lesson #{quiz.lessonId}</span>
                            </div>
                          )}
                        </td>

                        {/* QUESTIONS */}

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {quiz.questionCount ?? 0} câu
                        </td>

                        {/* TIME */}

                        <td className="px-4 py-4 text-slate-600">
                          {quiz.timeLimitMinutes > 0
                            ? `${quiz.timeLimitMinutes} phút`
                            : 'Không giới hạn'}
                        </td>

                        {/* PASSING SCORE */}

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {quiz.passingScore}%
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              quiz.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : quiz.status === 'ARCHIVED'
                                ? 'bg-slate-100 text-slate-500'
                                : quiz.status === 'INACTIVE'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {quiz.status === 'ACTIVE'
                              ? 'Đã xuất bản'
                              : quiz.status === 'ARCHIVED'
                              ? 'Đã lưu trữ'
                              : quiz.status === 'INACTIVE'
                              ? 'Ngừng hoạt động'
                              : 'Bản nháp'}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" title="Xem đồng bộ và giải quyết xung đột" onClick={() => setQuizSyncTarget({ id: quiz.quizId, title: quiz.title })} className="rounded-xl p-2 text-[#0754ef] transition hover:-translate-y-0.5 hover:bg-amber-50"><GitCompareArrows size={18}/></button>
                            <button type="button" title="Export Google Sheets" disabled={quizExporting === quiz.quizId} onClick={async () => { setQuizExporting(quiz.quizId); setQuizNotice(''); try { const r = await quizImportApi.exportGoogle(quiz.quizId); setQuizNotice(r.success ? `Đã gửi yêu cầu export Quiz #${quiz.quizId}. Kiểm tra trạng thái đồng bộ để xác nhận.` : r.message || 'Export chưa thành công.'); } catch(e) { setQuizNotice(e instanceof Error ? e.message : 'Export thất bại.'); } finally { setQuizExporting(null); } }} className="rounded-xl p-2 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:opacity-50"><CloudUpload size={18}/></button>
                            {/* DETAIL */}

                            <button
                              type="button"
                              title="Xem Quiz"
                              onClick={() =>
                                navigate(`/instructor/quizzes/${quiz.quizId}`)
                              }
                              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-[#f1f6ff] hover:text-[#0754ef]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              title="Chỉnh sửa Quiz"
                              onClick={() =>
                                navigate(
                                  `/instructor/quizzes/${quiz.quizId}/edit`
                                )
                              }
                              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* TAKE */}

                            <button
                              type="button"
                              title="Làm Quiz"
                              onClick={() =>
                                navigate(`/quizzes/${quiz.quizId}/take`)
                              }
                              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {quizImportOpen && (
          <QuizImportStudio
            courseId={courseId}
            lessons={lessons.filter(lesson => lesson.lessonType !== 'ASSIGNMENT').map(lesson => ({ lessonId: lesson.lessonId, title: lesson.title }))}
            onClose={() => setQuizImportOpen(false)}
            onImported={() => {
              void queryClient.invalidateQueries({ queryKey: ['quizzes', 'course', courseId] });
              setQuizNotice('Đã import Quiz thành công. Danh sách đang được cập nhật.');
            }}
          />
        )}
        {quizSyncTarget && (
          <QuizSyncStudio
            quizId={quizSyncTarget.id}
            title={quizSyncTarget.title}
            onClose={() => setQuizSyncTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODALS
      ====================================================================== */}

      <LessonFormModal
        isOpen={isLessonModalOpen}
        existingLesson={editingLesson}
        modules={modules}
        defaultModuleId={targetModuleId}
        defaultLessonType={targetLessonType}
        isSubmitting={isCreatingLesson || isUpdatingLesson}
        onClose={() => {
          setIsLessonModalOpen(false);
          setEditingLesson(null);
          setTargetLessonType('VIDEO');
        }}
        onSubmit={handleLessonFormSubmit}
        onVideoUploaded={(updatedLesson) => {
          // Update local editingLesson state with new videoUrl so re-render retains R2 URL
          setEditingLesson(updatedLesson);
          // Refresh lesson list so main table updates immediately
          refetchLessons?.();
        }}
      />

      <ModuleFormModal
        isOpen={isModuleModalOpen}
        existingModule={editingModule}
        defaultOrderIndex={modules.length + 1}
        isSubmitting={isCreatingModule || isUpdatingModule}
        onClose={() => setIsModuleModalOpen(false)}
        onSubmit={handleModuleFormSubmit}
      />

      <ImportModuleModal
        courseId={courseId}
        isOpen={isModuleImportModalOpen}
        onClose={() => setIsModuleImportModalOpen(false)}
      />

      <ImportLessonModal
        courseId={courseId}
        isOpen={isLessonImportModalOpen}
        onClose={() => setIsLessonImportModalOpen(false)}
      />

      {/* COURSE / LESSON MATERIAL MODAL */}

      {materialTarget && (
        <CourseMaterialModal
          isOpen={!!materialTarget}
          onClose={() => setMaterialTarget(null)}
          courseId={courseId}
          courseTitle={course?.title}
          lessonId={materialTarget.lessonId}
          lessonTitle={materialTarget.lessonTitle}
        />
      )}

      {/* DELETE LESSON */}

      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Xác nhận xóa bài học
            </h3>

            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa bài học{' '}
              <span className="font-semibold text-slate-900">
                "{lessonToDelete.title}"
              </span>{' '}
              không?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setLessonToDelete(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                onClick={handleDeleteLessonConfirm}
                disabled={isDeletingLesson}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingLesson ? 'Đang xóa...' : 'Xóa bài học'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODULE */}

      {moduleToDelete && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <h3 className="flex items-center gap-2 text-lg font-bold text-red-600">
              Xác nhận xóa chương học
            </h3>

            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa chương{' '}
              <span className="font-bold text-slate-900">
                "{moduleToDelete.title}"
              </span>{' '}
              không?
            </p>

            <div className="mt-3 space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <p className="font-bold text-red-700">⚠️ CẢNH BÁO NGUY HIỂM:</p>

              <p>
                Hành động này sẽ{' '}
                <span className="font-bold text-red-700 underline">
                  XÓA VĨNH VIỄN
                </span>{' '}
                toàn bộ{' '}
                <span className="font-bold underline">
                  {(lessonsByModule[moduleToDelete.moduleId] || []).length} bài
                  học
                </span>{' '}
                thuộc chương này khỏi cơ sở dữ liệu!
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModuleToDelete(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>

              <button
                onClick={handleDeleteModuleConfirm}
                disabled={isDeletingModule}
                className="cursor-pointer rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-red-500/20 hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingModule ? 'Đang xóa...' : 'Đồng ý xóa toàn bộ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLLED STUDENTS */}

      <CourseStudentsModal
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        courseTitle={course?.title}
        courseId={courseId}
      />

      {/* INCOMPLETE COURSE */}

      <IncompleteCourseModal
        isOpen={isIncompleteModalOpen}
        onClose={() => setIsIncompleteModalOpen(false)}
        courseTitle={course?.title || ''}
        courseId={courseId}
        missingItems={missingRequirements}
        onGoToLessons={() => setIsIncompleteModalOpen(false)}
      />

      {/* APPROVAL SUCCESS */}

      {approvalSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-in items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-2xl fade-in slide-in-from-bottom-5">
          <Sparkles className="h-5 w-5 text-emerald-200" />

          <p className="text-xs font-bold">{approvalSuccessMessage}</p>
        </div>
      )}

      {/* STATUS NOTIFICATION MODAL */}
      <LessonStatusModal
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        reason={statusModal.reason}
        onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};