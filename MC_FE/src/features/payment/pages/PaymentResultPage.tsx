import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  RotateCcw,
  Loader2,
  Clock,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentApi } from '../api/paymentApi';
import type { PaymentDetailsDto } from '../types/paymentTypes';

const MOTION_CSS = `
@keyframes pr-card {
  from { opacity: 0; transform: translateY(20px) scale(.975); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pr-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pr-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pr-seal {
  0% { opacity: 0; transform: scale(.45) rotate(-10deg); }
  60% { opacity: 1; transform: scale(1.08) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes pr-draw {
  to { stroke-dashoffset: 0; }
}
@keyframes pr-halo {
  0% { opacity: .5; transform: scale(.82); }
  70%, 100% { opacity: 0; transform: scale(1.5); }
}
@keyframes pr-step {
  0% { opacity: 0; transform: scale(.4); }
  65% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes pr-grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes pr-sheen {
  0%, 65% { transform: translateX(-180%); }
  100% { transform: translateX(520%); }
}
@keyframes pr-drift {
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(3%,-4%,0) scale(1.06); }
}
@keyframes pr-spark {
  0% { opacity: 0; transform: translateY(0) scale(.5); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-38px) scale(1); }
}
@keyframes pr-success-glow {
  0%, 100% { box-shadow: 0 0 0 rgba(16,185,129,0); }
  50% { box-shadow: 0 0 24px rgba(16,185,129,.1); }
}
@keyframes pr-loading-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,.08); }
  50% { box-shadow: 0 0 34px rgba(59,130,246,.2); }
}

.pr-card {
  animation: pr-card .55s cubic-bezier(.2,.8,.25,1.02) both;
  transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
}
.pr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 60px rgba(0,0,0,.4);
}
.pr-card-success {
  animation:
    pr-card .55s cubic-bezier(.2,.8,.25,1.02) both,
    pr-success-glow 4s ease-in-out 1s infinite;
}
.pr-loading-seal {
  animation: pr-loading-glow 2s ease-in-out infinite;
}
.pr-rise { animation: pr-rise .45s cubic-bezier(.2,.75,.25,1) both; }
.pr-fade { animation: pr-fade .4s ease-out both; }
.pr-seal { animation: pr-seal .58s cubic-bezier(.2,.9,.3,1.05) both; }
.pr-halo { animation: pr-halo 2.4s ease-out .35s infinite; }
.pr-step { animation: pr-step .4s cubic-bezier(.2,.9,.3,1.05) both; }
.pr-grow { transform-origin: left center; animation: pr-grow .5s ease-out both; }
.pr-sheen { animation: pr-sheen 7s ease-in-out infinite; }
.pr-drift { animation: pr-drift 14s ease-in-out infinite; }
.pr-spark { animation: pr-spark 1.5s ease-out both; }
.pr-stroke {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: pr-draw .55s cubic-bezier(.65,0,.35,1) .35s both;
}

@media (max-height: 820px) {
  .pr-page { padding-top: 10px !important; padding-bottom: 10px !important; }
  .pr-main { gap: 10px !important; padding-top: 14px !important; padding-bottom: 14px !important; }
  .pr-seal-box { width: 60px !important; height: 60px !important; border-radius: 17px !important; }
  .pr-seal-icon { width: 28px !important; height: 28px !important; }
  .pr-title { font-size: 18px !important; line-height: 24px !important; }
  .pr-description { font-size: 10px !important; line-height: 15px !important; }
  .pr-amount { font-size: 28px !important; line-height: 34px !important; }
  .pr-info-row { padding-top: 5px !important; padding-bottom: 5px !important; }
  .pr-action { padding-top: 9px !important; padding-bottom: 9px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .pr-card,
  .pr-card-success,
  .pr-loading-seal,
  .pr-rise,
  .pr-fade,
  .pr-seal,
  .pr-halo,
  .pr-step,
  .pr-grow,
  .pr-sheen,
  .pr-drift,
  .pr-spark,
  .pr-stroke,
  .animate-ping,
  .animate-pulse,
  .animate-spin {
    animation: none !important;
  }
  .pr-stroke { stroke-dashoffset: 0; }
}
`;

const delay = (ms: number): React.CSSProperties => ({
  animationDelay: `${ms}ms`,
});

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

const CountUp: React.FC<{ value: number; duration?: number }> = ({
  value,
  duration = 1000,
}) => <>{useCountUp(value, duration).toLocaleString('vi-VN')}</>;

const ResultSeal: React.FC<{ success: boolean }> = ({ success }) => (
  <div className="relative inline-flex">
    <span
      aria-hidden
      className={`pr-halo absolute inset-0 rounded-[19px] ${
        success ? 'bg-emerald-400/35' : 'bg-rose-400/30'
      }`}
    />

    <div
      className={`pr-seal pr-seal-box relative flex h-[68px] w-[68px] items-center justify-center rounded-[19px] border shadow-xl ${
        success
          ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/20'
          : 'border-rose-400/40 bg-rose-500/15 text-rose-300 shadow-rose-500/20'
      }`}
    >
      <svg
        viewBox="0 0 48 48"
        className="pr-seal-icon h-8 w-8"
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {success ? (
          <path
            d="M13 25.5 L20.5 33 L35 15"
            className="pr-stroke"
            stroke="currentColor"
          />
        ) : (
          <>
            <path
              d="M16 16 L32 32"
              className="pr-stroke"
              stroke="currentColor"
            />
            <path
              d="M32 16 L16 32"
              className="pr-stroke"
              stroke="currentColor"
              style={delay(520)}
            />
          </>
        )}
      </svg>

      {success &&
        [-19, -6, 7, 19].map((x, i) => (
          <span
            key={x}
            aria-hidden
            className="pr-spark absolute bottom-4 h-1 w-1 rounded-full bg-emerald-300"
            style={{
              left: `calc(50% + ${x}px)`,
              animationDelay: `${700 + i * 110}ms`,
            }}
          />
        ))}
    </div>
  </div>
);

const LoadingSeal: React.FC = () => (
  <div className="relative inline-flex">
    <span
      aria-hidden
      className="absolute inset-0 animate-ping rounded-[19px] bg-blue-400/15"
    />

    <div className="pr-loading-seal pr-seal-box relative flex h-[68px] w-[68px] items-center justify-center rounded-[19px] border border-blue-400/30 bg-blue-500/10 text-blue-300 shadow-xl shadow-blue-500/10">
      <Loader2 className="pr-seal-icon h-8 w-8 animate-spin" />
    </div>
  </div>
);

const ResultProgress: React.FC<{
  success: boolean;
  enrolled: boolean;
}> = ({ success, enrolled }) => {
  type StepState = 'done' | 'error' | 'idle';

  const steps: { label: string; state: StepState }[] = [
    { label: 'Tạo đơn', state: 'done' },
    { label: 'Thanh toán', state: success ? 'done' : 'error' },
    { label: 'Ghi danh', state: success && enrolled ? 'done' : 'idle' },
  ];

  const circle: Record<StepState, string> = {
    done: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
    error: 'bg-rose-500 text-white shadow-md shadow-rose-500/30',
    idle: 'bg-slate-800 text-slate-500 ring-1 ring-slate-700',
  };

  return (
    <div className="flex items-start">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className="flex w-[62px] flex-col items-center gap-1">
            <div
              className={`pr-step flex h-7 w-7 items-center justify-center rounded-full ${circle[step.state]}`}
              style={delay(850 + index * 180)}
            >
              {step.state === 'done' && <Check className="h-3 w-3" />}
              {step.state === 'error' && <XCircle className="h-3 w-3" />}
              {step.state === 'idle' && <Clock className="h-3 w-3" />}
            </div>

            <span
              className={`text-center text-[9px] font-semibold ${
                step.state === 'idle' ? 'text-slate-500' : 'text-slate-200'
              }`}
            >
              {step.label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div className="mt-[13px] h-px flex-1 overflow-hidden rounded-full bg-slate-800">
              {steps[index + 1].state !== 'idle' && (
                <div
                  className={`pr-grow h-full w-full ${
                    steps[index + 1].state === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={delay(850 + index * 180 + 140)}
                />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const Row: React.FC<{
  label: string;
  index: number;
  children: React.ReactNode;
}> = ({ label, index, children }) => (
  <div
    className="pr-rise pr-info-row flex items-center justify-between gap-4 py-1.5"
    style={delay(1050 + index * 60)}
  >
    <span className="shrink-0 text-slate-400">{label}</span>
    <span className="min-w-0 text-right">{children}</span>
  </div>
);

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentIdParam =
    searchParams.get('paymentId') ||
    sessionStorage.getItem('mseek_active_payment_id');

  const statusParam = searchParams.get('status');

  const [payment, setPayment] = useState<PaymentDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(paymentIdParam));
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paymentIdParam) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    const paymentId = Number(paymentIdParam);

    if (!Number.isInteger(paymentId)) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    let cancelled = false;

    const loadPayment = async () => {
      setIsLoading(true);
      setLoadError(false);

      try {
        const res = await paymentApi.syncMyPayment(paymentId);

        if (cancelled) return;

        if (res.success && res.data) {
          setPayment(res.data);
        } else {
          setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPayment();

    return () => {
      cancelled = true;
    };
  }, [paymentIdParam]);

  useEffect(() => {
    if (
      payment?.paymentStatus !== 'SUCCESS' ||
      payment?.enrollmentStatus !== 'ACTIVE'
    ) {
      return;
    }

    const cartCourseIdsRaw =
      sessionStorage.getItem('mseek_active_payment_course_ids');

    let paidCourseIds: string[] = [];

    if (cartCourseIdsRaw) {
      try {
        const parsed = JSON.parse(cartCourseIdsRaw);

        if (Array.isArray(parsed)) {
          paidCourseIds = parsed.map(String);
        }
      } catch {
        paidCourseIds = [];
      }
    }

    if (paidCourseIds.length === 0) {
      const singleCourseId =
        sessionStorage.getItem('mseek_active_payment_course_id') ??
        (payment.courseId != null ? String(payment.courseId) : null);

      if (singleCourseId) {
        paidCourseIds = [singleCourseId];
      }
    }

    paidCourseIds.forEach((courseId) => {
      window.dispatchEvent(
        new CustomEvent('mseek:payment-course-activated', {
          detail: { courseId },
        }),
      );
    });

    sessionStorage.removeItem('mseek_active_payment_id');
    sessionStorage.removeItem('mseek_active_payment_course_id');
    sessionStorage.removeItem('mseek_active_payment_course_ids');
  }, [
    payment?.paymentStatus,
    payment?.enrollmentStatus,
    payment?.courseId,
  ]);

  const isSuccess =
    payment?.paymentStatus === 'SUCCESS' &&
    payment?.enrollmentStatus === 'ACTIVE';

  const displayStatus =
    payment?.paymentStatus ??
    statusParam ??
    'PENDING';

  const copyRef = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Trình duyệt chặn clipboard thì bỏ qua.
    }
  };

  return (
    <div className="pr-page relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden bg-[#070B19] p-3 text-white">
      <style>{MOTION_CSS}</style>

      <div
        aria-hidden
        className={`pr-drift pointer-events-none absolute left-1/2 top-1/4 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[125px] ${
          isLoading
            ? 'bg-blue-500/12'
            : isSuccess
              ? 'bg-emerald-500/12'
              : 'bg-rose-500/10'
        }`}
      />

      <div
        aria-hidden
        className="pr-drift pointer-events-none absolute bottom-5 right-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]"
        style={{ animationDelay: '-7s' }}
      />

      <div
        className={`pr-card relative z-10 w-full max-w-[480px] overflow-hidden rounded-[20px] border bg-slate-900/90 shadow-2xl backdrop-blur-xl ${
          !isLoading && isSuccess
            ? 'pr-card-success border-emerald-500/15'
            : isLoading
              ? 'border-blue-500/15'
              : 'border-slate-800'
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${
            isLoading
              ? 'bg-gradient-to-r from-transparent via-blue-400/70 to-transparent'
              : isSuccess
                ? 'bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent'
                : 'bg-gradient-to-r from-transparent via-rose-400/60 to-transparent'
          }`}
        />

        <span
          aria-hidden
          className="pr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
        />

        <div className="pr-main relative flex flex-col gap-3 p-4 sm:p-5">
          <div className="space-y-2 text-center">
            {isLoading ? (
              <>
                <LoadingSeal />

                <div className="space-y-1">
                  <h1
                    className="pr-rise pr-title text-lg font-black tracking-tight text-blue-300 sm:text-xl"
                    style={delay(180)}
                  >
                    Đang Xác Nhận Thanh Toán
                  </h1>

                  <p
                    className="pr-rise pr-description mx-auto max-w-sm text-[10px] leading-[16px] text-slate-400 sm:text-[11px]"
                    style={delay(260)}
                  >
                    Đang kiểm tra trạng thái giao dịch với payOS...
                  </p>
                </div>
              </>
            ) : (
              <>
                <ResultSeal success={isSuccess} />

                <div className="space-y-1">
                  <h1
                    className="pr-rise pr-title text-lg font-black tracking-tight sm:text-xl"
                    style={delay(420)}
                  >
                    {isSuccess
                      ? 'Thanh Toán Thành Công!'
                      : 'Giao Dịch Chưa Hoàn Tất'}
                  </h1>

                  <p
                    className="pr-rise pr-description mx-auto max-w-sm text-[10px] leading-[16px] text-slate-400 sm:text-[11px]"
                    style={delay(520)}
                  >
                    {isSuccess
                      ? 'Thanh toán đã được xác nhận. Quyền truy cập khóa học của bạn đã được kích hoạt.'
                      : loadError
                        ? 'Không thể xác nhận giao dịch. Vui lòng kiểm tra lại thông tin thanh toán.'
                        : 'Giao dịch chưa được xác nhận hoàn tất. Vui lòng kiểm tra lại trạng thái thanh toán.'}
                  </p>
                </div>
              </>
            )}

            {!isLoading && payment && (
              <p
                className="pr-rise pr-amount text-[30px] font-black leading-none tabular-nums tracking-tight sm:text-[34px]"
                style={delay(620)}
              >
                <span
                  className={
                    isSuccess ? 'text-emerald-400' : 'text-slate-300'
                  }
                >
                  <CountUp
                    value={Number(payment.amount) || 0}
                    duration={1100}
                  />
                </span>

                <span className="ml-1.5 align-middle text-xs font-bold text-slate-500">
                  {payment.currency}
                </span>
              </p>
            )}
          </div>

          {!isLoading && loadError && !payment && (
            <div
              className="pr-rise rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center"
              style={delay(620)}
            >
              <p className="text-[11px] text-slate-400">
                Không thể tải thông tin giao dịch.
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                Trạng thái:{' '}
                <span className="font-mono text-slate-300">
                  {displayStatus}
                </span>
              </p>
            </div>
          )}

          {!isLoading && payment && (
            <>
              <div
                className="pr-fade rounded-xl border border-slate-800/80 bg-slate-950/60 px-3.5 py-2.5"
                style={delay(820)}
              >
                <ResultProgress
                  success={isSuccess}
                  enrolled={payment.enrollmentStatus === 'ACTIVE'}
                />
              </div>

              <div className="divide-y divide-dashed divide-slate-800 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3.5 py-0.5 text-[10px]">
                <Row label="Khóa học" index={0}>
                  <span className="block max-w-[220px] truncate font-bold text-white">
                    {payment.courseTitle}
                  </span>
                </Row>

                <Row label="Mã đơn hàng" index={1}>
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono text-slate-300">
                      {payment.merchantTxnRef}
                    </span>

                    <button
                      onClick={() => copyRef(payment.merchantTxnRef)}
                      title="Sao chép mã đơn"
                      aria-label="Sao chép mã đơn"
                      className="cursor-pointer rounded-md p-1 text-slate-500 transition-all duration-200 hover:scale-110 hover:bg-slate-800 hover:text-slate-200 active:scale-90"
                    >
                      {copied ? (
                        <Check className="pr-step h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </span>
                </Row>

                <Row label="Mã giao dịch payOS" index={2}>
                  <span className="font-mono text-blue-400">
                    {payment.latestTransaction?.providerTransactionNo ||
                      'Chưa cập nhật'}
                  </span>
                </Row>

                <Row label="Trạng thái Payment" index={3}>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${
                      payment.paymentStatus === 'SUCCESS'
                        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
                        : 'bg-amber-400/10 text-amber-300 ring-amber-400/30'
                    }`}
                  >
                    {payment.paymentStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : (
                      <Clock className="h-2.5 w-2.5 animate-pulse" />
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
                  <span className="text-xs font-black tabular-nums text-emerald-400">
                    {Number(payment.amount).toLocaleString('vi-VN')}{' '}
                    {payment.currency}
                  </span>
                </Row>

                <Row
                  label={`Cổng ${payment.paymentMethod}`}
                  index={6}
                >
                  <span className="text-[9px] text-slate-400">
                    {new Date(payment.updatedAt).toLocaleString('vi-VN')}
                  </span>
                </Row>
              </div>
            </>
          )}

          {!isLoading && (
            <div
              className="pr-rise flex gap-2"
              style={delay(1450)}
            >
              {isSuccess ? (
                <>
                  <button
                    onClick={() =>
                      navigate(
                        payment
                          ? `/courses/${payment.courseId}/learn`
                          : '/courses',
                      )
                    }
                    className="pr-action group flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-[10px] font-bold text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
                  >
                    <BookOpen className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                    <span>Vào học ngay</span>
                  </button>

                  <button
                    onClick={() => navigate('/courses')}
                    className="pr-action group flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2.5 text-[10px] font-bold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    <span>Về khóa học</span>
                  </button>

                  <button
                    onClick={() => navigate('/profile')}
                    className="pr-action cursor-pointer rounded-lg bg-slate-800 px-3.5 py-2.5 text-[10px] font-bold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    Hồ sơ
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/courses')}
                    className="pr-action group flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-[10px] font-bold text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                    <span>Thực hiện lại</span>
                  </button>

                  <button
                    onClick={() => navigate('/courses')}
                    className="pr-action group flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2.5 text-[10px] font-bold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-700 active:scale-[0.98]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    <span>Về khóa học</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};