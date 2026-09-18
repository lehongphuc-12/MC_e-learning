// =============================================================================
// CourseLessonsPage.tsx  —  Curriculum Builder / Module & Lesson Management Page
// =============================================================================

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Video,
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
} from 'lucide-react';
import { CourseStudentsModal } from './CourseStudentsModal';
import { IncompleteCourseModal } from './IncompleteCourseModal';
import { useCourseDetail } from '../../hooks/useInstructorCourses';
import { useSubmitForApproval } from '../../hooks/useCourseMutations';
import { useQuizzesByCourse } from "../../../quizzes/hooks/useQuiz";
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

  // Data fetching
  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);
  const { data: lessons = [], isLoading: isLessonsLoading } = useCourseLessons(courseId);
  const { data: modules = [], isLoading: isModulesLoading } = useCourseModules(courseId);
  const {
  data: quizzes = [],
  isLoading: isQuizzesLoading,
} = useQuizzesByCourse(courseId);

  // Accordion open state for modules
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});

  // Drag & drop state for lessons
  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<number | null>(null);

  // Lesson modal states
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isLessonImportModalOpen, setIsLessonImportModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [targetModuleId, setTargetModuleId] = useState<number | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  // Module modal states
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isModuleImportModalOpen, setIsModuleImportModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModule | null>(null);

  // Material modal state
  const [materialTarget, setMaterialTarget] = useState<{ lessonId?: number | null; lessonTitle?: string | null } | null>(null);

  // Submit for Approval Mutation & Incomplete State
  const { mutate: submitForApproval, isPending: isSubmittingForApproval } = useSubmitForApproval();
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<string | null>(null);

  const handleSendForApproval = () => {
    const missing: string[] = [];
    if (!course?.title || !course.title.trim()) missing.push('Tên khóa học chưa điền');
    if (!course?.categoryId) missing.push('Chưa chọn Danh mục khóa học');
    if (!course?.description || !course.description.trim()) missing.push('Mô tả khóa học chưa có');
    if (modules.length === 0) missing.push('Chưa tạo Chương học (Module) nào');
    if (lessons.length === 0) missing.push('Chưa tạo Bài học (Lesson) nào');

    if (missing.length > 0) {
      setMissingRequirements(missing);
      setIsIncompleteModalOpen(true);
      return;
    }

    submitForApproval(
      { courseId },
      {
        onSuccess: () => {
          setApprovalSuccessMessage('Khóa học đã được gửi cho Admin phê duyệt thành công!');
          setTimeout(() => setApprovalSuccessMessage(null), 5000);
        },
        onError: (err: any) => {
          const msg = err?.message || 'Không thể gửi duyệt bài. Vui lòng kiểm tra lại.';
          setMissingRequirements([msg]);
          setIsIncompleteModalOpen(true);
        },
      }
    );
  };

  // Student list modal state
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);

  // Lesson Mutations
  const { mutate: createLesson, isPending: isCreatingLesson } = useCreateLesson(courseId);
  const { mutate: updateLesson, isPending: isUpdatingLesson } = useUpdateLesson(courseId);
  const { mutate: deleteLesson, isPending: isDeletingLesson } = useDeleteLesson(courseId);

  // Module Mutations
  const { mutate: createModule, isPending: isCreatingModule } = useCreateModule(courseId);
  const { mutate: updateModule, isPending: isUpdatingModule } = useUpdateModule(courseId);
  const { mutate: deleteModule, isPending: isDeletingModule } = useDeleteModule(courseId);

  const totalDuration = lessons.reduce((sum, l) => sum + l.durationMinutes, 0);

  const toggleModuleCollapse = (moduleId: number) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Drag & Drop Lesson Handlers
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

    // Get all lessons in target module sorted by current orderIndex
    const moduleLessons = lessons
      .filter((l) => l.moduleId === targetModuleId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    let reordered: Lesson[] = [...moduleLessons];

    const draggedIdx = reordered.findIndex((l) => l.lessonId === draggedLesson.lessonId);
    const targetIdx = reordered.findIndex((l) => l.lessonId === targetLesson.lessonId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      // Reorder within the same module
      const [moved] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, moved);
    } else {
      // Moving from another module into target module
      const filtered = reordered.filter((l) => l.lessonId !== draggedLesson.lessonId);
      const insertIdx = targetIdx !== -1 ? targetIdx : filtered.length;
      filtered.splice(insertIdx, 0, { ...draggedLesson, moduleId: targetModuleId });
      reordered = filtered;
    }

    // Update orderIndex for each lesson whose index or moduleId changed
    reordered.forEach((l, index) => {
      const newOrderIndex = index + 1;
      if (l.orderIndex !== newOrderIndex || l.moduleId !== targetModuleId) {
        updateLesson({
          lessonId: l.lessonId,
          dto: {
            title: l.title,
            description: l.description,
            durationMinutes: l.durationMinutes,
            isPreview: l.isPreview,
            status: l.status,
            videoUrl: l.videoUrl,
            moduleId: targetModuleId,
            orderIndex: newOrderIndex,
          },
        });
      }
    });

    setDraggedLesson(null);
  };

  // Lesson actions
  const handleOpenCreateLesson = (moduleId?: number | null) => {
    setEditingLesson(null);
    setTargetModuleId(moduleId ?? null);
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
        { lessonId: editingLesson.lessonId, dto },
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
    if (!lessonToDelete) return;
    deleteLesson(lessonToDelete.lessonId, {
      onSuccess: () => setLessonToDelete(null),
    });
  };

  // Module actions
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
        { moduleId: editingModule.moduleId, dto },
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
    if (!moduleToDelete) return;
    deleteModule(moduleToDelete.moduleId, {
      onSuccess: () => setModuleToDelete(null),
    });
  };

  if (isCourseLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Group lessons by moduleId
  const lessonsByModule: Record<number, Lesson[]> = {};
  const unassignedLessons: Lesson[] = [];

  lessons.forEach((l) => {
    if (l.moduleId) {
      if (!lessonsByModule[l.moduleId]) lessonsByModule[l.moduleId] = [];
      lessonsByModule[l.moduleId].push(l);
    } else {
      unassignedLessons.push(l);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/instructor/courses')}
              title="Quay lại danh sách khóa học"
              className="rounded-2xl bg-white/10 p-2.5 text-indigo-200 hover:bg-white/20 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                Quản lý Chương & Bài học
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/10 border border-white/20 shadow-inner relative">
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
                  <span className="flex items-center gap-1 font-semibold text-indigo-200 whitespace-nowrap">
                    <Layers className="h-3.5 w-3.5" />
                    {modules.length} Chương
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-indigo-200 whitespace-nowrap">
                    <BookOpen className="h-3.5 w-3.5" />
                    {lessons.length} Bài học
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-indigo-200 whitespace-nowrap">
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

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 max-w-2xl justify-start xl:justify-end">
              {(course?.status === 'DRAFT' || course?.status === 'REJECTED') && (
                <button
                  onClick={handleSendForApproval}
                  disabled={isSubmittingForApproval}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Gửi Admin duyệt</span>
                </button>
              )}

              <button
                onClick={handleOpenCreateModule}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Thêm Chương mới</span>
              </button>
              {modules.length > 0 && (
                <button
                  onClick={() => handleOpenCreateLesson(modules[0]?.moduleId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Thêm Bài học</span>
                </button>
              )}
              <button
                onClick={() => navigate(`/courses/${courseId}/learn`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <PlayCircle className="h-4 w-4" />
                <span>Vào xem video bài học</span>
              </button>

              <button
                onClick={() => setIsStudentsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Users className="h-4 w-4 text-cyan-300" />
                <span>Danh sách học viên</span>
              </button>
              <button
                onClick={() => navigate(`/instructor/courses/${courseId}/quizzes`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <ClipboardList className="h-4 w-4 text-violet-300" />
                <span>Quản lý Quiz</span>
              </button>
              <button
                onClick={() => setMaterialTarget({ lessonId: null })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Paperclip className="h-4 w-4 text-amber-300" />
                <span>Tài liệu khóa học</span>
              </button>
              <button
                onClick={() => setIsModuleImportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                <span>Nhập từ CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
       {/* ============================================================
    QUIZ MANAGEMENT
============================================================ */}

<div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">

  {/* Header */}
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

    <button
      type="button"
      onClick={() =>
        navigate(
          `/instructor/quizzes/new?courseId=${courseId}`
        )
      }
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95"
    >
      <Plus className="h-4 w-4" />
      Tạo Quiz
    </button>

  </div>

  {/* Content */}
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
        Tạo bài kiểm tra để đánh giá kiến thức của học viên
        trong khóa học này.
      </p>

      <button
        type="button"
        onClick={() =>
          navigate(
            `/instructor/quizzes/new?courseId=${courseId}`
          )
        }
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Tạo Quiz đầu tiên
      </button>

    </div>

  ) : (

    <div className="overflow-x-auto">

      <table className="w-full text-xs text-left">

        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">

            <th className="px-6 py-3">
              Quiz
            </th>

            <th className="px-4 py-3">
              Câu hỏi
            </th>

            <th className="px-4 py-3">
              Thời gian
            </th>

            <th className="px-4 py-3">
              Điểm đạt
            </th>

            <th className="px-4 py-3">
              Trạng thái
            </th>

            <th className="px-6 py-3 text-right">
              Thao tác
            </th>

          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">

          {quizzes.map((quiz) => (

            <tr
              key={quiz.quizId}
              className="group transition-colors hover:bg-indigo-50/20"
            >

              {/* Quiz */}
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

              {/* Questions */}
              <td className="px-4 py-4 font-medium text-slate-700">
                {quiz.questionCount ?? 0} câu
              </td>

              {/* Time */}
              <td className="px-4 py-4 text-slate-600">
                {quiz.timeLimitMinutes > 0
                  ? `${quiz.timeLimitMinutes} phút`
                  : 'Không giới hạn'}
              </td>

              {/* Passing */}
              <td className="px-4 py-4 font-medium text-slate-700">
                {quiz.passingScore}%
              </td>

              {/* Status */}
              <td className="px-4 py-4">

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    quiz.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : quiz.status === 'ARCHIVED'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {quiz.status === 'PUBLISHED'
                    ? 'Đã xuất bản'
                    : quiz.status === 'ARCHIVED'
                    ? 'Đã lưu trữ'
                    : 'Bản nháp'}
                </span>

              </td>

              {/* Actions */}
              <td className="px-6 py-4">

                <div className="flex items-center justify-end gap-1.5">

                  {/* Detail */}
                  <button
                    type="button"
                    title="Xem Quiz"
                    onClick={() =>
                      navigate(
                        `/instructor/quizzes/${quiz.quizId}`
                      )
                    }
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {/* Edit */}
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

                  {/* Take */}
                  <button
                    type="button"
                    title="Làm Quiz"
                    onClick={() =>
                      navigate(
                        `/quizzes/${quiz.quizId}/take`
                      )
                    }
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <PlayCircle className="h-4 w-4" />
                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )}

</div>       
      {/* Content Container */}
      <div className="mx-auto max-w-7xl px-6 pt-8 space-y-6">
        {/* Module Accordions */}
        {isModulesLoading || isLessonsLoading ? (
          <div className="p-6 animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-slate-200/70" />
            ))}
          </div>
        ) : modules.length === 0 && unassignedLessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
              <Layers className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Khóa học chưa có chương & bài học nào</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              Bạn có thể tạo Chương học (Module) trước để tổ chức các bài giảng khoa học, hoặc nhập nhanh từ file CSV.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleOpenCreateModule}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                Thêm Chương học đầu tiên
              </button>
              <button
                onClick={() => setIsModuleImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                Nhập file CSV mẫu
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Render Modules list */}
            {[...modules].sort((a, b) => a.orderIndex - b.orderIndex).map((mod) => {
              const moduleLessons = lessonsByModule[mod.moduleId] || [];
              const isCollapsed = collapsedModules[mod.moduleId];
              const modDuration = moduleLessons.reduce((sum, l) => sum + l.durationMinutes, 0);

              return (
                <div
                  key={mod.moduleId}
                  className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all"
                >
                  {/* Module Header Bar */}
                  <div className="bg-slate-50/90 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleModuleCollapse(mod.moduleId)}
                        className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-200/60 transition-all cursor-pointer"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-sm shadow-xs">
                        #{mod.orderIndex}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 line-clamp-1">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>{moduleLessons.length} bài học</span>
                          <span>•</span>
                          <span>{modDuration} phút</span>
                          {mod.description && (
                            <>
                              <span>•</span>
                              <span className="line-clamp-1 italic text-slate-400">{mod.description}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Module Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenCreateLesson(mod.moduleId)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Thêm bài học
                      </button>
                      <button
                        onClick={() => handleOpenEditModule(mod)}
                        title="Chỉnh sửa chương"
                        className="rounded-xl p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setModuleToDelete(mod)}
                        title="Xóa chương"
                        className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons Table in Module */}
                  {!isCollapsed && (
                    <div>
                      {moduleLessons.length === 0 ? (
                        <div className="py-8 px-6 text-center text-xs text-slate-400">
                          Chưa có bài học nào trong chương này.{' '}
                          <button
                            onClick={() => handleOpenCreateLesson(mod.moduleId)}
                            className="text-indigo-600 font-semibold underline cursor-pointer hover:text-indigo-800 ml-1"
                          >
                            + Thêm bài học mới
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="px-6 py-3 w-14">STT</th>
                                <th className="px-6 py-3">Tên bài học</th>
                                <th className="px-4 py-3">Thời lượng</th>
                                <th className="px-4 py-3">Xem thử</th>
                                <th className="px-4 py-3">Video / Link</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {moduleLessons.map((lesson) => {
                                const isDragging = draggedLesson?.lessonId === lesson.lessonId;
                                const isDragOver = dragOverLessonId === lesson.lessonId && !isDragging;

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
                                        ? 'opacity-40 bg-indigo-50/60 border-2 border-dashed border-indigo-400'
                                        : isDragOver
                                        ? 'border-t-2 border-indigo-600 bg-indigo-100/50 shadow-xs'
                                        : 'hover:bg-indigo-50/20'
                                    }`}
                                  >
                                    <td className="px-5 py-3.5 font-bold text-slate-700">
                                      <div className="flex items-center gap-1.5">
                                        <div
                                          className="p-1 text-slate-300 group-hover:text-slate-500 hover:text-indigo-600 cursor-grab active:cursor-grabbing transition-colors"
                                          title="Nhấp giữ & kéo thả để thay đổi thứ tự bài học"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        <span>#{lesson.orderIndex}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <button
                                        onClick={() => navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)}
                                        className="group/title text-left flex items-start gap-2.5 cursor-pointer"
                                      >
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover/title:bg-indigo-600 group-hover/title:text-white transition-all shadow-xs">
                                          <PlayCircle className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-slate-900 group-hover/title:text-indigo-600 transition-colors text-sm line-clamp-1">
                                            {lesson.title}
                                          </p>
                                          {lesson.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                              {lesson.description}
                                            </p>
                                          )}
                                        </div>
                                      </button>
                                    </td>
                                    <td className="px-4 py-3.5 font-medium text-slate-700">
                                      {lesson.durationMinutes} phút
                                    </td>
                                    <td className="px-4 py-3.5">
                                      {lesson.isPreview ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 border border-emerald-200/80 text-[11px]">
                                          <Eye className="h-3 w-3" /> Xem thử
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      {lesson.videoUrl ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)}
                                            className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-all cursor-pointer"
                                          >
                                            <PlayCircle className="h-3 w-3 text-blue-600" />
                                            <span>Xem video</span>
                                          </button>
                                          <a
                                            href={lesson.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Mở link YouTube bên ngoài"
                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </a>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">Chưa gắn video</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setMaterialTarget({ lessonId: lesson.lessonId, lessonTitle: lesson.title })}
                                          title="Tài liệu bài học"
                                          className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95 transition-all cursor-pointer"
                                        >
                                          <Paperclip className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleOpenEditLesson(lesson)}
                                          title="Chỉnh sửa bài học"
                                          className="rounded-xl p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all cursor-pointer"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => setLessonToDelete(lesson)}
                                          title="Xóa bài học"
                                          className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer"
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

            {/* Unassigned Lessons Card */}
            {unassignedLessons.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
                <div className="bg-amber-50/70 px-6 py-4 flex items-center justify-between border-b border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold text-xs">
                      ?
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-amber-950">Bài học chưa phân Chương</h3>
                      <p className="text-xs text-amber-700/80">
                        {unassignedLessons.length} bài học chưa được đưa vào chương nào
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-6 py-3 w-14">STT</th>
                        <th className="px-6 py-3">Tên bài học</th>
                        <th className="px-4 py-3">Thời lượng</th>
                        <th className="px-4 py-3">Xem thử</th>
                        <th className="px-4 py-3">Video / Link</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unassignedLessons.map((lesson) => {
                        const isDragging = draggedLesson?.lessonId === lesson.lessonId;
                        const isDragOver = dragOverLessonId === lesson.lessonId && !isDragging;

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
                                ? 'opacity-40 bg-amber-50/60 border-2 border-dashed border-amber-400'
                                : isDragOver
                                ? 'border-t-2 border-amber-600 bg-amber-100/50 shadow-xs'
                                : 'hover:bg-amber-50/20'
                            }`}
                          >
                            <td className="px-5 py-3.5 font-bold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="p-1 text-slate-300 group-hover:text-slate-500 hover:text-amber-600 cursor-grab active:cursor-grabbing transition-colors"
                                  title="Nhấp giữ & kéo thả để thay đổi thứ tự bài học"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <span>#{lesson.orderIndex}</span>
                              </div>
                            </td>
                          <td className="px-6 py-3.5">
                            <button
                              onClick={() => navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)}
                              className="group/title text-left flex items-start gap-2.5 cursor-pointer"
                            >
                              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover/title:bg-amber-600 group-hover/title:text-white transition-all shadow-xs">
                                <PlayCircle className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 group-hover/title:text-amber-700 transition-colors text-sm line-clamp-1">
                                  {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {lesson.durationMinutes} phút
                          </td>
                          <td className="px-4 py-3.5">
                            {lesson.isPreview ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 border border-emerald-200/80 text-[11px]">
                                <Eye className="h-3 w-3" /> Xem thử
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {lesson.videoUrl ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/courses/${courseId}/learn?lessonId=${lesson.lessonId}`)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-all cursor-pointer"
                                >
                                  <PlayCircle className="h-3 w-3 text-blue-600" />
                                  <span>Xem video</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">Chưa gắn video</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setMaterialTarget({ lessonId: lesson.lessonId, lessonTitle: lesson.title })}
                                title="Tài liệu bài học"
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95 transition-all cursor-pointer"
                              >
                                <Paperclip className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditLesson(lesson)}
                                title="Gán vào chương / Chỉnh sửa"
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-100 hover:text-amber-800 active:scale-95 transition-all cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setLessonToDelete(lesson)}
                                title="Xóa bài học"
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer"
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

      {/* Modals */}
      <LessonFormModal
        isOpen={isLessonModalOpen}
        existingLesson={editingLesson}
        modules={modules}
        defaultModuleId={targetModuleId}
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

      {/* Course & Lesson Material Modal */}
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

      {/* Delete Lesson Confirmation Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa bài học</h3>
            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa bài học <span className="font-semibold text-slate-900">"{lessonToDelete.title}"</span> không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setLessonToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteLessonConfirm}
                disabled={isDeletingLesson}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingLesson ? 'Đang xóa...' : 'Xóa bài học'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Module Confirmation Modal */}
      {moduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-100">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              Xác nhận xóa chương học
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa chương <span className="font-bold text-slate-900">"{moduleToDelete.title}"</span> không?
            </p>
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1">
              <p className="font-bold text-red-700">⚠️ CẢNH BÁO NGUY HIỂM:</p>
              <p>
                Hành động này sẽ <span className="font-bold text-red-700 underline">XÓA VĨNH VIỄN</span> toàn bộ{' '}
                <span className="font-bold underline">{(lessonsByModule[moduleToDelete.moduleId] || []).length} bài học</span> thuộc chương này khỏi cơ sở dữ liệu!
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModuleToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteModuleConfirm}
                disabled={isDeletingModule}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-md shadow-red-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingModule ? 'Đang xóa...' : 'Đồng ý xóa toàn bộ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrolled Students Modal */}
      <CourseStudentsModal
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        courseTitle={course?.title}
      />

      {/* Incomplete Course Modal */}
      <IncompleteCourseModal
        isOpen={isIncompleteModalOpen}
        onClose={() => setIsIncompleteModalOpen(false)}
        courseTitle={course?.title || ''}
        courseId={courseId}
        missingItems={missingRequirements}
        onGoToLessons={() => setIsIncompleteModalOpen(false)}
      />

      {/* Approval Success Banner */}
      {approvalSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-4 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="h-5 w-5 text-emerald-200" />
          <p className="text-xs font-bold">{approvalSuccessMessage}</p>
        </div>
      )}
    </div>
  );
};
