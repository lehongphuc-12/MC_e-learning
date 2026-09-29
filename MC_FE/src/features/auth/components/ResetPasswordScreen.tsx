import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
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
  // ============================================================
  // GIỮ NGUYÊN LOGIC RESET PASSWORD
  // ============================================================

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

  // ============================================================
  // GIỮ NGUYÊN HANDLE SUBMIT
  // ============================================================

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
      {
        token: tokenFromUrl,
        email: emailFromUrl,
        newPassword,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setIsSuccess(true);

            onToast?.(
              'Password Reset Successful',
              'You can now sign in with your new password.',
              'success',
            );
          } else {
            const msg =
              result.message ||
              'Failed to reset password. Link may be expired or already used.';

            setError(msg);
            onToast?.('Reset Failed', msg, 'error');
          }
        },

        onError: (err: any) => {
          const msg =
            err.message || 'An error occurred while resetting password.';

          setError(msg);
          onToast?.('Connection Error', msg, 'error');
        },
      },
    );
  };

  const isLoading = resetPasswordMutation.isPending;

  // ============================================================
  // PASSWORD UI ONLY
  // ============================================================

  const hasMinLength = newPassword.length >= 6;
  const hasUpperLower =
    /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const passwordScore =
    Number(hasMinLength) +
    Number(hasUpperLower) +
    Number(hasNumber) +
    Number(hasSpecial);

  const strengthText =
    passwordScore <= 1
      ? 'Yếu'
      : passwordScore === 2
        ? 'Trung bình'
        : passwordScore === 3
          ? 'Tốt'
          : 'Mạnh';

  const strengthTextClass =
    passwordScore <= 1
      ? 'text-rose-300'
      : passwordScore === 2
        ? 'text-[#ffc928]'
        : 'text-emerald-300';

  return (
    <div
      id="reset-password-screen"
      className="reset-page relative h-[100dvh] min-h-[650px] w-full overflow-hidden bg-[#020d24] text-white"
    >
      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/images/backgroundForgotPassword.png"
          alt=""
          aria-hidden="true"
          className="reset-background absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Overlay rất nhẹ để thấy rõ background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#01091d]/20 via-transparent to-[#020c21]/22" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010817]/25 via-transparent to-transparent" />

        {/* Vignette nhẹ */}
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,7,28,0.30)]" />
      </div>

      {/* ========================================================
          AMBIENT GLOW
      ======================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="reset-glow-blue absolute -left-[220px] top-[15%] h-[450px] w-[450px] rounded-full bg-blue-500/[0.06] blur-[140px]" />

        <div className="reset-glow-cyan absolute right-[18%] top-[-220px] h-[420px] w-[420px] rounded-full bg-cyan-300/[0.045] blur-[140px]" />

        <div className="reset-glow-gold absolute bottom-[-220px] left-[20%] h-[420px] w-[420px] rounded-full bg-[#ffc928]/[0.07] blur-[140px]" />

        <span className="reset-particle reset-particle-1 absolute left-[13%] top-[18%] h-2 w-2 rounded-full bg-[#ffc928]" />
        <span className="reset-particle reset-particle-2 absolute left-[45%] top-[12%] h-1.5 w-1.5 rounded-full bg-cyan-300" />
        <span className="reset-particle reset-particle-3 absolute bottom-[17%] left-[37%] h-2 w-2 rounded-full bg-blue-400" />
        <span className="reset-particle reset-particle-4 absolute right-[8%] top-[31%] h-2.5 w-2.5 rounded-full bg-[#ffc928]" />
      </div>

      {/* ========================================================
          LIGHT TRAILS
      ======================================================== */}

      <div className="reset-gold-trail pointer-events-none absolute -bottom-[135px] left-[-8%] h-[230px] w-[120%] rotate-[-3deg] rounded-[50%] border-t-2 border-[#ffc928]/30 shadow-[0_-4px_30px_rgba(255,201,40,0.15)]" />

      <div className="reset-blue-trail pointer-events-none absolute -bottom-[165px] left-[18%] h-[230px] w-[105%] rotate-[-5deg] rounded-[50%] border-t-2 border-blue-400/25 shadow-[0_-4px_30px_rgba(59,130,246,0.16)]" />

      {/* ========================================================
          LOGO
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="reset-logo absolute left-[4%] top-[3%] z-40 overflow-hidden rounded-[20px] border border-white/10 bg-[#04162f]/45 shadow-[0_15px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03]"
      >
        <img
          src="/images/logo/mseekk-logo.png"
          alt="MSEEK"
          className="h-[70px] w-[90px] object-cover"
        />
      </button>

      {/* ========================================================
          BACK HOME
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="back-home-button absolute right-[4%] top-[3%] z-40 flex items-center gap-2.5 rounded-[14px] border border-cyan-300/25 bg-[#052657]/50 px-4 py-2.5 text-[12px] font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-lg transition-all duration-300 hover:-translate-x-1 hover:border-cyan-300/50 hover:bg-[#0a3775]/65"
      >
        <ArrowLeft className="h-[18px] w-[18px] text-cyan-300" />
        <span>Về trang chủ</span>
      </button>

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="relative z-20 mx-auto grid h-full w-full max-w-[1500px] grid-cols-1 items-center px-[5%] pt-[3.5%] lg:grid-cols-[1.18fr_0.82fr] lg:gap-[5%]">
        {/* ======================================================
            LEFT CONTENT
        ====================================================== */}

        <section className="reset-left hidden max-w-[700px] lg:block">
          {/* Badge */}

          <div className="reset-item reset-delay-1 inline-flex items-center gap-2.5 rounded-full border border-cyan-300/45 bg-[#12365f]/45 px-4 py-2.5 shadow-[0_8px_30px_rgba(34,211,238,0.06)] backdrop-blur-sm">
            <ShieldCheck className="h-[18px] w-[18px] text-cyan-300" />

            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
              Bảo mật tài khoản
            </span>
          </div>

          {/* Heading */}

          <h1 className="reset-item reset-delay-2 mt-5 max-w-[660px] text-[43px] font-black leading-[1] tracking-[-0.045em] text-white xl:text-[50px]">
            Bảo vệ giọng nói

            <span className="relative mt-1.5 block w-fit text-[#ffc928]">
              Bảo vệ hành trình

              <span className="absolute -bottom-2 left-0 h-[3px] w-[66%] rounded-full bg-gradient-to-r from-[#ffc928] to-transparent" />
            </span>
          </h1>

          {/* Description */}

          <p className="reset-item reset-delay-3 mt-6 max-w-[620px] text-[13px] font-semibold leading-[1.75] text-white/80 xl:text-[14px]">
            Tài khoản của bạn luôn được bảo vệ. Hãy đặt lại mật khẩu để tiếp
            tục hành trình phát triển giọng nói cùng MSEEK.
          </p>

          {/* ====================================================
              FEATURE CARDS
          ==================================================== */}

          <div className="reset-item reset-delay-4 mt-6 grid max-w-[640px] grid-cols-3 gap-3">
            <div className="reset-feature-card group flex min-h-[82px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/50 px-3 py-3 backdrop-blur-md">
              <div className="reset-feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.28)]">
                <Lock className="h-5 w-5" />
              </div>

              <span className="text-[11px] font-black leading-[1.4]">
                Bảo mật
                <br />
                thông tin
              </span>
            </div>

            <div className="reset-feature-card group flex min-h-[82px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/50 px-3 py-3 backdrop-blur-md">
              <div className="reset-feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.28)]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <span className="text-[11px] font-black leading-[1.4]">
                An toàn
                <br />
                tài khoản
              </span>
            </div>

            <div className="reset-feature-card group flex min-h-[82px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/50 px-3 py-3 backdrop-blur-md">
              <div className="reset-feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.28)]">
                <Users className="h-5 w-5" />
              </div>

              <span className="text-[11px] font-black leading-[1.4]">
                Tiếp tục
                <br />
                hành trình
              </span>
            </div>
          </div>

          {/* ====================================================
              QUOTE
          ==================================================== */}

          <div className="reset-item reset-delay-5 mt-5 flex max-w-[640px] items-center gap-4 rounded-[17px] border border-blue-300/15 bg-[#08234e]/50 px-5 py-4 shadow-[0_14px_35px_rgba(0,0,0,0.16)] backdrop-blur-md">
            <div className="text-[38px] font-black leading-none text-cyan-300">
              ”
            </div>

            <div>
              <p className="text-[12px] font-medium italic leading-6 text-white/85">
                “Một giọng nói mạnh mẽ bắt đầu từ sự an toàn và tin tưởng của
                chính bạn.”
              </p>

              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                MSEEK
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================
            RESET PANEL
        ====================================================== */}

        <section className="reset-panel relative ml-auto w-full max-w-[530px] overflow-hidden rounded-[28px] border border-cyan-200/25 bg-[#062654]/48 shadow-[0_25px_80px_rgba(0,0,0,0.30),0_0_35px_rgba(59,130,246,0.07)] backdrop-blur-[10px]">
          {/* Border glow */}

          <div className="reset-panel-shine pointer-events-none absolute inset-[-2px] rounded-[30px]" />

          {/* Inner gradient */}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-300/[0.035] via-transparent to-[#ffc928]/[0.025]" />

          {/* Decorative orbit */}

          <div className="pointer-events-none absolute -right-[85px] top-[90px] h-[220px] w-[220px] rounded-full border border-[#ffc928]/15" />

          <div className="reset-orbit pointer-events-none absolute -right-[25px] top-[135px] h-[185px] w-[185px] rounded-full border border-cyan-300/10" />

          <span className="reset-orbit-dot pointer-events-none absolute right-[22px] top-[185px] h-2.5 w-2.5 rounded-full bg-[#ffc928] shadow-[0_0_18px_rgba(255,201,40,0.75)]" />

          <div className="relative z-10 px-7 py-6 xl:px-8 xl:py-7">
            {!isSuccess ? (
              <>
                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="form-reveal form-delay-1">
                  <div className="flex items-center gap-3">
                    <span className="h-[3px] w-9 rounded-full bg-[#ffc928]" />

                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                      Khôi phục tài khoản
                    </span>
                  </div>

                  <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.04em] text-white xl:text-[35px]">
                    Đặt lại mật khẩu
                  </h2>

                  <p className="mt-3 max-w-[410px] text-[11px] font-medium leading-5 text-blue-100/70">
                    Tạo mật khẩu mới để tiếp tục sử dụng tài khoản và đồng hành
                    cùng MSEEK.
                  </p>
                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                  <div className="error-message mt-3.5 flex items-start gap-2.5 rounded-[12px] border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-[10px] font-bold text-rose-200 backdrop-blur-lg">
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ==================================================
                    FORM
                ================================================== */}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {/* NEW PASSWORD */}

                  <div className="form-reveal form-delay-2">
                    <label className="mb-1.5 block text-[11px] font-black text-white">
                      Mật khẩu mới
                    </label>

                    <div className="reset-input-wrapper relative">
                      <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white" />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới của bạn"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="reset-input h-[53px] w-full rounded-[14px] border border-blue-200/25 bg-[#021b3e]/58 pl-[48px] pr-[48px] text-[12px] font-semibold text-white outline-none placeholder:text-blue-100/40 backdrop-blur-[5px]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 transition-all duration-300 hover:scale-110 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>

                    {/* PASSWORD STRENGTH */}

                    {newPassword && (
                      <div className="mt-2 flex items-center gap-2">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className="h-[4px] flex-1 overflow-hidden rounded-full bg-white/10"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                passwordScore >= level
                                  ? passwordScore <= 1
                                    ? 'bg-rose-400'
                                    : passwordScore === 2
                                      ? 'bg-[#ffc928]'
                                      : 'bg-emerald-400'
                                  : 'bg-transparent'
                              }`}
                            />
                          </div>
                        ))}

                        <span
                          className={`ml-1 min-w-[52px] text-right text-[10px] font-black ${strengthTextClass}`}
                        >
                          {strengthText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div className="form-reveal form-delay-3">
                    <label className="mb-1.5 block text-[11px] font-black text-white">
                      Xác nhận mật khẩu
                    </label>

                    <div className="reset-input-wrapper relative">
                      <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white" />

                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="reset-input h-[53px] w-full rounded-[14px] border border-blue-200/25 bg-[#021b3e]/58 pl-[48px] pr-[48px] text-[12px] font-semibold text-white outline-none placeholder:text-blue-100/40 backdrop-blur-[5px]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 transition-all duration-300 hover:scale-110 hover:text-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>

                    {confirmPassword && (
                      <div
                        className={`mt-2 flex items-center gap-2 text-[9px] font-bold ${
                          newPassword === confirmPassword
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            newPassword === confirmPassword
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          }`}
                        />

                        {newPassword === confirmPassword
                          ? 'Mật khẩu xác nhận khớp'
                          : 'Mật khẩu xác nhận chưa khớp'}
                      </div>
                    )}
                  </div>

                  {/* ==================================================
                      SECURITY TIPS
                  ================================================== */}

                  <div className="form-reveal form-delay-4 rounded-[14px] border border-blue-200/15 bg-[#021b3e]/38 px-4 py-3 backdrop-blur-[6px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            hasMinLength
                              ? 'border-emerald-400 bg-emerald-400 text-[#032a20]'
                              : 'border-blue-300/25 bg-blue-400/5 text-blue-200/45'
                          }`}
                        >
                          {hasMinLength ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>

                        <span className="text-[10px] font-medium text-blue-100/75">
                          Ít nhất 6 ký tự
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            hasUpperLower || hasNumber
                              ? 'border-emerald-400 bg-emerald-400 text-[#032a20]'
                              : 'border-blue-300/25 bg-blue-400/5 text-blue-200/45'
                          }`}
                        >
                          {hasUpperLower || hasNumber ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>

                        <span className="text-[10px] font-medium text-blue-100/75">
                          Nên có chữ hoa, chữ thường và số
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            hasSpecial
                              ? 'border-emerald-400 bg-emerald-400 text-[#032a20]'
                              : 'border-blue-300/25 bg-blue-400/5 text-blue-200/45'
                          }`}
                        >
                          {hasSpecial ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>

                        <span className="text-[10px] font-medium text-blue-100/75">
                          Sử dụng ký tự đặc biệt để tăng bảo mật
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ==================================================
                      SUBMIT
                  ================================================== */}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="reset-submit group relative flex h-[53px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#ffc928] text-[#041a3c] shadow-[0_13px_35px_rgba(255,201,40,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64c] hover:shadow-[0_18px_45px_rgba(255,201,40,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="reset-button-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[32%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

                    {isLoading ? (
                      <div className="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-[#041a3c]/20 border-t-[#041a3c]" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-3">
                        <span className="text-[12px] font-black">
                          Đặt lại mật khẩu
                        </span>

                        
                      </span>
                    )}
                  </button>
                </form>

                {/* ==================================================
                    LOGIN
                ================================================== */}

                <div className="form-reveal form-delay-5 mt-4 border-t border-blue-100/10 pt-3.5 text-center">
                  <span className="text-[10px] font-semibold text-blue-100/60">
                    Đã nhớ mật khẩu?{' '}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="group inline-flex items-center gap-1.5 text-[10px] font-black text-[#ffc928] transition-colors hover:text-[#ffdc5d]"
                  >
                    Đăng nhập ngay

                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </>
            ) : (
              /* ====================================================
                  SUCCESS STATE
              ==================================================== */

              <div className="success-state flex min-h-[440px] flex-col items-center justify-center py-7 text-center">
                <div className="success-icon relative">
                  <div className="success-pulse absolute inset-0 rounded-full bg-emerald-400/20" />

                  <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-emerald-300 shadow-[0_0_45px_rgba(52,211,153,0.18)] backdrop-blur-xl">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                </div>

                <span className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Hoàn tất
                </span>

                <h2 className="mt-3 text-[28px] font-black tracking-[-0.035em] text-white">
                  Đặt lại mật khẩu
                  <br />
                  thành công!
                </h2>

                <p className="mt-4 max-w-[360px] text-[11px] font-medium leading-6 text-blue-100/65">
                  Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập vào
                  tài khoản MSEEK bằng mật khẩu mới.
                </p>

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="group relative mt-6 flex h-[52px] w-full max-w-[330px] items-center justify-center gap-3 overflow-hidden rounded-[14px] bg-[#ffc928] text-[12px] font-black text-[#041a3c] shadow-[0_15px_40px_rgba(255,201,40,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64c]"
                >
                  <span>Đăng nhập ngay</span>

                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#052558] text-white transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================
          ANIMATION CSS
      ======================================================== */}

      <style>{`
        /* =====================================================
           BACKGROUND
        ===================================================== */

        @keyframes resetBackgroundMove {
          0%, 100% {
            transform: scale(1.01);
          }

          50% {
            transform: scale(1.04);
          }
        }

        .reset-background {
          animation: resetBackgroundMove 18s ease-in-out infinite;
          will-change: transform;
        }

        /* =====================================================
           GLOWS
        ===================================================== */

        @keyframes resetGlowBlue {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: .45;
          }

          50% {
            transform: translate3d(70px, -35px, 0);
            opacity: .75;
          }
        }

        @keyframes resetGlowCyan {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-65px, 50px, 0);
          }
        }

        @keyframes resetGlowGold {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(55px, -40px, 0) scale(1.12);
          }
        }

        .reset-glow-blue {
          animation: resetGlowBlue 10s ease-in-out infinite;
        }

        .reset-glow-cyan {
          animation: resetGlowCyan 12s ease-in-out infinite;
        }

        .reset-glow-gold {
          animation: resetGlowGold 13s ease-in-out infinite;
        }

        /* =====================================================
           PARTICLES
        ===================================================== */

        @keyframes resetParticleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: .45;
          }

          50% {
            transform: translateY(-22px) scale(1.25);
            opacity: 1;
          }
        }

        .reset-particle {
          box-shadow: 0 0 18px currentColor;
          animation: resetParticleFloat 5s ease-in-out infinite;
        }

        .reset-particle-2 {
          animation-delay: .8s;
        }

        .reset-particle-3 {
          animation-delay: 1.6s;
        }

        .reset-particle-4 {
          animation-delay: 2.4s;
        }

        /* =====================================================
           LIGHT TRAILS
        ===================================================== */

        @keyframes resetGoldTrail {
          0%, 100% {
            opacity: .3;
            transform: translateX(-1%) rotate(-3deg);
          }

          50% {
            opacity: .65;
            transform: translateX(2%) rotate(-3deg);
          }
        }

        .reset-gold-trail {
          animation: resetGoldTrail 7s ease-in-out infinite;
        }

        @keyframes resetBlueTrail {
          0%, 100% {
            opacity: .25;
          }

          50% {
            opacity: .55;
          }
        }

        .reset-blue-trail {
          animation: resetBlueTrail 8s ease-in-out infinite;
        }

        /* =====================================================
           LOGO
        ===================================================== */

        @keyframes resetLogoReveal {
          from {
            opacity: 0;
            transform: translateY(-18px) scale(.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .reset-logo {
          animation: resetLogoReveal .8s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           BACK HOME
        ===================================================== */

        @keyframes resetBackReveal {
          from {
            opacity: 0;
            transform: translateX(20px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .back-home-button {
          animation: resetBackReveal .8s .15s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           LEFT CONTENT
        ===================================================== */

        @keyframes resetContentReveal {
          from {
            opacity: 0;
            transform: translateY(25px);
            filter: blur(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        .reset-item {
          opacity: 0;
          animation: resetContentReveal .8s cubic-bezier(.16,1,.3,1) forwards;
        }

        .reset-delay-1 {
          animation-delay: .15s;
        }

        .reset-delay-2 {
          animation-delay: .25s;
        }

        .reset-delay-3 {
          animation-delay: .35s;
        }

        .reset-delay-4 {
          animation-delay: .45s;
        }

        .reset-delay-5 {
          animation-delay: .55s;
        }

        /* =====================================================
           FEATURE CARDS
        ===================================================== */

        .reset-feature-card {
          transition:
            transform .35s cubic-bezier(.16,1,.3,1),
            border-color .35s ease,
            background .35s ease,
            box-shadow .35s ease;
        }

        .reset-feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(103,232,249,.30);
          background: rgba(14,55,112,.65);
          box-shadow:
            0 15px 35px rgba(0,0,0,.18),
            0 0 22px rgba(59,130,246,.10);
        }

        .reset-feature-icon {
          transition: transform .35s cubic-bezier(.16,1,.3,1);
        }

        .reset-feature-card:hover .reset-feature-icon {
          transform: scale(1.07) rotate(-4deg);
        }

        /* =====================================================
           PANEL
        ===================================================== */

        @keyframes resetPanelReveal {
          from {
            opacity: 0;
            transform: translateX(45px) scale(.97);
            filter: blur(8px);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
            filter: blur(0);
          }
        }

        .reset-panel {
          animation: resetPanelReveal .9s .15s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           PANEL BORDER
        ===================================================== */

        @keyframes resetPanelGlow {
          0%, 100% {
            opacity: .25;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.10),
              0 0 18px rgba(59,130,246,.05);
          }

          50% {
            opacity: .6;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.22),
              0 0 30px rgba(59,130,246,.12);
          }
        }

        .reset-panel-shine {
          animation: resetPanelGlow 4s ease-in-out infinite;
        }

        /* =====================================================
           ORBIT
        ===================================================== */

        @keyframes resetOrbitRotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .reset-orbit {
          animation: resetOrbitRotate 22s linear infinite;
        }

        @keyframes resetOrbitDot {
          0%, 100% {
            transform: translateY(0);
            opacity: .7;
          }

          50% {
            transform: translateY(40px);
            opacity: 1;
          }
        }

        .reset-orbit-dot {
          animation: resetOrbitDot 5s ease-in-out infinite;
        }

        /* =====================================================
           FORM
        ===================================================== */

        @keyframes resetFormReveal {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-reveal {
          opacity: 0;
          animation: resetFormReveal .65s cubic-bezier(.16,1,.3,1) forwards;
        }

        .form-delay-1 {
          animation-delay: .30s;
        }

        .form-delay-2 {
          animation-delay: .40s;
        }

        .form-delay-3 {
          animation-delay: .50s;
        }

        .form-delay-4 {
          animation-delay: .60s;
        }

        .form-delay-5 {
          animation-delay: .70s;
        }

        /* =====================================================
           INPUT
        ===================================================== */

        .reset-input {
          transition:
            border-color .25s ease,
            background .25s ease,
            box-shadow .25s ease,
            transform .25s ease;
        }

        .reset-input:hover {
          border-color: rgba(147,197,253,.4);
          background: rgba(3,32,72,.68);
        }

        .reset-input:focus {
          border-color: rgba(103,232,249,.72);
          background: rgba(3,32,72,.76);
          box-shadow:
            0 0 0 3px rgba(34,211,238,.07),
            0 10px 30px rgba(0,0,0,.12),
            0 0 22px rgba(34,211,238,.07);
          transform: translateY(-1px);
        }

        .reset-input-wrapper:focus-within > svg {
          color: #ffffff;
          filter: drop-shadow(0 0 6px rgba(255,255,255,.25));
        }

        /* =====================================================
           BUTTON SHINE
        ===================================================== */

        @keyframes resetButtonShine {
          0% {
            left: -70%;
          }

          45%, 100% {
            left: 145%;
          }
        }

        .reset-button-shine {
          animation: resetButtonShine 4.5s ease-in-out infinite;
        }

        /* =====================================================
           ERROR
        ===================================================== */

        @keyframes resetErrorReveal {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-message {
          animation: resetErrorReveal .3s ease-out both;
        }

        /* =====================================================
           SUCCESS
        ===================================================== */

        @keyframes resetSuccessReveal {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.97);
            filter: blur(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        .success-state {
          animation: resetSuccessReveal .7s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes resetSuccessPulse {
          0%, 100% {
            transform: scale(1);
            opacity: .45;
          }

          50% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .success-pulse {
          animation: resetSuccessPulse 2s ease-out infinite;
        }

        /* =====================================================
           RESPONSIVE HEIGHT
        ===================================================== */

        @media (max-height: 820px) and (min-width: 1024px) {
          .reset-page {
            min-height: 620px;
          }

          .reset-panel > div:last-child {
            padding-top: 18px;
            padding-bottom: 18px;
          }

          .reset-input {
            height: 48px;
          }

          .reset-left h1 {
            font-size: 42px;
          }

          .reset-left > p {
            margin-top: 16px;
          }

          .reset-left > div:nth-of-type(2) {
            margin-top: 16px;
          }
        }

        /* =====================================================
           MOBILE / TABLET
        ===================================================== */

        @media (max-width: 1023px) {
          .reset-page {
            height: auto;
            min-height: 100dvh;
            overflow-y: auto;
          }

          .reset-background {
            position: fixed;
          }

          .reset-logo {
            left: 20px;
            top: 20px;
          }

          .reset-logo img {
            width: 94px;
            height: 64px;
          }

          .back-home-button {
            right: 20px;
            top: 26px;
          }

          .reset-page main {
            display: block;
            padding: 115px 20px 35px;
          }

          .reset-panel {
            margin: 0 auto;
          }
        }

        @media (max-width: 560px) {
          .back-home-button {
            padding: 9px 11px;
            font-size: 10px;
          }

          .back-home-button span {
            display: none;
          }

          .reset-panel {
            border-radius: 22px;
          }

          .reset-panel > div:last-child {
            padding: 22px 18px;
          }

          .reset-panel h2 {
            font-size: 28px;
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .reset-background,
          .reset-glow-blue,
          .reset-glow-cyan,
          .reset-glow-gold,
          .reset-particle,
          .reset-gold-trail,
          .reset-blue-trail,
          .reset-logo,
          .back-home-button,
          .reset-item,
          .reset-panel,
          .reset-panel-shine,
          .reset-orbit,
          .reset-orbit-dot,
          .form-reveal,
          .reset-button-shine,
          .success-state,
          .success-pulse {
            animation: none !important;
          }

          .reset-item,
          .form-reveal {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};