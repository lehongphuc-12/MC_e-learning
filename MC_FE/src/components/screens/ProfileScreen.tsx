import React, { useState } from 'react';
import { User } from '../../types';
import {
  Award, BookOpen, CheckCircle2, Clock, Edit3, Mail, Star, 
  TrendingUp, Trophy, Zap, BarChart2, Globe
} from 'lucide-react';

interface ProfileScreenProps {
  user: User;
  onNavigate: (screen: any) => void;
}

const MOCK_STATS = [
  { label: 'Enrolled', value: '4', sub: 'courses', icon: BookOpen, gradient: 'from-blue-500 to-blue-600' },
  { label: 'Learned', value: '42', sub: 'hours', icon: Clock, gradient: 'from-violet-500 to-violet-600' },
  { label: 'Certificates', value: '2', sub: 'earned', icon: Award, gradient: 'from-amber-500 to-orange-500' },
  { label: 'Avg. Score', value: '94%', sub: 'quiz', icon: Star, gradient: 'from-emerald-500 to-teal-500' },
];

const MOCK_COURSES = [
  {
    id: 1,
    title: 'The Elegant Wedding MC',
    category: 'Wedding & Gala MCing',
    progress: 68,
    thumb: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=120&q=80',
    instructor: 'Jonathan Sterling',
    nextLesson: 'Live Emergency Scripts',
    color: 'bg-blue-500',
  },
  {
    id: 2,
    title: 'Executive Public Speaking',
    category: 'Public Speaking',
    progress: 35,
    thumb: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=120&q=80',
    instructor: 'Elena Vance',
    nextLesson: 'Stage Movement & Body Language',
    color: 'bg-violet-500',
  },
  {
    id: 3,
    title: 'Vocal Power & Broadcast Diction',
    category: 'Voice & Diction',
    progress: 90,
    thumb: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=120&q=80',
    instructor: 'Sophie Laurent',
    nextLesson: 'Warm-up & Cool-down Routines',
    color: 'bg-emerald-500',
  },
];

const MOCK_ACTIVITIES = [
  { emoji: '✅', text: 'Completed "Microphone Technique & Vocal Placement"', time: '2h ago', accent: 'text-blue-600 bg-blue-50' },
  { emoji: '🏆', text: 'Earned Vocal Power Intermediate Certificate', time: '1d ago', accent: 'text-amber-600 bg-amber-50' },
  { emoji: '⭐', text: 'Rated Wedding MC Masterclass — 5 stars', time: '3d ago', accent: 'text-violet-600 bg-violet-50' },
  { emoji: '📝', text: 'Submitted Module 3 Practice Script', time: '5d ago', accent: 'text-emerald-600 bg-emerald-50' },
];

const BADGES = [
  { emoji: '🎤', label: 'MC Pro', earned: true },
  { emoji: '🏅', label: 'Top Scorer', earned: true },
  { emoji: '🔥', label: '7-Day Streak', earned: true },
  { emoji: '📚', label: 'Bookworm', earned: false },
  { emoji: '🎯', label: 'Perfectionist', earned: false },
  { emoji: '⚡', label: 'Fast Learner', earned: false },
];

const progressColor = (p: number) =>
  p >= 80 ? 'from-emerald-400 to-emerald-500' : p >= 50 ? 'from-blue-400 to-blue-500' : 'from-amber-400 to-amber-500';

const roleColor: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  instructor: 'bg-violet-100 text-violet-700 border-violet-200',
  student: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'courses' | 'activity'>('courses');

  const roleBadge = roleColor[user.role] || roleColor.student;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ─── Hero ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 pt-12 pb-28 overflow-hidden">
        {/* Decorative dots */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
            />
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors cursor-pointer">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text */}
          <div className="text-center sm:text-left pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{user.name}</h1>
              <span className={`self-center text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${roleBadge}`}>
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-400 text-sm">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-[12px] text-slate-500">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Vietnam</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Joined August 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Row ─────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOCK_STATS.map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3 border border-slate-100">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 leading-none">{s.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 capitalize">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Main Content ───────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT – Courses / Activity tabs */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Tab switcher */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab('courses')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer
                  ${activeTab === 'courses' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <BarChart2 className="w-4 h-4" />
                My Courses
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer
                  ${activeTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Zap className="w-4 h-4" />
                Activity
              </button>
            </div>

            {/* Courses tab */}
            {activeTab === 'courses' && (
              <div className="divide-y divide-slate-50">
                {MOCK_COURSES.map(c => (
                  <div key={c.id} className="flex gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors">
                    <img src={c.thumb} alt={c.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">by {c.instructor}</p>
                      <div className="mt-2.5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] text-slate-400">Up next: <span className="text-slate-600 font-medium">{c.nextLesson}</span></span>
                          <span className={`text-[11px] font-bold ${c.progress >= 80 ? 'text-emerald-600' : c.progress >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {c.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${progressColor(c.progress)} transition-all`}
                            style={{ width: `${c.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3 bg-slate-50/50">
                  <button
                    onClick={() => onNavigate('courses')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    + Explore more courses →
                  </button>
                </div>
              </div>
            )}

            {/* Activity tab */}
            {activeTab === 'activity' && (
              <div className="divide-y divide-slate-50">
                {MOCK_ACTIVITIES.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${a.accent}`}>
                      {a.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium leading-snug">{a.text}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{a.time}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-slate-200 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT – Sidebar */}
        <div className="flex flex-col gap-5">

          {/* Monthly goal */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Monthly Goal</p>
                <p className="text-3xl font-black mt-0.5">42 <span className="text-lg font-semibold text-blue-300">/ 60h</span></p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="h-2 bg-white/20 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '70%' }} />
            </div>
            <p className="text-[11px] text-blue-200">70% towards your August target 🎯</p>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Achievements</h3>
              <span className="ml-auto text-[11px] text-slate-400 font-medium">3 / 6 earned</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {BADGES.map(b => (
                <div key={b.label}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all text-center
                    ${b.earned
                      ? 'bg-amber-50 border border-amber-200 shadow-sm'
                      : 'bg-slate-50 border border-slate-100 opacity-40 grayscale'
                    }`}
                >
                  <span className="text-xl">{b.emoji}</span>
                  <span className="text-[10px] font-semibold text-slate-600 leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bio / About */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">About</h3>
              <button className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer flex items-center gap-1">
                <Edit3 className="w-3 h-3" />Edit
              </button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Passionate learner dedicated to mastering professional hosting, public speaking, and live event management. Currently building skills in Wedding MCing and Keynote Delivery.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              {['Wedding MC', 'Public Speaking', 'Vocal Training'].map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-semibold border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
