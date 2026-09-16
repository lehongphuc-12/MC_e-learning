import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Save,
  Globe,
  Mail,
  AlertTriangle,
  Percent,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { PlatformSettings } from '../types/adminTypes';

interface AdminSettingsTabProps {
  settings: PlatformSettings;
  onSaveSettings: (newSettings: PlatformSettings) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<PlatformSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>Cấu Hình Nền Tảng System</span>
        </h1>
        <p className="text-sm text-slate-400">
          Thiết lập tên thương hiệu, chính sách hoa hồng, bảo trì và chế độ đăng ký hệ thống.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Brand Settings */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Thông Tin Thương Hiệu & Hỗ Trợ</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tên Học Viện / Platform
              </label>
              <input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Hỗ Trợ Hệ Thống
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Commission & Payout Policy */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>Chính Sách Tài Chính & Hoa Hồng</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tỷ lệ phí hoa hồng nền tảng (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.commissionRatePercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commissionRatePercent: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Ngưỡng rút tiền tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                min={100000}
                value={formData.payoutMinimum}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payoutMinimum: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Platform Control Switches */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Quy Trình & Chế Độ Hệ Thống</span>
          </h3>

          <div className="space-y-4 divide-y divide-slate-800">
            {/* Require course approval */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-white text-sm">
                  Yêu cầu Admin phê duyệt khóa học trước khi đăng
                </p>
                <p className="text-xs text-slate-400">
                  Khi bật, bài giảng mới từ Giảng viên cần phải được Admin duyệt.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    requireCourseApproval: !formData.requireCourseApproval,
                  })
                }
                className="text-slate-300 transition cursor-pointer"
              >
                {formData.requireCourseApproval ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="font-semibold text-rose-400 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Chế độ Bảo trì Hệ thống (Maintenance Mode)
                </p>
                <p className="text-xs text-slate-400">
                  Chỉ cho phép tài khoản Admin truy cập, tạm khóa các màn hình học viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    maintenanceMode: !formData.maintenanceMode,
                  })
                }
                className="text-slate-300 transition cursor-pointer"
              >
                {formData.maintenanceMode ? (
                  <ToggleRight className="w-8 h-8 text-rose-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Cấu Hình System</span>
          </button>
        </div>
      </form>
    </div>
  );
};
