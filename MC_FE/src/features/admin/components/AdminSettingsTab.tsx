import React, { useEffect, useState } from 'react';
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
  Gift,
} from 'lucide-react';
import { PlatformSettings } from '../types/adminTypes';
import { CourseGiftCandidate, CourseGiftPolicy } from '../types/adminTypes';
import { adminApi } from '../services/adminApi';

interface AdminSettingsTabProps {
  settings: PlatformSettings;
  onSaveSettings: (newSettings: PlatformSettings) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<PlatformSettings>(settings);
  const [giftPolicy, setGiftPolicy] = useState<CourseGiftPolicy>({ giftCourseId: null, giftCourseTitle: null, isActive: false });
  const [giftCandidates, setGiftCandidates] = useState<CourseGiftCandidate[]>([]);
  const [giftLoading, setGiftLoading] = useState(true);
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftMessage, setGiftMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([adminApi.getCourseGiftPolicy(), adminApi.getCourseGiftCandidates()])
      .then(([policy, candidates]) => {
        if (!isCurrent) return;
        setGiftPolicy(policy);
        setGiftCandidates(candidates);
      })
      .catch((error) => {
        if (isCurrent) setGiftMessage(error instanceof Error ? error.message : 'Không tải được cấu hình khóa tặng.');
      })
      .finally(() => { if (isCurrent) setGiftLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  const handleSaveGiftPolicy = async () => {
    setGiftSaving(true);
    setGiftMessage(null);
    try {
      const saved = await adminApi.updateCourseGiftPolicy(giftPolicy);
      setGiftPolicy(saved);
      setGiftMessage(saved.isActive ? `Đã bật tặng kèm khóa “${saved.giftCourseTitle}” cho các khóa trả phí.` : 'Đã tắt cấp quyền tặng mới. Các quyền đã cấp vẫn được giữ đến khi hết hạn hoặc bị thu hồi theo chính sách.');
    } catch (error) {
      setGiftMessage(error instanceof Error ? error.message : 'Không thể lưu cấu hình khóa tặng.');
    } finally {
      setGiftSaving(false);
    }
  };

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

        {/* Global AI course gift policy: content remains instructor-owned; promotion is admin-owned. */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>Ưu đãi tặng khóa AI</span>
          </h3>
          <p className="text-xs leading-5 text-slate-400">
            Admin chọn một khóa AI đã xuất bản và đang bán. Khi thanh toán một khóa trả phí khác thành công, học viên được cấp quyền vào khóa AI; quyền tặng gắn với khóa đã mua và được thu hồi khi chứng chỉ khóa đó được cấp. Mua khóa AI trực tiếp vẫn tạo quyền riêng.
          </p>
          {giftLoading ? (
            <p className="text-sm text-slate-400">Đang tải cấu hình…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label htmlFor="gift-ai-course" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Khóa AI được tặng</label>
                  <select
                    id="gift-ai-course"
                    value={giftPolicy.giftCourseId ?? ''}
                    onChange={(event) => setGiftPolicy({ ...giftPolicy, giftCourseId: event.target.value ? Number(event.target.value) : null })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">Chọn khóa đã xuất bản và có phí</option>
                    {giftCandidates.map((candidate) => (
                      <option key={candidate.courseId} value={candidate.courseId}>
                        {candidate.title} — {candidate.price.toLocaleString('vi-VN')} VNĐ
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-200 pb-2">
                  <input type="checkbox" checked={giftPolicy.isActive} onChange={(event) => setGiftPolicy({ ...giftPolicy, isActive: event.target.checked })} />
                  Bật cấp quyền tặng
                </label>
              </div>
              {giftMessage && <p role="status" className="text-xs text-blue-300">{giftMessage}</p>}
              <div className="flex justify-end">
                <button type="button" onClick={() => void handleSaveGiftPolicy()} disabled={giftSaving || (giftPolicy.isActive && !giftPolicy.giftCourseId)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition">
                  {giftSaving ? 'Đang lưu…' : 'Lưu chính sách tặng'}
                </button>
              </div>
            </>
          )}
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
