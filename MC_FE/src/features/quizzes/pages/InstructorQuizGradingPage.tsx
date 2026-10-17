import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, ClipboardCheck, FileText, Filter, Loader2, Mic2, RefreshCw, Save, Search, Sparkles, Star, UserRound, X } from 'lucide-react';
import { quizApi } from '../api/quizApi';
import type { InstructorQuizAttemptDto } from '../types/instructorGradingTypes';
import type { QuizResultDto, QuizAnswerResultDto } from '../types/quizTypes';

type FilterType = 'all' | 'pending' | 'done';
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa có thời gian';
const learnerName = (attempt?: InstructorQuizAttemptDto | null) => {
  if (!attempt) return 'Chưa xác định học viên';
  return attempt.fullName?.trim() || `Học viên #${attempt.userId}`;
};
const initials = (attempt: InstructorQuizAttemptDto) => {
  const name = learnerName(attempt);
  return name.startsWith('Học viên #') ? `#${attempt.userId}` : name.split(/\s+/).slice(-2).map(word => word[0]?.toUpperCase() || '').join('');
};
const typeLabel = (type: string) => ({ ESSAY: 'BÀI VIẾT', SCRIPT_WRITING: 'VIẾT KỊCH BẢN', LISTEN_IDENTIFY_ERROR: 'NGHE TÌM LỖI', LISTEN_LOCATE_ERROR: 'XÁC ĐỊNH LỖI', AUDIO_COMPARISON: 'SO SÁNH AUDIO', LISTEN_CLASSIFY: 'NGHE PHÂN LOẠI' } as Record<string, string>)[type] ?? type.replace(/_/g, ' ');
type GradingAnswerDetail = QuizAnswerResultDto & {
  selectedChoiceText?: string | null;
  selectedChoices?: QuizAnswerResultDto['selectedChoices'];
  errorRegions?: { selectedStartTimeMs?: number | null; selectedEndTimeMs?: number | null; selectedErrorCategory?: string | null; selectedErrorCode?: string | null }[] | null;
  annotations?: { annotationType?: string | null; startIndex?: number | null; endIndex?: number | null; annotationValue?: string | null }[] | null;
  arrangeItems?: { content?: string | null; selectedOrder?: number | null; isIncluded?: boolean }[] | null;
  scenarioPath?: { stepOrder?: number; nodeContent?: string | null; choiceText?: string | null }[] | null;
};
const formatMs = (ms?: number | null) => ms == null ? '—' : `${(ms / 1000).toFixed(2)}s`;
const LearnerAnswerView: React.FC<{ answer: QuizAnswerResultDto }> = ({ answer }) => {
  const a = answer as GradingAnswerDetail;
  const hasText = Boolean(a.textAnswer?.trim());
  const selected: NonNullable<GradingAnswerDetail['selectedChoices']> = a.selectedChoices?.length ? a.selectedChoices : a.selectedChoiceText ? [{ choiceId: 0, choiceText: a.selectedChoiceText }] : [];
  const regions = a.errorRegions ?? [];
  const annotations = a.annotations ?? [];
  const arranged = (a.arrangeItems ?? []).filter(x => x.isIncluded && x.selectedOrder != null).sort((x, y) => (x.selectedOrder ?? 0) - (y.selectedOrder ?? 0));
  const path = [...(a.scenarioPath ?? [])].sort((x, y) => (x.stepOrder ?? 0) - (y.stepOrder ?? 0));
  const hasAnswer = hasText || selected.length > 0 || regions.length > 0 || annotations.length > 0 || arranged.length > 0 || path.length > 0;
  return <div className="space-y-2 text-sm leading-6 text-[#34517C]">
    {selected.length > 0 && <div className="space-y-2">{selected.map((choice, i) => <div key={i} className="flex items-start gap-2 rounded-xl border border-blue-200 bg-[#EDF5FF] px-3 py-2.5"><CheckCircle2 size={17} className="mt-1 shrink-0 text-[#0870EF]"/><span><b>Đã chọn:</b> {choice.choiceText?.trim() || `Phương án #${choice.choiceId || i + 1}`}</span></div>)}</div>}
    {regions.length > 0 && <div className="space-y-2">{regions.map((region, i) => <div key={i} className="rounded-xl border border-[#CFE2FF] bg-[#F1F7FF] px-3 py-2.5"><b>Vùng lỗi {i + 1}:</b> {formatMs(region.selectedStartTimeMs)} – {formatMs(region.selectedEndTimeMs)}{region.selectedErrorCategory && <p>Loại lỗi: {region.selectedErrorCategory}</p>}{region.selectedErrorCode && <p>Mã lỗi: {region.selectedErrorCode}</p>}</div>)}</div>}
    {annotations.length > 0 && <div className="space-y-2">{annotations.map((item, i) => <div key={i} className="rounded-xl border border-[#DCE8F8] bg-white px-3 py-2"><b>Đánh dấu {i + 1}:</b> {item.annotationType || 'Chú thích'}{item.startIndex != null && item.endIndex != null && ` · Ký tự ${item.startIndex}–${item.endIndex}`}{item.annotationValue && <p className="whitespace-pre-wrap">{item.annotationValue}</p>}</div>)}</div>}
    {arranged.length > 0 && <div className="space-y-1">{arranged.map((item, i) => <div key={i} className="rounded-lg border border-[#DCE8F8] bg-white px-3 py-2"><b>{i + 1}.</b> {item.content || '(Không có nội dung)'}</div>)}</div>}
    {path.length > 0 && <div className="space-y-2">{path.map((step, i) => <div key={i} className="rounded-xl border border-[#DCE8F8] bg-white px-3 py-2"><b>Bước {step.stepOrder ?? i + 1}:</b> {step.nodeContent}{step.choiceText && <p className="font-semibold text-blue-700">Đã chọn: {step.choiceText}</p>}</div>)}</div>}
    {hasText && <div className="whitespace-pre-wrap break-words rounded-xl bg-[#F2F6FC] p-4">{a.textAnswer}</div>}
    {!hasAnswer && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">API chưa trả về dữ liệu lựa chọn hoặc nội dung câu trả lời cho câu này. Hãy kiểm tra dữ liệu bài nộp.</div>}
  </div>;
};

const inputClass = 'w-full rounded-xl border border-[#D4E2F5] bg-white px-3.5 py-2.5 text-sm text-[#142C58] outline-none transition-all duration-200 placeholder:text-[#91A3BF] focus:border-[#1971F9] focus:ring-4 focus:ring-blue-100';

export const InstructorQuizGradingPage: React.FC = () => {
  const { quizId: param } = useParams(); const quizId = Number(param); const navigate = useNavigate();
  const [attempts, setAttempts] = useState<InstructorQuizAttemptDto[]>([]); const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResultDto | null>(null); const [scores, setScores] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({}); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false); const [error, setError] = useState(''); const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState(''); const [onlyPending, setOnlyPending] = useState(false); const [collapsed, setCollapsed] = useState<number[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const load = async () => {
    setLoading(true); setError('');
    try { const r = await quizApi.getInstructorAttempts(quizId); if (!r.success) throw new Error(r.message); setAttempts(r.data ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được danh sách.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (Number.isInteger(quizId) && quizId > 0) void load(); else { setLoading(false); setError('Quiz ID không hợp lệ.'); } }, [quizId]);
  const open = async (id: number) => {
    setError(''); setSelected(id); setResult(null); setDetailLoading(true); setCollapsed([]);
    try { const r = await quizApi.getInstructorAttempt(quizId, id); if (!r.success) throw new Error(r.message); setResult(r.data); setScores({}); setFeedback({}); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được bài làm.'); }
    finally { setDetailLoading(false); }
  };
  const grade = async (answer: QuizAnswerResultDto) => {
    const score = Number(scores[answer.quizAnswerId]);
    if (!scores[answer.quizAnswerId]?.trim() || !Number.isFinite(score) || score < 0 || score > (answer.maxScore ?? 0)) { setError(`Điểm phải từ 0 đến ${answer.maxScore ?? 0}.`); return; }
    setBusy(true); setSavingId(answer.quizAnswerId); setError('');
    try {
      const r = await quizApi.gradeQuizAnswer(answer.quizAnswerId, { score, teacherFeedback: feedback[answer.quizAnswerId]?.trim() || null });
      if (!r.success) throw new Error(r.message);
      if (selected !== null) await open(selected);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được điểm.'); }
    finally { setBusy(false); setSavingId(null); }
  };
  const pendingCount = attempts.filter(a => a.pendingAnswers > 0).length;
  const doneCount = attempts.length - pendingCount;
  const filtered = useMemo(() => attempts.filter(a => {
    if (filter === 'pending' && a.pendingAnswers <= 0) return false;
    if (filter === 'done' && a.pendingAnswers > 0) return false;
    const query = search.trim().toLowerCase();
    return !query || String(a.userId).includes(query) || String(a.attemptId).includes(query) || learnerName(a).toLowerCase().includes(query);
  }), [attempts, filter, search]);
  const activeAttempt = attempts.find(a => a.attemptId === selected);
  const visibleAnswers = (result?.answers ?? []).map((answer, index) => ({ answer, index })).filter(({ answer }) => !onlyPending || answer.score == null);
  const pendingAnswers = (result?.answers ?? []).filter(a => a.score == null).length;
  const maxTotal = (result?.answers ?? []).reduce((sum, a) => sum + (a.maxScore ?? 0), 0);
  const toggle = (id: number) => setCollapsed(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const allCollapsed = visibleAnswers.length > 0 && visibleAnswers.every(({ answer }) => collapsed.includes(answer.quizAnswerId));
  return <div className="min-h-screen bg-[#EAF2FF] text-[#102650]">
    <style>{`@keyframes gradingIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes gradingWave{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}.grading-enter{animation:gradingIn .5s ease both}.grading-wave{transform-origin:center;animation:gradingWave 1.1s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.grading-enter,.grading-wave{animation:none!important}}`}</style>
    <header className="relative isolate overflow-hidden bg-[#082C72] px-4 pb-16 pt-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-24 -top-40 h-[380px] w-[520px] rounded-full bg-[#1677FF]/35 blur-[95px]"/><div className="absolute right-[8%] top-[-180px] h-[410px] w-[520px] rounded-full bg-[#0384FF]/40 blur-[80px]"/><div className="absolute bottom-[-140px] right-[12%] h-[250px] w-[650px] rotate-[-13deg] rounded-[100%] border-[35px] border-[#369CFF]/20"/><div className="absolute inset-0 bg-gradient-to-r from-[#06235F]/70 via-transparent to-[#001F60]/40"/></div>
      <div className="relative mx-auto flex max-w-[1510px] items-center justify-between gap-4"><div className="grading-enter max-w-3xl"><button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"><ArrowLeft size={17}/> Quay lại</button><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#A9D8FF]">MSEEK ACADEMY / INSTRUCTOR</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Chấm bài Quiz</h1><p className="mt-2 text-sm text-blue-100 sm:text-base">Đọc bài làm, nhập điểm và nhận xét cho từng câu cần chấm thủ công.</p><div className="mt-4 flex gap-2"><span className="h-1.5 w-14 rounded-full bg-amber-400"/><span className="h-1.5 w-10 rounded-full bg-blue-400"/><span className="h-1.5 w-9 rounded-full bg-emerald-400"/></div></div>
      <div className="pointer-events-none hidden items-center gap-4 opacity-80 md:flex"><div className="flex h-16 items-center gap-[5px]">{[14,28,42,24,54,35,62,31,47,20,39,17].map((h,i)=><span key={i} className="grading-wave w-[4px] rounded-full bg-cyan-300/80" style={{height:h,animationDelay:`${i*0.08}s`}}/>)}</div><Mic2 className="h-28 w-28 rotate-[-12deg] text-[#9DD9FF] drop-shadow-[0_0_25px_#36B5FF]" strokeWidth={1.1}/><Sparkles className="h-7 w-7 text-blue-200"/></div></div>
    </header>
    <div className="relative mx-auto -mt-10 max-w-[1530px] px-3 pb-10 sm:px-5 lg:px-7"><div className="grid items-start gap-3 lg:grid-cols-[365px_minmax(0,1fr)] xl:grid-cols-[405px_minmax(0,1fr)]">
      <aside className="grading-enter rounded-[22px] border border-[#DFE9F8] bg-white p-4 shadow-[0_12px_36px_rgba(25,72,137,.08)] sm:p-5">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#E2EFFF] p-3 text-[#0069F7]"><ClipboardCheck size={23}/></div><div><h2 className="font-extrabold">Danh sách bài nộp</h2><p className="text-xs text-[#7587A6]">Chọn bài nộp để xem và chấm điểm</p></div></div><button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#B7D4FF] px-3 py-2 text-xs font-bold text-[#0766EC] transition hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/> Làm mới</button></div>
        <div className="mt-5 grid grid-cols-3 gap-1.5">{([{key:'all',label:'Tất cả',count:attempts.length},{key:'pending',label:'Chờ chấm',count:pendingCount},{key:'done',label:'Hoàn tất',count:doneCount}] as const).map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key)} className={`rounded-full px-2 py-2 text-xs font-bold transition ${filter===item.key?'bg-[#0968F7] text-white shadow-md shadow-blue-200':'border border-[#DFE9F7] bg-white text-[#56709C] hover:bg-blue-50'}`}>{item.label} ({item.count})</button>)}</div>
        <label className="relative mt-4 block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B83A9]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm theo ID học viên hoặc bài nộp..." className={`${inputClass} pl-10`}/>{search&&<button type="button" onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={15}/></button>}</label>
        <div className="mt-3 max-h-[690px] space-y-2.5 overflow-y-auto pr-1">{loading?<div className="flex items-center justify-center gap-2 py-12 text-sm text-[#6480A9]"><Loader2 className="animate-spin" size={18}/> Đang tải bài nộp...</div>:filtered.length===0?<div className="py-12 text-center text-sm text-[#8295B1]">Không có bài nộp phù hợp.</div>:filtered.map((a,i)=><button key={a.attemptId} type="button" onClick={()=>void open(a.attemptId)} className={`grading-enter w-full rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected===a.attemptId?'border-[#287AFF] bg-[#F0F7FF] shadow-[0_0_0_1px_#287AFF]':'border-[#E2EAF5] bg-white hover:border-[#9FC5FF]'}`} style={{animationDelay:`${Math.min(i,8)*40}ms`}}><div className="flex items-center gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${i%4===0?'bg-blue-100 text-blue-700':i%4===1?'bg-violet-100 text-violet-700':i%4===2?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{initials(a)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><p className="truncate text-sm font-extrabold">{learnerName(a)}</p><ChevronRight size={16} className="shrink-0 text-[#5073AA]"/></div><p className="mt-0.5 text-xs text-[#6980A5]">Bài #{a.attemptId} · Lần làm: {a.attemptNumber}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-[#7990B2]"><CalendarDays size={12}/>{formatDate(a.submittedAt)}</p></div></div><div className="mt-2.5 flex justify-end"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${a.pendingAnswers>0?'bg-[#FFF1D3] text-[#C07800]':'bg-[#DCF8EF] text-[#008B68]'}`}>{a.pendingAnswers>0?`◷ Chờ chấm ${a.pendingAnswers} câu`:`✓ Hoàn tất · ${a.score??0}%`}</span></div></button>)}</div>
      </aside>
      <main className="min-w-0 space-y-3">{error&&<div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span className="flex-1">{error}</span><button type="button" onClick={()=>setError('')}><X size={17}/></button></div>}
        {detailLoading?<div className="flex min-h-[450px] items-center justify-center gap-3 rounded-[22px] bg-white text-[#6781A9]"><Loader2 className="animate-spin"/> Đang tải chi tiết bài làm...</div>:!result?<div className="flex min-h-[450px] flex-col items-center justify-center rounded-[22px] border border-[#DFE9F8] bg-white px-5 text-center shadow-sm"><div className="mb-4 rounded-2xl bg-[#E7F1FF] p-5 text-[#0870FF]"><BookOpenCheck size={40}/></div><h2 className="text-lg font-extrabold">Chọn một bài nộp để bắt đầu chấm</h2><p className="mt-2 max-w-sm text-sm text-[#7186A8]">Danh sách bên trái hiển thị các lượt làm Quiz thực tế của học viên.</p></div>:<>
          <section className="grading-enter rounded-[20px] border border-[#DFE9F8] bg-white p-4 shadow-[0_8px_28px_rgba(25,72,137,.06)] sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700"><UserRound size={24}/></div><div><h2 className="font-extrabold">{learnerName(activeAttempt)}</h2><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7287AA]"><span>Bài ID: {result.attemptId}</span><span>Lần làm: {result.attemptNumber}</span>{activeAttempt?.submittedAt&&<span>Nộp bài: {formatDate(activeAttempt.submittedAt)}</span>}</p></div></div><span className={`rounded-xl px-4 py-2 text-xs font-bold ${result.requiresManualGrading?'bg-[#FFF3D8] text-[#BD7400]':'bg-[#E3F8ED] text-[#05845B]'}`}>{result.requiresManualGrading?`◷ Đang chờ chấm · ${pendingAnswers} câu`:'✓ Đã hoàn thành'}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#F1F7FF] p-4"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-white p-3 text-[#0870FF]"><FileText size={22}/></div><div><h3 className="font-extrabold">{result.quizTitle}</h3><p className="mt-1 text-xs text-[#7087A9]">Xem bài làm và chấm điểm theo từng câu hỏi</p></div></div><div className="flex flex-wrap gap-2"><div className="rounded-xl bg-white px-4 py-2 text-center"><p className="text-lg font-black">{result.answers.length}</p><p className="text-[11px] text-[#7186A8]">Tổng câu hỏi</p></div><div className="rounded-xl bg-white px-4 py-2 text-center"><p className="flex items-center justify-center gap-1 text-lg font-black"><Star size={17} className="fill-amber-400 text-amber-400"/>{maxTotal}</p><p className="text-[11px] text-[#7186A8]">Tổng điểm tối đa</p></div><div className="rounded-xl bg-white px-4 py-2 text-center"><p className="text-lg font-black text-[#0073E9]">{result.score==null?'—':`${result.score}%`}</p><p className="text-[11px] text-[#7186A8]">Điểm hiện tại</p></div></div></div></section>
          <section className="grading-enter rounded-[20px] border border-[#DFE9F8] bg-white p-3 shadow-[0_8px_28px_rgba(25,72,137,.06)] sm:p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#E4F0FF] p-3 text-[#0969F7]"><ClipboardCheck size={22}/></div><div><h2 className="font-extrabold">Danh sách câu trả lời</h2><p className="mt-1 text-xs text-[#788DAB]">Xem câu trả lời và chấm điểm các câu cần chấm thủ công.</p></div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>setOnlyPending(v=>!v)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${onlyPending?'border-blue-400 bg-blue-50 text-blue-700':'border-[#E0E8F4] text-[#51709C]'}`}><Filter size={14}/> Chỉ câu cần chấm <span className={`relative h-4 w-8 rounded-full transition ${onlyPending?'bg-blue-600':'bg-slate-300'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${onlyPending?'left-[18px]':'left-0.5'}`}/></span></button><button type="button" onClick={()=>setCollapsed(allCollapsed?[]:visibleAnswers.map(({answer})=>answer.quizAnswerId))} className="inline-flex items-center gap-1 rounded-xl border border-[#B8D3FF] px-3 py-2 text-xs font-bold text-[#086AF0] hover:bg-blue-50">{allCollapsed?<ChevronDown size={15}/>:<ChevronUp size={15}/>} {allCollapsed?'Mở rộng tất cả':'Thu gọn tất cả'}</button></div></div>
            <div className="space-y-3">{visibleAnswers.length===0?<div className="rounded-xl bg-blue-50 px-4 py-8 text-center text-sm text-[#6681A7]">Không có câu hỏi cần chấm trong bộ lọc này.</div>:visibleAnswers.map(({answer:a,index})=><article key={a.quizAnswerId} className="overflow-hidden rounded-xl border border-[#E0E9F6] bg-white transition hover:border-[#C1D8F8]"><div className="flex items-start gap-3 p-3 sm:p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B6FF6] text-sm font-black text-white">{index+1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[#E5F0FF] px-2 py-1 text-[10px] font-extrabold text-[#0968EE]">{typeLabel(String(a.questionType))}</span><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${a.score==null?'bg-[#FFF2D9] text-[#B87900]':'bg-[#E3F8ED] text-[#087D5A]'}`}>{a.score==null?'◷ Cần chấm':'✓ Đã có điểm'}</span><span className="rounded-lg bg-[#F0F5FD] px-2 py-1 text-[10px] font-semibold text-[#58739D]">Tối đa {a.maxScore??0} điểm</span></div><h3 className="mt-2 text-sm font-extrabold leading-6">{a.questionText}</h3></div><button type="button" onClick={()=>toggle(a.quizAnswerId)} aria-label={collapsed.includes(a.quizAnswerId)?'Mở rộng câu hỏi':'Thu gọn câu hỏi'} className="rounded-lg p-2 text-[#6380A9] hover:bg-blue-50">{collapsed.includes(a.quizAnswerId)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button></div>
              {!collapsed.includes(a.quizAnswerId)&&<div className="grid gap-4 border-t border-[#EFF3FA] px-3 pb-4 pt-3 sm:px-4 xl:grid-cols-[minmax(0,1fr)_275px]"><div className="min-w-0"><p className="mb-2 text-xs font-bold text-[#1B3B71]">Câu trả lời của học viên</p><LearnerAnswerView answer={a}/>{a.score!=null&&<div className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 size={17}/> Đã chấm: {a.score} / {a.maxScore??0} điểm</div>}</div><div className="min-w-0 border-t border-[#E4EDF8] pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">{a.score==null?<div className="space-y-3"><label className="block text-xs font-bold">Điểm (0 – {a.maxScore??0})<input type="number" min={0} max={a.maxScore??0} step="0.01" value={scores[a.quizAnswerId]??''} onChange={e=>setScores(v=>({...v,[a.quizAnswerId]:e.target.value}))} placeholder="Nhập điểm" className={`mt-1.5 ${inputClass}`}/></label><label className="block text-xs font-bold">Nhận xét giáo viên<textarea rows={3} value={feedback[a.quizAnswerId]??''} onChange={e=>setFeedback(v=>({...v,[a.quizAnswerId]:e.target.value}))} placeholder="Nhận xét, góp ý cho học viên..." className={`mt-1.5 resize-y ${inputClass}`}/></label><button type="button" disabled={busy} onClick={()=>void grade(a)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0869F5] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#0058D8] disabled:cursor-not-allowed disabled:opacity-50">{savingId===a.quizAnswerId?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {savingId===a.quizAnswerId?'Đang lưu...':'Lưu điểm câu này'}</button></div>:<div className="rounded-xl bg-[#EAF9F1] p-3 text-sm text-[#137653]"><p className="flex items-center gap-2 font-bold"><Check size={17}/> Đã có điểm</p>{a.teacherFeedback&&<p className="mt-2 whitespace-pre-wrap break-words leading-6">Nhận xét: {a.teacherFeedback}</p>}</div>}</div></div>}</article>)}</div>
          </section>
        </>}
      </main>
    </div></div>
  </div>;
};
export default InstructorQuizGradingPage;
