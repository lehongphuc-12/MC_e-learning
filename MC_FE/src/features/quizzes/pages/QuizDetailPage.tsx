import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Award, BarChart3, Check, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, FileText, GitBranch, GripVertical, Headphones, ListChecks, Loader2, Mic2, Pencil, Play, RotateCcw, Search, Settings2, Target, Trash2, Users } from 'lucide-react';
import type { QuestionDto, AnnotationType, ScenarioNodeDto } from '../types/quizTypes';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useQuiz } from '../hooks/useQuiz';

const names: Record<string, string> = { SINGLE_CHOICE:'Trắc nghiệm một đáp án', MULTIPLE_CHOICE:'Trắc nghiệm nhiều đáp án', TRUE_FALSE:'Đúng / Sai', FILL_BLANK:'Điền từ', LISTEN_IDENTIFY_ERROR:'Nghe và nhận diện lỗi', LISTEN_LOCATE_ERROR:'Nghe và xác định vùng lỗi', AUDIO_COMPARISON:'So sánh giọng đọc', LISTEN_CLASSIFY:'Nghe và phân loại', SCRIPT_ANNOTATION:'Đánh dấu lời dẫn', SCRIPT_WRITING:'Viết lời dẫn MC', ARRANGE_SCRIPT:'Sắp xếp lời dẫn', ERROR_CORRECTION_LAB:'Phân tích và sửa lỗi', SCENARIO_DECISION_TREE:'Xử lý tình huống MC', ESSAY:'Tự luận' };
const hints: Record<string, string> = { LISTEN_LOCATE_ERROR:'Nghe đoạn ghi âm rồi kéo trên timeline để đánh dấu vị trí mắc lỗi.', ERROR_CORRECTION_LAB:'Chọn vùng lỗi và mô tả nguyên nhân hoặc cách khắc phục.', SCRIPT_ANNOTATION:'Bôi đen từ hoặc cụm từ trong lời dẫn rồi chọn cách thể hiện.', ARRANGE_SCRIPT:'Sắp xếp các đoạn thành lời dẫn hợp lý.', SCENARIO_DECISION_TREE:'Chọn cách xử lý để đi tiếp qua từng tình huống.' };
const formatMs = (value: number) => { const s = Math.floor(Math.max(0, value) / 1000); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; };

interface QuizNavigationState {
  returnTo?: string;
}

const QuizDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigationState = location.state as QuizNavigationState | null;
  const returnTo = navigationState?.returnTo;
  const quizId = id ? Number(id) : null;
  const validQuizId = quizId !== null && Number.isInteger(quizId) && quizId > 0 ? quizId : null;
  const { data: quiz, isLoading, isError, error } = useQuiz(validQuizId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [tab, setTab] = useState<'questions' | 'settings' | 'stats'>('questions');
  const [questionSearch, setQuestionSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const handleBack = () => {
    if (returnTo) { navigate(returnTo, { replace: true }); return; }
    if (quiz?.courseId != null && Number.isInteger(quiz.courseId) && quiz.courseId > 0) {
      navigate(`/instructor/courses/${quiz.courseId}/lessons#quiz-management`, { replace: true }); return;
    }
    navigate('/instructor/courses', { replace: true });
  };
  const handleEditQuiz = () => {
    if (!quiz) return;
    const fallbackReturnTo = quiz.courseId != null && Number.isInteger(quiz.courseId) && quiz.courseId > 0 ? `/instructor/courses/${quiz.courseId}/lessons#quiz-management` : undefined;
    navigate(`/instructor/quizzes/${quiz.quizId}/edit`, { state: { returnTo: returnTo ?? fallbackReturnTo } });
  };
  if (validQuizId === null || isError || (!isLoading && !quiz)) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f7fd] px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#dce8f7] bg-white p-8 text-center shadow-sm">
        <AlertCircle size={36} className="mx-auto text-[#ef6a61]"/>
        <h2 className="mt-3 text-xl font-black text-[#102e65]">{validQuizId === null ? 'Quiz ID không hợp lệ' : 'Không thể tải Quiz'}</h2>
        <p className="mt-2 text-sm text-[#7288a8]">{validQuizId === null ? 'Đường dẫn Quiz không hợp lệ.' : error instanceof Error ? error.message : 'Quiz không tồn tại hoặc đã xảy ra lỗi.'}</p>
        <button onClick={handleBack} className="mt-5 rounded-xl bg-[#0866ed] px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft size={15} className="mr-2 inline"/>Quay lại</button>
      </div>
    </div>
  );
  if (isLoading || !quiz) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f3f7fd] text-sm font-semibold text-[#5275a8]"><Loader2 size={23} className="animate-spin"/>Đang tải thông tin Quiz...</div>;

  const questions = [...quiz.questions].sort((a,b) => a.orderIndex - b.orderIndex);
  const selected = questions.find(q => q.questionId === selectedQuestionId) ?? questions[0];
  const visibleQuestions = questions.filter(q => (typeFilter === 'ALL' || q.questionType === typeFilter) && `${q.questionText} ${names[q.questionType] ?? q.questionType}`.toLowerCase().includes(questionSearch.trim().toLowerCase()));
  const questionTypes = [...new Set(questions.map(q => q.questionType))];
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points ?? 1), 0);
  const withMedia = questions.filter(q => (q.media?.length ?? 0) > 0).length;
  const statusText = quiz.status === 'ACTIVE' ? 'Đang hoạt động' : quiz.status === 'ARCHIVED' ? 'Đã lưu trữ' : quiz.status;
  const statusStyle = quiz.status === 'ACTIVE' ? 'bg-[#e1f8ed] text-[#05996d]' : quiz.status === 'ARCHIVED' ? 'bg-[#edf1f6] text-[#667a98]' : 'bg-[#fff4dd] text-[#ba7b00]';
  const smallStats = [
    { label: 'Tổng số câu', value: `${questions.length} câu`, icon: FileText, tone: 'text-[#1169ec] bg-[#e8f2ff]' },
    { label: 'Tổng điểm', value: `${totalPoints} điểm`, icon: Award, tone: 'text-[#d99606] bg-[#fff4da]' },
    { label: 'Điểm đạt', value: `${quiz.passingScore}%`, icon: Target, tone: 'text-[#e39b0a] bg-[#fff3da]' },
    { label: 'Lượt làm tối đa', value: quiz.maxAttempts > 0 ? `${quiz.maxAttempts} lượt` : 'Không giới hạn', icon: Users, tone: 'text-[#079c77] bg-[#e2f8ee]' }
  ];
  return (
    <div className="min-h-screen bg-[#f3f8fe] pb-12 text-[#102e63]">
      <style>{`@keyframes qdWave{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}@keyframes qdIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}.qd-in{animation:qdIn .35s ease both}.qd-wave{transform-origin:center;animation:qdWave 1.25s ease-in-out infinite}`}</style>
      <header className="relative isolate overflow-hidden bg-[#08336f]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_0%,#147af2_0%,transparent_48%),linear-gradient(110deg,#082656_0%,#0b428d_58%,#0867d4_100%)]"/>
        <div className="absolute -right-24 -top-36 h-[350px] w-[620px] rotate-[-15deg] rounded-[100%] border-[65px] border-[#62b4ff]/20"/>
        <div className="absolute -bottom-36 right-[12%] h-[230px] w-[700px] rotate-[-12deg] rounded-[100%] border-[58px] border-[#39a4ff]/20"/>
        <div className="relative mx-auto flex min-h-[215px] max-w-[1480px] items-center justify-between px-5 pb-12 pt-5 sm:px-8 lg:px-10">
          <div className="relative z-10">
            <button type="button" onClick={handleBack} className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"><ArrowLeft size={15}/>Quay lại</button>
            <p className="text-xs font-bold tracking-[.12em] text-[#cce4ff]">MSEEK ACADEMY / INSTRUCTOR</p>
            <h1 className="mt-1 text-[30px] font-black tracking-tight text-white sm:text-[38px]">Chi tiết Quiz</h1>
            <p className="mt-1 text-[13px] text-[#d9eaff]">Xem thông tin, cấu trúc và nội dung câu hỏi trong bài kiểm tra.</p>
            <div className="mt-4 flex gap-2"><span className="h-[5px] w-12 rounded-full bg-[#ffc52c]"/><span className="h-[5px] w-12 rounded-full bg-[#138eff]"/><span className="h-[5px] w-12 rounded-full bg-[#08c79c]"/></div>
          </div>
          <div className="pointer-events-none absolute right-[7%] top-0 hidden h-full w-[38%] items-center justify-end lg:flex">
            <span className="mr-6 rotate-[-9deg] font-serif text-2xl italic leading-8 text-white/70">Voice<br/>Create<br/>Inspire</span>
            <div className="relative mr-10 flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_70px_rgba(81,193,255,.5)]"><Mic2 size={91} strokeWidth={1.1} className="text-[#e2f4ff]"/></div>
            <div className="absolute right-0 flex items-center gap-[3px]">{Array.from({length:24},(_,i)=><span key={i} className="qd-wave w-[3px] rounded-full bg-[#8beaff]/80" style={{height:`${12+(i%7)*9}px`,animationDelay:`${i*.07}s`}}/>)}</div>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto -mt-6 max-w-[1480px] space-y-4 px-4 sm:px-7 lg:px-10">
        <section className="qd-in rounded-[22px] border border-[#e1eaf6] bg-white p-4 shadow-[0_7px_24px_rgba(24,65,122,.07)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-[#e6f1ff] text-[#0968ef] sm:h-[86px] sm:w-[86px]"><FileText size={43} strokeWidth={1.9}/></div>
              <div className="min-w-0"><h2 className="text-lg font-black text-[#0b2860] sm:text-[22px]">{quiz.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#eaf3ff] px-2.5 py-1 text-[11px] font-bold text-[#2761ae]">Quiz #{quiz.quizId}</span><span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${statusStyle}`}>{statusText}</span><span className="rounded-md border border-[#dce8f8] bg-[#f7faff] px-2.5 py-1 text-[11px] text-[#55749e]">Khóa học #{quiz.courseId ?? '—'}</span></div>
                {quiz.description && <p className="mt-3 max-w-[720px] text-xs leading-6 text-[#6580a5] sm:text-sm">{quiz.description}</p>}
              </div>
            </div>
            <button type="button" onClick={handleEditQuiz} className="inline-flex items-center gap-2 rounded-xl border border-[#0c70f4] bg-white px-4 py-2.5 text-xs font-bold text-[#0968e9] transition hover:bg-[#edf6ff]"><Pencil size={15}/>Chỉnh sửa Quiz</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e9eff8] pt-4 md:grid-cols-4">{smallStats.map(s=><div key={s.label} className="flex items-center gap-3 rounded-xl bg-[#f7faff] px-3 py-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}><s.icon size={20}/></div><div><p className="text-[11px] text-[#7890b1]">{s.label}</p><p className="mt-0.5 text-sm font-extrabold text-[#15356c]">{s.value}</p></div></div>)}</div>
        </section>
        <section className="overflow-hidden rounded-[20px] border border-[#e2eaf6] bg-white shadow-[0_6px_22px_rgba(24,65,122,.055)]">
          <div className="grid grid-cols-3 gap-1 border-b border-[#e7eef8] p-2 sm:p-3">
            {([{key:'questions',label:`Danh sách câu hỏi (${questions.length})`,icon:ListChecks},{key:'settings',label:'Cài đặt Quiz',icon:Settings2},{key:'stats',label:'Tổng quan',icon:BarChart3}] as const).map(t=><button key={t.key} type="button" onClick={()=>setTab(t.key)} className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-extrabold transition sm:text-sm ${tab===t.key?'bg-[#0867ef] text-white shadow-[0_4px_12px_rgba(0,102,238,.18)]':'text-[#496a99] hover:bg-[#f0f6ff]'}`}><t.icon size={17}/>{t.label}</button>)}
          </div>
          {tab==='questions' ? <div className="grid min-h-[460px] gap-3 bg-[#f8fbff] p-3 lg:grid-cols-[minmax(270px,34%)_minmax(0,1fr)] lg:gap-4 lg:p-4">
            <aside className="min-w-0 rounded-2xl border border-[#e3ebf6] bg-white p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-black text-[#0d2c63]">Danh sách câu hỏi ({questions.length})</h3><span className="text-[11px] text-[#7a90b0]">{totalPoints} điểm</span></div>
              <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829ab8]"/><input value={questionSearch} onChange={e=>setQuestionSearch(e.target.value)} placeholder="Tìm câu hỏi..." className="h-10 w-full rounded-xl border border-[#dfe9f6] bg-[#f8fbff] pl-9 pr-3 text-xs outline-none focus:border-[#0a71ef]"/></div>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="mb-3 h-10 w-full rounded-xl border border-[#dfe9f6] bg-white px-3 text-xs text-[#4d6c97] outline-none focus:border-[#0a71ef]"><option value="ALL">Tất cả loại câu hỏi</option>{questionTypes.map(t=><option key={t} value={t}>{names[t]??t}</option>)}</select>
              <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">{visibleQuestions.map(q=>{const i=questions.findIndex(x=>x.questionId===q.questionId);const active=selected?.questionId===q.questionId;return <button type="button" key={q.questionId} onClick={()=>setSelectedQuestionId(q.questionId)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${active?'border-[#1a79ff] bg-[#eef6ff] shadow-[0_2px_8px_rgba(28,113,238,.09)]':'border-[#e6edf7] bg-white hover:border-[#b7d5ff] hover:bg-[#f8fbff]'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${active?'bg-[#dbeaff] text-[#0665ed]':'bg-[#f0f4fa] text-[#526f98]'}`}>{i+1}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f3ff] text-[#116bea]"><QuestionTypeIcon type={q.questionType}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#14336a]">{q.questionText || `Câu hỏi ${i+1}`}</span><span className="mt-1 block truncate text-[11px] text-[#7089ad]">{names[q.questionType]??q.questionType} · {q.points??1} điểm</span></span><ChevronRight size={15} className={active?'text-[#0b6bea]':'text-[#a5b6ce]'}/></button>;})}{visibleQuestions.length===0&&<p className="rounded-xl bg-[#f7faff] px-3 py-7 text-center text-xs text-[#7b91b1]">Không tìm thấy câu hỏi phù hợp.</p>}</div>
            </aside>
            <div className="min-w-0">{selected ? <QuestionCard key={selected.questionId} question={selected} index={questions.findIndex(q=>q.questionId===selected.questionId)}/> : <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce7f7] bg-white p-8 text-center"><FileText size={35} className="text-[#9eb7d9]"/><h3 className="mt-3 text-sm font-bold">Quiz chưa có câu hỏi</h3><p className="mt-1 text-xs text-[#8094b2]">Chọn chỉnh sửa Quiz để thêm nội dung.</p><button onClick={handleEditQuiz} className="mt-4 rounded-xl bg-[#096af0] px-4 py-2 text-xs font-bold text-white">Chỉnh sửa Quiz</button></div>}</div>
          </div> : tab==='settings' ? <div className="qd-in grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {[['Quiz ID',String(quiz.quizId)],['Trạng thái',statusText],['Thời gian làm',quiz.timeLimitMinutes>0?`${quiz.timeLimitMinutes} phút`:'Không giới hạn'],['Điểm đạt',`${quiz.passingScore}%`],['Lượt làm tối đa',quiz.maxAttempts>0?`${quiz.maxAttempts} lượt`:'Không giới hạn'],['Course ID',quiz.courseId!=null?String(quiz.courseId):'Không có'],['Lesson ID',quiz.lessonId!=null?String(quiz.lessonId):'Không có'],['Số câu hỏi',String(questions.length)],['Tổng điểm',String(totalPoints)]].map(([label,value])=><div key={label} className="rounded-2xl border border-[#e2ebf7] bg-[#f8fbff] p-4"><p className="text-xs font-semibold text-[#7990b0]">{label}</p><p className="mt-2 text-base font-black text-[#16376f]">{value}</p></div>)}
            <div className="sm:col-span-2 lg:col-span-3"><button type="button" onClick={handleEditQuiz} className="inline-flex items-center gap-2 rounded-xl bg-[#0867ef] px-5 py-3 text-xs font-bold text-white"><Pencil size={15}/>Chỉnh sửa cài đặt Quiz</button></div>
          </div> : <div className="qd-in p-4 sm:p-6"><h3 className="text-base font-black">Tổng quan cấu trúc Quiz</h3><p className="mt-1 text-xs text-[#7188a9]">Thống kê dựa trên nội dung câu hỏi thực tế của Quiz.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[['Số câu hỏi',questions.length],['Câu có media',withMedia],['Tổng điểm',totalPoints]].map(([label,value])=><div key={label} className="rounded-2xl border border-[#e2ebf7] bg-[#f7faff] p-5"><p className="text-xs text-[#7188a9]">{label}</p><p className="mt-2 text-3xl font-black text-[#0c59c9]">{value}</p></div>)}</div><h4 className="mt-6 text-sm font-extrabold">Phân bổ loại câu hỏi</h4><div className="mt-3 space-y-3">{questionTypes.map(t=>{const count=questions.filter(q=>q.questionType===t).length;return <div key={t}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-semibold text-[#395a8b]">{names[t]??t}</span><span className="font-bold text-[#0a65e7]">{count} câu</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e9f0fa]"><div className="h-full rounded-full bg-[#1375f3]" style={{width:`${questions.length?count/questions.length*100:0}%`}}/></div></div>})}{questions.length===0&&<p className="text-xs text-[#8194b0]">Chưa có câu hỏi để thống kê.</p>}</div></div>}
        </section>
      </main>
    </div>
  );
};

const QuestionTypeIcon: React.FC<{type:string}> = ({type}) => {
  if (type.includes('LISTEN') || type==='AUDIO_COMPARISON') return <Headphones size={18}/>;
  if (type.includes('SCRIPT') || type==='ESSAY') return <FileText size={18}/>;
  if (type==='SCENARIO_DECISION_TREE') return <GitBranch size={18}/>;
  if (type==='FILL_BLANK') return <Pencil size={18}/>;
  return <ListChecks size={18}/>;
};

const TimelinePreview: React.FC<{ question: QuestionDto }> = ({ question }) => {
  const audio = question.media?.find(m => m.mediaType === 'AUDIO');
  const ref = useRef<HTMLDivElement>(null); const audioRef = useRef<HTMLAudioElement>(null); const drag = useRef<number | null>(null);
  const [duration,setDuration] = useState(Math.max(1,audio?.durationSeconds || 30)); const [selected,setSelected] = useState<[number,number] | null>(null); const [regions,setRegions] = useState<[number,number][]>([]);
  const point = (x:number) => { const r=ref.current?.getBoundingClientRect(); return r ? Math.round(Math.max(0,Math.min(1,(x-r.left)/r.width))*duration*1000) : 0; };
  const start = selected?.[0] ?? 0; const end = selected?.[1] ?? 0;
  return <div className="mt-5 rounded-2xl border border-[#cde1ff] bg-gradient-to-br from-blue-50 to-white p-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-800"><Headphones size={17}/> Phòng nghe • Chọn vùng lỗi</p>{audio ? <audio ref={audioRef} controls preload="metadata" src={audio.mediaUrl} className="w-full" onLoadedMetadata={e => { const d=e.currentTarget.duration; if(Number.isFinite(d) && d>0) setDuration(d); }}/> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Chưa có file audio. Không thể xác định thời gian lỗi.</p>}
    <p className="mt-4 text-xs text-slate-500">Kéo chuột hoặc vuốt trên thanh bên dưới để chọn đoạn âm thanh mắc lỗi.</p><div ref={ref} onPointerDown={e => { if(!audio) return; e.currentTarget.setPointerCapture(e.pointerId); const p=point(e.clientX); drag.current=p; setSelected([p,p]); }} onPointerMove={e => { if(drag.current===null) return; const p=point(e.clientX); setSelected([Math.min(drag.current,p),Math.max(drag.current,p)]); }} onPointerUp={e => { if(drag.current===null) return; const p=point(e.clientX); const a=Math.min(drag.current,p); setSelected([a,Math.min(duration*1000,Math.max(a+100,Math.max(drag.current,p)))]); drag.current=null; }} onPointerCancel={() => {drag.current=null;}} className="relative mt-3 h-24 touch-none select-none overflow-hidden rounded-2xl border border-[#cde1ff] bg-white"><div className="absolute inset-x-2 top-1/2 flex h-12 -translate-y-1/2 items-center gap-[2px]">{Array.from({length:64},(_,i)=><span key={i} className="w-full rounded-full bg-blue-200" style={{height:`${18+Math.abs(Math.sin(i*1.83)*Math.cos(i*.37))*75}%`}}/>)}</div>{regions.map(([a,b],i)=><div key={i} className="pointer-events-none absolute inset-y-0 bg-amber-300/40" style={{left:`${a/(duration*10)}%`,width:`${(b-a)/(duration*10)}%`}}/>)}{selected && <div className="pointer-events-none absolute inset-y-0 border-x-2 border-blue-600 bg-[#eff6ff]0/30" style={{left:`${start/(duration*10)}%`,width:`${Math.max(0,end-start)/(duration*10)}%`}}/>}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>00:00</span><span>{selected ? `${formatMs(start)} → ${formatMs(end)}` : 'Chưa chọn vùng'}</span><span>{formatMs(duration*1000)}</span></div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!selected || !audio} onClick={() => { if(!audioRef.current || !selected) return; audioRef.current.currentTime=start/1000; void audioRef.current.play(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#cde1ff] bg-white px-4 py-2 text-sm font-semibold text-[#075fdb] disabled:opacity-40"><Play size={15}/> Nghe vùng chọn</button><button type="button" disabled={!selected || end-start<100} onClick={() => {setRegions(v=>[...v,[start,Math.min(duration*1000,end)]]);setSelected(null);}} className="rounded-xl bg-[#0867ef] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">+ Thêm vùng lỗi</button><button type="button" onClick={() => {setRegions([]);setSelected(null);}} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">Làm lại</button></div>{regions.map(([a,b],i)=><div key={i} className="mt-2 flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm"><span>Vùng {i+1}: <b>{formatMs(a)} – {formatMs(b)}</b></span><button type="button" onClick={() => setRegions(v=>v.filter((_,j)=>j!==i))} className="text-red-500" aria-label="Xóa vùng"><Trash2 size={16}/></button></div>)}<p className="mt-3 text-xs text-blue-600">Chế độ xem trước: các vùng được chọn chỉ lưu tạm trên trình duyệt.</p></div>;
};

const AnnotationPreview: React.FC<{question:QuestionDto}> = ({question}) => { const ref=useRef<HTMLDivElement>(null); const [range,setRange]=useState<[number,number] | null>(null); const [type,setType]=useState<AnnotationType>('PAUSE'); const [items,setItems]=useState<{a:number;b:number;type:AnnotationType}[]>([]); const types:Record<AnnotationType,string>={PAUSE:'Ngắt nghỉ',BREATH:'Lấy hơi',EMPHASIS:'Nhấn giọng',PITCH_RISE:'Lên giọng',PITCH_FALL:'Xuống giọng'}; const capture=()=>{const s=window.getSelection();if(!s||s.isCollapsed||!ref.current||!ref.current.contains(s.anchorNode)||!ref.current.contains(s.focusNode))return;const r=s.getRangeAt(0);const b=r.cloneRange();b.selectNodeContents(ref.current);b.setEnd(r.startContainer,r.startOffset);const a=b.toString().length;setRange([a,a+r.toString().length]);};return <div className="mt-5 space-y-3"><div ref={ref} onMouseUp={capture} onKeyUp={capture} className="select-text rounded-2xl border border-blue-100 bg-[#eff6ff]/50 p-5 text-base leading-9">{question.questionText}</div><div className="flex flex-wrap gap-2"><select value={type} onChange={e=>setType(e.target.value as AnnotationType)} className="rounded-xl border border-[#cde1ff] bg-white px-3 py-2 text-sm">{Object.entries(types).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><button type="button" disabled={!range} onClick={()=>{if(!range)return;setItems(v=>[...v,{a:range[0],b:range[1],type}]);setRange(null);window.getSelection()?.removeAllRanges();}} className="rounded-xl bg-[#0867ef] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">+ Thêm đánh dấu</button></div>{items.map((v,i)=><div key={i} className="flex justify-between rounded-xl border border-blue-100 p-3 text-sm"><span><b className="text-[#075fdb]">{types[v.type]}</b>: “{question.questionText.slice(v.a,v.b)}”</span><button type="button" onClick={()=>setItems(x=>x.filter((_,j)=>j!==i))} className="text-red-500"><Trash2 size={15}/></button></div>)}</div>; };

const ScenarioPreview: React.FC<{question:QuestionDto}> = ({question}) => { const nodes=question.scenarioNodes||[];const [path,setPath]=useState<number[]>([]);const start=nodes.find(n=>n.isStartNode);const node:ScenarioNodeDto|undefined=path.length?nodes.find(n=>n.nodeId===path[path.length-1]):start;return <div className="mt-5 rounded-2xl border border-[#cde1ff] bg-[#eff6ff]/40 p-5">{node ? <><div className="flex justify-between"><span className="text-xs font-bold text-[#075fdb]">Bước {path.length+1}</span><button type="button" onClick={()=>setPath([])} className="flex items-center gap-1 text-xs text-blue-600"><RotateCcw size={14}/> Bắt đầu lại</button></div><h4 className="mt-3 font-bold">{node.title||'Tình huống'}</h4><p className="mt-2 whitespace-pre-line text-sm leading-7">{node.content}</p>{node.isEndNode ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Đã hoàn thành nhánh tình huống.</p> : <div className="mt-4 grid gap-2">{[...node.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map(c=><button key={c.scenarioChoiceId} type="button" onClick={()=>{if(c.nextNodeId!=null)setPath(p=>[...p,c.nextNodeId!]);else setPath(p=>[...p,-1]);}} className="rounded-xl border border-blue-100 bg-white p-4 text-left text-sm hover:border-blue-400">{c.choiceText}</button>)}</div>}</> : <div className="text-sm text-amber-700">{path.length?'Nhánh tình huống đã kết thúc.':'Chưa có nút bắt đầu.'}<button type="button" onClick={()=>setPath([])} className="ml-3 font-bold underline">Làm lại</button></div>}</div>; };

const QuestionPreview: React.FC<{question:QuestionDto}> = ({question}) => { const [chosen,setChosen]=useState<number[]>([]);const [text,setText]=useState('');const [order,setOrder]=useState<number[]>([]);const multi=question.questionType==='MULTIPLE_CHOICE';const choiceTypes=['SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','LISTEN_IDENTIFY_ERROR','AUDIO_COMPARISON','LISTEN_CLASSIFY'];const locate=['LISTEN_LOCATE_ERROR','ERROR_CORRECTION_LAB'].includes(question.questionType);const items=question.arrangeItems||[];const ids=order.length===items.length?order:items.map(i=>i.arrangeItemId);return <div className="mt-5 border-t border-blue-100 pt-5"><div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#075fdb]"><Eye size={17}/> Học viên sẽ tương tác như sau</div>{locate ? <><TimelinePreview key={question.questionId} question={question}/><QuestionMedia media={question.media?.filter(m=>m.mediaType!=='AUDIO') ?? []} /></> : <QuestionMedia media={question.media ?? []} />}{(choiceTypes.includes(question.questionType)||(locate&&question.choices.length>0))&&<div className="mt-5 grid gap-2">{[...question.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map((c,i)=>{const active=chosen.includes(c.choiceId);return <button key={c.choiceId} type="button" onClick={()=>setChosen(v=>multi?(v.includes(c.choiceId)?v.filter(x=>x!==c.choiceId):[...v,c.choiceId]):[c.choiceId])} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition ${active?'border-blue-500 bg-[#eff6ff]':'border-slate-200 bg-white hover:border-blue-300'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${active?'bg-[#0867ef] text-white':'bg-slate-100 text-slate-500'}`}>{active?<Check size={16}/>:String.fromCharCode(65+i)}</span>{c.choiceText}</button>;})}</div>}{['FILL_BLANK','SCRIPT_WRITING','ESSAY'].includes(question.questionType)&&<div className="mt-5">{question.writingConfig&&<p className="mb-2 text-xs text-[#075fdb]">{[question.writingConfig.eventType,question.writingConfig.audience,question.writingConfig.style].filter(Boolean).join(' • ')}</p>}{question.questionType==='FILL_BLANK'?<input value={text} onChange={e=>setText(e.target.value)} placeholder="Nhập câu trả lời..." className="w-full rounded-xl border border-[#cde1ff] p-4 outline-none focus:border-blue-500"/>:<textarea value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder="Viết câu trả lời của bạn..." className="w-full rounded-xl border border-[#cde1ff] p-4 outline-none focus:border-blue-500"/>}<p className="mt-2 text-right text-xs text-slate-500">{text.trim()?text.trim().split(/\s+/).length:0} từ</p></div>}{question.questionType==='ARRANGE_SCRIPT'&&<div className="mt-5 grid gap-2">{ids.map((id,i)=>{const item=items.find(x=>x.arrangeItemId===id);return <div key={id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-3"><GripVertical size={17} className="text-blue-300"/><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-[#075fdb]">{i+1}</span><p className="flex-1 text-sm">{item?.content}</p><button type="button" disabled={i===0} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];setOrder(next);}} className="rounded-lg border px-2 py-1 disabled:opacity-30">↑</button><button type="button" disabled={i===ids.length-1} onClick={()=>{const next=[...ids];[next[i+1],next[i]]=[next[i],next[i+1]];setOrder(next);}} className="rounded-lg border px-2 py-1 disabled:opacity-30">↓</button></div>;})}</div>}{question.questionType==='SCRIPT_ANNOTATION'&&<AnnotationPreview question={question}/>}{question.questionType==='SCENARIO_DECISION_TREE'&&<ScenarioPreview question={question}/>}<div className="mt-5 flex items-center justify-between rounded-xl bg-[#eff6ff] px-4 py-3 text-xs text-[#075fdb]"><span>Đây là bản xem trước, không lưu hoặc nộp bài.</span><button type="button" onClick={()=>{setChosen([]);setText('');setOrder([]);}} className="font-bold underline">Xóa lựa chọn</button></div></div>; };

const QuestionCard: React.FC<{question:QuestionDto;index:number}> = ({question,index}) => {const [preview,setPreview]=useState(false);const [showAnswers,setShowAnswers]=useState(false);return <article className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_8px_30px_rgba(76,29,149,.04)]"><div className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-[#075fdb]">{index+1}</span><div className="min-w-0"><span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#075fdb]">{names[question.questionType]||question.questionType}</span><h3 className="mt-3 text-lg font-extrabold leading-7 text-slate-900">{question.questionText}</h3><p className="mt-1 text-xs text-slate-500">{question.points??1} điểm {question.isRequired?' • Bắt buộc':''}</p></div></div><button type="button" onClick={()=>setPreview(v=>!v)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${preview?'bg-[#0867ef] text-white':'border border-[#cde1ff] bg-[#eff6ff] text-[#075fdb] hover:bg-blue-100'}`}>{preview?<EyeOff size={16}/>:<Eye size={16}/>}{preview?'Thoát xem trước':'Xem như học viên'}</button></div>{question.instruction&&<div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><b>Hướng dẫn:</b> {question.instruction}</div>}{!question.instruction&&hints[question.questionType]&&<div className="mt-5 rounded-xl bg-[#eff6ff] p-4 text-sm text-[#075fdb]">{hints[question.questionType]}</div>}{preview?<QuestionPreview key={question.questionId} question={question}/>:<><QuestionMedia media={question.media ?? []} />{question.questionType==='LISTEN_LOCATE_ERROR'&&<div className="mt-4 rounded-xl border border-dashed border-[#cde1ff] bg-[#eff6ff]/40 p-4 text-sm text-[#075fdb]">Bài tập xác định vùng lỗi: nhấn “Xem như học viên” để thử kéo chọn trên timeline.</div>}{(question.errorRegions?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {(question.errorRegions?.length ?? 0)} vùng lỗi để chấm điểm.</p>}{(question.arrangeItems?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {question.arrangeItems?.length ?? 0} đoạn lời dẫn.</p>}{(question.scenarioNodes?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {(question.scenarioNodes?.length ?? 0)} nút tình huống.</p>}<button type="button" onClick={()=>setShowAnswers(v=>!v)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#075fdb]">{showAnswers?<ChevronUp size={17}/>:<ChevronDown size={17}/>}{showAnswers?'Ẩn đáp án / cấu hình':'Xem đáp án / cấu hình'}</button>{showAnswers&&<div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">{question.choices.length>0&&[...question.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map((c,i)=><div key={c.choiceId} className={`rounded-xl border px-4 py-3 text-sm ${c.isCorrect?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-slate-200 bg-white text-slate-700'}`}>{String.fromCharCode(65+i)}. {c.choiceText} {c.isCorrect&&<b className="ml-2 text-xs">✓ Đúng</b>}</div>)}{question.errorRegions?.map((r,i)=><p key={r.errorRegionId||i} className="rounded-lg bg-white p-3 text-xs">Vùng lỗi {i+1}: {formatMs(r.startTimeMs)} – {formatMs(r.endTimeMs)} • {r.errorCategory} / {r.errorCode}</p>)}{question.explanation&&<p className="rounded-xl bg-[#eff6ff] p-4 text-sm text-blue-900"><b>Giải thích:</b> {question.explanation}</p>}{!question.choices.length&&!question.errorRegions?.length&&!question.explanation&&<p className="text-xs text-slate-500">Dạng câu hỏi này không có đáp án trắc nghiệm để hiển thị.</p>}</div>}</>}</div></article>;};


type QuestionMediaItem = NonNullable<QuestionDto['media']>[number];

const getYouTubeEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (['youtu.be', 'www.youtu.be'].includes(host)) id = segments[0] ?? null;
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      if (segments[0] === 'watch') id = url.searchParams.get('v');
      else if (['embed', 'shorts', 'live'].includes(segments[0])) id = segments[1] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
};

const QuestionMedia: React.FC<{ media: QuestionMediaItem[] }> = ({ media }) => {
  const validMedia = media.filter(item => item.mediaUrl?.trim()).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  if (!validMedia.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {validMedia.map((item, index) => {
        const type = String(item.mediaType).toUpperCase();
        const url = item.mediaUrl.trim();
        const youtube = type === 'VIDEO' ? getYouTubeEmbedUrl(url) : null;
        return (
          <div key={item.mediaId ?? `${type}-${index}`} className="rounded-xl border border-blue-100 bg-[#eff6ff]/40 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-blue-800">{item.label || (type === 'AUDIO' ? 'Âm thanh câu hỏi' : type === 'VIDEO' ? 'Video câu hỏi' : 'Hình ảnh câu hỏi')}</span>
              {item.durationSeconds != null && item.durationSeconds > 0 && <span className="text-xs text-slate-500">{item.durationSeconds} giây</span>}
            </div>
            {type === 'AUDIO' ? (
              <audio controls preload="metadata" src={url} className="w-full" />
            ) : type === 'VIDEO' && youtube ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe src={youtube} title={item.label || `Video câu hỏi ${index + 1}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>
            ) : type === 'VIDEO' ? (
              <video controls preload="metadata" src={url} className="max-h-[420px] w-full rounded-lg bg-black" />
            ) : type === 'IMAGE' ? (
              <img src={url} alt={item.label || 'Hình ảnh câu hỏi'} className="max-h-[420px] w-full rounded-lg object-contain" loading="lazy" />
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#075fdb] underline">Mở media</a>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { QuizDetailPage };