import { ArrowRight, BarChart3, Check, Mic, Play, Star, Users, Volume2, WandSparkles } from 'lucide-react';
import { Course, ScreenType } from '../../../types';
import { mockInstructors, mockTestimonials } from '../../../data/mockData';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import React, { useEffect, useRef, useState } from 'react';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  wishlistCourseIds: string[];
}
const IMAGES = {
  hero: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOo-rE69vVw9F6q3QWerXP5cPHYwzHCjroyNLH84aG6DYnQKIrr2RQEt8&s=10',
  heroStage: 'https://images.openai.com/static-rsc-4/JEqZvkewVqi_GFOltyfLmsDWgQwC-RB3RWXDiJF2sQfoJMTfau0CSaJG6NGy1saWNiJEhgPBNmvy6Fl0bg17GWHqy6HQKz65xzRE68WTNE3UTzd8uIJGO2azBACTNa5i9nGEXcsx2ZvX3xo8CR-7umzKRFb2YYS3PuVj_9NVYybuSISrfB_v8YoS4JRglIJG?purpose=inline',
  problem1: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScTO-XR8ql20AyF-QGvZ0DCnayly8pMJtVXFnFbBoFoPbCM5wDT_i7ntUM&s=10',
  problem2: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQR1R9h_hnxkzmpqBeBuLIoVbCi5ve-I7vf4h3LpZNruPaamCCQWtFI6_k&s=10',
  problem3: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqqljrCA2yx1DYBM0b3SbSqmhG1yayk47v57JopVm_t3DwN-uNe74t_eA&s=10',
  result: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJpd_eTzPOU_iDnrfKP1mKvzzGh2OxWfYLx8M8QAejq4w5HS-mUZ3_eiO-&s=10',
  studio: 'https://hocvien6w.vn/upload/product/tai-xuong-1-8069.png',
  cta: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1800&q=90',
};
const fallbackCourseImages = [
  'https://cdn-images.vtv.vn/2022/9/22/283783583101596765258857437190502460573268684n-1663832110967397521996.jpg',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=85',
];
const fallbackAvatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80',
];
export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onSelectCourse,
  onPreviewVideo,
}) => {
  const coursesQuery = useCoursesQuery();
  const allCourses = coursesQuery.data || [];
  const featuredCourses = allCourses.slice(0, 8);
  const instructors = mockInstructors.slice(0, 3);
  const testimonials = mockTestimonials.slice(0, 3);
  const studioRef = useRef<HTMLElement | null>(null);
const [studioVisible, setStudioVisible] = useState(false);

useEffect(() => {
  const section = studioRef.current;
  if (!section) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setStudioVisible(true);
        observer.disconnect();
      }
    },
    { threshold: 0.3 }
  );

  observer.observe(section);
  return () => observer.disconnect();
}, []);
  const scrollToStudio = () => {
    document.getElementById('voice-studio')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };
  return (
    <main
      id="home-screen-container"
      className="mseek-premium-home overflow-hidden bg-white text-slate-950"
    >
      <section id="hero-section" className="relative min-h-[520px] overflow-hidden bg-[#03163f] lg:min-h-[560px]">
  <img src={IMAGES.heroStage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />

  <div className="absolute inset-0 bg-[#031b4d]/38" />
  <div className="absolute inset-0 bg-gradient-to-r from-[#02143b]/75 via-[#06265f]/28 to-[#031b4d]/10" />

  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-[180px] left-[10%] h-[620px] w-[150px] rotate-[18deg] bg-gradient-to-b from-[#fff4c7]/50 via-[#ffd76a]/20 to-transparent blur-[28px]" />
    <div className="absolute -top-[190px] left-[30%] h-[650px] w-[130px] rotate-[10deg] bg-gradient-to-b from-white/45 via-[#ffe39a]/18 to-transparent blur-[30px]" />
    <div className="absolute -top-[170px] left-[49%] h-[680px] w-[155px] -rotate-[12deg] bg-gradient-to-b from-[#fffbe8]/60 via-[#ffd978]/24 to-transparent blur-[26px]" />
    <div className="absolute -top-[190px] right-[18%] h-[650px] w-[140px] rotate-[16deg] bg-gradient-to-b from-[#fff4c7]/55 via-[#ffd66b]/22 to-transparent blur-[28px]" />

    <div className="absolute left-[9%] top-[-30px] h-[105px] w-[105px] rounded-full bg-[#ffe69b]/50 blur-[35px]" />
    <div className="absolute left-[29%] top-[-35px] h-[110px] w-[110px] rounded-full bg-white/40 blur-[38px]" />
    <div className="absolute left-[48%] top-[-35px] h-[125px] w-[125px] rounded-full bg-[#fff0b0]/55 blur-[38px]" />
    <div className="absolute right-[17%] top-[-35px] h-[115px] w-[115px] rounded-full bg-[#ffe5a0]/50 blur-[38px]" />

    <div className="absolute left-[3%] top-[16%] h-5 w-5 rounded-full bg-[#ffd66b]/70 blur-[4px]" />
    <div className="absolute left-[15%] top-[9%] h-8 w-8 rounded-full bg-[#ffe699]/60 blur-[7px]" />
    <div className="absolute left-[25%] top-[25%] h-5 w-5 rounded-full bg-[#ffc928]/60 blur-[5px]" />
    <div className="absolute left-[36%] top-[13%] h-7 w-7 rounded-full bg-[#ffe5a0]/55 blur-[7px]" />
    <div className="absolute left-[42%] top-[42%] h-6 w-6 rounded-full bg-[#ffc928]/50 blur-[6px]" />
    <div className="absolute left-[20%] bottom-[14%] h-9 w-9 rounded-full bg-[#ffd66b]/35 blur-[9px]" />
    <div className="absolute left-[39%] bottom-[18%] h-7 w-7 rounded-full bg-[#ffe69b]/45 blur-[8px]" />
    <div className="absolute right-[10%] top-[22%] h-7 w-7 rounded-full bg-[#ffe69b]/60 blur-[7px]" />
    <div className="absolute right-[5%] bottom-[20%] h-10 w-10 rounded-full bg-[#ffc928]/55 blur-[9px]" />

    <div className="absolute left-[40%] top-[5%] h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[130px]" />
    <div className="absolute bottom-[-170px] left-[22%] h-[330px] w-[650px] rounded-full bg-[#ffc928]/12 blur-[120px]" />
  </div>

  <div className="absolute inset-y-0 right-0 hidden w-[56%] overflow-hidden lg:block">
    <img
      src={IMAGES.hero}
      alt="MC trên sân khấu"
      className="absolute left-1/2 top-[58%] h-[140%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
    />
    <div className="absolute inset-0 bg-gradient-to-r from-[#082458]/60 via-[#082458]/10 via-[22%] to-transparent to-[48%]" />
  </div>

  <div className="absolute inset-0 bg-gradient-to-r from-[#031845]/65 from-[0%] via-[#031845]/20 via-[35%] to-transparent to-[62%]" />

  <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl items-center px-5 py-10 sm:px-6 lg:min-h-[560px] lg:px-8">
    <div className="max-w-[650px]">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-100 backdrop-blur-md">
        <Mic className="h-4 w-4 text-[#ffc928]" />
        Nền tảng luyện giọng MC chuyên nghiệp
      </div>

      <h1 className="max-w-[600px] text-4xl font-black leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-[52px]">
        Luyện giọng MC
        <br />
        Tự tin <span className="text-[#ffc928]">tỏa sáng</span>
        <br />
        trên mọi sân khấu
      </h1>

      <p className="mt-5 max-w-[560px] text-sm font-medium leading-7 text-blue-50/90 sm:text-base">
        Học cùng giảng viên chuyên nghiệp, thực hành giọng nói với AI và nhận phản hồi chi tiết để cải thiện nhanh chóng.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onNavigate('courses')}
          className="group inline-flex items-center justify-center gap-3 rounded-xl bg-[#ffc928] px-7 py-4 text-sm font-black text-[#071d4c] shadow-[0_14px_35px_rgba(255,201,40,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#ffd64d]"
        >
          Bắt đầu học ngay
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          type="button"
          onClick={scrollToStudio}
          className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/30 bg-white/95 px-7 py-4 text-sm font-extrabold text-[#092257] shadow-xl transition-all hover:bg-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
            <Play className="h-3.5 w-3.5 fill-current" />
          </span>
          Xem cách hoạt động
        </button>
      </div>

      <div className="mt-8 grid max-w-[650px] grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#06265f]/65 px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/25 text-blue-100">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Lộ trình học</div>
            <div className="mt-0.5 text-[10px] text-blue-100/70">bài bản, thực tế</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#06265f]/65 px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/25 text-blue-100">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Thực hành & đánh giá</div>
            <div className="mt-0.5 text-[10px] text-blue-100/70">giọng nói với AI</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#06265f]/65 px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/25 text-blue-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Giảng viên đồng hành</div>
            <div className="mt-0.5 text-[10px] text-blue-100/70">và góp ý chi tiết</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="pointer-events-none absolute right-[4%] top-[13%] z-20 hidden rotate-[-7deg] text-right lg:block">
    <div className="font-serif text-2xl italic leading-relaxed text-white/95">
      Giọng nói
      <br />
      tạo nên
      <br />
      sức hút
    </div>
    <div className="ml-auto mt-2 h-1 w-20 rotate-[-8deg] rounded-full bg-[#ffc928]" />
  </div>
</section>
      <section className="bg-white py-14 sm:py-16">
  <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
    <div className="mb-7">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
        Từ giọng nói bình thường đến giọng nói sân khấu
      </div>

      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#071d4c] sm:text-3xl">
        Bạn có đang gặp những khó khăn này?
      </h2>
    </div>

    <div className="grid items-center gap-5 lg:grid-cols-[560px_60px_minmax(0,1fr)]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            image: IMAGES.problem1,
            title: 'Dễ hồi hộp',
            desc: 'khi nói trước đám đông',
            icon: <Users className="h-4 w-4" />,
          },
          {
            image: IMAGES.problem2,
            title: 'Phát âm chưa rõ',
            desc: 'thiếu tự tin',
            icon: <Mic className="h-4 w-4" />,
          },
          {
            image: IMAGES.problem3,
            title: 'Giọng nói đơn điệu',
            desc: 'khó truyền cảm',
            icon: <Volume2 className="h-4 w-4" />,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="group overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]"
          >
            <div className="h-[145px] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Nội dung */}
            <div className="flex min-h-[105px] items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {item.icon}
              </div>

              <div className="pt-0.5">
                <div className="text-xs font-black leading-4 text-[#071d4c]">
                  {item.title}
                </div>

                <div className="mt-1 text-[11px] leading-5 text-slate-500">
                  {item.desc}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden items-center justify-center lg:flex">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <ArrowRight className="h-7 w-7" />
        </div>
      </div>

      <div className="relative h-[255px] overflow-hidden rounded-[22px] border border-amber-200 bg-[#071d4c] shadow-[0_18px_50px_rgba(7,29,76,0.14)]">
        <img
          src={IMAGES.result}
          alt="MC tự tin trên sân khấu"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#071d4c]/5 to-[#071d4c]/65" />

        {/* Checklist */}
<div className="absolute right-2 top-4 w-[220px] rounded-2xl bg-white/95 px-4 py-4 shadow-2xl backdrop-blur-lg">  {[
    'Giọng nói rõ ràng, truyền cảm',
    'Tự tin làm chủ sân khấu',
    'Linh hoạt xử lý mọi tình huống',
    'Phong thái chuyên nghiệp',
    'Sẵn sàng cho cơ hội nghề nghiệp',
  ].map((text) => (
    <div key={text} className="flex items-start gap-2 py-1 text-[11px] font-bold leading-[15px] text-[#071d4c]">
      <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ffc928]">
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
      {text}
    </div>
  ))}
</div>

{/* Text vàng - nằm riêng dưới checklist */}
<div className="absolute bottom-4 right-6 z-20 hidden w-[210px] rotate-[-5deg] text-right font-serif italic text-[#ffc928] sm:block">
  <div className="text-[20px] leading-5">Tỏa sáng</div>
  <div className="mt-1 whitespace-nowrap text-[18px] leading-5">cùng phiên bản tốt hơn!</div>
</div>
      </div>
    </div>
  </div>
</section>
      <section
  ref={studioRef}
  id="voice-studio"
  className="relative overflow-hidden bg-[#061c4d] py-16 text-white sm:py-20"
>
  <img
  src={IMAGES.studio}
  alt="Học viên luyện giọng với micro"
  className="absolute left-1/2 top-[75%] h-auto w-[88%] max-w-none -translate-x-1/2 -translate-y-1/2"
/>

<div className="absolute inset-0 bg-[#061c4d]/10" />

<div className="absolute inset-0 bg-gradient-to-r from-[#061c4d]/80 via-[#061c4d]/25 to-transparent" />

  {/* Background light animation */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="studio-glow studio-glow-one absolute -left-32 top-1/2 h-[420px] w-[420px] rounded-full bg-blue-500/15 blur-[120px]" />
    <div className="studio-glow studio-glow-two absolute right-[5%] top-[5%] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-[110px]" />
    <div className="studio-glow studio-glow-three absolute bottom-[-180px] right-[30%] h-[380px] w-[500px] rounded-full bg-[#ffc928]/10 blur-[130px]" />
  </div>

  <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
    {/* LEFT CONTENT */}
    <div className="flex flex-col justify-center">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
        Studio luyện giọng thông minh
      </div>

      <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
        Thực hành – AI phân tích – Giảng viên phản hồi
      </h2>

      <p className="mt-5 max-w-xl text-sm leading-7 text-blue-100/80">
        Không chỉ xem video, bạn còn được thực hành giọng nói, nhận đánh giá từ AI theo tiêu chí của bài tập và nhận góp ý chi tiết từ giảng viên.
      </p>

      <button
        type="button"
        onClick={() => onNavigate('courses')}
        className="group mt-7 inline-flex w-fit items-center gap-3 rounded-xl bg-[#ffc928] px-7 py-4 text-sm font-black text-[#071d4c] shadow-[0_15px_40px_rgba(255,201,40,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64d] hover:shadow-[0_20px_50px_rgba(255,201,40,0.32)]"
      >
        Xem các khóa học
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </div>

   {/* RIGHT AI DEMO */}
{/* RIGHT AI DEMO */}
<div className="relative flex min-h-[400px] items-center justify-end">
  <div className="translate-y-[140px] grid w-full max-w-[410px] grid-cols-[1.08fr_0.92fr] items-center gap-3">
    {/* AI ANALYSIS CARD */}
   
    <div className="studio-analysis-card relative min-w-0 overflow-hidden rounded-[14px] border border-white/15 bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-400" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />

        <span className="ml-1.5 flex items-center gap-1 whitespace-nowrap text-[8px] font-bold text-white/80">
          Đang phân tích giọng nói
          <span className="studio-dot ml-1 h-1 w-1 rounded-full bg-blue-300" />
          <span className="studio-dot studio-dot-delay-1 h-1 w-1 rounded-full bg-blue-300" />
          <span className="studio-dot studio-dot-delay-2 h-1 w-1 rounded-full bg-blue-300" />
        </span>
      </div>

      <div className="p-3">
        {/* WAVEFORM */}
        <div className="relative flex h-[52px] items-center justify-center gap-[2px] overflow-hidden rounded-[10px] border border-blue-300/5 bg-blue-500/10 px-2">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent" />

          {[
            18, 34, 23, 49, 28, 58, 37, 68, 30, 45,
            64, 28, 52, 72, 41, 25, 56, 34, 62, 45,
            26, 48, 68, 37, 55, 31, 43, 65, 29, 48,
          ].map((height, index) => (
            <span
              key={index}
              className="studio-wave relative z-10 w-[2px] rounded-full bg-blue-300"
              style={
                {
                  height: `${height}%`,
                  '--wave-delay': `${index * 0.045}s`,
                  '--wave-duration': `${0.75 + (index % 5) * 0.08}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* SCORES */}
        <div className="mt-3 space-y-2">
          {[
            ['Phát âm', 85],
            ['Ngữ điệu', 78],
            ['Nhịp độ', 82],
            ['Cảm xúc', 75],
          ].map(([label, score], index) => (
            <div
              key={String(label)}
              className="grid grid-cols-[42px_1fr_28px] items-center gap-1.5"
            >
              <span className="text-[7px] font-bold text-blue-50">
                {label}
              </span>

              <div className="h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="studio-score-bar h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-[#ffc928]"
                  style={{
                    width: studioVisible ? `${score}%` : '0%',
                    transitionDelay: `${250 + index * 180}ms`,
                  }}
                />
              </div>

              <span className="text-right text-[7px] font-black text-white">
                {score}/100
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="studio-scan pointer-events-none absolute inset-y-0 w-[55px] bg-gradient-to-r from-transparent via-blue-300/10 to-transparent blur-xl" />
    </div>

    {/* FEEDBACK CARD */}
    <div className="studio-feedback-card relative min-w-0 rounded-[14px] border border-white/20 bg-white p-3 text-slate-900 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="mb-2 flex items-center gap-2">
        <div className="studio-wand flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <WandSparkles className="h-3.5 w-3.5 text-blue-600" />
        </div>

        <div className="text-[8px] font-black text-[#071d4c]">
          Nhận phản hồi chi tiết
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-md" />
          <img
            src={instructors[0]?.avatar || fallbackAvatars[0]}
            alt="Giảng viên"
            className="relative h-7 w-7 rounded-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-[8px] font-black text-[#071d4c]">
            Giảng viên
          </div>
          <div className="text-[7px] text-slate-400">
            Phản hồi bài luyện giọng
          </div>
        </div>
      </div>

      <p className="mt-2 text-[8px] leading-[13px] text-slate-600">
        Giọng nói của bạn đã rõ ràng hơn. Hãy tăng nhịp độ ở phần cao trào để tạo cảm xúc mạnh mẽ hơn.
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="studio-feedback-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[7px] font-bold text-emerald-600">
          Phản hồi mới
        </span>
      </div>
    </div>

  </div>

  {/* Decorative rings */}
  <div className="studio-ring pointer-events-none absolute right-[8%] top-[18%] -z-10 h-[110px] w-[110px] rounded-full border border-blue-300/10" />
  <div className="studio-ring studio-ring-delay pointer-events-none absolute right-[8%] top-[18%] -z-10 h-[110px] w-[110px] rounded-full border border-blue-300/10" />
</div>
  </div>

  <style>{`
    @keyframes studioWave {
      0%, 100% {
        transform: scaleY(0.45);
        opacity: 0.55;
      }
      25% {
        transform: scaleY(0.85);
        opacity: 0.85;
      }
      50% {
        transform: scaleY(1.18);
        opacity: 1;
      }
      75% {
        transform: scaleY(0.7);
        opacity: 0.75;
      }
    }

    @keyframes studioAnalysisFloat {
      0%, 100% {
        transform: translate3d(0, 0, 0);
      }
      50% {
        transform: translate3d(0, -7px, 0);
      }
    }

    @keyframes studioFeedbackFloat {
      0%, 100% {
        transform: translate3d(0, 0, 0) rotate(0deg);
      }
      50% {
        transform: translate3d(0, -10px, 0) rotate(0.4deg);
      }
    }

    @keyframes studioDot {
      0%, 60%, 100% {
        opacity: 0.25;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-3px);
      }
    }

    @keyframes studioScan {
      0% {
        left: -30%;
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      85% {
        opacity: 1;
      }
      100% {
        left: 110%;
        opacity: 0;
      }
    }

    @keyframes studioGlowOne {
      0%, 100% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      50% {
        transform: translate3d(80px, -25px, 0) scale(1.15);
      }
    }

    @keyframes studioGlowTwo {
      0%, 100% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      50% {
        transform: translate3d(-60px, 40px, 0) scale(1.18);
      }
    }

    @keyframes studioGlowThree {
      0%, 100% {
        transform: translate3d(0, 0, 0);
      }
      50% {
        transform: translate3d(40px, -30px, 0);
      }
    }

    @keyframes studioRing {
      0% {
        transform: scale(0.7);
        opacity: 0;
      }
      35% {
        opacity: 0.4;
      }
      100% {
        transform: scale(1.65);
        opacity: 0;
      }
    }

    @keyframes studioFeedbackPulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
      }
    }

    @keyframes studioWand {
      0%, 100% {
        transform: rotate(0deg) scale(1);
      }
      50% {
        transform: rotate(8deg) scale(1.08);
      }
    }

    .studio-wave {
      transform-origin: center;
      animation: studioWave var(--wave-duration) ease-in-out infinite;
      animation-delay: var(--wave-delay);
      will-change: transform, opacity;
    }

    .studio-analysis-card {
      animation: studioAnalysisFloat 5s ease-in-out infinite;
      will-change: transform;
    }

    .studio-feedback-card {
      animation: studioFeedbackFloat 4.3s ease-in-out infinite;
      will-change: transform;
    }

    .studio-dot {
      animation: studioDot 1.35s ease-in-out infinite;
    }

    .studio-dot-delay-1 {
      animation-delay: 0.18s;
    }

    .studio-dot-delay-2 {
      animation-delay: 0.36s;
    }

    .studio-score-bar {
      transition-property: width;
      transition-duration: 1.4s;
      transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
    }

    .studio-scan {
      animation: studioScan 5s ease-in-out infinite;
    }

    .studio-glow-one {
      animation: studioGlowOne 10s ease-in-out infinite;
    }

    .studio-glow-two {
      animation: studioGlowTwo 12s ease-in-out infinite;
    }

    .studio-glow-three {
      animation: studioGlowThree 11s ease-in-out infinite;
    }

    .studio-ring {
      animation: studioRing 4s ease-out infinite;
    }

    .studio-ring-delay {
      animation-delay: 2s;
    }

    .studio-feedback-pulse {
      animation: studioFeedbackPulse 2s ease-out infinite;
    }

    .studio-wand {
      animation: studioWand 3s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .studio-wave,
      .studio-analysis-card,
      .studio-feedback-card,
      .studio-dot,
      .studio-scan,
      .studio-glow,
      .studio-ring,
      .studio-feedback-pulse,
      .studio-wand {
        animation: none !important;
      }

      .studio-score-bar {
        transition: none !important;
      }
    }
  `}</style>
</section>
      {/* FEATURED COURSES */}
<section className="featured-courses-section relative overflow-hidden bg-gradient-to-br from-[#f7faff] via-white to-[#fffaf0] py-12 sm:py-14 lg:py-16">

  {/* BACKGROUND */}
  <div className="pointer-events-none absolute inset-0">
    <div className="featured-glow-blue absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-blue-400/[0.08] blur-[100px]" />
    <div className="featured-glow-yellow absolute -right-28 -top-20 h-[380px] w-[380px] rounded-full bg-[#ffc928]/10 blur-[100px]" />
    <div className="absolute bottom-[-180px] left-[28%] h-[300px] w-[520px] rounded-full bg-blue-300/[0.06] blur-[120px]" />

    <div className="absolute left-[3%] top-[18%] h-3 w-3 rounded-full bg-[#ffc928]/60 shadow-[0_0_20px_rgba(255,201,40,0.5)]" />
    <div className="absolute left-[25%] top-[12%] h-2 w-2 rounded-full bg-blue-400/40" />
    <div className="absolute right-[7%] bottom-[18%] h-3 w-3 rounded-full bg-[#ffc928]/40" />

    <div className="featured-line absolute -left-24 bottom-20 h-[1px] w-[620px] rotate-[-16deg] bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1450px] px-5 sm:px-6 lg:px-8">

    <div className="grid items-center gap-8 lg:grid-cols-[0.58fr_1.65fr] xl:gap-10">

      {/* ================= LEFT CONTENT ================= */}
      <div className="featured-intro lg:pr-3">

        <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 shadow-sm backdrop-blur-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white">
            <Star className="h-3 w-3 fill-current" />
          </span>

          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Khóa học tiêu biểu
          </span>
        </div>

        <h2 className="mt-5 max-w-[500px] text-[28px] font-black leading-[1.1] tracking-[-0.035em] text-[#071d4c] sm:text-[32px] lg:text-[34px] xl:text-[36px]">
          <span className="lg:whitespace-nowrap">
            Bắt đầu hành trình
          </span>

          <span className="mt-1 block bg-gradient-to-r from-blue-600 to-[#1780ff] bg-clip-text text-transparent">
            làm chủ giọng nói
          </span>
        </h2>

        <p className="mt-4 max-w-[420px] text-[13px] font-medium leading-6 text-slate-500 sm:text-sm">
          Những khóa học được thiết kế bởi các giảng viên MC giàu kinh nghiệm, bám sát thực tế.
        </p>

        <button
          type="button"
          onClick={() => onNavigate('courses')}
          className="featured-main-button group mt-6 inline-flex items-center gap-3 rounded-xl bg-[#ffc928] px-6 py-3.5 text-[13px] font-black text-[#071d4c] shadow-[0_15px_35px_rgba(255,201,40,0.24)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#ffd64d] hover:shadow-[0_20px_45px_rgba(255,201,40,0.35)]"
        >
          Xem tất cả khóa học

          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>

        <div className="mt-8 hidden items-end gap-5 lg:flex">
          <div className="featured-wave-icon flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-blue-100/70 text-blue-600 shadow-[0_15px_40px_rgba(37,99,235,0.12)]">
            <Volume2 className="h-7 w-7" />
          </div>

          <div className="mb-2 h-2.5 w-2.5 rounded-full bg-blue-100" />
        </div>

      </div>

      {/* ================= RIGHT COURSE CAROUSEL ================= */}
      <div className="relative min-w-0">

        {coursesQuery.isLoading ? (

          /* LOADING */
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-[390px] animate-pulse rounded-[26px] bg-slate-100"
              />
            ))}
          </div>

        ) : featuredCourses.length > 0 ? (

          <div className="course-film-wrapper relative overflow-hidden py-5">

            {/* FADE LEFT */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-12 bg-gradient-to-r from-[#f9fbff] to-transparent sm:w-16" />

            {/* FADE RIGHT */}
            <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-12 bg-gradient-to-l from-[#fffaf0] to-transparent sm:w-16" />

            {/* CAROUSEL TRACK */}
            <div className="course-film-track flex w-max items-stretch gap-5">

              {[...featuredCourses, ...featuredCourses].map(
                (course, loopIndex) => {

                  const realIndex =
                    loopIndex % featuredCourses.length;

                  const courseImage =
                    (course as any).thumbnail ||
                    (course as any).image ||
                    fallbackCourseImages[
                      realIndex % fallbackCourseImages.length
                    ];

                  const avatar =
                    course.instructor?.avatar ||
                    fallbackAvatars[
                      realIndex % fallbackAvatars.length
                    ];

                  return (
                    <article
                      key={`${course.id}-${loopIndex}`}
                      className="course-film-card group relative w-[300px] shrink-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition-all duration-500 sm:w-[320px] lg:w-[335px]"
                    >

                      {/* ================= IMAGE ================= */}
                      <div className="relative h-[180px] overflow-hidden">

                        <img
                          src={courseImage}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-[#071d4c]/50 via-transparent to-black/5 opacity-70 transition-opacity duration-500 group-hover:opacity-45" />

                        {/* IMAGE SHINE */}
                        <div className="featured-image-shine pointer-events-none absolute inset-y-0 -left-[80%] w-[45%] rotate-[15deg] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                        {/* POPULAR */}
                        {realIndex === 0 && (
                          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-xl bg-[#ffc928] px-3.5 py-2 text-[10px] font-black text-[#071d4c] shadow-[0_8px_25px_rgba(255,201,40,0.3)]">
                            <span>🔥</span>
                            Phổ biến
                          </div>
                        )}

                        {/* PLAY */}
                        <button
                          type="button"
                          onClick={() => onPreviewVideo(course)}
                          className="featured-play-button absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#071d4c]/75 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-[#ffc928] hover:bg-blue-600"
                        >
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </button>

                      </div>

                      {/* ================= CONTENT ================= */}
                      <div className="p-5">

                        <div className="text-[10px] font-black uppercase tracking-[0.08em] text-blue-600">
                          {course.category || 'Luyện giọng & phát âm'}
                        </div>

                        <h3 className="mt-2 line-clamp-2 min-h-[44px] text-[16px] font-black leading-[22px] tracking-[-0.02em] text-[#071d4c] transition-colors duration-300 group-hover:text-blue-700">
                          {course.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 min-h-[40px] text-[11px] leading-5 text-slate-500">
                          {realIndex === 0
                            ? 'Làm chủ giọng nói, phong thái và kỹ năng dẫn dắt trong các tình huống thực tế.'
                            : 'Cải thiện phát âm, kiểm soát giọng nói và xây dựng chất giọng truyền cảm, chuyên nghiệp.'}
                        </p>

                        <div className="my-4 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

                        {/* INSTRUCTOR */}
                        <div className="flex items-center gap-3">

                          <div className="relative shrink-0">

                            <div className="absolute -inset-1 rounded-full bg-blue-500/10 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />

                            <img
                              src={avatar}
                              alt={
                                course.instructor?.name ||
                                'Giảng viên'
                              }
                              className="relative h-9 w-9 rounded-full object-cover ring-2 ring-blue-50"
                            />

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="truncate text-[11px] font-black text-[#071d4c]">
                              {course.instructor?.name ||
                                'Giảng viên MSEEK'}
                            </div>

                            <div className="mt-1 flex items-center gap-1">

                              <Star className="h-3.5 w-3.5 fill-[#ffc928] text-[#ffc928]" />

                              <span className="text-[10px] font-black text-amber-500">
                                {course.rating || '5.0'}
                              </span>

                            </div>

                          </div>

                          {/* VIEW COURSE */}
                          <button
                            type="button"
                            onClick={() => onSelectCourse(course)}
                            className="group/course flex shrink-0 items-center gap-1.5 text-[11px] font-black text-blue-600 transition-colors duration-300 hover:text-blue-800"
                          >
                            Xem khóa học

                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/course:translate-x-1" />
                          </button>

                        </div>

                      </div>

                      {/* BOTTOM LINE */}
                      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-[#ffc928] transition-transform duration-500 group-hover:scale-x-100" />

                    </article>
                  );
                }
              )}

            </div>

            {/* MOVING INDICATOR */}
            <div className="mt-3 flex items-center justify-center gap-2">

              <span className="course-film-dot h-1.5 w-1.5 rounded-full bg-blue-600" />

              <span className="h-1 w-12 overflow-hidden rounded-full bg-blue-100">
                <span className="course-film-progress block h-full rounded-full bg-blue-600" />
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-[#ffc928]" />

            </div>

          </div>

        ) : (

          <div className="rounded-[26px] border border-dashed border-slate-300 bg-white/70 p-12 text-center text-sm text-slate-500 shadow-sm backdrop-blur-sm">
            Hiện chưa có khóa học nổi bật.
          </div>

        )}

      </div>

    </div>

  </div>

  {/* ================= ANIMATIONS ================= */}
  <style>{`

    /* =========================================================
       COURSE FILM - INFINITE LOOP
    ========================================================= */

    @keyframes courseFilmScroll {
      from {
        transform: translate3d(0, 0, 0);
      }

      to {
        transform: translate3d(-50%, 0, 0);
      }
    }

    .course-film-track {
      animation: courseFilmScroll 32s linear infinite;
      will-change: transform;
    }

    /*
      Hover vào khu course -> dừng phim
      để user click Play / Xem khóa học
    */
    .course-film-wrapper:hover .course-film-track {
      animation-play-state: paused;
    }


    /* =========================================================
       CARD
    ========================================================= */

    .course-film-card {
      transform:
        perspective(1000px)
        rotateY(0deg)
        scale(0.96);

      opacity: 0.88;

      transition:
        transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
        opacity 0.5s ease,
        box-shadow 0.5s ease,
        border-color 0.5s ease;

      will-change: transform;
    }

    .course-film-card:hover {
      transform:
        perspective(1000px)
        translateY(-8px)
        rotateY(0deg)
        scale(1);

      opacity: 1;

      z-index: 20;

      border-color: rgba(59, 130, 246, 0.28);

      box-shadow:
        0 28px 70px rgba(15, 23, 42, 0.15),
        0 10px 30px rgba(37, 99, 235, 0.08);
    }


    /* =========================================================
       IMAGE SHINE
    ========================================================= */

    @keyframes featuredShine {
      0% {
        left: -80%;
        opacity: 0;
      }

      30% {
        opacity: 0;
      }

      50% {
        opacity: 0.65;
      }

      70% {
        opacity: 0;
      }

      100% {
        left: 140%;
        opacity: 0;
      }
    }

    .featured-image-shine {
      animation: featuredShine 7s ease-in-out infinite;
    }


    /* =========================================================
       PLAY BUTTON
    ========================================================= */

    @keyframes featuredPlayPulse {
      0%,
      100% {
        box-shadow:
          0 10px 30px rgba(7, 29, 76, 0.2),
          0 0 0 0 rgba(255, 255, 255, 0.25);
      }

      50% {
        box-shadow:
          0 12px 35px rgba(7, 29, 76, 0.28),
          0 0 0 8px rgba(255, 255, 255, 0);
      }
    }

    .featured-play-button {
      animation: featuredPlayPulse 3s ease-in-out infinite;
    }


    /* =========================================================
       LEFT CONTENT REVEAL
    ========================================================= */

    @keyframes featuredIntroReveal {
      0% {
        opacity: 0;
        transform: translate3d(-28px, 20px, 0);
      }

      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    .featured-intro {
      animation:
        featuredIntroReveal
        0.8s
        cubic-bezier(0.16, 1, 0.3, 1)
        both;
    }


    /* =========================================================
       BACKGROUND GLOW
    ========================================================= */

    @keyframes featuredGlowBlue {
      0%,
      100% {
        transform: translate3d(0, 0, 0) scale(1);
      }

      50% {
        transform: translate3d(65px, 20px, 0) scale(1.12);
      }
    }

    @keyframes featuredGlowYellow {
      0%,
      100% {
        transform: translate3d(0, 0, 0) scale(1);
      }

      50% {
        transform: translate3d(-45px, 30px, 0) scale(1.15);
      }
    }

    .featured-glow-blue {
      animation: featuredGlowBlue 11s ease-in-out infinite;
    }

    .featured-glow-yellow {
      animation: featuredGlowYellow 13s ease-in-out infinite;
    }


    /* =========================================================
       WAVE ICON
    ========================================================= */

    @keyframes featuredWaveFloat {
      0%,
      100% {
        transform: translate3d(0, 0, 0) rotate(-2deg);
      }

      50% {
        transform: translate3d(0, -8px, 0) rotate(2deg);
      }
    }

    .featured-wave-icon {
      animation: featuredWaveFloat 4.5s ease-in-out infinite;
    }


    /* =========================================================
       MAIN BUTTON SHINE
    ========================================================= */

    .featured-main-button {
      position: relative;
      overflow: hidden;
    }

    .featured-main-button::after {
      content: '';

      position: absolute;

      top: -50%;
      left: -80%;

      width: 35%;
      height: 200%;

      transform: rotate(20deg);

      background: linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,0.5),
        transparent
      );

      transition: left 0.7s ease;
    }

    .featured-main-button:hover::after {
      left: 140%;
    }


    /* =========================================================
       PROGRESS ANIMATION
    ========================================================= */

    @keyframes courseFilmProgress {
      0% {
        transform: translateX(-100%);
      }

      100% {
        transform: translateX(100%);
      }
    }

    .course-film-progress {
      width: 60%;

      animation:
        courseFilmProgress
        2.2s
        ease-in-out
        infinite;
    }


    /* =========================================================
       DOT
    ========================================================= */

    @keyframes courseFilmDot {
      0%,
      100% {
        transform: scale(1);
        opacity: 0.6;
      }

      50% {
        transform: scale(1.5);
        opacity: 1;
      }
    }

    .course-film-dot {
      animation: courseFilmDot 1.8s ease-in-out infinite;
    }


    /* =========================================================
       RESPONSIVE SPEED
    ========================================================= */

    @media (max-width: 1024px) {

      .course-film-track {
        animation-duration: 28s;
      }

    }

    @media (max-width: 640px) {

      .course-film-track {
        animation-duration: 24s;
      }

      .course-film-card {
        width: 280px;
      }

    }


    /* =========================================================
       ACCESSIBILITY
    ========================================================= */

    @media (prefers-reduced-motion: reduce) {

      .course-film-track,
      .featured-image-shine,
      .featured-play-button,
      .featured-intro,
      .featured-glow-blue,
      .featured-glow-yellow,
      .featured-wave-icon,
      .course-film-progress,
      .course-film-dot {
        animation: none !important;
      }

      .course-film-track {
        transform: none !important;
      }

    }

  `}</style>
</section>
      {/* INSTRUCTORS */}
<section className="instructor-section relative overflow-hidden bg-gradient-to-br from-[#edf5ff] via-[#f8fbff] to-[#fff8e8] py-10 sm:py-12 lg:py-14">  {/* Decorative background */}
  <div className="pointer-events-none absolute inset-0">
    <div className="instructor-glow-blue absolute -left-32 top-16 h-[420px] w-[420px] rounded-full bg-blue-400/[0.09] blur-[110px]" />
    <div className="instructor-glow-yellow absolute -right-32 bottom-[-80px] h-[420px] w-[420px] rounded-full bg-[#ffc928]/10 blur-[110px]" />

    <div className="absolute left-[5%] top-[18%] h-2.5 w-2.5 rounded-full bg-[#ffc928]/60" />
    <div className="absolute left-[28%] top-[8%] h-2 w-2 rounded-full bg-blue-300/60" />
    <div className="absolute right-[42%] top-[20%] grid grid-cols-5 gap-2 opacity-30">
      {Array.from({ length: 20 }).map((_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      ))}
    </div>

    <div className="instructor-ring absolute right-[9%] top-[7%] h-[230px] w-[230px] rounded-full border-2 border-blue-300/40" />
    <div className="instructor-ring instructor-ring-delay absolute -right-16 top-[32%] h-[230px] w-[230px] rounded-full border-2 border-blue-300/30" />
  </div>

  <div className="relative z-10 mx-auto grid max-w-[1450px] items-center gap-10 px-5 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 xl:gap-14">
    {/* LEFT */}
    <div className="instructor-content min-w-0">
      <div className="inline-flex items-center gap-3 rounded-xl border border-[#a9ceff] bg-[#f3f8ff]/95 px-4 py-2.5 shadow-[0_8px_25px_rgba(37,99,235,0.10)] backdrop-blur-md">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Users className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
          Giảng viên đồng hành cùng bạn
        </span>
      </div>

      <div className="mt-5">
        <div>
          <h2 className="max-w-[650px] text-[27px] font-black leading-[1.08] tracking-[-0.035em] text-[#041b4d] sm:text-[30px] lg:text-[34px]">
  Học từ những MC giàu kinh nghiệm
  <span className="mt-1 block bg-gradient-to-r from-[#0758ff] to-[#247cff] bg-clip-text text-transparent">
    thực chiến
  </span>
</h2>

          <p className="mt-4 max-w-[650px] text-[13px] font-medium leading-6 text-slate-500 sm:text-sm">
            Các giảng viên là MC, BTV và chuyên gia đào tạo giọng nói với kinh nghiệm thực tế trên sân khấu.
          </p>
        </div>

        
      </div>

      {/* Instructor cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {instructors.map((inst, index) => (
          <article
            key={inst.id}
            className={`instructor-card instructor-card-${index + 1} group relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-3.5 shadow-[0_12px_35px_rgba(15,23,42,0.07)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_24px_55px_rgba(37,99,235,0.13)]`}
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-blue-100/0 blur-2xl transition-all duration-500 group-hover:bg-blue-100/70" />

            <div className="relative flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400/20 to-[#ffc928]/20 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />

                <img
                  src={inst.avatar || fallbackAvatars[index]}
                  alt={inst.name}
                  className="relative h-[58px] w-[58px] rounded-full object-cover ring-4 ring-blue-50 transition-transform duration-500 group-hover:scale-105"
                />

                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-50 text-blue-600 shadow-sm">
                  <Mic className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-[14px] font-black leading-[19px] text-[#041b4d]">
                   {inst.name}
                         </h3>

                        <p className="mt-1 text-[10px] font-extrabold leading-[15px] text-[#075cff]">
                        {inst.title}
                          </p>
                     </div>
            </div>

            <div className="my-4 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

            <div className="relative space-y-2.5">
              <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-500">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#fff7dc] text-[#ffb800]">
                  <Star className="h-3.5 w-3.5 fill-current" />
                </span>
                {index === 0 ? '10+ năm kinh nghiệm' : index === 1 ? '8+ năm kinh nghiệm' : '7+ năm kinh nghiệm'}
              </div>

              <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-500">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-3.5 w-3.5" />
                </span>
                Chuyên gia đào tạo MC
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-5 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-[#ffc928] transition-transform duration-500 group-hover:scale-x-100" />
          </article>
        ))}
      </div>
    </div>

  {/* RIGHT VIDEO */}
<div className="instructor-media relative">
  <div className="relative h-[330px] overflow-hidden rounded-[26px] border border-white/80 bg-black shadow-[0_20px_55px_rgba(7,29,76,0.16)] sm:h-[350px] lg:h-[370px]">

    <iframe
      src="https://www.youtube.com/embed/aamko_7dtQ0?rel=0"
      title="MC Đức Bảo - Chia sẻ kinh nghiệm MC"
      className="absolute inset-0 h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />

    {/* Caption */}
    <div className="pointer-events-none absolute bottom-5 right-5 z-10 rotate-[-4deg] text-right font-serif italic text-white">
      <div className="rounded-xl bg-[#071d4c]/80 px-4 py-2.5 text-[15px] leading-5 shadow-xl backdrop-blur-md">
        Kinh nghiệm thực tế
        <br />
        Bài học giá trị
      </div>

      <div className="ml-auto mt-2 h-[3px] w-28 rotate-[-5deg] rounded-full bg-[#ffc928]" />
    </div>
  </div>

  {/* Decorative ring */}
  <div className="instructor-orbit pointer-events-none absolute -right-10 -top-10 -z-10 h-[170px] w-[170px] rounded-full border-2 border-blue-300/40" />

  {/* Yellow dot */}
  <div className="pointer-events-none absolute -right-2 -top-2 z-10 h-7 w-7 rounded-full bg-[#ffc928] shadow-[0_0_30px_rgba(255,201,40,0.55)]" />
</div>
  </div>

  <style>{`
    @keyframes instructorContentReveal {
      0% { opacity: 0; transform: translate3d(-35px, 25px, 0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0); }
    }

    @keyframes instructorCardReveal {
      0% { opacity: 0; transform: translate3d(0, 35px, 0) scale(0.96); }
      100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    }

    @keyframes instructorMediaReveal {
      0% { opacity: 0; transform: translate3d(40px, 25px, 0) scale(0.97); }
      100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
    }

    @keyframes instructorPlayPulse {
      0%, 100% {
        box-shadow: 0 15px 45px rgba(7, 29, 76, 0.25), 0 0 0 0 rgba(255,255,255,0.4);
      }
      50% {
        box-shadow: 0 18px 50px rgba(7, 29, 76, 0.3), 0 0 0 14px rgba(255,255,255,0);
      }
    }

    @keyframes instructorBadgeFloat {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(0, -7px, 0); }
    }

    @keyframes instructorGlowBlue {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(70px, 30px, 0) scale(1.15); }
    }

    @keyframes instructorGlowYellow {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(-60px, -25px, 0) scale(1.12); }
    }

    @keyframes instructorOrbit {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.06); }
      100% { transform: rotate(360deg) scale(1); }
    }

    @keyframes instructorShine {
      0%, 25% { left: -60%; opacity: 0; }
      45% { opacity: 0.7; }
      70%, 100% { left: 130%; opacity: 0; }
    }

    .instructor-content {
      animation: instructorContentReveal 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .instructor-card {
      opacity: 0;
      animation: instructorCardReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .instructor-card-1 { animation-delay: 0.12s; }
    .instructor-card-2 { animation-delay: 0.22s; }
    .instructor-card-3 { animation-delay: 0.32s; }

    .instructor-media {
      opacity: 0;
      animation: instructorMediaReveal 0.95s 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .instructor-play {
      animation: instructorPlayPulse 2.8s ease-in-out infinite;
    }

    .instructor-expert-badge {
      animation: instructorBadgeFloat 4s ease-in-out infinite;
    }

    .instructor-glow-blue {
      animation: instructorGlowBlue 12s ease-in-out infinite;
    }

    .instructor-glow-yellow {
      animation: instructorGlowYellow 14s ease-in-out infinite;
    }

    .instructor-orbit {
      animation: instructorOrbit 20s linear infinite;
    }

    .instructor-image-shine {
      animation: instructorShine 7s ease-in-out infinite;
    }

    .instructor-nav:active {
      transform: translateY(0) scale(0.94);
    }

    @media (prefers-reduced-motion: reduce) {
      .instructor-content,
      .instructor-card,
      .instructor-media,
      .instructor-play,
      .instructor-expert-badge,
      .instructor-glow-blue,
      .instructor-glow-yellow,
      .instructor-orbit,
      .instructor-image-shine {
        animation: none !important;
      }

      .instructor-card,
      .instructor-media {
        opacity: 1;
      }
    }
  `}</style>
</section>
      {/* TESTIMONIALS */}
<section className="testimonial-section relative mb-10 overflow-hidden bg-[#031943] py-8 text-white sm:mb-12 sm:py-9 lg:mb-14 lg:py-10">
  {/* BACKGROUND */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute inset-0 bg-gradient-to-br from-[#041a48] via-[#05265e] to-[#06162f]" />

    <div className="testimonial-glow-one absolute -left-24 top-[-100px] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[100px]" />
    <div className="testimonial-glow-two absolute right-[5%] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-400/[0.07] blur-[110px]" />
    <div className="absolute bottom-[-160px] left-[35%] h-[260px] w-[500px] rounded-full bg-blue-500/[0.06] blur-[120px]" />

    {/* vòng tròn mờ */}
    <div className="absolute left-[27%] top-[8%] h-10 w-10 rounded-full border border-blue-300/[0.04]" />
    <div className="absolute left-[31%] top-[11%] h-14 w-14 rounded-full border border-blue-300/[0.04]" />
    <div className="absolute right-[26%] top-[12%] h-12 w-12 rounded-full border border-blue-300/[0.04]" />

    {/* chấm trang trí */}
    <span className="testimonial-dot absolute left-[25%] top-[13%] h-1.5 w-1.5 rounded-full bg-[#ffc928]" />
    <span className="testimonial-dot testimonial-dot-2 absolute right-[17%] top-[18%] h-1.5 w-1.5 rounded-full bg-blue-300" />
    <span className="absolute left-[4%] top-[42%] h-2 w-2 rounded-full bg-[#ffc928]/40" />
  </div>

  <div className="relative z-10 mx-auto max-w-[1450px] px-5 sm:px-6 lg:px-8">
    {/* HEADING */}
    <div className="testimonial-heading">
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-blue-300 sm:text-[10px]">
          Học viên nói gì về MSEEK?
        </span>

        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="h-px w-16 bg-gradient-to-r from-blue-400/60 to-transparent" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffc928]" />
        </div>
      </div>

      <h2 className="mt-2.5 text-[24px] font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-[27px] lg:text-[30px]">
        Giọng nói tốt hơn –{' '}
        <span className="bg-gradient-to-r from-blue-400 via-[#379cff] to-cyan-300 bg-clip-text text-transparent">
          Cơ hội rộng mở hơn
        </span>
      </h2>

      <p className="mt-2.5 max-w-[720px] text-[10px] font-semibold leading-5 text-blue-100/55 sm:text-[11px]">
        Những thay đổi thực tế từ học viên sau quá trình luyện tập và cải thiện giọng nói cùng MSEEK.
      </p>
    </div>

    {/* CARDS */}
    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((testimonial, index) => (
        <article
          key={testimonial.id}
          className={`testimonial-card testimonial-card-${index + 1} group relative flex min-h-[175px] flex-col overflow-hidden rounded-[17px] border border-white/[0.09] bg-white/[0.07] px-5 py-4 shadow-[0_14px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-blue-300/25 hover:bg-white/[0.10] hover:shadow-[0_20px_45px_rgba(0,0,0,0.25)]`}
        >
          {/* ánh sáng hover */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-blue-400/10 opacity-0 blur-[35px] transition-opacity duration-500 group-hover:opacity-100" />

          {/* STARS */}
          <div className="relative z-10 flex items-center gap-1">
            {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
              <Star
                key={starIndex}
                className="h-3 w-3 fill-[#ffc928] text-[#ffc928]"
              />
            ))}
          </div>

          {/* QUOTE */}
          <p className="relative z-10 mt-3 flex-1 text-[10px] font-semibold leading-[18px] text-blue-50/90 sm:text-[10.5px]">
            “{testimonial.quote}”
          </p>

          {/* USER */}
          <div className="relative z-10 mt-3 flex items-center gap-2.5 border-t border-white/[0.08] pt-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-blue-400/20 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />

              <img
                src={testimonial.avatar}
                alt={testimonial.author}
                className="relative h-8 w-8 rounded-full object-cover ring-2 ring-white/15 transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-[10px] font-black text-white">
                {testimonial.author}
              </div>

              <div className="mt-0.5 truncate text-[7.5px] font-medium text-blue-200/55">
                {testimonial.role}
                {testimonial.company ? ` • ${testimonial.company}` : ''}
              </div>
            </div>
          </div>

          {/* bottom hover line */}
          <div className="absolute inset-x-5 bottom-0 h-[1.5px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-[#ffc928] transition-transform duration-500 group-hover:scale-x-100" />
        </article>
      ))}
    </div>
  </div>

  <style>{`
    @keyframes testimonialHeadingReveal {
      0% {
        opacity: 0;
        transform: translate3d(-20px, 12px, 0);
      }
      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    @keyframes testimonialCardReveal {
      0% {
        opacity: 0;
        transform: translate3d(0, 22px, 0) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes testimonialGlowOne {
      0%, 100% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      50% {
        transform: translate3d(60px, 20px, 0) scale(1.15);
      }
    }

    @keyframes testimonialGlowTwo {
      0%, 100% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      50% {
        transform: translate3d(-50px, 30px, 0) scale(1.12);
      }
    }

    @keyframes testimonialDotFloat {
      0%, 100% {
        transform: translateY(0);
        opacity: 0.65;
      }
      50% {
        transform: translateY(-6px);
        opacity: 1;
      }
    }

    .testimonial-heading {
      animation: testimonialHeadingReveal 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .testimonial-card {
      opacity: 0;
      animation: testimonialCardReveal 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .testimonial-card-1 {
      animation-delay: 0.08s;
    }

    .testimonial-card-2 {
      animation-delay: 0.16s;
    }

    .testimonial-card-3 {
      animation-delay: 0.24s;
    }

    .testimonial-glow-one {
      animation: testimonialGlowOne 11s ease-in-out infinite;
    }

    .testimonial-glow-two {
      animation: testimonialGlowTwo 13s ease-in-out infinite;
    }

    .testimonial-dot {
      animation: testimonialDotFloat 3.5s ease-in-out infinite;
    }

    .testimonial-dot-2 {
      animation-delay: 1.2s;
    }

    @media (prefers-reduced-motion: reduce) {
      .testimonial-heading,
      .testimonial-card,
      .testimonial-glow-one,
      .testimonial-glow-two,
      .testimonial-dot {
        animation: none !important;
      }

      .testimonial-card {
        opacity: 1;
      }
    }
  `}</style>
</section>
      {/* FINAL CTA */}
<section className="relative bg-white px-5 pb-8 pt-0 sm:px-6 sm:pb-9 sm:pt-0 lg:px-8 lg:pb-11 lg:pt-0">
  <div className="cta-premium group relative mx-auto max-w-[1450px] overflow-hidden rounded-[24px] bg-[#0b4aa2]/20 shadow-[0_20px_55px_rgba(37,99,235,0.14)]">
    {/* BACKGROUND IMAGE */}
    <img
      src="https://media.licdn.com/dms/image/v2/C5112AQGIG8_G66AbkA/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1579168085188?e=2147483647&v=beta&t=xquVFCknrv_RMDFFjKmjTOuHX-IUl7wTYkHlfOYEtyA"
      alt=""
      aria-hidden="true"
      className="cta-bg absolute inset-0 h-full w-full object-cover object-center opacity-100"
    />

    <div className="absolute inset-0 bg-gradient-to-r from-[#063b86]/55 via-[#0b5db5]/20 to-transparent" />

    <div className="absolute inset-0 bg-[#052b67]/10" />

    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cta-glow-one absolute -left-24 -top-52 h-[280px] w-[280px] rounded-full bg-blue-400/10 blur-[100px]" />

      <div className="cta-glow-two absolute right-[20%] -top-52 h-[260px] w-[260px] rounded-full bg-cyan-300/[0.06] blur-[100px]" />

      <div className="cta-glow-yellow absolute -bottom-36 right-[8%] h-[250px] w-[250px] rounded-full bg-[#ffc928]/[0.08] blur-[90px]" />

      <span className="cta-dot absolute left-[5%] top-[18%] h-1.5 w-1.5 rounded-full bg-blue-200/70" />
      <span className="cta-dot cta-dot-2 absolute right-[31%] top-[20%] h-2 w-2 rounded-full bg-[#ffc928]/80" />
      <span className="cta-dot cta-dot-3 absolute bottom-[18%] right-[22%] h-1.5 w-1.5 rounded-full bg-blue-200/60" />
    </div>

    {/* BORDER */}
    <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/20" />

    {/* CONTENT */}
    <div className="relative z-10 flex min-h-[220px] flex-col justify-center gap-6 px-6 py-7 sm:px-8 lg:min-h-[235px] lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-8">

      {/* LEFT */}
      <div className="cta-content flex max-w-[760px] items-start gap-4">

        {/* MIC ICON */}
        <div className="relative hidden shrink-0 sm:block">
          <div className="cta-mic-ring absolute inset-0 rounded-[17px] border border-[#ffc928]/30" />

          <div className="cta-mic relative flex h-[62px] w-[62px] items-center justify-center rounded-[17px] border border-white/20 bg-[#073a80]/35 text-[#ffc928] shadow-[0_12px_30px_rgba(0,0,0,0.14)] backdrop-blur-md">
            <Mic className="h-7 w-7" />
          </div>
        </div>

        {/* TEXT */}
        <div>
          {/* LABEL */}
          <div className="flex items-center gap-2.5">
            <span className="h-[2px] w-6 rounded-full bg-[#ffc928]" />

            <span className="text-[9px] font-black uppercase tracking-[0.23em] text-white sm:text-[10px]">
              Đã đến lúc tỏa sáng
            </span>
          </div>

          {/* TITLE */}
          <h2 className="mt-3 text-[26px] font-black leading-[1.08] tracking-[-0.035em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] sm:text-[29px] lg:text-[32px]">
            Sẵn sàng làm chủ{' '}
            <span className="relative inline-block text-[#ffc928]">
              giọng nói?
              <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-[#ffc928] to-transparent" />
            </span>
          </h2>

          {/* DESCRIPTION */}
          <p className="mt-3 max-w-[650px] text-[11px] font-semibold leading-5 text-white/85 drop-shadow-sm sm:text-[12px]">
            Bắt đầu hành trình luyện giọng cùng MSEEK, cải thiện sự tự tin,
            phong thái và khả năng làm chủ sân khấu của bạn.
          </p>

          {/* BENEFITS */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {[
              'Lộ trình bài bản',
              'Thực hành cùng AI',
              'Giảng viên phản hồi',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-[9px] font-bold text-white/90 sm:text-[10px]"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#073a80]/40 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffc928]" />
                </span>

                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="cta-button-wrapper shrink-0 lg:pl-8">
        <button
          type="button"
          onClick={() => onNavigate('register')}
          className="cta-button group/button relative flex min-w-[190px] items-center justify-center gap-3 overflow-hidden rounded-[14px] bg-[#ffc928] px-6 py-3.5 text-[13px] font-black text-[#071d4c] shadow-[0_14px_35px_rgba(255,201,40,0.28)] transition-all duration-500 hover:-translate-y-1 hover:bg-[#ffd54a] hover:shadow-[0_20px_45px_rgba(255,201,40,0.4)]"
        >
          {/* SHINE */}
          <span className="cta-button-shine pointer-events-none absolute -left-[60%] top-[-100%] h-[300%] w-[35%] rotate-[20deg] bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <span className="relative z-10">
            Đăng ký ngay
          </span>

          <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#071d4c]/10 transition-all duration-300 group-hover/button:translate-x-1 group-hover/button:bg-[#071d4c] group-hover/button:text-white">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>

        <div className="mt-2 text-center text-[8px] font-semibold text-white/70 drop-shadow-sm">
          Bắt đầu hành trình của bạn ngay hôm nay
        </div>
      </div>
    </div>

    {/* BOTTOM LIGHT */}
    <div className="cta-bottom-line absolute bottom-0 left-[8%] h-[2px] w-[84%] origin-center rounded-full bg-gradient-to-r from-transparent via-[#ffc928] to-transparent opacity-60" />

    {/* ANIMATION */}
    <style>{`
      @keyframes ctaBackground {
        0%, 100% {
          transform: scale(1.02);
        }
        50% {
          transform: scale(1.06);
        }
      }

      @keyframes ctaGlowOne {
        0%, 100% {
          transform: translate3d(0, 0, 0) scale(1);
        }
        50% {
          transform: translate3d(70px, 25px, 0) scale(1.12);
        }
      }

      @keyframes ctaGlowTwo {
        0%, 100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(-55px, 35px, 0);
        }
      }

      @keyframes ctaGlowYellow {
        0%, 100% {
          transform: translate3d(0, 0, 0) scale(1);
        }
        50% {
          transform: translate3d(-40px, -20px, 0) scale(1.15);
        }
      }

      @keyframes ctaMic {
        0%, 100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-5px) rotate(-2deg);
        }
      }

      @keyframes ctaMicRing {
        0% {
          transform: scale(1);
          opacity: 0.5;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }

      @keyframes ctaDot {
        0%, 100% {
          opacity: 0.35;
          transform: translateY(0);
        }
        50% {
          opacity: 1;
          transform: translateY(-7px);
        }
      }

      @keyframes ctaButtonShine {
        0% {
          left: -60%;
        }
        45%, 100% {
          left: 150%;
        }
      }

      @keyframes ctaBottomLine {
        0%, 100% {
          transform: scaleX(0.4);
          opacity: 0.25;
        }
        50% {
          transform: scaleX(1);
          opacity: 0.75;
        }
      }

      @keyframes ctaContentReveal {
        from {
          opacity: 0;
          transform: translate3d(-20px, 12px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      @keyframes ctaButtonReveal {
        from {
          opacity: 0;
          transform: translate3d(20px, 12px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }

      .cta-bg {
        animation: ctaBackground 14s ease-in-out infinite;
        will-change: transform;
      }

      .cta-glow-one {
        animation: ctaGlowOne 10s ease-in-out infinite;
      }

      .cta-glow-two {
        animation: ctaGlowTwo 12s ease-in-out infinite;
      }

      .cta-glow-yellow {
        animation: ctaGlowYellow 11s ease-in-out infinite;
      }

      .cta-mic {
        animation: ctaMic 4s ease-in-out infinite;
      }

      .cta-mic-ring {
        animation: ctaMicRing 2.7s ease-out infinite;
      }

      .cta-dot {
        animation: ctaDot 3s ease-in-out infinite;
      }

      .cta-dot-2 {
        animation-delay: 0.8s;
      }

      .cta-dot-3 {
        animation-delay: 1.5s;
      }

      .cta-content {
        animation: ctaContentReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .cta-button-wrapper {
        animation: ctaButtonReveal 0.8s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .cta-button-shine {
        animation: ctaButtonShine 4.5s ease-in-out infinite;
      }

      .cta-bottom-line {
        animation: ctaBottomLine 5s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .cta-bg,
        .cta-glow-one,
        .cta-glow-two,
        .cta-glow-yellow,
        .cta-mic,
        .cta-mic-ring,
        .cta-dot,
        .cta-content,
        .cta-button-wrapper,
        .cta-button-shine,
        .cta-bottom-line {
          animation: none !important;
        }
      }
    `}</style>
  </div>
</section>
    </main>
  );
};
