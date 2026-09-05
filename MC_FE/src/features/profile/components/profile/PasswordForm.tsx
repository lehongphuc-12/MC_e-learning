import { Check, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { useChangePasswordMutation } from '../../hooks/useProfileQueries';

interface PasswordFormProps {
  isGoogleLogin?: boolean;
  onSaveSuccess: (message: string) => void;
  onSaveError: (message: string) => void;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({ isGoogleLogin, onSaveSuccess, onSaveError }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePasswordMutation = useChangePasswordMutation();

  const getPasswordScore = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword)) score += 25;
    if (/[0-9]/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  };

  const score = getPasswordScore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isGoogleLogin && !oldPassword) {
      onSaveError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (newPassword.length < 6) {
      onSaveError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      onSaveError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    changePasswordMutation.mutate(
      {
        oldPassword: isGoogleLogin ? null : oldPassword,
        newPassword,
        confirmPassword,
      },
      {
        onSuccess: (res) => {
          if (res.success) {
            onSaveSuccess('Đã đổi mật khẩu thành công!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
          } else {
            const msg = res.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.';
            onSaveError(msg);
          }
        },
        onError: (err: any) => {
          const msg = err.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.';
          onSaveError(msg);
        },
      }
    );
  };

  const isLoading = changePasswordMutation.isPending;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Đổi mật khẩu & Bảo mật
          </h2>
          <p className="text-xs text-slate-500 mt-1">Cập nhật mật khẩu để bảo vệ tài khoản MSEEK của bạn.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          SSL Encrypted
        </span>
      </div>

      {isGoogleLogin && (
        <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl text-xs space-y-1">
          <p className="font-bold">Tài khoản Google Login</p>
          <p>Tài khoản này được tạo qua Google. Bạn không cần nhập mật khẩu cũ để tạo mật khẩu mới.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
        {!isGoogleLogin && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập ít nhất 6 ký tự"
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {newPassword && (
            <div className="pt-2 space-y-1.5">
              <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    score <= 25 ? 'bg-rose-500' : score <= 50 ? 'bg-amber-500' : score <= 75 ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Độ mạnh mật khẩu</span>
                <span className="font-bold text-slate-700">
                  {score <= 25 ? 'Yếu' : score <= 50 ? 'Trung bình' : score <= 75 ? 'Khá' : 'Cực mạnh'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Cập nhật mật khẩu</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
