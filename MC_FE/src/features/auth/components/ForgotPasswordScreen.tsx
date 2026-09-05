import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, Mic2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { ScreenType } from '../../../types';
import { ToastType } from '../../../components/common/Toast';
import { useForgotPasswordMutation } from '../hooks/useAuthQueries';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigate,
  onToast,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgotPasswordMutation = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);

    forgotPasswordMutation.mutate(email, {
      onSuccess: (result) => {
        if (result.success) {
          setIsSubmitted(true);
          onToast?.('Email Sent', 'Instructions to reset your password have been sent.', 'success');
        } else {
          const msg = result.message || 'Failed to request password reset.';
          setError(msg);
          onToast?.('Error', msg, 'error');
        }
      },
      onError: (err: any) => {
        const msg = err.message || 'An error occurred while requesting password reset.';
        setError(msg);
        onToast?.('Connection Error', msg, 'error');
      },
    });
  };

  const isLoading = forgotPasswordMutation.isPending;

  return (
    <div id="forgot-password-screen" className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50 text-slate-900 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80">
        
        {/* Left Visual Banner Column */}
        <div className="lg:col-span-6 relative bg-slate-950 p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-white min-h-[380px] lg:min-h-[620px]">
          <img
            src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80"
            alt="Speaker on Stage"
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

          {/* Center Motivational Content */}
          <div className="relative z-10 space-y-4 my-auto py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Account Recovery</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              "Don't worry, we've got you covered."
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Enter your registered email address and we'll send you detailed instructions to securely reset your password.
            </p>
          </div>

          {/* Bottom Glass Pill Stats */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs text-slate-200 shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-semibold text-white">Secure 256-bit Encryption</span>
            </div>
            <span className="text-blue-300 font-bold bg-blue-600/30 px-2.5 py-1 rounded-lg border border-blue-400/30">24/7 Support</span>
          </div>
        </div>

        {/* Right Authentication Form Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white text-slate-900">
          {!isSubmitted ? (
            <>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Forgot Password?</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  No problem. Enter your account email below and we will send you a password reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                      <span>Send Reset Link</span>
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
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check Your Email</h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  We've sent a password reset link to <span className="font-bold text-slate-800">{email}</span>. Please check your inbox and follow the instructions.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Return to Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Didn't receive email? Try another address
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
