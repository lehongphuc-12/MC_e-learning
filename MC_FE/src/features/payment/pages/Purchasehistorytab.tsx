import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Search,
  RefreshCw,
  Wallet,
  Copy,
  Check,
  ShoppingBag,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { paymentApi } from '../api/paymentApi';
import type { PaymentDetailsDto } from '../types/paymentTypes';

/* ------------------------------------------------------------------ */
/*  Cấu hình tự động làm mới                                           */
/* ------------------------------------------------------------------ */

const POLL_FAST_MS = 5000; // đang có đơn chờ xử lý -> kiểm tra dày hơn
const POLL_SLOW_MS = 30000; // không có đơn chờ -> kiểm tra thưa

/* ------------------------------------------------------------------ */
/*  Keyframes (tự chứa, không phụ thuộc cấu hình Tailwind)             */
/* ------------------------------------------------------------------ */

const MOTION_CSS = `
@keyframes ph-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ph-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ph-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes ph-pop { from { opacity: 0; transform: translateY(28px) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes ph-pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(16px) scale(.97); } }
@keyframes ph-step { 0% { opacity: 0; transform: scale(.3); } 65% { opacity: 1; transform: scale(1.18); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ph-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes ph-toast { from { opacity: 0; transform: translateX(32px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes ph-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@keyframes ph-sheen { 0%, 55% { transform: translateX(-160%); } 100% { transform: translateX(480%); } }
@keyframes ph-flash {
  0%   { background-color: rgba(var(--ph-flash), .16); box-shadow: inset 0 0 0 2px rgba(var(--ph-flash), .6); }
  100% { background-color: rgba(var(--ph-flash), 0);   box-shadow: inset 0 0 0 2px rgba(var(--ph-flash), 0); }
}

.ph-rise     { animation: ph-rise .55s cubic-bezier(.2,.75,.25,1) both; }
.ph-fade     { animation: ph-fade .2s ease-out both; }
.ph-fade-out { animation: ph-fade-out .18s ease-in both; }
.ph-pop      { animation: ph-pop .38s cubic-bezier(.2,.9,.25,1.05) both; }
.ph-pop-out  { animation: ph-pop-out .18s ease-in both; }
.ph-step     { animation: ph-step .45s cubic-bezier(.2,.9,.3,1) both; }
.ph-grow     { transform-origin: left center; animation: ph-grow .5s ease-out both; }
.ph-toast    { animation: ph-toast .4s cubic-bezier(.2,.9,.3,1) both; }
.ph-skel     { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size: 200% 100%; animation: ph-shimmer 1.4s linear infinite; }
.ph-sheen    { animation: ph-sheen 6s ease-in-out infinite; }
.ph-flash    { animation: ph-flash 1.3s ease-out 2; }
.ph-noscroll { scrollbar-width: none; }
.ph-noscroll::-webkit-scrollbar { display: none; }

/* Lớp phủ đặt ở <body> nên luôn nằm trên header/sidebar của layout */
.ph-layer      { position: fixed; inset: 0; z-index: 2147483000; }
.ph-layer-soft { position: fixed; z-index: 2147483000; }

@media (prefers-reduced-motion: reduce) {
  .ph-rise, .ph-fade, .ph-fade-out, .ph-pop, .ph-pop-out, .ph-step, .ph-grow,
  .ph-toast, .ph-skel, .ph-sheen, .ph-flash, .animate-ping, .animate-pulse {
    animation: none !important;
  }
}
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type StatusKey = 'SUCCESS' | 'PENDING' | 'FAILED';

const STATUS_META: Record<
  StatusKey,
  {
    label: string;
    icon: React.ElementType;
    badge: string;
    onDark: string;
    stripe: string;
    rgb: string; // dùng cho hiệu ứng nháy khi đổi trạng thái
  }
> = {
  SUCCESS: {
    label: 'Thành công',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    onDark: 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/30',
    stripe: 'bg-emerald-500',
    rgb: '16,185,129',
  },
  PENDING: {
    label: 'Chờ xử lý',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    onDark: 'bg-amber-400/15 text-amber-300 ring-amber-300/30',
    stripe: 'bg-amber-400',
    rgb: '245,158,11',
  },
  FAILED: {
    label: 'Thất bại',
    icon: XCircle,
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    onDark: 'bg-rose-400/15 text-rose-300 ring-rose-300/30',
    stripe: 'bg-rose-500',
    rgb: '244,63,94',
  },
};

const getStatus = (s?: string | null): StatusKey =>
  s === 'SUCCESS' ? 'SUCCESS' : s === 'PENDING' ? 'PENDING' : 'FAILED';

const FILTERS: { key: '' | StatusKey; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'SUCCESS', label: 'Thành công' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'FAILED', label: 'Thất bại' },
];

const TILE_TONES = [
  'bg-blue-50 text-blue-600',
  'bg-violet-50 text-violet-600',
  'bg-orange-50 text-orange-600',
  'bg-emerald-50 text-emerald-600',
  'bg-sky-50 text-sky-600',
  'bg-rose-50 text-rose-600',
];

const pickTone = (s = '') =>
  TILE_TONES[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % TILE_TONES.length];

const initials = (s = '') =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

const formatMoney = (amount: number | string, currency?: string | null) => {
  const n = Number(amount) || 0;
  const cur = !currency || currency === 'VND' ? '₫' : currency;
  return `${n.toLocaleString('vi-VN')} ${cur}`;
};

type DateInput = string | number | Date | null | undefined;

const formatDate = (v: DateInput) => (v ? new Date(v).toLocaleDateString('vi-VN') : 'N/A');
const formatTime = (v: DateInput) =>
  v ? new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
const formatDateTime = (v: DateInput) => (v ? new Date(v).toLocaleString('vi-VN') : 'N/A');

/* ------------------------------------------------------------------ */
/*  Cổng render ra <body> (tránh bị header/sidebar đè lên)             */
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
/*  Hook đếm số chạy (count-up)                                        */
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
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
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

const CountUp: React.FC<{
  value: number;
  duration?: number;
  format?: (n: number) => string;
}> = ({ value, duration = 900, format = (n) => n.toLocaleString('vi-VN') }) => {
  const v = useCountUp(value, duration);
  return <>{format(v)}</>;
};

/* ------------------------------------------------------------------ */
/*  Sub components                                                     */
/* ------------------------------------------------------------------ */

const StatusBadge: React.FC<{ status: StatusKey; dark?: boolean; pop?: boolean }> = ({
  status,
  dark,
  pop,
}) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        dark ? meta.onDark : meta.badge
      } ${pop ? 'ph-step' : ''}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === 'PENDING' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
};

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-6 py-3.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="min-w-0 text-right text-sm font-semibold text-slate-800">{children}</span>
  </div>
);

/** Tiến trình đơn hàng: các chấm hiện lần lượt, đường nối chạy dần */
const OrderProgress: React.FC<{ status: StatusKey }> = ({ status }) => {
  type StepState = 'done' | 'active' | 'error' | 'idle';
  const steps: { label: string; state: StepState }[] = [
    { label: 'Tạo đơn', state: 'done' },
    {
      label: 'Thanh toán',
      state: status === 'SUCCESS' ? 'done' : status === 'PENDING' ? 'active' : 'error',
    },
    { label: 'Ghi danh', state: status === 'SUCCESS' ? 'done' : 'idle' },
  ];

  const circle: Record<StepState, string> = {
    done: 'bg-emerald-500 text-white',
    active: 'bg-amber-100 text-amber-600',
    error: 'bg-rose-500 text-white',
    idle: 'bg-slate-100 text-slate-400',
  };

  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex w-20 flex-col items-center gap-2">
            <div
              className={`ph-step relative flex h-8 w-8 items-center justify-center rounded-full ${circle[s.state]}`}
              style={delay(i * 220)}
            >
              {s.state === 'active' && (
                <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/60" />
              )}
              {s.state === 'done' && <Check className="relative h-4 w-4" />}
              {s.state === 'active' && <Clock className="relative h-4 w-4" />}
              {s.state === 'error' && <X className="relative h-4 w-4" />}
              {s.state === 'idle' && <span className="relative text-xs font-bold">{i + 1}</span>}
            </div>
            <span
              className={`text-center text-xs font-medium ${
                s.state === 'idle' ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="mt-4 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              {steps[i + 1].state !== 'idle' && (
                <div
                  className={`ph-grow h-full w-full ${
                    steps[i + 1].state === 'error' ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                  style={delay(i * 220 + 160)}
                />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

type Summary = { total: number; success: number; pending: number; failed: number; spent: number };
const EMPTY_SUMMARY: Summary = { total: 0, success: 0, pending: 0, failed: 0, spent: 0 };

type Toast = { id: string; tone: StatusKey; text: string };

export const PurchaseHistoryTab: React.FC = () => {
  const [payments, setPayments] = useState<PaymentDetailsDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetailsDto | null>(null);
  const [closing, setClosing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [flash, setFlash] = useState<Record<string, StatusKey>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Số liệu tổng quan: chỉ cập nhật khi tải danh sách KHÔNG lọc, để số không nhảy theo bộ lọc
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);

  // Bộ lọc đang áp dụng thật sự (dùng cho tự làm mới, không bị ảnh hưởng bởi chữ đang gõ dở)
  const appliedRef = useRef({ kw: '', st: '' });
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(0);
  const prevStatusRef = useRef<Record<string, StatusKey>>({});

  // Thanh trượt của bộ lọc trạng thái
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  /* ---------- Phát hiện đơn đổi trạng thái (nháy dòng + toast) ---------- */
  const detectChanges = (items: PaymentDetailsDto[]) => {
    const changed: PaymentDetailsDto[] = [];
    items.forEach((it) => {
      const key = String(it.paymentId);
      const now = getStatus(it.paymentStatus);
      const before = prevStatusRef.current[key];
      if (before && before !== now) changed.push(it);
      prevStatusRef.current[key] = now;
    });
    if (changed.length === 0) return;

    setFlash((m) => {
      const n = { ...m };
      changed.forEach((it) => (n[String(it.paymentId)] = getStatus(it.paymentStatus)));
      return n;
    });
    window.setTimeout(() => {
      setFlash((m) => {
        const n = { ...m };
        changed.forEach((it) => delete n[String(it.paymentId)]);
        return n;
      });
    }, 2700);

    const newToasts: Toast[] = changed
      .filter((it) => getStatus(it.paymentStatus) !== 'PENDING')
      .map((it) => {
        const tone = getStatus(it.paymentStatus);
        return {
          id: `${it.paymentId}-${Date.now()}`,
          tone,
          text:
            tone === 'SUCCESS'
              ? `Đơn ${it.merchantTxnRef} đã thanh toán thành công`
              : `Đơn ${it.merchantTxnRef} thanh toán thất bại`,
        };
      });
    if (newToasts.length) {
      setToasts((t) => [...t, ...newToasts].slice(-3));
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => !newToasts.some((n) => n.id === x.id)));
      }, 5500);
    }
  };

  /* ---------- Tải dữ liệu ---------- */
  const fetchHistory = async (kw: string = keyword, st: string = statusFilter, silent = false) => {
    const id = ++reqIdRef.current;
    inFlightRef.current += 1;

    if (silent) {
      setRefreshing(true);
    } else {
      appliedRef.current = { kw, st };
      setLoading(true);
    }

    try {
      const response = await paymentApi.getMyPaymentHistory({
        page: 1,
        pageSize: 20,
        keyword: kw.trim() || undefined,
        status: st || undefined,
      });

      if (id !== reqIdRef.current) return; // đã có yêu cầu mới hơn, bỏ kết quả cũ

      if (response.success && response.data) {
        const items = response.data.items ?? [];
        detectChanges(items);
        setPayments(items);
        // Đang mở modal thì cập nhật luôn dữ liệu trong modal
        setSelectedPayment((prev) =>
          prev ? items.find((i) => i.paymentId === prev.paymentId) ?? prev : prev,
        );

        if (!st && !kw.trim()) {
          const ok = items.filter((p) => getStatus(p.paymentStatus) === 'SUCCESS');
          setSummary({
            total: items.length,
            success: ok.length,
            pending: items.filter((p) => getStatus(p.paymentStatus) === 'PENDING').length,
            failed: items.filter((p) => getStatus(p.paymentStatus) === 'FAILED').length,
            spent: ok.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          });
        }
        setLastUpdated(new Date());
      } else if (!silent) {
        setPayments([]);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử mua khóa học:', err);
      if (!silent) setPayments([]); // lỗi mạng thoáng qua lúc tự làm mới thì giữ nguyên danh sách cũ
    } finally {
      inFlightRef.current -= 1;
      if (id === reqIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  /* ---------- Tự động làm mới ---------- */
  const hasPending =
    payments.some((p) => getStatus(p.paymentStatus) === 'PENDING') || summary.pending > 0;
  const pollMs = hasPending ? POLL_FAST_MS : POLL_SLOW_MS;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return; // tab đang ẩn thì thôi
      if (inFlightRef.current > 0) return; // đang tải rồi thì bỏ qua
      fetchHistory(appliedRef.current.kw, appliedRef.current.st, true);
    };
    const timer = window.setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', tick); // quay lại tab là cập nhật ngay
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  /* ---------- Modal ---------- */
  const modalOpen = selectedPayment !== null;

  const closeModal = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setSelectedPayment(null);
      setClosing(false);
    }, 180);
  }, []);

  // Khóa cuộn nền mà không làm trang bị giật ngang khi thanh cuộn biến mất
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollBarGap > 0) document.body.style.paddingRight = `${scrollBarGap}px`;
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      setCopied(false);
    };
  }, [modalOpen, closeModal]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard thì bỏ qua */
    }
  };

  const clearSearch = () => {
    setKeyword('');
    fetchHistory('', statusFilter);
  };

  /* ---------- Thanh trượt bộ lọc ---------- */
  const measureTabs = () => {
    const el = tabRefs.current[statusFilter || 'ALL'];
    if (el) {
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        ready: true,
      });
    }
  };

  useLayoutEffect(() => {
    measureTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, summary]);

  useEffect(() => {
    window.addEventListener('resize', measureTabs);
    return () => window.removeEventListener('resize', measureTabs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const countOf = (key: '' | StatusKey) =>
    key === ''
      ? summary.total
      : key === 'SUCCESS'
      ? summary.success
      : key === 'PENDING'
      ? summary.pending
      : summary.failed;

  const selectedStatus = selectedPayment ? getStatus(selectedPayment.paymentStatus) : 'PENDING';

  return (
    <div className="ph-fade space-y-4 rounded-3xl border border-slate-100 bg-white p-5 text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.05)] md:p-6">
      <style>{MOTION_CSS}</style>

      {/* ---------------- Tiêu đề ---------------- */}
      <div
        className="ph-rise flex items-center justify-between gap-4 border-b border-slate-100 pb-4"
        style={delay(0)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#0B1437]">Lịch Sử Mua Khóa Học</h1>
            <p className="text-xs text-slate-500">Xem lại các khóa học bạn đã mua và chi tiết thanh toán.</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className="hidden items-center gap-2 text-xs text-slate-500 md:inline-flex"
            title={
              hasPending
                ? `Có đơn chờ xử lý, tự cập nhật mỗi ${POLL_FAST_MS / 1000} giây`
                : `Tự động cập nhật mỗi ${POLL_SLOW_MS / 1000} giây`
            }
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  hasPending ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  hasPending ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            {hasPending ? 'Đang theo dõi đơn chờ' : 'Tự động cập nhật'}
            {lastUpdated && (
              <span className="tabular-nums text-slate-400">{lastUpdated.toLocaleTimeString('vi-VN')}</span>
            )}
          </span>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <CountUp value={summary.total} duration={700} /> đơn hàng
          </span>
        </div>
      </div>

      {/* ---------------- Tổng quan ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div
          className="ph-rise relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1440] to-[#16308f] px-4 py-3 text-white"
          style={delay(90)}
        >
          <span
            aria-hidden
            className="ph-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Wallet className="h-5 w-5 text-blue-200" />
          </div>
          <div className="relative min-w-0">
            <p className="text-xs text-blue-100/80">Tổng đã thanh toán</p>
            <p className="truncate text-lg font-extrabold leading-tight tracking-tight tabular-nums">
              <CountUp value={summary.spent} duration={1200} format={(n) => formatMoney(n, 'VND')} />
            </p>
          </div>
        </div>

        <div
          className="ph-rise flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
          style={delay(180)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-tight tabular-nums text-[#0B1437]">
              <CountUp value={summary.success} />
            </p>
            <p className="text-xs text-slate-500">Đơn thành công</p>
          </div>
        </div>

        <div
          className="ph-rise flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
          style={delay(270)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className={`h-5 w-5 ${summary.pending > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-tight tabular-nums text-[#0B1437]">
              <CountUp value={summary.pending} />
            </p>
            <p className="text-xs text-slate-500">
              Chờ xử lý
              {summary.failed > 0 && <span className="text-rose-500">, {summary.failed} thất bại</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Bộ lọc ---------------- */}
      <div className="ph-rise flex flex-wrap items-center gap-2" style={delay(340)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchHistory();
          }}
          className="relative min-w-[200px] flex-1 lg:max-w-[280px]"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã giao dịch..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
          {keyword && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="ml-auto flex min-w-0 max-w-full items-center gap-2">
          {/* Thanh trượt: nền navy chạy mượt sang tab đang chọn */}
          <div className="ph-noscroll relative flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-slate-50 p-1">
            {indicator.ready && (
              <span
                aria-hidden
                className="absolute rounded-lg bg-[#0B1437] shadow-sm shadow-slate-900/20"
                style={{
                  left: indicator.left,
                  top: indicator.top,
                  width: indicator.width,
                  height: indicator.height,
                  transition: 'all 350ms cubic-bezier(.3,.9,.3,1)',
                }}
              />
            )}
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key || 'ALL'}
                  ref={(el) => {
                    tabRefs.current[f.key || 'ALL'] = el;
                  }}
                  onClick={() => setStatusFilter(f.key)}
                  className={`relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                    active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                  <span
                    className={`min-w-[18px] rounded px-1 text-center text-[11px] font-bold transition-colors duration-200 ${
                      active ? 'bg-white/15 text-white' : 'bg-white text-slate-500'
                    }`}
                  >
                    {countOf(f.key)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => fetchHistory(appliedRef.current.kw, appliedRef.current.st, true)}
            title="Làm mới ngay"
            aria-label="Làm mới ngay"
            className="shrink-0 cursor-pointer rounded-xl bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ---------------- Danh sách ---------------- */}
      <div>
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                style={{ opacity: 1 - i * 0.15 }}
              >
                <div className="ph-skel h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2.5">
                  <div className="ph-skel h-4 w-1/2 rounded" />
                  <div className="ph-skel h-3 w-1/3 rounded" />
                </div>
                <div className="ph-skel h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="ph-rise flex flex-col items-center px-4 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 ring-8 ring-blue-50/60">
              <ShoppingBag className="h-9 w-9 text-blue-500" />
            </div>
            <h3 className="mt-5 text-base font-bold text-[#0B1437]">
              {keyword || statusFilter ? 'Không tìm thấy giao dịch phù hợp' : 'Bạn chưa mua khóa học nào'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              {keyword || statusFilter
                ? 'Thử đổi mã giao dịch hoặc chọn lại bộ lọc trạng thái.'
                : 'Khi bạn mua khóa học, đơn hàng và chi tiết thanh toán sẽ xuất hiện ở đây.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {payments.map((p, i) => {
              const status = getStatus(p.paymentStatus);
              const flashing = flash[String(p.paymentId)];
              return (
                <li key={p.paymentId} className="ph-rise" style={delay(Math.min(i, 8) * 60)}>
                  <button
                    onClick={() => setSelectedPayment(p)}
                    className="group relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 pl-4 text-left transition duration-200 hover:border-slate-200 hover:shadow-[0_10px_30px_-14px_rgba(15,23,42,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.995] sm:flex-row sm:items-center"
                  >
                    {/* Nháy màu khi đơn vừa đổi trạng thái */}
                    {flashing && (
                      <span
                        aria-hidden
                        className="ph-flash pointer-events-none absolute inset-0 rounded-2xl"
                        style={{ ['--ph-flash' as string]: STATUS_META[flashing].rgb } as React.CSSProperties}
                      />
                    )}

                    <span
                      className={`absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors duration-500 ${STATUS_META[status].stripe}`}
                    />

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold transition-transform duration-300 group-hover:scale-105 ${pickTone(
                        p.courseTitle,
                      )}`}
                    >
                      {initials(p.courseTitle)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0B1437]">{p.courseTitle}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-50 px-2 py-0.5 font-mono font-semibold text-slate-600">
                          {p.merchantTxnRef}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(p.createdAt)} {formatTime(p.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex flex-col items-start gap-1.5 sm:items-end">
                        <span className="text-sm font-extrabold tabular-nums text-[#0B1437]">
                          {formatMoney(p.amount, p.currency)}
                        </span>
                        <StatusBadge key={status} status={status} pop={!!flashing} />
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-slate-500" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---------------- Modal chi tiết (render thẳng ra <body>) ---------------- */}
      {selectedPayment && (
        <Portal>
          <div
            className={`ph-layer flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10 ${
              closing ? 'ph-fade-out' : 'ph-fade'
            }`}
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ${
                closing ? 'ph-pop-out' : 'ph-pop'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-[#0a1440] to-[#16308f] px-6 pb-6 pt-5 text-white">
                <button
                  onClick={closeModal}
                  aria-label="Đóng"
                  className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:rotate-90 hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="text-sm text-blue-100/80">Đơn hàng #{selectedPayment.paymentId}</p>
                <p className="mt-1 text-3xl font-black tracking-tight tabular-nums">
                  <CountUp
                    value={Number(selectedPayment.amount) || 0}
                    duration={900}
                    format={(n) => formatMoney(n, selectedPayment.currency)}
                  />
                </p>
                <p className="mt-2 line-clamp-2 pr-6 text-sm font-medium text-blue-50/90">
                  {selectedPayment.courseTitle}
                </p>
                <div className="mt-4">
                  <StatusBadge key={selectedStatus} status={selectedStatus} dark pop />
                </div>
              </div>

              <div className="space-y-5 p-6">
                <OrderProgress key={selectedStatus} status={selectedStatus} />

                <div className="divide-y divide-dashed divide-slate-200 rounded-2xl border border-slate-100 bg-slate-50/60 px-4">
                  <DetailRow label="Mã đơn">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-blue-700">{selectedPayment.merchantTxnRef}</span>
                      <button
                        onClick={() => copyText(selectedPayment.merchantTxnRef)}
                        title="Sao chép mã đơn"
                        aria-label="Sao chép mã đơn"
                        className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 active:scale-90"
                      >
                        {copied ? (
                          <Check key="ok" className="ph-step h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>
                  </DetailRow>
                  <DetailRow label="Phương thức">{selectedPayment.paymentMethod}</DetailRow>
                  <DetailRow label="Mã VNPay">
                    <span className="font-mono">{selectedPayment.vnPayTransactionNo || 'Chưa có'}</span>
                  </DetailRow>
                  <DetailRow label="Trạng thái ghi danh">
                    <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-inset ring-slate-200">
                      {selectedPayment.enrollmentStatus}
                    </span>
                  </DetailRow>
                  <DetailRow label="Trạng thái thanh toán">
                    <StatusBadge status={selectedStatus} />
                  </DetailRow>
                  <DetailRow label="Ngày mua">{formatDateTime(selectedPayment.createdAt)}</DetailRow>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full cursor-pointer rounded-xl bg-[#0B1437] py-3 text-sm font-semibold text-white transition hover:bg-[#16308f] active:scale-[0.99]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ---------------- Toast báo đơn đổi trạng thái ---------------- */}
      {toasts.length > 0 && (
        <Portal>
          <div
            className="ph-layer-soft pointer-events-none bottom-6 right-6 flex flex-col gap-3"
            role="status"
            aria-live="polite"
          >
            {toasts.map((t) => {
              const meta = STATUS_META[t.tone];
              const Icon = meta.icon;
              return (
                <div
                  key={t.id}
                  className="ph-toast pointer-events-auto flex max-w-xs items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.badge}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{t.text}</p>
                </div>
              );
            })}
          </div>
        </Portal>
      )}
    </div>
  );
};