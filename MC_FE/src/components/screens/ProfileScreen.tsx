import React, { useState } from 'react';
import { User as UserType } from '../../types';
import {
  Mail, Edit3, Globe, TrendingUp, BarChart2, User, Lock, 
  Settings, ChevronRight, CheckCircle2, Shield, ArrowLeft
} from 'lucide-react';
import { ProfileOverview } from './profile/ProfileOverview';
import { ProfileInfoForm } from './profile/ProfileInfoForm';
import { PasswordForm } from './profile/PasswordForm';
import { PreferencesForm } from './profile/PreferencesForm';

interface ProfileScreenProps {
  user: UserType;
  onNavigate: (screen: any) => void;
}

const roleColor: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  instructor: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  student: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password' | 'settings'>('overview');
  
  // Save Notification States
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const triggerAlert = (status: 'success' | 'error', message: string) => {
    setSaveStatus(status);
    setSaveMessage(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 3500);
  };

  const roleBadge = roleColor[user.role] || roleColor.student;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* ─── Elegant Hero ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 pt-8 pb-12 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Back navigation action */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mb-6">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-slate-800 shadow-2xl"
              />
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer border border-blue-500/30 hover:scale-105 active:scale-95">
                <Edit3 className="w-3.5 h-3.5" />
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 pb-1">
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{user.name}</h1>
              <span className={`inline-flex self-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${roleBadge}`}>
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 text-sm">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{user.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-600" /> Ho Chi Minh City, Vietnam</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-slate-600" /> Joined August 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content Section ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 pb-24">
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
            
            {/* Status alerts */}
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

            {/* Render Tab Contents */}
            {activeTab === 'overview' && (
              <ProfileOverview onNavigate={onNavigate} />
            )}

            {activeTab === 'profile' && (
              <ProfileInfoForm 
                user={user} 
                onSaveSuccess={(msg) => triggerAlert('success', msg)} 
                onSaveError={(msg) => triggerAlert('error', msg)} 
              />
            )}

            {activeTab === 'password' && (
              <PasswordForm 
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
