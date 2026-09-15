// =============================================================================
// CourseMaterialModal.tsx  —  Course & Lesson Material Management Modal
// =============================================================================

import React, { useState } from 'react';
import { X, FileText, Upload, Download, Trash2, Paperclip, Plus, Folder, CheckCircle2, AlertCircle } from 'lucide-react';

interface CourseMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle?: string;
  lessonId?: number | null;
  lessonTitle?: string | null;
}

interface MaterialItem {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  createdAt: string;
}

export const CourseMaterialModal: React.FC<CourseMaterialModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle = 'Khóa học',
  lessonId,
  lessonTitle,
}) => {
  const isLessonLevel = !!lessonId;

  // Mock list for visual preview
  const [materials, setMaterials] = useState<MaterialItem[]>([
    {
      id: 1,
      title: isLessonLevel
        ? `Tài liệu hướng dẫn bài học: ${lessonTitle ?? 'Bài 1'}`
        : `Giáo trình & Slide tổng quan khóa học: ${courseTitle}`,
      fileUrl: 'https://example.com/tai-lieu-giao-trinh.pdf',
      fileType: 'PDF',
      fileSize: '2.4 MB',
      createdAt: '15/09/2026',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [isAdding, setIsAdding] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: MaterialItem = {
      id: Date.now(),
      title: newTitle.trim(),
      fileUrl: newUrl.trim() || 'https://example.com/tai-lieu-sample.pdf',
      fileType: fileType,
      fileSize: '1.5 MB',
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };

    setMaterials([...materials, newItem]);
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
    setSuccessNotice('Đã thêm tài liệu mới thành công!');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleDelete = (id: number) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isLessonLevel ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isLessonLevel ? 'Tài liệu Bài học' : 'Tài liệu Khóa học (Chung)'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5 line-clamp-1">
                {isLessonLevel ? `Tài liệu bài học: ${lessonTitle}` : `Tài liệu: ${courseTitle}`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          {successNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {successNotice}
            </div>
          )}

          {/* Intro notice regarding CourseMaterial table structure */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <Folder className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bảng dữ liệu `CourseMaterial`</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  {isLessonLevel
                    ? `Tài liệu này được gắn trực tiếp cho LessonID = #${lessonId} trong bảng CourseMaterial.`
                    : `Tài liệu này áp dụng cho toàn bộ CourseID = #${courseId} (LessonID = NULL).`}
                </p>
              </div>
            </div>
          </div>

          {/* Add form toggle */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/30 py-3 text-xs font-bold text-amber-700 hover:bg-amber-50/70 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {isLessonLevel ? 'Thêm tài liệu cho bài học này' : 'Thêm tài liệu cho toàn bộ khóa học'}
            </button>
          ) : (
            <form onSubmit={handleAddMaterial} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Thêm mới tài liệu</h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên tài liệu / Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Slide bài giảng PDF / File bài tập Excel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Đường dẫn tệp (URL / Cloud Storage)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (Drive, Cloudinary, S3)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loại tệp</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="PDF">Tệp PDF (.pdf)</option>
                    <option value="PPTX">Slide thuyết trình (.pptx)</option>
                    <option value="DOCX">Văn bản Word (.docx)</option>
                    <option value="ZIP">Tệp nén (.zip / .rar)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm"
                >
                  Lưu tài liệu
                </button>
              </div>
            </form>
          )}

          {/* List of materials */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Danh sách tài liệu ({materials.length})</h4>
            {materials.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-100 rounded-2xl">
                Chưa có tài liệu đính kèm nào.
              </div>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200/60">
                      {m.fileType}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs line-clamp-1">{m.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {m.fileSize} • Ngày tải lên: {m.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                      title="Tải về tài liệu"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-auto">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
