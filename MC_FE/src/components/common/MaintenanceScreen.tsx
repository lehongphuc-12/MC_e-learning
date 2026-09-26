import React from 'react';
import { ShieldAlert, LogIn, RefreshCw, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaintenanceScreenProps {
  onLoginClick?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onLoginClick }) => {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Background Decorative Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-8 relative z-10 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <div className="mx-auto w-20 h-20 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full">
            Hệ thống đang bảo trì (Maintenance Mode)
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            MSEEK Academy Đang Nâng Cấp
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Hệ thống hiện đang tạm thời dừng hoạt động để tiến hành bảo trì và nâng cấp hạ tầng. Các trang dịch vụ học viên tạm thời được khóa để bảo vệ dữ liệu.
          </p>
        </div>

        {/* Notice Info Box */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400 flex items-center justify-center space-x-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Vui lòng quay lại sau. Nếu bạn là Quản trị viên, hãy đăng nhập để điều phối.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại (Tải lại trang)</span>
          </button>

          <button
            onClick={handleAdminLogin}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/25 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập Admin</span>
          </button>
        </div>
      </div>

      <footer className="mt-8 text-xs text-slate-600 text-center relative z-10">
        &copy; {new Date().getFullYear()} MSEEK Platform. All rights reserved.
      </footer>
    </div>
  );
};
