// =============================================================================
// ModuleFormModal.tsx  —  Create / Edit Single Course Module Dialog
// =============================================================================

import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, FolderPlus, Layers } from 'lucide-react';
import type { CourseModule, CreateModuleDto } from '../../types/moduleTypes';

interface ModuleFormModalProps {
  isOpen: boolean;
  existingModule?: CourseModule | null;
  defaultOrderIndex?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateModuleDto) => void;
}

export const ModuleFormModal: React.FC<ModuleFormModalProps> = ({
  isOpen,
  existingModule,
  defaultOrderIndex = 1,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const isEditMode = !!existingModule;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingModule) {
      setTitle(existingModule.title);
      setDescription(existingModule.description ?? '');
      setOrderIndex(existingModule.orderIndex);
    } else {
      setTitle('');
      setDescription('');
      setOrderIndex(defaultOrderIndex);
    }
    setErrorMsg(null);
  }, [existingModule, isOpen, defaultOrderIndex]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Tên chương học không được để trống.');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      orderIndex: Number(orderIndex) || 1,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode ? 'Chỉnh sửa chương học' : 'Thêm chương học mới'}
              </h2>
              <p className="text-xs text-slate-500">
                Tạo các phần / chủ đề (Module) để nhóm các bài học nhỏ lại
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="module-title" className="block text-xs font-bold text-slate-700 mb-1">
              Tên chương học <span className="text-red-500">*</span>
            </label>
            <input
              id="module-title"
              type="text"
              placeholder="Ví dụ: Chương 1: Giới thiệu chung & Kỹ thuật phát âm cơ bản"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50/80 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="module-desc" className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả ngắn chương học
            </label>
            <textarea
              id="module-desc"
              rows={3}
              placeholder="Tóm tắt nội dung chính sẽ được giảng dạy trong chương này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50/80 transition-all resize-none"
            />
          </div>

          {/* Order Index */}
          <div>
            <label htmlFor="module-order" className="block text-xs font-bold text-slate-700 mb-1">
              Thứ tự hiển thị chương (#)
            </label>
            <input
              id="module-order"
              type="number"
              min="1"
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50/80 transition-all"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo chương học'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
