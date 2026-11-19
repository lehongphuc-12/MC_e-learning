// =============================================================================
// CourseMaterialModal.tsx  —  Course & Lesson Material Management Modal
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  Paperclip,
  Plus,
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { mentorChatApi, CourseMaterialItem } from '../../api/mentorChatApi';

interface CourseMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle?: string;
  lessonId?: number | null;
  lessonTitle?: string | null;
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

  const [materials, setMaterials] = useState<CourseMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Load materials from backend API
  const fetchMaterials = async () => {
    if (!courseId) return;
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await mentorChatApi.getMaterials(courseId);
      setMaterials(data);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách tài liệu:', err);
      setErrorNotice(err?.message || 'Không thể tải danh sách tài liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
      setIsAdding(false);
      setNewTitle('');
      setSelectedFile(null);
      setSuccessNotice(null);
      setErrorNotice(null);
    }
  }, [isOpen, courseId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newTitle.trim()) {
        const defaultName = file.name.replace(/\.[^/.]+$/, '');
        setNewTitle(defaultName);
      }
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorNotice('Vui lòng chọn file tài liệu định dạng PDF, TXT hoặc MD.');
      return;
    }

    setIsUploading(true);
    setErrorNotice(null);

    try {
      const res = await mentorChatApi.uploadDocumentMaterial(
        courseId,
        selectedFile,
        newTitle.trim() || selectedFile.name,
        lessonId || undefined
      );

      const chunks = res?.indexedChunks ?? 0;
      setSuccessNotice(
        `Đã tải lên và lập chỉ mục thành công! (${chunks} đoạn kiến thức đã nạp vào AI Mentor).`
      );
      setNewTitle('');
      setSelectedFile(null);
      setIsAdding(false);
      await fetchMaterials();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Lỗi khi tải lên tài liệu:', err);
      setErrorNotice(err?.message || 'Không thể tải lên tài liệu. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (materialId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này? Vector AI liên quan sẽ được tự động dọn dẹp.')) {
      return;
    }

    setDeletingId(materialId);
    setErrorNotice(null);
    try {
      await mentorChatApi.deleteMaterial(courseId, materialId);
      setMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
      setSuccessNotice('Đã xóa tài liệu và dọn dẹp vector AI thành công.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error('Lỗi khi xóa tài liệu:', err);
      setErrorNotice(err?.message || 'Không thể xóa tài liệu.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter materials based on current scope
  const filteredMaterials = materials.filter((m) => {
    if (isLessonLevel) {
      return m.lessonId === lessonId;
    }
    return !m.lessonId || m.lessonId === null;
  });

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
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isLessonLevel ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isLessonLevel ? 'Tài liệu Bài học' : 'Tài liệu Khóa học (Chung)'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Mentor RAG
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
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorNotice && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Scope notice */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <Folder className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Quản lý Tài liệu Khóa học & Lập chỉ mục RAG</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  {isLessonLevel
                    ? `Tài liệu tải lên tại đây sẽ được gắn cho Bài học #${lessonId} và nạp vào Vector Store để học viên tra cứu khi học bài này.`
                    : `Tài liệu tải lên tại đây sẽ áp dụng cho toàn bộ Khóa học #${courseId} (giáo trình, slide tổng quan).`}
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
              {isLessonLevel ? 'Tải lên tài liệu mới cho bài học này' : 'Tải lên tài liệu mới cho toàn bộ khóa học'}
            </button>
          ) : (
            <form onSubmit={handleAddMaterial} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">Tải lên tệp tài liệu mới</h4>
                <span className="text-[11px] text-slate-500">Hỗ trợ: PDF, TXT, MD (Tối đa 100MB)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chọn tệp tài liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tiêu đề tài liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giáo trình MC Song ngữ - Bài 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={isUploading}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang nạp AI...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Tải lên & Lập chỉ mục AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* List of materials */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">
                Danh sách tài liệu ({filteredMaterials.length})
              </h4>
              <button
                type="button"
                onClick={fetchMaterials}
                className="text-[11px] text-amber-700 hover:underline cursor-pointer font-medium"
              >
                Làm mới
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span>Đang tải danh sách tài liệu...</span>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-100 rounded-2xl">
                Chưa có tài liệu nào trong phạm vi này. Hãy nhấn nút phía trên để tải lên.
              </div>
            ) : (
              filteredMaterials.map((m) => {
                const isDeleting = deletingId === m.materialId;
                const ext = m.fileUrl?.split('.').pop()?.toUpperCase() || 'DOC';
                const isRagIndexed = m.ragStatus === 'INDEXED' || !m.ragStatus || m.ragStatus === 'COMPLETED';

                return (
                  <div
                    key={m.materialId}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50/80 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200/60">
                        {ext}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 text-xs truncate">{m.title}</p>
                          {isRagIndexed ? (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                              INDEXED
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                              PENDING_INDEX
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mã tài liệu: #{m.materialId}
                          {m.lessonId ? ` · Bài học #${m.lessonId}` : ' · Toàn khóa'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {m.fileUrl && (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                          title="Tải về tài liệu"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(m.materialId)}
                        disabled={isDeleting}
                        className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer disabled:opacity-50"
                        title="Xóa tài liệu"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })
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
