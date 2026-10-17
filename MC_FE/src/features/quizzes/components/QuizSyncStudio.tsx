import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Database, GitCompareArrows, LoaderCircle, RefreshCw, ShieldCheck, X, FileSpreadsheet, Clock3 } from 'lucide-react';
import { quizSyncApi, type SyncCell, type SyncResult } from '../api/quizSyncApi';

const display = (value?: string | null) => value == null ? '(null)' : value === '' ? '(chuỗi rỗng)' : value;
const extractError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    for (const key of ['detail', 'message', 'title', 'error']) if (typeof obj[key] === 'string' && obj[key]) return obj[key] as string;
  }
  return 'Không thể tải trạng thái đồng bộ.';
};
const getStatus = (status: string) => ({
  IN_SYNC: 'Đã đồng bộ', BASELINE_REQUIRED: 'Chưa khởi tạo baseline', NOT_INITIALIZED: 'Chưa khởi tạo baseline', RECOVERY_REQUIRED: 'Cần khôi phục có kiểm soát',
  CONFLICT: 'Có xung đột', CONFLICTS: 'Có xung đột', OUT_OF_SYNC: 'Có thay đổi chưa đồng bộ',
}[status] ?? status.replaceAll('_', ' '));

export default function QuizSyncStudio({ quizId, title, onClose }: { quizId: number; title: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [data, setData] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<{ cell: SyncCell; winner: 'DATABASE' | 'SHEET' } | null>(null);
  const [confirmBaseline, setConfirmBaseline] = useState(false);
  const [recovery, setRecovery] = useState({ operationId: '', expectedDatabaseValue: '', expectedSheetValue: '' });
  const inFlight = useRef(false);
  const stopped = useRef(false);
  const errorRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const result = await quizSyncApi.plan(quizId);
      if (stopped.current) return;
      setData(result);
      setError('');
      errorRef.current = false;
    } catch (e) {
      if (stopped.current) return;
      setError(extractError(e));
      errorRef.current = true;
      if (!silent) setData(null);
    } finally {
      inFlight.current = false;
      if (!stopped.current) setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    stopped.current = false;
    void refresh();
    const timer = window.setInterval(() => { if (!inFlight.current && !errorRef.current) void refresh(true); }, 30000);
    return () => { stopped.current = true; window.clearInterval(timer); };
  }, [refresh]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setChoice(null);
      setConfirmBaseline(false);
      errorRef.current = false;
      await refresh();
    } catch (e) {
      setError(extractError(e));
      errorRef.current = true;
    } finally { setBusy(false); }
  };

  const status = data?.status ?? '';
  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-[#130a2c]/65 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside initial={reduce ? false : { x: 70, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative flex h-full w-full max-w-[720px] flex-col overflow-hidden bg-[#faf9ff] shadow-2xl">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#32116f] via-[#5b21b6] to-[#7c3aed] px-6 py-7 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full border-[40px] border-white/5" />
          <div className="relative flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.22em] text-violet-200">MSEEK Academy · Quiz Sync</p><h2 className="mt-3 text-2xl font-black sm:text-3xl">Trung tâm đồng bộ</h2><p className="mt-2 text-sm text-violet-100">{title} · Quiz #{quizId}</p></div>
            <button aria-label="Đóng" onClick={onClose} className="rounded-xl border border-white/20 bg-white/10 p-2 transition hover:bg-white/20"><X size={22}/></button>
          </div>
        </header>
        <main className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={16} className="text-violet-500"/> Backend tự đồng bộ; giao diện kiểm tra mỗi 30 giây khi bình thường.</p>
            <button disabled={busy || loading} onClick={() => { errorRef.current = false; void refresh(); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Làm mới</button>
          </div>
          {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={20}/><div className="min-w-0"><h3 className="font-bold text-rose-800">Không thể lấy trạng thái đồng bộ</h3><p className="mt-2 break-words text-sm text-rose-700">{error}</p><p className="mt-2 text-xs leading-5 text-rose-600">Nếu API trả về 409, hãy xem tab Network → Response của /quizzes/sync/full/plan/{quizId} để biết nguyên nhân từ Backend. Giao diện tạm dừng tự thử lại để tránh lặp lỗi.</p></div></div></div>}
          {loading && !data && <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-7 text-sm text-slate-600"><LoaderCircle className="animate-spin text-violet-600"/> Đang tải trạng thái...</div>}
          {!loading && !data && !error && <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">Chưa có dữ liệu trạng thái.</div>}
          {data && <>
            <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Trạng thái đồng bộ</p><h3 className="mt-2 text-xl font-extrabold text-violet-950">{getStatus(status)}</h3></div>{status === 'IN_SYNC' ? <CheckCircle2 size={30} className="text-emerald-600"/> : <GitCompareArrows size={30} className="text-violet-600"/>}</div>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-violet-50/70 p-4 text-center text-xs font-bold text-violet-900 sm:text-sm"><span className="flex flex-col items-center gap-2"><Database size={22} className="text-violet-600"/> PostgreSQL</span><GitCompareArrows size={22} className="text-violet-400"/><span className="flex flex-col items-center gap-2"><FileSpreadsheet size={22} className="text-emerald-600"/> Google Sheets</span></div>
            </section>
            {(data.problems ?? []).map((problem, index) => <p key={index} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{problem}</p>)}
            {(status === 'BASELINE_REQUIRED' || status === 'NOT_INITIALIZED') && <section className="rounded-2xl border border-violet-100 bg-white p-5"><h4 className="font-bold text-violet-950">Khởi tạo baseline lần đầu</h4><p className="mt-2 text-sm leading-6 text-slate-600">Chỉ xác nhận sau khi kiểm tra Database và Google Sheets đã khớp toàn bộ trường. Backend phải kiểm tra lại điều kiện trước khi chấp nhận.</p><button disabled={busy} onClick={() => setConfirmBaseline(true)} className="mt-4 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">Xác nhận baseline ban đầu</button></section>}
            {(data.conflicts ?? []).map((cell, index) => <section key={`${cell.table}-${cell.id}-${cell.field}-${index}`} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">{cell.table} / #{cell.id}</p><h4 className="mt-1 text-lg font-extrabold text-violet-950">{cell.field}</h4><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-bold text-violet-700">DATABASE</p><p className="mt-2 break-words text-sm text-slate-700">{display(cell.databaseValue)}</p><button disabled={busy} onClick={() => setChoice({ cell, winner: 'DATABASE' })} className="mt-4 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Giữ Database</button></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">GOOGLE SHEETS</p><p className="mt-2 break-words text-sm text-slate-700">{display(cell.sheetValue)}</p><button disabled={busy} onClick={() => setChoice({ cell, winner: 'SHEET' })} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Giữ Sheets</button></div></div><p className="mt-3 text-xs text-slate-500">Baseline: {display(cell.baseValue)}</p></section>)}
            {status === 'RECOVERY_REQUIRED' && <section className="rounded-3xl border border-rose-200 bg-white p-5"><h4 className="flex items-center gap-2 font-bold text-rose-700"><AlertTriangle size={20}/> Phê duyệt recovery có kiểm soát</h4><p className="mt-2 text-xs leading-5 text-slate-500">Chỉ nhập thông tin sau khi đối chiếu journal và dữ liệu hai phía. Không suy đoán operation ID hoặc giá trị.</p>{([['operationId','Operation ID'],['expectedDatabaseValue','Giá trị Database đã kiểm tra'],['expectedSheetValue','Giá trị Google Sheets đã kiểm tra']] as const).map(([key, label]) => <label key={key} className="mt-3 block text-xs font-bold text-slate-600">{label}<input value={recovery[key]} onChange={e => setRecovery(prev => ({ ...prev, [key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"/></label>)}<button disabled={busy || !recovery.operationId || !recovery.expectedDatabaseValue || !recovery.expectedSheetValue} onClick={() => { if (window.confirm('Đã đối chiếu journal và cả hai phía? Chỉ tiếp tục khi chắc chắn.')) void run(() => quizSyncApi.recover(quizId, recovery)); }} className="mt-4 rounded-xl bg-rose-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Phê duyệt recovery</button></section>}
          </>}
        </main>
        {(choice || confirmBaseline) && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#170b35]/70 p-5"><div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"><ShieldCheck className="text-violet-600" size={32}/><h3 className="mt-4 text-xl font-bold text-violet-950">Xác nhận thao tác</h3><p className="mt-2 text-sm leading-6 text-slate-600">{choice ? `Giữ ${choice.winner} cho ${choice.cell.table}/${choice.cell.id}/${choice.cell.field}?` : 'Xác nhận baseline ban đầu chỉ khi dữ liệu hai phía đã khớp?'}</p><div className="mt-6 flex gap-3"><button disabled={busy} onClick={() => { setChoice(null); setConfirmBaseline(false); }} className="flex-1 rounded-xl border border-slate-200 p-3 text-sm font-semibold">Hủy</button><button disabled={busy} onClick={() => void run(() => choice ? quizSyncApi.resolve(quizId, choice.cell, choice.winner) : quizSyncApi.adopt(quizId))} className="flex-1 rounded-xl bg-violet-700 p-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang xử lý...' : 'Xác nhận'}</button></div></div></div>}
      </motion.aside>
    </div>
  );
}
