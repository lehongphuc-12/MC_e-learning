import React, { useState, useRef, useEffect } from 'react';
import { Save, Camera, Upload, Link, RotateCcw, Check, Image as ImageIcon, Loader2, X, AlertCircle } from 'lucide-react';
import { User as UserType } from '../../../types';
import { authService } from '../../../services/authService';

interface ProfileInfoFormProps {
  user: UserType | { name: string; email: string; avatar?: string };
  onSaveSuccess: (msg: string) => void;
  onSaveError: (msg: string) => void;
  onUpdateUser?: (updatedUser: Partial<UserType>) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
];

const getDefaultAvatarUrl = (name: string) => {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MC';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2563eb&color=fff&bold=true`;
};

export const ProfileInfoForm: React.FC<ProfileInfoFormProps> = ({ 
  user, 
  onSaveSuccess, 
  onSaveError,
  onUpdateUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialAvatar = ('avatar' in user && user.avatar) ? user.avatar : getDefaultAvatarUrl(user.name);

  // Saved Avatar State (from Backend)
  const [savedAvatar, setSavedAvatar] = useState<string>(initialAvatar);
  
  // Pending Preview Avatar State
  const [previewAvatar, setPreviewAvatar] = useState<string>(initialAvatar);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: '',
    location: 'Ho Chi Minh City, Vietnam',
    bio: '',
    gender: '',
    dateOfBirth: '',
    experienceLevel: '',
    learningGoal: '',
    preferredLanguage: 'en',
    skills: 'Wedding MC, Public Speaking, Vocal Training',
  });

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const hasPendingAvatarChange = pendingFile !== null || previewAvatar !== savedAvatar;

  // Fetch full profile from backend on component mount
  useEffect(() => {
    const fetchBackendProfile = async () => {
      try {
        const res = await authService.getProfile();
        if (res.success && res.data) {
          const p = res.data;
          setProfileForm((prev) => ({
            ...prev,
            name: p.fullName || prev.name,
            email: p.email || prev.email,
            phone: p.phoneNumber || '',
            bio: p.bio || '',
            gender: p.gender || '',
            dateOfBirth: p.dateOfBirth || '',
            experienceLevel: p.experienceLevel || '',
            learningGoal: p.learningGoal || '',
            preferredLanguage: p.preferredLanguage || 'en',
          }));
          if (p.avatarUrl) {
            setSavedAvatar(p.avatarUrl);
            setPreviewAvatar(p.avatarUrl);
            onUpdateUser?.({ avatar: p.avatarUrl });
          }
        }
      } catch (err) {
        // Fallback to local user prop if endpoint fails
      }
    };

    fetchBackendProfile();
  }, []);

  // Mode 1: Select File for Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onSaveError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onSaveError('Image file size should be less than 5MB.');
      return;
    }

    setPendingFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  // Mode 2: Apply Custom URL for Preview
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setPendingFile(null);
    setPreviewAvatar(customUrl.trim());
    setShowUrlInput(false);
    setCustomUrl('');
  };

  // Mode 3: Pick Preset Avatar for Preview
  const handleSelectPreset = (url: string) => {
    setPendingFile(null);
    setPreviewAvatar(url);
  };

  // Reset Avatar Preview to Initial Initials
  const handleResetAvatar = () => {
    const def = getDefaultAvatarUrl(profileForm.name);
    setPendingFile(null);
    setPreviewAvatar(def);
  };

  // Cancel Pending Avatar Preview
  const handleCancelAvatarPreview = () => {
    setPendingFile(null);
    setPreviewAvatar(savedAvatar);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save Avatar (Triggers Backend API Call)
  const handleSaveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      let res;
      if (pendingFile) {
        // Local File Upload Mode -> Cloudinary
        res = await authService.updateAvatar({ file: pendingFile });
      } else {
        // Direct URL / Preset Mode
        res = await authService.updateAvatar({ avatarUrl: previewAvatar });
      }

      if (res.success && res.data) {
        const newAvatarUrl = res.data.avatarUrl;
        setSavedAvatar(newAvatarUrl);
        setPreviewAvatar(newAvatarUrl);
        setPendingFile(null);
        onUpdateUser?.({ avatar: newAvatarUrl });
        onSaveSuccess('Avatar updated successfully!');
      } else {
        onSaveError(res.message || 'Failed to update avatar.');
      }
    } catch (err: any) {
      onSaveError(err.message || 'Error saving avatar.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle saving profile info via backend API
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        fullName: profileForm.name,
        phoneNumber: profileForm.phone,
        bio: profileForm.bio,
        gender: profileForm.gender,
        dateOfBirth: profileForm.dateOfBirth || undefined,
        experienceLevel: profileForm.experienceLevel,
        learningGoal: profileForm.learningGoal,
        preferredLanguage: profileForm.preferredLanguage,
      });

      if (res.success && res.data) {
        const p = res.data;
        onUpdateUser?.({
          name: p.fullName,
          email: p.email,
          avatar: p.avatarUrl || savedAvatar,
        });
        onSaveSuccess('Profile information updated successfully!');
      } else {
        onSaveError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      onSaveError(err.message || 'Error saving profile information.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Profile Information</h3>
        <p className="text-xs text-slate-500 mt-1">Update your personal information, contact details, and avatar photo.</p>
      </div>

      {/* ─── AVATAR SECTION ─────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">Avatar / Profile Picture</h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Modes: Local File (Cloudinary) • Image URL • Preset</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-1">
          {/* Avatar Preview Box */}
          <div className="relative group shrink-0 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-slate-200 relative">
              <img
                src={previewAvatar}
                alt={profileForm.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getDefaultAvatarUrl(profileForm.name);
                }}
              />
              {isUploadingAvatar ? (
                <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin mb-1 text-blue-400" />
                  <span className="text-[10px] font-bold">Uploading...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                  title="Change Avatar Preview"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Preview Image</span>
                </button>
              )}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Active" />
          </div>

          {/* Action Buttons & Modes */}
          <div className="flex-1 space-y-3.5 w-full">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select File</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Link className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom URL</span>
              </button>

              <button
                type="button"
                onClick={handleResetAvatar}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset to Initials"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Custom URL Input Panel */}
            {showUrlInput && (
              <div className="flex items-center gap-2 animate-fade-in pt-1">
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all cursor-pointer"
                >
                  Preview URL
                </button>
              </div>
            )}

            {/* Preset Avatars Selection */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-slate-500">
                <ImageIcon className="w-3 h-3 text-slate-400" />
                <span>Or select a preset avatar:</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = previewAvatar === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(url)}
                      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/30 scale-105'
                          : 'border-white hover:border-slate-300'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white font-bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PENDING AVATAR SAVE / CONFIRMATION BAR */}
            {hasPendingAvatarChange && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Previewing new avatar. Click <strong>Save Avatar</strong> to apply changes to your profile.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelAvatarPreview}
                    disabled={isUploadingAvatar}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={isUploadingAvatar}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Avatar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PERSONAL DETAILS SECTION ───────────────────────── */}
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
            disabled
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm bg-slate-100/70 cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Phone Number</label>
          <input
            type="text"
            value={profileForm.phone}
            placeholder="e.g. +84 901 234 567"
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
          placeholder="Tell us about your background, interests, or teaching goals..."
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
          disabled={isSavingProfile}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSavingProfile ? (
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
