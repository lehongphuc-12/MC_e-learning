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
} from 'lucide-react';
import { useCourseDetail } from '../../hooks/useInstructorCourses';
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

  // Accordion open state for modules
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});

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
                <div className="mt-2 flex items-center gap-3 text-xs text-indigo-100/80">
                  <span className="flex items-center gap-1 font-semibold text-indigo-200">
                    <Layers className="h-3.5 w-3.5" />
                    {modules.length} Chương
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {lessons.length} Bài học
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
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
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate(`/courses/${courseId}/learn`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/90 backdrop-blur-md border border-emerald-400/30 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <PlayCircle className="h-4 w-4" />
                Vào xem video bài học
              </button>
              <button
                onClick={() => setMaterialTarget({ lessonId: null })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3.5 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <Paperclip className="h-4 w-4 text-amber-300" />
                Tài liệu khóa học
              </button>
              <button
                onClick={() => setIsModuleImportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-indigo-300" />
                Nhập từ CSV
              </button>

              <button
                onClick={handleOpenCreateModule}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                Thêm Chương mới
              </button>

              {modules.length > 0 && (
                <button
                  onClick={() => handleOpenCreateLesson(modules[0]?.moduleId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-400 active:scale-95 transition-all cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  Thêm Bài học
                </button>
              )}
            </div>
          </div>
        </div>
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
                              {moduleLessons.map((lesson) => (
                                <tr key={lesson.lessonId} className="group hover:bg-indigo-50/20 transition-colors">
                                  <td className="px-6 py-3.5 font-bold text-slate-700">#{lesson.orderIndex}</td>
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
                              ))}
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
                      {unassignedLessons.map((lesson) => (
                        <tr key={lesson.lessonId} className="group hover:bg-amber-50/20 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-slate-700">#{lesson.orderIndex}</td>
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
                      ))}
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
    </div>
  );
};
