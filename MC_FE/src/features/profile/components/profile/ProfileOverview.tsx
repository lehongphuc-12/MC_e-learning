import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, Award, Star, BarChart2, Zap, Trophy, TrendingUp, CheckCircle2, ChevronLeft, ChevronRight 
} from 'lucide-react';

import { useLearnedCoursesQuery } from '../../../courses/hooks/useCoursesQuery';
import { useActivityLogsQuery, useLearningStreakQuery } from '../../../courses/hooks/useLearningQueries';

interface ProfileOverviewProps {
  onNavigate: (screen: any) => void;
}





const progressColor = (p: number) =>
  p >= 80 ? 'from-emerald-400 to-emerald-500' : p >= 50 ? 'from-blue-400 to-blue-500' : 'from-amber-400 to-amber-500';

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [activityTab, setActivityTab] = useState<'courses' | 'activity'>('courses');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { data: apiEnrolledCourses, isLoading } = useLearnedCoursesQuery();
  const { data: activityLogs = [] } = useActivityLogsQuery();
  const { data: streakData } = useLearningStreakQuery();
  
  const currentLogs = activityLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(activityLogs.length / itemsPerPage);
  
  const enrolledCourses = apiEnrolledCourses || [];
  const totalEnrolled = enrolledCourses.length;
  const completedLectures = enrolledCourses.reduce((sum, c) => sum + (c.completedLecturesCount || 0), 0);
  const totalCertificates = enrolledCourses.filter(c => !!c.certificateId).length;
  const avgScore = enrolledCourses.length > 0 
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progressPercent, 0) / enrolledCourses.length) 
    : 0;

  const STATS = [
    { label: 'Enrolled', value: isLoading ? '-' : String(totalEnrolled), sub: 'courses', icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Learned', value: isLoading ? '-' : String(completedLectures), sub: 'lectures', icon: Clock, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Certificates', value: isLoading ? '-' : String(totalCertificates), sub: 'earned', icon: Award, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Avg. Score', value: isLoading ? '-' : `${avgScore}%`, sub: 'progress', icon: Star, gradient: 'from-emerald-500 to-teal-500' },
  ];

  const recentCourses = enrolledCourses.slice(0, 3).map(c => ({
    id: c.course.id,
    title: c.course.title,
    category: c.course.category,
    progress: c.progressPercent,
    thumb: c.course.thumbnail,
    instructor: c.course.instructor.name,
    nextLesson: c.lastLectureTitle || 'Continue Learning',
  }));

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Courses & Activities */}
        <div className="lg:col-span-2 space-y-6">
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
                {recentCourses.length > 0 ? recentCourses.map(c => (
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
                )) : (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">
                    You haven't enrolled in any courses yet.
                  </div>
                )}
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
                {currentLogs.length > 0 ? currentLogs.map((a, i) => (
                  <div 
                    key={i} 
                    onClick={() => a.link && navigate(a.link)}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${a.accent}`}>
                      {a.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium leading-snug hover:text-blue-600 transition-colors">{a.text}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{a.time}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">
                    No recent activity found.
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Learning Streak Widget */}
        <div className="space-y-6">
          <div className="bg-slate-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
            {/* Background effects */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/20 blur-2xl group-hover:bg-blue-400/30 transition-all duration-500"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-xs font-black tracking-widest text-blue-300 uppercase">
                Learning Streak
              </h3>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-md">
                <TrendingUp className="w-4 h-4 text-blue-300" />
              </div>
            </div>

            <div className="flex items-baseline gap-3 relative z-10">
              <span className="text-5xl font-black tracking-tight">
                {streakData?.currentStreak || 0}
              </span>
              <span className="text-slate-400 font-medium">days</span>
              <span className="text-3xl ml-1">🔥</span>
            </div>

            <div className="mt-8 space-y-3 relative z-10">
              {/* Progress bar visual (always full or just decorative) */}
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400"
                  style={{ width: streakData?.currentStreak && streakData.currentStreak > 0 ? '100%' : '5%' }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm text-slate-300 mt-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Longest streak: <strong className="text-white">{streakData?.longestStreak || 0}</strong> days</span>
                </div>
              </div>
              
              {streakData?.currentStreak === 0 && (
                <p className="text-xs text-rose-300 mt-2">
                  You lost your streak! Learn a lesson today to start a new one.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
