import React, { useState } from 'react';
import { Bell, Shield, Check } from 'lucide-react';

interface PreferencesFormProps {
  onSaveSuccess: (msg: string) => void;
  onSaveError: (msg: string) => void;
}

export const PreferencesForm: React.FC<PreferencesFormProps> = ({ 
  onSaveSuccess, 
  onSaveError 
}) => {
  const [settingsForm, setSettingsForm] = useState({
    notifyCourses: true,
    notifyAnnouncements: true,
    notifyReplies: false,
    profilePublic: true,
    twoFactor: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaveSuccess('Settings saved successfully!');
    }, 800);
  };

  return (
    <form onSubmit={handleSettingsSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Application Preferences</h3>
        <p className="text-xs text-slate-500 mt-1">Configure user interfaces, privacy modes, and message alerts.</p>
      </div>

      <div className="space-y-5">
        {/* Section: Email Notifications */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            Notification Alerts
          </h4>
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 transition-colors">Course Updates</p>
                <p className="text-xs text-slate-500">Receive alerts when new video lectures or scripts are released.</p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.notifyCourses}
                onChange={(e) => setSettingsForm({ ...settingsForm, notifyCourses: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 transition-colors">Academy Announcements</p>
                <p className="text-xs text-slate-500">Get newsletters, promo discounts, and event schedules.</p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.notifyAnnouncements}
                onChange={(e) => setSettingsForm({ ...settingsForm, notifyAnnouncements: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 transition-colors">Replies and Comments</p>
                <p className="text-xs text-slate-500">Get notified when a student or instructor comments on your work.</p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.notifyReplies}
                onChange={(e) => setSettingsForm({ ...settingsForm, notifyReplies: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Section: Privacy */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Privacy & Protection
          </h4>
          <div className="space-y-4">
            <label className="flex items-start justify-between cursor-pointer group">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 transition-colors">Public Profile Page</p>
                <p className="text-xs text-slate-500">Allow other students to view your achievements and completed courses.</p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.profilePublic}
                onChange={(e) => setSettingsForm({ ...settingsForm, profilePublic: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-950 transition-colors">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-slate-500">Secure your student account with 2FA code verification.</p>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.twoFactor}
                onChange={(e) => setSettingsForm({ ...settingsForm, twoFactor: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving Preferences...
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </form>
  );
};
