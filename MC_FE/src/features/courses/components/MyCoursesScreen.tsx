import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  PlayCircle,
  Play,
  RotateCcw,
  Award,
  CheckCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { EnrolledCourse } from '../../../data/mockData';
import { ScreenType } from '../../../types';
import { useLearnedCoursesQuery } from '../hooks/useCoursesQuery';

interface MyCoursesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

type TabKey = 'all' | 'in-progress' | 'completed';
type SortKey = 'recent' | 'progress' | 'title';

const PAGE_SIZE = 6; // chia đều cho lưới 1, 2 và 3 cột

/* ------------------------------------------------------------------ */
/*  Keyframes (tự chứa, không phụ thuộc cấu hình Tailwind)             */
/* ------------------------------------------------------------------ */

const MOTION_CSS = `
@keyframes mc-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes mc-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mc-fill { from { width: 0; } to { width: var(--w); } }
@keyframes mc-ring { from { stroke-dashoffset: var(--c); } to { stroke-dashoffset: var(--o); } }
@keyframes mc-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.mc-rise { animation: mc-rise .6s cubic-bezier(.2,.75,.25,1) both; }
.mc-fade { animation: mc-fade .3s ease-out both; }
.mc-fill { animation: mc-fill 1s cubic-bezier(.2,.8,.2,1) both; }
.mc-ring { animation: mc-ring 1.2s cubic-bezier(.2,.8,.2,1) .3s both; }
.mc-skel { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size: 200% 100%; animation: mc-shimmer 1.4s linear infinite; }
.mc-skel-dark { background: linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 75%); background-size: 200% 100%; animation: mc-shimmer 1.4s linear infinite; }
.mc-noscroll { scrollbar-width: none; }
.mc-noscroll::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .mc-rise, .mc-fade, .mc-fill, .mc-ring, .mc-skel, .mc-skel-dark { animation: none !important; }
}
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const clampPct = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const hideBrokenImage = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

const getPageItems = (current: number, total: number): (number | '…')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('…');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('…');
  items.push(total);
  return items;
};

/** Đếm số chạy từ giá trị cũ tới giá trị mới */
const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
};

const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 900 }) => {
  const v = useCountUp(value, duration);
  return <>{v.toLocaleString('vi-VN')}</>;
};

/* ------------------------------------------------------------------ */
/*  Sub components                                                     */
/* ------------------------------------------------------------------ */

/** Vòng tiến độ: nét vẽ chạy từ đầu tới % thực tế */
const ProgressRing: React.FC<{ percent: number; size?: number }> = ({ percent, size = 72 }) => {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const o = c * (1 - percent / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="rgba(255,255,255,.15)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#60a5fa"
          strokeDasharray={c}
          strokeDashoffset={o}
          className="mc-ring"
          style={{ ['--c' as string]: c, ['--o' as string]: o } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold tabular-nums text-white">
        {percent}%
      </span>
    </div>
  );
};

const CourseCard: React.FC<{
  item: EnrolledCourse;
  index: number;
  onLearn: () => void;
  onCertificate: () => void;
  onDetail: () => void;
}> = ({ item, index, onLearn, onCertificate, onDetail }) => {
  const done = item.status === 'completed';
  const pct = clampPct(item.progressPercent);

  // Ánh sáng nhẹ chạy theo con trỏ chuột trong thẻ
  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <article
      onMouseMove={handleMove}
      className="mc-rise group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition duration-300 hover:border-blue-200 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]"
      style={delay(Math.min(index, 8) * 70)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(59,130,246,0.10), transparent 70%)',
        }}
      />

      {/* Ảnh bìa: trái = trạng thái, phải = danh mục, luôn đủ cả hai bên */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#0a1440] to-[#16308f]">
        <img
          src={item.course.thumbnail}
          alt={item.course.title}
          loading="lazy"
          onError={hideBrokenImage}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/20" />

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md ${
            done ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
        >
          {done ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {done ? 'Hoàn thành' : 'Đang học'}
        </span>

        <span className="absolute right-3 top-3 max-w-[48%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-md backdrop-blur">
          {item.course.category}
        </span>

        <button
          onClick={onLearn}
          aria-label={done ? 'Học lại khóa học' : 'Tiếp tục học'}
          className="absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-none"
        >
          <span className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-white/95 text-[#0B1437] opacity-0 shadow-lg transition duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </div>

      {/* Nội dung: mỗi hàng đều có đối xứng trái - phải */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="min-h-[2.7rem] text-[15px] font-bold leading-snug text-[#0B1437]">
          <button
            onClick={onDetail}
            title="Xem chi tiết khóa học"
            className="line-clamp-2 w-full cursor-pointer text-left transition-colors hover:text-blue-700 focus-visible:underline focus-visible:outline-none"
          >
            {item.course.title}
          </button>
        </h3>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            <img
              src={item.course.instructor.avatar}
              alt={item.course.instructor.name}
              onError={hideBrokenImage}
              className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
            />
            <span className="truncate font-medium text-slate-600">{item.course.instructor.name}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {item.lastAccessed}
          </span>
        </div>

        <div className="mt-auto space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">
              {item.completedLecturesCount}/{item.totalLecturesCount} bài học
            </span>
            <span className={`font-bold tabular-nums ${done ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`mc-fill h-full rounded-full ${
                done ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
              style={
                {
                  width: `${pct}%`,
                  ['--w' as string]: `${pct}%`,
                  animationDelay: `${Math.min(index, 8) * 70 + 250}ms`,
                } as React.CSSProperties
              }
            />
          </div>
          <p className="min-h-[1rem] truncate text-xs text-slate-500">
            {item.lastLectureTitle && (
              <>
                Bài tiếp theo: <span className="font-medium text-slate-700">{item.lastLectureTitle}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Hành động: luôn 2 nút bằng nhau, thẻ nào cũng cùng bố cục */}
      <div className="relative z-[2] grid grid-cols-2 gap-2 px-4 pb-4">
        <button
          onClick={onLearn}
          className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold text-white transition active:scale-[0.98] ${
            done ? 'bg-[#0B1437] hover:bg-[#16308f]' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {done ? <RotateCcw className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          {done ? 'Học lại' : 'Tiếp tục học'}
        </button>

        {item.certificateId ? (
          <button
            onClick={onCertificate}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-50 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
          >
            <Award className="h-4 w-4" />
            Chứng chỉ
          </button>
        ) : (
          <button
            onClick={onDetail}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Chi tiết
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
};

const CourseCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
    <div className="mc-skel aspect-[16/9]" />
    <div className="space-y-3 p-4">
      <div className="mc-skel h-4 w-4/5 rounded" />
      <div className="mc-skel h-4 w-3/5 rounded" />
      <div className="mc-skel h-3 w-full rounded" />
      <div className="mc-skel h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="mc-skel h-10 rounded-xl" />
        <div className="mc-skel h-10 rounded-xl" />
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export const MyCoursesScreen: React.FC<MyCoursesScreenProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { data: apiEnrolledCourses, isLoading, isError } = useLearnedCoursesQuery();

  // Pure API data (100% real backend data)
  const enrolledCourses: EnrolledCourse[] = (apiEnrolledCourses as EnrolledCourse[]) || [];

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [currentPage, setCurrentPage] = useState(1);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  // Filter courses
  const filteredCourses = enrolledCourses.filter((item) => {
    if (activeTab === 'in-progress' && item.status !== 'in-progress') return false;
    if (activeTab === 'completed' && item.status !== 'completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.course.title.toLowerCase().includes(q);
      const instructorMatch = item.course.instructor.name.toLowerCase().includes(q);
      const categoryMatch = item.course.category.toLowerCase().includes(q);
      return titleMatch || instructorMatch || categoryMatch;
    }
    return true;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
    if (sortBy === 'title') return a.course.title.localeCompare(b.course.title);
    return 0; // Default recent order
  });

  // Pagination calculations
  const totalItems = sortedCourses.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCourses = sortedCourses.slice(startIndex, startIndex + PAGE_SIZE);

  const totalEnrolled = enrolledCourses.length;
  const inProgressCount = enrolledCourses.filter((c) => c.status === 'in-progress').length;
  const completedCount = enrolledCourses.filter((c) => c.status === 'completed').length;
  const certificatesCount = enrolledCourses.filter((c) => c.certificateId).length;

  // Tiến độ tổng thể trên toàn bộ bài học của mọi khóa
  const totalLectures = enrolledCourses.reduce((s, c) => s + (Number(c.totalLecturesCount) || 0), 0);
  const doneLectures = enrolledCourses.reduce((s, c) => s + (Number(c.completedLecturesCount) || 0), 0);
  const overallPct = totalLectures > 0 ? clampPct((doneLectures / totalLectures) * 100) : 0;

  // Khóa học đang học dở gần nhất -> hiện ở thẻ "Tiếp tục học" trên banner
  const spotlight = enrolledCourses.find((c) => c.status === 'in-progress');

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortKey) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const goToPage = (p: number) => {
    setCurrentPage(p);
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: totalEnrolled },
    { key: 'in-progress', label: 'Đang học', count: inProgressCount },
    { key: 'completed', label: 'Hoàn thành', count: completedCount },
  ];

  /* Thanh trượt của bộ lọc */
  const measureTabs = () => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        ready: true,
      });
    }
  };

  useLayoutEffect(() => {
    measureTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, totalEnrolled, inProgressCount, completedCount]);

  useEffect(() => {
    window.addEventListener('resize', measureTabs);
    return () => window.removeEventListener('resize', measureTabs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const stats: { label: string; value: number; icon: React.ElementType; tone: string }[] = [
    { label: 'Đã đăng ký', value: totalEnrolled, icon: BookOpen, tone: 'bg-blue-400/15 text-blue-300' },
    { label: 'Đang học', value: inProgressCount, icon: Clock, tone: 'bg-amber-400/15 text-amber-300' },
    { label: 'Hoàn thành', value: completedCount, icon: CheckCircle, tone: 'bg-emerald-400/15 text-emerald-300' },
    { label: 'Chứng chỉ', value: certificatesCount, icon: Award, tone: 'bg-violet-400/15 text-violet-300' },
  ];

  const hasFilter = activeTab !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <style>{MOTION_CSS}</style>

      <div className="mx-auto max-w-7xl space-y-5">
        {/* ---------------- Banner: 2 nửa bằng nhau, dải số liệu 4 ô đều ---------------- */}
        <section
          className="mc-rise relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8"
          style={{
            backgroundImage:
              'radial-gradient(820px circle at 50% -25%, rgba(96,165,250,.24), transparent 62%), linear-gradient(135deg,#0a1440 0%,#0d1b52 55%,#16308f 100%)',
          }}
        >
          <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Nửa trái */}
            <div className="flex flex-col justify-center gap-5 py-1">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Khóa Học Của Tôi</h1>
                <p className="max-w-lg text-sm leading-relaxed text-blue-100/75">
                  Theo dõi tiến độ học tập, tiếp tục các bài học dở dang và chinh phục các chứng chỉ chuyên nghiệp của
                  bạn.
                </p>
              </div>

              <div className="max-w-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-100/80">
                    Tiến độ tổng thể ({doneLectures}/{totalLectures} bài học)
                  </span>
                  <span className="font-bold tabular-nums text-white">{overallPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
                    style={{
                      width: `${overallPct}%`,
                      transition: 'width 1200ms cubic-bezier(.2,.8,.2,1) 300ms',
                    }}
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={() => onNavigate('courses')}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-400 active:scale-95"
                >
                  <BookOpen className="h-4 w-4" />
                  Khám phá thêm khóa học
                </button>
              </div>
            </div>

            {/* Nửa phải: thẻ cao bằng nửa trái */}
            {isLoading ? (
              <div className="mc-skel-dark min-h-[210px] rounded-2xl ring-1 ring-white/10" />
            ) : spotlight ? (
              <div
                className="mc-rise relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-[#0a1440]/60 p-5 ring-1 ring-white/15"
                style={delay(200)}
              >
                <img
                  src={spotlight.course.thumbnail}
                  alt=""
                  aria-hidden
                  onError={hideBrokenImage}
                  className="absolute inset-0 h-full w-full object-cover opacity-25"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1440]/90 via-[#0a1440]/70 to-[#16308f]/60" />

                <div className="relative flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-200/90">Học tiếp từ chỗ bạn dừng lại</span>
                  <span className="text-blue-100/60">{spotlight.lastAccessed}</span>
                </div>

                <div className="relative flex items-center gap-4">
                  <ProgressRing percent={clampPct(spotlight.progressPercent)} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-base font-bold leading-snug">{spotlight.course.title}</p>
                    <p className="mt-1 truncate text-xs text-blue-100/70">
                      {spotlight.lastLectureTitle
                        ? `Bài gần nhất: ${spotlight.lastLectureTitle}`
                        : `${spotlight.completedLecturesCount}/${spotlight.totalLecturesCount} bài học`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/courses/${spotlight.course.id}/learn`)}
                  className="relative inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[#0B1437] transition hover:bg-blue-50 active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4" />
                  Tiếp tục học
                </button>
              </div>
            ) : (
              <div
                className="mc-rise flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-2xl bg-white/[0.07] p-5 text-center ring-1 ring-white/15"
                style={delay(200)}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-blue-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-blue-50/90">
                  {totalEnrolled === 0
                    ? 'Bạn chưa đăng ký khóa học nào. Chọn khóa học đầu tiên để bắt đầu.'
                    : 'Bạn đã hoàn thành mọi khóa học. Khám phá thêm để tiếp tục phát triển.'}
                </p>
              </div>
            )}
          </div>

          {/* Dải số liệu: 4 ô bằng nhau, nội dung căn giữa từng ô */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="mc-rise flex items-center justify-center gap-3 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10"
                  style={delay(160 + i * 80)}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold leading-tight tabular-nums">
                      <CountUp value={s.value} />
                    </p>
                    <p className="truncate text-[11px] text-blue-100/70">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- Bộ lọc: mọi ô cùng cao 40px ---------------- */}
        <div
          ref={toolbarRef}
          className="mc-rise flex scroll-mt-24 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5"
          style={delay(120)}
        >
          {/* Tab: nền trắng trượt mượt sang tab đang chọn */}
          <div className="mc-noscroll relative flex h-10 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {indicator.ready && (
              <span
                aria-hidden
                className="absolute rounded-lg bg-white shadow-sm"
                style={{
                  left: indicator.left,
                  top: indicator.top,
                  width: indicator.width,
                  height: indicator.height,
                  transition: 'all 350ms cubic-bezier(.3,.9,.3,1)',
                }}
              />
            )}
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[t.key] = el;
                  }}
                  onClick={() => handleTabChange(t.key)}
                  className={`relative z-10 inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-xs font-semibold transition-colors duration-200 ${
                    active ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                  <span
                    className={`min-w-[18px] rounded px-1 text-center text-[11px] font-bold transition-colors duration-200 ${
                      active ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-500'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <div className="relative h-10 min-w-[160px] flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm khóa học, giảng viên..."
                className="h-full w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortKey)}
                className="h-full cursor-pointer bg-transparent font-medium text-slate-700 focus:outline-none"
              >
                <option value="recent">Vừa học gần đây</option>
                <option value="progress">Tiến độ cao nhất</option>
                <option value="title">Tên khóa học (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ---------------- Danh sách khóa học ---------------- */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="mc-fade flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-8 ring-rose-50/60">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-base font-bold text-[#0B1437]">Không tải được danh sách khóa học</h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              Có lỗi khi kết nối tới máy chủ. Kiểm tra mạng của bạn rồi thử tải lại.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#0B1437] px-5 text-xs font-semibold text-white transition hover:bg-[#16308f] active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              Tải lại trang
            </button>
          </div>
        ) : sortedCourses.length === 0 ? (
          <div className="mc-rise flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 ring-8 ring-blue-50/60">
              <BookOpen className="h-9 w-9" />
            </div>
            <h3 className="mt-5 text-base font-bold text-[#0B1437]">
              {hasFilter ? 'Không tìm thấy khóa học phù hợp' : 'Bạn chưa đăng ký khóa học nào'}
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              {hasFilter
                ? 'Thử đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc trạng thái.'
                : 'Khi bạn đăng ký khóa học, tiến độ và chứng chỉ sẽ xuất hiện ở đây.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {hasFilter && (
                <button
                  onClick={resetFilters}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                >
                  Xóa bộ lọc
                </button>
              )}
              <button
                onClick={() => onNavigate('courses')}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95"
              >
                Xem danh mục khóa học
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {paginatedCourses.map((item) => {
              let localCount = 0;
              try {
                const stored = localStorage.getItem(`mc_completed_lessons_${item.course.id}`);
                if (stored) {
                  const arr = JSON.parse(stored);
                  if (Array.isArray(arr)) localCount = arr.length;
                }
              } catch (_) {}

              const totalCount = item.totalLecturesCount || 9;
              const displayCompletedCount = Math.max(item.completedLecturesCount || 0, localCount);
              const displayProgressPercent = totalCount > 0
                ? Math.round((displayCompletedCount / totalCount) * 100)
                : item.progressPercent;
              const isItemCompleted = displayProgressPercent >= 100 || item.status === 'completed';

              return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row sm:h-56 group hover:border-blue-200"
              >
                {/* ── Section 1: Thumbnail (Bên Trái - Cố định chiều cao theo card) ── */}
                <div className="relative sm:w-64 md:w-72 h-44 sm:h-full shrink-0 bg-slate-900 overflow-hidden">
                  <img
                    src={item.course.thumbnail}
                    alt={item.course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent sm:bg-none" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {isItemCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-md">
                        <Clock className="w-3.5 h-3.5" />
                        Đang học
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Info & Progress (Ở Giữa - Cân đối không gian) ──── */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {item.course.category}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Vừa học: {item.lastAccessed}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.course.title}
                    </h3>

                    {/* Instructor */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <img
                        src={item.course.instructor.avatar}
                        alt={item.course.instructor.name}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs font-medium text-slate-600">
                        {item.course.instructor.name}
                      </span>
                    </div>
                  </div>

                  {/* Progress section */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Tiến độ bài học ({displayCompletedCount}/{totalCount})
                      </span>
                      <span className="font-bold text-blue-600">{displayProgressPercent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isItemCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        }`}
                        style={{ width: `${displayProgressPercent}%` }}
                      />
                    </div>

                    {/* Last accessed lecture subtitle */}
                    {item.lastLectureTitle && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        Bài tiếp theo: <span className="text-slate-700 font-medium">{item.lastLectureTitle}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Section 3: Action Buttons ── */}
                <div className="p-4 sm:p-5 border-t sm:border-t-0 sm:border-l border-slate-100 flex sm:flex-col justify-center items-center gap-2.5 shrink-0 sm:w-48 bg-slate-50/50">
                  <button
                    onClick={() => navigate(`/courses/${item.course.id}/learn`)}
                    className={`w-full inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold text-white transition active:scale-[0.98] ${
                      isItemCompleted ? 'bg-[#0B1437] hover:bg-[#16308f]' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isItemCompleted ? <RotateCcw className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {isItemCompleted ? 'Học lại' : 'Tiếp tục học'}
                  </button>

                  {item.certificateId ? (
                    <button
                      onClick={() => navigate('/certificates')}
                      className="w-full inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-50 text-xs font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
                    >
                      <Award className="h-4 w-4" />
                      Chứng chỉ
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/courses/${item.course.id}`)}
                      className="w-full inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Chi tiết
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* ── Pagination Controls Bar ─────────────────────────────── */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-6">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span>
                Hiển thị <span className="font-semibold text-slate-800">{startIndex + 1}</span> -{' '}
                <span className="font-semibold text-slate-800">{Math.min(startIndex + PAGE_SIZE, totalItems)}</span> trong số{' '}
                <span className="font-semibold text-slate-800">{totalItems}</span> khóa học
              </span>
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center gap-1.5" aria-label="Phân trang">
                <button
                  disabled={safePage === 1}
                  onClick={() => goToPage(Math.max(safePage - 1, 1))}
                  className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang trước"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(safePage, totalPages).map((p, idx) =>
                  p === '…' ? (
                    <span key={`gap-${idx}`} className="px-1 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      aria-current={safePage === p ? 'page' : undefined}
                      className={`h-8 min-w-[32px] cursor-pointer rounded-lg px-2 text-xs font-semibold transition ${
                        safePage === p
                          ? 'bg-blue-600 text-[#fff] shadow-sm shadow-blue-600/30'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  disabled={safePage === totalPages}
                  onClick={() => goToPage(Math.min(safePage + 1, totalPages))}
                  className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang sau"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            )}

            <p className="hidden text-right text-xs font-medium text-slate-500 sm:block">
              Trang <span className="font-semibold text-slate-800">{safePage}</span> / {totalPages}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};