import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CourseReviewReportCategory } from '../api/courseReviewApi';

const reasons: Array<{ value: CourseReviewReportCategory; label: string }> = [
  { value: 'IRRELEVANT', label: 'Không liên quan đến khóa học' },
  { value: 'ABUSIVE_LANGUAGE', label: 'Ngôn từ thô tục hoặc xúc phạm' },
  { value: 'SPAM_OR_FAKE', label: 'Spam hoặc nội dung giả mạo' },
  { value: 'PERSONAL_INFO', label: 'Có thông tin cá nhân' },
  { value: 'OTHER', label: 'Lý do khác' },
];

interface Props {
  open: boolean;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (category: CourseReviewReportCategory, details: string) => void;
}

export const CourseReviewReportModal: React.FC<Props> = ({ open, saving, error, onClose, onSubmit }) => {
  const [category, setCategory] = useState<CourseReviewReportCategory>('IRRELEVANT');
  const [details, setDetails] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="course-review-report-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-rose-600">Gửi cho Admin xem xét</p><h2 id="course-review-report-title" className="mt-1 text-xl font-extrabold text-slate-900">Báo cáo đánh giá</h2><p className="mt-2 text-sm text-slate-500">Báo cáo không tự động ẩn đánh giá hoặc chặn người viết. Admin sẽ kiểm tra trước khi xử lý.</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
        </header>
        <label htmlFor="course-review-report-reason" className="mt-6 block text-sm font-semibold text-slate-800">Lý do báo cáo</label>
        <select id="course-review-report-reason" value={category} onChange={event => setCategory(event.target.value as CourseReviewReportCategory)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
          {reasons.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
        </select>
        <label htmlFor="course-review-report-details" className="mt-5 block text-sm font-semibold text-slate-800">Thông tin thêm <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id="course-review-report-details" value={details} onChange={event => setDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Mô tả ngắn điều bạn muốn Admin kiểm tra…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <footer className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</button><button type="button" onClick={() => onSubmit(category, details)} disabled={saving} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">{saving ? 'Đang gửi…' : 'Gửi báo cáo'}</button></footer>
      </section>
    </div>
  );
};
