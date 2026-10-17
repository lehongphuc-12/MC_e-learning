import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Database, GitCompareArrows, LoaderCircle, RefreshCw, ShieldCheck, X, FileSpreadsheet, Clock3, Sparkles, LockKeyhole, CircleAlert } from 'lucide-react';
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
  const isSynced = status === 'IN_SYNC';
  const isBaseline = status === 'BASELINE_REQUIRED' || status === 'NOT_INITIALIZED';
  const isRecovery = status === 'RECOVERY_REQUIRED';
  const statusTheme = isSynced
    ? { bg: 'border-[#BDEAD7] bg-[#EDFBF4]', ink: 'text-[#087D56]', icon: 'text-[#0DA76D]' }
    : isBaseline || isRecovery || status === 'CONFLICT' || status === 'CONFLICTS'
      ? { bg: 'border-[#F4D99B] bg-[#FFF9E9]', ink: 'text-[#9A650A]', icon: 'text-[#D89C24]' }
      : { bg: 'border-[#C9DBFF] bg-[#EFF5FF]', ink: 'text-[#2453B7]', icon: 'text-[#3269E7]' };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-[#0A1836]/65 backdrop-blur-[5px]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside initial={reduce ? false : { x: 70, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.34, ease: 'easeOut' }} role="dialog" aria-modal="true" aria-label="Trung tâm đồng bộ Quiz" className="relative flex h-full w-full max-w-[760px] flex-col overflow-hidden bg-[#F4F7FD] shadow-[-20px_0_70px_rgba(4,21,57,.25)]">
        <header className="relative shrink-0 overflow-hidden bg-[#0C214B] px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-7" style={{ background: 'linear-gradient(112deg, #0C214B 0%, #143C83 52%, #245FE4 100%)' }}>
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[42px] border-white/[.055]" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-[#65B8FF]/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#D8E8FF]"><Sparkles size={12} className="text-[#FFD66B]" /> MSEEK Academy / Quiz Sync</div>
              <h2 className="text-[25px] font-black leading-tight tracking-tight text-white sm:text-[30px]">Trung tâm đồng bộ</h2>
              <p className="mt-2 max-w-[540px] break-words text-sm font-medium leading-5 text-[#DDEAFF]">{title} <span className="mx-1 text-white/50">·</span> Quiz #{quizId}</p>
            </div>
            <button type="button" aria-label="Đóng" onClick={onClose} className="shrink-0 rounded-xl border border-white/25 bg-white/10 p-2.5 text-white transition hover:rotate-90 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X size={20}/></button>
          </div>
          <div className="relative mt-5 flex items-center gap-2"><span className="h-1 w-10 rounded-full bg-[#FFD369]" /><span className="h-1 w-5 rounded-full bg-[#7DC6FF]" /><span className="h-1 w-3 rounded-full bg-[#77D9AD]" /></div>
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DFE8F7] bg-white px-4 py-3 shadow-[0_4px_18px_rgba(24,56,108,.04)]">
            <div className="flex min-w-0 items-start gap-2.5"><span className="rounded-lg bg-[#EAF2FF] p-2 text-[#2C61D4]"><Clock3 size={17}/></span><div><p className="text-xs font-bold text-[#1C335B]">Theo dõi đồng bộ tự động</p><p className="mt-0.5 text-xs leading-5 text-[#71829B]">Backend tự đồng bộ · Giao diện kiểm tra mỗi 30 giây khi bình thường</p></div></div>
            <button type="button" disabled={busy || loading} onClick={() => { errorRef.current = false; void refresh(); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#CADBFF] bg-[#EEF4FF] px-4 py-2.5 text-xs font-extrabold text-[#2558C7] transition hover:-translate-y-0.5 hover:bg-[#DFEAFF] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Làm mới</button>
          </div>

          {error && <div role="alert" className="rounded-2xl border border-[#F2CE9D] bg-[#FFF9ED] p-4 sm:p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-[#C68716]" size={21}/><div className="min-w-0"><h3 className="font-extrabold text-[#8A5811]">Không thể lấy trạng thái đồng bộ</h3><p className="mt-2 break-words text-sm text-[#855F27]">{error}</p><p className="mt-2 text-xs leading-5 text-[#9D752F]">Nếu API trả về 409, hãy xem tab Network → Response của /quizzes/sync/full/plan/{quizId} để biết nguyên nhân từ Backend. Giao diện tạm dừng tự thử lại để tránh lặp lỗi.</p></div></div></div>}
          {loading && !data && <div className="flex items-center gap-3 rounded-2xl border border-[#DFE8F7] bg-white p-7 text-sm text-[#526783]"><LoaderCircle className="animate-spin text-[#3269E7]"/> Đang tải trạng thái...</div>}
          {!loading && !data && !error && <div className="rounded-2xl border border-[#DFE8F7] bg-white p-6 text-sm text-[#61738D]">Chưa có dữ liệu trạng thái.</div>}

          {data && <>
            <section className="overflow-hidden rounded-[22px] border border-[#DFE8F7] bg-white shadow-[0_8px_28px_rgba(28,59,108,.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6 sm:pt-6">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#7D8EA7]">Tình trạng hệ thống</p><h3 className="mt-2 text-xl font-black text-[#13294C]">Trạng thái đồng bộ</h3></div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold ${statusTheme.bg} ${statusTheme.ink}`}>{isSynced ? <CheckCircle2 size={16}/> : <CircleAlert size={16}/>} {getStatus(status)}</span>
              </div>
              <div className="mx-5 mb-5 rounded-[18px] border border-[#E0EAF8] bg-gradient-to-r from-[#F1F6FF] via-white to-[#EFFBF5] p-4 sm:mx-6 sm:mb-6 sm:p-5">
                <div className="grid grid-cols-[1fr_54px_1fr] items-center gap-1 sm:grid-cols-[1fr_80px_1fr]">
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D1E1FF] bg-white text-[#2C62D7] shadow-sm"><Database size={22}/></span><span className="text-xs font-extrabold text-[#1C3F7B] sm:text-sm">PostgreSQL</span><span className="text-[10px] text-[#7B8DA5]">DATABASE</span></div>
                  <div className="flex flex-col items-center gap-1"><div className="h-px w-full bg-gradient-to-r from-[#B9CFFF] to-[#BCECD3]"/><span className={`-mt-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-sm ${isSynced ? 'border-[#C7EFD9] text-[#13A76D]' : 'border-[#D3E0F7] text-[#3769D4]'}`}><ArrowRightLeft size={17}/></span></div>
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#CBEDDA] bg-white text-[#109B65] shadow-sm"><FileSpreadsheet size={22}/></span><span className="text-xs font-extrabold text-[#146847] sm:text-sm">Google Sheets</span><span className="text-[10px] text-[#7B8DA5]">SHEET</span></div>
                </div>
                <p className="mt-4 border-t border-[#E3EBF6] pt-3 text-center text-xs font-medium text-[#667B97]">{isSynced ? 'Dữ liệu hai phía đang khớp theo trạng thái Backend.' : 'Kiểm tra trạng thái và xử lý các mục cần xác nhận bên dưới.'}</p>
              </div>
            </section>

            {(data.problems ?? []).map((problem, index) => <div key={index} className="flex items-start gap-3 rounded-2xl border border-[#F2D79A] bg-[#FFFAED] p-4 text-sm leading-6 text-[#8A6219]"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#D39A28]"/><span className="break-words">{problem}</span></div>)}

            {isBaseline && <section className="rounded-[22px] border border-[#F0D8A4] bg-white p-5 shadow-[0_8px_25px_rgba(110,78,20,.04)] sm:p-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#FFF3D8] p-2.5 text-[#BE8318]"><ShieldCheck size={21}/></span><div><h4 className="text-base font-black text-[#183157]">Khởi tạo baseline lần đầu</h4><p className="mt-1.5 text-sm leading-6 text-[#63758F]">Chỉ xác nhận sau khi kiểm tra Database và Google Sheets đã khớp toàn bộ trường. Backend phải kiểm tra lại điều kiện trước khi chấp nhận.</p></div></div><button type="button" disabled={busy} onClick={() => setConfirmBaseline(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#245DCE] px-5 py-3 text-sm font-extrabold text-white shadow-[0_6px_15px_rgba(36,93,206,.18)] transition hover:-translate-y-0.5 hover:bg-[#1749AC] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={17}/> Xác nhận baseline ban đầu</button></section>}

            {(data.conflicts ?? []).map((cell, index) => <section key={`${cell.table}-${cell.id}-${cell.field}-${index}`} className="overflow-hidden rounded-[22px] border border-[#DFE8F7] bg-white shadow-[0_8px_28px_rgba(28,59,108,.05)]"><div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E7EEF8] px-5 py-4 sm:px-6"><div><p className="text-[11px] font-bold text-[#8291A8]">{cell.table} / #{cell.id}</p><h4 className="mt-1 break-words text-lg font-black text-[#142D53]">{cell.field}</h4></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4DEAD] bg-[#FFF7E5] px-3 py-1.5 text-[11px] font-extrabold text-[#A46D12]"><GitCompareArrows size={13}/> Xung đột dữ liệu</span></div><div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5"><div className="flex min-w-0 flex-col rounded-2xl border border-[#CFE0FF] bg-[#F1F6FF] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#2455B6]"><Database size={16}/> DATABASE</div><div className="mt-3 min-h-[56px] flex-1 whitespace-pre-wrap break-words rounded-xl border border-[#E0EAFB] bg-white/90 p-3 text-sm leading-6 text-[#263B5B]">{display(cell.databaseValue)}</div><button type="button" disabled={busy} onClick={() => setChoice({ cell, winner: 'DATABASE' })} className="mt-3 w-full rounded-xl bg-[#255DD1] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1849A9] disabled:cursor-not-allowed disabled:opacity-50">Giữ Database</button></div><div className="flex min-w-0 flex-col rounded-2xl border border-[#C7ECD7] bg-[#F0FBF5] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#087B51]"><FileSpreadsheet size={16}/> GOOGLE SHEETS</div><div className="mt-3 min-h-[56px] flex-1 whitespace-pre-wrap break-words rounded-xl border border-[#DCEFE4] bg-white/90 p-3 text-sm leading-6 text-[#263B5B]">{display(cell.sheetValue)}</div><button type="button" disabled={busy} onClick={() => setChoice({ cell, winner: 'SHEET' })} className="mt-3 w-full rounded-xl bg-[#119365] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#08734D] disabled:cursor-not-allowed disabled:opacity-50">Giữ Sheets</button></div></div><div className="mx-4 mb-4 rounded-xl border border-[#F3E4BF] bg-[#FFFBF1] px-4 py-3 text-xs leading-5 text-[#8B6A2B] sm:mx-5 sm:mb-5"><span className="font-extrabold">Baseline:</span> <span className="whitespace-pre-wrap break-words">{display(cell.baseValue)}</span></div></section>)}

            {isRecovery && <section className="rounded-[22px] border border-[#EFCB9B] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#FFF1D9] p-2.5 text-[#C4891D]"><LockKeyhole size={21}/></span><div><h4 className="text-base font-black text-[#80551B]">Phê duyệt recovery có kiểm soát</h4><p className="mt-1.5 text-xs leading-5 text-[#6C7A8F]">Chỉ nhập thông tin sau khi đối chiếu journal và dữ liệu hai phía. Không suy đoán operation ID hoặc giá trị.</p></div></div><div className="mt-5 space-y-3">{([['operationId','Operation ID'],['expectedDatabaseValue','Giá trị Database đã kiểm tra'],['expectedSheetValue','Giá trị Google Sheets đã kiểm tra']] as const).map(([key, label]) => <label key={key} className="block text-xs font-extrabold text-[#344969]">{label}<input value={recovery[key]} onChange={e => setRecovery(prev => ({ ...prev, [key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#D8E3F1] bg-[#F9FBFF] px-4 py-3 text-sm font-medium text-[#173253] outline-none transition focus:border-[#3167D8] focus:bg-white focus:ring-2 focus:ring-[#3167D8]/10"/></label>)}</div><button type="button" disabled={busy || !recovery.operationId || !recovery.expectedDatabaseValue || !recovery.expectedSheetValue} onClick={() => { if (window.confirm('Đã đối chiếu journal và cả hai phía? Chỉ tiếp tục khi chắc chắn.')) void run(() => quizSyncApi.recover(quizId, recovery)); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B87816] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#935C0B] disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={17}/> Phê duyệt recovery</button></section>}
          </>}
        </main>

        {(choice || confirmBaseline) && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#071A3D]/70 p-4 backdrop-blur-[3px]"><motion.div initial={reduce ? false : { y: 16, scale: .97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} className="w-full max-w-[410px] overflow-hidden rounded-[24px] border border-[#DCE6F6] bg-white shadow-[0_24px_80px_rgba(5,20,49,.35)]"><div className="h-1.5 bg-gradient-to-r from-[#2865E4] via-[#EABF55] to-[#20B87D]"/><div className="p-6 sm:p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#245DD2]"><ShieldCheck size={26}/></span><h3 className="mt-4 text-xl font-black text-[#132B51]">Xác nhận thao tác</h3><p className="mt-2 break-words text-sm leading-6 text-[#61748E]">{choice ? `Giữ ${choice.winner} cho ${choice.cell.table}/${choice.cell.id}/${choice.cell.field}?` : 'Xác nhận baseline ban đầu chỉ khi dữ liệu hai phía đã khớp?'}</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={() => { setChoice(null); setConfirmBaseline(false); }} className="rounded-xl border border-[#D9E3F0] bg-white p-3 text-sm font-bold text-[#435977] transition hover:bg-[#F4F7FC] disabled:opacity-50">Hủy</button><button type="button" disabled={busy} onClick={() => void run(() => choice ? quizSyncApi.resolve(quizId, choice.cell, choice.winner) : quizSyncApi.adopt(quizId))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#245DD2] p-3 text-sm font-extrabold text-white transition hover:bg-[#1848AA] disabled:opacity-50">{busy && <LoaderCircle size={15} className="animate-spin"/>}{busy ? 'Đang xử lý...' : 'Xác nhận'}</button></div></div></motion.div></div>}
      </motion.aside>
    </div>
  );
}
