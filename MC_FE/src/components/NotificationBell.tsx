import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../services/api';

type Notice = { id: number; title: string; message: string; url?: string | null; isRead: boolean; createdAt: string };
export function NotificationBell() {
  const token = useAuthStore(s => s.token);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const auth = () => ({ Authorization: `Bearer ${useAuthStore.getState().token || ''}` });
  const refresh = async () => {
    if (!useAuthStore.getState().token) return;
    try {
      const r = await fetch(`${API_BASE_URL}/notifications`, { headers: auth() });
      if (!r.ok) throw new Error('Không thể tải thông báo');
      const data = await r.json(); setItems(data.items || []); setCount(data.unreadCount || 0); setError('');
    } catch { setError('Không thể tải thông báo. Vui lòng thử lại.'); }
  };
  useEffect(() => {
    if (!token) { setItems([]); setCount(0); return; }
    void refresh(); const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [token]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!token) return null;
  const markRead = async (id: number) => {
    const r = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: auth() });
    if (r.ok) await refresh();
  };
  return <div className="relative" ref={box}>
    <button type="button" aria-label="Thông báo" title="Thông báo" onClick={() => { setOpen(!open); if (!open) void refresh(); }} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50">
      <Bell size={20} />{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-[100] w-[min(90vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3"><strong>Thông báo</strong><button className="flex items-center gap-1 text-xs text-blue-600" onClick={async () => { const r = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH', headers: auth() }); if (r.ok) await refresh(); }}><CheckCheck size={15}/> Đọc tất cả</button></div>
      <div className="max-h-96 overflow-y-auto">{error && <p className="p-4 text-sm text-red-600">{error}</p>}{!error && !items.length && <p className="p-5 text-center text-sm text-slate-500">Chưa có thông báo</p>}
      {items.map(n => <button key={n.id} type="button" onClick={async () => { if (!n.isRead) await markRead(n.id); setOpen(false); if (n.url?.startsWith('/') && !n.url.startsWith('//')) navigate(n.url); }} className={`block w-full border-b px-4 py-3 text-left hover:bg-slate-100 ${n.isRead ? '' : 'bg-blue-50'}`}><div className="text-sm font-semibold">{n.title}</div><p className="mt-1 text-xs text-slate-600">{n.message}</p><time className="mt-1 block text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString('vi-VN')}</time></button>)}
      </div>
    </div>}
  </div>;
}
