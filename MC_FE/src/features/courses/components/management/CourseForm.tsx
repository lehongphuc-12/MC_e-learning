// =============================================================================
// CourseForm.tsx  —  Create / Edit Course Form (2-Column Responsive Layout)
//
// Tech: React Hook Form (RHF) + Zod for validation
// Includes real-time live course card preview and instructor guidance tips.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Save,
  X,
  Eye,
  Sparkles,
  CheckCircle2,
  FileEdit,
  Lightbulb,
  Image as ImageIcon,
  DollarSign,
  BookOpen,
  Tag,
  BarChart,
  Upload,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import type { Category, Course } from '../../types/courseTypes';
import { courseApi } from '../../api/courseApi';
import { courseSyllabusApi, type SyllabusVersion } from '../../api/courseSyllabusApi';
import { CourseSyllabusDocumentViewer } from '../CourseSyllabusDocumentViewer';

// ---------------------------------------------------------------------------
// Zod Schema  — Vietnamese validation messages
// ---------------------------------------------------------------------------
export const courseSchema = z.object({
  title: z
    .string()
    .min(3, 'Tên khóa học phải có ít nhất 3 ký tự')
    .max(255, 'Tên khóa học không vượt quá 255 ký tự'),

  description: z.string().optional(),

  categoryId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : null)),

  thumbnailUrl: z
    .string()
    .url('Đường dẫn ảnh phải đúng định dạng URL (vd: https://...)')
    .optional()
    .or(z.literal('')),

  price: z
    .string()
    .min(1, 'Vui lòng nhập học phí')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Học phí không hợp lệ',
    })
    .refine((val) => Number.isInteger(Number(val)), {
      message: 'Học phí VND phải là số nguyên',
    })
    .transform(Number),

  isFree: z.boolean(),

  level: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS', ''])
    .optional(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  submissionNote: z.string().optional(),
}).superRefine((value, context) => {
  if (value.isFree && value.price !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Khóa miễn phí phải có học phí bằng 0 VNĐ.' });
  }
  if (!value.isFree && value.price <= 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Khóa trả phí phải có học phí lớn hơn 0 VNĐ.' });
  }
});

export type CourseFormInput = z.input<typeof courseSchema>;
export type CourseFormData = z.output<typeof courseSchema>;

interface CourseFormProps {
  existingCourse?: Course;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (data: CourseFormData & { syllabusFile?: File; submitForApproval?: boolean }) => void;
  onCancel: () => void;
}

interface FormFieldProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, icon, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
      {icon}
      <span>{label}</span>
      {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-rose-500 mt-0.5">
        {error}
      </p>
    )}
  </div>
);

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all aria-[invalid=true]:border-rose-400';

export const CourseForm: React.FC<CourseFormProps> = ({
  existingCourse,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const isEditMode = !!existingCourse;
  const [thumbnailMode, setThumbnailMode] = useState<'url' | 'upload'>('url');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [approvalFormError, setApprovalFormError] = useState<string | null>(null);
  const [syllabusFile, setSyllabusFile] = useState<File | undefined>();
  const [syllabusFileError, setSyllabusFileError] = useState<string | null>(null);
  const [currentSyllabus, setCurrentSyllabus] = useState<SyllabusVersion | null>(null);
  const [showSyllabusPreview, setShowSyllabusPreview] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CourseFormInput>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      thumbnailUrl: '',
      isFree: false,
      price: '0',
      level: '',
      status: 'DRAFT',
    },
  });

  useEffect(() => {
    if (existingCourse) {
      reset({
        title: existingCourse.title,
        description: existingCourse.description ?? '',
        categoryId: existingCourse.categoryId?.toString() ?? '',
        thumbnailUrl: existingCourse.thumbnailUrl ?? '',
        isFree: existingCourse.isFree ?? existingCourse.price <= 0,
        price: existingCourse.price.toString(),
        level: existingCourse.level ?? '',
        status: existingCourse.status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT',
      });
    }
  }, [existingCourse, reset]);

  useEffect(() => {
    let active = true;
    if (!existingCourse) { setCurrentSyllabus(null); return; }
    courseSyllabusApi.getCurrent(existingCourse.courseId)
      .then((version) => { if (active) setCurrentSyllabus(version); })
      .catch(() => { if (active) setCurrentSyllabus(null); });
    return () => { active = false; };
  }, [existingCourse?.courseId]);

  const deleteCurrentSyllabus = async () => {
    if (!existingCourse || !currentSyllabus) return;
    try {
      await courseSyllabusApi.deleteDraft(existingCourse.courseId, currentSyllabus.syllabusVersionId);
      setCurrentSyllabus(null);
      setShowSyllabusPreview(false);
    } catch (error) {
      setSyllabusFileError(error instanceof Error ? error.message : 'Không thể xóa phiên bản syllabus này.');
    }
  };

  // Real-time live watched values for the interactive preview card
  const watchedValues = watch();
  const previewTitle = watchedValues.title?.trim() || 'Tên khóa học sẽ hiển thị ở đây...';
  const previewThumbnail =
    watchedValues.thumbnailUrl?.trim() ||
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop';
  const previewPrice = Number(watchedValues.price) || 0;
  const isFreeCourse = !!watchedValues.isFree;
  const previewStatus = watchedValues.status || 'DRAFT';
  const previewLevel = watchedValues.level;

  const selectedCategory = categories.find(
    (c) => c.categoryId.toString() === watchedValues.categoryId
  );
  const previewCategoryName = selectedCategory?.categoryName || 'Chưa chọn danh mục';

  const formatVND = (num: number) => {
    if (!num || num === 0) return 'Miễn phí';
    return `${num.toLocaleString('vi-VN')} ₫`;
  };

  const handleThumbnailFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setThumbnailUploadError('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbnailUploadError('Ảnh không được vượt quá 5 MB.');
      return;
    }

    setThumbnailUploadError(null);
    setIsUploadingThumbnail(true);
    try {
      const url = await courseApi.uploadCourseThumbnail(file);
      setValue('thumbnailUrl', url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      setThumbnailUploadError(error instanceof Error ? error.message : 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const levelLabels: Record<string, string> = {
    BEGINNER: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
    ALL_LEVELS: 'Mọi cấp độ',
  };

  return (
    <form
      id="course-form"
      onSubmit={handleSubmit((data) => onSubmit({ ...data, syllabusFile } as unknown as CourseFormData & { syllabusFile?: File }))}
      className="no-validate"
      noValidate
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Form Controls (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-2 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>Thông tin chung khóa học</span>
            </h2>
            <span className="text-xs font-semibold text-slate-400">Bước 1/2</span>
          </div>

          {/* Title */}
          <FormField
            id="title"
            label="Tên khóa học"
            icon={<BookOpen className="h-4 w-4 text-blue-600" />}
            required
            error={errors.title?.message}
          >
            <input
              id="title"
              type="text"
              placeholder="Ví dụ: Khóa học MC Tiệc Cưới Chuyên Nghiệp - Kỹ Năng Dẫn Chương Trình"
              aria-invalid={!!errors.title}
              className={inputClass}
              {...register('title')}
            />
          </FormField>

          {/* Description */}
          <FormField
            id="description"
            label="Mô tả nội dung khóa học"
            icon={<Sparkles className="h-4 w-4 text-indigo-600" />}
            error={errors.description?.message}
          >
            <textarea
              id="description"
              rows={5}
              placeholder="Mô tả chi tiết tổng quan khóa học, lộ trình học tập, các chương trình thực hành..."
              className={`${inputClass} resize-none leading-relaxed`}
              {...register('description')}
            />
          </FormField>

          {/* Category & Level */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="categoryId"
              label="Danh mục khóa học"
              icon={<Tag className="h-4 w-4 text-emerald-600" />}
              error={errors.categoryId?.message as string}
            >
              <select id="categoryId" className={`${inputClass} cursor-pointer`} {...register('categoryId')}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="level"
              label="Cấp độ học viên"
              icon={<BarChart className="h-4 w-4 text-amber-600" />}
              error={errors.level?.message}
            >
              <select id="level" className={`${inputClass} cursor-pointer`} {...register('level')}>
                <option value="">-- Chọn cấp độ --</option>
                <option value="BEGINNER">Cơ bản (Beginner)</option>
                <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                <option value="ADVANCED">Nâng cao (Advanced)</option>
                <option value="ALL_LEVELS">Mọi cấp độ (All Levels)</option>
              </select>
            </FormField>
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="isFree"
              label="Khóa học miễn phí"
              icon={<Tag className="h-4 w-4 text-cyan-600" />}
              error={errors.isFree?.message}
            >
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  id="isFree"
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  {...register('isFree', {
                    onChange: (event) => {
                      if (event.target.checked) setValue('price', '0', { shouldDirty: true, shouldValidate: true });
                    },
                  })}
                />
                Đây là khóa học miễn phí
              </label>
            </FormField>

            <FormField
              id="price"
              label="Học phí (VNĐ)"
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              required={!isFreeCourse}
              error={errors.price?.message}
            >
              <div className="relative">
                <input
                  id="price"
                  type="number"
                  min={isFreeCourse ? '0' : '1'}
                  step="1000"
                  placeholder="Ví dụ: 199000"
                  aria-invalid={!!errors.price}
                  readOnly={isFreeCourse}
                  className={`${inputClass} pr-14 font-bold text-slate-900 ${isFreeCourse ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                  {...register('price')}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
              {isFreeCourse && <p className="text-xs text-emerald-700">Học phí được tự động đặt bằng 0 VNĐ.</p>}
            </FormField>

            <FormField
              id="status"
              label="Trạng thái lưu trữ"
              icon={<CheckCircle2 className="h-4 w-4 text-purple-600" />}
              required
              error={errors.status?.message}
            >
              <select id="status" aria-invalid={!!errors.status} className={`${inputClass} cursor-pointer`} {...register('status')}>
                <option value="DRAFT">Bản nháp (Lưu chỉnh sửa, chờ gửi Admin duyệt)</option>
                <option value="ARCHIVED">Đã lưu trữ (Ẩn khỏi danh mục)</option>
              </select>
            </FormField>
          </div>

          {/* Course image can be provided as a URL or uploaded to the configured Cloudinary account. */}
          <FormField
            id="thumbnailUrl"
            label="Ảnh đại diện khóa học"
            icon={<ImageIcon className="h-4 w-4 text-cyan-600" />}
            error={errors.thumbnailUrl?.message}
          >
            <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Cách thêm ảnh khóa học">
              <button type="button" role="tab" aria-selected={thumbnailMode === 'url'} onClick={() => setThumbnailMode('url')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${thumbnailMode === 'url' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                <LinkIcon className="h-3.5 w-3.5" /> Dán liên kết
              </button>
              <button type="button" role="tab" aria-selected={thumbnailMode === 'upload'} onClick={() => setThumbnailMode('upload')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${thumbnailMode === 'upload' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                <Upload className="h-3.5 w-3.5" /> Tải ảnh từ thiết bị
              </button>
            </div>
            {thumbnailMode === 'url' ? (
              <input
                id="thumbnailUrl"
                type="url"
                placeholder="https://..."
                aria-invalid={!!errors.thumbnailUrl}
                className={inputClass}
                {...register('thumbnailUrl')}
              />
            ) : (
              <div className="space-y-2">
                <label htmlFor="thumbnailFile" className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:bg-blue-50 ${isUploadingThumbnail ? 'pointer-events-none opacity-60' : ''}`}>
                  {isUploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-blue-600" />}
                  {isUploadingThumbnail ? 'Đang tải ảnh lên Cloudinary…' : 'Chọn ảnh JPG, PNG, WEBP hoặc GIF (tối đa 5 MB)'}
                </label>
                <input id="thumbnailFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={isUploadingThumbnail || isSubmitting} onChange={handleThumbnailFile} />
                {watchedValues.thumbnailUrl && <p className="truncate text-xs text-emerald-700">Ảnh đã chọn: {watchedValues.thumbnailUrl}</p>}
                {thumbnailUploadError && <p role="alert" className="text-xs font-semibold text-rose-600">{thumbnailUploadError}</p>}
              </div>
            )}
          </FormField>

          <FormField id="course-syllabus-file" label="Đề cương khóa học (PDF/DOCX)" icon={<FileText className="h-4 w-4 text-indigo-600" />}>
            <label htmlFor="course-syllabus-file" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-4 text-sm text-slate-700 hover:border-indigo-400 hover:bg-indigo-50">
              <FileText className="h-5 w-5 shrink-0 text-indigo-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{syllabusFile?.name ?? 'Chọn đề cương từ thiết bị'}</span>
                <span className="block text-xs text-slate-500">Tối đa 20 MB. File chỉ được tải lên R2 sau khi bấm Lưu.</span>
              </span>
              <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm">Chọn file</span>
            </label>
            <input id="course-syllabus-file" className="sr-only" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" disabled={isSubmitting} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const validType = file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              if (!validType || file.size > 20 * 1024 * 1024) {
                setSyllabusFileError('Chỉ nhận PDF hoặc DOCX, dung lượng không quá 20 MB.');
                return;
              }
              setSyllabusFileError(null);
              setSyllabusFile(file);
            }} />
            {existingCourse && <p className="text-xs text-slate-500">Khi tải bản mới, bản Admin đã duyệt tiếp tục có hiệu lực cho học viên cho đến khi bản mới được duyệt.</p>}
            {currentSyllabus && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">Bản hiện tại v{currentSyllabus.versionNumber}: {currentSyllabus.originalFileName} · {currentSyllabus.reviewStatus}</span>
              <button type="button" onClick={() => setShowSyllabusPreview((value) => !value)} className="font-bold text-blue-700">{showSyllabusPreview ? 'Ẩn xem trước' : 'Xem trước'}</button>
              {['DRAFT', 'REJECTED'].includes(currentSyllabus.reviewStatus) && <button type="button" onClick={deleteCurrentSyllabus} className="font-bold text-rose-600">Xóa bản nháp</button>}
            </div>}
            {showSyllabusPreview && existingCourse && currentSyllabus && <CourseSyllabusDocumentViewer courseId={existingCourse.courseId} version={currentSyllabus} />}
            {syllabusFileError && <p role="alert" className="text-xs font-semibold text-rose-600">{syllabusFileError}</p>}
            {syllabusFile && <button type="button" onClick={() => setSyllabusFile(undefined)} className="text-xs font-semibold text-rose-600">Bỏ chọn file</button>}
          </FormField>

          {/* Submission Note for Admin */}
          <FormField
            id="submissionNote"
            label="Ghi chú cho Admin khi gửi duyệt (Tùy chọn)"
            icon={<FileEdit className="h-4 w-4 text-amber-600" />}
            error={errors.submissionNote?.message}
          >
            <textarea
              id="submissionNote"
              rows={2}
              placeholder="Nhập tóm tắt các nội dung tạo mới hoặc chỉnh sửa để Admin duyệt nhanh (ví dụ: Tạo mới khóa học, Bổ sung bài giảng 2 và 3...)"
              className={`${inputClass} resize-none leading-relaxed`}
              {...register('submissionNote')}
            />
          </FormField>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-8">
            <button
              id="course-form-cancel-btn"
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
              Hủy bỏ
            </button>

            <button
              id="course-form-save-draft-btn"
              type="submit"
              disabled={isSubmitting || isUploadingThumbnail}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-slate-600" />}
              {isSubmitting ? 'Đang lưu khóa học...' : isEditMode ? 'Lưu thay đổi' : 'Lưu bản nháp'}
            </button>

            <button
              id="course-form-submit-approval-btn"
              type="button"
              disabled={isSubmitting || isUploadingThumbnail}
      onClick={handleSubmit((data) => {
                onSubmit({
                  ...data,
                  syllabusFile,
                  submitForApproval: true,
                } as any);
              }, () => {
                const missing: string[] = [];
                if ((watchedValues.title ?? '').trim().length < 3) missing.push('Nhập tên khóa học (ít nhất 3 ký tự).');
                if (!watchedValues.isFree && Number(watchedValues.price) <= 0) missing.push('Chọn khóa miễn phí hoặc nhập học phí lớn hơn 0 VNĐ.');
                if (errors.thumbnailUrl) missing.push('Kiểm tra lại đường dẫn ảnh đại diện.');
                setApprovalFormError(`Hãy hoàn tất thông tin bắt buộc trước khi gửi duyệt. ${missing.join(' ')}`);
              })}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gửi Admin duyệt ngay
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right Column: Interactive Live Preview & Tips (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          {/* Live Preview Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Xem trước giao diện học viên
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                Live Preview
              </span>
            </div>

            {/* Mock Student Course Card */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-md hover:shadow-lg transition-all group">
              <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                <img
                  src={previewThumbnail}
                  alt="Thumbnail Preview"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop';
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="rounded-md bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
                    {previewCategoryName}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  {previewStatus === 'PUBLISHED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
                      <CheckCircle2 className="h-3 w-3" /> Đã xuất bản
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/20">
                      <FileEdit className="h-3 w-3" /> Bản nháp
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                  {previewTitle}
                </h4>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  {previewLevel && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Cấp độ: {levelLabels[previewLevel] || previewLevel}
                    </span>
                  )}
                  <span className="text-base font-black text-blue-600 ml-auto">
                  {isFreeCourse ? 'Miễn phí' : formatVND(previewPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructor Tips Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 text-blue-300">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-bold text-sm tracking-tight">Gợi ý tạo khóa học thu hút</h3>
            </div>

            <ul className="space-y-3 text-xs text-blue-100/90 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>
                  <strong className="text-white">Tiêu đề khóa học:</strong> Đặt tiêu đề ngắn gọn, tập trung vào kết quả học viên đạt được (ví dụ: MC Tiệc Cưới, Luyện Giọng Nói...).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>
                  <strong className="text-white">Ảnh Thumbnail:</strong> Sử dụng ảnh ngang tỉ lệ 16:9 chất lượng cao, màu sắc tươi sáng để tăng tỉ lệ click.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span>
                  <strong className="text-white">Trạng thái xuất bản:</strong> Hãy để <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300 font-mono">Bản nháp</code> trong lúc soạn thảo nội dung. Chuyển sang <code className="bg-white/10 px-1 py-0.5 rounded text-emerald-300 font-mono">Đã xuất bản</code> khi sẵn sàng cho học viên.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {approvalFormError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setApprovalFormError(null); }}>
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="approval-form-error-title">
            <h2 id="approval-form-error-title" className="text-lg font-extrabold text-slate-900">Chưa đủ thông tin khóa học</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{approvalFormError}</p>
            <div className="mt-5 flex justify-end"><button type="button" autoFocus onClick={() => setApprovalFormError(null)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Đã hiểu</button></div>
          </section>
        </div>
      )}
    </form>
  );
};
