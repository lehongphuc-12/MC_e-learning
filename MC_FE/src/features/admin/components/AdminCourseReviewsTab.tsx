import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff, Flag, History, Loader2, RefreshCw, Search, ShieldBan, Trash2, Undo2 } from 'lucide-react';
import { courseReviewAdminApi, AdminCourseReview, AdminCourseReviewAction, AdminCourseReviewReport } from '../services/courseReviewAdminApi';

type Props = { onToast?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void };
type Tab = 'reports' | 'reviews' | 'history';
const statusLabel: Record<string, string> = { PENDING: 'Chờ xử lý', UNDER_REVIEW: 'Đang xem xét', DISMISSED: 'Không vi phạm', ACTION_TAKEN: 'Đã xử lý' };
const categoryLabel: Record<string, string> = { IRRELEVANT: 'Không liên quan khóa học', ABUSIVE_LANGUAGE: 'Ngôn từ thô tục / xúc phạm', OTHER: 'Lý do khác' };

export const AdminCourseReviewsTab: React.FC<Props> = ({ onToast }) => {
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<AdminCourseReviewReport[]>([]);
  const [reviews, setReviews] = useState<AdminCourseReview[]>([]);
  const [actions, setActions] = useState<AdminCourseReviewAction[]>([]);
  const [reportStatus, setReportStatus] = useState('PENDING');
  const [reviewStatus, setReviewStatus] = useState('');
  const [search, setSearch] = useState('');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [reviewActionById, setReviewActionById] = useState<Record<number, 'HIDE' | 'REMOVE' | 'RESTORE'>>({});
  const [blockById, setBlockById] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (tab === 'reports') setReports((await courseReviewAdminApi.getReports(1, reportStatus)).items);
      else if (tab === 'reviews') setReviews((await courseReviewAdminApi.getReviews(1, reviewStatus, search)).items);
      else setActions((await courseReviewAdminApi.getActions()).items);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không tải được dữ liệu kiểm duyệt.';
      setError(message); onToast?.('Không tải được dữ liệu', message, 'error');
    } finally { setBusy(false); }
  }, [tab, reportStatus, reviewStatus, search, onToast]);

  useEffect(() => { void load(); }, [load]);

  const reason = (key: string) => (reasonById[key] || '').trim();
  const setReason = (key: string, value: string) => setReasonById(prev => ({ ...prev, [key]: value }));
  const run = async (operation: () => Promise<void>, success: string) => {
    try { await operation(); onToast?.('Đã cập nhật', success, 'success'); await load(); }
    catch (e) { onToast?.('Không thể xử lý', e instanceof Error ? e.message : 'Vui lòng thử lại.', 'error'); }
  };

  const resolve = (item: AdminCourseReviewReport, decision: 'DISMISS' | 'TAKE_ACTION') => {
    const why = reason(`report-${item.reportId}`);
    const action = reviewActionById[item.reportId];
    const block = !!blockById[item.reportId];
    if (why.length < 3) { onToast?.('Cần nhập lý do', 'Lý do xử lý cần ít nhất 3 ký tự để lưu vào lịch sử.', 'error'); return; }
    if (decision === 'TAKE_ACTION' && !action && !block) { onToast?.('Chưa chọn thao tác', 'Hãy ẩn/gỡ đánh giá hoặc chặn quyền đánh giá của học viên.', 'error'); return; }
    void run(() => courseReviewAdminApi.resolveReport(item.reportId, { decision, reviewAction: decision === 'TAKE_ACTION' ? action : undefined, blockAuthorForCourse: decision === 'TAKE_ACTION' && block, reason: why }), decision === 'DISMISS' ? 'Báo cáo đã được đánh dấu không vi phạm.' : 'Đã xử lý báo cáo và lưu lịch sử.');
  };

  const moderate = (item: AdminCourseReview, action: 'HIDE' | 'REMOVE' | 'RESTORE') => {
    const why = reason(`review-${item.reviewId}`);
    if (why.length < 3) { onToast?.('Cần nhập lý do', 'Lý do cần ít nhất 3 ký tự.', 'error'); return; }
    void run(() => courseReviewAdminApi.moderateReview(item.reviewId, { action, reason: why }), 'Trạng thái đánh giá đã được cập nhật.');
  };

  const blockReviewer = (item: AdminCourseReview) => {
    const why = reason(`review-${item.reviewId}`);
    if (why.length < 3) { onToast?.('Cần nhập lý do', 'Lý do chặn cần ít nhất 3 ký tự.', 'error'); return; }
    void run(() => courseReviewAdminApi.blockReviewer(item.courseId, item.learnerId, why, item.reviewId), 'Đã chặn học viên đánh giá khóa học này.');
  };

  const unblockReviewer = (item: AdminCourseReview) => {
    const why = reason(`review-${item.reviewId}`);
    if (why.length < 3) { onToast?.('Cần nhập lý do', 'Lý do gỡ chặn cần ít nhất 3 ký tự.', 'error'); return; }
    void run(() => courseReviewAdminApi.unblockReviewer(item.courseId, item.learnerId, why), 'Đã gỡ chặn học viên cho khóa học này.');
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'reports', label: 'Báo cáo', icon: Flag }, { id: 'reviews', label: 'Đánh giá', icon: Eye }, { id: 'history', label: 'Lịch sử xử lý', icon: History },
  ];

  return <section className="space-y-5 text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Quản lý đánh giá khóa học</h1><p className="mt-1 text-sm text-slate-400">Xem báo cáo, kiểm duyệt nội dung và quản lý quyền đánh giá theo từng khóa học.</p></div>
      <button onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/> Làm mới</button>
    </header>

    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}><Icon size={16}/>{label}</button>)}</nav>

    {tab === 'reports' && <div className="flex justify-end"><select value={reportStatus} onChange={e => setReportStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value="PENDING">Chờ xử lý</option><option value="UNDER_REVIEW">Đang xem xét</option><option value="DISMISSED">Không vi phạm</option><option value="ACTION_TAKEN">Đã xử lý</option><option value="">Tất cả báo cáo</option></select></div>}
    {tab === 'reviews' && <div className="flex flex-wrap gap-3"><label className="flex min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3"><Search size={16} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm khóa học, học viên hoặc nội dung..." className="w-full bg-transparent py-2 text-sm outline-none"/></label><select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value="">Mọi trạng thái</option><option value="PUBLISHED">Đang hiển thị</option><option value="HIDDEN_BY_ADMIN">Đã ẩn</option><option value="REMOVED_BY_ADMIN">Đã gỡ</option><option value="DELETED_BY_AUTHOR">Đã xóa bởi học viên</option></select></div>}
    {error && <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-300">{error}</div>}
    {busy && <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin"/></div>}

    {!busy && tab === 'reports' && <div className="space-y-4">{reports.length === 0 ? <Empty message="Không có báo cáo ở trạng thái này."/> : reports.map(item => <article key={item.reportId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-amber-300">{categoryLabel[item.category] || item.category} · {statusLabel[item.status] || item.status}</p><h2 className="mt-2 font-bold">{item.courseTitle}</h2><p className="mt-1 text-xs text-slate-400">Báo cáo bởi {item.reporterName} ({item.reporterEmail}) · {new Date(item.createdAt).toLocaleString()}</p></div><span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs">Đánh giá #{item.reviewId}</span></div>
      <div className="mt-4 rounded-xl bg-slate-950 p-4"><p className="text-sm text-slate-200">“{item.reviewComment || 'Không có nội dung nhận xét'}”</p><p className="mt-2 text-xs text-slate-400">Người viết: {item.reviewAuthorName} · {item.reviewAuthorEmail} {item.reviewAuthorChoseAnonymous && <span className="text-emerald-300">(đã chọn ẩn danh với học viên; Admin vẫn xem được danh tính)</span>}</p>{item.details && <p className="mt-2 text-sm text-slate-300">Lý do báo cáo: {item.details}</p>}</div>
      {item.status === 'PENDING' || item.status === 'UNDER_REVIEW' ? <><textarea value={reasonById[`report-${item.reportId}`] || ''} onChange={e => setReason(`report-${item.reportId}`, e.target.value)} placeholder="Ghi lý do xử lý (bắt buộc, tối thiểu 3 ký tự)" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500" rows={2}/><div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-950 p-3"><label className="text-sm">Xử lý đánh giá</label><select value={reviewActionById[item.reportId] || ''} onChange={e => setReviewActionById(prev => ({ ...prev, [item.reportId]: e.target.value as 'HIDE' | 'REMOVE' | 'RESTORE' }))} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"><option value="">Không đổi</option><option value="HIDE">Ẩn đánh giá</option><option value="REMOVE">Gỡ đánh giá</option><option value="RESTORE">Khôi phục đánh giá</option></select><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!blockById[item.reportId]} onChange={e => setBlockById(prev => ({ ...prev, [item.reportId]: e.target.checked }))}/>Chặn tác giả đánh giá khóa học này</label></div><div className="flex flex-wrap gap-2"><button onClick={() => resolve(item, 'DISMISS')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Không vi phạm</button>{item.status === 'PENDING' && <button onClick={() => void run(() => courseReviewAdminApi.startReportReview(item.reportId), 'Đã nhận báo cáo để xem xét.')} className="rounded-lg border border-amber-700/60 px-3 py-2 text-sm text-amber-300">Nhận xem xét</button>}<button onClick={() => resolve(item, 'TAKE_ACTION')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500"><Check size={15}/>Áp dụng xử lý</button></div></div></> : item.resolutionNote && <p className="mt-3 text-sm text-slate-400">Ghi chú xử lý: {item.resolutionNote}</p>}
    </article>)}</div>}

    {!busy && tab === 'reviews' && <div className="space-y-4">{reviews.length === 0 ? <Empty message="Không tìm thấy đánh giá."/> : reviews.map(item => <article key={item.reviewId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{item.courseTitle}</h2><p className="mt-1 text-sm text-slate-300">{item.rating} / 5 ★ · {item.comment || 'Không có nhận xét'}</p><p className="mt-1 text-xs text-slate-400">{item.learnerName} ({item.learnerEmail}){item.isAnonymous ? ' · Ẩn danh công khai' : ''} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs">{item.status}</span></div><textarea value={reasonById[`review-${item.reviewId}`] || ''} onChange={e => setReason(`review-${item.reviewId}`, e.target.value)} placeholder="Lý do kiểm duyệt / chặn (tối thiểu 3 ký tự)" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500" rows={2}/><div className="mt-3 flex flex-wrap gap-2">{item.status === 'PUBLISHED' && <><button onClick={() => moderate(item, 'HIDE')} className="inline-flex items-center gap-1 rounded-lg border border-amber-700/50 px-3 py-2 text-sm text-amber-300"><EyeOff size={15}/>Ẩn</button><button onClick={() => moderate(item, 'REMOVE')} className="inline-flex items-center gap-1 rounded-lg border border-rose-800/60 px-3 py-2 text-sm text-rose-300"><Trash2 size={15}/>Gỡ</button></>}{['HIDDEN_BY_ADMIN', 'REMOVED_BY_ADMIN'].includes(item.status) && <button onClick={() => moderate(item, 'RESTORE')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-800/60 px-3 py-2 text-sm text-emerald-300"><Undo2 size={15}/>Khôi phục</button>}{item.isLearnerBlocked ? <button onClick={() => unblockReviewer(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm"><ShieldBan size={15}/>Gỡ chặn tác giả</button> : <button onClick={() => blockReviewer(item)} className="inline-flex items-center gap-1 rounded-lg border border-rose-800/60 px-3 py-2 text-sm text-rose-300"><ShieldBan size={15}/>Chặn tác giả trong khóa học</button>}</div></article>)}</div>}

    {!busy && tab === 'history' && <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">{actions.length === 0 ? <Empty message="Chưa có thao tác kiểm duyệt."/> : actions.map(action => <div key={action.actionId} className="border-b border-slate-800 p-4 last:border-b-0"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{action.actionType} · {action.courseTitle}</p><time className="text-xs text-slate-400">{new Date(action.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm text-slate-300">Admin: {action.adminName}{action.targetLearnerName ? ` · Học viên: ${action.targetLearnerName}` : ''}{action.reviewId ? ` · Đánh giá #${action.reviewId}` : ''}{action.reportId ? ` · Báo cáo #${action.reportId}` : ''}</p><p className="mt-1 text-sm text-slate-400">Lý do: {action.reason}</p></div>)}</div>}
  </section>;
};

const Empty: React.FC<{ message: string }> = ({ message }) => <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-sm text-slate-400"><AlertTriangle className="mx-auto mb-2 h-5 w-5"/>{message}</div>;
