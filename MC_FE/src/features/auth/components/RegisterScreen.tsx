import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
  Users,
  WandSparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { ScreenType } from '../../../types';
import { ToastType } from '../../../components/common/Toast';
import { useRegisterMutation } from '../hooks/useAuthQueries';

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
  // ============================================================
  // STATE
  // ============================================================

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // MUTATION
  // ============================================================

  const registerMutation = useRegisterMutation();

  // ============================================================
  // PASSWORD STRENGTH
  // ============================================================

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

  const getStrengthLabel = () => {
    if (!password) return '';
    if (strength < 40) return 'Yếu';
    if (strength < 80) return 'Tốt';
    return 'Mạnh';
  };

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-rose-500';
    if (strength < 80) return 'bg-[#ffc928]';
    return 'bg-emerald-400';
  };

  // ============================================================
  // REGISTER
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      const msg = 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.';

      setError(msg);
      onToast?.('Lỗi xác thực', msg, 'warning');

      return;
    }

    if (!agreedTerms) {
      const msg =
        'Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.';

      setError(msg);
      onToast?.('Chưa đồng ý điều khoản', msg, 'warning');

      return;
    }

    setError(null);

    registerMutation.mutate(
      {
        fullName: name,
        email,
        password,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            onRegisterSuccess(result.data);
          } else {
            const msg =
              result.errors && result.errors.length > 0
                ? result.errors.join(', ')
                : result.message || 'Đăng ký thất bại.';

            setError(msg);
            onToast?.('Đăng ký thất bại', msg, 'error');
          }
        },

        onError: (err: any) => {
          const msg =
            err.errors && err.errors.length > 0
              ? err.errors.join(', ')
              : err.message ||
                'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.';

          setError(msg);
          onToast?.('Lỗi kết nối', msg, 'error');
        },
      },
    );
  };

  const isLoading = registerMutation.isPending;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      id="register-screen"
      className="register-page relative h-[100dvh] min-h-[600px] w-full overflow-hidden bg-[#020d24] text-white"
    >
      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="absolute inset-0">
        <img
          src="/images/backgroundRegister.png"
          alt=""
          aria-hidden="true"
          className="register-background absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#02102b]/45 via-[#031431]/10 to-[#020d24]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#01091c]/45 via-transparent to-[#02142d]/10" />
        <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,8,30,0.55)]" />
      </div>

      {/* ========================================================
          MOVING LIGHTS
      ======================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="register-glow-blue absolute -left-[180px] top-[15%] h-[440px] w-[440px] rounded-full bg-blue-500/10 blur-[130px]" />

        <div className="register-glow-cyan absolute right-[22%] top-[-180px] h-[390px] w-[390px] rounded-full bg-cyan-300/[0.07] blur-[130px]" />

        <div className="register-glow-yellow absolute bottom-[-200px] left-[25%] h-[390px] w-[390px] rounded-full bg-[#ffc928]/10 blur-[130px]" />

        <span className="particle particle-1 absolute left-[13%] top-[18%] h-2 w-2 rounded-full bg-[#ffc928]" />
        <span className="particle particle-2 absolute left-[44%] top-[10%] h-1.5 w-1.5 rounded-full bg-cyan-300" />
        <span className="particle particle-3 absolute bottom-[15%] left-[33%] h-2 w-2 rounded-full bg-blue-400" />
        <span className="particle particle-4 absolute right-[9%] top-[28%] h-2.5 w-2.5 rounded-full bg-[#ffc928]" />
        <span className="particle particle-5 absolute bottom-[8%] right-[16%] h-1.5 w-1.5 rounded-full bg-cyan-300" />
      </div>

      {/* ========================================================
          LIGHT TRAILS
      ======================================================== */}

      <div className="register-gold-trail pointer-events-none absolute -bottom-[120px] left-[-5%] h-[230px] w-[115%] rotate-[-3deg] rounded-[50%] border-t-2 border-[#ffc928]/40 shadow-[0_-4px_25px_rgba(255,201,40,0.20)]" />

      <div className="register-blue-trail pointer-events-none absolute -bottom-[155px] left-[20%] h-[220px] w-[100%] rotate-[-5deg] rounded-[50%] border-t-2 border-blue-400/35 shadow-[0_-4px_30px_rgba(59,130,246,0.25)]" />

      {/* ========================================================
          LOGO
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="register-logo absolute left-[4%] top-[3%] z-30 overflow-hidden rounded-[20px] border border-white/10 bg-[#04162f]/60 shadow-[0_15px_45px_rgba(0,0,0,0.30)] backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:scale-[1.03]"
      >
        <img
          src="/images/logo/mseekk-logo.png"
          alt="MSEEK"
          className="h-[65px] w-[85px] object-cover"
        />
      </button>

      {/* ========================================================
          BACK HOME
      ======================================================== */}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="back-home-button absolute right-[4%] top-[3%] z-40 flex items-center gap-2.5 rounded-[15px] border border-cyan-300/25 bg-[#052657]/70 px-4 py-2.5 text-[13px] font-black text-white shadow-[0_12px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition-all duration-300 hover:-translate-x-1 hover:border-cyan-300/50 hover:bg-[#0a3775]/80"
      >
        <ArrowLeft className="h-[18px] w-[18px] text-cyan-300" />
        <span>Về trang chủ</span>
      </button>

      {/* ========================================================
          MAIN LAYOUT
      ======================================================== */}

      <main className="relative z-20 mx-auto grid h-full w-full max-w-[1540px] grid-cols-1 items-center px-[5%] pt-[2.5%] lg:grid-cols-[1.2fr_0.8fr] lg:gap-[5%]">
        {/* ======================================================
            LEFT SIDE
        ====================================================== */}

        <section className="register-left hidden max-w-[630px] lg:block">
          {/* BADGE */}

          <div className="register-item register-delay-1 inline-flex items-center gap-2.5 rounded-full border border-cyan-300/55 bg-[#12365f]/75 px-4 py-2.5 shadow-[0_8px_30px_rgba(34,211,238,0.08)] backdrop-blur-md">
            <WandSparkles className="h-[18px] w-[18px] text-cyan-300" />

            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white">
              Nền tảng luyện giọng MC hàng đầu
            </span>
          </div>

          {/* HEADING */}

          <h1 className="register-item register-delay-2 mt-5 max-w-[680px] text-[45px] font-black leading-[0.98] tracking-[-0.045em] text-white xl:text-[52px]">
            Bắt đầu hành trình

            <span className="relative mt-2 block w-fit text-[#ffc928]">
              Làm chủ giọng nói

              <span className="absolute -bottom-2 left-0 h-[3px] w-[62%] rounded-full bg-gradient-to-r from-[#ffc928] to-transparent" />
            </span>
          </h1>

          {/* DESCRIPTION */}

          <p className="register-item register-delay-3 mt-5 max-w-[640px] text-[14px] font-semibold leading-[1.7] text-white/85 xl:text-[15px]">
            Học tập cùng AI hiện đại, giảng viên chuyên nghiệp và cộng đồng
            đam mê để phát triển giọng nói, phong thái và bản lĩnh sân khấu.
          </p>

          {/* ====================================================
              FEATURE CARDS
          ==================================================== */}

          <div className="register-item register-delay-4 mt-5 grid max-w-[660px] grid-cols-3 gap-3">
            {/* AI */}

            <div className="feature-card group flex min-h-[80px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/75 px-3.5 py-3 backdrop-blur-xl">
              <div className="feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
                <Sparkles className="h-[21px] w-[21px]" />
              </div>

              <span className="text-[12px] font-black leading-[1.45] xl:text-[13px]">
                Luyện giọng
                <br />
                cùng AI
              </span>
            </div>

            {/* INSTRUCTOR */}

            <div className="feature-card group flex min-h-[80px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/75 px-3.5 py-3 backdrop-blur-xl">
              <div className="feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
                <Users className="h-[21px] w-[21px]" />
              </div>

              <span className="text-[12px] font-black leading-[1.45] xl:text-[13px]">
                Giảng viên
                <br />
                chuyên nghiệp
              </span>
            </div>

            {/* ROADMAP */}

            <div className="feature-card group flex min-h-[80px] items-center gap-3 rounded-[17px] border border-blue-300/15 bg-[#082656]/75 px-3.5 py-3 backdrop-blur-xl">
              <div className="feature-icon flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
                <BarChart3 className="h-[21px] w-[21px]" />
              </div>

              <span className="text-[12px] font-black leading-[1.45] xl:text-[13px]">
                Lộ trình
                <br />
                cá nhân hóa
              </span>
            </div>
          </div>

          {/* ====================================================
              QUOTE
          ==================================================== */}

          <div className="register-item register-delay-5 mt-4 flex max-w-[520px] items-center gap-4 rounded-[18px] border border-blue-300/15 bg-[#08234e]/85 px-5 py-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.20)] backdrop-blur-xl">
            <div className="text-[20px] font-black leading-none text-cyan-300">
              ”
            </div>

            <div>
              <p className="text-[11px] font-medium italic leading-6 text-white/90">
                “Mỗi giọng nói đều xứng đáng được lắng nghe và có thể tạo ra
                những thay đổi tích cực.”
              </p>

              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                MSEEK
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================
            REGISTER FORM
        ====================================================== */}

        <section className="register-panel relative ml-auto w-full max-w-[500px] overflow-hidden rounded-[26px] border border-cyan-300/35 bg-[#062654]/80 shadow-[0_30px_100px_rgba(0,0,0,0.45),0_0_40px_rgba(59,130,246,0.12)] backdrop-blur-[24px]">
          {/* MOVING BORDER */}

          <div className="register-panel-shine pointer-events-none absolute inset-[-2px] rounded-[28px]" />

          {/* INNER GRADIENT */}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/[0.09] via-transparent to-[#ffc928]/[0.04]" />

          {/* DECORATIVE ORBIT */}

          <div className="pointer-events-none absolute -right-[75px] top-[65px] h-[190px] w-[190px] rounded-full border border-[#ffc928]/25" />

          <div className="register-orbit pointer-events-none absolute -right-[18px] top-[105px] h-[165px] w-[165px] rounded-full border border-cyan-300/15" />

          <span className="register-orbit-dot pointer-events-none absolute right-[22px] top-[145px] h-2.5 w-2.5 rounded-full bg-[#ffc928] shadow-[0_0_18px_rgba(255,201,40,0.85)]" />

          {/* FORM CONTENT */}

          <div className="relative z-10 px-7 py-5 xl:px-8 xl:py-5">
            {/* HEADER */}

            <div className="form-reveal form-delay-1">
              <div className="flex items-center gap-2.5">
                <span className="h-[3px] w-8 rounded-full bg-[#ffc928]" />

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                  Bắt đầu hành trình
                </span>
              </div>

              <h2 className="mt-2 text-[31px] font-black leading-none tracking-[-0.04em] text-white xl:text-[35px]">
                Tạo tài khoản
              </h2>

              <p className="mt-2 max-w-[410px] text-[11px] font-medium leading-[1.55] text-blue-100/75">
                Tham gia MSEEK và bắt đầu hành trình làm chủ giọng nói của
                riêng bạn.
              </p>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-3 rounded-[11px] border border-rose-400/25 bg-rose-500/10 px-3.5 py-2 text-[10px] font-bold text-rose-200">
                {error}
              </div>
            )}

            {/* ==================================================
                FORM
            ================================================== */}

            <form onSubmit={handleSubmit} className="mt-3.5 space-y-[8px]">
              {/* NAME */}

              <div className="form-reveal form-delay-2">
                <label className="mb-1 block text-[10px] font-black text-white">
                  Họ và tên
                </label>

                <div className="input-wrapper relative">
                  <User className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-blue-200" />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    required
                    autoComplete="name"
                    className="register-input h-[42px] w-full rounded-[12px] border border-blue-300/25 bg-[#021b3e]/85 pl-[43px] pr-4 text-[11px] font-semibold text-white outline-none placeholder:text-blue-100/35"
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div className="form-reveal form-delay-3">
                <label className="mb-1 block text-[10px] font-black text-white">
                  Email
                </label>

                <div className="input-wrapper relative">
                  <Mail className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-blue-200" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập địa chỉ email của bạn"
                    required
                    autoComplete="email"
                    className="register-input h-[42px] w-full rounded-[12px] border border-blue-300/25 bg-[#021b3e]/85 pl-[43px] pr-4 text-[11px] font-semibold text-white outline-none placeholder:text-blue-100/35"
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="form-reveal form-delay-4">
                <label className="mb-1 block text-[10px] font-black text-white">
                  Mật khẩu
                </label>

                <div className="input-wrapper relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-blue-200" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    required
                    autoComplete="new-password"
                    className="register-input h-[42px] w-full rounded-[12px] border border-blue-300/25 bg-[#021b3e]/85 pl-[43px] pr-[43px] text-[11px] font-semibold text-white outline-none placeholder:text-blue-100/35"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-200/70 transition-colors hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[16px] w-[16px]" />
                    ) : (
                      <Eye className="h-[16px] w-[16px]" />
                    )}
                  </button>
                </div>

                {/* PASSWORD STRENGTH */}

                {password && (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 75, 100].map((level) => (
                        <div
                          key={level}
                          className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              strength >= level
                                ? getStrengthColor()
                                : 'bg-transparent'
                            }`}
                          />
                        </div>
                      ))}

                      <span
                        className={`ml-1 min-w-[32px] text-right text-[8px] font-black ${
                          strength < 40
                            ? 'text-rose-300'
                            : strength < 80
                              ? 'text-[#ffc928]'
                              : 'text-emerald-300'
                        }`}
                      >
                        {getStrengthLabel()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIRM PASSWORD */}

              <div className="form-reveal form-delay-5">
                <label className="mb-1 block text-[10px] font-black text-white">
                  Xác nhận mật khẩu
                </label>

                <div className="input-wrapper relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-blue-200" />

                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu của bạn"
                    required
                    autoComplete="new-password"
                    className="register-input h-[42px] w-full rounded-[12px] border border-blue-300/25 bg-[#021b3e]/85 pl-[43px] pr-[43px] text-[11px] font-semibold text-white outline-none placeholder:text-blue-100/35"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-200/70 transition-colors hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-[16px] w-[16px]" />
                    ) : (
                      <Eye className="h-[16px] w-[16px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* ==================================================
                  TERMS
              ================================================== */}

              <label className="form-reveal form-delay-6 flex cursor-pointer items-start gap-2 pt-0.5 text-[8px] font-medium leading-[16px] text-blue-100/75">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  required
                  className="peer sr-only"
                />

                <span className="mt-[1px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border border-blue-300/35 bg-[#021b3e] transition-all peer-checked:border-blue-400 peer-checked:bg-blue-500">
                  {agreedTerms && (
                    <Check className="h-[11px] w-[11px] text-white" />
                  )}
                </span>

                <span>
                  Tôi đồng ý với{' '}
                  <a
                    href="#terms"
                    onClick={(e) => e.stopPropagation()}
                    className="font-black text-[#ffc928] hover:underline"
                  >
                    Điều khoản dịch vụ
                  </a>{' '}
                  và{' '}
                  <a
                    href="#privacy"
                    onClick={(e) => e.stopPropagation()}
                    className="font-black text-[#ffc928] hover:underline"
                  >
                    Chính sách bảo mật
                  </a>
                </span>
              </label>

              {/* ==================================================
                  REGISTER BUTTON
              ================================================== */}

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isLoading}
                className="register-button group relative flex h-[46px] w-full items-center justify-center overflow-hidden rounded-[13px] bg-[#ffc928] text-[#041a3c] shadow-[0_15px_40px_rgba(255,201,40,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64c] hover:shadow-[0_20px_45px_rgba(255,201,40,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="register-button-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[32%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

                {isLoading ? (
                  <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-[#041a3c]/20 border-t-[#041a3c]" />
                ) : (
                  <span className="relative z-10 flex items-center gap-3">
                    <span className="text-[12px] font-black">
                      Tạo tài khoản
                    </span>

                    
                  </span>
                )}
              </button>
            </form>

            {/* ====================================================
                LOGIN
            ==================================================== */}

            <div className="form-reveal form-delay-7 mt-3 flex items-center justify-center gap-1.5 border-t border-blue-100/10 pt-3 text-[10px] font-semibold text-blue-100/75">
              <span>Đã có tài khoản?</span>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="group flex items-center gap-1.5 font-black text-[#ffc928] transition-colors hover:text-[#ffdc5d]"
              >
                Đăng nhập ngay

                <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          CSS ANIMATIONS
      ======================================================== */}

      <style>{`
        /* =====================================================
           BACKGROUND
        ===================================================== */

        @keyframes registerBackground {
          0%, 100% {
            transform: scale(1.01);
          }

          50% {
            transform: scale(1.04);
          }
        }

        .register-background {
          animation: registerBackground 18s ease-in-out infinite;
          will-change: transform;
        }

        /* =====================================================
           GLOWS
        ===================================================== */

        @keyframes glowBlue {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: .55;
          }

          50% {
            transform: translate3d(70px, -30px, 0);
            opacity: .9;
          }
        }

        @keyframes glowCyan {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-60px, 50px, 0);
          }
        }

        @keyframes glowYellow {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(50px, -35px, 0) scale(1.12);
          }
        }

        .register-glow-blue {
          animation: glowBlue 10s ease-in-out infinite;
        }

        .register-glow-cyan {
          animation: glowCyan 12s ease-in-out infinite;
        }

        .register-glow-yellow {
          animation: glowYellow 13s ease-in-out infinite;
        }

        /* =====================================================
           PARTICLES
        ===================================================== */

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: .45;
          }

          50% {
            transform: translateY(-22px) scale(1.25);
            opacity: 1;
          }
        }

        .particle {
          box-shadow: 0 0 18px currentColor;
          animation: particleFloat 5s ease-in-out infinite;
        }

        .particle-2 {
          animation-delay: .8s;
        }

        .particle-3 {
          animation-delay: 1.6s;
        }

        .particle-4 {
          animation-delay: 2.3s;
        }

        .particle-5 {
          animation-delay: 3.1s;
        }

        /* =====================================================
           LIGHT TRAILS
        ===================================================== */

        @keyframes trailGlow {
          0%, 100% {
            opacity: .35;
            transform: translateX(-1%) rotate(-3deg);
          }

          50% {
            opacity: .8;
            transform: translateX(2%) rotate(-3deg);
          }
        }

        .register-gold-trail {
          animation: trailGlow 7s ease-in-out infinite;
        }

        @keyframes blueTrail {
          0%, 100% {
            opacity: .3;
          }

          50% {
            opacity: .7;
          }
        }

        .register-blue-trail {
          animation: blueTrail 8s ease-in-out infinite;
        }

        /* =====================================================
           LOGO
        ===================================================== */

        @keyframes logoReveal {
          from {
            opacity: 0;
            transform: translateY(-18px) scale(.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .register-logo {
          animation: logoReveal .8s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           BACK BUTTON
        ===================================================== */

        @keyframes backReveal {
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
          animation: backReveal .8s .15s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           LEFT CONTENT REVEAL
        ===================================================== */

        @keyframes contentReveal {
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

        .register-item {
          opacity: 0;
          animation: contentReveal .8s cubic-bezier(.16,1,.3,1) forwards;
        }

        .register-delay-1 {
          animation-delay: .15s;
        }

        .register-delay-2 {
          animation-delay: .25s;
        }

        .register-delay-3 {
          animation-delay: .35s;
        }

        .register-delay-4 {
          animation-delay: .45s;
        }

        .register-delay-5 {
          animation-delay: .55s;
        }

        /* =====================================================
           FEATURE CARDS
        ===================================================== */

        .feature-card {
          transition:
            transform .35s cubic-bezier(.16,1,.3,1),
            border-color .35s ease,
            background .35s ease,
            box-shadow .35s ease;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(103,232,249,.35);
          background: rgba(14,55,112,.85);
          box-shadow:
            0 18px 40px rgba(0,0,0,.22),
            0 0 25px rgba(59,130,246,.12);
        }

        .feature-icon {
          transition: transform .35s cubic-bezier(.16,1,.3,1);
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.08) rotate(-4deg);
        }

        /* =====================================================
           REGISTER PANEL
        ===================================================== */

        @keyframes panelReveal {
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

        .register-panel {
          animation: panelReveal .9s .15s cubic-bezier(.16,1,.3,1) both;
        }

        /* =====================================================
           PANEL BORDER GLOW
        ===================================================== */

        @keyframes panelGlow {
          0%, 100% {
            opacity: .3;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.15),
              0 0 20px rgba(59,130,246,.08);
          }

          50% {
            opacity: .75;
            box-shadow:
              inset 0 0 0 1px rgba(103,232,249,.3),
              0 0 35px rgba(59,130,246,.18);
          }
        }

        .register-panel-shine {
          animation: panelGlow 4s ease-in-out infinite;
        }

        /* =====================================================
           ORBIT
        ===================================================== */

        @keyframes orbitRotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .register-orbit {
          animation: orbitRotate 22s linear infinite;
        }

        @keyframes orbitDot {
          0%, 100% {
            transform: translateY(0);
            opacity: .7;
          }

          50% {
            transform: translateY(36px);
            opacity: 1;
          }
        }

        .register-orbit-dot {
          animation: orbitDot 5s ease-in-out infinite;
        }

        /* =====================================================
           FORM REVEAL
        ===================================================== */

        @keyframes formReveal {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-reveal {
          opacity: 0;
          animation: formReveal .65s cubic-bezier(.16,1,.3,1) forwards;
        }

        .form-delay-1 { animation-delay: .30s; }
        .form-delay-2 { animation-delay: .38s; }
        .form-delay-3 { animation-delay: .46s; }
        .form-delay-4 { animation-delay: .54s; }
        .form-delay-5 { animation-delay: .62s; }
        .form-delay-6 { animation-delay: .70s; }
        .form-delay-7 { animation-delay: .78s; }

        /* =====================================================
           INPUTS
        ===================================================== */

        .register-input {
          transition:
            border-color .25s ease,
            background .25s ease,
            box-shadow .25s ease,
            transform .25s ease;
        }

        .register-input:hover {
          border-color: rgba(147,197,253,.4);
          background: rgba(3,32,72,.95);
        }

        .register-input:focus {
          border-color: rgba(103,232,249,.75);
          background: rgba(3,32,72,.98);
          box-shadow:
            0 0 0 3px rgba(34,211,238,.08),
            0 10px 30px rgba(0,0,0,.15),
            0 0 22px rgba(34,211,238,.08);
          transform: translateY(-1px);
        }

        .input-wrapper:focus-within svg {
          color: rgb(103 232 249);
          filter: drop-shadow(0 0 6px rgba(34,211,238,.35));
        }

        /* =====================================================
           BUTTON
        ===================================================== */

        @keyframes buttonShine {
          0% {
            left: -70%;
          }

          45%, 100% {
            left: 145%;
          }
        }

        .register-button-shine {
          animation: buttonShine 4.5s ease-in-out infinite;
        }

        /* =====================================================
           SHORT DESKTOP
        ===================================================== */

        @media (max-height: 850px) and (min-width: 1024px) {
          .register-page {
            min-height: 600px;
          }

          .register-logo {
            top: 2%;
          }

          .back-home-button {
            top: 2%;
          }

          .register-page main {
            padding-top: 1.5%;
          }

          .register-panel {
            max-width: 480px;
          }

          .register-panel > div:last-child {
            padding-top: 16px;
            padding-bottom: 16px;
          }

          .register-panel h2 {
            font-size: 30px;
          }

          .register-input {
            height: 40px;
          }

          .register-left h1 {
            font-size: 44px;
          }
        }

        @media (max-height: 740px) and (min-width: 1024px) {
          .register-panel {
            max-width: 465px;
          }

          .register-panel > div:last-child {
            padding-top: 13px;
            padding-bottom: 13px;
          }

          .register-panel h2 {
            font-size: 28px;
          }

          .register-input {
            height: 38px;
          }

          .register-left h1 {
            font-size: 41px;
          }

          .register-left p {
            line-height: 1.5;
          }
        }

        /* =====================================================
           MOBILE / TABLET
        ===================================================== */

        @media (max-width: 1023px) {
          .register-page {
            height: auto;
            min-height: 100dvh;
            overflow-y: auto;
          }

          .register-background {
            position: fixed;
          }

          .register-logo {
            left: 20px;
            top: 20px;
          }

          .register-logo img {
            width: 96px;
            height: 64px;
          }

          .back-home-button {
            right: 20px;
            top: 26px;
          }

          .register-page main {
            display: block;
            padding: 115px 20px 35px;
          }

          .register-panel {
            margin: 0 auto;
            max-width: 500px;
          }
        }

        @media (max-width: 560px) {
          .back-home-button {
            padding: 9px 11px;
            font-size: 10px;
          }

          .register-panel {
            border-radius: 22px;
          }

          .register-panel > div:last-child {
            padding: 22px 18px;
          }

          .register-panel h2 {
            font-size: 28px;
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .register-background,
          .register-glow-blue,
          .register-glow-cyan,
          .register-glow-yellow,
          .particle,
          .register-gold-trail,
          .register-blue-trail,
          .register-logo,
          .back-home-button,
          .register-item,
          .register-panel,
          .register-panel-shine,
          .register-orbit,
          .register-orbit-dot,
          .form-reveal,
          .register-button-shine {
            animation: none !important;
          }

          .register-item,
          .form-reveal {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};