import React, {
  useEffect,
  useState,
} from 'react';

import {
  CheckCircle2,
  XCircle,
  BookOpen,
  RotateCcw,
  Loader2,
} from 'lucide-react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { paymentApi } from '../api/paymentApi';

import type {
  PaymentDetailsDto,
} from '../types/paymentTypes';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] =
    useSearchParams();

  const navigate =
    useNavigate();

  const paymentIdParam =
    searchParams.get('paymentId');

  const statusParam =
    searchParams.get('status');

  const successParam =
    searchParams.get('success') === 'true';

  const [payment, setPayment] =
    useState<PaymentDetailsDto | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(
      Boolean(paymentIdParam)
    );

  const [loadError, setLoadError] =
    useState<boolean>(false);

  // ============================================================
  // LOAD PAYMENT
  // ============================================================

  useEffect(() => {
    if (!paymentIdParam) {
      setIsLoading(false);
      return;
    }

    const paymentId =
      Number(paymentIdParam);

    if (
      !Number.isInteger(paymentId)
    ) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    setIsLoading(true);
    setLoadError(false);

    paymentApi
      .getMyPayment(paymentId)
      .then((res) => {
        if (
          res.success &&
          res.data
        ) {
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
    payment !== null
      ? payment.paymentStatus === 'SUCCESS'
      : successParam &&
        statusParam === 'SUCCESS';

  const displayStatus =
    payment?.paymentStatus ??
    statusParam ??
    'PENDING';

  return (
    <div className="min-h-screen bg-[#070B19] text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">

        {/* STATUS ICON */}

        <div className="text-center space-y-3">

          <div className="inline-flex relative">

            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-500/20'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <XCircle className="w-10 h-10" />
              )}
            </div>

            {isSuccess && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black">
            {isSuccess
              ? 'Thanh Toán Thành Công!'
              : 'Giao Dịch Chưa Hoàn Tất'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {isSuccess
              ? 'Chúc mừng bạn đã chính thức ghi danh thành công tại Học viện MSEEK. Quyền học tập 90 ngày đã được kích hoạt!'
              : 'Giao dịch qua cổng VNPay chưa hoàn tất. Vui lòng kiểm tra lại hoặc thực hiện thanh toán lại.'}
          </p>
        </div>

        {/* LOADING */}

        {isLoading && (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* ERROR */}

        {!isLoading &&
          loadError &&
          !payment && (
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center">

              <p className="text-sm text-slate-400">
                Không thể tải thông tin giao dịch.
              </p>

              <p className="text-xs text-slate-500 mt-2">
                Trạng thái:
                {' '}
                {displayStatus}
              </p>
            </div>
          )}

        {/* DETAIL */}

        {!isLoading && payment && (
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-5 space-y-3.5 text-xs">

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Khóa học:
              </span>

              <span className="font-bold text-white text-right max-w-[240px] truncate">
                {payment.courseTitle}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Mã đơn hàng:
              </span>

              <span className="font-mono text-slate-300 text-right">
                {payment.merchantTxnRef}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Mã giao dịch VNPay:
              </span>

              <span className="font-mono text-blue-400 text-right">
                {payment.vnPayTransactionNo ||
                  'Chưa cập nhật'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Trạng thái Payment:
              </span>

              <span
                className={
                  payment.paymentStatus ===
                  'SUCCESS'
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-400 font-bold'
                }
              >
                {payment.paymentStatus}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Trạng thái Enrollment:
              </span>

              <span className="text-slate-200 font-semibold">
                {payment.enrollmentStatus}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">
                Học phí:
              </span>

              <span className="text-base font-black text-emerald-400">
                {payment.amount.toLocaleString(
                  'vi-VN'
                )}{' '}
                {payment.currency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>
                Cổng:
                {' '}
                {payment.paymentMethod}
              </span>

              <span>
                {new Date(
                  payment.updatedAt
                ).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        )}

        {/* BUTTON */}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">

          {isSuccess ? (
            <>
              <button
                onClick={() =>
                  navigate(
                    payment
                      ? `/courses/${payment.courseId}/learn`
                      : '/courses'
                  )
                }
                className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />

                <span>
                  Vào học ngay
                </span>
              </button>

              <button
                onClick={() =>
                  navigate('/profile')
                }
                className="py-3.5 px-5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                Hồ sơ của tôi
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  navigate('/courses')
                }
                className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />

                <span>
                  Thực hiện lại
                </span>
              </button>

              <button
                onClick={() =>
                  navigate('/')
                }
                className="py-3.5 px-5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                Về trang chủ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};