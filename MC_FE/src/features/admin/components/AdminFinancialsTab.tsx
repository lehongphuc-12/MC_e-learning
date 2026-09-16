import React from 'react';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  CreditCard,
  User,
  Percent,
} from 'lucide-react';
import { PayoutRequest } from '../types/adminTypes';

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
  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const totalPendingAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <span>Tài Chính & Phê Duyệt Rút Tiền (Payout)</span>
        </h1>
        <p className="text-sm text-slate-400">
          Quản lý doanh thu chiết khấu nền tảng và duyệt lệnh chuyển khoản hoa hồng cho Giảng viên.
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">
            Phí Hoa Hồng Nền Tảng (Commission)
          </span>
          <div className="flex items-center space-x-2 text-2xl font-black text-emerald-400">
            <Percent className="w-6 h-6" />
            <span>{commissionRate}%</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Tự động khấu trừ trên mỗi giao dịch bán khóa học thành công.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 space-y-2">
          <span className="text-xs text-amber-400 font-semibold uppercase">
            Yêu Cầu Rút Tiền Đang Chờ (Pending)
          </span>
          <h3 className="text-2xl font-black text-amber-300">
            {totalPendingAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal">VNĐ</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            {pendingPayouts.length} lệnh chờ Admin xác nhận ngân hàng.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">
            Chu Kỳ Thanh Toán
          </span>
          <h3 className="text-xl font-bold text-white">Ngày 10 hàng tháng</h3>
          <p className="text-[11px] text-slate-500">Đã tự động đối soát doanh thu thành công.</p>
        </div>
      </div>

      {/* Payout Queue Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>Danh Sách Yêu Cầu Rút Tiền Giảng Viên</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Mã Đơn / Giảng Viên</th>
                <th className="px-6 py-4">Số Tiền Rút</th>
                <th className="px-6 py-4">Thông Tin Ngân Hàng</th>
                <th className="px-6 py-4">Ngày Gửi Yêu Cầu</th>
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
                  <tr key={po.id} className="hover:bg-slate-800/40 transition cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="font-semibold text-white">{po.instructorName}</p>
                          <p className="text-slate-400 text-[11px]">{po.instructorEmail}</p>
                          <p className="text-[10px] text-slate-500">ID: {po.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-emerald-400 text-sm">
                      {po.amount.toLocaleString('vi-VN')} VNĐ
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200 flex items-center">
                          <Building className="w-3.5 h-3.5 text-blue-400 mr-1" />
                          {po.bankName}
                        </p>
                        <p className="text-slate-300 font-mono flex items-center">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500 mr-1" />
                          {po.accountNumber}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase">{po.accountName}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-400">{po.requestedDate}</td>

                    <td className="px-6 py-4">
                      {po.status === 'pending' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Chờ Duyệt
                        </span>
                      ) : po.status === 'approved' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Đã Chuyển Khoản
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400">
                          Bị Từ Chối
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {po.status === 'pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onRejectPayout(po.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Từ chối lệnh"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onApprovePayout(po.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Phê Duyệt Payout</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Hoàn tất</span>
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
  );
};
