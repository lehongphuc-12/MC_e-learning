import {
  ArrowLeft,
  Award,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Lock,
  Settings,
  Shield,
  ShieldCheck,
  User
} from 'lucide-react';
import React, { useState } from 'react';
import { User as UserType } from '../../../types';
import { PasswordForm } from './profile/PasswordForm';
import { PreferencesForm } from './profile/PreferencesForm';
import { ProfileInfoForm } from './profile/ProfileInfoForm';
import { ProfileOverview } from './profile/ProfileOverview';
import { PurchaseHistoryTab } from '../../payment/pages/Purchasehistorytab';
import { useMyCertificates } from '../../courses/hooks/useCertificateQueries';
import { ToastType } from '../../../components/common/Toast';

interface ProfileScreenProps {
  user: UserType;
  onNavigate: (screen: any) => void;
  onUpdateUser?: (updatedUser: Partial<UserType>) => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const roleColor: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  instructor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  student: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onNavigate, onUpdateUser, onToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'purchases' | 'profile' | 'password' | 'settings'>('overview');
  const { data: myCertificates = [], isLoading: isCertsLoading } = useMyCertificates();
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const triggerAlert = (status: 'success' | 'error', message: string) => {
    setSaveStatus(status);
    setSaveMessage(message);
    onToast?.(status === 'success' ? 'Profile Updated' : 'Update Failed', message, status === 'success' ? 'success' : 'error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 3500);
  };

  const roleBadge = roleColor[user.role] || roleColor.student;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pb-24">
        <div className="relative max-w-6xl mx-auto mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
        </div>

        {/* TOP PROFILE BANNER WITH AVATAR */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-white/10 overflow-hidden shadow-2xl bg-slate-800">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title="Edit Avatar in Profile Info"
              >
                <User className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{user.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${roleBadge}`}>
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-[11px] text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Account Verified
                </span>
                <span className="text-slate-600">•</span>
                <span>MSEEK Member since 2026</span>
              </div>
            </div>

            <div className="sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Edit Avatar & Info
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SIDEBAR NAVIGATION CARD */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 space-y-1.5 sticky top-24">
              <div className="px-3 py-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Menu settings
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-4 h-4" />
                  <span>Overview</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'overview' ? 'opacity-100 text-blue-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('certificates')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'certificates'
                    ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>My Certificates</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'certificates' ? 'opacity-100 text-amber-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('purchases')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'purchases'
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Lịch Sử Mua Khóa Học</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'purchases' ? 'opacity-100 text-emerald-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span>Profile Info</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'profile' ? 'opacity-100 text-blue-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'password'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4" />
                  <span>Password / Security</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'password' ? 'opacity-100 text-blue-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                  ${activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400 ${activeTab === 'settings' ? 'opacity-100 text-blue-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT CARD */}
          <div className="lg:col-span-3 space-y-6">
            {saveStatus !== 'idle' && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-fade-in
                ${saveStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {saveStatus === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Shield className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="text-sm font-medium">{saveMessage}</span>
              </div>
            )}

            {activeTab === 'overview' && (
              <ProfileOverview onNavigate={onNavigate} />
            )}

            {activeTab === 'certificates' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Chứng Chỉ Đã Đạt Được</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Danh sách tất cả chứng chỉ hoàn thành khóa học của bạn</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    {myCertificates.length} Chứng chỉ
                  </span>
                </div>

                {isCertsLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách chứng chỉ...</div>
                ) : myCertificates.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
                      <Award className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Chưa có chứng chỉ nào</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Hãy tiếp tục học tập và hoàn thành 100% nội dung các khóa học đã đăng ký để nhận chứng chỉ chính thức!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myCertificates.map((cert) => (
                      <div
                        key={cert.certificateId}
                        className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-300/50 shrink-0">
                              <Award className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{cert.courseTitle}</h4>
                              <p className="text-[11px] text-amber-700 font-mono font-semibold">{cert.certificateCode}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                            XÁC THỰC
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                          <p>Học viên: <strong className="text-slate-800">{cert.learnerName}</strong></p>
                          <p>Ngày cấp: <span className="text-slate-700">{new Date(cert.issuedAt).toLocaleDateString('vi-VN')}</span></p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <a
                            href={`/certificates/${cert.certificateId}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Xem chứng chỉ
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'purchases' && (
              <PurchaseHistoryTab />
            )}

            {activeTab === 'profile' && (
              <ProfileInfoForm 
                user={user} 
                onSaveSuccess={(msg) => triggerAlert('success', msg)} 
                onSaveError={(msg) => triggerAlert('error', msg)}
                onUpdateUser={onUpdateUser}
              />
            )}

            {activeTab === 'password' && (
              <PasswordForm 
                isGoogleLogin={user.isGoogleLogin}
                onSaveSuccess={(msg) => triggerAlert('success', msg)} 
                onSaveError={(msg) => triggerAlert('error', msg)} 
              />
            )}

            {activeTab === 'settings' && (
              <PreferencesForm 
                onSaveSuccess={(msg) => triggerAlert('success', msg)} 
                onSaveError={(msg) => triggerAlert('error', msg)} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};