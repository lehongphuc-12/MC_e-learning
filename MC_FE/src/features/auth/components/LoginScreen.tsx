import {
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Quote,
  Sparkles,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ScreenType } from '../../../types';
import { ToastType } from '../../../components/common/Toast';
import {
  useGoogleLoginMutation,
  useLoginMutation,
} from '../hooks/useAuthQueries';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();

  /* ============================================================
     LOAD REMEMBERED EMAIL
  ============================================================ */

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('mseek_remembered_email');

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  /* ============================================================
     NORMAL LOGIN
  ============================================================ */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (result) => {
          if (result.success) {
            if (rememberMe) {
              localStorage.setItem('mseek_remembered_email', email);
            } else {
              localStorage.removeItem('mseek_remembered_email');
            }

            onLoginSuccess(result.data.user, result.data.token);
          } else {
            const msg =
              result.message ||
              'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';

            setError(msg);
            onToast?.('Đăng nhập thất bại', msg, 'error');
          }
        },

        onError: (err: any) => {
          const msg = err.message || 'Không thể kết nối tới máy chủ.';

          setError(msg);
          onToast?.('Lỗi kết nối', msg, 'error');
        },
      }
    );
  };

  /* ============================================================
     GOOGLE LOGIN
  ============================================================ */

  const handleGoogleLogin = () => {
    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '50611504022-71qcadap5m0g6gi669p3nqr5nqliu8o1.apps.googleusercontent.com';

    const handleCredentialResponse = (response: any) => {
      const idToken = response.credential;

      googleLoginMutation.mutate(idToken, {
        onSuccess: (res) => {
          if (res.success) {
            onToast?.(
              'Đăng nhập thành công',
              'Đăng nhập Google thành công!',
              'success'
            );

            onLoginSuccess(res.data.user, res.data.token);
          } else {
            const msg = res.message || 'Đăng nhập Google thất bại.';

            setError(msg);
            onToast?.('Đăng nhập Google thất bại', msg, 'error');
          }
        },

        onError: (err: any) => {
          const msg = err.message || 'Không thể kết nối tới máy chủ.';

          setError(msg);
          onToast?.('Lỗi kết nối', msg, 'error');
        },
      });
    };

    const initGoogle = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });

        (window as any).google.accounts.id.prompt();
      }
    };

    if (!(window as any).google?.accounts?.id) {
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      if (existingScript) {
        existingScript.addEventListener('load', initGoogle, {
          once: true,
        });

        return;
      }

      const script = document.createElement('script');

      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;

      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  };

  const isLoading =
    loginMutation.isPending || googleLoginMutation.isPending;

  return (
    <div
      id="login-screen"
      className="mseek-login relative h-[100dvh] min-h-0 overflow-hidden bg-[#020d23] text-white"
    >
      {/* ============================================================
          BACKGROUND
      ============================================================ */}

      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/images/backgroundLogin.png"
          alt=""
          aria-hidden="true"
          className="login-background absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Overlay rất nhẹ để background vẫn rõ */}
        <div className="absolute inset-0 bg-[#020e25]/[0.025]" />

        {/* Làm hai cạnh dịu hơn */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#021333]/10 via-transparent to-[#021333]/10" />

        {/* Glow mềm ở trung tâm */}
        <div className="login-soft-center absolute left-[25%] top-[10%] h-[70%] w-[55%] rounded-full bg-blue-300/[0.035] blur-[110px]" />

        <div className="login-vignette absolute inset-0" />
      </div>

      {/* ============================================================
          BACKGROUND ANIMATION
      ============================================================ */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-light-one absolute -left-[7%] -top-[35%] h-[115%] w-[18%] rotate-[17deg] bg-gradient-to-b from-blue-300/10 via-blue-400/[0.035] to-transparent blur-[45px]" />

        <div className="login-light-two absolute left-[42%] -top-[38%] h-[110%] w-[13%] -rotate-[12deg] bg-gradient-to-b from-[#ffe58a]/10 via-[#ffc928]/[0.025] to-transparent blur-[50px]" />

        <div className="login-blue-glow absolute -left-[160px] top-[12%] h-[500px] w-[500px] rounded-full bg-blue-600/[0.05] blur-[150px]" />

        <div className="login-gold-glow absolute -right-[180px] bottom-[-150px] h-[500px] w-[500px] rounded-full bg-[#ffc928]/[0.05] blur-[150px]" />

        <span className="login-particle particle-1 absolute left-[12%] top-[17%] h-1.5 w-1.5 rounded-full bg-[#ffc928]" />

        <span className="login-particle particle-2 absolute left-[45%] top-[10%] h-1 w-1 rounded-full bg-cyan-300" />

        <span className="login-particle particle-3 absolute right-[8%] top-[20%] h-1.5 w-1.5 rounded-full bg-blue-300" />

        <span className="login-particle particle-4 absolute bottom-[10%] left-[30%] h-1 w-1 rounded-full bg-[#ffc928]" />
      </div>

      {/* ============================================================
          PAGE CONTENT
      ============================================================ */}

      <div className="relative z-20 mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col px-5 py-2 sm:px-8 lg:px-12 xl:px-16">
        {/* ==========================================================
            HEADER
        ========================================================== */}

        {/* ==========================================================
    HEADER
========================================================== */}

<header className="login-header relative flex h-[72px] shrink-0 items-start justify-between">

  {/* LOGO - GÓC TRÁI */}
  <button
    type="button"
    onClick={() => onNavigate('home')}
    className="group relative flex items-center"
  >
    <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#03152f]/45 shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:border-blue-300/25 group-hover:shadow-[0_16px_40px_rgba(37,99,235,0.22)]">
      <img
        src="/images/logo/mseekk-logo.png"
        alt="MSEEK"
        className="h-[66px] w-[78px] rounded-[18px] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    </div>
  </button>

  {/* BACK TO HOME - GÓC TRÊN BÊN PHẢI */}
  <button
    type="button"
    onClick={() => onNavigate('home')}
    className="back-home-button group absolute right-0 top-2 flex h-[44px] items-center gap-2.5 rounded-[14px] border border-white/15 bg-[#031a3b]/55 px-4 text-[13px] font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-[#08275a]/80 hover:shadow-[0_12px_32px_rgba(37,99,235,0.22)]"
  >
    <ArrowRight className="h-[17px] w-[17px] rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />

    <span>Về trang chủ</span>
  </button>

</header>

        {/* ==========================================================
            MAIN
        ========================================================== */}

        <main className="grid min-h-0 flex-1 items-center gap-8 overflow-hidden py-1 lg:grid-cols-[1.1fr_0.9fr] xl:gap-12">
          {/* ========================================================
              LEFT CONTENT
          ======================================================== */}

          <section className="login-left-content relative hidden max-w-[780px] lg:block">
            {/* BADGE */}

            <div className="login-reveal-1 inline-flex items-center gap-2.5 rounded-full border border-cyan-300/50 bg-[#06285c]/55 px-5 py-2.5 shadow-[0_0_25px_rgba(34,211,238,0.08)] backdrop-blur-xl">
              <Sparkles className="h-[19px] w-[19px] text-cyan-300" />

              <span className="text-[14px] font-black uppercase tracking-[0.14em] text-cyan-100">
                Nền tảng luyện giọng MC hàng đầu
              </span>
            </div>

            {/* TITLE */}

            <h1 className="login-reveal-2 mt-5 max-w-[800px] text-[70px] font-black leading-[0.95] tracking-[-0.05em] text-white xl:text-[68px] 2xl:text-[72px]">
              <span className="block whitespace-nowrap drop-shadow-[0_5px_18px_rgba(0,0,0,0.18)]">
                Làm chủ giọng nói
              </span>

              <span className="relative mt-2 inline-block whitespace-nowrap text-[#ffc928] drop-shadow-[0_5px_18px_rgba(255,201,40,0.12)]">
                Tự tin tỏa sáng

                <span className="login-title-line absolute -bottom-2.5 left-0 h-[4px] w-[72%] rounded-full bg-gradient-to-r from-[#ffc928] via-[#ffd84f] to-transparent" />
              </span>
            </h1>

            {/* DESCRIPTION */}

            <p className="login-reveal-3 mt-6 max-w-[660px] text-[18px] font-semibold leading-[1.75] text-blue-50/90 xl:text-[19px]">
              Học tập cùng AI hiện đại, giảng viên chuyên nghiệp và cộng đồng
              đam mê để phát triển giọng nói, phong thái và bản lĩnh sân khấu.
            </p>

            {/* ======================================================
                FEATURES
            ====================================================== */}

            <div className="login-reveal-4 mt-6 grid max-w-[700px] grid-cols-3 gap-3.5">
              <div className="feature-card group flex min-h-[86px] items-center gap-3.5 rounded-[17px] border border-blue-300/15 bg-[#052452]/60 px-4 py-3.5 backdrop-blur-xl">
                <div className="feature-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                  <Sparkles className="h-[22px] w-[22px]" />
                </div>

                <div className="text-[15px] font-bold leading-[22px] text-white/95">
                  Luyện giọng
                  <br />
                  cùng AI
                </div>
              </div>

              <div className="feature-card group flex min-h-[86px] items-center gap-3.5 rounded-[17px] border border-blue-300/15 bg-[#052452]/60 px-4 py-3.5 backdrop-blur-xl">
                <div className="feature-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                  <Users className="h-[22px] w-[22px]" />
                </div>

                <div className="text-[15px] font-bold leading-[22px] text-white/95">
                  Giảng viên
                  <br />
                  chuyên nghiệp
                </div>
              </div>

              <div className="feature-card group flex min-h-[86px] items-center gap-3.5 rounded-[17px] border border-blue-300/15 bg-[#052452]/60 px-4 py-3.5 backdrop-blur-xl">
                <div className="feature-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                  <BarChart3 className="h-[22px] w-[22px]" />
                </div>

                <div className="text-[15px] font-bold leading-[22px] text-white/95">
                  Lộ trình
                  <br />
                  cá nhân hóa
                </div>
              </div>
            </div>

            {/* ======================================================
                QUOTE
                Không còn mock học viên / avatar / 5.000+ / 95%
            ====================================================== */}

            <div className="login-reveal-5 mt-5 flex max-w-[700px] items-start gap-4 rounded-[17px] border border-blue-300/15 bg-[#031a3e]/60 px-5 py-4 shadow-[0_14px_45px_rgba(0,0,0,0.12)] backdrop-blur-md">
              <Quote className="mt-0.5 h-8 w-8 shrink-0 fill-blue-300/60 text-blue-300/60" />

              <div>
                <p className="text-[16px] italic leading-7 text-blue-50/90">
                  “Giọng nói không chỉ để nói, mà để chạm đến trái tim người
                  khác.”
                </p>

                <div className="mt-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-blue-300/70">
                  MSEEK
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================
              LOGIN CARD
          ======================================================== */}

          <section className="login-card-wrapper relative mx-auto w-full max-w-[470px] lg:ml-auto">
            <div className="login-card-glow pointer-events-none absolute -inset-[2px] rounded-[27px] bg-gradient-to-br from-blue-300/55 via-blue-500/10 to-[#ffc928]/35 blur-[1px]" />

            <div className="login-card relative overflow-hidden rounded-[26px] border border-blue-200/25 bg-[#061c42]/72 px-6 py-5 shadow-[0_30px_100px_rgba(0,0,0,0.30)] backdrop-blur-[18px] sm:px-7 sm:py-5">
              {/* CARD LIGHT */}

              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.055] via-transparent to-[#ffc928]/[0.025]" />

                <div className="login-card-orb absolute -right-24 -top-24 h-[220px] w-[220px] rounded-full bg-blue-400/[0.07] blur-[90px]" />

                <div className="absolute -bottom-28 -left-24 h-[210px] w-[210px] rounded-full bg-[#ffc928]/[0.035] blur-[100px]" />
              </div>

              {/* ORBIT */}

              <div className="pointer-events-none absolute right-[-110px] top-[15px] hidden h-[220px] w-[220px] sm:block">
                <div className="login-orbit absolute inset-0 rounded-[50%] border border-[#ffc928]/30" />

                <div className="login-orbit login-orbit-two absolute inset-[22px] rounded-[50%] border border-blue-300/20" />

                <span className="orbit-dot absolute left-[25px] top-[50%] h-2 w-2 rounded-full bg-[#ffc928] shadow-[0_0_16px_#ffc928]" />
              </div>

              <div className="relative z-10">
                {/* ==================================================
                    HEADER LOGIN
                ================================================== */}

                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-[3px] w-8 rounded-full bg-[#ffc928]" />

                    <span className="text-[11px] font-bold uppercase tracking-[0.17em] text-blue-100">
                      Chào mừng trở lại
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-[38px] font-black leading-none tracking-[-0.045em] text-white sm:text-[42px]">
                    Đăng nhập
                  </h2>

                  <p className="mt-2.5 text-[12px] font-medium text-blue-100/80">
                    Tiếp tục hành trình làm chủ giọng nói của bạn.
                  </p>
                </div>

                {/* ==================================================
                    FORM
                ================================================== */}

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  {error && (
                    <div className="login-error flex items-start gap-2.5 rounded-xl border border-rose-300/25 bg-rose-500/10 px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-rose-200">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />

                      {error}
                    </div>
                  )}

                  {/* EMAIL */}

                  <div>
                    <label className="mb-1.5 block text-[12px] font-black text-white">
                      Email
                    </label>

                    <div className="login-input group relative">
                      <Mail
                        strokeWidth={2.1}
                        className="absolute left-4 top-1/2 z-10 h-[20px] w-[20px] -translate-y-1/2 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.2)] transition-all duration-300 group-focus-within:text-cyan-200"
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Nhập địa chỉ email của bạn"
                        autoComplete="email"
                        required
                        className="h-[50px] w-full rounded-[13px] border border-blue-200/25 bg-[#031a3b]/75 pl-[50px] pr-4 text-[13px] font-semibold text-white outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-medium placeholder:text-blue-100/40 hover:border-blue-200/40 focus:border-cyan-200/65 focus:bg-[#05204a]/80 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.07),0_8px_30px_rgba(0,0,0,0.08)]"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[12px] font-black text-white">
                        Mật khẩu
                      </label>

                      <button
                        type="button"
                        onClick={() => onNavigate('forgot-password')}
                        className="text-[11px] font-black text-sky-300 transition-all duration-300 hover:text-cyan-200"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>

                    <div className="login-input group relative">
                      <Lock
                        strokeWidth={2.1}
                        className="absolute left-4 top-1/2 z-10 h-[20px] w-[20px] -translate-y-1/2 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.2)] transition-all duration-300 group-focus-within:text-cyan-200"
                      />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu của bạn"
                        autoComplete="current-password"
                        required
                        className="h-[50px] w-full rounded-[13px] border border-blue-200/25 bg-[#031a3b]/75 pl-[50px] pr-[50px] text-[13px] font-semibold text-white outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-medium placeholder:text-blue-100/40 hover:border-blue-200/40 focus:border-cyan-200/65 focus:bg-[#05204a]/80 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.07),0_8px_30px_rgba(0,0,0,0.08)]"
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-100/70 transition-all duration-300 hover:scale-110 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-[20px] w-[20px]" />
                        ) : (
                          <Eye className="h-[20px] w-[20px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMEMBER */}

                  <label className="remember-wrapper group flex w-fit cursor-pointer select-none items-center gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />

                    <span
                      className={`remember-box flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-300 ${
                        rememberMe
                          ? 'border-blue-300 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.35)]'
                          : 'border-blue-200/40 bg-[#031a3b]/80 group-hover:border-blue-200/70'
                      }`}
                    >
                      {rememberMe && (
                        <Check
                          strokeWidth={3.2}
                          className="remember-check h-[13px] w-[13px] text-white"
                        />
                      )}
                    </span>

                    <span className="text-[12px] font-semibold text-blue-50/85 transition-colors duration-300 group-hover:text-white">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  {/* LOGIN BUTTON */}

                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="login-submit group relative flex h-[50px] w-full items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-r from-[#ffc928] via-[#ffd74d] to-[#ffc928] text-[13px] font-black text-[#061d42] shadow-[0_10px_28px_rgba(255,201,40,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_38px_rgba(255,201,40,0.38)] disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className="login-button-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[35%] rotate-[22deg] bg-gradient-to-r from-transparent via-white/75 to-transparent" />

                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#061d42]/25 border-t-[#061d42]" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-3">
                        Đăng nhập

                      </span>
                    )}
                  </button>
                </form>

                {/* DIVIDER */}

                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-200/25" />

                  <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/55">
                    Hoặc tiếp tục với
                  </span>

                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-200/25" />
                </div>

                {/* GOOGLE */}

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="google-button group flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[12px] border border-blue-200/20 bg-white/[0.06] text-[12px] font-bold text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/35 hover:bg-white/[0.1] disabled:pointer-events-none disabled:opacity-60"
                >
                  <svg
                    className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />

                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />

                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />

                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>

                  Tiếp tục với Google
                </button>

                {/* ==================================================
                    REGISTER
                    GIỮ NGUYÊN ROUTE REGISTER
                ================================================== */}

                <div className="mt-3 flex items-center justify-center gap-1.5 pb-0.5 text-[11px] font-semibold text-blue-50/80">
                  <span>Chưa có tài khoản?</span>

                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="register-link group inline-flex items-center gap-1.5 font-black text-[#ffc928] transition-colors duration-300 hover:text-[#ffdf68]"
                  >
                    <span className="relative">
                      Đăng ký ngay

                      <span className="register-line absolute -bottom-1 left-0 h-[1.5px] w-0 rounded-full bg-[#ffc928] transition-all duration-300 group-hover:w-full" />
                    </span>

                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ============================================================
          ANIMATION CSS
      ============================================================ */}

      <style>{`
        @keyframes backgroundBreathing {
          0%, 100% {
            transform: scale(1.012) translate3d(0, 0, 0);
            filter: saturate(.98) contrast(.98);
          }

          50% {
            transform: scale(1.032) translate3d(-.2%, -.1%, 0);
            filter: saturate(1.03) contrast(.98);
          }
        }

        .login-background {
          animation: backgroundBreathing 20s ease-in-out infinite;
          will-change: transform, filter;
        }

        .login-vignette {
          background:
            radial-gradient(
              ellipse at 48% 48%,
              rgba(4,22,55,0) 20%,
              rgba(3,17,43,.025) 58%,
              rgba(0,8,28,.18) 100%
            );
        }

        @keyframes softCenter {
          0%, 100% {
            opacity: .45;
            transform: translate3d(-20px,0,0) scale(1);
          }

          50% {
            opacity: .8;
            transform: translate3d(25px,10px,0) scale(1.08);
          }
        }

        .login-soft-center {
          animation: softCenter 10s ease-in-out infinite;
        }

        @keyframes headerReveal {
          from {
            opacity: 0;
            transform: translateY(-14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          animation: headerReveal .8s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes lightOne {
          0%, 100% {
            transform: translateX(-20px) rotate(17deg);
            opacity: .3;
          }

          50% {
            transform: translateX(70px) rotate(12deg);
            opacity: .5;
          }
        }

        @keyframes lightTwo {
          0%, 100% {
            transform: translateX(20px) rotate(-12deg);
            opacity: .25;
          }

          50% {
            transform: translateX(-60px) rotate(-8deg);
            opacity: .45;
          }
        }

        .login-light-one {
          animation: lightOne 13s ease-in-out infinite;
        }

        .login-light-two {
          animation: lightTwo 15s ease-in-out infinite;
        }

        @keyframes blueGlow {
          0%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }

          50% {
            transform: translate3d(80px,35px,0) scale(1.13);
          }
        }

        @keyframes goldGlow {
          0%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }

          50% {
            transform: translate3d(-60px,-30px,0) scale(1.15);
          }
        }

        .login-blue-glow {
          animation: blueGlow 14s ease-in-out infinite;
        }

        .login-gold-glow {
          animation: goldGlow 16s ease-in-out infinite;
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: .2;
          }

          50% {
            transform: translateY(-16px) scale(1.35);
            opacity: .8;
          }
        }

        .login-particle {
          animation: particleFloat 4.5s ease-in-out infinite;
          box-shadow: 0 0 14px currentColor;
        }

        .particle-2 {
          animation-delay: .9s;
        }

        .particle-3 {
          animation-delay: 1.8s;
        }

        .particle-4 {
          animation-delay: 2.5s;
        }

        @keyframes contentReveal {
          from {
            opacity: 0;
            transform: translate3d(-25px,14px,0);
          }

          to {
            opacity: 1;
            transform: translate3d(0,0,0);
          }
        }

        .login-reveal-1,
        .login-reveal-2,
        .login-reveal-3,
        .login-reveal-4,
        .login-reveal-5 {
          opacity: 0;
          animation: contentReveal .8s cubic-bezier(.16,1,.3,1) forwards;
        }

        .login-reveal-1 {
          animation-delay: .1s;
        }

        .login-reveal-2 {
          animation-delay: .2s;
        }

        .login-reveal-3 {
          animation-delay: .3s;
        }

        .login-reveal-4 {
          animation-delay: .4s;
        }

        .login-reveal-5 {
          animation-delay: .5s;
        }

        @keyframes titleLine {
          from {
            transform: scaleX(0);
          }

          to {
            transform: scaleX(1);
          }
        }

        .login-title-line {
          transform-origin: left;
          animation: titleLine .9s .8s cubic-bezier(.16,1,.3,1) both;
        }

        .feature-card {
          transition:
            transform .35s ease,
            border-color .35s ease,
            background-color .35s ease,
            box-shadow .35s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(147,197,253,.4);
          background: rgba(10,48,103,.74);
          box-shadow: 0 16px 35px rgba(0,0,0,.16);
        }

        .feature-icon {
          transition:
            transform .35s cubic-bezier(.16,1,.3,1),
            box-shadow .35s ease;
        }

        .feature-card:hover .feature-icon {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 12px 28px rgba(37,99,235,.45);
        }

        @keyframes cardReveal {
          0% {
            opacity: 0;
            transform: translate3d(30px,18px,0) scale(.98);
          }

          100% {
            opacity: 1;
            transform: translate3d(0,0,0) scale(1);
          }
        }

        .login-card-wrapper {
          animation: cardReveal .95s .15s cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes cardGlow {
          0%, 100% {
            opacity: .45;
          }

          50% {
            opacity: .8;
          }
        }

        .login-card-glow {
          animation: cardGlow 5s ease-in-out infinite;
        }

        @keyframes cardOrb {
          0%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }

          50% {
            transform: translate3d(-22px,20px,0) scale(1.14);
          }
        }

        .login-card-orb {
          animation: cardOrb 9s ease-in-out infinite;
        }

        @keyframes orbitRotate {
          from {
            transform: rotate(0deg) scaleY(.45);
          }

          to {
            transform: rotate(360deg) scaleY(.45);
          }
        }

        @keyframes orbitRotateReverse {
          from {
            transform: rotate(360deg) scaleY(.58);
          }

          to {
            transform: rotate(0deg) scaleY(.58);
          }
        }

        .login-orbit {
          animation: orbitRotate 14s linear infinite;
        }

        .login-orbit-two {
          animation: orbitRotateReverse 11s linear infinite;
        }

        @keyframes orbitDot {
          0%, 100% {
            transform: translateY(0) scale(1);
          }

          50% {
            transform: translateY(-7px) scale(1.3);
          }
        }

        .orbit-dot {
          animation: orbitDot 2.8s ease-in-out infinite;
        }

        .login-input {
          transition: transform .25s ease;
        }

        .login-input:focus-within {
          transform: translateY(-2px);
        }

        @keyframes rememberCheck {
          0% {
            opacity: 0;
            transform: scale(.35) rotate(-20deg);
          }

          70% {
            transform: scale(1.15) rotate(3deg);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        .remember-check {
          animation: rememberCheck .25s cubic-bezier(.16,1,.3,1) both;
        }

        .remember-box:hover {
          transform: scale(1.06);
        }

        @keyframes buttonShine {
          0% {
            left: -70%;
          }

          30%, 100% {
            left: 145%;
          }
        }

        .login-button-shine {
          animation: buttonShine 4.8s ease-in-out infinite;
        }

        @keyframes errorReveal {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-error {
          animation: errorReveal .3s ease-out both;
        }

        /* ============================================================
           HEIGHT RESPONSIVE
           Giữ desktop vừa đúng 100% màn hình, không phải scroll
        ============================================================ */

        @media (min-width:1024px) and (max-height:850px) {
          .mseek-login main {
            padding-top: 2px;
            padding-bottom: 2px;
          }

          .login-left-content {
            transform: scale(.90);
            transform-origin: left center;
          }

          .login-card-wrapper {
            transform: scale(.92);
            transform-origin: right center;
          }
        }

        @media (min-width:1024px) and (max-height:760px) {
          .login-left-content {
            transform: scale(.82);
          }

          .login-card-wrapper {
            transform: scale(.84);
          }

          .login-header {
            height: 60px;
          }
        }

        @media (min-width:1024px) and (max-height:680px) {
          .login-left-content {
            transform: scale(.74);
          }

          .login-card-wrapper {
            transform: scale(.76);
          }

          .login-header {
            height: 52px;
          }
        }

        /* ============================================================
           TABLET / MOBILE
        ============================================================ */

        @media (max-width:1023px) {
          .mseek-login {
            height: auto;
            min-height: 100svh;
            overflow-y: auto;
          }

          .login-card-wrapper {
            margin-top: 18px;
            margin-bottom: 24px;
          }
        }

        /* ============================================================
           ACCESSIBILITY
        ============================================================ */

        @media (prefers-reduced-motion:reduce) {
          .login-background,
          .login-soft-center,
          .login-light-one,
          .login-light-two,
          .login-blue-glow,
          .login-gold-glow,
          .login-particle,
          .login-card-glow,
          .login-card-orb,
          .login-orbit,
          .login-orbit-two,
          .orbit-dot,
          .login-button-shine {
            animation: none !important;
          }

          .login-reveal-1,
          .login-reveal-2,
          .login-reveal-3,
          .login-reveal-4,
          .login-reveal-5 {
            opacity: 1;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};