import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, ChevronLeft, ChevronRight, History, Search, BookOpen, Users, CreditCard, ShieldAlert, LifeBuoy, Settings2, CheckCircle2, XCircle, CircleHelp } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { ActivityLogItem } from '../types/adminTypes';

const categories = [
  { value: '', label: 'Tất cả', icon: Activity },
  { value: 'COURSES', label: 'Khóa học', icon: BookOpen },
  { value: 'USERS', label: 'Tài khoản', icon: Users },
  { value: 'PAYMENTS_ACCESS', label: 'Thanh toán & quyền học', icon: CreditCard },
  { value: 'MODERATION', label: 'Kiểm duyệt', icon: ShieldAlert },
  { value: 'SUPPORT', label: 'Hỗ trợ', icon: LifeBuoy },
  { value: 'SYSTEM_SETTINGS', label: 'Cấu hình hệ thống', icon: Settings2 },
  { value: 'SYSTEM', label: 'Khác', icon: CircleHelp },
];

const actionLabels: Record<string, string> = {
  COURSE_APPROVED: 'Duyệt khóa học', COURSE_REJECTED: 'Từ chối khóa học', COURSE_RESTORED: 'Khôi phục khóa học',
  COURSE_DELETE_APPROVED: 'Chấp nhận xóa khóa học', COURSE_DELETE_REJECTED: 'Từ chối yêu cầu xóa khóa học',
  GIFT_POLICY_UPDATED: 'Cập nhật chính sách khóa học tặng', USER_STATUS_UPDATED: 'Cập nhật trạng thái tài khoản',
  USER_UPDATED: 'Cập nhật tài khoản', SETTINGS_UPDATED: 'Cập nhật cấu hình hệ thống',
  FORUM_REPORT_RESOLVED: 'Xử lý báo cáo diễn đàn', FORUM_POST_RESTORED: 'Khôi phục bài viết',
  FORUM_POST_STATUS_UPDATED: 'Cập nhật trạng thái bài viết', FORUM_COMMENT_RESTORED: 'Khôi phục bình luận',
  FORUM_COMMENT_STATUS_UPDATED: 'Cập nhật trạng thái bình luận', COURSE_REVIEW_REPORT_RESOLVED: 'Xử lý báo cáo đánh giá',
  COURSE_REVIEW_REPORT_STARTED: 'Bắt đầu xử lý báo cáo đánh giá', COURSE_REVIEW_MODERATED: 'Kiểm duyệt đánh giá',
  COURSE_REVIEWER_BLOCKED: 'Chặn quyền đánh giá', COURSE_REVIEWER_UNBLOCKED: 'Mở lại quyền đánh giá',
  ACCESS_EXTENSION_APPROVED: 'Duyệt gia hạn quyền học', ACCESS_EXTENSION_REJECTED: 'Từ chối gia hạn quyền học',
  PAYMENT_VERIFIED: 'Xác nhận thanh toán', SUPPORT_CREATED: 'Tạo yêu cầu hỗ trợ',
  SUPPORT_INTERNAL_NOTE: 'Thêm ghi chú nội bộ', SUPPORT_REPLY: 'Phản hồi yêu cầu hỗ trợ', SUPPORT_UPDATED: 'Cập nhật yêu cầu hỗ trợ',
};

const entityLabels: Record<string, string> = {
  COURSE: 'Khóa học', COURSE_DELETION_REQUEST: 'Yêu cầu xóa khóa học', USER: 'Tài khoản', PAYMENT: 'Giao dịch',
  ACCESS_EXTENSION_REQUEST: 'Yêu cầu gia hạn', FORUM_REPORT: 'Báo cáo diễn đàn', FORUM_POST: 'Bài viết',
  FORUM_COMMENT: 'Bình luận', COURSE_REVIEW_REPORT: 'Báo cáo đánh giá', COURSE_REVIEW: 'Đánh giá khóa học',
  COURSE_REVIEW_RESTRICTION: 'Quyền đánh giá', SUPPORT_REQUEST: 'Yêu cầu hỗ trợ', PLATFORM_SETTINGS: 'Cấu hình hệ thống',
  COURSE_GIFT_POLICY: 'Chính sách khóa học tặng',
};

const resultStyles: Record<string, { label: string; className: string }> = {
  SUCCESS: { label: 'Thành công', className: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' },
  FAILED: { label: 'Thất bại', className: 'bg-rose-400/10 text-rose-300 ring-rose-400/20' },
};

export const AdminActivityLogsTab: React.FC = () => {
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi.getActivityLogs(page, 25, category || undefined, search || undefined)
      .then(result => {
        if (!active) return;
        setItems(result?.items ?? []);
        setTotalPages(Math.max(1, result?.totalPages ?? 1));
        setTotalItems(result?.totalItems ?? 0);
      })
      .catch(error => { console.error('Không tải được nhật ký hoạt động', error); if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, category, search]);

  const labelForAction = (action: string) => actionLabels[action] ?? action.replaceAll('_', ' ').toLowerCase();
  const labelForEntity = (entity: string) => entityLabels[entity] ?? entity.replaceAll('_', ' ');

  return <section className="p-4 md:p-7">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><div className="flex items-center gap-2 text-blue-400"><Activity className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-widest">Quản trị & minh bạch</span></div><h1 className="mt-2 text-2xl font-black text-white">Nhật ký hoạt động</h1><p className="mt-1 text-sm text-slate-400">Lọc nhanh theo nghiệp vụ hoặc tìm theo người dùng, nội dung và mã đối tượng.</p></div>
      <button onClick={() => { setLoading(true); void adminApi.getActivityLogs(page, 25, category || undefined, search || undefined).then(r => { setItems(r?.items ?? []); setTotalPages(Math.max(1, r?.totalPages ?? 1)); setTotalItems(r?.totalItems ?? 0); }).catch(e => console.error('Không tải được nhật ký hoạt động', e)).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"><RefreshCw className="h-4 w-4"/>Tải lại</button>
    </div>

    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 sm:max-w-lg"><Search className="h-4 w-4 shrink-0 text-slate-500"/><input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Tìm người thực hiện, nội dung, mã đối tượng..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" aria-label="Tìm nhật ký hoạt động"/></label>
        <span className="text-sm text-slate-400">{totalItems.toLocaleString('vi-VN')} hoạt động</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Nhóm nhật ký">
        {categories.map(({ value, label, icon: Icon }) => <button key={value || 'all'} role="tab" aria-selected={category === value} onClick={() => { setPage(1); setCategory(value); }} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${category === value ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}><Icon className="h-4 w-4"/>{label}</button>)}
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      {loading ? <div className="p-10 text-center text-slate-400">Đang tải nhật ký…</div> : items.length === 0 ? <div className="p-12 text-center"><History className="mx-auto h-9 w-9 text-slate-600"/><p className="mt-3 font-semibold text-slate-300">Không tìm thấy hoạt động</p><p className="mt-1 text-sm text-slate-500">Thử đổi nhóm hoặc từ khóa tìm kiếm.</p></div> : <div className="divide-y divide-slate-800">{items.map(item => {
        const resultStyle = resultStyles[item.result?.toUpperCase()] ?? { label: item.result || 'Đã ghi nhận', className: 'bg-slate-700/50 text-slate-300 ring-slate-600' };
        const group = categories.find(x => x.value === item.category)?.label ?? 'Hệ thống';
        const Icon = item.result?.toUpperCase() === 'FAILED' ? XCircle : item.result?.toUpperCase() === 'SUCCESS' ? CheckCircle2 : CircleHelp;
        return <article key={item.id} className="grid gap-3 p-4 md:grid-cols-[155px_minmax(140px,0.7fr)_minmax(220px,1fr)_minmax(220px,1.5fr)] md:items-start">
          <time className="text-xs leading-5 text-slate-500">{new Date(item.occurredAt).toLocaleString('vi-VN')}</time>
          <div><p className="font-semibold text-slate-200">{item.actorName || 'Hệ thống'}</p><p className="mt-1 text-xs text-slate-500">{item.actorUserId ? `ID ${item.actorUserId}` : 'Tác vụ hệ thống'}</p></div>
          <div><span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[11px] font-bold text-blue-300">{group}</span><p className="mt-2 text-sm font-bold text-slate-100">{labelForAction(item.action)}</p><p className="mt-1 text-xs text-slate-500">{labelForEntity(item.entityType)}{item.entityId ? ` · ${item.entityId}` : ''}</p></div>
          <div className="min-w-0"><p className="break-words text-sm leading-6 text-slate-400">{item.summary}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${resultStyle.className}`}><Icon className="h-3.5 w-3.5"/>{resultStyle.label}</span></div>
        </article>;
      })}</div>}
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3"><span className="text-xs text-slate-500">Trang {page} / {totalPages}</span><div className="flex gap-2"><button aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><button aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div></div>
    </div>
  </section>;
};
