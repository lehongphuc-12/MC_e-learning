import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mic2, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { ScreenType } from '../../../types';
import { ToastType } from '../../../components/common/Toast';
import { useResetPasswordMutation } from '../hooks/useAuthQueries';

interface ResetPasswordScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onNavigate,
  onToast,
}) => {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token') || '';
  const emailFromUrl = urlParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPasswordMutation = useResetPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenFromUrl || !emailFromUrl) {
      const msg = 'Invalid or missing reset token and email from URL link.';
      setError(msg);
      onToast?.('Invalid Link', msg, 'error');
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setError(msg);
      onToast?.('Validation Error', msg, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg);
      onToast?.('Validation Error', msg, 'error');
      return;
    }

    setError(null);

    resetPasswordMutation.mutate(
      { token: tokenFromUrl, email: emailFromUrl, newPassword },
      {
        onSuccess: (result) => {
          if (result.success) {
            setIsSuccess(true);
            onToast?.('Password Reset Successful', 'You can now sign in with your new password.', 'success');
          } else {
            const msg = result.message || 'Failed to reset password. Link may be expired or already used.';
            setError(msg);
            onToast?.('Reset Failed', msg, 'error');
          }
        },
        onError: (err: any) => {
          const msg = err.message || 'An error occurred while resetting password.';
          setError(msg);
          onToast?.('Connection Error', msg, 'error');
        },
      }
    );
  };

  const isLoading = resetPasswordMutation.isPending;

  return (
    <div id="reset-password-screen" className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50 text-slate-900 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80">
        
        {/* Left Visual Banner Column */}
        <div className="lg:col-span-6 relative bg-slate-950 p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-white min-h-[380px] lg:min-h-[620px]">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80"
            alt="Security & Password"
            className="absolute inset-0 w-full h-full object-cover opacity-40 filter brightness-95 saturate-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-blue-950/40" />

          {/* Header Bar */}
          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 group focus:outline-none text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 transition-all duration-300 transform group-hover:scale-105">
                <Mic2 className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">MSEEK</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-slate-100 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>

          {/* Center Content */}
          <div className="relative z-10 space-y-4 my-auto py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Set New Password</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Create a strong & secure new password
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Ensure your account is protected with a unique password containing letters, numbers, and symbols.
            </p>
          </div>

          {/* Bottom Glass Pill */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs text-slate-200 shadow-inner">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">Single-Use Token Validation</span>
            </div>
            <span className="text-blue-300 font-bold bg-blue-600/30 px-2.5 py-1 rounded-lg border border-blue-400/30">Secure</span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white text-slate-900">
          {!isSuccess ? (
            <>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reset Password</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Enter your new password below for <span className="font-bold text-slate-700">{emailFromUrl || 'your account'}</span>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* New Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6 py-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset Complete!</h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Your password has been successfully updated. You can now log into your MSEEK account using your new password.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
