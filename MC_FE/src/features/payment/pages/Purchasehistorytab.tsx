import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  X,
  Search,
  RefreshCw,
} from 'lucide-react';
import { paymentApi } from '../api/paymentApi';
import type { PaymentDetailsDto } from '../types/paymentTypes';

export const PurchaseHistoryTab: React.FC = () => {
  const [payments, setPayments] = useState<PaymentDetailsDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetailsDto | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getMyPaymentHistory({
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
      console.error('Lỗi tải lịch sử mua khóa học:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center space-x-2">
          <CreditCard className="w-6 h-6 text-blue-400" />
          <span>Lịch Sử Mua Khóa Học</span>
        </h1>
        <p className="text-sm text-slate-400">
          Xem lại các khóa học bạn đã mua và chi tiết thanh toán.
        </p>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchHistory();
          }}
          className="relative w-full md:w-96"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo mã giao dịch..."
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
            onClick={fetchHistory}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Danh sách */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Mã Giao Dịch</th>
                <th className="px-6 py-4">Khóa Học</th>
                <th className="px-6 py-4">Số Tiền</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Ngày Mua</th>
                <th className="px-6 py-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Đang tải lịch sử mua...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Bạn chưa mua khóa học nào.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                      {p.merchantTxnRef}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium max-w-[220px] truncate">
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
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết */}
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
              <CreditCard className="w-5 h-5 text-blue-400" /> Chi Tiết Đơn #{selectedPayment.paymentId}
            </h3>
            <div className="space-y-3 text-xs divide-y divide-slate-800">
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Mã đơn:</span>
                <span className="font-mono text-blue-300 font-bold">{selectedPayment.merchantTxnRef}</span>
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
                <span className="text-slate-400">Phương thức:</span>
                <span className="text-slate-200">{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Mã VNPay:</span>
                <span className="font-mono text-slate-300">
                  {selectedPayment.vnPayTransactionNo || 'Chưa có'}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Trạng thái ghi danh:</span>
                <span className="text-slate-200 font-semibold">{selectedPayment.enrollmentStatus}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Trạng thái thanh toán:</span>
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
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Ngày mua:</span>
                <span className="text-slate-300">
                  {selectedPayment.createdAt
                    ? new Date(selectedPayment.createdAt).toLocaleString('vi-VN')
                    : 'N/A'}
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
    </div>
  );
};