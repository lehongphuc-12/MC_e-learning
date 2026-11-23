import React from 'react';
import {
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { AdminStats, RevenueDataPoint, SystemLog } from '../types/adminTypes';

interface AdminOverviewTabProps {
  stats: AdminStats;
  chartData: RevenueDataPoint[];
  revenueYear: number;
  revenueLoading: boolean;
  revenueError: string | null;
  onRevenueYearChange: (year: number) => void;
  recentLogs: SystemLog[];
  onNavigateTab: (tab: 'users' | 'courses' | 'financials') => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  chartData,
  revenueYear,
  revenueLoading,
  revenueError,
  onRevenueYearChange,
  recentLogs,
  onNavigateTab,
}) => {
  const maxRevenue = Math.max(1, ...chartData.map((d) => Math.max(0, Number(d.revenue) || 0)));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard Tổng Quan System
          </h1>
          <p className="text-sm text-slate-400">
            Theo dõi hoạt động, doanh thu nền tảng và phê duyệt khóa học trong thời gian thực.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
            Hệ thống ổn định (Online)
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tổng Doanh Thu
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">
              {(stats.totalRevenue ?? 0).toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">VNĐ</span>
            </h3>
            <div className="flex items-center space-x-1 text-xs text-emerald-400 mt-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-semibold">+{stats.revenueGrowth ?? 0}%</span>
              <span className="text-slate-500">so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Total Active Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Người Dùng Active
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">
              {(stats.totalUsers ?? 0).toLocaleString('vi-VN')}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-emerald-400 mt-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-semibold">+{stats.usersGrowth ?? 0}%</span>
              <span className="text-slate-500">tài khoản mới</span>
            </div>
          </div>
        </div>

        {/* Total Courses */}
        <div
          onClick={() => onNavigateTab('courses')}
          className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tổng Khóa Học
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">
              {stats.totalCourses ?? 0}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-purple-400 mt-2">
              <span className="font-semibold">{stats.totalInstructors ?? 0} Giảng viên</span>
              <span className="text-slate-500">đóng góp</span>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateTab('courses')}
          className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-amber-500/30 shadow-lg relative overflow-hidden group hover:border-amber-500/60 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Khóa Học Chờ Duyệt
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-400">
              {stats.pendingCourseApprovals ?? 0} <span className="text-xs text-slate-400 font-normal">khóa mới</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Cần Admin xem xét và xuất bản
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Visualizer Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Doanh Thu & Lượt Đăng Ký Theo Tháng</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Xem lại doanh thu và lượt đăng ký theo từng năm</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center text-slate-300">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5" /> Doanh thu (VNĐ)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Xem năm trước" onClick={() => onRevenueYearChange(revenueYear - 1)} disabled={revenueLoading || revenueYear <= 2000} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40">‹</button>
              <span className="text-sm font-semibold text-white min-w-[90px] text-center">Năm {revenueYear}</span>
              <button type="button" aria-label="Xem năm sau" onClick={() => onRevenueYearChange(revenueYear + 1)} disabled={revenueLoading || revenueYear >= new Date().getFullYear()} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40">›</button>
            </div>
            <div className="text-right text-xs text-slate-400">
              <span>{revenueLoading ? 'Đang tải...' : `Tổng năm: ${chartData.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0).toLocaleString('vi-VN')} VNĐ`}</span>
            </div>
          </div>

          {revenueError && (
            <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              Không thể tải doanh thu năm {revenueYear}: {revenueError}
            </div>
          )}

          {/* Fixed-height SVG chart: no percentage-height dependency on auto-sized parents. */}
          <div className="w-full overflow-x-auto">
            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <TrendingUp className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                <span>Chưa có dữ liệu doanh thu trong năm này</span>
              </div>
            ) : (
              <div className="min-w-[650px]">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 mb-2">
                  <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5" />Doanh thu</span>
                  <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5" />Lượt đăng ký</span>
                </div>
                <svg viewBox="0 0 720 310" className="w-full h-auto" role="img" aria-label={`Biểu đồ doanh thu và lượt đăng ký năm ${revenueYear}`}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = 24 + i * 56;
                    const value = Math.round(maxRevenue * (4 - i) / 4);
                    return (
                      <g key={`grid-${i}`}>
                        <line x1="86" y1={y} x2="660" y2={y} stroke="#334155" strokeDasharray="4 5" opacity="0.65" />
                        <text x="78" y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{value.toLocaleString('vi-VN')}</text>
                      </g>
                    );
                  })}
                  {chartData.map((item, idx) => {
                    const slot = 574 / chartData.length;
                    const x = 86 + slot * idx + slot / 2;
                    const revenue = Math.max(0, Number(item.revenue) || 0);
                    const barHeight = revenue > 0 ? Math.max(4, (revenue / maxRevenue) * 224) : 0;
                    return (
                      <g key={`bar-${idx}`}>
                        <rect x={x - Math.min(25, slot * 0.3)} y={248 - barHeight} width={Math.min(50, slot * 0.6)} height={barHeight} rx="5" fill="#3b82f6" />
                        <text x={x} y="271" textAnchor="middle" fill="#cbd5e1" fontSize="12">{item.month}</text>
                        <title>{`${item.month}: ${revenue.toLocaleString('vi-VN')} VNĐ; ${item.enrollments} lượt đăng ký`}</title>
                      </g>
                    );
                  })}
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={chartData.map((item, idx) => {
                      const maxEnrollments = Math.max(1, ...chartData.map((d) => Number(d.enrollments) || 0));
                      const x = 86 + (574 / chartData.length) * (idx + 0.5);
                      const y = 248 - (Math.max(0, Number(item.enrollments) || 0) / maxEnrollments) * 224;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {chartData.map((item, idx) => {
                    const maxEnrollments = Math.max(1, ...chartData.map((d) => Number(d.enrollments) || 0));
                    const x = 86 + (574 / chartData.length) * (idx + 0.5);
                    const y = 248 - (Math.max(0, Number(item.enrollments) || 0) / maxEnrollments) * 224;
                    return <circle key={`point-${idx}`} cx={x} cy={y} r="5" fill="#34d399" stroke="#0f172a" strokeWidth="2"><title>{`${item.month}: ${item.enrollments} lượt đăng ký`}</title></circle>;
                  })}
                  <text x="86" y="301" fill="#94a3b8" fontSize="10">VNĐ (trục trái) · Lượt đăng ký (đường xanh lá, theo tỷ lệ tối đa)</text>
                </svg>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {chartData.map((item, idx) => (
                    <div key={`detail-${idx}`} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs">
                      <div className="font-semibold text-slate-300">{item.month}</div>
                      <div className="text-blue-400">{(Number(item.revenue) || 0).toLocaleString('vi-VN')} VNĐ</div>
                      <div className="text-emerald-400">{item.enrollments} lượt đăng ký</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Audit Logs Side Widget */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <span>Nhật Ký Nhật Hoạt Động</span>
            </h3>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Chưa có nhật ký hoạt động nào gần đây
              </div>
            ) : (
              recentLogs.map((log) => {
                const icon =
                  log.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : log.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  );

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-semibold text-slate-200">
                        {icon}
                        <span>{log.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{log.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-slate-400 leading-tight pl-6">{log.details}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
