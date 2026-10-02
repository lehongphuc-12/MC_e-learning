import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronRight,
  Crown,
  Headphones,
  Heart,
  Mail,
  MapPin,
  Mic2,
  Phone,
  Send,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { ScreenType } from '../types';

interface FooterProps {
  onNavigate: (screen: ScreenType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã đăng ký nhận thông tin từ MSEEK!');
  };

  const linkClass =
    'footer-link group flex items-center gap-2 text-[11px] font-medium text-slate-400 transition-all duration-300 hover:translate-x-1 hover:text-white';

  const courseLinks = [
    'Luyện phát âm',
    'Kỹ thuật giọng nói',
    'Ngữ điệu & nhịp điệu',
    'Làm chủ hơi thở',
    'Luyện giọng MC',
  ];

  const supportLinks = [
    'Trung tâm trợ giúp',
    'Điều khoản dịch vụ',
    'Chính sách bảo mật',
    'Chính sách hoàn tiền',
    'Câu hỏi thường gặp',
  ];

  return (
    <footer
      id="main-footer"
      className="relative overflow-hidden border-t border-blue-900/40 bg-[#020b1d] text-slate-400"
    >
      {/* =========================================================
          BACKGROUND
      ========================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="footer-grid absolute inset-0 opacity-[0.025]" />

        <div className="footer-global-glow absolute -left-[180px] top-[100px] h-[380px] w-[380px] rounded-full bg-blue-600/[0.08] blur-[130px]" />

        <div className="footer-global-glow-two absolute -right-[160px] top-[80px] h-[380px] w-[380px] rounded-full bg-cyan-400/[0.05] blur-[130px]" />

        <span className="footer-star footer-star-1" />
        <span className="footer-star footer-star-2" />
        <span className="footer-star footer-star-3" />
      </div>

      {/* =========================================================
          COMPACT NEWSLETTER CTA
      ========================================================== */}
      <div className="relative z-10 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <div className="footer-newsletter relative mx-auto max-w-[1450px] overflow-hidden rounded-[24px] border border-blue-400/30 bg-[#031735] shadow-[0_18px_55px_rgba(0,55,150,0.14)]">

          {/* CTA BACKGROUND */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#073477] via-[#031d43] to-[#020d22]" />

            <div className="newsletter-glow absolute -left-20 -top-24 h-[260px] w-[330px] rounded-full bg-blue-500/20 blur-[95px]" />

            <div className="newsletter-glow-two absolute right-[10%] -top-24 h-[240px] w-[300px] rounded-full bg-cyan-400/[0.07] blur-[95px]" />

            <div className="newsletter-yellow-glow absolute -bottom-24 right-[25%] h-[200px] w-[240px] rounded-full bg-[#ffc928]/[0.06] blur-[80px]" />

            <div className="footer-light-line absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

            <div className="footer-wave footer-wave-one" />
            <div className="footer-wave footer-wave-two" />

            <span className="footer-particle footer-particle-1" />
            <span className="footer-particle footer-particle-2" />
            <span className="footer-particle footer-particle-3" />
          </div>

          {/* CTA CONTENT */}
          <div className="relative z-10 grid grid-cols-1 items-center gap-5 px-6 py-5 sm:px-8 lg:grid-cols-12 lg:px-9 lg:py-5">

            {/* MIC */}
            <div className="hidden lg:col-span-2 lg:flex lg:justify-center">
              <div className="footer-mic-wrapper relative flex h-[105px] w-[105px] items-center justify-center">

                <div className="footer-mic-ring footer-mic-ring-one absolute h-[82px] w-[82px] rounded-full border border-cyan-400/25" />

                <div className="footer-mic-ring footer-mic-ring-two absolute h-[104px] w-[104px] rounded-full border border-blue-400/10" />

                <div className="footer-mic-glow absolute h-[72px] w-[72px] rounded-full bg-blue-500/20 blur-2xl" />

                <div className="footer-mic relative flex h-[64px] w-[64px] items-center justify-center rounded-[20px] border border-blue-300/20 bg-gradient-to-br from-blue-500/20 to-cyan-400/5 shadow-[0_12px_30px_rgba(0,119,255,0.18)] backdrop-blur-xl">
                  <Mic2 className="h-7 w-7 text-cyan-300" />

                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ffc928] shadow-[0_0_12px_rgba(255,201,40,0.9)]" />
                </div>
              </div>
            </div>

            {/* TEXT */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2.5">
                <span className="h-[2px] w-7 rounded-full bg-[#ffc928]" />

                <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd85a]">
                  Đồng hành cùng MSEEK
                </span>
              </div>

              <h3 className="mt-2 text-[23px] font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-[26px]">
                Nâng tầm{' '}
                <span className="text-cyan-300">
                  giọng nói
                </span>
                , làm chủ sân khấu.
              </h3>

              <p className="mt-2 max-w-[540px] text-[10px] font-medium leading-[18px] text-blue-100/60 sm:text-[11px]">
                Nhận mẹo luyện giọng, kỹ thuật phát âm và những nội dung mới
                nhất dành cho MC từ MSEEK.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  {
                    icon: BookOpen,
                    text: 'Kiến thức hữu ích',
                  },
                  {
                    icon: Award,
                    text: 'Nội dung chuyên môn',
                  },
                  {
                    icon: Sparkles,
                    text: 'Cập nhật mới',
                  },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="footer-benefit flex items-center gap-2 rounded-[9px] border border-blue-300/10 bg-white/[0.05] px-3 py-1.5 text-[8px] font-bold text-blue-100/80 backdrop-blur-md"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#ffc928]" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* SUBSCRIBE */}
            <div className="lg:col-span-5">
              <form
  onSubmit={handleSubscribe}
  className="footer-form relative ml-auto w-full max-w-[470px]"
>
  {/* FORM */}
  <div className="relative flex h-[52px] w-full overflow-hidden rounded-[15px] border border-blue-300/20 bg-[#02132e]/80 shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-xl">

    {/* INPUT */}
    <div className="relative flex min-w-0 flex-1 items-center">
      <Mail className="pointer-events-none absolute left-4 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-cyan-300" />

      <input
        type="email"
        required
        placeholder="Nhập địa chỉ email của bạn"
        className="h-full w-full border-0 bg-transparent pl-[48px] pr-3 text-[10px] font-semibold text-white outline-none placeholder:text-blue-100/35"
      />
    </div>

    {/* BUTTON ĐĂNG KÝ */}
    <button
      type="submit"
      className="footer-subscribe-button group relative flex h-full w-[105px] shrink-0 items-center justify-center overflow-hidden bg-[#ffc928] px-3 text-[#061d42] transition-all duration-300 hover:bg-[#ffd64c]"
    >
      {/* LIGHT SHINE */}
      <span className="footer-button-shine pointer-events-none absolute -left-[70%] top-[-100%] h-[300%] w-[35%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <span className="relative z-10 text-[10px] font-black leading-none">
        Đăng ký
      </span>
    </button>
  </div>
</form>

              <div className="mt-6 flex justify-end pr-7">
  <div className="origin-center -rotate-[6deg]">
    <span className="footer-slogan block whitespace-nowrap text-[15px] font-black tracking-[0.04em] text-blue-300/80">
      Speak. Seek. Inspire.
    </span>
  </div>
</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN FOOTER
      ========================================================== */}
      <div className="relative z-10 mx-auto max-w-[1450px] px-5 pb-6 pt-7 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">

          {/* =====================================================
              BRAND
          ====================================================== */}
          <div className="lg:col-span-4">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="footer-logo group relative inline-flex items-center"
            >
              <div className="absolute inset-0 rounded-full bg-cyan-400/15 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative overflow-hidden rounded-full border border-blue-300/20 bg-[#06182e] shadow-[0_10px_30px_rgba(0,110,255,0.14)]">
                <img
                  src="/images/logo/mseekk-logo.png"
                  alt="MSEEK"
                  className="h-[58px] w-[58px] rounded-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="ml-3 text-left">
                <div className="text-[22px] font-black leading-none tracking-[-0.04em] text-white">
                  MSEEK
                </div>

                <div className="mt-1.5 text-[7px] font-black uppercase tracking-[0.26em] text-cyan-300">
                  Speak. Seek. Inspire.
                </div>
              </div>
            </button>

            <p className="mt-4 max-w-[350px] text-[11px] font-medium leading-[1.7] text-slate-400">
              MSEEK là nền tảng đào tạo luyện giọng dành cho MC, giúp học viên
              cải thiện phát âm, ngữ điệu, nhịp điệu, sự tự tin và khả năng
              làm chủ giọng nói trên sân khấu.
            </p>

            {/* BADGES */}
            <div className="mt-4 grid max-w-[350px] grid-cols-3 gap-2">

              <div className="footer-stat group rounded-[12px] border border-blue-900/60 bg-[#06152d]/70 px-2 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30">
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
                  <Shield className="h-3.5 w-3.5 text-cyan-300" />
                </div>

                <div className="mt-1.5 text-[7px] font-bold leading-[11px] text-slate-300">
                  Lộ trình
                  <br />
                  bài bản
                </div>
              </div>

              <div className="footer-stat group rounded-[12px] border border-blue-900/60 bg-[#06152d]/70 px-2 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#ffc928]/30">
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#ffc928]/10">
                  <Crown className="h-3.5 w-3.5 text-[#ffc928]" />
                </div>

                <div className="mt-1.5 text-[7px] font-bold leading-[11px] text-slate-300">
                  Giảng viên
                  <br />
                  chuyên môn
                </div>
              </div>

              <div className="footer-stat group rounded-[12px] border border-blue-900/60 bg-[#06152d]/70 px-2 py-2.5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30">
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
                  <Users className="h-3.5 w-3.5 text-cyan-300" />
                </div>

                <div className="mt-1.5 text-[7px] font-bold leading-[11px] text-slate-300">
                  Cộng đồng
                  <br />
                  học viên
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              COURSES
          ====================================================== */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-cyan-300" />

              <h4 className="text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Khóa học
              </h4>
            </div>

            <div className="mt-2.5 h-[2px] w-9 rounded-full bg-cyan-400" />

            <ul className="mt-4 space-y-2.5">
              {courseLinks.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onNavigate('courses')}
                    className={linkClass}
                  >
                    <span className="flex-1 text-left">
                      {item}
                    </span>

                    <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* =====================================================
              PLATFORM
          ====================================================== */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />

              <h4 className="text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Nền tảng
              </h4>
            </div>

            <div className="mt-2.5 h-[2px] w-9 rounded-full bg-cyan-400" />

            <ul className="mt-4 space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={linkClass}
                >
                  <span>Trang chủ</span>
                  <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className={linkClass}
                >
                  <span>Danh sách khóa học</span>
                  <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('forum')}
                  className={linkClass}
                >
                  <span>Diễn đàn</span>
                  <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className={linkClass}
                >
                  <span>Đăng nhập</span>
                  <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className={linkClass}
                >
                  <span>Đăng ký tài khoản</span>
                  <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </button>
              </li>
            </ul>
          </div>

          {/* =====================================================
              SUPPORT
          ====================================================== */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-cyan-300" />

              <h4 className="text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Hỗ trợ
              </h4>
            </div>

            <div className="mt-2.5 h-[2px] w-9 rounded-full bg-cyan-400" />

            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() =>
                      alert(`${item} - Nội dung đang được cập nhật.`)
                    }
                    className={linkClass}
                  >
                    <span className="flex-1 text-left">
                      {item}
                    </span>

                    <ChevronRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* =====================================================
              CONTACT
          ====================================================== */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-300" />

              <h4 className="text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Kết nối
              </h4>
            </div>

            <div className="mt-2.5 h-[2px] w-9 rounded-full bg-cyan-400" />

            <p className="mt-4 text-[9px] font-medium leading-[17px] text-slate-400">
              Theo dõi MSEEK để nhận thêm kiến thức và thông tin mới nhất.
            </p>

            <div className="mt-3 space-y-2">

              <div className="footer-contact flex items-center gap-3 rounded-[11px] border border-blue-900/50 bg-[#06152d]/60 px-3 py-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-cyan-300" />

                <span className="truncate text-[8px] font-semibold text-slate-300">
                  support@mseek.edu
                </span>
              </div>

              <div className="footer-contact flex items-center gap-3 rounded-[11px] border border-blue-900/50 bg-[#06152d]/60 px-3 py-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-cyan-300" />

                <span className="text-[8px] font-semibold text-slate-300">
                  +84 123 456 789
                </span>
              </div>

              <div className="footer-contact flex items-center gap-3 rounded-[11px] border border-blue-900/50 bg-[#06152d]/60 px-3 py-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />

                <span className="text-[8px] font-semibold text-slate-300">
                  Việt Nam
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          COPYRIGHT
      ========================================================== */}
      <div className="relative z-10 border-t border-blue-900/40 bg-[#010817]/80">
        <div className="mx-auto flex max-w-[1450px] flex-col items-center justify-between gap-2 px-5 py-4 sm:px-6 md:flex-row lg:px-8">

          <div className="text-center text-[8px] font-medium text-slate-500 md:text-left">
            © {new Date().getFullYear()} MSEEK. All rights reserved.
          </div>

          <div className="flex items-center gap-3">
            <span className="h-[1px] w-7 bg-gradient-to-r from-transparent to-[#ffc928]" />

            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">
              Speak. Seek. Inspire.
            </span>

            <span className="h-[1px] w-7 bg-gradient-to-l from-transparent to-[#ffc928]" />
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-medium text-slate-500">
            Được xây dựng cho những người yêu giọng nói

            <Heart className="footer-heart h-3 w-3 fill-rose-500 text-rose-500" />
          </div>
        </div>
      </div>

      {/* =========================================================
          ANIMATION
      ========================================================== */}
      <style>{`
        .footer-grid {
          background-image:
            linear-gradient(rgba(59,130,246,.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,.2) 1px, transparent 1px);
          background-size: 45px 45px;
          mask-image: linear-gradient(to bottom, transparent, black 30%, transparent);
        }

        @keyframes footerGlobalGlow {
          0%,100% {
            transform: translate3d(0,0,0) scale(1);
          }
          50% {
            transform: translate3d(80px,20px,0) scale(1.12);
          }
        }

        @keyframes footerGlobalGlowTwo {
          0%,100% {
            transform: translate3d(0,0,0);
          }
          50% {
            transform: translate3d(-80px,25px,0);
          }
        }

        .footer-global-glow {
          animation: footerGlobalGlow 15s ease-in-out infinite;
        }

        .footer-global-glow-two {
          animation: footerGlobalGlowTwo 17s ease-in-out infinite;
        }

        @keyframes newsletterGlow {
          0%,100% {
            transform: translate3d(0,0,0) scale(1);
          }
          50% {
            transform: translate3d(60px,15px,0) scale(1.12);
          }
        }

        @keyframes newsletterGlowTwo {
          0%,100% {
            transform: translate3d(0,0,0);
          }
          50% {
            transform: translate3d(-60px,15px,0);
          }
        }

        .newsletter-glow {
          animation: newsletterGlow 11s ease-in-out infinite;
        }

        .newsletter-glow-two {
          animation: newsletterGlowTwo 13s ease-in-out infinite;
        }

        .newsletter-yellow-glow {
          animation: newsletterGlow 12s ease-in-out infinite reverse;
        }

        @keyframes footerLightMove {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          70% {
            opacity: .8;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .footer-light-line {
          animation: footerLightMove 7s ease-in-out infinite;
        }

        .footer-wave {
          position: absolute;
          left: -10%;
          width: 120%;
          height: 60px;
          border-radius: 50%;
          border-top: 1px solid rgba(34,211,238,.18);
        }

        .footer-wave-one {
          bottom: -42px;
          animation: footerWaveOne 8s ease-in-out infinite;
        }

        .footer-wave-two {
          bottom: -49px;
          border-color: rgba(59,130,246,.14);
          animation: footerWaveTwo 10s ease-in-out infinite;
        }

        @keyframes footerWaveOne {
          0%,100% {
            transform: translateX(0) rotate(-1deg);
          }
          50% {
            transform: translateX(35px) rotate(1deg);
          }
        }

        @keyframes footerWaveTwo {
          0%,100% {
            transform: translateX(0) rotate(1deg);
          }
          50% {
            transform: translateX(-35px) rotate(-1deg);
          }
        }

        .footer-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #45d9ff;
          box-shadow: 0 0 12px rgba(69,217,255,.9);
          animation: footerParticle 4s ease-in-out infinite;
        }

        .footer-particle-1 {
          left: 25%;
          top: 18%;
        }

        .footer-particle-2 {
          right: 20%;
          top: 22%;
          animation-delay: 1.2s;
        }

        .footer-particle-3 {
          right: 8%;
          bottom: 20%;
          background: #ffc928;
          box-shadow: 0 0 12px rgba(255,201,40,.9);
          animation-delay: 2.2s;
        }

        @keyframes footerParticle {
          0%,100% {
            transform: translateY(0) scale(.7);
            opacity: .25;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }

        @keyframes footerMic {
          0%,100% {
            transform: translateY(0) rotate(-3deg);
          }
          50% {
            transform: translateY(-6px) rotate(3deg);
          }
        }

        .footer-mic {
          animation: footerMic 4s ease-in-out infinite;
        }

        @keyframes footerMicRing {
          0% {
            transform: scale(.8);
            opacity: .7;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        .footer-mic-ring-one {
          animation: footerMicRing 3s ease-out infinite;
        }

        .footer-mic-ring-two {
          animation: footerMicRing 3s 1.3s ease-out infinite;
        }

        @keyframes footerMicGlow {
          0%,100% {
            opacity: .35;
            transform: scale(.9);
          }
          50% {
            opacity: .75;
            transform: scale(1.18);
          }
        }

        .footer-mic-glow {
          animation: footerMicGlow 3s ease-in-out infinite;
        }

        .footer-benefit {
          transition:
            transform .3s ease,
            border-color .3s ease,
            background .3s ease;
        }

        .footer-benefit:hover {
          transform: translateY(-2px);
          border-color: rgba(34,211,238,.3);
          background: rgba(255,255,255,.08);
        }

        .footer-form:focus-within > div {
          border-color: rgba(34,211,238,.45);
          box-shadow:
            0 0 0 4px rgba(34,211,238,.04),
            0 12px 35px rgba(0,100,255,.13);
        }

        @keyframes footerButtonShine {
          0% {
            left: -70%;
          }
          35%,100% {
            left: 150%;
          }
        }

        .footer-button-shine {
          animation: footerButtonShine 4s ease-in-out infinite;
        }

        @keyframes footerSlogan {
          0%,100% {
            opacity: .55;
            text-shadow: 0 0 0 rgba(59,130,246,0);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 18px rgba(59,130,246,.45);
          }
        }

        .footer-slogan {
          animation: footerSlogan 4s ease-in-out infinite;
        }

        @keyframes footerLogoFloat {
          0%,100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        .footer-logo img {
          animation: footerLogoFloat 5s ease-in-out infinite;
        }

        .footer-link {
          position: relative;
        }

        .footer-link::before {
          content: '';
          position: absolute;
          left: 0;
          bottom: -3px;
          width: 0;
          height: 1px;
          background: linear-gradient(90deg,#22d3ee,transparent);
          transition: width .3s ease;
        }

        .footer-link:hover::before {
          width: 70%;
        }

        .footer-stat {
          position: relative;
          overflow: hidden;
        }

        .footer-stat::after {
          content: '';
          position: absolute;
          left: -100%;
          top: 0;
          width: 50%;
          height: 100%;
          transform: skewX(-20deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.08),
            transparent
          );
          transition: left .7s ease;
        }

        .footer-stat:hover::after {
          left: 140%;
        }

        .footer-contact {
          transition:
            transform .3s ease,
            border-color .3s ease,
            background .3s ease;
        }

        .footer-contact:hover {
          transform: translateX(3px);
          border-color: rgba(34,211,238,.25);
          background: rgba(8,36,72,.9);
        }

        .footer-star {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #ffc928;
          box-shadow: 0 0 12px rgba(255,201,40,.8);
          animation: footerStar 4s ease-in-out infinite;
        }

        .footer-star-1 {
          left: 20%;
          top: 45%;
        }

        .footer-star-2 {
          right: 28%;
          top: 55%;
          animation-delay: 1s;
        }

        .footer-star-3 {
          left: 50%;
          bottom: 12%;
          background: #38bdf8;
          animation-delay: 2s;
        }

        @keyframes footerStar {
          0%,100% {
            opacity: .2;
            transform: scale(.6);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes footerHeart {
          0%,100% {
            transform: scale(1);
          }
          15% {
            transform: scale(1.2);
          }
          30% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.15);
          }
          60% {
            transform: scale(1);
          }
        }

        .footer-heart {
          animation: footerHeart 2.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-global-glow,
          .footer-global-glow-two,
          .newsletter-glow,
          .newsletter-glow-two,
          .newsletter-yellow-glow,
          .footer-light-line,
          .footer-wave-one,
          .footer-wave-two,
          .footer-particle,
          .footer-mic,
          .footer-mic-ring-one,
          .footer-mic-ring-two,
          .footer-mic-glow,
          .footer-button-shine,
          .footer-slogan,
          .footer-logo img,
          .footer-star,
          .footer-heart {
            animation: none !important;
          }
        }
      `}</style>
    </footer>
  );
};