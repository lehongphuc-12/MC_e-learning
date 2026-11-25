import React, { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import type { CourseReviewEligibility } from '../api/courseReviewApi';

interface CourseReviewModalProps {
  open: boolean;
  courseTitle: string;
  existing?: CourseReviewEligibility;
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

export const CourseReviewModal: React.FC<CourseReviewModalProps> = ({
  open, courseTitle, existing, isSaving, error, onClose, onSubmit,
}) => {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');

  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? '');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, existing?.rating, existing?.comment, isSaving, onClose]);

  if (!open) return null;
  const selectedRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="course-review-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Chia sẻ trải nghiệm</p>
            <h2 id="course-review-title" className="mt-1 text-xl font-extrabold text-slate-900">{existing?.hasReviewed ? 'Cập nhật đánh giá' : 'Đánh giá khóa học'}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{courseTitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Đóng hộp thoại" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-slate-800">Bạn đánh giá khóa học thế nào?</legend>
          <div className="mt-3 flex items-center gap-2" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" aria-label={`${value} sao`} aria-pressed={rating === value} onMouseEnter={() => setHoverRating(value)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(0)} onClick={() => setRating(value)} className="rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                <Star className={`h-8 w-8 ${value <= selectedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
            <span className="ml-2 text-sm text-slate-600">{rating ? `${rating} / 5 sao` : 'Chọn số sao'}</span>
          </div>
        </fieldset>

        <label htmlFor="course-review-comment" className="mt-6 block text-sm font-semibold text-slate-800">Nhận xét <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
        <textarea id="course-review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={5} placeholder="Điều gì hữu ích nhất với bạn?" className="mt-2 w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        <div className="mt-1 text-right text-xs text-slate-400">{comment.length}/2000</div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
          <button type="button" onClick={() => onSubmit(rating, comment)} disabled={rating < 1 || isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Đang gửi…' : existing?.hasReviewed ? 'Lưu đánh giá' : 'Gửi đánh giá'}</button>
        </div>
      </section>
    </div>
  );
};
