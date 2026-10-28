import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, X, ArrowRight, RefreshCw } from 'lucide-react';

export interface LessonStatusModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'loading';
  title: string;
  message: string;
  reason?: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const LessonStatusModal: React.FC<LessonStatusModalProps> = ({
  isOpen,
  type,
  title,
  message,
  reason,
  onClose,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyReason = () => {
    if (reason) {
      navigator.clipboard.writeText(reason);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/80 transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Header Accent */}
        <div
          className={`h-2.5 w-full ${
            isSuccess
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400'
              : 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500'
          }`}
        />

        {/* Modal Header & Icon */}
        <div className="p-6 sm:p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Status Icon Badge */}
          <div className="flex justify-center mb-4">
            {isSuccess ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-rose-400/30 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xl shadow-rose-500/10">
                  <XCircle className="h-10 w-10 text-rose-600" />
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-xl font-extrabold ${isSuccess ? 'text-slate-900' : 'text-rose-950'}`}>
            {title}
          </h3>

          {/* Message */}
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {message}
          </p>

          {/* Failure Reason Details Box */}
          {isError && reason && (
            <div className="mt-5 text-left rounded-2xl border border-rose-200/90 bg-rose-50/70 p-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Chi tiết nguyên nhân thất bại:</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReason}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm hover:bg-rose-100/80 transition-all cursor-pointer"
                  title="Sao chép lỗi"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-rose-500" />
                      <span>Sao chép chi tiết</span>
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-900 p-3.5 text-xs text-rose-200 font-mono leading-relaxed select-all whitespace-pre-wrap break-words border border-slate-800">
                {reason}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="bg-slate-50/80 border-t border-slate-100 p-4 sm:px-8 sm:py-5 flex items-center justify-end gap-3 rounded-b-3xl">
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
              <span>Thử lại</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
              isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            <span>{isSuccess ? 'Hoàn tất' : 'Đóng thông báo'}</span>
            {isSuccess && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
