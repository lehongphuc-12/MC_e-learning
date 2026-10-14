import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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
  // ============================================================
  // GIỮ NGUYÊN LOGIC
  // ============================================================

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

          onToast?.(
            'Email Sent',
            'Instructions to reset your password have been sent.',
            'success',
          );
        } else {
          const msg =
            result.message || 'Failed to request password reset.';

          setError(msg);
          onToast?.('Error', msg, 'error');
        }
      },

      onError: (err: any) => {
        const msg =
          err.message ||
          'An error occurred while requesting password reset.';

        setError(msg);
        onToast?.('Connection Error', msg, 'error');
      },
    });
  };

  const isLoading = forgotPasswordMutation.isPending;

  return (
    <div
      id="forgot-password-screen"
      className="forgot-page relative h-[100dvh] min-h-[650px] w-full overflow-hidden bg-[#020d24] text-white"
    >
      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/images/backgroundForgotPassword.png"
          alt=""
          aria-hidden="true"
          className="forgot-background absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Overlay nhẹ để vẫn nhìn rõ background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#01091d]/20 via-[#02132f]/5 to-[#020c21]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010817]/38 via-transparent to-[#031431]/10" />
        <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(0,7,28,0.40)]" />
      </div>

      {/* ========================================================
          AMBIENT LIGHT
      ======================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="forgot-glow-blue absolute -left-[200px] top-[15%] h-[460px] w-[460px] rounded-full bg-blue-500/[0.08] blur-[130px]" />

        <div className="forgot-glow-cyan absolute right-[18%] top-[-200px] h-[410px] w-[410px] rounded-full bg-cyan-300/[0.07] blur-[130px]" />

        <div className="forgot-glow-yellow absolute bottom-[-200px] left-[20%] h-[410px] w-[410px] rounded-full bg-[#ffc928]/10 blur-[130px]" />

        <span className="forgot-particle forgot-particle-1 absolute left-[13%] top-[18%] h-1.5 w-1.5 rounded-full bg-[#ffc928]" />
        <span className="forgot-particle forgot-particle-2 absolute left-[45%] top-[12%] h-1.5 w-1.5 rounded-full bg-cyan-300" />
        <span className="forgot-particle forgot-particle-3 absolute bottom-[17%] left-[37%] h-1.5 w-1.5 rounded-full bg-blue-400" />
        <span className="forgot-particle forgot-particle-4 absolute right-[8%] top-[31%] h-2 w-2 rounded-full bg-[#ffc928]" />
      </div>

      {/* ========================================================
          LIGHT TRAILS
      ======================================================== */}

      <div className="forgot-gold-trail pointer-events-none absolute -bottom-[135px] left-[-8%] h-[220px] w-[120%] rotate-[-3deg] rounded-[50%] border-t-2 border-[#ffc928]/35 shadow-[0_-4px_30px_rgba(255,201,40,0.18)]" />

      <div className="forgot-blue-trail pointer-events-none absolute -bottom-[165px] left-[18%] h-[220px] w-[105%] rotate-[-5deg] rounded-[50%] border-t-2 border-blue-400/30 shadow-[0_-4px_30px_rgba(59,130,246,0.20)]" />

      {/* ========================================================
          LOGO
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="forgot-logo absolute left-[4%] top-[3%] z-40 overflow-hidden rounded-[20px] border border-white/10 bg-[#04162f]/55 shadow-[0_15px_45px_rgba(0,0,0,0.30)] backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03]"
      >
        <img
          src="/images/logo/mseekk-logo.png"
          alt="MSEEK"
          className="h-[80px] w-[90px] object-cover"
        />
      </button>

      {/* ========================================================
          BACK HOME
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="forgot-back-home absolute right-[4%] top-[3%] z-40 flex items-center gap-2.5 rounded-[14px] border border-cyan-300/25 bg-[#052657]/65 px-4 py-2.5 text-[12px] font-black text-white shadow-[0_12px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition-all duration-300 hover:-translate-x-1 hover:border-cyan-300/50 hover:bg-[#0a3775]/80"
      >
        <ArrowLeft className="h-[18px] w-[18px] text-cyan-300" />
        <span>Về trang chủ</span>
      </button>

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="relative z-20 mx-auto grid h-full w-full max-w-[1500px] grid-cols-1 items-center px-[5%] pt-[3.5%] lg:grid-cols-[1.18fr_0.82fr] lg:gap-[5%]">
        {/* ======================================================
            LEFT
        ====================================================== */}

        <section className="forgot-left hidden max-w-[710px] lg:block">
          {/* BADGE */}

          <div className="forgot-item forgot-delay-1 inline-flex items-center gap-2.5 rounded-full border border-cyan-300/55 bg-[#12365f]/65 px-4 py-2.5 shadow-[0_8px_30px_rgba(34,211,238,0.08)] backdrop-blur-md">
            <ShieldCheck className="h-[18px] w-[18px] text-cyan-300" />

            <span className="text-[9px] font-black uppercase tracking-[0.10em] text-white">
              Khôi phục tài khoản an toàn
            </span>
          </div>

          {/* HEADING */}

          <h1 className="forgot-item forgot-delay-2 mt-5 max-w-[680px] text-[45px] font-black leading-[0.99] tracking-[-0.045em] text-white xl:text-[53px]">
            Đừng để gián đoạn

            <span className="relative mt-2 block w-fit text-[#ffc928]">
              Hành trình của bạn

              <span className="absolute -bottom-2 left-0 h-[3px] w-[67%] rounded-full bg-gradient-to-r from-[#ffc928] to-transparent" />
            </span>
          </h1>

          {/* DESCRIPTION */}

          <p className="forgot-item forgot-delay-3 mt-6 max-w-[640px] text-[13px] font-semibold leading-[1.8] text-white/85 xl:text-[14px]">
            Quên mật khẩu không phải là vấn đề. MSEEK sẽ giúp bạn khôi phục
            quyền truy cập an toàn để tiếp tục hành trình luyện giọng và phát
            triển bản lĩnh sân khấu.
          </p>

          {/* FEATURE CARDS */}
               <div className="forgot-item forgot-delay-4 mt-5 flex max-w-[560px] gap-3">
  {/* EMAIL */}
  <div className="forgot-feature-card group flex w-[170px] min-h-[72px] items-center gap-3 rounded-[16px] border border-blue-300/15 bg-[#082656]/70 px-3 py-2.5 backdrop-blur-xl">
    <div className="forgot-feature-icon flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
      <Mail className="h-[18px] w-[18px]" />
    </div>

    <span className="whitespace-nowrap text-[10px] font-black leading-[1.4]">
      Xác nhận
      <br />
      qua email
    </span>
  </div>

  {/* PASSWORD */}
  <div className="forgot-feature-card group flex w-[170px] min-h-[72px] items-center gap-3 rounded-[16px] border border-blue-300/15 bg-[#082656]/70 px-3 py-2.5 backdrop-blur-xl">
    <div className="forgot-feature-icon flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
      <Lock className="h-[18px] w-[18px]" />
    </div>

    <span className="whitespace-nowrap text-[10px] font-black leading-[1.4]">
      Khôi phục
      <br />
      bảo mật
    </span>
  </div>

  {/* JOURNEY */}
  <div className="forgot-feature-card group flex w-[170px] min-h-[72px] items-center gap-3 rounded-[16px] border border-blue-300/15 bg-[#082656]/70 px-3 py-2.5 backdrop-blur-xl">
    <div className="forgot-feature-icon flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
      <Sparkles className="h-[18px] w-[18px]" />
    </div>

    <span className="whitespace-nowrap text-[10px] font-black leading-[1.4]">
      Tiếp tục
      <br />
      hành trình
    </span>
  </div>
</div>

          {/* QUOTE */}

          <div className="forgot-item forgot-delay-5 mt-5 flex max-w-[450px] items-center gap-4 rounded-[18px] border border-blue-300/15 bg-[#08234e]/75 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.20)] backdrop-blur-xl">
            <div className="text-[20px] font-black leading-none text-cyan-300">
              ”
            </div>

            <div>
              <p className="text-[11px] font-medium italic leading-6 text-white/90">
                “Mỗi hành trình đều có thể tiếp tục khi bạn luôn có một điểm
                tựa an toàn.”
              </p>

              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                MSEEK
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================
            RIGHT PANEL
        ====================================================== */}

        <section className="forgot-panel relative ml-auto w-full max-w-[475px] overflow-hidden rounded-[27px] border border-cyan-300/30 bg-[#062654]/70 shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_40px_rgba(59,130,246,0.10)] backdrop-blur-[20px]">
          {/* Animated border */}

          <div className="forgot-panel-shine pointer-events-none absolute inset-[-2px] rounded-[29px]" />

          {/* Inner gradient */}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/[0.07] via-transparent to-[#ffc928]/[0.035]" />

          {/* ORBITS */}

          <div className="pointer-events-none absolute -right-[85px] top-[75px] h-[215px] w-[215px] rounded-full border border-[#ffc928]/20" />

          <div className="forgot-orbit pointer-events-none absolute -right-[25px] top-[115px] h-[180px] w-[180px] rounded-full border border-cyan-300/12" />

          <span className="forgot-orbit-dot pointer-events-none absolute right-[22px] top-[160px] h-2.5 w-2.5 rounded-full bg-[#ffc928] shadow-[0_0_18px_rgba(255,201,40,0.85)]" />

          <div className="relative z-10 px-7 py-7 xl:px-8 xl:py-8">
            {!isSubmitted ? (
              <>
                {/* HEADER */}

                <div className="forgot-form-reveal forgot-form-delay-1">
                  <div className="flex items-center gap-3">
                    <span className="h-[3px] w-9 rounded-full bg-[#ffc928]" />

                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                      Khôi phục tài khoản
                    </span>
                  </div>

                  <div className="mt-4 flex h-[50px] w-[50px] items-center justify-center rounded-[15px] border border-cyan-300/20 bg-[#073268]/80 text-cyan-300 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                    <KeyRound className="h-6 w-6" />
                  </div>

                  <h2 className="mt-4 text-[33px] font-black leading-none tracking-[-0.04em] text-white xl:text-[37px]">
                    Quên mật khẩu?
                  </h2>

                  <p className="mt-3 max-w-[400px] text-[11px] font-medium leading-5 text-blue-100/70">
                    Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi cho bạn
                    liên kết để tạo mật khẩu mới.
                  </p>
                </div>

                {/* ERROR */}

                {error && (
                  <div className="forgot-error mt-4 flex items-start gap-2.5 rounded-[12px] border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-[10px] font-bold text-rose-200 backdrop-blur-xl">
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* FORM */}

                <form
                  onSubmit={handleSubmit}
                  className="forgot-form-reveal forgot-form-delay-2 mt-6"
                >
                  <label className="mb-2 block text-[11px] font-black text-white">
                    Địa chỉ email
                  </label>

                  <div className="forgot-input-wrapper relative">
                    <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]" />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email tài khoản của bạn"
                      required
                      autoComplete="email"
                      className="forgot-input h-[52px] w-full rounded-[14px] border border-blue-300/25 bg-[#021b3e]/82 pl-[46px] pr-4 text-[11px] font-semibold text-white outline-none placeholder:text-blue-100/35"
                    />
                  </div>

                  {/* INFO */}

                  <div className="mt-3.5 flex items-start gap-2.5 rounded-[13px] border border-blue-300/15 bg-[#021b3e]/45 px-3.5 py-3">
                    <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-cyan-300" />

                    <p className="text-[9px] font-medium leading-[18px] text-blue-100/65">
                      Liên kết đặt lại mật khẩu sẽ được gửi đến email của bạn.
                      Hãy kiểm tra cả hộp thư đến và thư rác.
                    </p>
                  </div>

                  {/* SUBMIT */}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="forgot-submit group relative mt-5 flex h-[52px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#ffc928] text-[#041a3c] shadow-[0_15px_40px_rgba(255,201,40,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64c] hover:shadow-[0_20px_50px_rgba(255,201,40,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="forgot-button-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[32%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

                    {isLoading ? (
                      <div className="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-[#041a3c]/20 border-t-[#041a3c]" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-4">
                        <span className="text-[11px] font-black">
                          Gửi liên kết đặt lại
                        </span>
                      </span>
                    )}
                  </button>
                </form>

                {/* LOGIN */}

                <div className="forgot-form-reveal forgot-form-delay-3 mt-5 border-t border-blue-100/10 pt-4 text-center">
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
              /* ==================================================
                  SUCCESS
              ================================================== */

              <div className="forgot-success flex min-h-[420px] flex-col items-center justify-center py-5 text-center">
                {/* SUCCESS ICON */}

                <div className="relative">
                  <div className="forgot-success-pulse absolute inset-0 rounded-full bg-emerald-400/25" />

                  <div className="forgot-success-ring relative flex h-[74px] w-[74px] items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/15 text-emerald-300 shadow-[0_0_50px_rgba(52,211,153,0.20)] backdrop-blur-xl">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                </div>

                <span className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Gửi email thành công
                </span>

                <h2 className="mt-3 text-[30px] font-black tracking-[-0.04em] text-white">
                  Kiểm tra email
                  <br />
                  của bạn
                </h2>

                <p className="mt-3 max-w-[370px] text-[10px] font-medium leading-5 text-blue-100/65">
                  Chúng tôi đã gửi liên kết đặt lại mật khẩu đến
                </p>

                <div className="mt-3 max-w-full rounded-[11px] border border-cyan-300/15 bg-[#021b3e]/60 px-4 py-2 text-[10px] font-black text-cyan-200">
                  {email}
                </div>

                <p className="mt-3 max-w-[360px] text-[9px] font-medium leading-[18px] text-blue-100/50">
                  Vui lòng mở email và làm theo hướng dẫn để tạo mật khẩu mới.
                </p>

                {/* LOGIN */}

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="group relative mt-6 flex h-[50px] w-full max-w-[330px] items-center justify-center gap-3 overflow-hidden rounded-[14px] bg-[#ffc928] text-[11px] font-black text-[#041a3c] shadow-[0_15px_40px_rgba(255,201,40,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64c] hover:shadow-[0_20px_45px_rgba(255,201,40,0.35)]"
                >
                  <span>Quay lại đăng nhập</span>

                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#052558] text-white transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                {/* RETRY */}

                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="group mt-4 flex items-center gap-2 text-[9px] font-bold text-blue-100/55 transition-colors hover:text-white"
                >
                  <Mail className="h-3 w-3" />
                  <span>Không nhận được email? Thử địa chỉ khác</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========================================================
          CSS ANIMATIONS
      ======================================================== */}

      <style>{`
        @keyframes forgotBackground {
          0%, 100% {
            transform: scale(1.01);
          }
          50% {
            transform: scale(1.04);
          }
        }

        .forgot-background {
          animation: forgotBackground 18s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes forgotGlowBlue {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: .5;
          }
          50% {
            transform: translate3d(70px, -35px, 0);
            opacity: .9;
          }
        }

        @keyframes forgotGlowCyan {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-65px, 50px, 0);
          }
        }

        @keyframes forgotGlowYellow {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(55px, -40px, 0) scale(1.12);
          }
        }

        .forgot-glow-blue {
          animation: forgotGlowBlue 10s ease-in-out infinite;
        }

        .forgot-glow-cyan {
          animation: forgotGlowCyan 12s ease-in-out infinite;
        }

        .forgot-glow-yellow {
          animation: forgotGlowYellow 13s ease-in-out infinite;
        }

        @keyframes forgotParticle {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: .45;
          }
          50% {
            transform: translateY(-22px) scale(1.25);
            opacity: 1;
          }
        }

        .forgot-particle {
          box-shadow: 0 0 18px currentColor;
          animation: forgotParticle 5s ease-in-out infinite;
        }

        .forgot-particle-2 {
          animation-delay: .8s;
        }

        .forgot-particle-3 {
          animation-delay: 1.6s;
        }

        .forgot-particle-4 {
          animation-delay: 2.4s;
        }

        @keyframes forgotGoldTrail {
          0%, 100% {
            opacity: .35;
            transform: translateX(-1%) rotate(-3deg);
          }
          50% {
            opacity: .8;
            transform: translateX(2%) rotate(-3deg);
          }
        }

        .forgot-gold-trail {
          animation: forgotGoldTrail 7s ease-in-out infinite;
        }

        @keyframes forgotBlueTrail {
          0%, 100% {
            opacity: .3;
          }
          50% {
            opacity: .7;
          }
        }

        .forgot-blue-trail {
          animation: forgotBlueTrail 8s ease-in-out infinite;
        }

        @keyframes forgotLogoReveal {
          from {
            opacity: 0;
            transform: translateY(-18px) scale(.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .forgot-logo {
          animation: forgotLogoReveal .8s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes forgotBackReveal {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .forgot-back-home {
          animation: forgotBackReveal .8s .15s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes forgotContentReveal {
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

        .forgot-item {
          opacity: 0;
          animation: forgotContentReveal .8s cubic-bezier(.16,1,.3,1) forwards;
        }

        .forgot-delay-1 {
          animation-delay: .15s;
        }

        .forgot-delay-2 {
          animation-delay: .25s;
        }

        .forgot-delay-3 {
          animation-delay: .35s;
        }

        .forgot-delay-4 {
          animation-delay: .45s;
        }

        .forgot-delay-5 {
          animation-delay: .55s;
        }

        .forgot-feature-card {
          transition:
            transform .35s cubic-bezier(.16,1,.3,1),
            border-color .35s ease,
            background .35s ease,
            box-shadow .35s ease;
        }

        .forgot-feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(103,232,249,.35);
          background: rgba(14,55,112,.82);
          box-shadow:
            0 18px 40px rgba(0,0,0,.22),
            0 0 25px rgba(59,130,246,.12);
        }

        .forgot-feature-icon {
          transition: transform .35s cubic-bezier(.16,1,.3,1);
        }

        .forgot-feature-card:hover .forgot-feature-icon {
          transform: scale(1.08) rotate(-4deg);
        }

        @keyframes forgotPanelReveal {
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

        .forgot-panel {
          animation: forgotPanelReveal .9s .15s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes forgotPanelGlow {
          0%, 100% {
            opacity: .28;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.12),
              0 0 20px rgba(59,130,246,.07);
          }
          50% {
            opacity: .7;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.27),
              0 0 35px rgba(59,130,246,.16);
          }
        }

        .forgot-panel-shine {
          animation: forgotPanelGlow 4s ease-in-out infinite;
        }

        @keyframes forgotOrbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .forgot-orbit {
          animation: forgotOrbit 22s linear infinite;
        }

        @keyframes forgotOrbitDot {
          0%, 100% {
            transform: translateY(0);
            opacity: .7;
          }
          50% {
            transform: translateY(40px);
            opacity: 1;
          }
        }

        .forgot-orbit-dot {
          animation: forgotOrbitDot 5s ease-in-out infinite;
        }

        @keyframes forgotFormReveal {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .forgot-form-reveal {
          opacity: 0;
          animation: forgotFormReveal .65s cubic-bezier(.16,1,.3,1) forwards;
        }

        .forgot-form-delay-1 {
          animation-delay: .30s;
        }

        .forgot-form-delay-2 {
          animation-delay: .42s;
        }

        .forgot-form-delay-3 {
          animation-delay: .54s;
        }

        .forgot-input {
          transition:
            border-color .25s ease,
            background .25s ease,
            box-shadow .25s ease,
            transform .25s ease;
        }

        .forgot-input:hover {
          border-color: rgba(147,197,253,.4);
          background: rgba(3,32,72,.92);
        }

        .forgot-input:focus {
          border-color: rgba(103,232,249,.72);
          background: rgba(3,32,72,.97);
          box-shadow:
            0 0 0 3px rgba(34,211,238,.07),
            0 10px 30px rgba(0,0,0,.15),
            0 0 22px rgba(34,211,238,.07);
          transform: translateY(-1px);
        }

        .forgot-input-wrapper:focus-within svg {
          color: rgb(103 232 249);
          filter: drop-shadow(0 0 6px rgba(34,211,238,.35));
        }

        @keyframes forgotButtonShine {
          0% {
            left: -70%;
          }
          45%, 100% {
            left: 145%;
          }
        }

        .forgot-button-shine {
          animation: forgotButtonShine 4.5s ease-in-out infinite;
        }

        @keyframes forgotErrorReveal {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .forgot-error {
          animation: forgotErrorReveal .3s ease-out both;
        }

        @keyframes forgotSuccessReveal {
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

        .forgot-success {
          animation: forgotSuccessReveal .7s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes forgotSuccessPulse {
          0%, 100% {
            transform: scale(1);
            opacity: .5;
          }
          50% {
            transform: scale(1.45);
            opacity: 0;
          }
        }

        .forgot-success-pulse {
          animation: forgotSuccessPulse 2s ease-out infinite;
        }

        @keyframes forgotSuccessRing {
          0%, 100% {
            box-shadow:
              0 0 25px rgba(52,211,153,.12),
              0 0 50px rgba(52,211,153,.10);
          }
          50% {
            box-shadow:
              0 0 35px rgba(52,211,153,.25),
              0 0 70px rgba(52,211,153,.15);
          }
        }

        .forgot-success-ring {
          animation: forgotSuccessRing 3s ease-in-out infinite;
        }

        @media (max-height: 820px) and (min-width: 1024px) {
          .forgot-page {
            min-height: 620px;
          }

          .forgot-left h1 {
            font-size: 42px;
          }

          .forgot-panel > div:last-child {
            padding-top: 21px;
            padding-bottom: 21px;
          }
        }

        @media (max-width: 1023px) {
          .forgot-page {
            height: auto;
            min-height: 100dvh;
            overflow-y: auto;
          }

          .forgot-background {
            position: fixed;
          }

          .forgot-logo {
            left: 20px;
            top: 20px;
          }

          .forgot-logo img {
            width: 94px;
            height: 64px;
          }

          .forgot-back-home {
            right: 20px;
            top: 28px;
          }

          .forgot-page main {
            display: block;
            padding: 115px 20px 35px;
          }

          .forgot-panel {
            margin: 0 auto;
          }
        }

        @media (max-width: 560px) {
          .forgot-back-home {
            padding: 9px 11px;
            font-size: 10px;
          }

          .forgot-back-home span {
            display: none;
          }

          .forgot-panel {
            border-radius: 22px;
          }

          .forgot-panel > div:last-child {
            padding: 23px 18px;
          }

          .forgot-panel h2 {
            font-size: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .forgot-background,
          .forgot-glow-blue,
          .forgot-glow-cyan,
          .forgot-glow-yellow,
          .forgot-particle,
          .forgot-gold-trail,
          .forgot-blue-trail,
          .forgot-logo,
          .forgot-back-home,
          .forgot-item,
          .forgot-panel,
          .forgot-panel-shine,
          .forgot-orbit,
          .forgot-orbit-dot,
          .forgot-form-reveal,
          .forgot-button-shine,
          .forgot-success,
          .forgot-success-pulse,
          .forgot-success-ring {
            animation: none !important;
          }

          .forgot-item,
          .forgot-form-reveal {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};