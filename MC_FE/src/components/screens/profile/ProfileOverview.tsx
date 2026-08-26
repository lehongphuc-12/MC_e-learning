import React, { useState } from 'react';
import { 
  BookOpen, Clock, Award, Star, BarChart2, Zap, Trophy, TrendingUp, CheckCircle2 
} from 'lucide-react';

interface ProfileOverviewProps {
  onNavigate: (screen: any) => void;
}

const MOCK_STATS = [
  { label: 'Enrolled', value: '4', sub: 'courses', icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
  { label: 'Learned', value: '42', sub: 'hours', icon: Clock, gradient: 'from-violet-500 to-purple-600' },
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

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ onNavigate }) => {
  const [activityTab, setActivityTab] = useState<'courses' | 'activity'>('courses');

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {MOCK_STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 border border-slate-100/70 hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-950 leading-none">{s.value}</div>
              <div className="text-[11px] text-slate-500 mt-1 capitalize font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Courses & Activities */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActivityTab('courses')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer
                  ${activityTab === 'courses' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <BarChart2 className="w-4 h-4" />
                My Courses
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('activity')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer
                  ${activityTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Zap className="w-4 h-4" />
                Recent Activity
              </button>
            </div>

            {/* Courses inside overview */}
            {activityTab === 'courses' && (
              <div className="divide-y divide-slate-100">
                {MOCK_COURSES.map(c => (
                  <div key={c.id} className="flex gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <img src={c.thumb} alt={c.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Instructor: <span className="font-medium text-slate-700">{c.instructor}</span></p>
                      <div className="mt-2.5">
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-slate-500">Next: <span className="text-slate-700 font-medium">{c.nextLesson}</span></span>
                          <span className={`font-bold ${c.progress >= 80 ? 'text-emerald-600' : c.progress >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {c.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${progressColor(c.progress)} transition-all duration-500`}
                            style={{ width: `${c.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3.5 bg-slate-50/50 text-center">
                  <button
                    onClick={() => onNavigate('courses')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer"
                  >
                    Explore More Academic Courses →
                  </button>
                </div>
              </div>
            )}

            {/* Activity logs inside overview */}
            {activityTab === 'activity' && (
              <div className="divide-y divide-slate-100">
                {MOCK_ACTIVITIES.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${a.accent}`}>
                      {a.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium leading-snug">{a.text}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{a.time}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Achievements & Bio */}
        <div className="space-y-6">
          {/* Monthly Goal Card */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-5 text-white shadow-lg border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Monthly Target</p>
                <p className="text-3xl font-bold mt-1">42 <span className="text-base font-medium text-slate-400">/ 60h</span></p>
              </div>
              <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full mb-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: '70%' }} />
            </div>
            <p className="text-[11px] text-slate-400">You completed 70% of your August goal! 🎯</p>
          </div>

          {/* Achievements Badges Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Achievements</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">3 / 6 earned</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BADGES.map(b => (
                <div key={b.label}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all
                    ${b.earned
                      ? 'bg-amber-500/[0.04] border-amber-500/10 text-amber-900'
                      : 'bg-slate-50 border-slate-100 opacity-30 grayscale'
                    }`}
                >
                  <span className="text-xl">{b.emoji}</span>
                  <span className="text-[9px] font-bold tracking-tight leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
