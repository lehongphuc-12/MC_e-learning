// =============================================================================
// CourseListView.tsx  —  Data table + pagination for Course Management
//
// Responsibility: displays a paginated, filterable list of courses.
// This component is the "dumb" presentational layer — it receives data and
// callbacks from CourseManagementPage and renders the table + controls.
// All data fetching happens in the parent via React Query hooks.
// =============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, ChevronRight, Edit2, PlusCircle, Trash2,
  ToggleLeft, ToggleRight, ImageOff, Paperclip, Clock, Users
} from 'lucide-react';
import type { Course, CourseListParams } from '../../types/courseTypes';
import { CourseStatusBadge } from './CourseStatusBadge';
import { DeleteCourseModal } from './DeleteCourseModal';
import { CourseMaterialModal } from './CourseMaterialModal';
import { CourseStudentsModal } from './CourseStudentsModal';
import { moduleApi } from '../../api/moduleApi';
import { lessonApi } from '../../api/lessonApi';
import { IncompleteCourseModal } from './IncompleteCourseModal';
import { useDeleteCourse, useToggleCourseStatus, useSubmitForApproval } from '../../hooks/useCourseMutations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatPrice = (price: number) =>
  price === 0 ? 'Miễn phí' : `${price.toLocaleString('vi-VN')} VNĐ`;

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
  ALL_LEVELS: 'Mọi cấp độ',
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CourseListViewProps {
  courses: Course[];
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  params: CourseListParams;
  onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const CourseListView: React.FC<CourseListViewProps> = ({
  courses,
  totalPages,
  currentPage,
  isLoading,
  params,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [courseForStudents, setCourseForStudents] = useState<Course | null>(null);
  const [incompleteCourse, setIncompleteCourse] = useState<{
    course: Course;
    missingItems: string[];
  } | null>(null);

  const { mutate: deleteCourse, isPending: isDeleting } = useDeleteCourse();
  const { mutate: toggleStatus } = useToggleCourseStatus();
  const { mutate: submitForApproval } = useSubmitForApproval();

  const handleToggleAction = async (course: Course) => {
    if (course.status === 'PUBLISHED') {
      // Recall published course back to DRAFT
      toggleStatus({ courseId: course.courseId, newStatus: 'DRAFT' });
    } else if (course.status === 'PENDING_APPROVAL') {
      // Recall pending course back to DRAFT
      toggleStatus({ courseId: course.courseId, newStatus: 'DRAFT' });
    } else {
      // DRAFT or REJECTED: Submit to Admin for approval -> Validate course completeness!
      const missingItems: string[] = [];

      if (!course.title || !course.title.trim()) {
        missingItems.push('Tên khóa học chưa điền');
      }
      if (!course.categoryId) {
        missingItems.push('Chưa chọn Danh mục khóa học');
      }
      if (!course.description || !course.description.trim()) {
        missingItems.push('Chưa có Mô tả khóa học');
      }

      try {
        const [modules, lessons] = await Promise.all([
          moduleApi.getModulesByCourseId(course.courseId),
          lessonApi.getLessonsByCourseId(course.courseId),
        ]);

        if (!modules || modules.length === 0) {
          missingItems.push('Chưa tạo Chương học (Module) nào');
        }
        if (!lessons || lessons.length === 0) {
          missingItems.push('Chưa tạo Bài học (Lesson) nào');
        }
      } catch {
        // Fallthrough if API fails
      }

      if (missingItems.length > 0) {
        setIncompleteCourse({ course, missingItems });
        return;
      }

      submitForApproval({ courseId: course.courseId });
    }
  };

  const handleConfirmDelete = () => {
    if (!courseToDelete) return;
    deleteCourse(courseToDelete.courseId, {
      onSuccess: () => setCourseToDelete(null),
    });
  };

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white shadow-sm border border-slate-100" />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/80 backdrop-blur-sm py-16 px-6 text-center shadow-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
          <BookOpen className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Chưa tìm thấy khóa học nào</h3>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md">
          {params.search || params.status
            ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.'
            : 'Hãy bắt đầu bằng việc tạo khóa học đầu tiên của bạn ngay hôm nay!'}
        </p>
        <button
          id="create-first-course-btn"
          onClick={() => navigate('/instructor/courses/new')}
          className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo khóa học mới
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4 w-[340px]">Khóa học</th>
                <th className="px-4 py-4">Danh mục</th>
                <th className="px-4 py-4">Học phí</th>
                <th className="px-4 py-4">Học viên</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Mốc thời gian</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr
                  key={course.courseId}
                  className="group transition-colors hover:bg-blue-50/40"
                >
                  {/* Course title + thumbnail (Clickable to view lessons detail) */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => navigate(`/instructor/courses/${course.courseId}/lessons`)}
                      title="Bấm để xem chi tiết & bài học"
                      className="flex items-center gap-3.5 cursor-pointer group/item"
                    >
                      <div className="h-14 w-22 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 shadow-xs relative">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="h-full w-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100">
                            <ImageOff className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 group-hover/item:text-blue-600 transition-colors line-clamp-1 max-w-[260px]">
                          {course.title}
                        </p>
                        {course.level && (
                          <span className="mt-0.5 inline-block text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {LEVEL_LABELS[course.level] || course.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/60">
                      {course.categoryName ?? 'Chưa phân loại'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-4 font-bold text-slate-800">
                    {formatPrice(course.price)}
                  </td>

                  {/* Student Count */}
                  <td className="px-4 py-4">
                    {course.status !== 'PUBLISHED' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-200/60 whitespace-nowrap">
                        <Users className="h-3.5 w-3.5 text-slate-300" />
                        <span>Chưa có học viên</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setCourseForStudents(course)}
                        title="Bấm để xem danh sách học viên"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200/80 hover:bg-cyan-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                      >
                        <Users className="h-3.5 w-3.5 text-cyan-600" />
                        <span>{course.studentCount ?? 0} học viên</span>
                      </button>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <CourseStatusBadge status={course.status} />
                      {course.status === 'REJECTED' && course.rejectionReason && (
                        <p className="text-[11px] font-medium text-rose-600 bg-rose-50 p-1.5 rounded-md border border-rose-200 max-w-xs">
                          Lý do: {course.rejectionReason}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Timestamps */}
                  <td className="px-4 py-4 text-xs font-medium text-slate-600 space-y-0.5">
                    <div><span className="text-slate-400">Tạo:</span> {formatDate(course.createdAt)}</div>
                    <div><span className="text-slate-400">Sửa:</span> {formatDate(course.updatedAt)}</div>
                    {course.submittedAt && (
                      <div className="text-amber-700 font-semibold">
                        <span>Gửi:</span> {formatDate(course.submittedAt)}
                      </div>
                    )}
                    {course.approvedAt && (
                      <div className="text-emerald-700 font-semibold">
                        <span>Duyệt:</span> {formatDate(course.approvedAt)}
                      </div>
                    )}
                  </td>

                  {/* Action buttons */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Toggle button: Bật = Gửi Admin duyệt / Tắt = Rút về Bản nháp */}
                      <button
                        id={`toggle-status-btn-${course.courseId}`}
                        title={
                          course.status === 'PUBLISHED'
                            ? 'Khóa học đã xuất bản (Bấm để gỡ xuống Bản nháp)'
                            : course.status === 'PENDING_APPROVAL'
                            ? 'Đang chờ Admin duyệt (Bấm để rút về Bản nháp)'
                            : 'Gửi khóa học cho Admin duyệt'
                        }
                        onClick={() => handleToggleAction(course)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95 transition-all cursor-pointer"
                      >
                        {course.status === 'PUBLISHED' ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600" />
                        ) : course.status === 'PENDING_APPROVAL' ? (
                          <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-slate-400 hover:text-amber-600" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        id={`edit-course-btn-${course.courseId}`}
                        title="Chỉnh sửa khóa học"
                        onClick={() => navigate(`/instructor/courses/${course.courseId}/edit`)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all"
                      >
                        <Edit2 className="h-4.5 w-4.5" />
                      </button>

                      {/* Delete */}
                      <button
                        id={`delete-course-btn-${course.courseId}`}
                        title="Xóa khóa học"
                        onClick={() => setCourseToDelete(course)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-6 py-4 gap-4">
            <span className="text-xs font-medium text-slate-600">
              Hiển thị <span className="font-bold text-slate-900">10</span> khóa/trang — Trang <span className="font-bold text-slate-900">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                id="courses-prev-page-btn"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Numbered page buttons */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`h-8 min-w-[32px] px-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${pageNum === currentPage
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                id="courses-next-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <DeleteCourseModal
        course={courseToDelete}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCourseToDelete(null)}
      />

      {/* Incomplete Course Modal */}
      <IncompleteCourseModal
        isOpen={Boolean(incompleteCourse)}
        onClose={() => setIncompleteCourse(null)}
        courseTitle={incompleteCourse?.course.title || ''}
        courseId={incompleteCourse?.course.courseId || 0}
        missingItems={incompleteCourse?.missingItems || []}
        onGoToLessons={() => {
          if (incompleteCourse) {
            navigate(`/instructor/courses/${incompleteCourse.course.courseId}/lessons`);
            setIncompleteCourse(null);
          }
        }}
      />
      {/* Course Students Modal */}
      <CourseStudentsModal
        isOpen={Boolean(courseForStudents)}
        onClose={() => setCourseForStudents(null)}
        courseTitle={courseForStudents?.title}
      />
    </>
  );
};