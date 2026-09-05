import { ArrowLeft, ArrowRight, Award, Lock, Mail, Mic2, Sparkles, TrendingUp, User, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { ScreenType } from '../../../types';
import { ToastType } from '../../../components/common/Toast';
import { useRegisterMutation, useGoogleLoginMutation } from '../hooks/useAuthQueries';

interface RegisterScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onRegisterSuccess: (userObj: any) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigate,
  onRegisterSuccess,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useRegisterMutation();
  const googleLoginMutation = useGoogleLoginMutation();

  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 35;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    return score;
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match. Please re-enter.';
      setError(msg);
      onToast?.('Validation Error', msg, 'warning');
      return;
    }
    setError(null);

    registerMutation.mutate(
      { fullName: name, email, password },
      {
        onSuccess: (result) => {
          if (result.success) {
            onRegisterSuccess(result.data);
          } else {
            const msg = (result.errors && result.errors.length > 0) ? result.errors.join(', ') : (result.message || 'Registration failed.');
            setError(msg);
            onToast?.('Registration Failed', msg, 'error');
          }
        },
        onError: (err: any) => {
          const msg = (err.errors && err.errors.length > 0) ? err.errors.join(', ') : (err.message || 'Cannot connect to the server. Please check if backend is running.');
          setError(msg);
          onToast?.('Connection Error', msg, 'error');
        },
      }
    );
  };

  const isLoading = registerMutation.isPending || googleLoginMutation.isPending;

  return (
    <div id="register-screen" className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50 text-slate-900 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/80">
        
        {/* Left Visual Column */}
        <div className="lg:col-span-6 relative bg-slate-950 p-8 sm:p-10 flex flex-col justify-between overflow-hidden text-white min-h-[380px] lg:min-h-[660px]">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
            alt="Modern Collaborative Masterclass"
            className="absolute inset-0 w-full h-full object-cover opacity-40 filter brightness-95 saturate-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-blue-950/40" />

          {/* Top Header Bar */}
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

          {/* Center Content */}
          <div className="relative z-10 space-y-4 my-auto py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Shape Your Future with Precision</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Begin Your Journey to Stage Mastery
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Join over 50,000 ambitious speakers, event hosts, and executives mastering high-impact communication.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Skill Acceleration</span>
                </div>
                <p className="text-[11px] text-slate-300">Fast-track stage presence with structured drills</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                  <Award className="w-4 h-4" />
                  <span>Verified Credentials</span>
                </div>
                <p className="text-[11px] text-slate-300">Digital diplomas recognised across industries</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-white/15">
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> Instant Access</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> 30-Day Guarantee</span>
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">✓</span> Lifetime Updates</span>
          </div>
        </div>

        {/* Right Registration Form Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-5 bg-white text-slate-900">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Create an Account</h2>
            <p className="text-xs sm:text-sm text-slate-500">Sign up in 30 seconds to start learning from elite mentors.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivera@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength < 40 ? 'bg-rose-500' : strength < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Password strength</span>
                    <span className="font-semibold text-slate-700">{strength < 40 ? 'Weak' : strength < 80 ? 'Good' : 'Strong'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>I agree to the <a href="#terms" className="text-blue-600 underline hover:text-blue-700 font-medium">Terms of Service</a> & <a href="#privacy" className="text-blue-600 underline hover:text-blue-700 font-medium">Privacy Policy</a></span>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center text-xs text-slate-500 pt-2">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
