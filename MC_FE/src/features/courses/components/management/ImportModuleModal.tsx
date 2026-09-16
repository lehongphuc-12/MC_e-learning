// =============================================================================
// ImportModuleModal.tsx  —  Bulk Import Modules & Lessons via CSV Dialog
// =============================================================================

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { BulkImportModuleItem } from '../../types/moduleTypes';
import { useBulkCreateModules } from '../../hooks/useModuleQueries';

interface ImportModuleModalProps {
  courseId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedModuleRow {
  rowNum: number;
  moduleTitle: string;
  moduleDescription?: string;
  moduleOrder: number;
  lessonTitle: string;
  lessonDescription?: string;
  videoUrl?: string;
  durationMinutes: number;
  isPreview: boolean;
  lessonOrder: number;
  isValid: boolean;
  errorReason?: string;
}

const downloadSampleModuleTemplate = () => {
  const csvContent =
    'module_title,module_description,module_order,lesson_title,lesson_description,video_url,duration_minutes,is_preview,lesson_order\n' +
    '"Chương 1: Nền tảng giọng nói & Phong thái MC Đám Cưới","Kiểm soát giọng nói, lấy hơi bụng và giải phóng ngữ điệu khi dẫn cưới",1,"Bài 1: Tổng quan về nghề MC đám cưới chuyên nghiệp","Giới thiệu vai trò và trách nhiệm của MC tiệc cưới trong kỷ nguyên mới.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",15,true,1\n' +
    '"Chương 1: Nền tảng giọng nói & Phong thái MC Đám Cưới","Kiểm soát giọng nói, lấy hơi bụng và giải phóng ngữ điệu khi dẫn cưới",1,"Bài 2: Kỹ thuật lấy hơi bụng & Kiểm soát nhịp thở","Luyện tập lấy hơi bụng sâu để giữ hơi dài và phát âm tròn vành rõ chữ.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",20,false,2\n' +
    '"Chương 1: Nền tảng giọng nói & Phong thái MC Đám Cưới","Kiểm soát giọng nói, lấy hơi bụng và giải phóng ngữ điệu khi dẫn cưới",1,"Bài 3: Khẩu hình, giải phóng ngữ điệu & Phong thái di chuyển","Tư thế đứng, cách cầm micro và nét mặt rạng rỡ khi lên sân khấu tiệc cưới.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",25,false,3\n' +
    '"Chương 2: Luyện kịch bản MC & Biên soạn lời dẫn tiệc cưới","Cấu trúc chuẩn của một lễ cưới hiện đại và kỹ năng viết lời dẫn ấn tượng",2,"Bài 1: Cấu trúc kịch bản lễ cưới truyền thống & hiện đại","Phân tích quy trình các phần chính trong một tiệc cưới chuẩn.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",20,false,1\n' +
    '"Chương 2: Luyện kịch bản MC & Biên soạn lời dẫn tiệc cưới","Cấu trúc chuẩn của một lễ cưới hiện đại và kỹ năng viết lời dẫn ấn tượng",2,"Bài 2: Kỹ thuật dẫn phần Lễ: Chú rể - Cô dâu lên sân khấu","Lời dẫn nhập tiệc cảm xúc, tạo điểm nhấn rạng ngời cho đôi tân nhân.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",30,false,2\n' +
    '"Chương 2: Luyện kịch bản MC & Biên soạn lời dẫn tiệc cưới","Cấu trúc chuẩn của một lễ cưới hiện đại và kỹ năng viết lời dẫn ấn tượng",2,"Bài 3: Nghi thức Rót rượu, Cắt bánh & Nâng ly chúc mừng","Cách điều phối và sáng tạo lời dẫn phần nghi thức sang trọng, trang trọng.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",25,false,3\n' +
    '"Chương 3: Điều phối Game show & Phối hợp Ê-kíp sự kiện","Biết cách khuấy động không khí phần Hội và xử lý sự cố tiệc cưới",3,"Bài 1: Kỹ năng tổ chức Mini Game khuấy động tiệc cưới","Các trò chơi sân khấu vui nhộn, lịch sự phù hợp với mọi độ tuổi quan khách.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",35,false,1\n' +
    '"Chương 3: Điều phối Game show & Phối hợp Ê-kíp sự kiện","Biết cách khuấy động không khí phần Hội và xử lý sự cố tiệc cưới",3,"Bài 2: Phối hợp với Âm thanh, Ánh sáng & Nhà hàng","Kỹ năng làm việc với kíp trực âm thanh để tạo hiệu ứng âm nhạc trọn vẹn.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",25,false,2\n' +
    '"Chương 3: Điều phối Game show & Phối hợp Ê-kíp sự kiện","Biết cách khuấy động không khí phần Hội và xử lý sự cố tiệc cưới",3,"Bài 3: Xử lý các tình huống bất ngờ trên sân khấu","Cách làm chủ tình huống khi micro lỗi, sự cố trang phục hoặc gia đình trễ giờ.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",30,false,3';

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'chuong_va_bai_hoc_mc_dam_cuoi.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function parseFullCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function findHeaderValue(rowData: Record<string, string>, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    for (const [headerKey, val] of Object.entries(rowData)) {
      const cleanHeader = headerKey.toLowerCase().trim();
      if (cleanHeader === key || cleanHeader.includes(key)) {
        return val;
      }
    }
  }
  return '';
}

export const ImportModuleModal: React.FC<ImportModuleModalProps> = ({
  courseId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedModuleRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: bulkCreate, isPending: isSubmitting } = useBulkCreateModules(courseId);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setErrorMsg('Tệp trống hoặc không hợp lệ.');
          return;
        }

        const rawRows = parseFullCsv(text);
        if (rawRows.length < 2) {
          setErrorMsg('Tệp CSV cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu.');
          return;
        }

        const headers = rawRows[0].map((h) => h.toLowerCase().trim());
        const rows: ParsedModuleRow[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const values = rawRows[i];
          if (values.length === 0 || (values.length === 1 && !values[0])) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = values[idx] ?? '';
          });

          const moduleTitle = findHeaderValue(rowData, ['module_title', 'tên chương', 'chương', 'module']);
          const moduleDescription = findHeaderValue(rowData, ['module_description', 'mô tả chương']);
          const moduleOrderRaw = findHeaderValue(rowData, ['module_order', 'thứ tự chương']);
          const lessonTitle = findHeaderValue(rowData, ['lesson_title', 'tên bài học', 'bài học', 'title']);
          const lessonDescription = findHeaderValue(rowData, ['lesson_description', 'mô tả bài học', 'description']);
          const videoUrl = findHeaderValue(rowData, ['video_url', 'video', 'link', 'url']);
          const durationRaw = findHeaderValue(rowData, ['duration_minutes', 'thời lượng']);
          const isPreviewRaw = findHeaderValue(rowData, ['is_preview', 'xem thử', 'học thử']).toLowerCase();
          const lessonOrderRaw = findHeaderValue(rowData, ['lesson_order', 'thứ tự bài']);

          const moduleOrder = parseInt(moduleOrderRaw, 10);
          const duration = parseInt(durationRaw, 10);
          const lessonOrder = parseInt(lessonOrderRaw, 10);

          const isModuleValid = moduleTitle.trim().length >= 2;
          const isLessonValid = lessonTitle.trim().length >= 2;
          const isValid = isModuleValid && isLessonValid;

          const isPreview =
            isPreviewRaw === 'true' ||
            isPreviewRaw === '1' ||
            isPreviewRaw === 'yes' ||
            isPreviewRaw.includes('true') ||
            isPreviewRaw.includes('có');

          let errorReason = '';
          if (!isModuleValid) errorReason = 'Tên chương phải >= 2 ký tự';
          else if (!isLessonValid) errorReason = 'Tên bài học phải >= 2 ký tự';

          rows.push({
            rowNum: i,
            moduleTitle: moduleTitle.trim(),
            moduleDescription: moduleDescription.trim() || undefined,
            moduleOrder: !isNaN(moduleOrder) && moduleOrder > 0 ? moduleOrder : 1,
            lessonTitle: lessonTitle.trim(),
            lessonDescription: lessonDescription.trim() || undefined,
            videoUrl: videoUrl.trim() || undefined,
            durationMinutes: !isNaN(duration) && duration > 0 ? duration : 10,
            isPreview,
            lessonOrder: !isNaN(lessonOrder) && lessonOrder > 0 ? lessonOrder : 1,
            isValid,
            errorReason,
          });
        }

        setParsedRows(rows);
      } catch (err) {
        setErrorMsg('Không thể đọc tệp CSV. Vui lòng kiểm tra định dạng tệp.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const validRows = parsedRows.filter((r) => r.isValid);

  // Group rows into BulkImportModuleItem[] structure
  const buildPayload = (): BulkImportModuleItem[] => {
    const map = new Map<string, BulkImportModuleItem>();
    let autoOrderIndex = 1;

    for (const r of validRows) {
      const key = r.moduleTitle.toLowerCase();
      if (!map.has(key)) {
        // Use parsed moduleOrder if valid & distinct, otherwise auto-increment
        const currentOrder = !isNaN(r.moduleOrder) && r.moduleOrder > 0 ? r.moduleOrder : autoOrderIndex;
        map.set(key, {
          moduleTitle: r.moduleTitle,
          moduleDescription: r.moduleDescription,
          moduleOrderIndex: currentOrder,
          lessons: [],
        });
        autoOrderIndex = Math.max(autoOrderIndex, currentOrder) + 1;
      }
      map.get(key)!.lessons.push({
        title: r.lessonTitle,
        description: r.lessonDescription,
        videoUrl: r.videoUrl,
        durationMinutes: r.durationMinutes,
        orderIndex: r.lessonOrder,
        isPreview: r.isPreview,
        status: 'ACTIVE',
      });
    }

    return Array.from(map.values());
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    if (payload.length === 0) return;

    bulkCreate(payload, {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
      onError: (err: any) => {
        setErrorMsg(err?.message || 'Có lỗi xảy ra khi nhập dữ liệu.');
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Nhập danh sách Chương học & Bài học từ CSV / Excel
              </h2>
              <p className="text-xs text-slate-500">
                Tự động gom nhóm các bài học theo từng Chương (Module) nhanh chóng
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Download className="h-4 w-4 text-indigo-600" />
                  Bước 1: Tải tệp CSV mẫu
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  File CSV gồm Tên chương, Mô tả chương, STT chương, Tên bài học, Mô tả bài học, Link video, Thời lượng, Xem thử, STT bài.
                </p>
              </div>
              <button
                onClick={downloadSampleModuleTemplate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Tải file CSV chương & bài học mẫu (.csv)
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 p-5 flex flex-col items-center justify-center text-center relative hover:bg-indigo-50/60 transition-all">
              <Upload className="h-8 w-8 text-indigo-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                Bước 2: Chọn tệp CSV từ máy tính
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Chấp nhận file định dạng .csv (UTF-8)
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {fileName && (
                <span className="mt-3 inline-block rounded-lg bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  📁 {fileName}
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Xem trước danh sách chương & bài học ({validRows.length}/{parsedRows.length} dòng hợp lệ)
              </h4>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Tên Chương (Module)</th>
                      <th className="px-3 py-2.5">Tên Bài học</th>
                      <th className="px-3 py-2.5">Thời lượng</th>
                      <th className="px-3 py-2.5">Xem thử</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="px-3 py-2 font-medium">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                              <AlertCircle className="h-3.5 w-3.5" /> {r.errorReason}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-indigo-900 max-w-[180px] truncate">
                          {r.moduleTitle}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 max-w-[200px] truncate">
                          {r.lessonTitle || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.durationMinutes} phút</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.isPreview ? 'Có' : 'Không'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || validRows.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang nhập dữ liệu...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Nhập danh sách chương & bài học
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
