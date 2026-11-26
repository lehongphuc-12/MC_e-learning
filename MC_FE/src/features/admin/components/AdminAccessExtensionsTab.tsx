import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, RefreshCw, X } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { AccessExtensionRequest } from '../types/adminTypes';

interface Props { onToast?: (title: string, desc?: string, type?: 'success' | 'error' | 'info' | 'warning') => void; }

export const AdminAccessExtensionsTab: React.FC<Props> = ({ onToast }) => {
  const [items, setItems] = useState<AccessExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [days, setDays] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminApi.getPendingAccessExtensions()); }
    catch { onToast?.('Không tải được yêu cầu', 'Hãy thử tải lại trang.', 'error'); }
    finally { setLoading(false); }
  }, [onToast]);
  useEffect(() => { void refresh(); }, [refresh]);

  const decide = async (item: AccessExtensionRequest, approve: boolean) => {
    setBusyId(item.requestId);
    try {
      await adminApi.decideAccessExtension(item.requestId, approve, days[item.requestId] ?? 30, notes[item.requestId] ?? '');
      onToast?.(approve ? 'Đã gia hạn quyền học' : 'Đã từ chối yêu cầu', `${item.courseTitle} · ${item.learnerName}`, 'success');
      setItems(current => current.filter(x => x.requestId !== item.requestId));
    } catch (error) {
      onToast?.('Không xử lý được yêu cầu', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'error');
    } finally { setBusyId(null); }
  };

  return <section className="p-4 md:p-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-black text-white">Yêu cầu gia hạn quyền học</h1><p className="mt-1 text-sm text-slate-400">Xem lý do, cấp thêm thời gian và lưu lại quyết định.</p></div>
      <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"><RefreshCw className="h-4 w-4" />Tải lại</button>
    </div>
    {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Đang tải yêu cầu…</div>
      : items.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center"><Clock3 className="mx-auto h-8 w-8 text-slate-500" /><h2 className="mt-3 font-bold text-white">Không có yêu cầu đang chờ</h2><p className="mt-1 text-sm text-slate-400">Yêu cầu mới sẽ xuất hiện ở đây.</p></div>
      : <div className="space-y-4">{items.map(item => <article key={item.requestId} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-5">
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-white">{item.courseTitle}</h2><p className="mt-1 text-sm text-slate-400">{item.learnerName} · {item.learnerEmail}</p></div><span className="h-fit rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">Hết hạn {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('vi-VN') : '—'}</span></div>
        <div className="mt-4 rounded-xl bg-slate-950/70 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Lý do học viên</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.reason}</p><p className="mt-2 text-[11px] text-slate-500">Gửi lúc {new Date(item.requestedAt).toLocaleString('vi-VN')}</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
          <label className="text-xs font-semibold text-slate-300">Số ngày cấp thêm<input type="number" min={1} max={90} value={days[item.requestId] ?? 30} onChange={e => setDays(current => ({ ...current, [item.requestId]: Math.max(1, Math.min(90, Number(e.target.value) || 1)) }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs font-semibold text-slate-300">Ghi chú quyết định (tùy chọn)<input value={notes[item.requestId] ?? ''} onChange={e => setNotes(current => ({ ...current, [item.requestId]: e.target.value }))} maxLength={1000} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2"><button disabled={busyId === item.requestId} onClick={() => void decide(item, false)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-900/70 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-950/50 disabled:opacity-50"><X className="h-4 w-4" />Từ chối</button><button disabled={busyId === item.requestId} onClick={() => void decide(item, true)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"><Check className="h-4 w-4" />{busyId === item.requestId ? 'Đang lưu…' : 'Duyệt gia hạn'}</button></div>
      </article>)}</div>}
  </section>;
};
