

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Award, 
  CheckCircle2, 
  Play, 
  PlayCircle,
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Globe, 
  FileText, 
  Heart, 
  Share2, 
  Users, 
  Tv, 
  Smartphone, 
  Infinity as InfinityIcon,
  Sparkles,
  LockKeyhole,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedTabs, TabItem } from '@/components/ui/animated-tabs';
import { Course, ScreenType } from '../../../types';
import { mockCourses } from '../../../data/mockData';
import { useCourseDetailQuery, useLearnedCoursesQuery } from '../hooks/useCoursesQuery';
import { courseSyllabusApi } from '../api/courseSyllabusApi';
import { CourseSyllabusDocumentViewer } from './CourseSyllabusDocumentViewer';

interface CourseDetailScreenProps {
  course: Course | null;
  courseId?: string;
  onNavigate: (screen: ScreenType) => void;
  onEnroll: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  isWishlisted: boolean;
  onPreviewVideo: (course: Course, lessonId?: number, lessonTitle?: string) => void;
  isEnrolled?: boolean;
  isInCart?: boolean;
  isPendingPayment?: boolean;
  onOpenCart?: () => void;
}

interface ParsedLearningOutcome {
  code: string;
  title: string;
  description: string;
}

/** Group multiline syllabus text by LO heading so each outcome reads as one learning result. */
const parseLearningOutcomes = (value?: string | null): ParsedLearningOutcome[] => {
  if (!value?.trim()) return [];
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const outcomes: ParsedLearningOutcome[] = [];
  const heading = /^LO\s*(\d+)\s*[—–-]\s*(.+)$/i;
  const hasStructuredOutcomes = lines.some((line) => heading.test(line));

  if (!hasStructuredOutcomes) {
    return lines
      .filter((line) => !/^sau khi hoàn thành khóa học/i.test(line))
      .map((line) => ({ code: '', title: line, description: '' }));
  }

  for (const line of lines) {
    if (/^sau khi hoàn thành khóa học/i.test(line)) continue;
    const match = line.match(heading);
    if (match) {
      outcomes.push({ code: `LO${match[1]}`, title: match[2].trim(), description: '' });
    } else if (outcomes.length > 0) {
      const current = outcomes[outcomes.length - 1];
      current.description = [current.description, line].filter(Boolean).join(' ');
    }
  }
  return outcomes;
};

export const CourseDetailScreen: React.FC<CourseDetailScreenProps> = ({
  course: initialCourse,
  courseId,
  onNavigate,
  onEnroll,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onPreviewVideo,
  isEnrolled: isEnrolledProp,
  isInCart = false,
  isPendingPayment = false,
  onOpenCart,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [courseId, initialCourse?.id]);

  // ============================================================
  // COURSE ID
  // Chỉ sử dụng CourseID thật từ backend.
  // Không dùng ID của mock course để gọi API.
  // ============================================================

  const rawCourseId = courseId ?? initialCourse?.id;

  const parsedCourseId =
    rawCourseId !== undefined &&
    rawCourseId !== null &&
    rawCourseId !== ''
      ? Number(rawCourseId)
      : null;

  const validCourseId =
    parsedCourseId !== null &&
    Number.isInteger(parsedCourseId) &&
    parsedCourseId > 0
      ? String(parsedCourseId)
      : null;

  // Chỉ query backend khi có CourseID hợp lệ.
  // Nhờ vậy sẽ không bao giờ gọi:
  // GET /api/courses/NaN
  const courseQuery = useCourseDetailQuery(validCourseId);

  // Ưu tiên:
  // 1. Course mới nhất từ backend
  // 2. Course được truyền vào màn hình
  // 3. Mock chỉ dùng để giữ UI không crash
  //
  // QUAN TRỌNG:
  // mock course KHÔNG được dùng làm ID gọi backend.
  const baseCourse =
    courseQuery.data ||
    initialCourse ||
    mockCourses[0];

  const syllabusOutlineQuery = useQuery({
    queryKey: ['courseSyllabus', 'publicOutline', validCourseId],
    queryFn: () => courseSyllabusApi.getOutline(Number(validCourseId)),
    enabled: Boolean(validCourseId),
    staleTime: 60_000,
  });
  const outline = syllabusOutlineQuery.data;
  const hasFullCurriculum = outline?.hasFullCurriculum === true;
  const firstLesson = outline?.modules.flatMap((module) => module.lessons)[0];
  const canPreviewFirstLesson = firstLesson?.isPreview === true;
  const splitPreviewLines = (value?: string | null) =>
    value?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const parsedOutcomes = parseLearningOutcomes(outline?.learningOutcomes ?? baseCourse.learningOutcomes.join('\n'));
  const course: Course = outline ? {
    ...baseCourse,
    description: outline.description || baseCourse.description,
    requirements: splitPreviewLines(outline.prerequisites),
    targetAudience: splitPreviewLines(outline.targetAudience),
    learningOutcomes: parsedOutcomes.map((item) => [item.code, item.title, item.description].filter(Boolean).join(' — ')),
    curriculum: outline.modules.map((module) => ({
      id: String(module.moduleId),
      title: module.title,
      lecturesCount: module.lessons.length,
      totalDuration: `${module.totalDurationMinutes} phút`,
      lectures: module.lessons.map((lesson) => ({
        id: String(lesson.lessonId),
        title: lesson.title,
        duration: `${lesson.durationMinutes} phút`,
        previewAvailable: lesson.isPreview,
      })),
    })),
    lecturesCount: outline.totalLessonCount,
    durationHours: Number((outline.totalDurationMinutes / 60).toFixed(1)),
  } : baseCourse;

  const { data: learnedCourses } = useLearnedCoursesQuery();

  const isEnrolled =
    isEnrolledProp ??
    learnedCourses?.some(
      (item) =>
        String(item.course.id) ===
        String(course.id)
    );

  const [showFullSyllabus, setShowFullSyllabus] = useState(false);
  useEffect(() => { setShowFullSyllabus(false); }, [course.id]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'sec-1': true,
    'sec-2': true,
    'sec-3': false,
    'sec-4': false
  });

  const toggleSection = (secId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    alert('Course link copied to clipboard!');
  };

  // A direct URL refresh has no selectedCourse in memory. Wait for the ID-based
  // request instead of briefly rendering the unrelated first mock course.
  if (!initialCourse && validCourseId && courseQuery.isLoading) {
    return <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4 text-sm font-semibold text-slate-500">Đang tải thông tin khóa học…</div>;
  }
  if (!initialCourse && validCourseId && !courseQuery.data) {
    return <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4 text-sm font-semibold text-slate-500">Không tìm thấy khóa học này hoặc khóa học không còn được công khai.</div>;
  }

  return (
    <div id="course-detail-screen" className="space-y-12 pb-20 animate-fadeIn">
      {/* DARK HERO BANNER */}
      <section className="bg-slate-950 text-white pt-8 pb-14 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button onClick={() => onNavigate('home')} className="hover:text-white">Home</button>
            <span>/</span>
            <button onClick={() => onNavigate('courses')} className="hover:text-white">Courses</button>
            <span>/</span>
            <span className="text-blue-400 font-medium">{course.category}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  {course.badge || 'Best Seller'}
                </span>
                <span className="px-3 py-1 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-full text-xs font-medium">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium">
                  {course.level}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {course.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-amber-300 text-sm">{course.rating}</span>
                  <span className="text-slate-400">({course.reviewsCount.toLocaleString()} đánh giá)</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>{course.studentsCount.toLocaleString()} học viên đã đăng ký</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{course.language} (Phụ đề: {course.subtitles.slice(0, 2).join(', ')})</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <img
                  src={course.instructor.avatar}
                  alt={course.instructor.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500"
                />
                <div className="text-xs">
                  <div className="text-slate-400">Giảng viên phụ trách</div>
                  <div className="font-bold text-white text-sm">{course.instructor.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT + STICKY SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs Bar */}
        <div className="sticky top-20 z-20 mb-8 py-3 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between">
          <AnimatedTabs
            tabs={[
              { id: 'overview', label: 'Tổng quan' },
              { id: 'curriculum', label: 'Giáo trình', badge: outline?.totalModuleCount ?? course.curriculum?.length },
              { id: 'requirements', label: 'Yêu cầu' },
              { id: 'instructor', label: 'Giảng viên' },
            ]}
            activeTab="overview"
            onChange={(id) => {
              const el = document.getElementById(`section-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            layoutId="course-detail-tabs"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-10">
            <section id="section-overview" className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Tổng quan khóa học</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Thời lượng video</div>
                  <div className="font-bold text-slate-900">{course.durationHours} Giờ HD</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Số bài học</div>
                  <div className="font-bold text-slate-900">{course.lecturesCount} Bài học</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Cấp độ</div>
                  <div className="font-bold text-slate-900">{course.level}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Thời hạn truy cập</div>
                  <div className="font-bold text-slate-900">Trọn đời</div>
                </div>
              </div>
            </section>

            <section id="section-requirements" className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Yêu cầu tham gia khóa học</h2>
                <ul className="space-y-2 text-xs text-slate-600">
                  {(course.requirements.length ? course.requirements : ['Không yêu cầu kiến thức đầu vào cụ thể.']).map((req, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" /><span>{req}</span></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Khóa học này dành cho ai</h2>
                <ul className="space-y-2 text-xs text-slate-600">
                  {(course.targetAudience.length ? course.targetAudience : ['Xem mô tả khóa học để biết khóa học có phù hợp với bạn không.']).map((aud, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" /><span>{aud}</span></li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="section-learning-outcomes" className="p-6 sm:p-8 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Bạn sẽ làm chủ những kỹ năng gì</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedOutcomes.map((outcome, idx) => (
                  <article key={`${outcome.code}-${idx}`} className="rounded-xl border border-blue-100 bg-white/80 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900">
                          {outcome.code && <span className="mr-1.5 text-blue-700">{outcome.code}</span>}{outcome.title}
                        </h3>
                        {outcome.description && <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{outcome.description}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

            </section>

            {outline?.assessmentOverview?.trim() && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Award className="h-5 w-5 text-amber-600" />Đánh giá & hoàn thành</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{outline.assessmentOverview}</p>
              </section>
            )}

            <section id="section-curriculum" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Nội dung chương trình đào tạo</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {outline ? `${outline.totalModuleCount} giai đoạn • ${outline.totalLessonCount} bài học • ${Math.floor(outline.totalDurationMinutes / 60)} giờ ${outline.totalDurationMinutes % 60} phút` : 'Đang tải lộ trình học tập…'}
                  </p>
                </div>
                {hasFullCurriculum && <button
                  onClick={() => {
                    const allOpen = Object.values(openSections).every(Boolean);
                    const updated: Record<string, boolean> = {};
                    course.curriculum.forEach(s => updated[s.id] = !allOpen);
                    setOpenSections(updated);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Mở rộng / Thu gọn tất cả
                </button>}
              </div>

              <div className="space-y-3">
                {outline && course.curriculum.map((section) => (
                  <div
                    key={section.id}
                    className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs"
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/80 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {openSections[section.id] ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{section.title}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-normal shrink-0">
                        {section.lectures.length} lectures • {section.totalDuration}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {openSections[section.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="divide-y divide-slate-100 px-2 py-1">
                            {section.lectures.map((lec) => (
                              <div
                                key={lec.id}
                                className="px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50/80 rounded-lg transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                                  <span className="font-medium text-slate-800">{lec.title}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {lec.previewAvailable && (
                                    <button
                                      onClick={() => onPreviewVideo(course)}
                                      className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline cursor-pointer"
                                    >
                                      Preview Video
                                    </button>
                                  )}
                                  <span className="text-slate-400 font-mono text-[11px]">{lec.duration}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {outline && !hasFullCurriculum && outline.totalModuleCount > course.curriculum.length && (
                  <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-slate-50 p-4 sm:p-5">
                    <div aria-hidden="true" className="select-none space-y-3 blur-[5px] opacity-60">
                      {Array.from({ length: outline.totalModuleCount - course.curriculum.length }, (_, index) => (
                        <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="h-4 w-2/3 rounded bg-slate-300" />
                          <div className="mt-3 space-y-2"><div className="h-3 w-full rounded bg-slate-200" /><div className="h-3 w-4/5 rounded bg-slate-200" /></div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-5 text-center backdrop-blur-[1px]">
                      <div className="max-w-sm rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-lg">
                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700"><LockKeyhole className="h-5 w-5" /></span>
                        <h3 className="mt-3 text-sm font-bold text-slate-900">Mở khóa toàn bộ lộ trình</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">Bạn đang xem trước giai đoạn đầu. Đăng ký khóa học để xem đầy đủ các giai đoạn và bài học còn lại.</p>
                        {!isEnrolled && <button type="button" onClick={() => onEnroll(course)} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">Đăng ký để mở khóa</button>}
                      </div>
                    </div>
                  </div>
                )}
                {!outline && <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Đang tải nội dung chương trình đào tạo…</div>}
              </div>

              {outline?.hasFullSyllabus && outline.fullSyllabusVersionId && outline.fullSyllabusContentType && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-indigo-600" />Đề cương chi tiết</h3>
                      <p className="mt-1 text-xs text-slate-600">{outline.fullSyllabusFileName} · Bản đã được Admin duyệt</p>
                    </div>
                    {isEnrolled ? (
                      <button type="button" onClick={() => setShowFullSyllabus((value) => !value)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">{showFullSyllabus ? 'Ẩn đề cương' : 'Xem đề cương'}</button>
                    ) : (
                      <span className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-700">Mở sau khi đăng ký khóa học</span>
                    )}
                  </div>
                  {showFullSyllabus && isEnrolled && <CourseSyllabusDocumentViewer className="mt-4" courseId={Number(course.id)} version={{ syllabusVersionId: outline.fullSyllabusVersionId, versionNumber: 0, contentType: outline.fullSyllabusContentType }} />}
                </div>
              )}
            </section>

            <section id="section-instructor" className="p-6 bg-slate-900 text-white rounded-2xl space-y-4">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Giảng viên phụ trách</span>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <img
                  src={course.instructor.avatar}
                  alt={course.instructor.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-500 shadow-md"
                />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">{course.instructor.name}</h3>
                  <p className="text-xs text-blue-300 font-semibold">{course.instructor.title}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="font-bold text-amber-400">★ {course.instructor.rating} Đánh giá</span>
                    <span>•</span>
                    <span>{course.instructor.studentsCount.toLocaleString()} Học viên</span>
                    <span>•</span>
                    <span>{course.instructor.coursesCount} Khóa đào tạo</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {course.instructor.bio}
              </p>
            </section>

            <section id="student-reviews" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Đánh giá từ học viên thực tế</h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{course.rating} Điểm đánh giá khóa học</span>
                </div>
              </div>

              <div className="space-y-4">
                {course.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{rev.author}</div>
                          <div className="text-[11px] text-slate-400">{rev.date}</div>
                        </div>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="relative aspect-video bg-black group overflow-hidden">
                <img
                  src={course.videoPreviewThumb || course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                />
                {canPreviewFirstLesson && firstLesson ? (
                  <button
                    type="button"
                    aria-label={`Xem trước bài học ${firstLesson.title}`}
                    onClick={() => onPreviewVideo(course, firstLesson.lessonId, firstLesson.title)}
                    className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-900/80 transition hover:scale-110 hover:bg-blue-500"
                  >
                    <Play className="ml-1 h-7 w-7 fill-white" />
                  </button>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 p-4 text-center">
                    <div className="max-w-xs rounded-xl border border-white/20 bg-slate-950/80 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
                      <LockKeyhole className="mx-auto h-5 w-5 text-blue-300" />
                      <p className="mt-2 text-xs font-bold">{syllabusOutlineQuery.isLoading ? 'Đang kiểm tra bài học xem trước…' : 'Khóa học này không cho phép xem trước'}</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 max-w-[80%] truncate rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                  {canPreviewFirstLesson && firstLesson ? `Xem thử: ${firstLesson.title}` : 'Bài học xem trước'}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} VNĐ`}
                    </span>
                    {course.originalPrice && (
                      <>
                        <span className="text-sm text-slate-400 line-through">
                          {course.originalPrice.toLocaleString('vi-VN')} VNĐ
                        </span>
                        <span className="text-xs font-bold text-emerald-600">{course.discountPercentage}% OFF</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-rose-500 font-semibold">⚡ Ưu đãi học phí đặc quyền có hạn</p>
                </div>

                <div className="space-y-2.5">
  {isEnrolled ? (
    <>
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Bạn đã đăng ký khóa học này</span>
      </div>

      <button
        id="sticky-go-to-course-btn"
        onClick={() => navigate(`/courses/${course.id}/learn`)}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <PlayCircle className="w-5 h-5 fill-white/20" />
        <span>Vào khóa học</span>
      </button>
    </>
  ) : isPendingPayment ? (
    <>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center justify-center gap-2">
        <span>Khóa học đang chờ thanh toán</span>
      </div>

      <button
        id="sticky-continue-payment-btn"
        onClick={() => onEnroll(course)}
        className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Tiếp tục thanh toán</span>
      </button>
    </>
  ) : (
    <>
      <button
        id="sticky-enroll-now-btn"
        onClick={() => onEnroll(course)}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Đăng ký khóa học ngay</span>
      </button>

      {isInCart ? (
        <button
          id="sticky-open-cart-btn"
          onClick={() => onOpenCart?.()}
          className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã có trong giỏ - Xem giỏ hàng</span>
        </button>
      ) : (
        <button
          id="sticky-add-cart-btn"
          onClick={() => onAddToCart(course)}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Thêm vào giỏ hàng</span>
        </button>
      )}
    </>
  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onToggleWishlist(course.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isWishlisted ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                      <span>{isWishlisted ? 'Đã lưu' : 'Yêu thích'}</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Chia sẻ</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">Khóa đào tạo này bao gồm:</div>
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-blue-600" />
                    <span>{course.durationHours} giờ video bài giảng chất lượng cao</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Kịch bản MC và tài liệu thực hành độc quyền</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Học linh hoạt trên điện thoại, máy tính bảng & laptop</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <InfinityIcon className="w-4 h-4 text-blue-600" />
                    <span>Truy cập bài học trọn đời không giới hạn</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Cấp chứng chỉ tốt nghiệp MSEEK sau khóa học</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Cam kết chất lượng đào tạo và hỗ trợ trực tiếp từ giảng viên</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 flex items-center justify-between gap-3 lg:hidden shadow-[0_-8px_25px_rgba(0,0,0,0.08)]">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Học phí</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-slate-900 whitespace-nowrap">
              {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} đ`}
            </span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-[10px] text-slate-400 line-through whitespace-nowrap">
                {course.originalPrice.toLocaleString('vi-VN')} đ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEnrolled ? (
            <button
              onClick={() => navigate(`/courses/${course.id}/learn`)}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Vào học</span>
            </button>
          ) : isPendingPayment ? (
            <button
              onClick={() => onEnroll(course)}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Tiếp tục thanh toán
            </button>
          ) : (
            <>
              {!isInCart && (
                <button
                  onClick={() => onAddToCart(course)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Thêm giỏ
                </button>
              )}
              <button
                onClick={() => onEnroll(course)}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Đăng ký ngay
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

