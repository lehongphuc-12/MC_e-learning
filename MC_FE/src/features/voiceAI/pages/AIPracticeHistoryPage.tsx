
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Sparkles,
  Mic2,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ArrowUpRight,
  Eye,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { FileDown } from 'lucide-react';
import { printAIPracticePDF } from '../api/AIPracticePDF';
import { aiPracticeApi } from '../api/aiPracticeApi';
import { AIPracticeFeedback } from '../components/AIPracticeFeedback';
import type {
  AIPracticeHistoryItem,
  AIPracticeResult,
} from '../types/aiPracticeTypes';

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'PROCESSING':
      return 'Đang phân tích';
    case 'PENDING':
      return 'Đang chờ';
    case 'FAILED':
      return 'Phân tích thất bại';
    default:
      return status;
  }
}

function getStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function AIPracticeHistoryPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<AIPracticeHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedResult, setSelectedResult] =
    useState<AIPracticeResult | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await aiPracticeApi.history(page, PAGE_SIZE);
      setItems(response);
    } catch (err) {
      console.error('Không thể tải lịch sử AI:', err);
      setError('Không thể tải lịch sử luyện tập. Vui lòng thử lại.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openDetail = async (practiceSessionId: number) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedResult(null);

    try {
      const response = await aiPracticeApi.detail(practiceSessionId);
      setSelectedResult(response);
    } catch (err) {
      console.error('Không thể tải feedback AI:', err);
      setDetailError(
        'Không thể mở kết quả AI. Phiên luyện tập có thể chưa hoàn thành.'
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedResult(null);
    setDetailError('');
  };

  const canGoNext = items.length === PAGE_SIZE;
  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter;
    const text = `${item.practiceSessionId} ${item.lessonId ?? ''} ${item.practiceMode}`.toLowerCase();
    return matchesStatus && text.includes(query.trim().toLowerCase());
  });
  const completedCount = items.filter(item => item.status.toUpperCase() === 'COMPLETED').length;
  const processingCount = items.filter(item => ['PROCESSING','PENDING'].includes(item.status.toUpperCase())).length;
  const failedCount = items.filter(item => item.status.toUpperCase() === 'FAILED').length;

  return (
    <main className="min-h-screen bg-[#f2f6ff] px-3 py-5 text-[#12264a] sm:px-6">
      <style>{`
        @keyframes historyIn {from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:translateY(0)}}
        @keyframes historyGlow {0%,100% {opacity:.45} 50% {opacity:.9}}
        .history-enter {animation:historyIn .42s cubic-bezier(.2,.8,.2,1) both}
        .history-row {transition:background-color .2s,transform .2s}
        .history-row:hover {background:#f3f7ff}
        @media(prefers-reduced-motion:reduce){.history-enter{animation:none}.history-row{transition:none}}
      `}</style>
      <div className="mx-auto max-w-[1180px] space-y-4">
        <header className="history-enter overflow-hidden rounded-[22px] border border-[#dbe6fa] bg-white shadow-[0_12px_36px_-28px_rgba(24,69,150,.4)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9f1ff] text-[#1559ff]"><ClipboardList size={23}/></div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.16em] text-[#1559ff]"><Sparkles size={12}/> MSEEK · AI VOICE COACH</span>
                <h1 className="text-xl font-black tracking-tight sm:text-[25px]">Lịch sử luyện tập</h1>
                <p className="mt-0.5 text-xs text-[#7b8eac]">Nhìn lại hành trình, nhận xét và tiến bộ sau mỗi bài nói.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe5f5] bg-white px-3 py-2.5 text-xs font-bold text-[#45618a] transition hover:bg-[#edf4ff]"><ArrowLeft size={15}/> Quay lại</button>
              <button type="button" onClick={() => void loadHistory()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1559ff] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(21,89,255,.18)] transition hover:-translate-y-0.5 hover:bg-[#0b49dc] disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/> Làm mới</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-[#edf2fb] bg-[#fafcff] px-4 py-3 sm:grid-cols-4 sm:px-6">
            {[
              {label:'Phiên trên trang',value:items.length,icon:ClipboardList,style:'bg-blue-50 text-[#1559ff]'},
              {label:'Hoàn thành',value:completedCount,icon:CheckCircle2,style:'bg-emerald-50 text-emerald-600'},
              {label:'Đang xử lý',value:processingCount,icon:Clock3,style:'bg-amber-50 text-amber-600'},
              {label:'Thất bại',value:failedCount,icon:AlertCircle,style:'bg-rose-50 text-rose-600'},
            ].map(({label,value,icon:Icon,style})=>(
              <div key={label} className="flex items-center gap-3 rounded-xl border border-[#e7eef9] bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style}`}><Icon size={19}/></div>
                <div><p className="text-xl font-black leading-none">{value}</p><p className="mt-1 text-[11px] font-medium text-[#7c8faa]">{label}</p></div>
              </div>
            ))}
          </div>
        </header>

        <section className="history-enter overflow-hidden rounded-[22px] border border-[#dbe6fa] bg-white shadow-[0_12px_36px_-28px_rgba(24,69,150,.4)]" style={{animationDelay:'70ms'}}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9f0fa] px-5 py-4 sm:px-6">
            <div><h2 className="text-sm font-black sm:text-base">Các phiên luyện tập của bạn</h2><p className="mt-1 text-xs text-[#8293ae]">Lọc, tìm kiếm và xem lại phản hồi AI.</p></div>
            <span className="rounded-full bg-[#edf4ff] px-3 py-1.5 text-[11px] font-extrabold text-[#1559ff]">Trang {page}</span>
          </div>
          <div className="flex flex-col gap-2 border-b border-[#e9f0fa] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <label className="relative w-full sm:max-w-[340px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a7c2]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm mã phiên, mã bài học..." className="w-full rounded-xl border border-[#dce7f7] bg-[#f8fbff] py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-[#1559ff] focus:ring-2 focus:ring-[#1559ff]/10"/></label>
            <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-[#dce7f7] bg-[#f8fbff] px-3 py-2.5 text-xs font-bold text-[#46618a] outline-none focus:border-[#1559ff]">
              <option value="ALL">Tất cả trạng thái</option><option value="COMPLETED">Đã hoàn thành</option><option value="PROCESSING">Đang phân tích</option><option value="PENDING">Đang chờ</option><option value="FAILED">Thất bại</option>
            </select>
          </div>
          {loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-bold text-[#1559ff]"><Loader2 className="animate-spin" size={22}/> Đang tải lịch sử...</div> :
           error ? <div className="px-6 py-14 text-center"><p role="alert" className="text-sm text-rose-600">{error}</p><button type="button" onClick={()=>void loadHistory()} className="mt-4 rounded-xl bg-[#1559ff] px-4 py-2 text-xs font-bold text-white">Thử lại</button></div> :
           filteredItems.length===0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4ff] text-[#1559ff]"><Mic2 size={28}/></div><h3 className="mt-4 text-sm font-black">{items.length===0?'Chưa có phiên luyện tập':'Không tìm thấy phiên phù hợp'}</h3><p className="mt-1 text-xs text-[#8496b0]">Các phiên AI của bạn sẽ xuất hiện tại đây.</p></div> :
           <div className="overflow-x-auto">
             <table className="w-full min-w-[710px] text-left text-xs">
               <thead className="bg-[#f4f8ff] text-[11px] font-bold text-[#7186a8]"><tr><th className="px-5 py-3.5">Phiên luyện tập</th><th className="px-5 py-3.5">Hình thức</th><th className="px-5 py-3.5">Thời gian</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead>
               <tbody className="divide-y divide-[#eef2fa]">
                 {filteredItems.map(item=><tr key={item.practiceSessionId} className="history-row">
                   <td className="px-5 py-3.5"><p className="font-black text-[#17396d]">Phiên #{item.practiceSessionId}</p><p className="mt-1 text-[11px] text-[#8799b3]">{item.lessonId?`Bài học #${item.lessonId}`:'Luyện tập tự do'}</p></td>
                   <td className="px-5 py-3.5 text-[#536c94]">{item.practiceMode==='COURSE'?'Trong khóa học':'Luyện tập tự do'}</td>
                   <td className="px-5 py-3.5 text-[#536c94]"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{formatDate(item.createdAt)}</span></td>
                   <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${getStatusClass(item.status)}`}>{getStatusLabel(item.status)}</span></td>
                   <td className="px-5 py-3.5 text-right"><button type="button" disabled={detailLoading||item.status.toUpperCase()!=='COMPLETED'} onClick={()=>void openDetail(item.practiceSessionId)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe0ff] bg-[#eff5ff] px-3 py-2 text-[11px] font-extrabold text-[#1559ff] transition hover:-translate-y-px hover:bg-[#dfeaff] disabled:cursor-not-allowed disabled:opacity-40"><Eye size={14}/> Xem kết quả <ArrowUpRight size={13}/></button></td>
                 </tr>)}
               </tbody>
             </table>
           </div>}
          <div className="flex items-center justify-between border-t border-[#e9f0fa] px-5 py-3 sm:px-6"><p className="text-xs text-[#8395af]">Trang {page} · {filteredItems.length} phiên hiển thị</p><div className="flex gap-2"><button type="button" aria-label="Trang trước" disabled={loading||page===1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border border-[#dce7f7] p-2 text-[#4b6590] transition hover:bg-[#edf4ff] disabled:opacity-40"><ChevronLeft size={18}/></button><button type="button" aria-label="Trang sau" disabled={loading||!canGoNext} onClick={()=>setPage(p=>p+1)} className="rounded-lg border border-[#dce7f7] p-2 text-[#4b6590] transition hover:bg-[#edf4ff] disabled:opacity-40"><ChevronRight size={18}/></button></div></div>
        </section>
      </div>

      {(selectedResult||detailLoading||detailError) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#081936]/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Chi tiết phản hồi AI">
          <div className="history-enter flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-[#e8eef8] px-5 py-4"><div><h2 className="text-base font-black text-[#142c53]">Chi tiết phản hồi AI</h2>{selectedResult&&<p className="mt-1 text-xs text-[#8092ae]">Phiên #{selectedResult.practiceSessionId} · {formatDate(selectedResult.createdAt)}</p>}</div><button type="button" onClick={closeDetail} aria-label="Đóng chi tiết" className="rounded-xl bg-[#eff5ff] p-2 text-[#1559ff] transition hover:bg-[#deebff]"><X size={19}/></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {detailLoading&&<div className="flex items-center gap-2 py-10 text-sm text-[#1559ff]"><Loader2 size={20} className="animate-spin"/> Đang tải phản hồi...</div>}
              {detailError&&<p role="alert" className="py-8 text-sm text-rose-600">{detailError}</p>}
              {selectedResult&&<AIPracticeFeedback result={selectedResult}/>}
            </div>
            {selectedResult&&<div className="flex justify-end border-t border-[#e8eef8] px-5 py-3"><button type="button" onClick={()=>{const opened=printAIPracticePDF(selectedResult);if(!opened)window.alert('Trình duyệt đang chặn cửa sổ mới. Hãy cho phép popup để xuất PDF.');}} className="inline-flex items-center gap-2 rounded-xl bg-[#1559ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0a49df]"><FileDown size={16}/> In / Lưu PDF</button></div>}
          </div>
        </div>
      )}
    </main>
  );
}
