import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, ClipboardList, Eye, FileText, ListChecks, MessageSquareText, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMyQuizAttempts, useQuizResult } from '../hooks/useQuiz';

interface QuizNavigationState { returnTo?: string; }
type ResultTab = 'questions' | 'statistics' | 'feedback';
const statusIs = (status: unknown, name: string, code: number) => status === name || status === code;
const formatDate = (value?: string | null) => { if (!value) return 'Chưa có dữ liệu'; const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Chưa có dữ liệu' : d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }); };
const formatDuration = (start?: string | null, end?: string | null) => { if (!start || !end) return 'Đang chờ'; const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)); return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)} phút ${seconds % 60} giây` : 'Chưa có dữ liệu'; };
const statusText = (status: unknown) => statusIs(status, 'PASSED', 3) ? 'Đạt yêu cầu' : statusIs(status, 'FAILED', 4) ? 'Chưa đạt' : statusIs(status, 'PENDING_GRADING', 2) ? 'Chờ chấm' : statusIs(status, 'IN_PROGRESS', 1) ? 'Đang làm' : 'Đã nộp';
const skillLabel = (type: string) => ({
  SINGLE_CHOICE: 'Kiến thức lý thuyết',
  MULTIPLE_CHOICE: 'Hiểu và vận dụng kiến thức',
  TRUE_FALSE: 'Nhận biết kiến thức đúng / sai',
  FILL_BLANK: 'Ghi nhớ thuật ngữ và kiến thức',
  LISTEN_IDENTIFY_ERROR: 'Nhận diện lỗi trong giọng đọc',
  LISTEN_LOCATE_ERROR: 'Xác định vị trí lỗi theo timeline',
  AUDIO_COMPARISON: 'So sánh cách thể hiện / delivery',
  LISTEN_CLASSIFY: 'Phân loại đặc điểm giọng nói',
  SCRIPT_ANNOTATION: 'Pause, breath và emphasis',
  SCRIPT_WRITING: 'Sáng tạo nội dung lời dẫn MC',
  ARRANGE_SCRIPT: 'Logic và mạch dẫn chương trình',
  ERROR_CORRECTION_LAB: 'Phân tích và sửa lỗi',
  SCENARIO_DECISION_TREE: 'Ra quyết định trong tình huống MC',
  ESSAY: 'Tư duy và trình bày nội dung',
} as Record<string, string>)[type] || 'Kiến thức và kỹ năng tổng hợp';

export const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const learningQueryClient = useQueryClient();
  const location = useLocation();
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const qid = quizId && Number(quizId) > 0 ? Number(quizId) : null;
  const aid = attemptId && Number(attemptId) > 0 ? Number(attemptId) : null;
  const { data: result, isLoading, isError, error } = useQuizResult(qid, aid);
  const { data: attempts = [] } = useMyQuizAttempts(qid);
  const returnTo = (location.state as QuizNavigationState | null)?.returnTo;
  const [tab, setTab] = useState<ResultTab>('questions');
  const [expanded, setExpanded] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const back = () => {
    void learningQueryClient.invalidateQueries({ queryKey: ['course-lessons'] });
    void learningQueryClient.invalidateQueries({ queryKey: ['course-progress'] });
    void learningQueryClient.invalidateQueries({ queryKey: ['quizzes', 'course'] });
    navigate(returnTo || '/my-courses', {
      state: {
        autoAdvanceAfterQuiz: statusIs(result?.resultStatus, 'PASSED', 3),
      },
    });
  };
  const toggle = (index: number) => setExpanded(previous => previous.includes(index) ? previous.filter(x => x !== index) : [...previous, index]);

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-[#f4f8ff]"><div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /></div>;
  if (isError || !result) return <div className="mx-auto max-w-xl p-10 text-center text-rose-600">{error instanceof Error ? error.message : 'Không thể tải kết quả Quiz.'}</div>;

  const answers = result.answers ?? [];
  const graded = answers.filter(a => a.score !== null && a.score !== undefined);
  const correct = graded.filter(a => a.isCorrect === true).length;
  const wrong = graded.filter(a => a.isCorrect === false).length;
  const pending = answers.length - graded.length;
  const passed = statusIs(result.resultStatus, 'PASSED', 3);
  const failed = statusIs(result.resultStatus, 'FAILED', 4);
  const awaiting = result.requiresManualGrading || statusIs(result.resultStatus, 'PENDING_GRADING', 2);
  const hasPassed = attempts.some(a => statusIs(a.resultStatus, 'PASSED', 3));
  const hasPending = attempts.some(a => statusIs(a.resultStatus, 'PENDING_GRADING', 2));
  const score = result.score;
  const scoreNumber = score == null ? null : Number(score);
  const scoreDisplay = scoreNumber == null || !Number.isFinite(scoreNumber) ? '—' : scoreNumber.toFixed(1);
  const scoreProgress = scoreNumber == null ? 0 : Math.max(0, Math.min(100, scoreNumber));
  const retryAt = result.retryAvailableAt ? new Date(result.retryAvailableAt) : null;
  const retryBlocked = !!retryAt && retryAt.getTime() > Date.now();
  const reviewLesson = (lessonId: number) => {
    const base = returnTo?.split('?')[0];
    if (base) {
      void learningQueryClient.invalidateQueries({ queryKey: ['course-lessons'] });
      void learningQueryClient.invalidateQueries({ queryKey: ['course-progress'] });
      navigate(`${base}?lessonId=${lessonId}`);
    }
  };
  const feedbackAnswers = answers.filter(a => !!a.teacherFeedback?.trim());
  const attemptNumber = attempts.find(a => a.attemptId === aid)?.attemptNumber ?? result.attemptNumber;
  const scrollToDetails = () => { setTab('questions'); document.getElementById('quiz-result-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return <div className="min-h-screen bg-[#f4f8ff] pb-12 text-[#102654]">
    <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">
      <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-r from-[#071e52] via-[#0750cf] to-[#071d4f] px-6 py-7 text-white shadow-[0_18px_45px_rgba(9,49,119,.16)] sm:px-9 lg:py-9">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 55% 75%,#27a9ff 0,transparent 28%),linear-gradient(145deg,transparent 33%,#116bfc55 34%,transparent 57%)' }} />
        <div className="pointer-events-none absolute right-[20%] top-[-60px] hidden h-72 w-72 rounded-full border-[35px] border-blue-400/15 lg:block" />
        <div className="relative z-10 max-w-[72%] sm:max-w-[65%]">
          <button type="button" onClick={back} className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold transition hover:bg-white/25"><ArrowLeft size={15} /> Quay lại khóa học</button>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-100"><CheckCircle2 size={13} /> Kết quả bài làm</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-[34px]">{awaiting ? 'Đã nộp bài thành công!' : 'Hoàn thành bài kiểm tra!'}</h1>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-blue-100 sm:text-sm">{awaiting ? 'Một số câu cần giảng viên đánh giá. Điểm cuối cùng sẽ được cập nhật sau khi chấm.' : passed ? 'Bạn đã đạt yêu cầu của bài kiểm tra. Hãy xem lại kết quả để tiếp tục phát triển kỹ năng.' : 'Hãy xem lại câu trả lời và nhận xét để cải thiện trong lần tiếp theo.'}</p>
        </div>
        <div className="pointer-events-none absolute bottom-[-36px] right-[17%] hidden text-[155px] leading-none drop-shadow-[0_10px_24px_rgba(255,190,0,.35)] md:block">🏆</div>
        <div className={`absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-white/15 p-4 backdrop-blur-sm xl:flex ${awaiting ? 'text-amber-200' : passed ? 'text-emerald-200' : 'text-white'}`}>
          {awaiting ? <Clock3 size={36} /> : passed ? <CheckCircle2 size={36} /> : <FileText size={36} />}
          <div><p className="text-sm font-extrabold">{awaiting ? 'Đang chờ chấm' : passed ? 'Đạt yêu cầu' : 'Chưa đạt'}</p><p className="mt-1 text-[11px] text-blue-100">Điểm đạt: {result.passingScore}%</p></div>
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4">
          <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-[0_8px_25px_rgba(23,61,120,.04)] sm:p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-[176px] w-[176px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#075bf2 ${scoreProgress * 3.6}deg,#eaf0f8 0deg)` }}>
                <div className="flex h-[151px] w-[151px] flex-col items-center justify-center rounded-full bg-white"><span className="text-[42px] font-black leading-none text-[#09285e]">{scoreDisplay}</span><span className="mt-1 text-sm font-semibold text-[#7790b6]">/ 100</span></div>
              </div>
              <div className="w-full min-w-0"><p className="text-sm font-bold">Điểm của bạn</p><p className="mt-2 text-4xl font-black text-[#0a2a65]">{scoreDisplay}<span className="ml-2 text-xl font-semibold text-[#8da0bf]">/ 100</span></p>
                <span className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${awaiting ? 'bg-amber-50 text-amber-700' : passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{awaiting ? <Clock3 size={15} /> : passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{awaiting ? 'Đang chờ chấm' : passed ? 'Đạt yêu cầu' : 'Chưa đạt'}</span>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#eefaf5] px-4 py-3"><Trophy className="shrink-0 text-amber-500" size={23} /><div><p className="text-xs font-bold">Điểm tối thiểu: {result.passingScore}%</p><p className="mt-0.5 text-[11px] text-emerald-700">{awaiting ? 'Chờ hoàn tất chấm điểm để xác định kết quả.' : passed ? 'Chúc mừng! Bạn đã vượt qua bài kiểm tra.' : 'Tiếp tục luyện tập để đạt mục tiêu.'}</p></div></div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([{ label: 'Câu đúng', value: correct, icon: Check, bg: 'bg-[#eafaf2]', color: 'text-emerald-600' }, { label: 'Câu sai', value: wrong, icon: XCircle, bg: 'bg-[#fff0f1]', color: 'text-rose-500' }, { label: 'Chờ chấm', value: pending, icon: Clock3, bg: 'bg-[#fff8e7]', color: 'text-amber-500' }, { label: 'Tổng số câu', value: answers.length, icon: FileText, bg: 'bg-[#edf5ff]', color: 'text-blue-600' }]).map(s => <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}><s.icon size={23} className={s.color} /><p className="mt-2 text-xl font-black">{s.value}</p><p className="text-[11px] text-[#647b9f]">{s.label}</p></div>)}
            </div>
          </section>
          <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-extrabold"><ClipboardList size={18} className="text-blue-600" /> Thông tin bài làm</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {([{ icon: FileText, label: 'Quiz', value: result.quizTitle }, { icon: CalendarDays, label: 'Ngày nộp', value: formatDate(result.submittedAt) }, { icon: RotateCcw, label: 'Lần làm', value: attemptNumber == null ? 'Chưa có dữ liệu' : `Lần thứ ${attemptNumber}` }, { icon: Clock3, label: 'Thời gian làm bài', value: formatDuration(result.startedAt, result.submittedAt) }, { icon: BookOpen, label: 'Tổng số câu hỏi', value: String(answers.length) }, { icon: ListChecks, label: 'Hình thức chấm', value: awaiting ? 'Có câu cần giáo viên chấm' : 'Đã hoàn tất chấm điểm' }]).map(s => <div key={s.label} className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f7faff] p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-blue-600"><s.icon size={21} /></span><div className="min-w-0"><p className="text-[11px] text-[#7388aa]">{s.label}</p><p className="mt-0.5 break-words text-xs font-bold">{s.value}</p></div></div>)}
            </div>
            {attempts.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><button type="button" onClick={() => setShowHistory(v => !v)} className="flex w-full items-center justify-between text-left text-xs font-bold text-blue-700">Lịch sử điểm ({attempts.length} lượt) {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{showHistory && <div className="mt-3 space-y-2">{attempts.map(a => <button key={a.attemptId} type="button" onClick={() => navigate(`/quizzes/${a.quizId}/result/${a.attemptId}`, { state: { returnTo } })} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-blue-50 ${a.attemptId === aid ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}><span>Lần {a.attemptNumber} · {formatDate(a.submittedAt)}</span><b>{a.score == null ? statusText(a.resultStatus) : `${a.score}/100 · ${statusText(a.resultStatus)}`}</b></button>)}</div>}</div>}
          </section>
        </div>

        <section id="quiz-result-details" className="scroll-mt-5 rounded-[22px] border border-[#e2eaf6] bg-white p-4 shadow-[0_8px_25px_rgba(23,61,120,.04)] sm:p-5">
          {failed && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-extrabold text-amber-900">Bạn cần cải thiện những nội dung sau</h2>
            <p className="mt-1 text-xs leading-5 text-amber-800">Hệ thống chỉ hiển thị câu trả lời của bạn, kỹ năng cần ôn và phần giải thích; không tiết lộ đáp án chuẩn khi bạn chưa PASS.</p>
            <div className="mt-3 space-y-2">{answers.map((a, index) => a.isCorrect === false ? <div key={a.quizAnswerId || a.questionId} className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold text-amber-950">Câu {index + 1}: {a.questionText}</p>
              <p className="mt-1 text-[11px] text-amber-800">Kỹ năng cần cải thiện: {skillLabel(a.questionType)}</p>
              {a.questionExplanation ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700"><b>Kiến thức cần ôn:</b> {a.questionExplanation}</p> : <p className="mt-2 text-xs text-slate-500">Giảng viên chưa cấu hình phần giải thích cho câu hỏi này.</p>}
              {a.teacherFeedback && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-blue-800"><b>Gợi ý của giảng viên:</b> {a.teacherFeedback}</p>}
            </div> : null)}</div>
            {!!result.recommendedLessons?.length && <div className="mt-4 border-t border-amber-200 pt-3">
              <p className="text-xs font-extrabold text-amber-950">Bài học nên ôn tập</p>
              <div className="mt-2 flex flex-wrap gap-2">{result.recommendedLessons.map(lesson => <button key={lesson.lessonId} type="button" onClick={() => reviewLesson(lesson.lessonId)} disabled={!returnTo} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">Ôn bài {lesson.orderIndex}: {lesson.title}</button>)}</div>
            </div>}
            {retryBlocked && retryAt && <p className="mt-3 rounded-lg bg-white p-3 text-xs font-semibold text-amber-900">Bạn có thể làm lại từ: {formatDate(retryAt.toISOString())}. Thời gian chờ áp dụng cho bài đánh giá chương / tổng kết.</p>}
          </div>}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
            <button type="button" onClick={() => setTab('questions')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === 'questions' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-[#f5f8fd] text-[#4c638a] hover:bg-blue-50'}`}><ListChecks size={15} /> Chi tiết câu hỏi ({answers.length})</button>
            <button type="button" onClick={() => setTab('statistics')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === 'statistics' ? 'bg-blue-600 text-white' : 'bg-[#f5f8fd] text-[#4c638a] hover:bg-blue-50'}`}><Trophy size={15} /> Thống kê</button>
            <button type="button" onClick={() => setTab('feedback')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === 'feedback' ? 'bg-blue-600 text-white' : 'bg-[#f5f8fd] text-[#4c638a] hover:bg-blue-50'}`}><MessageSquareText size={15} /> Nhận xét ({feedbackAnswers.length})</button>
          </div>
          {tab === 'questions' && <><div className="my-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-extrabold">{result.quizTitle}</h2><div className="flex gap-3 text-[11px] font-semibold"><span className="text-emerald-600">● Đúng ({correct})</span><span className="text-rose-500">● Sai ({wrong})</span><span className="text-amber-500">● Chờ ({pending})</span></div></div>
            <div className="space-y-2">{answers.map((a, index) => { const isPending = a.score == null; const isRight = a.isCorrect === true; const isWrong = a.isCorrect === false; const open = expanded.includes(index); return <article key={a.quizAnswerId || `${a.questionId}-${index}`} className="overflow-hidden rounded-xl border border-[#e7edf6] bg-white transition hover:border-blue-200">
              <button type="button" onClick={() => toggle(index)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf3fb] text-xs font-extrabold">{index + 1}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{a.questionText}</span><span className="mt-1 block truncate text-[11px] text-[#8495b1]">{skillLabel(a.questionType)}</span></span><span className="hidden whitespace-nowrap text-[11px] font-semibold sm:block">{isPending ? 'Chờ chấm' : `${a.score}/${a.maxScore ?? 1} điểm`}</span><span className={`min-w-[68px] rounded-lg px-2 py-1 text-center text-[11px] font-bold ${isPending ? 'bg-amber-50 text-amber-700' : isRight ? 'bg-emerald-50 text-emerald-700' : isWrong ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-700'}`}>{isPending ? 'Chờ chấm' : isRight ? 'Đúng' : isWrong ? 'Sai' : 'Đã chấm'}</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {open && <div className="space-y-3 border-t border-[#edf1f8] bg-[#fbfdff] p-4 text-xs"><p className="font-bold text-[#7186a7]">Câu trả lời của bạn</p>
                {(a.selectedChoices?.length || a.selectedChoiceText) ? <div className="space-y-1 rounded-lg bg-white p-3">{(a.selectedChoices?.length ? a.selectedChoices : [{ choiceId: a.selectedChoiceId ?? 0, choiceText: a.selectedChoiceText ?? '' }]).map((c, i) => <p key={`${c.choiceId}-${i}`} className="font-semibold">• {c.choiceText || `Phương án #${i + 1}`}</p>)}</div> : null}
                {a.textAnswer && <p className="whitespace-pre-wrap rounded-lg bg-white p-3 leading-6">{a.textAnswer}</p>}
                {!!a.arrangeItems?.length && <div className="space-y-1">{[...a.arrangeItems].sort((x, y) => (x.selectedOrder ?? 999) - (y.selectedOrder ?? 999)).map(item => <p key={item.arrangeItemId} className="rounded-lg bg-white p-3"><b className="mr-2 text-blue-600">{item.selectedOrder ?? '—'}.</b>{item.content}{passed && <span className="ml-2 text-[#7186a7]">(Đúng: {item.correctOrder ?? '—'})</span>}</p>)}</div>}
                {!!a.scenarioPath?.length && <div className="space-y-1">{a.scenarioPath.map(p => <div key={`${p.nodeId}-${p.stepOrder}`} className="rounded-lg bg-white p-3"><b className="text-blue-700">Bước {p.stepOrder}:</b> {p.choiceText}{p.feedback && <p className="mt-1 text-[#7084a3]">{p.feedback}</p>}</div>)}</div>}
                
                {failed && isWrong && a.questionExplanation && <div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="font-bold text-amber-800">Kiến thức cần ôn tập</p><p className="mt-1 whitespace-pre-wrap leading-6 text-amber-900">{a.questionExplanation}</p></div>}
                {a.teacherFeedback && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="flex items-center gap-1.5 font-bold text-blue-700"><Sparkles size={14} /> Nhận xét của giáo viên</p><p className="mt-1 whitespace-pre-wrap leading-6">{a.teacherFeedback}</p></div>}
                {!a.selectedChoices?.length && !a.selectedChoiceText && !a.textAnswer && !a.arrangeItems?.length && !a.scenarioPath?.length && <p className="text-[#7b8eaa]">API chưa cung cấp nội dung câu trả lời cho câu hỏi này.</p>}
              </div>}
            </article>; })}</div>
          </>}
          {tab === 'statistics' && <div className="space-y-4 py-5"><h2 className="text-base font-extrabold">Thống kê kết quả bài làm</h2><div className="grid grid-cols-2 gap-3">{[['Câu đúng', correct], ['Câu sai', wrong], ['Đã chấm', graded.length], ['Chờ chấm', pending]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f3f7ff] p-4"><p className="text-xs text-[#7186a7]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${answers.length ? graded.length / answers.length * 100 : 0}%` }} /></div><p className="text-xs text-[#7186a7]">Đã chấm {graded.length}/{answers.length} câu hỏi. Đây là thống kê theo kết quả API, không phải đánh giá kỹ năng giọng nói.</p></div>}
          {tab === 'feedback' && <div className="space-y-3 py-5"><h2 className="text-base font-extrabold">Nhận xét từ giáo viên</h2>{feedbackAnswers.length ? feedbackAnswers.map(a => <div key={a.quizAnswerId || a.questionId} className="rounded-xl border border-blue-100 bg-[#f5f9ff] p-4"><p className="text-xs font-bold">{a.questionText}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#48618b]">{a.teacherFeedback}</p></div>) : <p className="rounded-xl bg-[#f6f9ff] p-5 text-xs text-[#7186a7]">Chưa có nhận xét của giáo viên cho bài làm này.</p>}</div>}
        </section>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={scrollToDetails} className="inline-flex items-center gap-2 rounded-xl border border-[#d7e4f6] bg-white px-5 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><Eye size={17} /> Xem lại bài làm</button>
        {failed && !hasPassed && !hasPending && !retryBlocked && <button type="button" onClick={() => qid && navigate(`/quizzes/${qid}/take`, { state: { returnTo } })} className="inline-flex items-center gap-2 rounded-xl border border-[#d7e4f6] bg-white px-5 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><RotateCcw size={17} /> Làm lại bài này</button>}
        <button type="button" onClick={back} className="inline-flex items-center gap-2 rounded-xl border border-[#d7e4f6] bg-white px-5 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><BookOpen size={17} /> Quay về khóa học</button>
        <button type="button" onClick={scrollToDetails} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">Xem chi tiết đầy đủ <ArrowRight size={17} /></button>
      </div>
    </div>
  </div>;
};

export default QuizResultPage;
