import React, { useEffect, useRef, useState } from 'react';

import { CheckCircle2, XCircle, BookOpen, RotateCcw, Loader2, Clock, Copy, Check } from 'lucide-react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { paymentApi } from '../api/paymentApi';

import type { PaymentDetailsDto } from '../types/paymentTypes';

/* ------------------------------------------------------------------ */
/*  Keyframes (tự chứa, không phụ thuộc cấu hình Tailwind)             */
/* ------------------------------------------------------------------ */

const MOTION_CSS = `
@keyframes pr-card   { from { opacity: 0; transform: translateY(34px) scale(.965); } to { opacity: 1; transform: none; } }
@keyframes pr-rise   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes pr-fade   { from { opacity: 0; } to { opacity: 1; } }
@keyframes pr-seal   { 0% { opacity: 0; transform: scale(.4) rotate(-12deg); } 60% { opacity: 1; transform: scale(1.14) rotate(3deg); } 100% { opacity: 1; transform: none; } }
@keyframes pr-draw   { to { stroke-dashoffset: 0; } }
@keyframes pr-halo   { 0% { opacity: .55; transform: scale(.8); } 70% { opacity: 0; transform: scale(1.65); } 100% { opacity: 0; transform: scale(1.65); } }
@keyframes pr-step   { 0% { opacity: 0; transform: scale(.35); } 65% { opacity: 1; transform: scale(1.16); } 100% { opacity: 1; transform: scale(1); } }
@keyframes pr-grow   { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pr-sheen  { 0%, 60% { transform: translateX(-170%); } 100% { transform: translateX(520%); } }
@keyframes pr-drift  { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(3%, -4%, 0) scale(1.08); } }
@keyframes pr-spark  { 0% { opacity: 0; transform: translateY(0) scale(.5); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-58px) scale(1); } }

.pr-card  { animation: pr-card .6s cubic-bezier(.2,.8,.25,1.02) both; }
.pr-rise  { animation: pr-rise .5s cubic-bezier(.2,.75,.25,1) both; }
.pr-fade  { animation: pr-fade .45s ease-out both; }
.pr-seal  { animation: pr-seal .62s cubic-bezier(.2,.9,.3,1.05) both; }
.pr-halo  { animation: pr-halo 2.4s ease-out .35s infinite; }
.pr-step  { animation: pr-step .45s cubic-bezier(.2,.9,.3,1) both; }
.pr-grow  { transform-origin: left center; animation: pr-grow .55s ease-out both; }
.pr-sheen { animation: pr-sheen 7s ease-in-out infinite; }
.pr-drift { animation: pr-drift 14s ease-in-out infinite; }
.pr-spark { animation: pr-spark 1.5s ease-out both; }

.pr-stroke { stroke-dasharray: 48; stroke-dashoffset: 48; animation: pr-draw .55s cubic-bezier(.65,0,.35,1) .35s both; }

@media (prefers-reduced-motion: reduce) {
  .pr-card, .pr-rise, .pr-fade, .pr-seal, .pr-halo, .pr-step, .pr-grow,
  .pr-sheen, .pr-drift, .pr-spark, .pr-stroke, .animate-ping, .animate-pulse {
    animation: none !important;
  }
  .pr-stroke { stroke-dashoffset: 0; }
}
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

/* ------------------------------------------------------------------ */
/*  Đếm số chạy                                                        */
/* ------------------------------------------------------------------ */

const useCountUp = (target: number, duration = 1000) => {
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

const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1000 }) => (
  <>{useCountUp(value, duration).toLocaleString('vi-VN')}</>
);

/* ------------------------------------------------------------------ */
/*  Con dấu trạng thái: vòng sáng + nét vẽ chạy                        */
/* ------------------------------------------------------------------ */

const ResultSeal: React.FC<{ success: boolean }> = ({ success }) => (
  <div className="relative inline-flex">
    <span
      aria-hidden
      className={`pr-halo absolute inset-0 rounded-[28px] ${success ? 'bg-emerald-400/35' : 'bg-rose-400/30'}`}
    />
    <div
      className={`pr-seal relative flex h-24 w-24 items-center justify-center rounded-[28px] border shadow-2xl ${
        success
          ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/25'
          : 'border-rose-400/40 bg-rose-500/15 text-rose-300 shadow-rose-500/25'
      }`}
    >
      <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        {success ? (
          <path d="M13 25.5 L20.5 33 L35 15" className="pr-stroke" stroke="currentColor" />
        ) : (
          <>
            <path d="M16 16 L32 32" className="pr-stroke" stroke="currentColor" />
            <path d="M32 16 L16 32" className="pr-stroke" stroke="currentColor" style={delay(520)} />
          </>
        )}
      </svg>

      {/* tia sáng nhỏ bắn lên khi thành công */}
      {success &&
        [-26, -8, 10, 26].map((x, i) => (
          <span
            key={x}
            aria-hidden
            className="pr-spark absolute bottom-6 h-1.5 w-1.5 rounded-full bg-emerald-300"
            style={{ left: `calc(50% + ${x}px)`, animationDelay: `${700 + i * 110}ms` }}
          />
        ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Tiến trình đơn hàng                                                */
/* ------------------------------------------------------------------ */

const ResultProgress: React.FC<{ success: boolean; enrolled: boolean }> = ({ success, enrolled }) => {
  type StepState = 'done' | 'error' | 'idle';
  const steps: { label: string; state: StepState }[] = [
    { label: 'Tạo đơn', state: 'done' },
    { label: 'Thanh toán', state: success ? 'done' : 'error' },
    { label: 'Ghi danh', state: success && enrolled ? 'done' : 'idle' },
  ];

  const circle: Record<StepState, string> = {
    done: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
    error: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
    idle: 'bg-slate-800 text-slate-500 ring-1 ring-slate-700',
  };

  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex w-20 flex-col items-center gap-2">
            <div
              className={`pr-step flex h-9 w-9 items-center justify-center rounded-full ${circle[s.state]}`}
              style={delay(900 + i * 200)}
            >
              {s.state === 'done' && <Check className="h-4 w-4" />}
              {s.state === 'error' && <XCircle className="h-4 w-4" />}
              {s.state === 'idle' && <Clock className="h-4 w-4" />}
            </div>
            <span
              className={`text-center text-[11px] font-semibold ${
                s.state === 'idle' ? 'text-slate-500' : 'text-slate-200'
              }`}
            >
              {s.label}
            </span>
          </div>

          {i < steps.length - 1 && (
            <div className="mt-[18px] h-0.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              {steps[i + 1].state !== 'idle' && (
                <div
                  className={`pr-grow h-full w-full ${steps[i + 1].state === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={delay(900 + i * 200 + 150)}
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
/*  Dòng thông tin                                                     */
/* ------------------------------------------------------------------ */

const Row: React.FC<{ label: string; index: number; children: React.ReactNode }> = ({
  label,
  index,
  children,
}) => (
  <div
    className="pr-rise flex items-center justify-between gap-4 py-2.5"
    style={delay(1100 + index * 70)}
  >
    <span className="shrink-0 text-slate-400">{label}</span>
    <span className="min-w-0 text-right">{children}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Trang kết quả thanh toán                                           */
/* ------------------------------------------------------------------ */

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const paymentIdParam = searchParams.get('paymentId');

  const statusParam = searchParams.get('status');

  const successParam = searchParams.get('success') === 'true';

  const [payment, setPayment] = useState<PaymentDetailsDto | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(Boolean(paymentIdParam));

  const [loadError, setLoadError] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  // ============================================================
  // LOAD PAYMENT
  // ============================================================

  useEffect(() => {
    if (!paymentIdParam) {
      setIsLoading(false);
      return;
    }

    const paymentId = Number(paymentIdParam);

    if (!Number.isInteger(paymentId)) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    setIsLoading(true);
    setLoadError(false);

    paymentApi
      .getMyPayment(paymentId)
      .then((res) => {
        if (res.success && res.data) {
          setPayment(res.data);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        setLoadError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [paymentIdParam]);

  // ============================================================
  // STATUS
  // ============================================================

  const isSuccess =
    payment !== null ? payment.paymentStatus === 'SUCCESS' : successParam && statusParam === 'SUCCESS';

  const displayStatus = payment?.paymentStatus ?? statusParam ?? 'PENDING';

  const copyRef = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* trình duyệt chặn clipboard thì bỏ qua */
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B19] p-4 text-white sm:p-8">
      <style>{MOTION_CSS}</style>

      {/* Nền: hai quầng sáng trôi rất chậm */}
      <div
        aria-hidden
        className={`pr-drift pointer-events-none absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] ${
          isSuccess ? 'bg-emerald-500/12' : 'bg-blue-600/15'
        }`}
      />
      <div
        aria-hidden
        className="pr-drift pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]"
        style={{ animationDelay: '-7s' }}
      />

      <div className="pr-card relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
        {/* Vệt sáng quét ngang mép trên */}
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${
            isSuccess
              ? 'bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent'
              : 'bg-gradient-to-r from-transparent via-rose-400/60 to-transparent'
          }`}
        />
        <span
          aria-hidden
          className="pr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
        />

        <div className="relative space-y-6 p-6 sm:p-8">
          {/* ---------------- Con dấu + tiêu đề ---------------- */}

          <div className="space-y-4 text-center">
            <ResultSeal success={isSuccess} />

            <div className="space-y-2">
              <h1 className="pr-rise text-2xl font-black tracking-tight sm:text-3xl" style={delay(420)}>
                {isSuccess ? 'Thanh Toán Thành Công!' : 'Giao Dịch Chưa Hoàn Tất'}
              </h1>

              <p
                className="pr-rise mx-auto max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm"
                style={delay(520)}
              >
                {isSuccess
                  ? 'Chúc mừng bạn đã chính thức ghi danh thành công tại Học viện MSEEK. Quyền học tập 90 ngày đã được kích hoạt!'
                  : 'Giao dịch qua cổng VNPay chưa hoàn tất. Vui lòng kiểm tra lại hoặc thực hiện thanh toán lại.'}
              </p>
            </div>

            {/* Số tiền nổi bật, chạy từ 0 lên */}
            {!isLoading && payment && (
              <p
                className="pr-rise text-4xl font-black tabular-nums tracking-tight sm:text-5xl"
                style={delay(620)}
              >
                <span className={isSuccess ? 'text-emerald-400' : 'text-slate-300'}>
                  <CountUp value={Number(payment.amount) || 0} duration={1100} />
                </span>
                <span className="ml-2 align-middle text-base font-bold text-slate-500">
                  {payment.currency}
                </span>
              </p>
            )}
          </div>

          {/* ---------------- Đang tải ---------------- */}

          {isLoading && (
            <div className="pr-fade flex flex-col items-center justify-center gap-3 p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-xs text-slate-500">Đang đối soát giao dịch với VNPay...</p>
            </div>
          )}

          {/* ---------------- Lỗi tải ---------------- */}

          {!isLoading && loadError && !payment && (
            <div className="pr-rise rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center" style={delay(620)}>
              <p className="text-sm text-slate-400">Không thể tải thông tin giao dịch.</p>

              <p className="mt-2 text-xs text-slate-500">
                Trạng thái: <span className="font-mono text-slate-300">{displayStatus}</span>
              </p>
            </div>
          )}

          {/* ---------------- Chi tiết ---------------- */}

          {!isLoading && payment && (
            <>
              <div className="pr-fade rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-5" style={delay(820)}>
                <ResultProgress success={isSuccess} enrolled={payment.enrollmentStatus === 'ACTIVE'} />
              </div>

              <div className="divide-y divide-dashed divide-slate-800 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-1 text-xs">
                <Row label="Khóa học" index={0}>
                  <span className="block max-w-[240px] truncate font-bold text-white">{payment.courseTitle}</span>
                </Row>

                <Row label="Mã đơn hàng" index={1}>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-slate-300">{payment.merchantTxnRef}</span>
                    <button
                      onClick={() => copyRef(payment.merchantTxnRef)}
                      title="Sao chép mã đơn"
                      aria-label="Sao chép mã đơn"
                      className="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 active:scale-90"
                    >
                      {copied ? (
                        <Check key="ok" className="pr-step h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </span>
                </Row>

                <Row label="Mã giao dịch VNPay" index={2}>
                  <span className="font-mono text-blue-400">
                    {payment.vnPayTransactionNo || 'Chưa cập nhật'}
                  </span>
                </Row>

                <Row label="Trạng thái Payment" index={3}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                      payment.paymentStatus === 'SUCCESS'
                        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
                        : 'bg-amber-400/10 text-amber-300 ring-amber-400/30'
                    }`}
                  >
                    {payment.paymentStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 animate-pulse" />
                    )}
                    {payment.paymentStatus}
                  </span>
                </Row>

                <Row label="Trạng thái Enrollment" index={4}>
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-slate-200 ring-1 ring-inset ring-slate-700">
                    {payment.enrollmentStatus}
                  </span>
                </Row>

                <Row label="Học phí" index={5}>
                  <span className="text-base font-black tabular-nums text-emerald-400">
                    {payment.amount.toLocaleString('vi-VN')} {payment.currency}
                  </span>
                </Row>

                <Row label={`Cổng ${payment.paymentMethod}`} index={6}>
                  <span className="text-[11px] text-slate-400">
                    {new Date(payment.updatedAt).toLocaleString('vi-VN')}
                  </span>
                </Row>
              </div>
            </>
          )}

          {/* ---------------- Nút hành động ---------------- */}

          <div className="pr-rise flex flex-col gap-3 pt-1 sm:flex-row" style={delay(1600)}>
            {isSuccess ? (
              <>
                <button
                  onClick={() => navigate(payment ? `/courses/${payment.courseId}/learn` : '/courses')}
                  className="group flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-[0.98]"
                >
                  <BookOpen className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  <span>Vào học ngay</span>
                </button>

                <button
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer rounded-xl bg-slate-800 px-5 py-3.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-[0.98]"
                >
                  Hồ sơ của tôi
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/courses')}
                  className="group flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
                  <span>Thực hiện lại</span>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="cursor-pointer rounded-xl bg-slate-800 px-5 py-3.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-[0.98]"
                >
                  Về trang chủ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};