// =============================================================================
// CourseLessonsPage.tsx
// Curriculum Builder / Module & Lesson Management Page
// =============================================================================

import React, { useState } from 'react';
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
} from '../../hooks/useLessonQueries';

import {
  useCourseModules,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
} from '../../hooks/useModuleQueries';

import { LessonFormModal } from './LessonFormModal';
import { ImportLessonModal } from './ImportLessonModal';
import { ModuleFormModal } from './ModuleFormModal';
import { ImportModuleModal } from './ImportModuleModal';
import { CourseMaterialModal } from './CourseMaterialModal';
import { CourseStatusBadge } from './CourseStatusBadge';

import type { Lesson, CreateLessonDto } from '../../types/lessonTypes';
import type { CourseModule, CreateModuleDto } from '../../types/moduleTypes';

export const CourseLessonsPage: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id?: string }>();
  const courseId = id ? Number(id) : 0;

  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);

  const { data: lessons = [], isLoading: isLessonsLoading } =
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

  // ===========================================================================
  // MUTATIONS
  // ===========================================================================

  const { mutate: createLesson, isPending: isCreatingLesson } =
    useCreateLesson(courseId);

  const { mutate: updateLesson, isPending: isUpdatingLesson } =
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
  // COURSE INFORMATION
  // ===========================================================================

  const totalDuration = lessons.reduce(
    (sum, lesson) => sum + lesson.durationMinutes,
    0
  );

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
        updateLesson({
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

    setIsLessonModalOpen(true);
  };

  const handleLessonFormSubmit = (dto: CreateLessonDto) => {
    if (editingLesson) {
      updateLesson(
        {
          lessonId: editingLesson.lessonId,
          dto,
        },
        {
          onSuccess: () => {
            setIsLessonModalOpen(false);
            setEditingLesson(null);
          },
        }
      );
    } else {
      createLesson(dto, {
        onSuccess: () => {
          setIsLessonModalOpen(false);
        },
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* =====================================================================
          HERO HEADER
      ====================================================================== */}

      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/instructor/courses')}
              title="Quay lại danh sách khóa học"
              className="cursor-pointer rounded-2xl bg-white/10 p-2.5 text-indigo-200 transition-all hover:bg-white/20 hover:text-white active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Quản lý Chương & Bài học
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            {/* COURSE INFO */}

            <div className="flex items-center gap-4">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-inner">
                {course?.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-6 w-6 text-indigo-200" />
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {course?.title}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-indigo-100/80">
                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-indigo-200">
                    <Layers className="h-3.5 w-3.5" />
                    {modules.length} Chương
                  </span>

                  <span>•</span>

                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-indigo-200">
                    <BookOpen className="h-3.5 w-3.5" />
                    {lessons.length} Bài học
                  </span>

                  <span>•</span>

                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-indigo-200">
                    <Clock className="h-3.5 w-3.5" />
                    {totalDuration} phút
                  </span>

                  {course?.status && (
                    <>
                      <span>•</span>

                      <CourseStatusBadge status={course.status} size="sm" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}

            <div className="flex max-w-2xl flex-col items-start gap-2 xl:items-end">
              {/* PRIMARY ACTIONS */}

              <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                {(course?.status === 'DRAFT' ||
                  course?.status === 'REJECTED') && (
                  <button
                    onClick={handleSendForApproval}
                    disabled={isSubmittingForApproval}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>Gửi Admin duyệt</span>
                  </button>
                )}

                <button
                  onClick={handleOpenCreateModule}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Thêm Chương mới</span>
                </button>

                {modules.length > 0 && (
                  <>
                    <button
                      onClick={() => handleOpenCreateLesson(modules[0]?.moduleId)}
                      className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Thêm Bài học</span>
                    </button>

                <button
                  onClick={() => handleOpenCreateSpeakingAssignment(null)}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95"
                >
                  <Mic2 className="h-4 w-4" />
                  <span>+ Tạo Bài tập nói tổng khóa</span>
                </button>
                  </>
                )}

                <button
                  onClick={() => navigate(`/courses/${courseId}/learn`)}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-95"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>Vào xem video bài học</span>
                </button>
              </div>

              {/* SECONDARY ACTIONS */}

              <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                <button
                  onClick={() => setIsStudentsModalOpen(true)}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  <Users className="h-4 w-4 text-cyan-300" />
                  <span>Danh sách học viên</span>
                </button>

                <button
                  onClick={() => navigate(`/instructor/courses/${courseId}/speaking`)}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  <Mic2 className="h-4 w-4 text-cyan-300" />
                  <span>Chấm bài nói (Speaking)</span>
                </button>

                <button
                  onClick={() => setMaterialTarget({ lessonId: null })}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  <Paperclip className="h-4 w-4 text-amber-300" />
                  <span>Tài liệu khóa học</span>
                </button>

                <button
                  onClick={() => setIsModuleImportModalOpen(true)}
                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                  <span>Nhập từ CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CONTENT CONTAINER (MODULES & LESSONS)
      ====================================================================== */}

      <div className="mx-auto max-w-7xl space-y-6 px-6 pt-8">
        {/* MODULE LOADING */}

        {isModulesLoading || isLessonsLoading ? (
          <div className="animate-pulse space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-slate-200/70" />
            ))}
          </div>
        ) : modules.length === 0 && unassignedLessons.length === 0 ? (
          /* EMPTY */

          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-20 text-center shadow-xs">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Layers className="h-8 w-8" />
            </div>

            <h4 className="text-lg font-bold text-slate-800">
              Khóa học chưa có chương & bài học nào
            </h4>

            <p className="mt-1 max-w-md text-xs text-slate-500">
              Bạn có thể tạo Chương học (Module) trước để tổ chức các bài giảng
              khoa học, hoặc nhập nhanh từ file CSV.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleOpenCreateModule}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
              >
                <FolderPlus className="h-4 w-4" />
                Thêm Chương học đầu tiên
              </button>

              <button
                onClick={() => setIsModuleImportModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                Nhập file CSV mẫu
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* =================================================================
                MODULE LIST
            ================================================================== */}

            {[...modules]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((mod) => {
                const moduleLessons = lessonsByModule[mod.moduleId] || [];

                const isCollapsed = collapsedModules[mod.moduleId];

                const modDuration = moduleLessons.reduce(
                  (sum, lesson) => sum + lesson.durationMinutes,
                  0
                );

                return (
                  <div
                    key={mod.moduleId}
                    className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all"
                  >
                    {/* MODULE HEADER */}

                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModuleCollapse(mod.moduleId)}
                          className="cursor-pointer rounded-xl p-1.5 text-slate-500 transition-all hover:bg-slate-200/60"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700 shadow-xs">
                          #{mod.orderIndex}
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                            {mod.title}
                          </h3>

                          <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                            <span>{moduleLessons.length} bài học</span>

                            <span>•</span>

                            <span>{modDuration} phút</span>

                            {mod.description && (
                              <>
                                <span>•</span>

                                <span className="line-clamp-1 italic text-slate-400">
                                  {mod.description}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* MODULE ACTIONS */}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenCreateLesson(mod.moduleId)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-xs transition-all hover:bg-indigo-50 active:scale-95"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Thêm bài học
                        </button>

                        <button
                          onClick={() => handleOpenEditModule(mod)}
                          title="Chỉnh sửa chương"
                          className="cursor-pointer rounded-xl p-2 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setModuleToDelete(mod)}
                          title="Xóa chương"
                          className="cursor-pointer rounded-xl p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* LESSONS */}

                    {!isCollapsed && (
                      <div>
                        {moduleLessons.length === 0 ? (
                          <div className="px-6 py-8 text-center text-xs text-slate-400">
                            Chưa có bài học nào trong chương này.
                            <div className="mt-2 flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleOpenCreateLesson(mod.moduleId)}
                                className="cursor-pointer font-semibold text-indigo-600 underline hover:text-indigo-800"
                              >
                                + Thêm bài học mới
                              </button>
                              <span>|</span>
                              <button
                                onClick={() => handleOpenCreateSpeakingAssignment(mod.moduleId)}
                                className="cursor-pointer font-semibold text-purple-600 underline hover:text-purple-800"
                              >
                                + Thêm Bài tập nói (Speaking)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 font-bold uppercase tracking-wider text-slate-400">
                                  <th className="w-14 px-6 py-3">STT</th>
                                  <th className="px-6 py-3">Tên bài học</th>
                                  <th className="px-4 py-3">Thời lượng</th>
                                  <th className="px-4 py-3">Xem thử</th>
                                  <th className="px-4 py-3">Video / Link</th>
                                  <th className="px-6 py-3 text-right">
                                    Thao tác
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {moduleLessons.map((lesson) => {
                                  const isDragging =
                                    draggedLesson?.lessonId === lesson.lessonId;

                                  const isDragOver =
                                    dragOverLessonId === lesson.lessonId &&
                                    !isDragging;

                                  return (
                                    <tr
                                      key={lesson.lessonId}
                                      draggable
                                      onDragStart={(e) =>
                                        handleLessonDragStart(e, lesson)
                                      }
                                      onDragOver={(e) =>
                                        handleLessonDragOver(e, lesson)
                                      }
                                      onDragEnd={handleLessonDragEnd}
                                      onDrop={(e) => handleLessonDrop(e, lesson)}
                                      className={`group transition-all duration-150 ${
                                        isDragging
                                          ? 'border-2 border-dashed border-indigo-400 bg-indigo-50/60 opacity-40'
                                          : isDragOver
                                          ? 'border-t-2 border-indigo-600 bg-indigo-100/50 shadow-xs'
                                          : 'hover:bg-indigo-50/20'
                                      }`}
                                    >
                                      {/* ORDER */}

                                      <td className="px-5 py-3.5 font-bold text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                          <div
                                            className="cursor-grab p-1 text-slate-300 transition-colors hover:text-indigo-600 group-hover:text-slate-500 active:cursor-grabbing"
                                            title="Nhấp giữ & kéo thả để thay đổi thứ tự bài học"
                                          >
                                            <GripVertical className="h-4 w-4" />
                                          </div>

                                          <span>#{lesson.orderIndex}</span>
                                        </div>
                                      </td>

                                      {/* LESSON TITLE */}

                                      <td className="px-6 py-3.5">
                                        <button
                                          onClick={() =>
                                            navigate(
                                              `/courses/${courseId}/learn?lessonId=${lesson.lessonId}`
                                            )
                                          }
                                          className="group/title flex cursor-pointer items-start gap-2.5 text-left"
                                        >
                                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg shadow-xs transition-all ${
                                            lesson.lessonType === 'ASSIGNMENT'
                                              ? 'bg-purple-100 text-purple-700 group-hover/title:bg-purple-600 group-hover/title:text-white'
                                              : 'bg-indigo-50 text-indigo-600 group-hover/title:bg-indigo-600 group-hover/title:text-white'
                                          }`}>
                                            {lesson.lessonType === 'ASSIGNMENT' ? (
                                              <Mic2 className="h-3.5 w-3.5" />
                                            ) : (
                                              <PlayCircle className="h-3.5 w-3.5" />
                                            )}
                                          </div>

                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover/title:text-indigo-600">
                                                {lesson.title}
                                              </p>
                                              {lesson.lessonType === 'ASSIGNMENT' && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                                  🎙️ Bài tập nói
                                                </span>
                                              )}
                                            </div>

                                            {lesson.description && (
                                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                                {lesson.description}
                                              </p>
                                            )}
                                          </div>
                                        </button>
                                      </td>

                                      {/* DURATION */}

                                      <td className="px-4 py-3.5 font-medium text-slate-700">
                                        {lesson.durationMinutes} phút
                                      </td>

                                      {/* PREVIEW */}

                                      <td className="px-4 py-3.5">
                                        {lesson.isPreview ? (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                            <Eye className="h-3 w-3" />
                                            Xem thử
                                          </span>
                                        ) : (
                                          <span className="font-medium text-slate-400">
                                            —
                                          </span>
                                        )}
                                      </td>

                                      {/* VIDEO */}

                                      <td className="px-4 py-3.5">
                                        {lesson.videoUrl ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() =>
                                                navigate(
                                                  `/courses/${courseId}/learn?lessonId=${lesson.lessonId}`
                                                )
                                              }
                                              className="inline-flex items-center gap-1 rounded-xl border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-all hover:bg-blue-100"
                                            >
                                              <PlayCircle className="h-3 w-3 text-blue-600" />
                                              <span>Xem video</span>
                                            </button>

                                            <a
                                              href={lesson.videoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              title="Mở link YouTube bên ngoài"
                                              className="p-1 text-slate-400 transition-colors hover:text-blue-600"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">
                                            Chưa gắn video
                                          </span>
                                        )}
                                      </td>

                                      {/* ACTIONS */}

                                      <td className="px-6 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {/* MATERIAL */}

                                          <button
                                            onClick={() =>
                                              setMaterialTarget({
                                                lessonId: lesson.lessonId,
                                                lessonTitle: lesson.title,
                                              })
                                            }
                                            title="Tài liệu bài học"
                                            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600 active:scale-95"
                                          >
                                            <Paperclip className="h-4 w-4" />
                                          </button>

                                          {/* CREATE LESSON QUIZ */}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              navigate(
                                                `/instructor/quizzes/new?courseId=${courseId}&lessonId=${lesson.lessonId}`
                                              )
                                            }
                                            title="Tạo Quiz cho bài học"
                                            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-violet-50 hover:text-violet-600 active:scale-95"
                                          >
                                            <ClipboardList className="h-4 w-4" />
                                          </button>

                                          {/* EDIT LESSON */}

                                          <button
                                            onClick={() =>
                                              handleOpenEditLesson(lesson)
                                            }
                                            title="Chỉnh sửa bài học"
                                            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600 active:scale-95"
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </button>

                                          {/* DELETE LESSON */}

                                          <button
                                            onClick={() =>
                                              setLessonToDelete(lesson)
                                            }
                                            title="Xóa bài học"
                                            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
                                          >
                                            <Trash2 className="h-4 w-4" />
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
                    )}
                  </div>
                );
              })}

            {/* =================================================================
                UNASSIGNED LESSONS
            ================================================================== */}

            {unassignedLessons.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-700">
                      ?
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-amber-950">
                        Bài học chưa phân Chương
                      </h3>

                      <p className="text-xs text-amber-700/80">
                        {unassignedLessons.length} bài học chưa được đưa vào
                        chương nào
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 font-bold uppercase tracking-wider text-slate-400">
                        <th className="w-14 px-6 py-3">STT</th>
                        <th className="px-6 py-3">Tên bài học</th>
                        <th className="px-4 py-3">Thời lượng</th>
                        <th className="px-4 py-3">Xem thử</th>
                        <th className="px-4 py-3">Video / Link</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {unassignedLessons.map((lesson) => {
                        const isDragging =
                          draggedLesson?.lessonId === lesson.lessonId;

                        const isDragOver =
                          dragOverLessonId === lesson.lessonId && !isDragging;

                        return (
                          <tr
                            key={lesson.lessonId}
                            draggable
                            onDragStart={(e) => handleLessonDragStart(e, lesson)}
                            onDragOver={(e) => handleLessonDragOver(e, lesson)}
                            onDragEnd={handleLessonDragEnd}
                            onDrop={(e) => handleLessonDrop(e, lesson)}
                            className={`group transition-all duration-150 ${
                              isDragging
                                ? 'border-2 border-dashed border-amber-400 bg-amber-50/60 opacity-40'
                                : isDragOver
                                ? 'border-t-2 border-amber-600 bg-amber-100/50 shadow-xs'
                                : 'hover:bg-amber-50/20'
                            }`}
                          >
                            {/* ORDER */}

                            <td className="px-5 py-3.5 font-bold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="cursor-grab p-1 text-slate-300 transition-colors hover:text-amber-600 group-hover:text-slate-500 active:cursor-grabbing"
                                  title="Nhấp giữ & kéo thả để thay đổi thứ tự bài học"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>

                                <span>#{lesson.orderIndex}</span>
                              </div>
                            </td>

                            {/* TITLE */}

                            <td className="px-6 py-3.5">
                              <button
                                onClick={() =>
                                  navigate(
                                    `/courses/${courseId}/learn?lessonId=${lesson.lessonId}`
                                  )
                                }
                                className="group/title flex cursor-pointer items-start gap-2.5 text-left"
                              >
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shadow-xs transition-all group-hover/title:bg-amber-600 group-hover/title:text-white">
                                  <PlayCircle className="h-3.5 w-3.5" />
                                </div>

                                <div>
                                  <p className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover/title:text-amber-700">
                                    {lesson.title}
                                  </p>

                                  {lesson.description && (
                                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                            </td>

                            {/* DURATION */}

                            <td className="px-4 py-3.5 font-medium text-slate-700">
                              {lesson.durationMinutes} phút
                            </td>

                            {/* PREVIEW */}

                            <td className="px-4 py-3.5">
                              {lesson.isPreview ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  <Eye className="h-3 w-3" />
                                  Xem thử
                                </span>
                              ) : (
                                <span className="font-medium text-slate-400">
                                  —
                                </span>
                              )}
                            </td>

                            {/* VIDEO */}

                            <td className="px-4 py-3.5">
                              {lesson.videoUrl ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/courses/${courseId}/learn?lessonId=${lesson.lessonId}`
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-all hover:bg-blue-100"
                                  >
                                    <PlayCircle className="h-3 w-3 text-blue-600" />
                                    <span>Xem video</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">
                                  Chưa gắn video
                                </span>
                              )}
                            </td>

                            {/* ACTIONS */}

                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* MATERIAL */}

                                <button
                                  onClick={() =>
                                    setMaterialTarget({
                                      lessonId: lesson.lessonId,
                                      lessonTitle: lesson.title,
                                    })
                                  }
                                  title="Tài liệu bài học"
                                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600 active:scale-95"
                                >
                                  <Paperclip className="h-4 w-4" />
                                </button>

                                {/* LESSON QUIZ */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/instructor/quizzes/new?courseId=${courseId}&lessonId=${lesson.lessonId}`
                                    )
                                  }
                                  title="Tạo Quiz cho bài học"
                                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-violet-50 hover:text-violet-600 active:scale-95"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </button>

                                {/* EDIT */}

                                <button
                                  onClick={() => handleOpenEditLesson(lesson)}
                                  title="Gán vào chương / Chỉnh sửa"
                                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-amber-100 hover:text-amber-800 active:scale-95"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>

                                {/* DELETE */}

                                <button
                                  onClick={() => setLessonToDelete(lesson)}
                                  title="Xóa bài học"
                                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* =====================================================================
          COURSE-LEVEL SPEAKING ASSIGNMENT MANAGEMENT
      ====================================================================== */}

      <div id="speaking-assignment-management" className="mx-auto max-w-7xl px-6 pt-10">
        <div className="overflow-hidden rounded-3xl border border-purple-200/80 bg-white shadow-xs">
          {/* HEADER */}
          <div className="flex flex-col gap-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-inner">
                <Mic2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-500/20 transition-all hover:bg-purple-700 active:scale-95 cursor-pointer"
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
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-extrabold text-purple-700">
                          🎙️ Bài tập nói tổng khóa
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          • {assignment.durationMinutes} phút dự kiến
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{assignment.title}</h3>
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
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline"
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-purple-700 shadow-xs hover:bg-purple-50 active:scale-95 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        onClick={() => setLessonToDelete(assignment)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 shadow-xs hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
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
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-500 mb-3">
                  <Mic2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Chưa tạo Bài tập nói tổng khóa</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-md">
                  Mỗi khóa học cần có 1 Bài tập nói tổng cuối khóa để học viên nộp bản thu âm cho Giảng viên chấm điểm. Khóa học chỉ có thể gửi Admin duyệt khi đã tạo bài tập này.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateSpeakingAssignment(null)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all cursor-pointer"
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

      <div id="quiz-management" className="mx-auto max-w-7xl px-6 pt-10">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          {/* QUIZ HEADER */}

          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Quản lý Quiz
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tạo Quiz tổng khóa học
            </button>
          </div>

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
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <ClipboardList className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
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
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
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
                  {quizzes.map((quiz) => {
                    const lesson = getQuizLesson(quiz);

                    return (
                      <tr
                        key={quiz.quizId}
                        className="group transition-colors hover:bg-indigo-50/20"
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

                            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-700">
                              <ClipboardList className="h-3.5 w-3.5" />
                              <span>Quiz tổng khóa học</span>
                            </div>
                          ) : lesson ? (
                            /* LESSON QUIZ */

                            <div className="max-w-xs">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-500" />

                                <span className="font-semibold text-violet-700">
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
                            {/* DETAIL */}

                            <button
                              type="button"
                              title="Xem Quiz"
                              onClick={() =>
                                navigate(`/instructor/quizzes/${quiz.quizId}`)
                              }
                              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
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
        onClose={() => setIsLessonModalOpen(false)}
        onSubmit={handleLessonFormSubmit}
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
    </div>
  );
};