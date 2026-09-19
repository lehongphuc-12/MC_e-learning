import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  PlayCircle,
  Award,
  CheckCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Filter,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { EnrolledCourse } from '../../../data/mockData';
import { ScreenType } from '../../../types';
import { useLearnedCoursesQuery } from '../hooks/useCoursesQuery';

interface MyCoursesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const MyCoursesScreen: React.FC<MyCoursesScreenProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { data: apiEnrolledCourses, isLoading, isError } = useLearnedCoursesQuery();

  // Pure API data (100% real backend data)
  const enrolledCourses: EnrolledCourse[] = (apiEnrolledCourses as EnrolledCourse[]) || [];


  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title'>('recent');
  const PAGE_SIZE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  // Filter courses
  const filteredCourses = enrolledCourses.filter((item) => {
    if (activeTab === 'in-progress' && item.status !== 'in-progress') return false;
    if (activeTab === 'completed' && item.status !== 'completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.course.title.toLowerCase().includes(q);
      const instructorMatch = item.course.instructor.name.toLowerCase().includes(q);
      const categoryMatch = item.course.category.toLowerCase().includes(q);
      return titleMatch || instructorMatch || categoryMatch;
    }
    return true;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
    if (sortBy === 'title') return a.course.title.localeCompare(b.course.title);
    return 0; // Default recent order
  });

  // Pagination calculations
  const totalItems = sortedCourses.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedCourses = sortedCourses.slice(startIndex, startIndex + PAGE_SIZE);

  const handleTabChange = (tab: 'all' | 'in-progress' | 'completed') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const totalEnrolled = enrolledCourses.length;
  const inProgressCount = enrolledCourses.filter((c) => c.status === 'in-progress').length;
  const completedCount = enrolledCourses.filter((c) => c.status === 'completed').length;
  const certificatesCount = enrolledCourses.filter((c) => c.certificateId).length;


  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-10 shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-md border border-blue-400/30">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Góc Học Tập Cá Nhân</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Khóa Học Của Tôi
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Theo dõi tiến độ học tập, tiếp tục các bài học dở dang và chinh phục các chứng chỉ chuyên nghiệp của bạn.
              </p>
            </div>

            <button
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer self-start md:self-auto shrink-0"
            >
              <BookOpen className="w-4 h-4" />
              <span>Khám Phá Thêm Khóa Học</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-700/60">
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Đã đăng ký</p>
                <p className="text-xl font-bold text-white">{totalEnrolled}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Đang học</p>
                <p className="text-xl font-bold text-white">{inProgressCount}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Hoàn thành</p>
                <p className="text-xl font-bold text-white">{completedCount}</p>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Chứng chỉ nhận được</p>
                <p className="text-xl font-bold text-white">{certificatesCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalEnrolled})
            </button>
            <button
              onClick={() => handleTabChange('in-progress')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'in-progress'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang học ({inProgressCount})
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoàn thành ({completedCount})
            </button>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm khóa học..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="recent">Vừa học gần đây</option>
                <option value="progress">Tiến độ cao nhất</option>
                <option value="title">Tên khóa học (A-Z)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Course Cards Grid */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Đang tải danh sách khóa học...</p>
          </div>
        ) : sortedCourses.length === 0 ? (

          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy khóa học nào</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Bạn chưa đăng ký khóa học nào tương ứng với bộ lọc này hoặc tìm kiếm không trùng khớp.
            </p>
            <button
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <span>Xem danh mục khóa học</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {paginatedCourses.map((item) => {
              let localCount = 0;
              try {
                const stored = localStorage.getItem(`mc_completed_lessons_${item.course.id}`);
                if (stored) {
                  const arr = JSON.parse(stored);
                  if (Array.isArray(arr)) localCount = arr.length;
                }
              } catch (_) {}

              const totalCount = item.totalLecturesCount || 9;
              const displayCompletedCount = Math.max(item.completedLecturesCount || 0, localCount);
              const displayProgressPercent = totalCount > 0
                ? Math.round((displayCompletedCount / totalCount) * 100)
                : item.progressPercent;
              const isItemCompleted = displayProgressPercent >= 100 || item.status === 'completed';

              return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row sm:h-56 group hover:border-blue-200"
              >
                {/* ── Section 1: Thumbnail (Bên Trái - Cố định chiều cao theo card) ── */}
                <div className="relative sm:w-64 md:w-72 h-44 sm:h-full shrink-0 bg-slate-900 overflow-hidden">
                  <img
                    src={item.course.thumbnail}
                    alt={item.course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent sm:bg-none" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {isItemCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-md">
                        <Clock className="w-3.5 h-3.5" />
                        Đang học
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Info & Progress (Ở Giữa - Cân đối không gian) ──── */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {item.course.category}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Vừa học: {item.lastAccessed}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.course.title}
                    </h3>

                    {/* Instructor */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <img
                        src={item.course.instructor.avatar}
                        alt={item.course.instructor.name}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs font-medium text-slate-600">
                        {item.course.instructor.name}
                      </span>
                    </div>
                  </div>

                  {/* Progress section */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Tiến độ bài học ({displayCompletedCount}/{totalCount})
                      </span>
                      <span className="font-bold text-blue-600">{displayProgressPercent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isItemCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        }`}
                        style={{ width: `${displayProgressPercent}%` }}
                      />
                    </div>

                    {/* Last accessed lecture subtitle */}
                    {item.lastLectureTitle && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        Bài tiếp theo: <span className="text-slate-700 font-medium">{item.lastLectureTitle}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Section 3: Action Buttons (Bên Phải - Cố định & căn giữa) ── */}
                <div className="p-4 sm:p-5 sm:w-56 lg:w-60 shrink-0 bg-slate-50/60 border-t sm:border-t-0 sm:border-l border-slate-100 flex flex-col justify-center gap-2.5 sm:h-full">
                  <button
                    onClick={() => navigate(`/courses/${item.course.id}/learn`)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      item.status === 'completed'
                        ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/20'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                    }`}
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{item.status === 'completed' ? 'Học lại khóa học' : 'Tiếp tục học'}</span>
                  </button>

                  {item.certificateId && (
                    <button
                      onClick={() => navigate(`/certificates/${item.certificateId}`)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm shadow-purple-600/20 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Xem chứng chỉ</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/course-detail?id=${item.course.id}`)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Chi tiết khóa học</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
          </div>
        )}

        {/* ── Pagination Controls Bar ─────────────────────────────── */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-6">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span>
                Hiển thị <span className="font-semibold text-slate-800">{startIndex + 1}</span> -{' '}
                <span className="font-semibold text-slate-800">{Math.min(startIndex + PAGE_SIZE, totalItems)}</span> trong số{' '}
                <span className="font-semibold text-slate-800">{totalItems}</span> khóa học
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
