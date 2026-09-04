import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordFormProps {
  onSaveSuccess: (msg: string) => void;
  onSaveError: (msg: string) => void;
  isGoogleLogin?: boolean;
}

export const PasswordForm: React.FC<PasswordFormProps> = ({ 
  onSaveSuccess, 
  onSaveError,
  isGoogleLogin = false
}) => {
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getPasswordStrength = () => {
    const p = passwordForm.new;
    if (!p) return { score: 0, text: 'No Password', color: 'bg-slate-200' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 2) return { score, text: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, text: 'Medium', color: 'bg-amber-500' };
    return { score, text: 'Strong', color: 'bg-emerald-500' };
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGoogleLogin && !passwordForm.current) {
      onSaveError('Current password is required.');
      return;
    }
    if (!passwordForm.new || !passwordForm.confirm) {
      onSaveError('New password and confirm password are required.');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      onSaveError('Confirm password does not match new password.');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaveSuccess(isGoogleLogin ? 'Password set successfully!' : 'Password updated successfully!');
      setPasswordForm({ current: '', new: '', confirm: '' });
    }, 1200);
  };

  const strength = getPasswordStrength();

  return (
    <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Security Credentials</h3>
        <p className="text-xs text-slate-500 mt-1">Keep your account secure by modifying passwords regularly.</p>
      </div>

      <div className="space-y-4">
        {/* Google Login Notice */}
        {isGoogleLogin ? (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>You logged in via Google. You can create a direct password for your account without entering an old password.</span>
          </div>
        ) : (
          /* Current Password */
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-4" />
          </>
        )}

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {passwordForm.new && (
            <div className="space-y-1.5 mt-2 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Password Strength:</span>
                <span className={`${strength.score <= 2 ? 'text-rose-500' : strength.score <= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {strength.text}
                </span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                <div className={`h-full ${strength.color}`} style={{ width: `${Math.min(strength.score * 20, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Update Password
            </>
          )}
        </button>
      </div>
    </form>
  );
};
