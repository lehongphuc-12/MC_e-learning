// =============================================================================
// ImportLessonModal.tsx  —  Bulk Import Lessons via CSV Dialog
// =============================================================================

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { CreateLessonDto } from '../../types/lessonTypes';
import { useBulkCreateLessons } from '../../hooks/useLessonQueries';

interface ImportLessonModalProps {
  courseId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedLessonRow {
  rowNum: number;
  dto: CreateLessonDto;
  isValid: boolean;
  errorReason?: string;
}

const downloadSampleLessonTemplate = () => {
  const csvContent =
    'title,description,video_url,duration_minutes,is_preview,order_index\n' +
    '"Bài 1: Giới thiệu khóa học & Tổng quan nghề MC","Tổng quan lộ trình học tập và kỹ năng cần có của một MC chuyên nghiệp.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",15,true,1\n' +
    '"Bài 2: Phương pháp lấy hơi bụng & kiểm soát nhịp thở","Luyện tập lấy hơi bụng sâu, phát âm tròn vành rõ chữ và không bị đuối hơi.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",20,false,2\n' +
    '"Bài 3: Kỹ thuật đọc kịch bản & Biên soạn lời dẫn","Cách phân tích kịch bản tiệc cưới, sự kiện và kỹ năng xử lý tình huống bất ngờ.","https://www.youtube.com/watch?v=dQw4w9WgXcQ",25,false,3';

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'danh_sach_bai_hoc_mau.csv');
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

export const ImportLessonModal: React.FC<ImportLessonModalProps> = ({
  courseId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedLessonRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: bulkCreate, isPending: isSubmitting } = useBulkCreateLessons(courseId);

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
        const rows: ParsedLessonRow[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const values = rawRows[i];
          if (values.length === 0 || (values.length === 1 && !values[0])) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = values[idx] ?? '';
          });

          const title = findHeaderValue(rowData, ['title', 'tên bài học', 'tên bài', 'tên']);
          const description = findHeaderValue(rowData, ['description', 'mô tả', 'nội dung']);
          const videoUrl = findHeaderValue(rowData, ['video_url', 'đường dẫn video', 'video', 'link', 'url']);
          const durationRaw = findHeaderValue(rowData, ['duration_minutes', 'thời lượng', 'thời gian']);
          const isPreviewRaw = findHeaderValue(rowData, ['is_preview', 'xem thử', 'học thử', 'free preview']).toLowerCase();
          const orderRaw = findHeaderValue(rowData, ['order_index', 'thứ tự', 'stt']);

          const duration = parseInt(durationRaw, 10);
          const orderIndex = parseInt(orderRaw, 10);
          const isTitleValid = title.trim().length >= 2;
          const isPreview =
            isPreviewRaw === 'true' ||
            isPreviewRaw === '1' ||
            isPreviewRaw === 'yes' ||
            isPreviewRaw.includes('true') ||
            isPreviewRaw.includes('có');

          let errorReason = '';
          if (!isTitleValid) errorReason = 'Tên bài học phải >= 2 ký tự';

          rows.push({
            rowNum: i,
            dto: {
              title: title.trim(),
              description: description.trim() || undefined,
              videoUrl: videoUrl.trim() || undefined,
              durationMinutes: !isNaN(duration) && duration > 0 ? duration : 10,
              orderIndex: !isNaN(orderIndex) && orderIndex > 0 ? orderIndex : i,
              isPreview,
              status: 'ACTIVE',
            },
            isValid: isTitleValid,
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

  const handleSubmit = () => {
    if (validRows.length === 0) return;
    bulkCreate(
      validRows.map((r) => r.dto),
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Có lỗi xảy ra khi nhập dữ liệu.');
        },
      }
    );
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Nhập danh sách bài học từ file CSV / Excel
              </h2>
              <p className="text-xs text-slate-500">
                Thêm hàng loạt bài giảng video vào khóa học một cách nhanh chóng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
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
                  <Download className="h-4 w-4 text-blue-600" />
                  Bước 1: Tải tệp CSV mẫu
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  File CSV chứa các cột: Tên bài học, Mô tả, Link Video, Thời lượng (phút), Cho phép xem thử (true/false), Thứ tự.
                </p>
              </div>
              <button
                onClick={downloadSampleLessonTemplate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Tải file CSV bài học mẫu (.csv)
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-5 flex flex-col items-center justify-center text-center relative hover:bg-blue-50/60 transition-all">
              <Upload className="h-8 w-8 text-blue-500 mb-2" />
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
                <span className="mt-3 inline-block rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
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
                Xem trước danh sách bài học ({validRows.length}/{parsedRows.length} dòng hợp lệ)
              </h4>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Tên bài học</th>
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
                        <td className="px-3 py-2 font-bold">{r.dto.orderIndex}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 max-w-[200px] truncate">
                          {r.dto.title || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.dto.durationMinutes} phút</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.dto.isPreview ? 'Có' : 'Không'}
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
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || validRows.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang nhập {validRows.length} bài học...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Nhập {validRows.length} bài học hợp lệ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
