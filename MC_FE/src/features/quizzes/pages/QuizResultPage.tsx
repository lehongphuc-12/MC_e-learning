import React from 'react';
import { ArrowLeft, Check, Clock3, FileText, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuizResult } from '../hooks/useQuiz';

interface QuizNavigationState { returnTo?: string; }

const formatDuration = (start: string, end?: string | null) => {
  if (!end) return 'Đang chờ';
  const sec = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  return `${Math.floor(sec / 60)} phút ${sec % 60} giây`;
};

export const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const qid = quizId && Number(quizId) > 0 ? Number(quizId) : null;
  const aid = attemptId && Number(attemptId) > 0 ? Number(attemptId) : null;
  const { data: result, isLoading, isError, error } = useQuizResult(qid, aid);
  const returnTo = (location.state as QuizNavigationState | null)?.returnTo;

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/></div>;
  if (isError || !result) return <div className="mx-auto max-w-xl p-10 text-center text-red-600">{error instanceof Error ? error.message : 'Không thể tải kết quả Quiz.'}</div>;

  const score = result.score ?? 0;
  const graded = result.answers.filter(x => x.score !== null && x.score !== undefined);
  const correct = graded.filter(x => x.isCorrect === true).length;
  const wrong = graded.filter(x => x.isCorrect === false).length;
  const pending = result.answers.length - graded.length;
  const passed = result.resultStatus === 'PASSED';

  return <div className="min-h-screen bg-[#f5f7fb] pb-14">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#102c7a] via-[#1645b8] to-[#1f63ed] text-white">
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 20% 20%,white 0,transparent 24%),radial-gradient(circle at 80% 10%,#facc15 0,transparent 18%)'}}/>
      <div className="relative mx-auto max-w-6xl px-5 py-10 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.requiresManualGrading ? 'bg-amber-400 text-slate-900' : passed ? 'bg-emerald-400 text-white' : 'bg-white/20 text-white'}`}>
          {result.requiresManualGrading ? <Clock3 className="h-8 w-8"/> : passed ? <Check className="h-8 w-8"/> : <FileText className="h-8 w-8"/>}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold">{result.requiresManualGrading ? 'Đã nộp bài thành công!' : 'Hoàn thành bài kiểm tra!'}</h1>
        <p className="mt-2 text-sm text-blue-100">{result.requiresManualGrading ? 'Một số câu cần giảng viên chấm. Điểm cuối cùng sẽ được cập nhật sau.' : passed ? 'Bạn đã đạt yêu cầu của bài kiểm tra này.' : 'Xem lại chi tiết bên dưới để cải thiện ở lần tiếp theo.'}</p>
      </div>
    </section>

    <div className="mx-auto -mt-5 max-w-6xl px-5">
      <div className="grid gap-4 md:grid-cols-[0.9fr_1.3fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[7px] border-blue-100 bg-blue-50"><Trophy className="h-8 w-8 text-blue-600"/></div>
          <p className="mt-5 text-sm font-semibold text-slate-500">Điểm của bạn</p>
          <div className="mt-1 text-5xl font-black text-blue-700">{result.score === null || result.score === undefined ? '—' : score.toFixed(1)}<span className="text-2xl text-slate-300"> / 100</span></div>
          {result.score !== null && result.score !== undefined && <p className="mt-2 text-xl font-bold text-emerald-600">{score}%</p>}
          <span className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-bold ${result.requiresManualGrading ? 'bg-amber-100 text-amber-700' : passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{result.requiresManualGrading ? 'Đang chờ chấm' : passed ? 'Đạt yêu cầu ✓' : 'Chưa đạt'}</span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Thông tin bài làm</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Thời gian làm bài', formatDuration(result.startedAt, result.submittedAt)],
              ['Tổng số câu hỏi', String(result.answers.length)],
              ['Đã chấm', String(graded.length)],
              ['Chờ chấm', String(pending)],
              ['Điểm đạt', `${result.passingScore}%`],
              ['Trạng thái', result.resultStatus]
            ].map(([label,value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-500">{label}</span><b className="text-sm text-slate-800">{value}</b></div>)}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={()=>document.getElementById('quiz-detail-result')?.scrollIntoView({behavior:'smooth'})} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100">Xem chi tiết kết quả</button>
        <button onClick={()=>returnTo ? navigate(returnTo) : navigate('/my-courses')} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700">Quay lại khóa học</button>
      </div>

      <section id="quiz-detail-result" className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-blue-600">CHI TIẾT KẾT QUẢ</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{result.quizTitle}</h2></div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700">Đúng {correct}</span>
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-600">Sai {wrong}</span>
            {pending > 0 && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">Chờ chấm {pending}</span>}
          </div>
        </div>

        <div className="space-y-4">
          {result.answers.map((a,index) => <article key={a.quizAnswerId || a.questionId} className={`rounded-2xl border bg-white p-5 shadow-sm ${a.score === null || a.score === undefined ? 'border-amber-200' : a.isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
            <div className="flex gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${a.score === null || a.score === undefined ? 'bg-amber-100 text-amber-700' : a.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{index+1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold leading-6 text-slate-900">{a.questionText}</h3>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{a.score === null || a.score === undefined ? 'Chờ chấm' : `${a.score}/${a.maxScore ?? 1} điểm`}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">{a.questionType}</p>
              </div>
            </div>

            {(a.selectedChoices?.length || a.selectedChoiceText) ? <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">CÂU TRẢ LỜI CỦA BẠN</p>
              <div className="mt-2 space-y-2">{(a.selectedChoices?.length ? a.selectedChoices : [{choiceId:a.selectedChoiceId??0,choiceText:a.selectedChoiceText??''}]).map(c=><p key={c.choiceId} className="text-sm font-semibold text-slate-700">• {c.choiceText}</p>)}</div>
            </div> : null}

            {a.textAnswer && <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">BÀI LÀM</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{a.textAnswer}</p>
            </div>}

            {a.correctChoices && a.correctChoices.length > 0 && a.isCorrect === false && <div className="mt-3 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-600">ĐÁP ÁN ĐÚNG</p>
              <p className="mt-2 text-sm font-semibold text-emerald-800">{a.correctChoices.map(c=>c.choiceText).join(', ')}</p>
            </div>}

            {a.arrangeItems && a.arrangeItems.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[...a.arrangeItems].sort((x,y)=>(x.selectedOrder??999)-(y.selectedOrder??999)).map(item=><div key={item.arrangeItemId} className="rounded-xl bg-slate-50 p-3 text-sm"><b className="mr-2 text-blue-600">{item.selectedOrder ?? '—'}.</b>{item.content}<span className="float-right text-xs text-slate-400">Đúng: {item.correctOrder ?? '—'}</span></div>)}
            </div>}

            {a.scenarioPath && a.scenarioPath.length > 0 && <div className="mt-4 space-y-2">
              {a.scenarioPath.map(p=><div key={`${p.nodeId}-${p.stepOrder}`} className="rounded-xl bg-indigo-50 p-3 text-sm"><b className="text-indigo-700">Bước {p.stepOrder}:</b> {p.choiceText}{p.feedback&&<p className="mt-1 text-xs text-slate-500">{p.feedback}</p>}</div>)}
            </div>}

            {a.teacherFeedback && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-blue-700"><Sparkles className="h-4 w-4"/>NHẬN XÉT CỦA GIẢNG VIÊN</p>
              <p className="mt-2 text-sm leading-6 text-blue-950">{a.teacherFeedback}</p>
            </div>}
          </article>)}
        </div>
      </section>

      <div className="mt-8 flex justify-center gap-3">
        <button onClick={()=>qid&&navigate(`/quizzes/${qid}/take`,{state:{returnTo}})} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"><RotateCcw className="h-4 w-4"/>Làm lại Quiz</button>
        <button onClick={()=>returnTo?navigate(returnTo):navigate('/my-courses')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4"/>Quay lại</button>
      </div>
    </div>
  </div>;
};

export default QuizResultPage;