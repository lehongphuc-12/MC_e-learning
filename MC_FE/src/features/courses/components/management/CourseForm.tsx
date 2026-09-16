// =============================================================================
// CourseForm.tsx  —  Create / Edit Course Form
//
// Tech: React Hook Form (RHF) + Zod for validation
// =============================================================================

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X } from 'lucide-react';
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
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-500 mt-0.5">
        {error}
      </p>
    )}
  </div>
);

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50/80 transition-all aria-[invalid=true]:border-red-400';

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
        status: existingCourse.status,
      });
    }
  }, [existingCourse, reset]);

  return (
    <form
      id="course-form"
      onSubmit={handleSubmit(onSubmit as any)}
      className="space-y-6"
      noValidate
    >
      {/* ── Title ── */}
      <FormField id="title" label="Tên khóa học" required error={errors.title?.message}>
        <input
          id="title"
          type="text"
          placeholder="Ví dụ: Khóa học MC Chuyên Nghiệp - Kỹ Năng Dẫn Chương Trình Sân Khấu"
          aria-invalid={!!errors.title}
          className={inputClass}
          {...register('title')}
        />
      </FormField>

      {/* ── Description ── */}
      <FormField id="description" label="Mô tả nội dung khóa học" error={errors.description?.message}>
        <textarea
          id="description"
          rows={5}
          placeholder="Mô tả tổng quan, lộ trình học tập và kết quả đạt được sau khóa học..."
          className={`${inputClass} resize-none`}
          {...register('description')}
        />
      </FormField>

      {/* ── Category & Level ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="categoryId" label="Danh mục khóa học" error={errors.categoryId?.message as string}>
          <select id="categoryId" className={`${inputClass} cursor-pointer`} {...register('categoryId')}>
            <option value="">-- Chọn danh mục --</option>
            {categories.map((cat) => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.categoryName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="level" label="Cấp độ học viên" error={errors.level?.message}>
          <select id="level" className={`${inputClass} cursor-pointer`} {...register('level')}>
            <option value="">-- Chọn cấp độ --</option>
            <option value="BEGINNER">Cơ bản (Beginner)</option>
            <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
            <option value="ADVANCED">Nâng cao (Advanced)</option>
            <option value="ALL_LEVELS">Mọi cấp độ (All Levels)</option>
          </select>
        </FormField>
      </div>

      {/* ── Price & Status ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="price" label="Học phí (VNĐ)" required error={errors.price?.message}>
          <div className="relative">
            <input
              id="price"
              type="number"
              min="0"
              step="1000"
              placeholder="Ví dụ: 150000"
              aria-invalid={!!errors.price}
              className={`w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-14 text-xs shadow-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.price
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              {...register('price')}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              VNĐ
            </span>
          </div>
        </FormField>

        <FormField id="status" label="Trạng thái xuất bản" required error={errors.status?.message}>
          <select
            id="status"
            aria-invalid={!!errors.status}
            className={`${inputClass} cursor-pointer`}
            {...register('status')}
          >
            <option value="DRAFT">Bản nháp (Chỉ mình bạn xem)</option>
            <option value="PUBLISHED">Đã xuất bản (Công khai với học viên)</option>
            <option value="ARCHIVED">Đã lưu trữ (Ẩn khỏi danh mục)</option>
          </select>
        </FormField>
      </div>

      {/* ── Thumbnail URL ── */}
      <FormField
        id="thumbnailUrl"
        label="Đường dẫn ảnh đại diện (Thumbnail URL)"
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

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-8">
        <button
          id="course-form-cancel-btn"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
          Hủy bỏ
        </button>

        <button
          id="course-form-submit-btn"
          type="submit"
          disabled={isSubmitting || (!isDirty && isEditMode)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? 'Đang lưu...' : 'Đang tạo...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? 'Lưu thay đổi' : 'Tạo khóa học'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
