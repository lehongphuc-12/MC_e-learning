import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, Award, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useVerifyCertificate } from '../hooks/useCertificateQueries';

export const CertificateVerifyScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code') || '';
  const [inputCode, setInputCode] = useState(initialCode);
  const [searchedCode, setSearchedCode] = useState(initialCode);

  const { data: verification, isLoading } = useVerifyCertificate(searchedCode);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setSearchedCode(inputCode.trim());
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Navigation */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </button>

        {/* Verification Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Xác Thực Chứng Chỉ MSEEK</h2>
              <p className="text-xs text-slate-400">Tra cứu tính hợp lệ của mã chứng chỉ được cấp bởi hệ thống</p>
            </div>
          </div>

          {/* Search Input Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Nhập mã chứng chỉ (VD: CERT-2026-XXXXXX)..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Search className="h-4 w-4" />
              <span>Tra cứu</span>
            </button>
          </form>

          {/* Result Section */}
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : searchedCode ? (
            verification?.isValid ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3 text-emerald-400 font-bold text-base">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span>Chứng Chỉ Hợp Lệ & Chính Thức!</span>
                </div>

                <div className="space-y-2 border-t border-emerald-500/20 pt-4 text-xs">
                  <div className="flex justify-between py-1 border-b border-emerald-500/10">
                    <span className="text-slate-400">Tên học viên:</span>
                    <span className="font-bold text-white">{verification.learnerName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-500/10">
                    <span className="text-slate-400">Khóa học:</span>
                    <span className="font-bold text-indigo-300">{verification.courseTitle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-500/10">
                    <span className="text-slate-400">Mã chứng chỉ:</span>
                    <span className="font-mono font-bold text-amber-400">{verification.certificateCode}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Ngày cấp:</span>
                    <span className="text-slate-200">
                      {new Date(verification.issuedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 flex items-start gap-3 text-rose-400 animate-fadeIn">
                <XCircle className="h-6 w-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Mã chứng chỉ không tồn tại hoặc không hợp lệ</h4>
                  <p className="text-xs text-rose-300/80 mt-1">
                    Vui lòng kiểm tra lại chính xác các ký tự trên chứng chỉ (VD: CERT-2026-...) và thử lại.
                  </p>
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
