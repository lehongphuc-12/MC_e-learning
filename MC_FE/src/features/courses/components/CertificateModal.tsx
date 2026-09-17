import React from 'react';
import { Award, CheckCircle2, Download, ExternalLink, Printer, ShieldCheck, X } from 'lucide-react';
import type { Certificate } from '../types/learningTypes';
import { useNavigate } from 'react-router-dom';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: Certificate | null;
  courseTitle?: string;
  learnerName?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
  courseTitle,
  learnerName,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const displayTitle = certificate?.courseTitle || courseTitle || 'Khóa học MC Chuyên Nghiệp';
  const displayName = certificate?.learnerName || learnerName || 'Học Viên MSEEK';
  const displayCode = certificate?.certificateCode || 'CERT-2026-DEMO888';
  const displayDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleOpenFullScreen = () => {
    onClose();
    if (certificate?.certificateId) {
      navigate(`/certificates/${certificate.certificateId}`);
    } else {
      navigate('/profile?tab=certificates');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl shadow-amber-500/10 text-white overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Chứng Chỉ Hoàn Thành Khóa Học</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </h3>
            <p className="text-xs text-amber-400/90 font-medium">Chúc mừng bạn đã xuất sắc hoàn thành 100% nội dung học tập!</p>
          </div>
        </div>

        {/* Certificate Mini-Card View */}
        <div className="relative rounded-2xl border-2 border-amber-500/40 bg-slate-950 p-6 text-center space-y-4 shadow-inner">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/30">
            <Award className="h-3.5 w-3.5" />
            <span>CERTIFICATE OF COMPLETION</span>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Chứng nhận học viên</p>
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mt-1">
              {displayName}
            </h2>
          </div>

          <div>
            <p className="text-xs text-slate-400">Đã hoàn thành xuất sắc khóa học</p>
            <h4 className="text-base font-bold text-indigo-300 mt-0.5">{displayTitle}</h4>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500">Mã chứng chỉ</span>
              <span className="font-mono font-bold text-amber-400">{displayCode}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500">Ngày cấp</span>
              <span className="font-semibold text-slate-300">{displayDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <Printer className="h-4 w-4" />
            In chứng chỉ
          </button>

          <button
            onClick={handleOpenFullScreen}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            Xem trang chứng chỉ đầy đủ
          </button>
        </div>
      </div>
    </div>
  );
};
