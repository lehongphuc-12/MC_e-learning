// =============================================================================
// ImportCourseModal.tsx  —  Bulk Course Import via CSV Dialog
// =============================================================================

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { CreateCourseDto, CourseLevel } from '../../types/courseTypes';
import { useBulkCreateCourses } from '../../hooks/useCourseMutations';

interface ImportCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedCourseRow {
  rowNum: number;
  dto: CreateCourseDto;
  isValid: boolean;
  errorReason?: string;
}

// ---------------------------------------------------------------------------
// Helper: Download Sample CSV Template File
// ---------------------------------------------------------------------------
const downloadSampleTemplate = () => {
  const csvContent =
    'title,description,category_id,price,level,status,thumbnail_url\n' +
    '"Khóa học MC Đám Cưới Chuyên Nghiệp","Hướng dẫn kỹ năng dẫn chương trình tiệc cưới sang trọng.",1,199000,BEGINNER,DRAFT,"https://images.unsplash.com/photo-1519741497674-611481863552"\n' +
    '"Khóa học MC Sự Kiện & Hội Nghị","Kỹ năng đọc kịch bản, xử lý tình huống sân khấu.",1,2990000,INTERMEDIATE,DRAFT,"https://images.unsplash.com/photo-1475721027785-f74eccf877e2"\n' +
    '"Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn","Phương pháp lấy hơi bụng, mở khẩu hình và phát âm tròn vành rõ chữ.",2,150000,ALL_LEVELS,DRAFT,"https://images.unsplash.com/photo-1590602847861-f357a9332bbc"';

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'danh_sach_khoa_hoc_mau.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Full CSV Parser supporting quoted multiline strings
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

export const ImportCourseModal: React.FC<ImportCourseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedCourseRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: bulkCreate, isPending: isSubmitting } = useBulkCreateCourses();

  if (!isOpen) return null;

  // Handle File Selection & Parse CSV
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
        const rows: ParsedCourseRow[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const values = rawRows[i];
          if (values.length === 0 || (values.length === 1 && !values[0])) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = values[idx] ?? '';
          });

          const title = findHeaderValue(rowData, ['title', 'tên khóa học', 'tên khóa', 'tên']);
          const description = findHeaderValue(rowData, ['description', 'mô tả', 'nội dung']);
          const categoryIdRaw = findHeaderValue(rowData, ['category_id', 'danh mục id', 'categoryid', 'danh mục']);
          const priceRaw = findHeaderValue(rowData, ['price', 'học phí', 'giá']);
          const levelRaw = findHeaderValue(rowData, ['level', 'cấp độ', 'trình độ']).toUpperCase();
          const thumbnailUrl = findHeaderValue(rowData, ['thumbnail_url', 'ảnh đại diện', 'thumbnail', 'link ảnh', 'url']);

          const price = parseFloat(priceRaw);
          const isPriceValid = !isNaN(price) && price >= 0;
          const isTitleValid = title.trim().length >= 3;

          let level: CourseLevel | undefined = undefined;
          if (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].includes(levelRaw)) {
            level = levelRaw as CourseLevel;
          }

          let errorReason = '';
          if (!isTitleValid) errorReason = 'Tên khóa học phải >= 3 ký tự';
          else if (!isPriceValid) errorReason = 'Học phí không hợp lệ (phải >= 0)';

          rows.push({
            rowNum: i,
            dto: {
              title: title.trim(),
              description: description.trim() || undefined,
              categoryId: categoryIdRaw ? parseInt(categoryIdRaw, 10) : undefined,
              price: isPriceValid ? price : 0,
              level,
              status: 'DRAFT', // FORCED: All imported courses are DRAFT until Admin approves
              thumbnailUrl: thumbnailUrl.trim() || undefined,
            },
            isValid: isTitleValid && isPriceValid,
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
    setErrorMsg(null);
    bulkCreate(
      validRows.map((r) => r.dto),
      {
        onSuccess: (resData: any) => {
          if (Array.isArray(resData) && resData.length === 0 && validRows.length > 0) {
            setErrorMsg('Không thể tạo khóa học. Vui lòng kiểm tra lại Danh mục ID hoặc kết nối hệ thống.');
            return;
          }
          onSuccess?.();
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Có lỗi xảy ra khi nhập dữ liệu. Vui lòng kiểm tra lại thông tin.');
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
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Nhập danh sách khóa học từ file CSV / Excel
              </h2>
              <p className="text-xs text-slate-500">
                Thêm nhanh nhiều khóa học cùng lúc. Tất cả khóa học nhập lên sẽ được lưu dưới dạng <span className="font-semibold text-amber-600">Bản nháp (DRAFT)</span> để gửi Admin duyệt.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Download Template & Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Box */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  Bước 1: Tải tệp CSV mẫu
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Tải file dữ liệu mẫu chuẩn (Tên khóa học, Mô tả, Danh mục ID, Học phí, Cấp độ).
                </p>
              </div>
              <button
                onClick={downloadSampleTemplate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Tải file CSV mẫu (.csv)
              </button>
            </div>

            {/* Upload File Box */}
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

          {/* Detailed Error Message Box */}
          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-bold">Lỗi khi tải hoặc nhập dữ liệu:</p>
                <p className="font-normal text-red-600">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Xem trước dữ liệu ({validRows.length}/{parsedRows.length} dòng hợp lệ)
                </h4>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Trạng thái dòng</th>
                      <th className="px-3 py-2.5">Tên khóa học</th>
                      <th className="px-3 py-2.5">Học phí</th>
                      <th className="px-3 py-2.5">Cấp độ</th>
                      <th className="px-3 py-2.5">Trạng thái lưu</th>
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
                        <td className="px-3 py-2 font-semibold text-slate-800 max-w-[200px] truncate">
                          {r.dto.title || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {r.dto.price === 0 ? 'Miễn phí' : `${r.dto.price.toLocaleString('vi-VN')} VNĐ`}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.dto.level || 'Mọi cấp độ'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            Bản nháp (DRAFT)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang nhập {validRows.length} khóa học...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Nhập {validRows.length} khóa học hợp lệ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

