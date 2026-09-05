import {
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Lock,
  Settings,
  Shield,
  User
} from 'lucide-react';
import React, { useState } from 'react';
import { User as UserType } from '../../../types';
import { PasswordForm } from './profile/PasswordForm';
import { PreferencesForm } from './profile/PreferencesForm';
import { ProfileInfoForm } from './profile/ProfileInfoForm';
import { ProfileOverview } from './profile/ProfileOverview';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password' | 'settings'>('overview');
  
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
