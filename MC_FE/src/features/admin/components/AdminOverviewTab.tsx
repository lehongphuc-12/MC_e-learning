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
  recentLogs: SystemLog[];
  onNavigateTab: (tab: 'users' | 'courses' | 'financials') => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  chartData,
  recentLogs,
  onNavigateTab,
}) => {
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

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
              {stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">VNĐ</span>
            </h3>
            <div className="flex items-center space-x-1 text-xs text-emerald-400 mt-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-semibold">+{stats.revenueGrowth}%</span>
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
              {stats.totalUsers.toLocaleString('vi-VN')}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-emerald-400 mt-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="font-semibold">+{stats.usersGrowth}%</span>
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
              {stats.totalCourses}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-purple-400 mt-2">
              <span className="font-semibold">{stats.totalInstructors} Giảng viên</span>
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
              {stats.pendingCourseApprovals} <span className="text-xs text-slate-400 font-normal">khóa mới</span>
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
                <span>Doanh Thu & Lượt Đăng Ký (6 Tháng Gần Nhất)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Biểu đồ tăng trưởng từ học viên mua khóa học</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center text-slate-300">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5" /> Doanh thu (VNĐ)
              </span>
            </div>
          </div>

          {/* Canvas Chart visual bar representation */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-slate-800 pb-2">
            {chartData.map((item, idx) => {
              const heightPercent = Math.round((item.revenue / maxRevenue) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg mb-2 shadow-lg border border-slate-700 whitespace-nowrap z-10 pointer-events-none">
                    <p className="font-bold text-blue-400">{item.revenue.toLocaleString('vi-VN')} VNĐ</p>
                    <p className="text-slate-300">{item.enrollments} lượt học viên</p>
                  </div>
                  <div className="w-full max-w-[48px] bg-slate-800/80 rounded-t-xl overflow-hidden relative flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 rounded-t-xl group-hover:brightness-125 transition-all duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 mt-2 truncate w-full text-center">
                    {item.month}
                  </span>
                </div>
              );
            })}
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
            {recentLogs.map((log) => {
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
