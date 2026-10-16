import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Gauge,
  SpellCheck,
  Filter,
  Activity,
  Bot,
  UserCheck,
  CheckCircle2,
  Award,
  ChevronRight,
  Headphones,
  Sliders,
  Tv,
  UploadCloud,
  FileAudio,
  AlertCircle,
  HelpCircle,
  Star,
  Check,
  Flame,
  Zap,
} from 'lucide-react';
import { Course, ScreenType, User } from '../../../types';

interface AiVoiceCoachPageProps {
  onNavigate: (screen: ScreenType) => void;
  user?: User | null;
  onSelectCourse?: (course: Course) => void;
}

interface DemoSample {
  id: string;
  title: string;
  category: string;
  score: number;
  wpm: number;
  wpmStatus: string;
  fillersCount: number;
  fillersList: string[];
  pausesCount: number;
  pausesStatus: string;
  durationSec: number;
  audioUrl: string;
  script: {
    text: string;
    type: 'normal' | 'good' | 'filler' | 'pause';
    note?: string;
  }[];
}

const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'sample-1',
    title: 'Bài thi: MC Sự Kiện Lễ Khai Mạc Doanh Nghiệp',
    category: 'MC Sự Kiện • Phong cách Trịnh Trọng',
    score: 88,
    wpm: 135,
    wpmStatus: 'Chuẩn nhịp (120 - 140 WPM)',
    fillersCount: 2,
    fillersList: ['ờ', 'à'],
    pausesCount: 4,
    pausesStatus: '4 đoạn hợp lý',
    durationSec: 21,
    audioUrl: '/audio/gala.m4a',
    script: [
      { text: 'Kính chào quý vị đại biểu, quý đối tác và toàn thể cán bộ nhân viên đã có mặt tại buổi lễ ngày hôm nay!', type: 'good' },
      { text: '[0.8s]', type: 'pause', note: 'Khoảng nghỉ ngắt đoạn chuẩn' },
      { text: 'Chào mừng quý vị đến với sự kiện kỷ niệm 10 năm thành lập MSEEK Corp.', type: 'normal' },
      { text: 'ờ...', type: 'filler', note: 'Từ đệm phát hiện ở giây thứ 32 (gây chững nhịp)' },
      { text: 'Trải qua chặng đường một thập kỷ kiến tạo và phát triển,', type: 'good' },
      { text: '[0.6s]', type: 'pause', note: 'Khoảng nghỉ lấy hơi tự nhiên' },
      { text: 'chúng tôi tự hào', type: 'normal' },
      { text: 'à...', type: 'filler', note: 'Từ đệm phát hiện ở phút 01:04' },
      { text: 'khi luôn nhận được sự đồng hành và tin tưởng trọn vẹn từ quý vị!', type: 'good' },
    ],
  },
  {
    id: 'sample-2',
    title: 'Bài luyện: MC Bản Tin Thời Sự & Kinh Tế',
    category: 'MC Truyền Hình • Nhịp Nhanh Dứt Khoát',
    score: 93,
    wpm: 142,
    wpmStatus: 'Rất tốt (135 - 150 WPM)',
    fillersCount: 0,
    fillersList: [],
    pausesCount: 6,
    pausesStatus: '6 đoạn hoàn hảo',
    durationSec: 19,
    audioUrl: '/audio/thi-truong.m4a',
    script: [
      { text: 'Chào mừng quý vị khán giả đang theo dõi Bản tin Kinh tế 24h trưa nay.', type: 'good' },
      { text: '[0.5s]', type: 'pause', note: 'Ngắt ý chính xác' },
      { text: 'Thị trường chứng khoán trong nước phiên sáng nay tiếp tục ghi nhận sắc xanh tích cực,', type: 'good' },
      { text: '[0.7s]', type: 'pause', note: 'Nghỉ lấy hơi chuẩn truyền hình' },
      { text: 'trong đó nhóm cổ phiếu bán lẻ và công nghệ dẫn đầu đà bứt phá với thanh khoản kỷ lục.', type: 'good' },
      { text: '[0.6s]', type: 'pause', note: 'Chuyển mạch thông tin' },
      { text: 'Thông tin chi tiết sẽ được chúng tôi gửi tới quý vị ngay sau đây.', type: 'good' },
    ],
  },
];

export const AiVoiceCoachPage: React.FC<AiVoiceCoachPageProps> = ({
  onNavigate,
  user,
}) => {
  const navigate = useNavigate();

  // Selected sample
  const [activeSampleId, setActiveSampleId] = useState<string>('sample-1');
  const activeSample = DEMO_SAMPLES.find((s) => s.id === activeSampleId) || DEMO_SAMPLES[0];

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(21);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Fallback speech synthesis if audio file fails
  const speakWithSpeechSynthesis = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const textToSpeak = activeSample.script.map((s) => (s.type !== 'pause' ? s.text : '')).join(' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    utterance.rate = activeSampleId === 'sample-1' ? 0.95 : 1.1;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) utterance.voice = viVoice;

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTimeSec(0);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        try {
          audioRef.current.muted = isMuted;
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Audio tag play failed, falling back to Web Speech Synthesis:', err);
          speakWithSpeechSynthesis();
        }
      } else {
        speakWithSpeechSynthesis();
      }
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isPlaying) {
        speakWithSpeechSynthesis();
      }
    }
    setCurrentTimeSec(0);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  // Reset when sample changes
  const handleSelectSample = (id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSampleId(id);
    setIsPlaying(false);
    setCurrentTimeSec(0);

    const nextSample = DEMO_SAMPLES.find((s) => s.id === id);
    if (nextSample && audioRef.current) {
      audioRef.current.src = nextSample.audioUrl;
      audioRef.current.load();
    }
  };

  const formatTime = (seconds: number) => {
    const safeSec = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (percentage: number) => {
    const total = durationSec || activeSample.durationSec || 18;
    const newTime = Math.max(0, Math.min(total, (percentage / 100) * total));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTimeSec(Math.round(newTime));
  };

  const scrollToDemo = () => {
    document.getElementById('ai-demo-widget')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* =========================================================================
          SECTION 1: HERO BANNER - GIỚI THIỆU CÔNG NGHỆ AI VOICE COACH
      ========================================================================== */}
      <section className="relative overflow-hidden bg-[#03163f] text-white pt-12 pb-24 lg:pt-16 lg:pb-32">
        {/* Ambient Stage Lights & Glow Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Spotlight beams */}
          <div className="absolute -top-[160px] left-[15%] h-[680px] w-[200px] rotate-[15deg] bg-gradient-to-b from-[#fff4c7]/40 via-[#ffd76a]/15 to-transparent blur-[35px]" />
          <div className="absolute -top-[180px] right-[20%] h-[720px] w-[220px] -rotate-[15deg] bg-gradient-to-b from-[#93c5fd]/30 via-[#38bdf8]/10 to-transparent blur-[40px]" />
          
          {/* Circular color glows */}
          <div className="absolute left-[8%] top-[10%] h-[380px] w-[380px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute right-[5%] top-[15%] h-[420px] w-[420px] rounded-full bg-[#ffc928]/15 blur-[140px]" />
          <div className="absolute bottom-[-100px] left-[35%] h-[320px] w-[500px] rounded-full bg-cyan-500/15 blur-[130px]" />

          {/* Micro dots / stars */}
          <span className="absolute left-[12%] top-[25%] h-2 w-2 rounded-full bg-[#ffc928]/60 blur-[1px] animate-pulse" />
          <span className="absolute left-[38%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/70 blur-[1px]" />
          <span className="absolute right-[14%] top-[30%] h-2.5 w-2.5 rounded-full bg-[#ffc928]/50 blur-[2px] animate-ping" />
          <span className="absolute right-[28%] bottom-[25%] h-2 w-2 rounded-full bg-cyan-300/60 blur-[1px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main Hero Header */}
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-gradient-to-r from-amber-500/15 via-[#ffc928]/20 to-blue-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd95e] shadow-lg backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-[#ffc928] animate-spin" style={{ animationDuration: '6s' }} />
              <span>ĐỘT PHÁ CÔNG NGHỆ MC 4.0 • MSEEK AI VOICE COACH</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl font-black leading-[1.12] tracking-[-0.03em] text-white sm:text-4xl md:text-5xl lg:text-[54px]">
              Trợ Lý AI Phân Tích &amp; Chấm Điểm Giọng Nói MC{' '}
              <span className="bg-gradient-to-r from-[#ffe58f] via-[#ffc928] to-[#ffd76a] bg-clip-text text-transparent">
                Chuyên Nghiệp 24/7
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-blue-100/90 sm:text-lg">
              Nhận phản hồi tức thì về <span className="font-bold text-white">phát âm</span>,{' '}
              <span className="font-bold text-white">tốc độ nói (WPM)</span>,{' '}
              <span className="font-bold text-white">lọc từ đệm</span> và{' '}
              <span className="font-bold text-white">nhịp điệu ngắt nghỉ</span> ngay sau khi hoàn thành bài thu âm.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={scrollToDemo}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#ffc928] to-[#ffb800] px-8 py-4 text-sm font-black text-[#071d4c] shadow-[0_12px_35px_rgba(255,201,40,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(255,201,40,0.45)] active:translate-y-0"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#071d4c]/10 transition-transform group-hover:scale-110">
                  <Play className="h-3.5 w-3.5 fill-[#071d4c]" />
                </div>
                <span>Luyện tập thử ngay</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('courses')}
                className="group inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/35 active:scale-95"
              >
                <span>Khám phá khóa học</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Quick stats micro bar */}
            <div className="mt-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 text-center text-xs text-blue-200/80 sm:gap-6 sm:text-sm">
              <div>
                <div className="text-lg font-black text-white sm:text-xl">98.5%</div>
                <div className="text-[11px] text-blue-200/70 sm:text-xs">Độ chính xác chuẩn ngữ âm Việt</div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-lg font-black text-[#ffc928] sm:text-xl">&lt; 3 Giây</div>
                <div className="text-[11px] text-blue-200/70 sm:text-xs">Phân tích &amp; trả kết quả tức thì</div>
              </div>
              <div>
                <div className="text-lg font-black text-white sm:text-xl">24/7</div>
                <div className="text-[11px] text-blue-200/70 sm:text-xs">Luyện tập không giới hạn</div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              INTERACTIVE DEMO WIDGET - BẢNG XEM THỬ KẾT QUẢ AI
          ========================================================================== */}
          <div id="ai-demo-widget" className="mt-14 scroll-mt-24 sm:mt-16">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-[#071c48]/85 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
              {/* Inner subtle glow */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#ffc928]/10 blur-[90px]" />

              {/* Widget Header bar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="h-4 w-[1px] bg-white/20" />
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#ffc928]" />
                    <span className="text-xs font-black tracking-wide text-white uppercase sm:text-sm">
                      Bảng Xem Thử Kết Quả AI (Interactive Demo)
                    </span>
                  </div>
                </div>

                {/* Sample Selector Pills */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/25 p-1 text-xs">
                  {DEMO_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample.id)}
                      className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                        activeSampleId === sample.id
                          ? 'bg-[#ffc928] text-[#071d4c] shadow-md'
                          : 'text-blue-100/70 hover:text-white'
                      }`}
                    >
                      {sample.id === 'sample-1' ? 'Mẫu 1: MC Gala' : 'Mẫu 2: Bản tin thời sự'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Sample Title */}
              <div className="relative z-10 mt-4 flex items-center justify-between text-xs text-blue-200/80">
                <span className="font-semibold text-white/90">{activeSample.title}</span>
                <span className="hidden sm:inline font-medium text-[#ffd95e]">{activeSample.category}</span>
              </div>

              {/* Hidden Real Audio Element */}
              <audio
                ref={audioRef}
                src={activeSample.audioUrl}
                preload="auto"
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (dur && !isNaN(dur) && isFinite(dur)) {
                    setDurationSec(Math.round(dur));
                  }
                }}
                onTimeUpdate={(e) => {
                  setCurrentTimeSec(Math.round(e.currentTarget.currentTime));
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTimeSec(0);
                }}
              />

              {/* Audio Waveform Player Bar */}
              <div className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-[#041231]/90 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Controls: Play/Pause and Reset */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="group flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ffc928] to-[#ffd76a] text-[#071d4c] shadow-[0_4px_16px_rgba(255,201,40,0.3)] transition-all hover:scale-105 active:scale-95"
                      title={isPlaying ? 'Tạm dừng giọng đọc' : 'Nghe giọng đọc mẫu'}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-[#071d4c]" />
                      ) : (
                        <Play className="h-5 w-5 fill-[#071d4c] ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-200 transition-all hover:bg-white/10 hover:text-white"
                      title="Quay lại đầu"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-200 transition-all hover:bg-white/10 hover:text-white"
                      title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-blue-200/80">
                      <span className="flex items-center gap-1.5 text-[#ffc928]">
                        <span className="h-2 w-2 rounded-full bg-[#ffc928] animate-pulse" />
                        Audio Waveform Analysis • Giọng MC Thực
                      </span>
                      <span>
                        <span className="text-white">{formatTime(currentTimeSec)}</span> / {formatTime(durationSec || activeSample.durationSec)}
                      </span>
                    </div>

                    {/* Waveform Bars */}
                    <div
                      className="flex h-12 w-full items-center gap-[3px] rounded-xl bg-black/40 px-3 cursor-pointer select-none"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                        handleSeek(pct);
                      }}
                      title="Nhấn vào thanh âm để nhảy đến thời điểm tương ứng"
                    >
                      {Array.from({ length: 42 }).map((_, idx) => {
                        const seedHeights = [
                          20, 35, 60, 45, 80, 95, 70, 40, 25, 55,
                          75, 90, 85, 60, 30, 45, 80, 100, 75, 40,
                          20, 15, 65, 85, 95, 70, 50, 30, 60, 85,
                          90, 65, 40, 25, 50, 70, 85, 60, 35, 20,
                          45, 60
                        ];
                        const barHeight = seedHeights[idx % seedHeights.length];
                        const total = durationSec || activeSample.durationSec || 18;
                        const progressPct = (currentTimeSec / total) * 100;
                        const barPct = (idx / 42) * 100;
                        const isPlayed = barPct <= progressPct;

                        return (
                          <div
                            key={idx}
                            className="relative flex-1 flex items-center justify-center h-full group/bar"
                          >
                            <span
                              className={`w-full rounded-full transition-all duration-150 ${
                                isPlayed
                                  ? 'bg-[#ffc928] shadow-[0_0_8px_rgba(255,201,40,0.5)]'
                                  : 'bg-white/20 hover:bg-white/40'
                              } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
                              style={{
                                height: `${Math.max(15, barHeight)}%`,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 KEY RESULT METRICS GRID (As described in user mockup) */}
              <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {/* 1. Phát âm (STT) */}
                <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md transition-all hover:border-blue-400/40 hover:bg-white/15">
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/70">
                      Phát âm (STT)
                    </span>
                    <SpellCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white sm:text-3xl">
                      {activeSample.score}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/60">/100</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-emerald-300">
                    ✓ Độ chuẩn ngữ âm cao
                  </div>
                </div>

                {/* 2. Tốc độ (WPM) */}
                <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-white/15">
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/70">
                      Tốc độ (WPM)
                    </span>
                    <Gauge className="h-4 w-4 text-[#ffc928]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white sm:text-3xl">
                      {activeSample.wpm}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/60">wpm</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-[#ffd95e] truncate">
                    {activeSample.wpmStatus}
                  </div>
                </div>

                {/* 3. Từ đệm phát hiện */}
                <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md transition-all hover:border-rose-400/40 hover:bg-white/15">
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/70">
                      Từ đệm phát hiện
                    </span>
                    <Filter className="h-4 w-4 text-amber-300" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white sm:text-3xl">
                      {activeSample.fillersCount}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/60">từ</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-amber-300 truncate">
                    {activeSample.fillersCount > 0
                      ? `(${activeSample.fillersList.map((f) => `"${f}"`).join(', ')})`
                      : 'Tuyệt vời, không có từ đệm!'}
                  </div>
                </div>

                {/* 4. Khoảng nghỉ */}
                <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 backdrop-blur-md transition-all hover:border-cyan-400/40 hover:bg-white/15">
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200/70">
                      Khoảng nghỉ
                    </span>
                    <Activity className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white sm:text-3xl">
                      {activeSample.pausesCount}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/60">đoạn</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-cyan-300">
                    {activeSample.pausesStatus}
                  </div>
                </div>
              </div>

              {/* Teleprompter Transcript Box */}
              <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-200">
                    <Mic className="h-3.5 w-3.5 text-[#ffc928]" />
                    <span>Chi Tiết So Khớp Kịch Bản &amp; Đối Soát AI</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm leading-relaxed text-blue-100 sm:text-base">
                  {activeSample.script.map((item, idx) => {
                    if (item.type === 'filler') {
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-amber-400/25 px-2 py-0.5 font-bold text-amber-300 border border-amber-400/50"
                        >
                          <AlertCircle className="h-3 w-3 mr-1 text-amber-300" />
                          {item.text}
                        </span>
                      );
                    }
                    if (item.type === 'pause') {
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-cyan-400/15 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-400/30"
                        >
                          {item.text}
                        </span>
                      );
                    }
                    if (item.type === 'good') {
                      return (
                        <span key={idx} className="text-white font-medium">
                          {item.text}
                        </span>
                      );
                    }
                    return (
                      <span key={idx} className="text-blue-100/90">
                        {item.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 4 CHỈ SỐ AI PHÂN TÍCH CHUYÊN SÂU
      ========================================================================== */}
      <section className="relative overflow-hidden bg-[#f8fafc] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
              TIÊU CHUẨN ĐO LƯỜNG CHUYÊN SÂU
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#071d4c] sm:text-4xl lg:text-5xl">
              4 Chỉ Số AI Phân Tích Chuyên Sâu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
              Hệ thống thuật toán âm học và nhận diện giọng nói tiếng Việt chuyên sâu giúp bạn bóc tách từng chi tiết nhỏ nhất trong giọng nói để hoàn thiện kỹ năng MC đỉnh cao.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {/* Card 1: So khớp phát âm (STT) */}
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_10px_30px_rgba(7,29,76,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/50 hover:shadow-[0_20px_40px_rgba(7,29,76,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                  <SpellCheck className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-blue-100/60 px-3 py-1 text-[11px] font-black text-blue-700">
                  CHỈ SỐ 01
                </span>
              </div>

              <h3 className="mt-6 text-xl font-black text-[#071d4c]">
                1. So khớp phát âm (STT)
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Chuyển giọng nói thành chữ để đối soát kịch bản. Đối chiếu từng âm tiết, phụ âm đầu, vần và thanh điệu tiếng Việt để phát hiện các lỗi phát âm sai, nói ngọng, nuốt âm hay dính chữ.
              </p>

              {/* Visual Indicator Box */}
              <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Độ chuẩn xác âm vần</span>
                  <span className="font-bold text-blue-600">98.5% chuẩn ngữ âm</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 w-[94%]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Phát hiện nuốt chữ
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Chuẩn thanh điệu hỏi/ngã
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Tốc độ nói (WPM) */}
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_10px_30px_rgba(7,29,76,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_20px_40px_rgba(7,29,76,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
                  <Gauge className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-amber-100/60 px-3 py-1 text-[11px] font-black text-amber-700">
                  CHỈ SỐ 02
                </span>
              </div>

              <h3 className="mt-6 text-xl font-black text-[#071d4c]">
                2. Tốc độ nói (WPM)
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Đo chính xác số từ/phút, tránh nói quá nhanh hoặc quá chậm. Cung cấp ngưỡng chuẩn từng thể loại: Bản tin thời sự (135 - 150 wpm), Sự kiện sân khấu (120 - 140 wpm), Talkshow (110 - 130 wpm).
              </p>

              {/* Visual Indicator Box */}
              <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Dải tốc độ WPM tối ưu</span>
                  <span className="font-bold text-amber-600">120 - 145 từ/phút</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#ffc928] w-[88%]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Cảnh báo nói nhanh
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Ổn định nhịp thở
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Nhận diện từ đệm */}
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_10px_30px_rgba(7,29,76,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-rose-400/50 hover:shadow-[0_20px_40px_rgba(7,29,76,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-transform group-hover:scale-110">
                  <Filter className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-rose-100/60 px-3 py-1 text-[11px] font-black text-rose-700">
                  CHỈ SỐ 03
                </span>
              </div>

              <h3 className="mt-6 text-xl font-black text-[#071d4c]">
                3. Nhận diện từ đệm
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tự động phát hiện "ờ, à, ừm" gây xao nhãng. Khoanh vùng chính xác từng giây xuất hiện từ đệm để học viên ý thức thói quen và rèn luyện phong thái nói tự tin, dứt khoát trước công chúng.
              </p>

              {/* Visual Indicator Box */}
              <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Mức độ lọc từ đệm</span>
                  <span className="font-bold text-rose-600">Cảnh báo tức thì</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 w-[96%]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Khoanh vùng: "ờ, à, ừm"
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Đếm tần suất xuất hiện
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Phân tích khoảng nghỉ */}
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_10px_30px_rgba(7,29,76,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_20px_40px_rgba(7,29,76,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 transition-transform group-hover:scale-110">
                  <Activity className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-cyan-100/60 px-3 py-1 text-[11px] font-black text-cyan-700">
                  CHỈ SỐ 04
                </span>
              </div>

              <h3 className="mt-6 text-xl font-black text-[#071d4c]">
                4. Phân tích khoảng nghỉ
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Đo thời gian dừng nghỉ để giữ nhịp truyền cảm. Phân biệt khoảng nghỉ chuẩn (0.5s - 1.2s để khán giả tiếp nhận ý) với khoảng ngập ngừng chết quá lâu do quên lời hay đứt hơi.
              </p>

              {/* Visual Indicator Box */}
              <div className="mt-5 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Khoảng dừng tự nhiên</span>
                  <span className="font-bold text-cyan-600">0.5s - 1.2s lý tưởng</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 w-[90%]" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Ngắt câu theo ngữ nghĩa
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Tạo điểm nhấn kịch tính
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: QUY TRÌNH THỰC HÀNH 3 BƯỚC
      ========================================================================== */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
              DỄ DÀNG TIẾP CẬN &amp; LUYỆN TẬP
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#071d4c] sm:text-4xl lg:text-5xl">
              Quy Trình Thực Hành 3 Bước
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
              Không cần chuẩn bị thiết bị đắt tiền, bạn có thể biến phòng làm việc thành phòng thu MC chuyên nghiệp bất cứ lúc nào.
            </p>
          </div>

          {/* Steps Timeline Grid */}
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative flex flex-col rounded-3xl border border-slate-200/80 bg-[#f8fafc] p-8 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-500/20">
                  01
                </span>
                <span className="rounded-full bg-blue-100/70 px-3 py-1 text-[11px] font-black text-blue-800">
                  BƯỚC 1
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3 text-blue-600">
                <Tv className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider">Teleprompter Thông Minh</span>
              </div>

              <h3 className="mt-3 text-xl font-black text-[#071d4c]">
                Đọc kịch bản mẫu qua màn hình chữ chạy Teleprompter
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Màn hình nhắc chữ thông minh hỗ trợ tùy chỉnh cỡ chữ, tốc độ cuộn nhịp nhàng theo nhịp thở. Hơn 100+ kịch bản mẫu đa dạng từ Khai mạc, Gala, Tiệc cưới đến Bản tin thời sự.
              </p>

              <div className="mt-6 border-t border-slate-200/70 pt-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Tùy chỉnh tốc độ WPM trực quan</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col rounded-3xl border border-slate-200/80 bg-[#f8fafc] p-8 shadow-sm transition-all hover:border-amber-400 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffc928] text-lg font-black text-[#071d4c] shadow-md shadow-amber-400/20">
                  02
                </span>
                <span className="rounded-full bg-amber-100/70 px-3 py-1 text-[11px] font-black text-amber-800">
                  BƯỚC 2
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3 text-amber-600">
                <Mic className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider">Thu Âm Đa Kênh</span>
              </div>

              <h3 className="mt-3 text-xl font-black text-[#071d4c]">
                Thu âm trực tiếp trên web hoặc tải lên tệp audio (.mp3, .wav)
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Ghi âm độ nét cao một chạm ngay trên trình duyệt máy tính hoặc điện thoại với bộ lọc khử nhiễu tự động, hoặc linh hoạt tải lên tệp thu sẵn từ thiết bị chuyên dụng của bạn.
              </p>

              <div className="mt-6 border-t border-slate-200/70 pt-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Hỗ trợ .mp3, .wav, .m4a chất lượng cao</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col rounded-3xl border border-slate-200/80 bg-[#f8fafc] p-8 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-md shadow-indigo-500/20">
                  03
                </span>
                <span className="rounded-full bg-indigo-100/70 px-3 py-1 text-[11px] font-black text-indigo-800">
                  BƯỚC 3
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3 text-indigo-600">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider">Báo Cáo Toàn Diện</span>
              </div>

              <h3 className="mt-3 text-xl font-black text-[#071d4c]">
                Nhận báo cáo phân tích AI &amp; luyện tập lại không giới hạn
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Bảng phân tích chi tiết trả về chỉ sau 3 giây. Xem rõ từng từ phát âm sai, điểm mạnh, lỗi cần sửa và thoải mái thu âm lại nhiều lần cho đến khi đạt kết quả mong muốn.
              </p>

              <div className="mt-6 border-t border-slate-200/70 pt-4 text-xs font-semibold text-slate-500 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Luyện tập không giới hạn số lần thu</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: MÔ HÌNH ĐÁNH GIÁ KẾT HỢP (HYBRID EVALUATION)
      ========================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f8fafc] via-slate-50 to-[#edf2f9] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
              PHƯƠNG PHÁP ĐÀO TẠO TOÀN DIỆN
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#071d4c] sm:text-4xl lg:text-5xl">
              Mô Hình Đánh Giá Kết Hợp (Hybrid Evaluation)
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
              Sự kết hợp hoàn hảo giữa công nghệ AI chính xác 24/7 và chiều sâu kinh nghiệm thực chiến từ các MC &amp; Giảng viên truyền hình danh tiếng.
            </p>
          </div>

          {/* 2-Column Comparison Layout */}
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Column 1: AI Voice Coach */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-blue-200/80 bg-white p-8 shadow-[0_15px_35px_rgba(37,99,235,0.06)] transition-all hover:border-blue-400">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <Bot className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                    CÔNG NGHỆ CHẤM ĐIỂM TỨC THÌ
                  </span>
                  <h3 className="text-2xl font-black text-[#071d4c]">
                    AI Voice Coach
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Chấm điểm kỹ thuật nhanh chóng, tức thì 24/7
                    </strong>
                    <span className="text-xs text-slate-600">
                      Không cần chờ đợi, nhận phản hồi ngay trong 3 giây sau khi thu âm.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Đo lường định lượng chính xác từng giây
                    </strong>
                    <span className="text-xs text-slate-600">
                      Phân tích chỉ số WPM, phát hiện từ đệm ("ờ, à"), đối soát sai sót từng âm tiết.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Luyện tập tự do &amp; sửa lỗi không giới hạn
                    </strong>
                    <span className="text-xs text-slate-600">
                      Thoải mái thử nghiệm nhiều phong cách dẫn trước khi chọn bài tốt nhất nộp cho giảng viên.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-blue-50/80 p-4 border border-blue-100 text-xs font-semibold text-blue-800">
                💡 <em>Vai trò cốt lõi:</em> Giải quyết 100% các lỗi kỹ thuật âm học, phát âm và tốc độ nền tảng của học viên một cách nhanh chóng.
              </div>
            </div>

            {/* Column 2: Giảng viên chuyên nghiệp */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-amber-200/80 bg-white p-8 shadow-[0_15px_35px_rgba(255,201,40,0.08)] transition-all hover:border-amber-400">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ffc928] to-[#ffb800] text-[#071d4c] shadow-lg shadow-amber-400/25">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                    CẢM XÚC &amp; NGHỆ THUẬT SÂN KHẤU
                  </span>
                  <h3 className="text-2xl font-black text-[#071d4c]">
                    Giảng Viên Chuyên Nghiệp
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Nhận xét phong thái, cảm xúc và chấm điểm chính thức
                    </strong>
                    <span className="text-xs text-slate-600">
                      Đánh giá chiều sâu cảm xúc, độ truyền cảm, biểu cảm ánh mắt và ngữ điệu tự nhiên.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Góp ý cá nhân hóa &amp; định hình phong cách riêng
                    </strong>
                    <span className="text-xs text-slate-600">
                      Lời khuyên chuyên sâu từ MC VTV, HTV giúp bạn khai phá màu sắc chất giọng độc bản.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 mt-0.5">
                    <Check className="h-3.5 w-3.5 font-black" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-slate-900">
                      Kinh nghiệm xử lý tình huống thực chiến sân khấu
                    </strong>
                    <span className="text-xs text-slate-600">
                      Bí quyết làm chủ sân khấu, ứng biến khi có sự cố và dẫn dắt tâm lý người nghe.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80 text-xs font-semibold text-amber-900">
                ✨ <em>Vai trò cốt lõi:</em> Thổi hồn vào giọng nói, nâng tầm bản lĩnh sân khấu và đồng hành trên con đường MC chuyên nghiệp.
              </div>
            </div>
          </div>

          {/* Central Synergy Banner */}
          <div className="mt-10 rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-900 via-[#071d4c] to-blue-950 p-6 text-center text-white shadow-xl sm:p-8">
            <h4 className="text-lg font-black sm:text-xl">
              Sự Cộng Hưởng Hoàn Hảo Cho Học Viên MSEEK
            </h4>
            <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-blue-200/90 leading-relaxed">
              Bạn tự do mài giũa kỹ thuật mỗi ngày cùng AI Voice Coach 24/7, và tự tin nộp bài thu âm tâm đắc nhất để nhận góp ý chân thành từ giảng viên hướng dẫn.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FOOTER CALL-TO-ACTION
      ========================================================================== */}
      <section className="relative overflow-hidden bg-[#03163f] py-20 text-white sm:py-24">
        {/* Animated Background Shimmer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-1/2 h-[380px] w-[380px] -translate-y-1/2 rounded-full bg-blue-500/15 blur-[120px]" />
          <div className="absolute right-[-100px] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[#ffc928]/15 blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03163f]/90 via-[#071d4c]/80 to-[#03163f]/90" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffc928]/30 bg-[#ffc928]/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#ffd95e]">
            <Sparkles className="h-3.5 w-3.5" />
            BẮT ĐẦU HÀNH TRÌNH TỎA SÁNG CỦA BẠN
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
            Bắt đầu cải thiện giọng nói MC của bạn ngay hôm nay cùng MSEEK!
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-blue-100/80 sm:text-base">
            Đăng ký tài khoản miễn phí để trải nghiệm ngay công nghệ AI Voice Coach và nhận tư vấn lộ trình học phù hợp nhất với bạn.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {!user ? (
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#ffc928] px-8 py-4 text-sm font-black text-[#071d4c] shadow-[0_14px_35px_rgba(255,201,40,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd64d] hover:shadow-[0_18px_45px_rgba(255,201,40,0.45)]"
              >
                <span>Đăng ký tài khoản miễn phí</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('courses')}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#ffc928] px-8 py-4 text-sm font-black text-[#071d4c] shadow-[0_14px_35px_rgba(255,201,40,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffd64d]"
              >
                <span>Khám phá các khóa học ngay</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}

            <button
              type="button"
              onClick={scrollToDemo}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-extrabold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20"
            >
              <span>Xem lại Demo phân tích AI</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-200/70">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#ffc928]" />
              Miễn phí trải nghiệm ban đầu
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#ffc928]" />
              Không yêu cầu thẻ tín dụng
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[#ffc928]" />
              Truy cập linh hoạt 24/7 trên mọi thiết bị
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
