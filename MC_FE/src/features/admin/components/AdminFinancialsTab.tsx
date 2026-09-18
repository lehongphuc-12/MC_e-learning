import React, { useEffect, useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { PayoutRequest } from '../types/adminTypes';
import { paymentApi } from '../../payment/api/paymentApi';
import type {
  PaymentDetailsDto,
  VerifyPaymentResultDto,
} from '../../payment/types/paymentTypes';

interface AdminFinancialsTabProps {
  payouts: PayoutRequest[];
  onApprovePayout: (payoutId: string) => void;
  onRejectPayout: (payoutId: string) => void;
  commissionRate: number;
}

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

  const getHeaders = () => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

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
    }
  };

  // ============================================================
  // THU HỒI GHI DANH KHÓA HỌC (chưa có trong paymentApi, giữ fetch riêng)
  // ============================================================
  const handleRevokeEnrollment = async () => {
    if (!revokeModal) return;
    try {
      setIsProcessing(true);
      const res = await fetch(
        `http://localhost:5239/api/v1/admin/enrollments/${revokeModal.enrollmentId}/revoke`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            reason: revokeReason || 'Admin thu hồi quyền truy cập',
            isRefunded: true,
          }),
        }
      );

      const textData = await res.text();
      const result = textData ? JSON.parse(textData) : null;

      if (res.ok && (result?.success || result === true)) {
        alert('Thu hồi ghi danh khóa học thành công!');
        setRevokeModal(null);
        setRevokeReason('');
        fetchPayments();
      } else {
        alert(result?.message || 'Không thể thu hồi khóa học.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi thực hiện thu hồi ghi danh.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const totalPendingAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-white">
      {/* Tiêu đề trang */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center space-x-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <span>Quản Lý Tài Chính & Thanh Toán</span>
        </h1>
        <p className="text-sm text-slate-400">
          Hệ thống quản lý dòng tiền, duyệt rút tiền giảng viên và đối soát học phí học viên.
        </p>
      </div>

      {/* 2 TAB CON Ở PHÍA TRÊN */}
      <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setSubTab('tuition')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            subTab === 'tuition'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Quản Lý Học Phí</span>
        </button>

        <button
          onClick={() => setSubTab('payout')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            subTab === 'payout'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Tài Chính Giảng Viên (Payout)</span>
        </button>
      </div>

      {/* NỘI DUNG TAB 1: QUẢN LÝ HỌC PHÍ (AD06 & AD07) */}
      {subTab === 'tuition' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Bộ lọc & Tìm kiếm */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPayments();
              }}
              className="relative w-full md:w-96"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm theo mã giao dịch, tên học viên, email..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {['', 'SUCCESS', 'PENDING', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st === '' ? 'Tất cả' : st}
                </button>
              ))}
              <button
                onClick={fetchPayments}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bảng danh sách học phí */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
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
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Đang tải dữ liệu học phí...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Chưa có giao dịch mua khóa học nào.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.paymentId} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                          {p.merchantTxnRef}
                          <div className="text-[10px] text-slate-500 font-normal">
                            VNPay No: {p.vnPayTransactionNo || 'Chưa có'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{p.learnerName}</div>
                          <div className="text-[10px] text-slate-400">{p.learnerEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium max-w-[200px] truncate">
                          {p.courseTitle}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          {Number(p.amount).toLocaleString('vi-VN')} {p.currency}
                        </td>
                        <td className="px-6 py-4">
                          {p.paymentStatus === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Thành công
                            </span>
                          ) : p.paymentStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold text-[11px]">
                              <Clock className="w-3 h-3" /> Chờ xử lý
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-semibold text-[11px]">
                              <XCircle className="w-3 h-3" /> Thất bại
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-[11px]">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(p.paymentId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(p.paymentId)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition text-[11px]"
                              title="Đối soát AD06"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Đối soát
                            </button>
                            {p.enrollmentStatus === 'ACTIVE' && (
                              <button
                                onClick={() => setRevokeModal(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Thu hồi ghi danh"
                              >
                                <RotateCcw className="w-4 h-4" />
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

      {/* NỘI DUNG TAB 2: TÀI CHÍNH GIẢNG VIÊN (PAYOUT) */}
      {subTab === 'payout' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Phí Hoa Hồng Nền Tảng</span>
              <div className="flex items-center space-x-2 text-2xl font-black text-emerald-400">
                <Percent className="w-6 h-6" />
                <span>{commissionRate}%</span>
              </div>
              <p className="text-[11px] text-slate-500">Khấu trừ tự động trên mỗi giao dịch.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 space-y-2">
              <span className="text-xs text-amber-400 font-semibold uppercase">Yêu Cầu Rút Tiền Chờ Duyệt</span>
              <h3 className="text-2xl font-black text-amber-300">
                {totalPendingAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal">VNĐ</span>
              </h3>
              <p className="text-[11px] text-slate-400">{pendingPayouts.length} lệnh chờ xử lý.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Chu Kỳ Thanh Toán</span>
              <h3 className="text-xl font-bold text-white">Ngày 10 hàng tháng</h3>
              <p className="text-[11px] text-slate-500">Đã đối soát doanh thu thành công.</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Danh Sách Yêu Cầu Rút Tiền Giảng Viên</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
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
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Không có yêu cầu rút tiền nào.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{po.instructorName}</div>
                          <div className="text-[10px] text-slate-400">{po.instructorEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400 text-sm">
                          {po.amount.toLocaleString('vi-VN')} VNĐ
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">{po.bankName}</div>
                          <div className="text-slate-300 font-mono">{po.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{po.requestedDate}</td>
                        <td className="px-6 py-4">
                          {po.status === 'pending' ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300">
                              Chờ Duyệt
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                              Đã Chuyển
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {po.status === 'pending' && (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => onRejectPayout(po.id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onApprovePayout(po.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Duyệt
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

      {/* MODAL XEM CHI TIẾT ĐƠN */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B132B] border border-slate-800 rounded-2xl p-6 relative">
            <button
              onClick={() => setSelectedPayment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" /> Chi Tiết Đơn Thanh Toán #{selectedPayment.paymentId}
            </h3>
            <div className="space-y-3 text-xs divide-y divide-slate-800">
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Mã đơn:</span>
                <span className="font-mono text-blue-300 font-bold">{selectedPayment.merchantTxnRef}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Học viên:</span>
                <span className="text-white font-semibold">
                  {selectedPayment.learnerName} ({selectedPayment.learnerEmail})
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Khóa học:</span>
                <span className="text-white font-semibold max-w-[250px] text-right truncate">
                  {selectedPayment.courseTitle}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Số tiền:</span>
                <span className="text-emerald-400 font-black text-sm">
                  {Number(selectedPayment.amount).toLocaleString('vi-VN')} {selectedPayment.currency}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Mã VNPay:</span>
                <span className="font-mono text-slate-300">
                  {selectedPayment.vnPayTransactionNo || 'Chưa có'}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Trạng thái:</span>
                <span
                  className={
                    selectedPayment.paymentStatus === 'SUCCESS'
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {selectedPayment.paymentStatus}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AD06 KẾT QUẢ ĐỐI SOÁT */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-blue-500/30 rounded-2xl p-6 relative text-center space-y-3">
            <button
              onClick={() => setVerifyModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Kết Quả Xác Thực & Đối Soát (AD06)</h3>
            <p className="text-xs text-slate-300">{verifyModal.message}</p>
            <div className="p-3 bg-slate-900 rounded-xl text-xs text-left space-y-1.5 border border-slate-800">
              <div>
                Hợp lệ dữ liệu:{' '}
                <span className={`font-bold ${verifyModal.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {verifyModal.valid ? 'Khớp' : 'Sai lệch'}
                </span>
              </div>
              <div>
                VNPay thành công:{' '}
                <span className={`font-bold ${verifyModal.isSuccess ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {verifyModal.isSuccess ? 'Có' : 'Chưa'}
                </span>
              </div>
              <div>
                Trạng thái giao dịch:{' '}
                <span className="font-bold text-slate-200">{verifyModal.transactionStatus || 'N/A'}</span>
              </div>
              <div>
                Mã VNPay:{' '}
                <span className="font-mono text-slate-300">{verifyModal.vnPay?.transactionNo || 'N/A'}</span>
              </div>
              {verifyModal.issues && verifyModal.issues.length > 0 && (
                <div className="pt-1 border-t border-slate-800 mt-1">
                  <span className="text-rose-400 font-semibold">Vấn đề phát hiện:</span>
                  <ul className="list-disc list-inside text-slate-300 mt-1">
                    {verifyModal.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setVerifyModal(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}

      {/* MODAL THU HỒI GHI DANH */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B132B] border border-rose-500/30 rounded-2xl p-6 relative space-y-3">
            <button
              onClick={() => setRevokeModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" /> Thu Hồi Khóa Học
            </h3>
            <p className="text-xs text-slate-300">
              Thu hồi quyền học của <strong className="text-white">{revokeModal.learnerName}</strong> cho khóa học
              này.
            </p>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Nhập lý do thu hồi..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRevokeModal(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleRevokeEnrollment}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Xác nhận thu hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};