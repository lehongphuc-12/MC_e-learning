import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Eye, RefreshCw } from 'lucide-react';
import { useMyQuizAttempts } from '../hooks/useQuiz';
import type { LearnerQuizAttemptHistoryDto } from '../types/quizTypes';

interface Props { quizId: number; maxAttempts: number; passingScore: number; returnTo: string; onTake: () => void; }
const statusIs = (status: LearnerQuizAttemptHistoryDto['resultStatus'], value: string, code: number) => status === value || status === code;
const statusLabel = (status: LearnerQuizAttemptHistoryDto['resultStatus']) => statusIs(status, 'PASSED', 3) ? 'Đã đạt' : statusIs(status, 'FAILED', 4) ? 'Chưa đạt' : statusIs(status, 'PENDING_GRADING', 2) ? 'Chờ chấm' : 'Đã nộp';

export const LearnerQuizHistoryActions: React.FC<Props> = ({ quizId, maxAttempts, passingScore, returnTo, onTake }) => {
  const navigate = useNavigate();
  const { data = [], isLoading, isError, refetch, isFetching } = useMyQuizAttempts(quizId);
  const history = useMemo(() => [...data].filter(a => a.submittedAt).sort((a, b) => b.attemptNumber - a.attemptNumber), [data]);
  const passed = history.some(a => statusIs(a.resultStatus, 'PASSED', 3));
  const pending = history.some(a => statusIs(a.resultStatus, 'PENDING_GRADING', 2));
  // API chỉ trả về lượt đã nộp; lượt đang làm dở không có trong danh sách này.
  // Backend TakeQuizAsync vẫn là nơi quyết định có được tạo/tiếp tục lượt làm hay không.
  const exhausted = maxAttempts > 0 && history.length >= maxAttempts;
  const canTake = !isLoading && !isError && !passed && !pending && !exhausted;
  const openResult = (attemptId: number) => navigate(`/quizzes/${quizId}/result/${attemptId}`, { state: { returnTo } });
  return <div className="mt-2 w-full space-y-2 text-xs">
    <div className="flex flex-wrap items-center gap-2">
      {canTake && <button type="button" onClick={onTake} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 font-bold text-white transition hover:bg-violet-700 active:scale-95"><ClipboardList size={14}/> Làm Quiz</button>}
      {history.length > 0 && <button type="button" onClick={() => openResult(history[0].attemptId)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 font-bold text-violet-700 transition hover:bg-violet-50"><Eye size={14}/> Xem điểm & nhận xét</button>}
      <button type="button" title="Cập nhật lịch sử điểm" onClick={() => void refetch()} disabled={isFetching} className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 disabled:opacity-40"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/></button>
    </div>
    {isLoading ? <p className="text-slate-500">Đang tải lịch sử Quiz...</p> : isError ? <p className="text-rose-600">Không tải được lịch sử. Hãy bấm làm mới.</p> : <p className="text-slate-600">{passed ? 'Đã đạt · Không thể làm lại' : pending ? 'Đang chờ giáo viên chấm' : exhausted ? 'Đã hết lượt làm' : `${history.length} lượt đã sử dụng · ${maxAttempts > 0 ? `${maxAttempts} lượt tối đa` : 'Không giới hạn lượt'} · Điểm đạt ${passingScore}%`}</p>}
    {history.length > 0 && <details className="rounded-xl border border-violet-100 bg-white p-3"><summary className="cursor-pointer font-semibold text-violet-700">Lịch sử điểm ({history.length} lượt)</summary><div className="mt-2 space-y-1">{history.map(a => <button key={a.attemptId} type="button" onClick={() => openResult(a.attemptId)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-violet-50"><span>Lần {a.attemptNumber} · {statusLabel(a.resultStatus)}</span><span className="font-bold text-violet-700">{a.score == null ? 'Chưa có điểm' : `${a.score.toFixed(1)}/100`} →</span></button>)}</div></details>}
  </div>;
};
