// =============================================================================
// CourseFormPage.tsx  —  Create / Edit page wrapper
//
// Smart container for CourseForm:
//   - CREATE mode (/instructor/courses/new): no pre-fill, calls createCourse
//   - EDIT mode   (/instructor/courses/:id/edit): fetches course, pre-fills form
// =============================================================================

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BookPlus, Edit3, X } from 'lucide-react';
import { CourseForm, type CourseFormData } from './CourseForm';
import { useCourseDetail, useCategoriesQuery } from '../../hooks/useInstructorCourses';
import { useCreateCourse, useUpdateCourse } from '../../hooks/useCourseMutations';

import { moduleApi } from '../../api/moduleApi';
import { lessonApi } from '../../api/lessonApi';

// Shape of the error thrown by request<T>() in services/api.ts
interface ApiError {
  status?: number;
  message?: string;
  errors?: string[];
}

export const CourseFormPage: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id?: string }>();
  const courseId = id ? Number(id) : 0;
  const isEditMode = courseId > 0;

  // ── Error state — shown in the red banner above the form ──────────────────
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: existingCourse, isLoading: isCourseLoading } =
    useCourseDetail(courseId);

  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategoriesQuery();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createCourse, isPending: isCreating } = useCreateCourse();
  const { mutate: updateCourse, isPending: isUpdating } = useUpdateCourse();

  // ── Error handler — extracts message from ApiError and sets state ──────────
  const handleApiError = (err: unknown) => {
    const apiErr = err as ApiError;
    setSubmitError(apiErr?.message ?? 'An unexpected error occurred. Please try again.');
    setSubmitErrors(apiErr?.errors ?? []);
    // Scroll to top so the error banner is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (formData: CourseFormData & { submitForApproval?: boolean; submissionNote?: string }) => {
    // Clear previous error on each new attempt
    setSubmitError(null);
    setSubmitErrors([]);

    if (formData.submitForApproval) {
      if (!isEditMode) {
        setSubmitError('Chưa thể gửi Admin duyệt: Khóa học mới tạo chưa có Chương học và Bài học. Hãy bấm "Lưu bản nháp" trước, sau đó thêm Bài học rồi mới gửi duyệt!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Check modules and lessons count for edit mode
      try {
        const [modules, lessons] = await Promise.all([
          moduleApi.getModulesByCourseId(courseId),
          lessonApi.getLessonsByCourseId(courseId),
        ]);

        const missing: string[] = [];
        if (!modules || modules.length === 0) missing.push('Chưa tạo Chương học (Module) nào');
        if (!lessons || lessons.length === 0) missing.push('Chưa tạo Bài học (Lesson) nào');

        if (missing.length > 0) {
          setSubmitError(`Chưa thể gửi Admin duyệt. Khóa học còn thiếu: ${missing.join(', ')}.`);
          setSubmitErrors(missing);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch {
        // Fallthrough if API fails
      }
    }

    const dto = {
      title: formData.title,
      description: formData.description,
      categoryId: formData.categoryId,
      thumbnailUrl: formData.thumbnailUrl || undefined,
      price: formData.price,
      level: formData.level || undefined,
      status: formData.submitForApproval ? 'PENDING_APPROVAL' : ('DRAFT' as const),
      submissionNote: formData.submissionNote,
      submitForApproval: formData.submitForApproval || false,
    };

    if (isEditMode) {
      updateCourse(
        { courseId, dto },
        {
          onSuccess: () => navigate('/instructor/courses'),
          onError: handleApiError,
        }
      );
    } else {
      createCourse(dto, {
        onSuccess: () => navigate('/instructor/courses'),
        onError: handleApiError,
      });
    }
  };

  // ── Loading state (edit mode) ──────────────────────────────────────────────
  if (isEditMode && isCourseLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Page header ── */}
        <div className="mb-8 flex items-center gap-4">
          <button
            id="course-form-back-btn"
            onClick={() => navigate('/instructor/courses')}
            title="Quay lại danh sách"
            className="rounded-2xl border border-slate-200/80 bg-white p-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              {isEditMode ? (
                <Edit3 className="h-6 w-6" />
              ) : (
                <BookPlus className="h-6 w-6" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isEditMode ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isEditMode
                  ? `Đang chỉnh sửa: ${existingCourse?.title}`
                  : 'Điền đầy đủ thông tin để tạo khóa học chất lượng cho học viên'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {submitError && (
          <div
            id="course-form-error-banner"
            role="alert"
            className="mb-6 flex items-start gap-3.5 rounded-2xl border border-red-200 bg-red-50/90 backdrop-blur-sm px-5 py-4 shadow-sm"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-800">{submitError}</p>
              {submitErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {submitErrors.map((errMsg, i) => (
                    <li key={i} className="text-xs font-medium text-red-600">
                      • {errMsg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              id="course-form-error-dismiss-btn"
              onClick={() => { setSubmitError(null); setSubmitErrors([]); }}
              className="shrink-0 rounded-xl p-1 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
              title="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Form Body ── */}
        {isCategoriesLoading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 animate-pulse space-y-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <CourseForm
            existingCourse={existingCourse}
            categories={categories}
            isSubmitting={isCreating || isUpdating}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/instructor/courses')}
          />
        )}
      </div>
    </div>
  );
};
