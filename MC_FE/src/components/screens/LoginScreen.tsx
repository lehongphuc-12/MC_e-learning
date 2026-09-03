import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Mic2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { ScreenType } from '../../types';

import { ToastType } from '../common/Toast';

interface LoginScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess: (userObj: any, token: string) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigate,
  onLoginSuccess,
  onToast,
}) => {
  const [email, setEmail] = useState('alex.rivera@mseek.edu');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        onLoginSuccess(result.data.user, result.data.token);
      } else {
        const msg = result.message || 'Login failed. Please check your credentials.';
        setError(msg);
        onToast?.('Login Failed', msg, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Cannot connect to the server. Please check if backend is running.';
      setError(msg);
      onToast?.('Connection Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-screen" className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50 text-slate-900 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80">
        
        {/* Left Visual Banner Column */}
        <div className="lg:col-span-6 relative bg-slate-950 p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-white min-h-[380px] lg:min-h-[620px]">
          {/* Background Image with Dark Overlay Mask */}
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
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-slate-100 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Center Motivational Content */}
          <div className="relative z-10 space-y-4 my-auto py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Global Masterclass Community</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              "Confidence is the key to every stage you step upon."
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Access your personalized speaker dashboard, masterclass run-sheets, and expert mentor feedback.
            </p>
          </div>

          {/* Bottom Glass Pill Stats */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs text-slate-200 shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-semibold text-white">50,000+ Active Speakers</span>
            </div>
            <span className="text-blue-300 font-bold bg-blue-600/30 px-2.5 py-1 rounded-lg border border-blue-400/30">120+ Masterclasses</span>
          </div>
        </div>

        {/* Right Authentication Form Column - White Light Theme */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-6 bg-white text-slate-900">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs sm:text-sm text-slate-500">Enter your credentials to continue your masterclass training.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Password reset link sent to ' + email); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-[11px] text-slate-400 uppercase font-bold tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "50611504022-71qcadap5m0g6gi669p3nqr5nqliu8o1.apps.googleusercontent.com";
              
              const handleCredentialResponse = async (response: any) => {
                try {
                  const idToken = response.credential;
                  const res = await authService.googleLogin(idToken);
                  if (res.success) {
                    onToast?.('Login Success', 'Logged in with Google successfully!', 'success');
                    onLoginSuccess(res.data.user, res.data.token);
                  } else {
                    const msg = res.message || 'Google Login failed.';
                    setError(msg);
                    onToast?.('Google Login Failed', msg, 'error');
                  }
                } catch (err: any) {
                  const msg = err.message || 'Cannot connect to backend server.';
                  setError(msg);
                  onToast?.('Connection Error', msg, 'error');
                } finally {
                  setIsLoading(false);
                }
              };

              // Load Google Identity Services script dynamically if not available
              const initGoogle = () => {
                if ((window as any).google?.accounts?.id) {
                  (window as any).google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: handleCredentialResponse
                  });
                  (window as any).google.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                      // Fallback to one-tap button or prompt
                    }
                  });
                }
              };

              if (!(window as any).google?.accounts?.id) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => initGoogle();
                document.body.appendChild(script);
              } else {
                initGoogle();
              }
            }}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Switch to Register */}
          <div className="text-center text-xs text-slate-500 pt-1">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


