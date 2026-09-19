import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ArrowLeft, Printer, Download, ShieldCheck, CheckCircle, ExternalLink } from 'lucide-react';
import { useCertificateDetail } from '../hooks/useCertificateQueries';

export const CertificateScreen: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();

  const id = certificateId ? Number(certificateId) : 0;
  const { data: cert, isLoading } = useCertificateDetail(id);

  const displayTitle = cert?.courseTitle || 'Khóa Học Đào Tạo MC & Dẫn Chương Trình Chuyên Nghiệp';
  const displayName = cert?.learnerName || 'Học Viên MSEEK';
  const displayInstructor = cert?.instructorName || 'Giảng Viên Chuyên Nghiệp MSEEK Academy';
  const displayCode = cert?.certificateCode || `CERT-2026-${id ? String(id).padStart(6, '0') : '888888'}`;
  const displayDate = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Đang tạo bản xem chứng chỉ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      {/* Top Navbar (Hidden on Print) */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 print:hidden z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Chứng Chỉ Hoàn Thành Khóa Học</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            In / Tải PDF
          </button>
        </div>
      </header>

      {/* Certificate Sheet Display Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        {/* Modern Printable Certificate Box */}
        <div className="relative w-full max-w-4xl aspect-[1.414/1] rounded-3xl border-8 border-double border-amber-500/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 md:p-12 shadow-2xl shadow-amber-500/10 text-center flex flex-col justify-between overflow-hidden print:border-amber-600 print:bg-white print:text-black print:shadow-none print:aspect-auto">
          {/* Subtle Background Watermark Badge */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Award className="h-[450px] w-[450px] text-amber-400" />
          </div>

          {/* Top Certificate Header */}
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 text-xs font-extrabold text-amber-400 uppercase tracking-widest print:border-amber-600 print:text-amber-800">
              <ShieldCheck className="h-4 w-4" />
              <span>MSEEK ACADEMY • OFFICIAL CERTIFICATE OF COMPLETION</span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wider uppercase pt-2">
              Chứng chỉ chứng nhận hoàn thành khóa học đào tạo
            </p>
          </div>

          {/* Center Main Content */}
          <div className="relative z-10 my-auto py-6 space-y-5">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Trao tặng cho học viên</p>
              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 tracking-tight mt-1 py-1 print:text-amber-700 print:bg-none">
                {displayName}
              </h2>
            </div>

            <div className="max-w-2xl mx-auto space-y-1">
              <p className="text-xs md:text-sm text-slate-300 print:text-slate-700">
                Đã đạt yêu cầu kiểm tra bài học và hoàn thành thành công 100% chương trình đào tạo:
              </p>
              <h3 className="text-xl md:text-2xl font-extrabold text-indigo-300 print:text-indigo-900">
                {displayTitle}
              </h3>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400 print:text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              <span>Xếp loại: Xuất sắc</span>
            </div>
          </div>

          {/* Bottom Footer Signatures & Verification Code */}
          <div className="relative z-10 border-t border-amber-500/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-6 print:border-amber-600">
            {/* Instructor Signature */}
            <div className="text-center md:text-left">
              <p className="text-[10px] uppercase text-slate-500 tracking-wider">Giảng viên hướng dẫn</p>
              <p className="text-sm font-bold text-amber-300 print:text-slate-900 mt-1">{displayInstructor}</p>
              <div className="h-0.5 w-32 bg-amber-500/40 my-1 mx-auto md:mx-0" />
              <p className="text-[10px] text-slate-400">MSEEK Senior Instructor</p>
            </div>

            {/* Middle Seal Badge */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 border-2 border-amber-200 font-extrabold text-[10px] uppercase tracking-tighter">
              SEAL 2026
            </div>

            {/* Verification & Code */}
            <div className="text-center md:text-right space-y-0.5">
              <p className="text-[10px] uppercase text-slate-500 tracking-wider">Mã chứng chỉ hợp lệ</p>
              <p className="font-mono text-sm font-bold text-amber-400 tracking-wider print:text-amber-800">{displayCode}</p>
              <p className="text-[10px] text-slate-400">Ngày cấp: {displayDate}</p>
              <p className="text-[9px] text-slate-500 underline cursor-pointer hover:text-amber-400" onClick={() => navigate(`/verify-certificate?code=${displayCode}`)}>
                Xác thực tại: mseek.edu.vn/verify
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
