import React, { useState } from 'react';
import { Save } from 'lucide-react';

interface ProfileInfoFormProps {
  user: { name: string; email: string };
  onSaveSuccess: (msg: string) => void;
  onSaveError: (msg: string) => void;
}

export const ProfileInfoForm: React.FC<ProfileInfoFormProps> = ({ 
  user, 
  onSaveSuccess, 
  onSaveError 
}) => {
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: '+84 901 234 567',
    location: 'Ho Chi Minh City, Vietnam',
    bio: 'Passionate learner dedicated to mastering professional hosting, public speaking, and live event management. Currently building skills in Wedding MCing and Keynote Delivery.',
    skills: 'Wedding MC, Public Speaking, Vocal Training',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaveSuccess('Profile info updated successfully!');
    }, 1200);
  };

  return (
    <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Profile Information</h3>
        <p className="text-xs text-slate-500 mt-1">Update your personal information, contact address, and short biography.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Full Name</label>
          <input
            type="text"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Phone Number</label>
          <input
            type="text"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Location / Timezone</label>
          <input
            type="text"
            value={profileForm.location}
            onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">Bio</label>
        <textarea
          rows={4}
          value={profileForm.bio}
          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50 resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">Interests & Specialties (Comma Separated)</label>
        <input
          type="text"
          value={profileForm.skills}
          onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-slate-50/50"
          placeholder="e.g. Wedding MC, Voice Talents, Keynote Delivery"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {profileForm.skills.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
              {tag}
            </span>
          ))}
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
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
};
