import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardList, Clock3, CalendarDays, CloudUpload, Edit2, Eye, FileQuestion,
  FileUp, Filter, GitCompareArrows, Headphones, Loader2, Mic2, PlusCircle,
  RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Target, X
} from 'lucide-react';
import QuizImportStudio from '../components/QuizImportStudio';
import QuizSyncStudio from '../components/QuizSyncStudio';
import { quizImportApi } from '../api/quizImportApi';
import { useQuiz, useQuizzesByCourse } from '../hooks/useQuiz';

type QuizListItem = NonNullable<ReturnType<typeof useQuizzesByCourse>['data']>[number];
type QuizDates = { createdAt?: string | null; updatedAt?: string | null; createdDate?: string | null; modifiedAt?: string | null };
const formatQuizDate = (value?: string | null) => { if (!value) return 'Chưa có dữ liệu'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const statusLabel = (status: string) => status === 'ACTIVE' ? 'Hoạt động' : status === 'ARCHIVED' ? 'Đã lưu trữ' : status === 'DRAFT' ? 'Bản nháp' : status || 'Chưa xác định';
const statusClass = (status: string) => status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : status === 'ARCHIVED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700';
const questionNames: Record<string, string> = {
  SINGLE_CHOICE: 'Trắc nghiệm một đáp án', MULTIPLE_CHOICE: 'Trắc nghiệm nhiều đáp án', TRUE_FALSE: 'Đúng / Sai',
  FILL_BLANK: 'Điền từ', LISTEN_IDENTIFY_ERROR: 'Nghe tìm lỗi', LISTEN_LOCATE_ERROR: 'Xác định vùng lỗi',
  AUDIO_COMPARISON: 'So sánh giọng đọc', LISTEN_CLASSIFY: 'Nghe phân loại', SCRIPT_ANNOTATION: 'Đánh dấu lời dẫn',
  SCRIPT_WRITING: 'Viết lời dẫn MC', ARRANGE_SCRIPT: 'Sắp xếp lời dẫn', ERROR_CORRECTION_LAB: 'Phân tích và sửa lỗi',
  SCENARIO_DECISION_TREE: 'Tình huống MC', ESSAY: 'Tự luận'
};
const questionIcon = (type: string) => type.startsWith('LISTEN') || type === 'AUDIO_COMPARISON' ? Headphones : type.includes('SCRIPT') ? BookOpen : FileQuestion;

const QuizDetailPanel: React.FC<{
  quizId: number; courseId: number; onClose: () => void; onEdit: (id: number) => void; onGrade: (id: number) => void;
}> = ({ quizId, courseId, onClose, onEdit, onGrade }) => {
  const navigate = useNavigate();
  const { data: quiz, isLoading, isError, error } = useQuiz(quizId);
  const [tab, setTab] = useState<'questions' | 'settings'>('questions');
  useEffect(() => setTab('questions'), [quizId]);
  const dates = quiz as (typeof quiz & QuizDates);
  const questions = useMemo(() => [...(quiz?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex), [quiz]);
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points ?? 0), 0);
  const goDetail = () => navigate(`/instructor/quizzes/${quizId}`, { state: { returnTo: `/instructor/courses/${courseId}/quizzes` } });
  return <section className="min-w-0 overflow-hidden rounded-[22px] border border-[#dce7f6] bg-white shadow-[0_10px_30px_rgba(20,62,120,.05)]">
    <div className="flex items-center justify-between border-b border-[#e9eff8] px-5 py-4">
      <h2 className="border-l-[3px] border-[#0865f7] pl-3 text-base font-black text-[#0d2c62]">Chi tiết Quiz</h2>
      <button type="button" onClick={onClose} title="Đóng chi tiết" className="rounded-lg p-2 text-[#7e96ba] transition hover:bg-[#edf5ff]"><X size={18}/></button>
    </div>
    {isLoading ? <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-[#6681a7]"><Loader2 size={20} className="animate-spin"/> Đang tải chi tiết Quiz...</div> : isError || !quiz ? <div className="p-7 text-sm text-rose-600">{error instanceof Error ? error.message : 'Không tải được chi tiết Quiz.'}</div> : <>
      <div className="px-5 pt-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e7f1ff] text-[#0968f2]"><FileQuestion size={27}/></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-lg font-black text-[#0d2c62]">{quiz.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(String(quiz.status))}`}>{statusLabel(String(quiz.status))}</span></div><p className="mt-1 text-xs text-[#7390b7]">Quiz #{quiz.quizId}</p></div>
          <button type="button" onClick={() => onEdit(quiz.quizId)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0965f4] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#004bc2]"><Edit2 size={14}/> Chỉnh sửa</button>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#5b76a0]">{quiz.description?.trim() || 'Quiz chưa có mô tả.'}</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <DetailMetric icon={BookOpen} label="Khóa học" value={`Khóa học #${quiz.courseId ?? courseId}`}/>
          <DetailMetric icon={CalendarDays} label="Ngày tạo" value={formatQuizDate(dates.createdAt ?? dates.createdDate)}/>
          <DetailMetric icon={Clock3} label="Cập nhật lần cuối" value={formatQuizDate(dates.updatedAt ?? dates.modifiedAt)}/>
          <DetailMetric icon={Settings2} label="Cấu hình" value={`${questions.length} câu · Đạt ${quiz.passingScore}% · ${quiz.maxAttempts > 0 ? `${quiz.maxAttempts} lượt` : 'Không giới hạn lượt'}`}/>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f1f6ff] px-3 py-3 text-center"><div><p className="text-lg font-black text-[#0c56c6]">{questions.length}</p><p className="text-[10px] text-[#708ab0]">Câu hỏi</p></div><div className="border-x border-[#dbe7f7]"><p className="text-lg font-black text-[#0c56c6]">{totalPoints.toLocaleString('vi-VN')}</p><p className="text-[10px] text-[#708ab0]">Tổng điểm</p></div><div><p className="text-lg font-black text-[#0c56c6]">{quiz.lessonId ?? '—'}</p><p className="text-[10px] text-[#708ab0]">Lesson ID</p></div></div>
      </div>
      <div className="mt-5 flex border-y border-[#e7eef8] bg-[#f8fbff] px-5">
        <button type="button" onClick={() => setTab('questions')} className={`flex-1 border-b-[3px] px-2 py-3 text-xs font-bold transition ${tab === 'questions' ? 'border-[#0967f5] text-[#0758d2]' : 'border-transparent text-[#718ab0] hover:text-[#0758d2]'}`}>Danh sách câu hỏi ({questions.length})</button>
        <button type="button" onClick={() => setTab('settings')} className={`flex-1 border-b-[3px] px-2 py-3 text-xs font-bold transition ${tab === 'settings' ? 'border-[#0967f5] text-[#0758d2]' : 'border-transparent text-[#718ab0] hover:text-[#0758d2]'}`}>Cài đặt</button>
      </div>
      {tab === 'questions' ? <div className="max-h-[400px] overflow-y-auto px-4 py-3">{questions.length === 0 ? <p className="rounded-xl bg-[#f6f9fe] p-5 text-center text-sm text-[#7a91b1]">Quiz chưa có câu hỏi.</p> : <div className="space-y-2">{questions.map((q, i) => { const Icon = questionIcon(String(q.questionType)); return <button type="button" key={q.questionId} onClick={goDetail} className="group flex w-full items-center gap-3 rounded-xl border border-[#e5edf8] bg-white px-3 py-3 text-left transition hover:border-[#9bc5ff] hover:bg-[#f4f9ff]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f5fd] text-xs font-black text-[#16417e]">{i + 1}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#0c69ee]"><Icon size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#133367]">{q.questionText || `Câu hỏi ${i + 1}`}</span><span className="mt-1 block truncate text-[10px] text-[#7891b3]">{questionNames[String(q.questionType)] || q.questionType}</span></span><span className="shrink-0 text-xs font-bold text-[#0c5cce]">{Number(q.points ?? 0).toLocaleString('vi-VN')}đ</span><ChevronRight size={15} className="text-[#92a7c3] group-hover:text-[#0965f4]"/></button>; })}</div>}</div> : <div className="space-y-2 px-5 py-4 text-xs text-[#58739c]"><p className="rounded-xl bg-[#f6f9fe] p-3">Trạng thái: <b className="text-[#123c7c]">{statusLabel(String(quiz.status))}</b></p><p className="rounded-xl bg-[#f6f9fe] p-3">Thời gian làm: <b className="text-[#123c7c]">{quiz.timeLimitMinutes > 0 ? `${quiz.timeLimitMinutes} phút` : 'Không giới hạn'}</b></p><p className="rounded-xl bg-[#f6f9fe] p-3">Điểm đạt: <b className="text-[#123c7c]">{quiz.passingScore}%</b></p><p className="rounded-xl bg-[#f6f9fe] p-3">Lượt làm tối đa: <b className="text-[#123c7c]">{quiz.maxAttempts > 0 ? quiz.maxAttempts : 'Không giới hạn'}</b></p></div>}
      <div className="flex flex-wrap gap-2 border-t border-[#e7eef8] px-5 py-4"><button type="button" onClick={goDetail} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0965f4] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#004bc2]"><Eye size={15}/> Xem chi tiết đầy đủ <ArrowRight size={15}/></button><button type="button" onClick={() => onGrade(quiz.quizId)} className="inline-flex items-center gap-2 rounded-xl border border-[#cfe2fb] bg-[#f0f7ff] px-4 py-3 text-xs font-bold text-[#0b5ed5]"><ClipboardList size={15}/> Chấm bài</button></div>
    </>}
  </section>;
};

const DetailMetric: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e3edf9] bg-[#fbfdff] p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf4ff] text-[#1168eb]"><Icon size={18}/></span><span className="min-w-0"><span className="block text-[10px] text-[#7890b2]">{label}</span><span className="block truncate text-xs font-extrabold text-[#17376d]" title={value}>{value}</span></span></div>;

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const courseId = courseIdParam ? Number(courseIdParam) : null;
  const { data: quizzes = [], isLoading, isError, error, refetch, isFetching } = useQuizzesByCourse(courseId);
  const [importOpen, setImportOpen] = useState(false);
  const [syncQuiz, setSyncQuiz] = useState<{ id: number; title: string } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<number | null>(null);
  const [exportNotice, setExportNotice] = useState('');
  const pageSize = 5;
  const filtered = useMemo(() => quizzes.filter(q => `${q.title} ${q.description ?? ''}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')) && (status === 'ALL' || String(q.status) === status)), [quizzes, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, status]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  useEffect(() => { if (selectedId !== null && !quizzes.some(q => q.quizId === selectedId)) setSelectedId(null); }, [quizzes, selectedId]);
  useEffect(() => { if (selectedId === null && quizzes.length > 0) { setSelectedId(quizzes[0].quizId); setDetailOpen(true); } }, [quizzes, selectedId]);
  const selected = quizzes.find(q => q.quizId === selectedId);
  const activeCount = quizzes.filter(q => String(q.status) === 'ACTIVE').length;
  const draftCount = quizzes.filter(q => String(q.status) === 'DRAFT').length;
  const archivedCount = quizzes.filter(q => String(q.status) === 'ARCHIVED').length;
  const editQuiz = (id: number) => navigate(`/instructor/quizzes/${id}/edit`, { state: { returnTo: `/instructor/courses/${courseId}/quizzes` } });
  const gradeQuiz = (id: number) => navigate(`/instructor/quizzes/${id}/grading`);
  const exportQuiz = async (id: number) => {
    setExporting(id); setExportNotice('');
    try { const result = await quizImportApi.exportGoogle(id); setExportNotice(result.success ? `Đã export Quiz #${id} lên Google Sheets.` : result.message || 'Export chưa thành công.'); }
    catch (e) { setExportNotice(e instanceof Error ? e.message : 'Export thất bại.'); }
    finally { setExporting(null); }
  };
  const chooseQuiz = (id: number) => { setSelectedId(id); setDetailOpen(true); };
  if (!courseId || !Number.isInteger(courseId) || courseId <= 0) return <div className="p-8 text-center text-rose-600">Course ID không hợp lệ.</div>;
  return <div className="min-h-screen bg-[#f3f7fd] pb-12 text-[#102d63]">
    <style>{`@keyframes mseWave{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}.mse-wave{transform-origin:center;animation:mseWave 1.5s ease-in-out infinite}`}</style>
    <header className="relative isolate overflow-hidden bg-gradient-to-[110deg] from-[#071c47] via-[#0753c3] to-[#063684] px-5 pb-16 pt-6 text-white sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_10%,rgba(49,163,255,.6),transparent_52%)]"/>
      <div className="pointer-events-none absolute -bottom-32 right-[6%] h-60 w-[65%] -rotate-12 rounded-[100%] border-[40px] border-[#47adff]/20"/>
      <div className="pointer-events-none absolute right-10 top-6 hidden items-center gap-[3px] opacity-70 md:flex">{Array.from({ length: 35 }, (_, i) => <span key={i} className="mse-wave w-[3px] rounded-full bg-[#81d9ff]" style={{ height: `${10 + Math.abs(Math.sin(i * 1.9)) * 58}px`, animationDelay: `${i * .055}s` }}/>)}</div>
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <button type="button" onClick={() => navigate(`/instructor/courses/${courseId}/lessons`)} className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold transition hover:bg-white/25"><ArrowLeft size={15}/> Quay lại khóa học</button>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-extrabold tracking-[.18em] text-[#c3dcff]">MSEEK ACADEMY / INSTRUCTOR</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Quản lý Quiz</h1><p className="mt-2 max-w-xl text-sm text-[#d8e8ff]">Tạo, chỉnh sửa và theo dõi các bài kiểm tra trong khóa học.</p><div className="mt-4 flex gap-1.5"><span className="h-1.5 w-12 rounded-full bg-[#ffca39]"/><span className="h-1.5 w-10 rounded-full bg-[#32b2ff]"/><span className="h-1.5 w-9 rounded-full bg-[#00bc90]"/></div></div><div className="flex items-center gap-4"><div className="hidden rounded-2xl border border-white/20 bg-white/10 p-4 text-white/80 backdrop-blur-sm lg:block"><Mic2 size={37}/></div><button type="button" onClick={() => navigate(`/instructor/quizzes/new?courseId=${courseId}`)} className="inline-flex items-center gap-2 rounded-xl bg-[#ffcb49] px-5 py-3 text-sm font-black text-[#0b2e66] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffdb78]"><PlusCircle size={18}/> Tạo Quiz mới</button></div></div>
      </div>
    </header>
    <main className="relative z-10 mx-auto -mt-10 max-w-[1500px] space-y-4 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Tổng số Quiz" value={isLoading ? '…' : quizzes.length} color="blue" note="Trong khóa học hiện tại"/>
        <StatCard icon={CheckCircle2} label="Đang hoạt động" value={isLoading ? '…' : activeCount} color="green" note="Quiz có trạng thái ACTIVE"/>
        <StatCard icon={FileQuestion} label="Bản nháp" value={isLoading ? '…' : draftCount} color="amber" note="Quiz có trạng thái DRAFT"/>
        <StatCard icon={ShieldCheck} label="Đã lưu trữ" value={isLoading ? '…' : archivedCount} color="purple" note="Quiz có trạng thái ARCHIVED"/>
      </div>
      <div className={`grid items-start gap-4 ${detailOpen && selectedId !== null ? 'xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <section className="min-w-0 rounded-[22px] border border-[#dce7f6] bg-white p-4 shadow-[0_10px_30px_rgba(20,62,120,.05)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex items-center gap-2 rounded-xl bg-[#0966f4] px-4 py-3 text-xs font-extrabold text-white"><ClipboardList size={17}/> Danh sách Quiz</div><div className="flex flex-wrap gap-2"><motion.button type="button" whileHover={reducedMotion ? {} : { y: -2 }} onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1f8] bg-[#f4f9ff] px-3 py-2.5 text-xs font-bold text-[#0b5dcb]"><FileUp size={16}/> Import Excel / Sheets</motion.button><button type="button" onClick={() => void refetch()} disabled={isFetching} title="Làm mới danh sách" className="rounded-xl border border-[#dce7f6] p-2.5 text-[#0a64e5] disabled:opacity-40"><RefreshCw size={17} className={isFetching ? 'animate-spin' : ''}/></button></div></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8199bb]"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên Quiz, mô tả..." className="w-full rounded-xl border border-[#dce7f6] bg-[#f8fbff] py-3 pl-10 pr-3 text-xs outline-none transition focus:border-[#2e87f7]"/></label><label className="relative flex items-center gap-2 rounded-xl border border-[#dce7f6] bg-[#f8fbff] px-3 text-[#6c87af]"><Filter size={16}/><select value={status} onChange={e => setStatus(e.target.value)} className="min-h-[43px] min-w-[150px] flex-1 bg-transparent text-xs font-semibold outline-none"><option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="DRAFT">Bản nháp</option><option value="ARCHIVED">Đã lưu trữ</option></select></label></div>
          {exportNotice && <div role="status" className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">{exportNotice}</div>}
          {isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#6e89af]"><Loader2 size={20} className="animate-spin"/> Đang tải danh sách Quiz...</div> : isError ? <div className="mt-4 rounded-xl bg-rose-50 p-5 text-sm text-rose-700">{error instanceof Error ? error.message : 'Không thể tải danh sách Quiz.'}</div> : quizzes.length === 0 ? <div className="py-16 text-center"><FileQuestion size={35} className="mx-auto text-[#9db6d9]"/><p className="mt-3 text-sm font-bold">Khóa học chưa có Quiz.</p><button type="button" onClick={() => navigate(`/instructor/quizzes/new?courseId=${courseId}`)} className="mt-3 text-xs font-bold text-[#0966f4]">+ Tạo Quiz đầu tiên</button></div> : filtered.length === 0 ? <div className="py-12 text-center text-sm text-[#7891b4]">Không tìm thấy Quiz phù hợp với bộ lọc.</div> : <div className="mt-4 space-y-2">{visible.map((q, i) => <QuizRow key={q.quizId} quiz={q} number={(page - 1) * pageSize + i + 1} selected={selectedId === q.quizId && detailOpen} onSelect={() => chooseQuiz(q.quizId)} onEdit={() => editQuiz(q.quizId)} onGrade={() => gradeQuiz(q.quizId)} onSync={() => setSyncQuiz({ id: q.quizId, title: q.title })} onExport={() => void exportQuiz(q.quizId)} exporting={exporting === q.quizId}/>)}</div>}
          {!isLoading && !isError && filtered.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eff8] pt-4"><span className="text-[11px] text-[#7790b3]">Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} trong {filtered.length} Quiz</span><div className="flex items-center gap-1.5"><button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[#e0e9f6] p-2 text-[#0d5dd2] disabled:opacity-35"><ChevronLeft size={16}/></button><span className="rounded-lg bg-[#0868f6] px-3 py-2 text-xs font-bold text-white">{page} / {pages}</span><button type="button" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="rounded-lg border border-[#e0e9f6] p-2 text-[#0d5dd2] disabled:opacity-35"><ChevronRight size={16}/></button></div></div>}
          <p className="mt-4 flex items-center gap-2 text-[11px] text-[#7890b2]"><Sparkles size={14} className="text-[#e0a81b]"/> Chọn một Quiz để xem nhanh chi tiết. Đồng bộ tự động do Backend xử lý.</p>
        </section>
        {detailOpen && selectedId !== null && selected && <QuizDetailPanel quizId={selected.quizId} courseId={courseId} onClose={() => setDetailOpen(false)} onEdit={editQuiz} onGrade={gradeQuiz}/>}
      </div>
    </main>
    <AnimatePresence>{importOpen && <QuizImportStudio courseId={courseId} onClose={() => setImportOpen(false)}/>}</AnimatePresence>
    <AnimatePresence>{syncQuiz && <QuizSyncStudio key={syncQuiz.id} quizId={syncQuiz.id} title={syncQuiz.title} onClose={() => setSyncQuiz(null)}/>}</AnimatePresence>
  </div>;
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number | string; note: string; color: 'blue' | 'green' | 'amber' | 'purple' }> = ({ icon: Icon, label, value, note, color }) => {
  const theme = { blue: 'bg-[#e6f1ff] text-[#0967ed]', green: 'bg-[#e1f9ef] text-[#00a875]', amber: 'bg-[#fff2d3] text-[#e79a00]', purple: 'bg-[#efe8ff] text-[#7751e8]' }[color];
  return <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#dce7f6] bg-white px-4 py-5 shadow-[0_6px_22px_rgba(20,62,120,.04)]"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme}`}><Icon size={24}/></div><div className="min-w-0"><p className="truncate text-[11px] font-extrabold text-[#1b3b70]">{label}</p><p className="mt-1 text-2xl font-black text-[#102d63]">{value}</p><p className="mt-1 truncate text-[10px] text-[#7892b7]" title={note}>{note}</p></div></div>;
};

const QuizRow: React.FC<{
  quiz: QuizListItem; number: number; selected: boolean; onSelect: () => void; onEdit: () => void; onGrade: () => void;
  onSync: () => void; onExport: () => void; exporting: boolean;
}> = ({ quiz, number, selected, onSelect, onEdit, onGrade, onSync, onExport, exporting }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className={`relative flex min-w-0 items-center gap-2 rounded-[15px] border px-3 py-3 transition ${selected ? 'border-[#1677ff] bg-[#edf5ff] shadow-[0_3px_14px_rgba(10,100,235,.09)]' : 'border-[#e5edf7] bg-white hover:border-[#a8cfff] hover:bg-[#f7fbff]'}`}>
    <button type="button" onClick={onSelect} title="Xem chi tiết Quiz" className="flex min-w-0 flex-1 items-center gap-2.5 text-left"><span className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf3fb] text-xs font-black text-[#1a427e]">{number}</span><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f0ff] text-[#0a69f2]"><FileQuestion size={20}/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#123267]">{quiz.title}</span><span className="mt-1 block truncate text-[10px] text-[#7892b6]">Quiz #{quiz.quizId} · {formatQuizDate((quiz as QuizListItem & QuizDates).createdAt ?? (quiz as QuizListItem & QuizDates).createdDate)}</span></span></button>
    <span className={`hidden shrink-0 rounded-full px-2 py-1.5 text-[10px] font-bold sm:inline-flex ${statusClass(String(quiz.status))}`}>{statusLabel(String(quiz.status))}</span>
    <div className="relative shrink-0"><button type="button" onClick={() => setMenuOpen(v => !v)} title="Thao tác Quiz" aria-expanded={menuOpen} className="rounded-lg border border-[#e2eaf7] bg-white p-2 text-[#5875a2] transition hover:text-[#075fe4]"><Settings2 size={17}/></button>{menuOpen && <><button type="button" aria-label="Đóng menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)}/><div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-[#dce7f6] bg-white p-1.5 shadow-xl">{[{ text: 'Chỉnh sửa Quiz', icon: Edit2, action: onEdit }, { text: 'Chấm bài', icon: ClipboardList, action: onGrade }, { text: 'Đồng bộ Quiz', icon: GitCompareArrows, action: onSync }, { text: exporting ? 'Đang export...' : 'Export Google Sheets', icon: CloudUpload, action: onExport }].map(item => <button type="button" key={item.text} onClick={() => { setMenuOpen(false); item.action(); }} disabled={exporting && item.text.includes('Export')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#254779] transition hover:bg-[#edf5ff] disabled:opacity-40"><item.icon size={15}/>{item.text}</button>)}</div></>}</div>
  </div>;
};

export default QuizManagementPage;
