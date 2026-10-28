
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCheck, ClipboardList, Clock3, Eye, FileText, Filter, Headphones, Loader2,
  Mic2, MoreVertical, Pencil, Plus, RefreshCw, Search, Sparkles, Users, Waves, X
} from 'lucide-react';
import { courseApi } from '../../courses/api/courseApi';
import { quizApi } from '../api/quizApi';
import { useQuiz } from '../hooks/useQuiz';
import type { QuizListItemDto } from '../types/quizTypes';
import type { InstructorQuizAttemptDto } from '../types/instructorGradingTypes';

type Mode = 'management' | 'grading';
type StatusFilter = 'ALL' | 'PENDING' | 'DONE';
type QuizRow = {
  quiz: QuizListItemDto;
  courseTitle: string;
  courseId: number;
  attempts: InstructorQuizAttemptDto[];
  attemptsError?: boolean;
};

const PAGE_SIZE = 7;
const card = 'rounded-[20px] border border-[#e2eaf5] bg-white shadow-[0_5px_22px_rgba(18,55,112,0.045)]';

const InstructorQuizOverviewPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [courses, setCourses] = useState<{ courseId: number; title: string }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'list' | 'stats'>('list');
  const [menuId, setMenuId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const loadedCourses: { courseId: number; title: string }[] = [];
        let currentPage = 1;
        while (true) {
          const response = await courseApi.getInstructorCourses({ page: currentPage, limit: 100 });
          const items = response.data ?? [];
          loadedCourses.push(...items.map(c => ({ courseId: c.courseId, title: c.title })));
          if (currentPage >= response.pagination.totalPages || items.length === 0) break;
          currentPage++;
        }

        const all: QuizRow[] = [];
        let failedCourses = 0;
        let failedAttempts = 0;

        for (const course of loadedCourses) {
          try {
            const response = await quizApi.getQuizzesByCourse(course.courseId);
            if (!response.success) throw new Error(response.message);

            for (const quiz of response.data ?? []) {
              let attempts: InstructorQuizAttemptDto[] = [];
              let attemptsError = false;

              if (mode === 'grading') {
                try {
                  const result = await quizApi.getInstructorAttempts(quiz.quizId);
                  if (!result.success) throw new Error(result.message);
                  attempts = result.data ?? [];
                } catch {
                  attemptsError = true;
                  failedAttempts++;
                }
              }

              all.push({
                quiz,
                courseId: course.courseId,
                courseTitle: course.title,
                attempts,
                attemptsError
              });
            }
          } catch {
            failedCourses++;
          }
        }

        if (!cancelled) {
          setCourses(loadedCourses);
          setRows(all);
          if (failedCourses || failedAttempts) {
            setError(`Chưa tải được dữ liệu của ${failedCourses} khóa học và ${failedAttempts} danh sách bài nộp. Hãy thử làm mới.`);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu Quiz.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [mode, reload]);

  useEffect(() => { setPage(1); }, [search, status, courseFilter, tab, mode]);

  const pendingOf = (row: QuizRow) => row.attempts.filter(a => a.pendingAnswers > 0).length;

  const filtered = useMemo(() => rows.filter(row => {
    const text = `${row.quiz.title} ${row.courseTitle} ${row.quiz.quizId}`.toLowerCase();
    const pending = pendingOf(row);
    const submitted = row.attempts.length;
    const matchesStatus = status === 'ALL' ||
      (status === 'PENDING' && pending > 0) ||
      (status === 'DONE' && submitted > 0 && pending === 0 && !row.attemptsError);
    return text.includes(search.trim().toLowerCase()) &&
      (courseFilter === 'ALL' || row.courseId === Number(courseFilter)) &&
      (mode !== 'grading' || matchesStatus);
  }), [rows, search, courseFilter, status, mode]);

  const totalSubmitted = rows.reduce((sum, r) => sum + r.attempts.length, 0);
  const totalPending = rows.reduce((sum, r) => sum + pendingOf(r), 0);
  const totalDone = rows.reduce((sum, r) => sum + r.attempts.filter(a => a.pendingAnswers === 0).length, 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const title = mode === 'management' ? 'Quản lý Quiz' : 'Chấm bài Quiz';
  const subtitle = mode === 'management'
    ? 'Quản lý và theo dõi các bài kiểm tra thuộc khóa học bạn phụ trách.'
    : 'Theo dõi bài nộp và chấm điểm các câu cần giáo viên đánh giá.';

  const stats = [
    { label: 'Tổng số Quiz', value: rows.length, note: 'Thuộc các khóa học bạn phụ trách.', icon: ClipboardList, color: 'blue' },
    { label: 'Lượt đã nộp', value: mode === 'grading' ? totalSubmitted : '—', note: 'Tổng số lượt làm của học viên.', icon: Users, color: 'green' },
    { label: 'Lượt chờ chấm', value: mode === 'grading' ? totalPending : '—', note: 'Cần giáo viên đánh giá thủ công.', icon: ClipboardCheck, color: 'yellow' }
  ] as const;

  const goGrading = (quizId: number) => navigate(`/instructor/quizzes/${quizId}/grading`);
  const goEdit = (quizId: number) => navigate(`/instructor/quizzes/${quizId}/edit`);

  if (mode === 'management') return <ManagementDashboard rows={rows} courses={courses} loading={loading} error={error} reload={() => setReload(v => v + 1)} />;

  return (
    <div className="min-h-screen bg-[#f4f8fd] text-[#0d2857]">
      <style>{`
        @keyframes mseekFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-9px) } }
        @keyframes mseekWave { 0%,100% { transform:scaleY(.45) } 50% { transform:scaleY(1) } }
        @keyframes mseekRise { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
        .mseek-rise { animation:mseekRise .5s ease both }
        .mseek-wave { transform-origin:center;animation:mseekWave 1.2s ease-in-out infinite }
        .mseek-select { appearance:none;-webkit-appearance:none }
        .mseek-row:hover { background:#f5f9ff }
      `}</style>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#082b68]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_0%,#1379ef_0%,transparent_45%),linear-gradient(110deg,#072557_0%,#0b438c_58%,#0058c6_100%)]"/>
        <div className="absolute -left-20 -top-28 h-[320px] w-[320px] rounded-full border-[65px] border-[#0d6bd0]/25"/>
        <div className="absolute right-[10%] top-[-135px] h-[340px] w-[620px] rotate-[-13deg] rounded-[100%] border-[80px] border-[#2495ff]/15 blur-[2px]"/>
        <div className="absolute bottom-[-150px] right-[-80px] h-[300px] w-[700px] rotate-[-10deg] rounded-[100%] border-[70px] border-[#50aaff]/20"/>
        <div className="absolute left-3 top-3 hidden flex-col gap-3 opacity-25 md:flex">
          {Array.from({ length: 7 }, (_, i) => <span key={i} className="h-3 w-3 rounded-full bg-sky-400"/>)}
        </div>

        <div className="relative mx-auto flex min-h-[230px] max-w-[1500px] items-center justify-between gap-6 px-5 pb-14 pt-6 sm:px-8 lg:px-12">
          <div className="relative z-10 max-w-[720px]">
            <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25">
              <ArrowLeft size={15}/> Quay lại
            </button>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100 sm:text-xs">MSEEK ACADEMY / INSTRUCTOR</div>
            <h1 className="text-[30px] font-black tracking-[-0.04em] text-white sm:text-[39px]">{title}</h1>
            <p className="mt-1 max-w-[570px] text-[13px] leading-6 text-blue-100 sm:text-sm">{subtitle}</p>
            <div className="mt-5 flex gap-2">
              <span className="h-[5px] w-12 rounded-full bg-[#ffca24]"/>
              <span className="h-[5px] w-12 rounded-full bg-[#1591ff]"/>
              <span className="h-[5px] w-12 rounded-full bg-[#08c79d]"/>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 right-[3%] hidden h-[190px] w-[42%] items-center justify-center lg:flex">
            <div className="absolute left-2 top-8 rotate-[-9deg] text-center font-serif text-[27px] italic leading-[1.1] text-white/70">
              Voice<br/>Create<br/>Inspire
            </div>
            <div className="absolute right-3 flex h-28 items-center gap-[5px] opacity-65">
              {Array.from({ length: 29 }, (_, i) => (
                <span key={i} className="mseek-wave w-[3px] rounded-full bg-[#7be7ff]" style={{
                  height: `${14 + (Math.sin(i * 1.7) + 1) * 18 + (i % 5) * 4}px`,
                  animationDelay: `${i * 0.055}s`
                }}/>
              ))}
            </div>
            <div className="absolute right-[33%] top-[-10px] flex h-[190px] w-[145px] rotate-[9deg] items-center justify-center" style={{ animation: 'mseekFloat 4s ease-in-out infinite' }}>
              <div className="absolute h-[145px] w-[145px] rounded-full bg-[#36b9ff]/25 blur-3xl"/>
              <Mic2 size={142} strokeWidth={1.25} className="relative text-[#d9f1ff] drop-shadow-[0_8px_12px_rgba(0,0,0,.5)]"/>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-7 max-w-[1500px] space-y-4 px-4 pb-10 sm:px-7 lg:px-10">
        {/* STATS */}
        <div className="grid gap-3 md:grid-cols-3">
          {stats.map((item, i) => {
            const Icon = item.icon;
            const theme = {
              blue: { box: 'bg-[#e0efff]', icon: 'text-[#0667e9]', bg: 'from-[#f0f7ff] to-white' },
              green: { box: 'bg-[#dff8ed]', icon: 'text-[#08a879]', bg: 'from-[#effcf7] to-white' },
              yellow: { box: 'bg-[#fff0cb]', icon: 'text-[#eba000]', bg: 'from-[#fff9e9] to-white' }
            }[item.color];
            return (
              <div key={item.label} className={`${card} mseek-rise overflow-hidden p-2`} style={{ animationDelay: `${i * 70}ms` }}>
                <div className={`relative flex min-h-[120px] items-center gap-4 overflow-hidden rounded-[15px] bg-gradient-to-r ${theme.bg} px-4 py-4`}>
                  <div className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[17px] ${theme.box}`}>
                    <Icon size={28} strokeWidth={2.4} className={theme.icon}/>
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p className="text-xs font-bold text-[#1a376a]">{item.label}</p>
                    <p className="mt-1 text-[29px] font-black leading-tight tracking-[-0.04em] text-[#092659]">{loading ? '...' : item.value}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#6880a6]">{item.note}</p>
                  </div>
                  <Icon size={78} strokeWidth={1.4} className={`absolute -right-1 bottom-0 opacity-[0.12] ${theme.icon}`}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className={`${card} overflow-hidden p-3 sm:p-4 lg:p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setTab('list')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:px-5 ${tab === 'list' ? 'bg-[#0864ed] text-white shadow-[0_5px_13px_rgba(0,95,232,.2)]' : 'border border-[#e0e9f5] bg-white text-[#45628e] hover:bg-[#f4f8ff]'}`}>
                <ClipboardCheck size={16}/> Danh sách Quiz
              </button>
              <button onClick={() => setTab('stats')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:px-5 ${tab === 'stats' ? 'bg-[#0864ed] text-white shadow-[0_5px_13px_rgba(0,95,232,.2)]' : 'border border-[#e0e9f5] bg-white text-[#45628e] hover:bg-[#f4f8ff]'}`}>
                <BarChart3 size={16}/> Thống kê
              </button>
            </div>
          </div>

          {tab === 'list' ? (
            <>
              {/* FILTERS */}
              <div className="mb-3 grid gap-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#54719e]"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên Quiz hoặc khóa học..." className="h-[43px] w-full rounded-xl border border-[#dbe6f3] bg-[#f9fbfe] pl-10 pr-9 text-xs text-[#163767] outline-none transition placeholder:text-[#8a9db8] focus:border-[#0d71f1] focus:bg-white focus:ring-2 focus:ring-[#0d71f1]/10"/>
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8296b3] hover:text-[#0d71f1]"><X size={15}/></button>}
                </div>
                <div className="relative">
                  <BookOpen size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#54719e]"/>
                  <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="mseek-select h-[43px] w-full cursor-pointer rounded-xl border border-[#dbe6f3] bg-[#f9fbfe] pl-10 pr-9 text-xs font-medium text-[#46648d] outline-none focus:border-[#0d71f1]">
                    <option value="ALL">Tất cả khóa học</option>
                    {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
                  </select>
                  <ChevronRight size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#54719e]"/>
                </div>
                <div className="relative">
                  <Filter size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#54719e]"/>
                  <select value={status} onChange={e => setStatus(e.target.value as StatusFilter)} disabled={mode !== 'grading'} className="mseek-select h-[43px] w-full cursor-pointer rounded-xl border border-[#dbe6f3] bg-[#f9fbfe] pl-10 pr-9 text-xs font-medium text-[#46648d] outline-none focus:border-[#0d71f1] disabled:cursor-not-allowed disabled:opacity-60">
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Có bài chờ chấm</option>
                    <option value="DONE">Đã hoàn tất</option>
                  </select>
                  <ChevronRight size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#54719e]"/>
                </div>
                <button onClick={() => setReload(v => v + 1)} disabled={loading} className="inline-flex h-[43px] items-center justify-center gap-2 rounded-xl border border-[#0b6ef0] bg-white px-4 text-xs font-bold text-[#0768eb] transition hover:bg-[#edf5ff] disabled:opacity-60">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Làm mới
                </button>
              </div>

              {error && <div role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">{error}</div>}

              {/* TABLE */}
              <div className="overflow-x-auto rounded-xl border border-[#e1eaf5]">
                <table className="w-full min-w-[1020px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f0f5fb] text-[11px] font-bold text-[#254574]">
                      <th className="w-[52px] px-3 py-3 text-center">#</th>
                      <th className="min-w-[240px] px-3 py-3">Quiz</th>
                      <th className="min-w-[175px] px-3 py-3">Khóa học</th>
                      <th className="px-3 py-3 text-center"><span className="inline-flex items-center gap-1"><Users size={14}/> Lượt nộp</span></th>
                      <th className="px-3 py-3 text-center"><span className="inline-flex items-center gap-1"><Clock3 size={14}/> Chờ chấm</span></th>
                      <th className="min-w-[125px] px-3 py-3">Trạng thái</th>
                      <th className="min-w-[105px] px-3 py-3">Phạm vi</th>
                      <th className="min-w-[175px] px-3 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8eef7]">
                    {loading ? (
                      <tr><td colSpan={8} className="py-16 text-center"><Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#0872f3]"/><span className="text-xs text-[#7287a8]">Đang tải dữ liệu Quiz...</span></td></tr>
                    ) : paged.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center"><ClipboardList size={34} className="mx-auto mb-3 text-[#a2b8d5]"/><p className="text-sm font-semibold text-[#254574]">Không có Quiz phù hợp</p><p className="mt-1 text-xs text-[#8194af]">Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></td></tr>
                    ) : paged.map((row, i) => {
                      const { quiz, courseTitle, attempts, attemptsError } = row;
                      const pending = pendingOf(row);
                      const done = attempts.length > 0 && pending === 0 && !attemptsError;
                      const iconSet = [FileText, Headphones, Mic2, ClipboardList, BookOpen];
                      const Icon = iconSet[(safePage - 1) * PAGE_SIZE + i % iconSet.length];
                      const colors = [
                        'bg-[#e3f0ff] text-[#0b72f0]',
                        'bg-[#f2e5ff] text-[#9b43ee]',
                        'bg-[#def8ec] text-[#04a777]',
                        'bg-[#ffe6f0] text-[#e34b91]',
                        'bg-[#fff1d7] text-[#ec9b00]'
                      ];
                      return (
                        <tr key={quiz.quizId} className="mseek-row transition-colors">
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f5fb] text-xs font-bold text-[#284979]">{(safePage - 1) * PAGE_SIZE + i + 1}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[i % colors.length]}`}><Icon size={20}/></div>
                              <div className="min-w-0">
                                <p className="max-w-[290px] truncate text-xs font-extrabold text-[#0d2a60]" title={quiz.title}>{quiz.title}</p>
                                <p className="mt-1 text-[11px] text-[#7890b1]">Quiz #{quiz.quizId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="max-w-[230px] truncate text-xs font-semibold text-[#214274]" title={courseTitle}>{courseTitle}</p>
                            <p className="mt-1 text-[11px] text-[#8299b7]">Khóa học #{row.courseId}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1268e9]"><Users size={14}/>{mode === 'grading' ? (attemptsError ? '—' : attempts.length) : '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${pending > 0 ? 'text-[#f28a00]' : 'text-[#08a77b]'}`}>
                              <Clock3 size={14}/>{mode === 'grading' ? (attemptsError ? '—' : pending) : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {mode === 'grading' && !attemptsError ? (
                              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-bold ${pending > 0 ? 'bg-[#fff4dc] text-[#e58a00]' : done ? 'bg-[#e3f8ee] text-[#079b6e]' : 'bg-[#edf3fb] text-[#637e9f]'}`}>
                                <span className={`h-2 w-2 rounded-full ${pending > 0 ? 'bg-[#ffb300]' : done ? 'bg-[#09ad7b]' : 'bg-[#9aabc2]'}`}/>
                                {pending > 0 ? 'Có bài chờ chấm' : done ? 'Đã hoàn tất' : 'Chưa có bài nộp'}
                              </span>
                            ) : <span className="text-[11px] text-[#8397b2]">{attemptsError ? 'Lỗi tải dữ liệu' : '—'}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-medium text-[#547099]">{quiz.lessonId == null ? 'Toàn khóa học' : `Bài học #${quiz.lessonId}`}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => goGrading(quiz.quizId)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0768ed] px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0053cb]">
                                <ClipboardCheck size={14}/>{mode === 'grading' ? 'Chấm bài' : 'Xem bài nộp'}
                              </button>
                              <div className="relative">
                                <button onClick={() => setMenuId(menuId === quiz.quizId ? null : quiz.quizId)} title="Thêm thao tác" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe7f2] text-[#42628e] transition hover:bg-[#eef5ff]"><MoreVertical size={16}/></button>
                                {menuId === quiz.quizId && (
                                  <div className="absolute right-0 top-9 z-30 w-[160px] overflow-hidden rounded-xl border border-[#e1e9f5] bg-white p-1 shadow-xl">
                                    <button onClick={() => { setMenuId(null); goGrading(quiz.quizId); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#315482] hover:bg-[#eef5ff]"><Eye size={14}/> Xem bài nộp</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="text-[11px] text-[#6983a9]">
                  {filtered.length === 0 ? 'Không có dữ liệu' : `Hiển thị ${(safePage - 1) * PAGE_SIZE + 1} - ${Math.min(safePage * PAGE_SIZE, filtered.length)} trong ${filtered.length} Quiz`}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe8f4] text-[#3b5b88] transition hover:bg-[#eef5ff] disabled:opacity-40"><ChevronLeft size={16}/></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => totalPages <= 5 || Math.abs(p - safePage) <= 1 || p === 1 || p === totalPages).map(p => (
                    <button key={p} onClick={() => setPage(p)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition ${safePage === p ? 'bg-[#0868ee] text-white' : 'border border-[#dfe8f4] bg-white text-[#42628e] hover:bg-[#eef5ff]'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe8f4] text-[#3b5b88] transition hover:bg-[#eef5ff] disabled:opacity-40"><ChevronRight size={16}/></button>
                </div>
              </div>
            </>
          ) : (
            <div className="mseek-rise space-y-5 py-2">
              <div className="rounded-2xl bg-gradient-to-r from-[#eef6ff] to-[#f9fcff] px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#dcecff] p-3 text-[#0868ed]"><BarChart3 size={23}/></div>
                  <div><h2 className="text-base font-extrabold text-[#0c2d66]">Tổng quan hoạt động Quiz</h2><p className="mt-1 text-xs text-[#6e85a6]">Thống kê dựa trên dữ liệu đã tải từ hệ thống.</p></div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Quiz đang quản lý', value: rows.length, icon: ClipboardList },
                  { label: 'Khóa học có Quiz', value: new Set(rows.map(r => r.courseId)).size, icon: BookOpen },
                  { label: 'Lượt đã nộp', value: mode === 'grading' ? totalSubmitted : '—', icon: Users },
                  { label: 'Lượt hoàn tất chấm', value: mode === 'grading' ? totalDone : '—', icon: CheckCircle2 }
                ].map(s => <div key={s.label} className="rounded-2xl border border-[#e1eaf6] bg-white p-5"><s.icon size={21} className="text-[#0b6cec]"/><p className="mt-3 text-2xl font-black text-[#0d2d64]">{loading ? '...' : s.value}</p><p className="mt-1 text-xs font-semibold text-[#6b83a6]">{s.label}</p></div>)}
              </div>
              {mode === 'grading' && (
                <div className="rounded-2xl border border-[#e1eaf6] p-5">
                  <h3 className="mb-4 text-sm font-extrabold text-[#0d2d64]">Tiến độ xử lý bài nộp</h3>
                  <div className="h-3 overflow-hidden rounded-full bg-[#eaf0f8]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0786e9] to-[#0abf91] transition-all duration-700" style={{ width: `${totalSubmitted > 0 ? totalDone / totalSubmitted * 100 : 0}%` }}/>
                  </div>
                  <div className="mt-3 flex justify-between text-xs font-semibold text-[#6b83a6]"><span>{totalDone} lượt không còn câu chờ chấm</span><span>{totalSubmitted > 0 ? Math.round(totalDone / totalSubmitted * 100) : 0}%</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] text-[#7a8fac]">
          <Clock3 size={14} className="text-[#0870ee]"/>
          <span>Số lượt đã nộp và chờ chấm được lấy từ dữ liệu bài làm thực tế.</span>
        </div>
      </main>
    </div>
  );
};


type DetailDates = { createdAt?: string | null; createdDate?: string | null; updatedAt?: string | null; modifiedAt?: string | null };
const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa có dữ liệu';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Chưa có dữ liệu' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const quizStatus = (status: unknown) => {
  const s = String(status ?? '').toUpperCase();
  return s === 'ACTIVE' ? 'Hoạt động' : s === 'DRAFT' ? 'Bản nháp' : s === 'ARCHIVED' ? 'Lưu trữ' : s || 'Chưa xác định';
};
const questionTypeName: Record<string, string> = {
  SINGLE_CHOICE: 'Trắc nghiệm 1 đáp án', MULTIPLE_CHOICE: 'Trắc nghiệm nhiều đáp án', TRUE_FALSE: 'Đúng / Sai', FILL_BLANK: 'Điền từ',
  LISTEN_IDENTIFY_ERROR: 'Nghe tìm lỗi', LISTEN_LOCATE_ERROR: 'Nghe xác định lỗi', AUDIO_COMPARISON: 'So sánh audio', LISTEN_CLASSIFY: 'Nghe phân loại',
  SCRIPT_ANNOTATION: 'Đánh dấu lời dẫn', SCRIPT_WRITING: 'Viết lời dẫn', ARRANGE_SCRIPT: 'Sắp xếp lời dẫn', ERROR_CORRECTION_LAB: 'Sửa lỗi',
  SCENARIO_DECISION_TREE: 'Tình huống MC', ESSAY: 'Tự luận'
};
const ManagementDashboard: React.FC<{
  rows: QuizRow[]; courses: { courseId: number; title: string }[]; loading: boolean; error: string; reload: () => void;
}> = ({ rows, courses, loading, error, reload }) => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [tab, setTab] = useState<'list' | 'stats'>('list');
  const [detailTab, setDetailTab] = useState<'questions' | 'settings'>('questions');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading, isError: detailError, error: detailErrorValue } = useQuiz(selectedId);
  useEffect(() => { if (selectedId === null && rows.length) { setSelectedId(rows[0].quiz.quizId); setDetailOpen(true); } }, [rows, selectedId]);
  useEffect(() => { if (selectedId !== null && !rows.some(r => r.quiz.quizId === selectedId)) setSelectedId(rows[0]?.quiz.quizId ?? null); }, [rows, selectedId]);
  useEffect(() => { setPage(1); }, [query, course, status]);
  useEffect(() => { setDetailTab('questions'); }, [selectedId]);
  const filtered = useMemo(() => rows.filter(r => {
    const text = `${r.quiz.title} ${r.courseTitle} ${r.quiz.quizId}`.toLocaleLowerCase('vi-VN');
    return text.includes(query.trim().toLocaleLowerCase('vi-VN')) && (course === 'ALL' || r.courseId === Number(course)) && (status === 'ALL' || String(r.quiz.status).toUpperCase() === status);
  }), [rows, query, course, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const selectedRow = rows.find(r => r.quiz.quizId === selectedId);
  const dates = detail as (typeof detail & DetailDates);
  const questions = useMemo(() => [...(detail?.questions ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)), [detail]);
  const totalPoints = questions.reduce((n, q) => n + Number(q.points ?? 0), 0);
  const goDetail = (id: number) => navigate(`/instructor/quizzes/${id}`, { state: { returnTo: '/instructor/quizzes' } });
  const statData = [
    { title: 'Tổng số Quiz', value: loading ? '...' : rows.length, hint: 'Thuộc các khóa học bạn phụ trách', icon: ClipboardList, bg: 'bg-blue-50', fg: 'text-blue-600' },
    { title: 'Đang hoạt động', value: loading ? '...' : rows.filter(r => String(r.quiz.status).toUpperCase() === 'ACTIVE').length, hint: 'Quiz có trạng thái hoạt động', icon: CheckCircle2, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { title: 'Bản nháp', value: loading ? '...' : rows.filter(r => String(r.quiz.status).toUpperCase() === 'DRAFT').length, hint: 'Quiz chưa được phát hành', icon: FileText, bg: 'bg-amber-50', fg: 'text-amber-600' },
    { title: 'Đã lưu trữ', value: loading ? '...' : rows.filter(r => String(r.quiz.status).toUpperCase() === 'ARCHIVED').length, hint: 'Quiz đã được lưu trữ', icon: Clock3, bg: 'bg-violet-50', fg: 'text-violet-600' }
  ];
  return <div className="min-h-screen bg-[#f3f7fd] pb-10 text-[#102d63]">
    <style>{`@keyframes mseSound{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}.mse-sound{transform-origin:center;animation:mseSound 1.5s ease-in-out infinite}`}</style>
    <header className="relative isolate overflow-hidden rounded-b-[28px] bg-gradient-to-r from-[#081d49] via-[#0751bc] to-[#08317b] px-6 pb-16 pt-7 text-white lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_10%,rgba(44,166,255,.5),transparent_50%)]"/>
      <div className="pointer-events-none absolute -bottom-32 right-[8%] h-64 w-[60%] -rotate-12 rounded-[100%] border-[45px] border-[#59b9ff]/15"/>
      <div className="relative mx-auto flex max-w-[1500px] items-center justify-between gap-5">
        <div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#a8d4ff]">QUIZ MANAGEMENT · MSEEK ACADEMY</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Quản lý Quiz</h1><p className="mt-2 text-sm text-[#dcecff]">Tạo, chỉnh sửa và theo dõi các bài kiểm tra trong khóa học.</p></div>
        <div className="pointer-events-none hidden items-center gap-1 opacity-80 lg:flex"><span className="mr-4 font-serif text-2xl italic leading-7 text-[#b8eaff]">Voice<br/>Create<br/>Inspire</span><Mic2 size={80} className="text-[#d8f2ff]"/>{Array.from({ length: 22 }, (_, i) => <span key={i} className="mse-sound w-[3px] rounded-full bg-[#6fe0ff]" style={{ height: `${12 + Math.abs(Math.sin(i * 1.6)) * 55}px`, animationDelay: `${i * .06}s` }}/>)}</div>
        <button type="button" onClick={() => navigate('/instructor/courses')} className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#ffd35b] px-4 py-3 text-xs font-black text-[#092d66] shadow-lg transition hover:bg-[#ffe28d]"><Plus size={17}/> Tạo Quiz mới</button>
      </div>
    </header>
    <main className="relative z-10 mx-auto -mt-10 max-w-[1500px] space-y-4 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{statData.map(s => <div key={s.title} className="flex min-w-0 items-center gap-3 rounded-[19px] border border-[#e0eaf7] bg-white p-4 shadow-sm"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.bg} ${s.fg}`}><s.icon size={26}/></div><div className="min-w-0"><p className="text-[11px] font-bold text-[#2b4777]">{s.title}</p><p className="mt-1 text-2xl font-black text-[#102e66]">{s.value}</p><p className="mt-1 truncate text-[10px] text-[#7892b6]" title={s.hint}>{s.hint}</p></div></div>)}</div>
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{error}</div>}
      <div className={`grid items-start gap-3 ${detailOpen && selectedId !== null ? 'xl:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <section className="min-w-0 rounded-[20px] border border-[#e0e9f5] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><button onClick={() => setTab('list')} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${tab === 'list' ? 'bg-[#0868f6] text-white' : 'bg-[#f4f7fc] text-[#315481]'}`}><ClipboardList size={15}/> Danh sách Quiz</button><button onClick={() => setTab('stats')} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${tab === 'stats' ? 'bg-[#0868f6] text-white' : 'bg-[#f4f7fc] text-[#315481]'}`}><BarChart3 size={15}/> Thống kê</button></div><button onClick={reload} disabled={loading} className="rounded-xl border border-[#d9e7f8] p-2.5 text-[#0b67e9] disabled:opacity-40" title="Làm mới"><RefreshCw size={17} className={loading ? 'animate-spin' : ''}/></button></div>
          {tab === 'list' ? <>
            <div className="mt-4 space-y-2"><label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8096b6]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên Quiz, khóa học..." className="w-full rounded-xl border border-[#dce7f5] bg-[#f9fbfe] py-3 pl-10 pr-3 text-xs outline-none focus:border-[#3e8fff]"/></label><div className="grid grid-cols-2 gap-2"><label className="relative"><BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8096b6]"/><select value={course} onChange={e => setCourse(e.target.value)} className="w-full appearance-none rounded-xl border border-[#dce7f5] bg-[#f9fbfe] py-3 pl-9 pr-6 text-xs text-[#365581]"><option value="ALL">Tất cả khóa học</option>{courses.map(c => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}</select></label><label className="relative"><Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8096b6]"/><select value={status} onChange={e => setStatus(e.target.value)} className="w-full appearance-none rounded-xl border border-[#dce7f5] bg-[#f9fbfe] py-3 pl-9 pr-6 text-xs text-[#365581]"><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="DRAFT">Bản nháp</option><option value="ARCHIVED">Lưu trữ</option></select></label></div></div>
            <div className="mt-4 space-y-2">{loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#6682a9]"><Loader2 size={18} className="animate-spin"/> Đang tải Quiz...</div> : paged.length === 0 ? <div className="py-14 text-center text-sm text-[#8196b3]">Không tìm thấy Quiz phù hợp.</div> : paged.map((r, i) => { const selected = selectedId === r.quiz.quizId && detailOpen; const icons = [FileText, Headphones, Mic2, ClipboardList, BookOpen]; const Icon = icons[((currentPage - 1) * 5 + i) % icons.length]; return <div key={r.quiz.quizId} className={`relative flex min-w-0 items-center gap-2 rounded-xl border p-2.5 transition ${selected ? 'border-[#1679ff] bg-[#edf5ff]' : 'border-[#e5edf8] hover:border-[#b4d3ff] hover:bg-[#f8fbff]'}`}><button onClick={() => { setSelectedId(r.quiz.quizId); setDetailOpen(true); }} className="flex min-w-0 flex-1 items-center gap-2.5 text-left"><span className="flex h-8 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf2fa] text-xs font-bold">{(currentPage - 1) * 5 + i + 1}</span><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ff] text-[#0a68ef]"><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold" title={r.quiz.title}>{r.quiz.title}</span><span className="mt-1 block truncate text-[10px] text-[#7d92b2]">Quiz #{r.quiz.quizId} · {r.courseTitle}</span></span></button><span className={`hidden shrink-0 rounded-full px-2 py-1.5 text-[10px] font-bold sm:inline-flex ${String(r.quiz.status).toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{quizStatus(r.quiz.status)}</span><div className="relative"><button title="Thao tác" onClick={() => setMenu(menu === r.quiz.quizId ? null : r.quiz.quizId)} className="rounded-lg border border-[#e0e9f6] bg-white p-2"><MoreVertical size={16}/></button>{menu === r.quiz.quizId && <><button aria-label="Đóng menu" onClick={() => setMenu(null)} className="fixed inset-0 z-20 cursor-default"/><div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-[#dfe8f5] bg-white p-1 shadow-xl">{[{ label: 'Xem chi tiết', action: () => goDetail(r.quiz.quizId) }, { label: 'Chỉnh sửa', action: () => navigate(`/instructor/quizzes/${r.quiz.quizId}/edit`) }, { label: 'Xem bài nộp', action: () => navigate(`/instructor/quizzes/${r.quiz.quizId}/grading`) }].map(a => <button key={a.label} onClick={() => { setMenu(null); a.action(); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f0f6ff]">{a.label}</button>)}</div></>}</div></div>; })}</div>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#eaf0f9] pt-4 text-[11px] text-[#7189ab]"><span>Hiển thị {filtered.length ? (currentPage - 1) * 5 + 1 : 0} - {Math.min(currentPage * 5, filtered.length)} trong {filtered.length} Quiz</span><div className="flex items-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg border border-[#dfe8f5] p-2 disabled:opacity-40"><ChevronLeft size={15}/></button><span className="rounded-lg bg-[#0868f6] px-3 py-2 font-bold text-white">{currentPage} / {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-[#dfe8f5] p-2 disabled:opacity-40"><ChevronRight size={15}/></button></div></div>
          </> : <div className="mt-4 space-y-3"><h3 className="text-sm font-black">Thống kê Quiz theo trạng thái</h3>{['ACTIVE', 'DRAFT', 'ARCHIVED'].map(s => { const n = rows.filter(r => String(r.quiz.status).toUpperCase() === s).length; return <div key={s} className="rounded-xl border border-[#e4ecf8] p-3"><div className="mb-2 flex justify-between text-xs"><span>{quizStatus(s)}</span><b>{n} Quiz</b></div><div className="h-2 rounded-full bg-[#edf3fc]"><div className="h-full rounded-full bg-[#0b70ed]" style={{ width: `${rows.length ? n / rows.length * 100 : 0}%` }}/></div></div>; })}</div>}
        </section>
        {detailOpen && selectedId !== null && <section className="min-w-0 overflow-hidden rounded-[20px] border border-[#e0e9f5] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e9eff8] px-4 py-4"><h2 className="border-l-[3px] border-[#0968f4] pl-3 text-base font-black">Chi tiết Quiz</h2><button onClick={() => setDetailOpen(false)} title="Đóng chi tiết" className="rounded-lg p-2 text-[#8aa0bd] hover:bg-[#f2f7ff]"><X size={18}/></button></div>{detailLoading ? <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#6e85a8]"><Loader2 className="animate-spin" size={18}/> Đang tải chi tiết...</div> : detailError || !detail ? <div className="p-6 text-sm text-rose-600">{detailErrorValue instanceof Error ? detailErrorValue.message : 'Không tải được chi tiết Quiz.'}</div> : <>
          <div className="p-4"><div className="flex flex-wrap items-start gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e7f1ff] text-[#0968f2]"><FileText size={26}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{detail.title}</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{quizStatus(detail.status)}</span></div><p className="mt-1 text-xs text-[#7c93b4]">Quiz #{detail.quizId}</p></div><button onClick={() => navigate(`/instructor/quizzes/${detail.quizId}/edit`)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0868f6] px-3 py-2 text-xs font-bold text-white"><Pencil size={14}/> Chỉnh sửa</button></div><p className="mt-4 text-xs leading-6 text-[#6480a6]">{detail.description || 'Quiz chưa có mô tả.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">{[{ icon: BookOpen, label: 'Khóa học', value: selectedRow?.courseTitle ?? `Khóa học #${detail.courseId}` }, { icon: Clock3, label: 'Ngày tạo', value: formatDateTime(dates.createdAt ?? dates.createdDate) }, { icon: RefreshCw, label: 'Cập nhật lần cuối', value: formatDateTime(dates.updatedAt ?? dates.modifiedAt) }, { icon: ClipboardCheck, label: 'Cấu hình', value: `${questions.length} câu · Đạt ${detail.passingScore}% · ${detail.maxAttempts > 0 ? `${detail.maxAttempts} lượt` : 'Không giới hạn'}` }].map(m => <div key={m.label} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e4edf8] bg-[#fbfdff] p-3"><span className="rounded-lg bg-[#edf4ff] p-2 text-[#0b68ed]"><m.icon size={17}/></span><span className="min-w-0"><span className="block text-[10px] text-[#8296b3]">{m.label}</span><span className="block truncate text-xs font-bold" title={m.value}>{m.value}</span></span></div>)}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#f1f6ff] p-3 text-center"><div><p className="text-lg font-black text-[#0967e9]">{questions.length}</p><p className="text-[10px] text-[#7890b1]">Câu hỏi</p></div><div className="border-x border-[#dce8f8]"><p className="text-lg font-black text-[#0967e9]">{totalPoints.toLocaleString('vi-VN')}</p><p className="text-[10px] text-[#7890b1]">Tổng điểm</p></div><div><p className="text-lg font-black text-[#0967e9]">{detail.lessonId ?? '—'}</p><p className="text-[10px] text-[#7890b1]">Lesson ID</p></div></div></div>
          <div className="flex border-y border-[#e6edf8] bg-[#f9fbff] px-4"><button onClick={() => setDetailTab('questions')} className={`flex-1 border-b-[3px] px-2 py-3 text-xs font-bold ${detailTab === 'questions' ? 'border-[#0868f6] text-[#0868f6]' : 'border-transparent text-[#7c92b2]'}`}>Danh sách câu hỏi ({questions.length})</button><button onClick={() => setDetailTab('settings')} className={`flex-1 border-b-[3px] px-2 py-3 text-xs font-bold ${detailTab === 'settings' ? 'border-[#0868f6] text-[#0868f6]' : 'border-transparent text-[#7c92b2]'}`}>Cài đặt</button></div>
          {detailTab === 'questions' ? <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">{questions.length ? questions.map((q, i) => <button key={q.questionId} onClick={() => goDetail(detail.quizId)} className="flex w-full items-center gap-2 rounded-xl border border-[#e5edf8] p-2.5 text-left transition hover:bg-[#f4f9ff]"><span className="rounded-lg bg-[#eef3fa] px-2.5 py-2 text-xs font-bold">{i + 1}</span><span className="rounded-lg bg-[#e8f2ff] p-2 text-[#0b6bec]"><FileText size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{q.questionText || `Câu hỏi ${i + 1}`}</span><span className="mt-1 block text-[10px] text-[#7b91b0]">{questionTypeName[String(q.questionType)] || String(q.questionType)}</span></span><span className="text-xs font-bold text-[#0868f6]">{Number(q.points ?? 0).toLocaleString('vi-VN')}đ</span><ChevronRight size={15} className="text-[#9aacca]"/></button>) : <p className="py-8 text-center text-xs text-[#8196b5]">Quiz chưa có câu hỏi.</p>}</div> : <div className="space-y-2 p-4 text-xs">{[{ label: 'Trạng thái', value: quizStatus(detail.status) }, { label: 'Thời gian làm', value: detail.timeLimitMinutes > 0 ? `${detail.timeLimitMinutes} phút` : 'Không giới hạn' }, { label: 'Điểm đạt', value: `${detail.passingScore}%` }, { label: 'Lượt làm tối đa', value: detail.maxAttempts > 0 ? `${detail.maxAttempts}` : 'Không giới hạn' }].map(x => <div key={x.label} className="flex justify-between rounded-xl bg-[#f6f9fe] p-3"><span>{x.label}</span><b>{x.value}</b></div>)}</div>}
          <div className="flex gap-2 border-t border-[#e6edf8] p-4"><button onClick={() => goDetail(detail.quizId)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0868f6] px-3 py-3 text-xs font-bold text-white"><Eye size={15}/> Xem chi tiết đầy đủ <ArrowRight size={14}/></button><button onClick={() => navigate(`/instructor/quizzes/${detail.quizId}/grading`)} className="rounded-xl border border-[#d8e7f9] px-3 py-3 text-xs font-bold text-[#0b63df]">Xem bài nộp</button></div>
        </>}</section>}
      </div>
      <p className="px-1 text-[11px] text-[#8298b8]">Để tạo Quiz mới, hãy chọn khóa học tương ứng. Ngày giờ chỉ hiển thị khi API cung cấp dữ liệu.</p>
    </main>
  </div>;
};

export { InstructorQuizOverviewPage };
export default InstructorQuizOverviewPage;
