import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  Mic2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Award,
  MessageSquare,
  User,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Send,
  X,
  Volume2,
  FileAudio,
  Plus,
  Layers,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import { speakingApi, SpeakingSubmissionDto } from '../../api/speakingApi';
import { courseApi } from '../../api/courseApi';
import { moduleApi } from '../../api/moduleApi';
import { lessonApi } from '../../api/lessonApi';
import { CourseDto } from '../../types/courseTypes';
import { ToastType } from '../../../../components/common/Toast';

export interface SpeakingAssignmentItem {
  lessonId: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description?: string;
  durationMinutes: number;
  videoUrl?: string;
}

interface InstructorSpeakingPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const InstructorSpeakingPage: React.FC<InstructorSpeakingPageProps> = ({ onToast }) => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SpeakingSubmissionDto[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdParam || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'GRADED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active grading modal state
  const [activeSubmission, setActiveSubmission] = useState<SpeakingSubmissionDto | null>(null);
  const [scoreInput, setScoreInput] = useState<number | ''>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState<boolean>(false);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  // Create Speaking Assignment Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createCourseId, setCreateCourseId] = useState<number | ''>('');
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createDuration, setCreateDuration] = useState<number>(15);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState<boolean>(false);

  // Created Speaking Assignments state
  const [speakingAssignments, setSpeakingAssignments] = useState<SpeakingAssignmentItem[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);

  // Fetch created speaking assignments for instructor's courses
  const loadAssignments = async (courseList: CourseDto[]) => {
    if (!courseList || courseList.length === 0) return;
    setIsLoadingAssignments(true);
    try {
      const items: SpeakingAssignmentItem[] = [];
      for (const course of courseList) {
        try {
          const lessons = await lessonApi.getLessonsByCourseId(course.courseId);
          const assignmentLessons = lessons.filter((l) => l.lessonType === 'ASSIGNMENT');
          for (const al of assignmentLessons) {
            items.push({
              lessonId: al.lessonId,
              courseId: course.courseId,
              courseTitle: course.title,
              title: al.title,
              description: al.description,
              durationMinutes: al.durationMinutes,
              videoUrl: al.videoUrl,
            });
          }
        } catch (err) {
          // ignore single course error
        }
      }
      setSpeakingAssignments(items);
    } catch (err) {
      console.warn('Failed to load speaking assignments', err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleDeleteAssignment = async (lessonId: number) => {
    try {
      await lessonApi.deleteLesson(lessonId);
      if (onToast) onToast('Đã xóa bài tập nói', '', 'success');
      setSpeakingAssignments((prev) => prev.filter((a) => a.lessonId !== lessonId));
    } catch (err: any) {
      console.error('Failed to delete speaking assignment', err);
      if (onToast) onToast('Thất bại', err.message || 'Không thể xóa bài tập nói.', 'error');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCourseId) {
      if (onToast) onToast('Vui lòng chọn khóa học', 'Khóa học là bắt buộc.', 'error');
      return;
    }
    if (!createTitle.trim()) {
      if (onToast) onToast('Vui lòng nhập tên bài tập nói', '', 'error');
      return;
    }

    setIsCreatingAssignment(true);
    try {
      await lessonApi.createLesson(Number(createCourseId), {
        title: createTitle.trim(),
        description: createDescription.trim(),
        durationMinutes: createDuration || 15,
        moduleId: undefined,
        lessonType: 'ASSIGNMENT',
        status: 'ACTIVE',
        isPreview: false,
      });

      if (onToast)
        onToast('Tạo bài tập nói thành công!', 'Bài tập nói tổng khóa học đã được khởi tạo.', 'success');
      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateDuration(15);
      setCreateCourseId('');
      loadSubmissions(true);
      loadAssignments(courses);
    } catch (err: any) {
      console.error('Failed to create speaking assignment:', err);
      if (onToast)
        onToast('Thất bại', err.message || 'Có lỗi xảy ra khi tạo bài tập nói.', 'error');
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // Fetch courses taught by instructor for filtering dropdown & creation modal
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await courseApi.getInstructorCourses();
        if (res && Array.isArray(res.data)) {
          setCourses(res.data);
          loadAssignments(res.data);
        }
      } catch (err) {
        console.warn('Failed to load instructor courses', err);
      }
    };
    loadCourses();
  }, []);

  // Filtered Speaking Assignments
  const filteredAssignments = useMemo(() => {
    if (selectedCourseId !== 'ALL' && !isNaN(Number(selectedCourseId))) {
      return speakingAssignments.filter((a) => a.courseId === Number(selectedCourseId));
    }
    return speakingAssignments;
  }, [speakingAssignments, selectedCourseId]);

  // Fetch submissions
  const loadSubmissions = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let res;
      if (selectedCourseId !== 'ALL' && !isNaN(Number(selectedCourseId))) {
        res = await speakingApi.getCourseSubmissions(Number(selectedCourseId));
      } else {
        res = await speakingApi.getInstructorSubmissions();
      }

      if (res.success && res.data) {
        setSubmissions(res.data);
      } else {
        setError(res.message || 'Không thể tải danh sách bài nộp nói.');
      }
    } catch (err: any) {
      console.error('Error fetching speaking submissions:', err);
      setError(err.message || 'Lỗi kết nối khi tải danh sách bài nộp.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [selectedCourseId]);

  // Derived Statistics
  const stats = useMemo(() => {
    const totalAssignments = speakingAssignments.length;
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === 'SUBMITTED').length;
    const graded = submissions.filter((s) => s.status === 'GRADED').length;
    const gradedList = submissions.filter((s) => s.score !== null && s.score !== undefined);
    const avgScore =
      gradedList.length > 0
        ? Math.round(gradedList.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedList.length)
        : 0;

    return { totalAssignments, total, pending, graded, avgScore };
  }, [speakingAssignments, submissions]);

  // Filtered List
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Status filter
      if (statusFilter === 'SUBMITTED' && s.status !== 'SUBMITTED') return false;
      if (statusFilter === 'GRADED' && s.status !== 'GRADED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLearner = s.learnerName.toLowerCase().includes(q) || s.learnerEmail.toLowerCase().includes(q);
        const matchLesson = s.lessonTitle.toLowerCase().includes(q);
        const matchCourse = s.courseTitle.toLowerCase().includes(q);
        if (!matchLearner && !matchLesson && !matchCourse) return false;
      }

      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Handle open grading modal
  const handleOpenGradingModal = (sub: SpeakingSubmissionDto) => {
    setActiveSubmission(sub);
    setScoreInput(sub.score ?? 85);
    setFeedbackInput(sub.feedback || '');
  };

  // Handle submit grade
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    if (scoreInput === '' || Number(scoreInput) < 0 || Number(scoreInput) > 100) {
      if (onToast) onToast('Điểm số không hợp lệ', 'Điểm phải từ 0 đến 100.', 'error');
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const res = await speakingApi.gradeSubmission(activeSubmission.submissionId, {
        score: Number(scoreInput),
        feedback: feedbackInput.trim() || undefined,
      });

      if (res.success && res.data) {
        if (onToast) onToast('Chấm điểm thành công!', `Đã lưu kết quả cho ${res.data.learnerName}.`, 'success');
        
        // Update local state
        setSubmissions((prev) =>
          prev.map((item) => (item.submissionId === res.data.submissionId ? res.data : item))
        );
        setActiveSubmission(null);
      } else {
        if (onToast) onToast('Thất bại', res.message || 'Không thể lưu điểm.', 'error');
      }
    } catch (err: any) {
      console.error('Error grading submission:', err);
      if (onToast) onToast('Lỗi hệ thống', err.message || 'Có lỗi xảy ra khi chấm điểm.', 'error');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Quick preset grade setter
  const setScorePreset = (val: number, defaultRemark: string) => {
    setScoreInput(val);
    if (!feedbackInput.trim()) {
      setFeedbackInput(defaultRemark);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 tracking-wider uppercase mb-1">
                <Mic2 className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>Instructor Portal</span>
                <span className="text-slate-500">•</span>
                <span>Chấm bài nói (Speaking)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Quản lý Bài nói Cuối khóa
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {stats.pending} Bài chờ chấm
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Nghe file thu âm trực tiếp (.mp3, .wav), đánh giá kỹ năng phát âm & lưu lời nhận xét chi tiết cho học viên.
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold border border-purple-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tạo Bài tập nói mới</span>
              </button>

              <button
                onClick={() => loadSubmissions(true)}
                disabled={isRefreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* ── Quick Stats Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
              <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Tổng bài đã nộp</span>
                <FileAudio className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
            </div>

            <div className="bg-amber-500/10 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20">
              <div className="text-xs font-medium text-amber-300 flex items-center justify-between">
                <span>Cần chấm ngay</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
            </div>

            <div className="bg-emerald-500/10 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/20">
              <div className="text-xs font-medium text-emerald-300 flex items-center justify-between">
                <span>Đã chấm xong</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{stats.graded}</div>
            </div>

            <div className="bg-indigo-500/10 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/20">
              <div className="text-xs font-medium text-indigo-300 flex items-center justify-between">
                <span>Điểm trung bình</span>
                <Award className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-300 mt-1">{stats.avgScore} / 100</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ── Section 1: Created Speaking Assignments List ── */}
        <div className="bg-white rounded-3xl p-6 border border-purple-200/80 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bài tập nói Tổng khóa học đã khởi tạo ({filteredAssignments.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Danh sách đề bài thu âm giọng nói tổng khóa mà bạn đã tạo cho các khóa học
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-purple-500/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Bài tập nói mới</span>
            </button>
          </div>

          {isLoadingAssignments ? (
            <div className="py-8 text-center text-xs font-semibold text-purple-600 animate-pulse">
              Đang tải danh sách bài tập nói...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center bg-purple-50/50 rounded-2xl border border-purple-100">
              <Mic2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Chưa có Bài tập nói nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Bạn chưa khởi tạo Bài tập nói tổng khóa nào. Bấm nút "+ Tạo Bài tập nói mới" ở trên để khởi tạo bài tập thu âm cho học viên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.lessonId}
                  className="p-5 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/30 via-white to-slate-50 flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-700 font-extrabold text-[11px] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-purple-600" />
                        {assignment.courseTitle}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assignment.durationMinutes} phút dự kiến
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{assignment.title}</h4>

                    {assignment.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/instructor/courses/${assignment.courseId}/lessons`)}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Quản lý trong Khóa học</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAssignment(assignment.lessonId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Xóa bài tập nói này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: Student Audio Submissions ── */}
        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          {/* Left: Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({submissions.length})
            </button>

            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ chấm ({stats.pending})</span>
            </button>

            <button
              onClick={() => setStatusFilter('GRADED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'GRADED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã chấm ({stats.graded})</span>
            </button>
          </div>

          {/* Right: Search & Course Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Course Filter Dropdown */}
            <div className="relative w-full sm:w-64">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">Tất cả khóa học</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.title}
                  </option>
                ))}
              </select>
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm tên học viên, bài học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Submissions Table / Cards List ── */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">Đang tải danh sách bài thu âm...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-rose-900">{error}</h3>
            <button
              onClick={() => loadSubmissions()}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy bài nộp nào</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Chưa có học viên nào gửi bài thu âm nói phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Học viên</th>
                    <th className="py-4 px-4">Bài học / Khóa học</th>
                    <th className="py-4 px-4">File Ghi âm</th>
                    <th className="py-4 px-4">Trạng thái / Điểm</th>
                    <th className="py-4 px-4">Thời gian nộp</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSubmissions.map((sub) => {
                    const isGraded = sub.status === 'GRADED';
                    const isPending = sub.status === 'SUBMITTED';

                    return (
                      <tr key={sub.submissionId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Student Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
                              {sub.learnerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{sub.learnerName}</div>
                              <div className="text-slate-500 text-[11px] font-medium">{sub.learnerEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* Course & Lesson */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{sub.lessonTitle}</div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            <span>{sub.courseTitle}</span>
                          </div>
                        </td>

                        {/* Audio Player Inline */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <audio
                              controls
                              preload="none"
                              src={sub.audioUrl}
                              className="h-8 max-w-[180px] rounded-md border border-slate-200"
                            />
                          </div>
                          {sub.note && (
                            <div className="text-[11px] italic text-slate-500 mt-1 truncate max-w-[200px]" title={sub.note}>
                              "{sub.note}"
                            </div>
                          )}
                        </td>

                        {/* Status & Score */}
                        <td className="py-4 px-4">
                          {isGraded ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {sub.score} / 100
                              </span>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Chờ chấm
                            </span>
                          )}
                        </td>

                        {/* Submitted Date */}
                        <td className="py-4 px-4 text-slate-500 font-medium">
                          {new Date(sub.submittedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Action Button */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenGradingModal(sub)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm ${
                              isGraded
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isGraded ? 'Sửa điểm' : 'Chấm điểm'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Grading Modal Drawer ── */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Chấm điểm Bài nói Speaking</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{activeSubmission.lessonTitle}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveSubmission(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveGrade} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Student Details Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                    {activeSubmission.learnerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{activeSubmission.learnerName}</div>
                    <div className="text-xs text-slate-500">{activeSubmission.learnerEmail}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 block">Nộp lúc</span>
                  <span className="text-xs font-bold text-slate-700">
                    {new Date(activeSubmission.submittedAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Audio Playback Player */}
              <div className="bg-gradient-to-tr from-blue-900 to-indigo-900 text-white rounded-2xl p-4 shadow-inner">
                <div className="text-xs font-bold text-blue-300 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    Bản thu âm của học viên
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">.MP3 / .WAV</span>
                </div>

                <audio controls src={activeSubmission.audioUrl} className="w-full h-10 rounded-lg mt-1" />

                {activeSubmission.note && (
                  <div className="mt-3 p-2.5 rounded-xl bg-blue-950/60 border border-blue-400/20 text-xs text-slate-200 italic">
                    <span className="font-semibold text-blue-300 not-italic">Ghi chú của học viên: </span>
                    "{activeSubmission.note}"
                  </div>
                )}
              </div>

              {/* Score Input & Slider */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
                  Điểm số (Thang điểm 100) <span className="text-rose-500">*</span>
                </label>

                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-28 px-4 py-2.5 text-xl font-black text-center bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                  />

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scoreInput === '' ? 0 : scoreInput}
                    onChange={(e) => setScoreInput(Number(e.target.value))}
                    className="flex-1 accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Score Presets */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] font-semibold text-slate-400">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setScorePreset(95, 'Phát âm chuẩn xác, ngữ điệu tự nhiên, từ vựng phong phú!')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    95 (Xuất sắc)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScorePreset(85, 'Phát âm tốt, bài nói lưu khoát, cần chú ý một vài trọng âm.')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    85 (Giỏi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScorePreset(75, 'Đã hoàn thành bài nói, tuy nhiên còn ngập ngừng một vài chỗ.')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    75 (Khá)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScorePreset(60, 'Đạt yêu cầu tối thiểu. Cần luyện tập thêm về phát âm âm đuôi.')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    60 (Đạt)
                  </button>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
                  Lời nhận xét của Giảng viên
                </label>
                <textarea
                  rows={4}
                  placeholder="Ghi nhận xét về ngữ điệu, phát âm, từ vựng để giúp học viên tiến bộ..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingGrade ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu điểm & Gửi nhận xét</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Speaking Assignment Modal Drawer ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center font-black">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Tạo Bài tập nói (Speaking Assignment)</h3>
                  <p className="text-xs text-purple-200 mt-0.5">Tạo đề bài luyện nói / bài thu âm cuối khóa cho học viên</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAssignment} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Select Course */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Khóa học <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={createCourseId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateCourseId(val === '' ? '' : Number(val));
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">-- Chọn khóa học để tạo bài tập nói tổng khóa --</option>
                    {courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.title} ({c.status === 'PUBLISHED' ? 'Đã xuất bản' : c.status === 'APPROVED' ? 'Đã duyệt' : 'Bản nháp'})
                      </option>
                    ))}
                  </select>
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Title & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Tên Bài tập nói <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bài tập nói Cuối khóa - Lời dẫn Đám Cưới"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Thời lượng (Phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={createDuration}
                    onChange={(e) => setCreateDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-center text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Description / De bai */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Mô tả & Yêu cầu Đề bài thu âm
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập hướng dẫn chi tiết cho học viên: Yêu cầu đọc bài dẫn, thời lượng tối đa, tiêu chí chấm điểm..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAssignment || !createCourseId}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreatingAssignment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác nhận Tạo Bài tập</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorSpeakingPage;
