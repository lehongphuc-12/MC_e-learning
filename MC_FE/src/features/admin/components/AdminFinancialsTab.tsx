import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Percent,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Eye,
  RotateCcw,
  AlertTriangle,
  Wallet,
  CalendarClock,
  Loader2,
  Inbox,
} from 'lucide-react';
import { PayoutRequest } from '../types/adminTypes';
import { paymentApi } from '../../payment/api/paymentApi';
import type {
  PaymentDetailsDto,
  VerifyPaymentResultDto,
} from '../../payment/types/paymentTypes';
import { request } from '../../../services/api';

/* ------------------------------------------------------------------ */
/*  Keyframes (tự chứa, không phụ thuộc cấu hình Tailwind)             */
/* ------------------------------------------------------------------ */

const MOTION_CSS = `
@keyframes af-rise     { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes af-row      { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes af-fade     { from { opacity: 0; } to { opacity: 1; } }
@keyframes af-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes af-pop      { from { opacity: 0; transform: translateY(26px) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes af-pop-out  { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(14px) scale(.97); } }
@keyframes af-step     { 0% { opacity: 0; transform: scale(.35); } 65% { opacity: 1; transform: scale(1.16); } 100% { opacity: 1; transform: scale(1); } }
@keyframes af-shimmer  { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@keyframes af-sheen    { 0%, 60% { transform: translateX(-170%); } 100% { transform: translateX(520%); } }

.af-rise     { animation: af-rise .5s cubic-bezier(.2,.75,.25,1) both; }
.af-row      { animation: af-row .38s ease-out both; }
.af-fade     { animation: af-fade .22s ease-out both; }
.af-fade-out { animation: af-fade-out .18s ease-in both; }
.af-pop      { animation: af-pop .38s cubic-bezier(.2,.9,.25,1.05) both; }
.af-pop-out  { animation: af-pop-out .18s ease-in both; }
.af-step     { animation: af-step .45s cubic-bezier(.2,.9,.3,1) both; }
.af-skel     { background: linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%); background-size: 200% 100%; animation: af-shimmer 1.4s linear infinite; }
.af-sheen    { animation: af-sheen 7s ease-in-out infinite; }
.af-noscroll { scrollbar-width: none; }
.af-noscroll::-webkit-scrollbar { display: none; }

/* Modal render ra <body> nên luôn nằm trên header/sidebar của admin layout */
.af-layer { position: fixed; inset: 0; z-index: 2147483000; }

@media (prefers-reduced-motion: reduce) {
  .af-rise, .af-row, .af-fade, .af-fade-out, .af-pop, .af-pop-out, .af-step,
  .af-skel, .af-sheen, .animate-spin, .animate-pulse, .animate-ping {
    animation: none !important;
  }
}
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

/* ------------------------------------------------------------------ */
/*  Cổng render ra <body>                                              */
/* ------------------------------------------------------------------ */

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

/* ------------------------------------------------------------------ */
/*  Đếm số chạy                                                        */
/* ------------------------------------------------------------------ */

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
};

const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 900 }) => (
  <>{useCountUp(value, duration).toLocaleString('vi-VN')}</>
);

/* ------------------------------------------------------------------ */
/*  Nhãn trạng thái thanh toán                                         */
/* ------------------------------------------------------------------ */

const PaymentStatusTag: React.FC<{ status?: string | null }> = ({ status }) => {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/25">
        <CheckCircle2 className="h-3 w-3" /> Thành công
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-400/25">
        <Clock className="h-3 w-3 animate-pulse" /> Chờ xử lý
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 ring-1 ring-inset ring-rose-400/25">
      <XCircle className="h-3 w-3" /> Thất bại
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Khung modal dùng chung                                             */
/* ------------------------------------------------------------------ */

const Modal: React.FC<{
  onClose: () => void;
  width?: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ onClose, width = 'max-w-lg', accent = 'border-slate-800', children }) => {
  const [closing, setClosing] = useState(false);

  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, 180);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Portal>
      <div
        className={`af-layer flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10 ${
          closing ? 'af-fade-out' : 'af-fade'
        }`}
        onClick={close}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`relative my-auto w-full ${width} overflow-hidden rounded-2xl border bg-[#0B132B] ${accent} shadow-2xl ${
            closing ? 'af-pop-out' : 'af-pop'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            aria-label="Đóng"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    </Portal>
  );
};

/* ------------------------------------------------------------------ */

interface AdminFinancialsTabProps {
  payouts: PayoutRequest[];
  onApprovePayout: (payoutId: string) => void;
  onRejectPayout: (payoutId: string) => void;
  commissionRate: number;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'SUCCESS', label: 'Thành công' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'FAILED', label: 'Thất bại' },
];

export const AdminFinancialsTab: React.FC<AdminFinancialsTabProps> = ({
  payouts,
  onApprovePayout,
  onRejectPayout,
  commissionRate,
}) => {
  // Quản lý trạng thái chuyển đổi giữa 2 tab con bên trong trang Tài chính
  const [subTab, setSubTab] = useState<'payout' | 'tuition'>('tuition');

  // State cho phần Quản lý học phí (AD06 & AD07)
  const [payments, setPayments] = useState<PaymentDetailsDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // States cho các Modal chi tiết, đối soát và thu hồi
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetailsDto | null>(null);
  const [verifyModal, setVerifyModal] = useState<VerifyPaymentResultDto | null>(null);
  const [revokeModal, setRevokeModal] = useState<PaymentDetailsDto | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Đơn đang được đối soát, để hiện spinner đúng trên hàng đó
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // Thanh trượt của 2 tab con
  const subTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  // ============================================================
  // AD07 - LẤY DANH SÁCH THANH TOÁN (dùng paymentApi thay vì fetch trực tiếp)
  // ============================================================
  const fetchPayments = async () => {
    try {
      setLoading(true);

      const response = await paymentApi.searchPaymentsAdmin({
        page: 1,
        pageSize: 20,
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
      });

      if (response.success && response.data) {
        setPayments(response.data.items ?? []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thanh toán:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'tuition') {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, statusFilter]);

  // ============================================================
  // AD07 - XEM CHI TIẾT ĐƠN
  // ============================================================
  const handleViewDetails = async (paymentId: number) => {
    try {
      const response = await paymentApi.getPaymentAdmin(paymentId);

      if (response.success && response.data) {
        setSelectedPayment(response.data);
      } else {
        alert(response.message || 'Không thể lấy chi tiết đơn hàng.');
      }
    } catch (err) {
      console.error('Lỗi lấy chi tiết payment:', err);
      alert('Không thể lấy chi tiết đơn hàng.');
    }
  };

  // ============================================================
  // AD06 - ĐỐI SOÁT & XÁC THỰC VNPAY
  // ============================================================
  const handleVerifyPayment = async (paymentId: number) => {
    try {
      setIsProcessing(true);
      setVerifyingId(paymentId);

      const response = await paymentApi.verifyPaymentAdmin(paymentId);

      if (response.success && response.data) {
        setVerifyModal(response.data);
        await fetchPayments();
      } else {
        alert(response.message || 'Đối soát thất bại.');
      }
    } catch (err) {
      console.error('Lỗi đối soát payment:', err);
      alert('Không thể kết nối đến máy chủ để đối soát giao dịch.');
    } finally {
      setIsProcessing(false);
      setVerifyingId(null);
    }
  };

  // ============================================================
  // THU HỒI GHI DANH KHÓA HỌC (AD07 - Admin Revoke)
  // ============================================================
  const handleRevokeEnrollment = async () => {
    if (!revokeModal) return;
    try {
      setIsProcessing(true);
      const result = await request<any>(
        `/v1/admin/enrollments/${revokeModal.enrollmentId}/revoke`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: revokeReason || 'Admin thu hồi quyền truy cập',
            isRefunded: true,
          }),
        }
      );

      if (result?.success || result === true) {
        alert('Thu hồi ghi danh khóa học thành công!');
        setRevokeModal(null);
        setRevokeReason('');
        fetchPayments();
      } else {
        alert(result?.message || 'Không thể thu hồi khóa học.');
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi kết nối khi thực hiện thu hồi ghi danh.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const totalPendingAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

  // Số liệu nhanh của danh sách học phí đang hiển thị
  const successPayments = payments.filter((p) => p.paymentStatus === 'SUCCESS');
  const collected = successPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingCount = payments.filter((p) => p.paymentStatus === 'PENDING').length;

  /* ---------- Thanh trượt tab con ---------- */
  const measureSubTabs = () => {
    const el = subTabRefs.current[subTab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  };

  useLayoutEffect(() => {
    measureSubTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  useEffect(() => {
    window.addEventListener('resize', measureSubTabs);
    return () => window.removeEventListener('resize', measureSubTabs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  return (
    <div className="af-fade space-y-6 text-white">
      <style>{MOTION_CSS}</style>

      {/* Tiêu đề trang */}
      <div className="af-rise" style={delay(0)}>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-400/25">
            <DollarSign className="h-5 w-5" />
          </span>
          <span>Quản Lý Tài Chính &amp; Thanh Toán</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Hệ thống quản lý dòng tiền, duyệt rút tiền giảng viên và đối soát học phí học viên.
        </p>
      </div>

      {/* 2 TAB CON Ở PHÍA TRÊN — nền xanh trượt mượt sang tab đang chọn */}
      <div
        className="af-rise relative flex w-fit items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5"
        style={delay(80)}
      >
        {indicator.ready && (
          <span
            aria-hidden
            className="absolute bottom-1.5 top-1.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: 'all 350ms cubic-bezier(.3,.9,.3,1)',
            }}
          />
        )}

        {([
          { key: 'tuition' as const, label: 'Quản Lý Học Phí', Icon: CreditCard },
          { key: 'payout' as const, label: 'Tài Chính Giảng Viên (Payout)', Icon: DollarSign },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            ref={(el) => {
              subTabRefs.current[key] = el;
            }}
            onClick={() => setSubTab(key)}
            className={`relative z-10 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors duration-200 ${
              subTab === key ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* NỘI DUNG TAB 1: QUẢN LÝ HỌC PHÍ (AD06 & AD07)                */}
      {/* ============================================================ */}
      {subTab === 'tuition' && (
        <div key="tuition" className="space-y-5">
          {/* Số liệu nhanh */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="af-rise relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0a1440] to-[#16308f] px-5 py-4"
              style={delay(140)}
            >
              <span
                aria-hidden
                className="af-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Wallet className="h-5 w-5 text-blue-200" />
              </div>
              <div className="relative min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-blue-100/70">Học phí đã thu</p>
                <p className="truncate text-xl font-black tabular-nums">
                  <CountUp value={collected} duration={1100} />{' '}
                  <span className="text-xs font-normal text-blue-100/70">VNĐ</span>
                </p>
              </div>
            </div>

            <div
              className="af-rise flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
              style={delay(210)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black tabular-nums text-white">
                  <CountUp value={successPayments.length} />
                </p>
                <p className="text-[11px] text-slate-400">Giao dịch thành công</p>
              </div>
            </div>

            <div
              className="af-rise flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
              style={delay(280)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Clock className={`h-5 w-5 ${pendingCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <p className="text-xl font-black tabular-nums text-white">
                  <CountUp value={pendingCount} />
                </p>
                <p className="text-[11px] text-slate-400">Đơn cần đối soát</p>
              </div>
            </div>
          </div>

          {/* Bộ lọc & Tìm kiếm */}
          <div
            className="af-rise flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:flex-row"
            style={delay(340)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPayments();
              }}
              className="relative w-full md:w-96"
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã giao dịch, tên học viên, email..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-9 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            <div className="flex w-full items-center justify-end gap-2 md:w-auto">
              <div className="af-noscroll flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key || 'ALL'}
                    onClick={() => setStatusFilter(f.key)}
                    className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === f.key
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchPayments}
                className="shrink-0 cursor-pointer rounded-xl bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white active:scale-95"
                title="Làm mới"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bảng danh sách học phí */}
          <div
            className="af-rise overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl"
            style={delay(400)}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Mã Giao Dịch (Ref)</th>
                    <th className="px-6 py-4">Học Viên Mua</th>
                    <th className="px-6 py-4">Khóa Học Đăng Ký</th>
                    <th className="px-6 py-4">Số Tiền</th>
                    <th className="px-6 py-4">Trạng Thái</th>
                    <th className="px-6 py-4">Thời Gian</th>
                    <th className="px-6 py-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.14 }}>
                        <td className="px-6 py-4">
                          <div className="af-skel h-3.5 w-36 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel h-3.5 w-28 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel h-3.5 w-40 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel h-3.5 w-24 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel h-5 w-24 rounded-full" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel h-3.5 w-24 rounded" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="af-skel ml-auto h-6 w-28 rounded-lg" />
                        </td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16">
                        <div className="af-rise flex flex-col items-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/70 ring-8 ring-slate-800/30">
                            <Inbox className="h-7 w-7 text-slate-500" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-300">
                            {keyword || statusFilter
                              ? 'Không tìm thấy giao dịch phù hợp'
                              : 'Chưa có giao dịch mua khóa học nào'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {keyword || statusFilter
                              ? 'Thử đổi từ khóa hoặc chọn lại bộ lọc trạng thái.'
                              : 'Giao dịch của học viên sẽ xuất hiện tại đây.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p, i) => (
                      <tr
                        key={p.paymentId}
                        className="af-row group transition hover:bg-slate-800/40"
                        style={delay(Math.min(i, 10) * 45)}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-blue-400">
                          {p.merchantTxnRef}
                          <div className="text-[10px] font-normal text-slate-500">
                            VNPay No: {p.vnPayTransactionNo || 'Chưa có'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{p.learnerName}</div>
                          <div className="text-[10px] text-slate-400">{p.learnerEmail}</div>
                        </td>
                        <td className="max-w-[200px] truncate px-6 py-4 font-medium text-slate-300">
                          {p.courseTitle}
                        </td>
                        <td className="px-6 py-4 font-bold tabular-nums text-emerald-400">
                          {Number(p.amount).toLocaleString('vi-VN')} {p.currency}
                        </td>
                        <td className="px-6 py-4">
                          <PaymentStatusTag status={p.paymentStatus} />
                        </td>
                        <td className="px-6 py-4 text-[11px] text-slate-400">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-80 transition group-hover:opacity-100">
                            <button
                              onClick={() => handleViewDetails(p.paymentId)}
                              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-90"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleVerifyPayment(p.paymentId)}
                              disabled={isProcessing}
                              className="flex cursor-pointer items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-600/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 transition hover:bg-blue-600/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Đối soát AD06"
                            >
                              {verifyingId === p.paymentId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              Đối soát
                            </button>

                            {p.enrollmentStatus === 'ACTIVE' && (
                              <button
                                onClick={() => setRevokeModal(p)}
                                className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 active:scale-90"
                                title="Thu hồi ghi danh"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* NỘI DUNG TAB 2: TÀI CHÍNH GIẢNG VIÊN (PAYOUT)                */}
      {/* ============================================================ */}
      {subTab === 'payout' && (
        <div key="payout" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div
              className="af-rise space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              style={delay(140)}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Phí hoa hồng nền tảng
              </span>
              <div className="flex items-center gap-2 text-2xl font-black tabular-nums text-emerald-400">
                <Percent className="h-6 w-6" />
                <span>
                  <CountUp value={commissionRate} duration={800} />%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Khấu trừ tự động trên mỗi giao dịch.</p>
            </div>

            <div
              className="af-rise space-y-2 rounded-2xl border border-amber-500/30 bg-slate-900/70 p-5"
              style={delay(210)}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                Yêu cầu rút tiền chờ duyệt
              </span>
              <h3 className="text-2xl font-black tabular-nums text-amber-300">
                <CountUp value={totalPendingAmount} duration={1100} />{' '}
                <span className="text-xs font-normal">VNĐ</span>
              </h3>
              <p className="text-[11px] text-slate-400">{pendingPayouts.length} lệnh chờ xử lý.</p>
            </div>

            <div
              className="af-rise space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              style={delay(280)}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Chu kỳ thanh toán
              </span>
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <CalendarClock className="h-5 w-5 text-slate-400" />
                Ngày 10 hàng tháng
              </h3>
              <p className="text-[11px] text-slate-500">Đã đối soát doanh thu thành công.</p>
            </div>
          </div>

          <div
            className="af-rise space-y-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
            style={delay(340)}
          >
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Clock className="h-5 w-5 text-amber-400" />
              <span>Danh Sách Yêu Cầu Rút Tiền Giảng Viên</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Giảng Viên</th>
                    <th className="px-6 py-4">Số Tiền Rút</th>
                    <th className="px-6 py-4">Thông Tin Ngân Hàng</th>
                    <th className="px-6 py-4">Ngày Gửi</th>
                    <th className="px-6 py-4">Trạng Thái</th>
                    <th className="px-6 py-4 text-right">Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12">
                        <div className="af-rise flex flex-col items-center text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-8 ring-slate-800/30">
                            <Wallet className="h-6 w-6 text-slate-500" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-300">
                            Không có yêu cầu rút tiền nào
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Lệnh rút tiền của giảng viên sẽ hiện ở đây khi được gửi lên.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payouts.map((po, i) => (
                      <tr
                        key={po.id}
                        className="af-row group transition hover:bg-slate-800/40"
                        style={delay(Math.min(i, 10) * 45)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{po.instructorName}</div>
                          <div className="text-[10px] text-slate-400">{po.instructorEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold tabular-nums text-emerald-400">
                          {po.amount.toLocaleString('vi-VN')} VNĐ
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">{po.bankName}</div>
                          <div className="font-mono text-slate-300">{po.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{po.requestedDate}</td>
                        <td className="px-6 py-4">
                          {po.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/25">
                              <Clock className="h-3 w-3 animate-pulse" /> Chờ Duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                              <CheckCircle className="h-3 w-3" /> Đã Chuyển
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {po.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2 opacity-80 transition group-hover:opacity-100">
                              <button
                                onClick={() => onRejectPayout(po.id)}
                                className="cursor-pointer rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 active:scale-90"
                                title="Từ chối"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onApprovePayout(po.id)}
                                className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-95"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Duyệt
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL XEM CHI TIẾT ĐƠN                                       */}
      {/* ============================================================ */}
      {selectedPayment && (
        <Modal onClose={() => setSelectedPayment(null)}>
          <div className="bg-gradient-to-br from-[#0a1440] to-[#16308f] px-6 pb-6 pt-5">
            <p className="text-xs text-blue-100/70">Đơn thanh toán #{selectedPayment.paymentId}</p>
            <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-white">
              <CountUp value={Number(selectedPayment.amount) || 0} duration={900} />
              <span className="ml-2 align-middle text-sm font-bold text-blue-100/70">
                {selectedPayment.currency}
              </span>
            </p>
            <p className="mt-2 line-clamp-2 pr-8 text-sm font-medium text-blue-50/90">
              {selectedPayment.courseTitle}
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div className="divide-y divide-dashed divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-xs">
              {[
                {
                  label: 'Mã đơn',
                  node: <span className="font-mono font-bold text-blue-300">{selectedPayment.merchantTxnRef}</span>,
                },
                {
                  label: 'Học viên',
                  node: (
                    <span className="block max-w-[260px] truncate font-semibold text-white">
                      {selectedPayment.learnerName} ({selectedPayment.learnerEmail})
                    </span>
                  ),
                },
                {
                  label: 'Mã VNPay',
                  node: (
                    <span className="font-mono text-slate-300">
                      {selectedPayment.vnPayTransactionNo || 'Chưa có'}
                    </span>
                  ),
                },
                {
                  label: 'Trạng thái ghi danh',
                  node: (
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-slate-200 ring-1 ring-inset ring-slate-700">
                      {selectedPayment.enrollmentStatus}
                    </span>
                  ),
                },
                {
                  label: 'Trạng thái thanh toán',
                  node: <PaymentStatusTag status={selectedPayment.paymentStatus} />,
                },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="af-rise flex items-center justify-between gap-4 py-3"
                  style={delay(120 + i * 60)}
                >
                  <span className="shrink-0 text-slate-400">{row.label}</span>
                  <span className="min-w-0 text-right">{row.node}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedPayment(null)}
              className="w-full cursor-pointer rounded-xl bg-slate-800 py-3 text-xs font-bold text-white transition hover:bg-slate-700 active:scale-[0.99]"
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL AD06 KẾT QUẢ ĐỐI SOÁT                                  */}
      {/* ============================================================ */}
      {verifyModal && (
        <Modal onClose={() => setVerifyModal(null)} width="max-w-md" accent="border-blue-500/30">
          <div className="space-y-4 p-6 text-center">
            <div className="af-step mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/20 text-blue-400">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div className="af-rise space-y-1.5" style={delay(140)}>
              <h3 className="text-base font-bold text-white">Kết Quả Xác Thực &amp; Đối Soát (AD06)</h3>
              <p className="text-xs text-slate-300">{verifyModal.message}</p>
            </div>

            <div
              className="af-rise space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-left text-xs"
              style={delay(230)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Hợp lệ dữ liệu</span>
                <span className={`font-bold ${verifyModal.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {verifyModal.valid ? 'Khớp' : 'Sai lệch'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">VNPay thành công</span>
                <span className={`font-bold ${verifyModal.isSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {verifyModal.isSuccess ? 'Có' : 'Chưa'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Trạng thái giao dịch</span>
                <span className="font-bold text-slate-200">{verifyModal.transactionStatus || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Mã VNPay</span>
                <span className="font-mono text-slate-300">{verifyModal.vnPay?.transactionNo || 'N/A'}</span>
              </div>

              {verifyModal.issues && verifyModal.issues.length > 0 && (
                <div className="mt-1 border-t border-slate-800 pt-2">
                  <span className="font-semibold text-rose-400">Vấn đề phát hiện:</span>
                  <ul className="mt-1 list-inside list-disc text-slate-300">
                    {verifyModal.issues.map((issue, idx) => (
                      <li key={idx} className="af-rise" style={delay(320 + idx * 70)}>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setVerifyModal(null)}
              className="w-full cursor-pointer rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 active:scale-[0.99]"
            >
              Hoàn tất
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL THU HỒI GHI DANH                                       */}
      {/* ============================================================ */}
      {revokeModal && (
        <Modal
          onClose={() => setRevokeModal(null)}
          width="max-w-md"
          accent="border-rose-500/30"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <span className="af-step flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Thu Hồi Khóa Học</h3>
                <p className="text-[11px] text-slate-400">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="af-rise text-xs text-slate-300" style={delay(120)}>
              Thu hồi quyền học của <strong className="text-white">{revokeModal.learnerName}</strong> cho khóa học
              này.
            </p>

            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Nhập lý do thu hồi..."
              className="af-rise w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
              style={delay(180)}
            />

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setRevokeModal(null)}
                className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleRevokeEnrollment}
                disabled={isProcessing}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Xác nhận thu hồi
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};