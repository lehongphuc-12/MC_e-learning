// =============================================================================
// CourseForm.tsx  —  Create / Edit Course Form (2-Column Responsive Layout)
//
// Tech: React Hook Form (RHF) + Zod for validation
// Includes real-time live course card preview and instructor guidance tips.
// =============================================================================

import React, { useEffect } from 'react';
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
} from 'lucide-react';
import type { Category, Course } from '../../types/courseTypes';

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
      message: 'Học phí phải lớn hơn hoặc bằng 0',
    })
    .transform(Number),

  level: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS', ''])
    .optional(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export type CourseFormInput = z.input<typeof courseSchema>;
export type CourseFormData = z.output<typeof courseSchema>;

interface CourseFormProps {
  existingCourse?: Course;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (data: CourseFormData) => void;
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CourseFormInput>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      thumbnailUrl: '',
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
        price: existingCourse.price.toString(),
        level: existingCourse.level ?? '',
        status: existingCourse.status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT',
      });
    }
  }, [existingCourse, reset]);

  // Real-time live watched values for the interactive preview card
  const watchedValues = watch();
  const previewTitle = watchedValues.title?.trim() || 'Tên khóa học sẽ hiển thị ở đây...';
  const previewThumbnail =
    watchedValues.thumbnailUrl?.trim() ||
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop';
  const previewPrice = Number(watchedValues.price) || 0;
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

  const levelLabels: Record<string, string> = {
    BEGINNER: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
    ALL_LEVELS: 'Mọi cấp độ',
  };

  return (
    <form
      id="course-form"
      onSubmit={handleSubmit(onSubmit as any)}
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
              id="price"
              label="Học phí (VNĐ)"
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              required
              error={errors.price?.message}
            >
              <div className="relative">
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 199000"
                  aria-invalid={!!errors.price}
                  className={`${inputClass} pr-14 font-bold text-slate-900`}
                  {...register('price')}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
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

          {/* Thumbnail URL */}
          <FormField
            id="thumbnailUrl"
            label="Đường dẫn ảnh đại diện (Thumbnail URL)"
            icon={<ImageIcon className="h-4 w-4 text-cyan-600" />}
            error={errors.thumbnailUrl?.message}
          >
            <input
              id="thumbnailUrl"
              type="url"
              placeholder="https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
              aria-invalid={!!errors.thumbnailUrl}
              className={inputClass}
              {...register('thumbnailUrl')}
            />
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
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4 text-slate-600" />
              {isEditMode ? 'Lưu thay đổi' : 'Lưu bản nháp'}
            </button>

            <button
              id="course-form-submit-approval-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => {
                onSubmit({
                  ...data,
                  submitForApproval: true,
                } as any);
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
                    {formatVND(previewPrice)}
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
    </form>
  );
};
