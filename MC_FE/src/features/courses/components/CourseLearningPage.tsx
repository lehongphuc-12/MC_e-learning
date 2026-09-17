// =============================================================================
// CourseLearningPage.tsx — Course Video Player / Learning Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Clock,
  BookOpen,
  CheckCircle2,
  Eye,
  Menu,
  X,
  Video,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Layers,
  ChevronDown,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { useCourseDetail } from '../hooks/useInstructorCourses';
import { useCourseLessons } from '../hooks/useLessonQueries';
import { useCourseModules } from '../hooks/useModuleQueries';
import { useCourseProgress, useUpdateLessonProgress } from '../hooks/useLearningQueries';
import { useCourseCertificate, useIssueCertificate } from '../hooks/useCertificateQueries';
import { CertificateModal } from './CertificateModal';
import type { Lesson } from '../types/lessonTypes';

/**
 * Helper to convert various YouTube / Vimeo / Direct video URLs to embeddable iframe source.
 */
export function getEmbedVideoUrl(url?: string): string | null {
  if (!url) return null;

  // Standard YouTube Watch or Short links
  const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`;
  }

  // Vimeo
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`;
  }

  return url;
}

export const CourseLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const courseId = id ? Number(id) : 0;
  const initialLessonId = searchParams.get('lessonId') ? Number(searchParams.get('lessonId')) : null;

  // Data fetching
  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);
  const { data: lessons = [], isLoading: isLessonsLoading } = useCourseLessons(courseId);
  const { data: modules = [] } = useCourseModules(courseId);

  // Real progress & certificate queries
  const { data: progressData } = useCourseProgress(courseId);
  const updateProgressMutation = useUpdateLessonProgress(courseId);
  const { data: certificate } = useCourseCertificate(courseId);
  const issueCertMutation = useIssueCertificate(courseId);

  // Active state
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'discussion'>('overview');
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Accordion state for sidebar modules
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});

  // Sync completed lesson IDs from backend progress
  useEffect(() => {
    if (progressData?.lessonProgresses) {
      const completed = progressData.lessonProgresses
        .filter((lp) => lp.isCompleted)
        .map((lp) => lp.lessonId);
      setCompletedLessonIds(completed);
    }
  }, [progressData]);

  const toggleModuleCollapse = (moduleId: number) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  // Direct back to lessons management page
  const handleBackToLessons = () => {
    if (courseId) {
      navigate(`/instructor/courses/${courseId}/lessons`);
    } else {
      navigate('/instructor/courses');
    }
  };

  // Reset video ended state when activeLesson changes
  useEffect(() => {
    setIsVideoEnded(false);
  }, [activeLesson?.lessonId]);

  // Handle explicit lesson completion
  const handleMarkLessonComplete = (lessonId: number, isCompleted: boolean) => {
    setCompletedLessonIds((prev) =>
      isCompleted ? (prev.includes(lessonId) ? prev : [...prev, lessonId]) : prev.filter((id) => id !== lessonId)
    );
    updateProgressMutation.mutate({
      lessonId,
      dto: { isCompleted },
    });
  };

  // Detect video completion via window postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string' && event.data.includes('onStateChange')) {
          const data = JSON.parse(event.data);
          if (data.event === 'onStateChange' && data.info === 0) {
            setIsVideoEnded(true);
            if (activeLesson) {
              handleMarkLessonComplete(activeLesson.lessonId, true);
            }
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeLesson?.lessonId]);

  // Sync active lesson from URL or select first lesson by default
  useEffect(() => {
    if (lessons.length > 0) {
      if (initialLessonId) {
        const found = lessons.find((l) => l.lessonId === initialLessonId);
        if (found) {
          setActiveLesson(found);
          return;
        }
      }
      if (!activeLesson) {
        setActiveLesson(lessons[0]);
      }
    }
  }, [lessons, initialLessonId]);

  // Handle lesson selection
  const handleSelectLesson = (lesson: Lesson) => {
    setIsVideoEnded(false);
    setActiveLesson(lesson);
    setSearchParams({ lessonId: lesson.lessonId.toString() }, { replace: true });
  };

  // Handle video playback time updates (sends lastPositionSeconds & timeSpentSeconds)
  const lastUpdatedSecRef = React.useRef<number>(0);
  const handleVideoTimeUpdate = (currentTime: number) => {
    const currentSec = Math.floor(currentTime);
    if (activeLesson && currentSec > 0 && currentSec !== lastUpdatedSecRef.current && currentSec % 5 === 0) {
      lastUpdatedSecRef.current = currentSec;
      updateProgressMutation.mutate({
        lessonId: activeLesson.lessonId,
        dto: {
          lastPositionSeconds: currentSec,
          timeSpentSeconds: currentSec,
        },
      });
    }
  };

  // Toggle lesson completed checkmark
  const toggleComplete = (lessonId: number) => {
    const isCurrentlyDone = completedLessonIds.includes(lessonId);
    handleMarkLessonComplete(lessonId, !isCurrentlyDone);
  };

  // Navigation handlers
  const currentIndex = lessons.findIndex((l) => l.lessonId === activeLesson?.lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const totalDuration = lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
  const embedUrl = getEmbedVideoUrl(activeLesson?.videoUrl);

  // Group lessons by moduleId for playlist sidebar
  const lessonsByModule: Record<number, Lesson[]> = {};
  const unassignedLessons: Lesson[] = [];

  lessons.forEach((l) => {
    if (l.moduleId) {
      if (!lessonsByModule[l.moduleId]) lessonsByModule[l.moduleId] = [];
      lessonsByModule[l.moduleId].push(l);
    } else {
      unassignedLessons.push(l);
    }
  });

  if (isCourseLoading || isLessonsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">Đang tải không gian học tập...</p>
        </div>
      </div>
    );
  }

  const completionPercentage = progressData?.completionPercentage ?? (lessons.length > 0 ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0);
  const is100Percent = completionPercentage >= 100 || (lessons.length > 0 && completedLessonIds.length === lessons.length);

  const handleOpenCertificate = async () => {
    if (!certificate && courseId) {
      try {
        await issueCertMutation.mutateAsync();
      } catch (_) {}
    }
    setIsCertModalOpen(true);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLessons}
            title="Quay lại quản lý bài học"
            className="flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700/60"
          >
            <ArrowLeft className="h-4 w-4 text-indigo-400" />
            <span>Thoát / Về quản lý bài học</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-800" />
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{course?.title ?? 'Chi tiết khóa học'}</span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{modules.length} Chương</span>
              <span>•</span>
              <span>{lessons.length} bài học</span>
              <span>•</span>
              <span>{totalDuration} phút</span>
            </p>
          </div>
        </div>

        {/* Right header action */}
        <div className="flex items-center gap-3">
          {/* Progress Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-800/90 border border-slate-700 px-3 py-1 text-xs text-slate-200 font-semibold">
            <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, completionPercentage)}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">{completionPercentage}%</span>
          </div>

          {/* Certificate Button when 100% completed or already issued */}
          {(is100Percent || certificate || progressData?.certificateCode) && (
            <button
              onClick={handleOpenCertificate}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Award className="h-4 w-4" />
              <span>{certificate || progressData?.certificateCode ? 'Xem Chứng Chỉ' : 'Nhận Chứng Chỉ'}</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-400 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Bài {currentIndex >= 0 ? currentIndex + 1 : 1} / {lessons.length}</span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isSidebarOpen ? 'Ẩn danh sách' : 'Danh sách bài học'}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main Container: Player + Sidebar ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left / Center Main Content (Player & Lesson Details) */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Video Player Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-slate-800/80 shadow-2xl group">
              {/* Custom Completion Overlay when video ends */}
              {isVideoEnded && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center animate-fadeIn">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Bạn đã hoàn thành bài học này!</h3>
                  <p className="mt-1.5 text-xs text-slate-300 max-w-md line-clamp-2">
                    {activeLesson?.title}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setIsVideoEnded(false)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Phát lại bài này
                    </button>

                    {nextLesson && (
                      <button
                        onClick={() => {
                          setIsVideoEnded(false);
                          handleSelectLesson(nextLesson);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Bài tiếp theo: {nextLesson.title}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {embedUrl ? (
                embedUrl.includes('youtube.com') || embedUrl.includes('vimeo.com') ? (
                  <iframe
                    key={activeLesson?.lessonId}
                    id="youtube-player-iframe"
                    src={embedUrl}
                    title={activeLesson?.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={embedUrl}
                    controls
                    autoPlay
                    onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget.currentTime)}
                    onPause={(e) => handleVideoTimeUpdate(e.currentTarget.currentTime)}
                    onEnded={() => {
                      setIsVideoEnded(true);
                      if (activeLesson) {
                        handleMarkLessonComplete(activeLesson.lessonId, true);
                      }
                    }}
                    className="h-full w-full object-contain"
                  >
                    Trình duyệt của bạn không hỗ trợ phát video HTML5.
                  </video>
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
                    <Video className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">Chưa chọn hoặc chưa có Video bài học</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    {activeLesson
                      ? 'Bài học này chưa được cập nhật liên kết Video. Vui lòng chọn bài học khác.'
                      : 'Vui lòng chọn bài học từ danh sách bên phải để bắt đầu xem video.'}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation & Controls Bar */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm">
              <button
                disabled={!prevLesson}
                onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Bài trước:</span>
                <span className="truncate max-w-[140px]">{prevLesson ? prevLesson.title : '---'}</span>
              </button>

              <button
                onClick={() => activeLesson && toggleComplete(activeLesson.lessonId)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeLesson && completedLessonIds.includes(activeLesson.lessonId)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {activeLesson && completedLessonIds.includes(activeLesson.lessonId)
                    ? 'Đã hoàn thành'
                    : 'Đánh dấu hoàn thành'}
                </span>
              </button>

              <button
                disabled={!nextLesson}
                onClick={() => nextLesson && handleSelectLesson(nextLesson)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <span className="hidden sm:inline">Bài tiếp:</span>
                <span className="truncate max-w-[140px]">{nextLesson ? nextLesson.title : '---'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Lesson Title & Info */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-400 border border-indigo-500/20">
                      Bài #{activeLesson?.orderIndex ?? 1}
                    </span>
                    {activeLesson?.isPreview && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                        <Eye className="h-3 w-3" /> Xem thử
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {activeLesson?.durationMinutes ?? 0} phút
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {activeLesson?.title ?? 'Bài học chưa có tiêu đề'}
                  </h2>
                </div>

                {activeLesson?.videoUrl && (
                  <a
                    href={activeLesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Mở link gốc Video</span>
                  </a>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-800 flex items-center gap-6 text-xs font-semibold text-slate-400 pt-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab === 'overview' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
                  }`}
                >
                  Mô tả bài học
                  {activeTab === 'overview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab === 'notes' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
                  }`}
                >
                  Tài liệu & Ghi chú
                  {activeTab === 'notes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab === 'discussion' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
                  }`}
                >
                  Thảo luận & Hỏi đáp
                  {activeTab === 'discussion' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="pt-2 text-xs text-slate-300 leading-relaxed">
                {activeTab === 'overview' && (
                  <p className="whitespace-pre-line text-slate-300">
                    {activeLesson?.description || 'Bài học này chưa có nội dung mô tả chi tiết.'}
                  </p>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-slate-400">Các tài liệu đính kèm hoặc ghi chú quan trọng cho bài học này:</p>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 border border-slate-800">
                      <FileText className="h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="font-semibold text-slate-200">Giao-trinh-{activeLesson?.title}.pdf</p>
                        <p className="text-[11px] text-slate-500">Tài liệu tham khảo chính thức</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'discussion' && (
                  <div className="space-y-3">
                    <p className="text-slate-400">Bình luận và trao đổi ý kiến với học viên & giảng viên:</p>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 border border-slate-800">
                      <MessageSquare className="h-5 w-5 text-indigo-400" />
                      <input
                        type="text"
                        placeholder="Viết câu hỏi hoặc nhận xét của bạn..."
                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar Playlist (Grouped by Modules) ────────────────────────── */}
        {isSidebarOpen && (
          <aside className="w-80 shrink-0 border-l border-slate-800/80 bg-slate-900/90 flex flex-col h-full z-20 transition-all duration-300">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Lộ trình học tập
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {completedLessonIds.length}/{lessons.length} bài đã xem
                </p>
              </div>
            </div>

            {/* Lesson List grouped by Modules */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
              {lessons.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Chưa có bài học nào trong khóa học này.
                </div>
              ) : modules.length > 0 ? (
                <>
                  {modules.map((mod) => {
                    const modLessons = lessonsByModule[mod.moduleId] || [];
                    const isCollapsed = collapsedModules[mod.moduleId];

                    return (
                      <div key={mod.moduleId} className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/50">
                        {/* Module Header in Sidebar */}
                        <button
                          onClick={() => toggleModuleCollapse(mod.moduleId)}
                          className="w-full flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-200 truncate">
                              Chương {mod.orderIndex}: {mod.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-slate-400">
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                              {modLessons.length}
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </button>

                        {/* Module Lessons List */}
                        {!isCollapsed && (
                          <div className="p-1 space-y-1">
                            {modLessons.length === 0 ? (
                              <div className="p-3 text-[11px] text-slate-500 text-center italic">
                                Chưa có bài học
                              </div>
                            ) : (
                              modLessons.map((lesson) => {
                                const isActive = lesson.lessonId === activeLesson?.lessonId;
                                const isCompleted = completedLessonIds.includes(lesson.lessonId);

                                return (
                                  <button
                                    key={lesson.lessonId}
                                    onClick={() => handleSelectLesson(lesson)}
                                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                      isActive
                                        ? 'bg-indigo-600/25 border border-indigo-500/40 text-white shadow-md'
                                        : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                                    }`}
                                  >
                                    <div className="shrink-0 mt-0.5">
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                      ) : isActive ? (
                                        <PlayCircle className="h-4 w-4 text-indigo-400 animate-pulse" />
                                      ) : (
                                        <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-500">
                                          #{lesson.orderIndex}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className={`font-semibold line-clamp-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>
                                        {lesson.title}
                                      </p>
                                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {lesson.durationMinutes} phút
                                        </span>
                                        {lesson.isPreview && (
                                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-emerald-400 font-bold">
                                            Xem thử
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Unassigned lessons in playlist */}
                  {unassignedLessons.length > 0 && (
                    <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/50">
                      <div className="p-3 bg-slate-900/80 text-xs font-bold text-amber-400 flex items-center justify-between">
                        <span>Bài học tự do ({unassignedLessons.length})</span>
                      </div>
                      <div className="p-1 space-y-1">
                        {unassignedLessons.map((lesson) => {
                          const isActive = lesson.lessonId === activeLesson?.lessonId;
                          const isCompleted = completedLessonIds.includes(lesson.lessonId);

                          return (
                            <button
                              key={lesson.lessonId}
                              onClick={() => handleSelectLesson(lesson)}
                              className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-amber-600/25 border border-amber-500/40 text-white shadow-md'
                                  : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="shrink-0 mt-0.5">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : isActive ? (
                                  <PlayCircle className="h-4 w-4 text-amber-400 animate-pulse" />
                                ) : (
                                  <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-500">
                                    #{lesson.orderIndex}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold line-clamp-2 ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                                  {lesson.title}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{lesson.durationMinutes} phút</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Fallback flat list if no modules created yet */
                lessons.map((lesson) => {
                  const isActive = lesson.lessonId === activeLesson?.lessonId;
                  const isCompleted = completedLessonIds.includes(lesson.lessonId);

                  return (
                    <button
                      key={lesson.lessonId}
                      onClick={() => handleSelectLesson(lesson)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-md'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : isActive ? (
                          <PlayCircle className="h-4 w-4 text-indigo-400 animate-pulse" />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-500">
                            #{lesson.orderIndex}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold line-clamp-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {lesson.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.durationMinutes} phút
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Certificate Modal dialog */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        certificate={certificate || null}
        courseTitle={course?.title}
      />
    </div>
  );
};
