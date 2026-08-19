import React, { useState } from 'react';
import { 
  Star, 
  Clock, 
  Award, 
  CheckCircle2, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Globe, 
  FileText, 
  Download, 
  Heart, 
  Share2, 
  Users, 
  BookOpen, 
  Tv, 
  Smartphone, 
  Infinity as InfinityIcon,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Course, ScreenType } from '../../types';
import { mockCourses } from '../../data/mockData';

interface CourseDetailScreenProps {
  course: Course | null;
  onNavigate: (screen: ScreenType) => void;
  onEnroll: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  isWishlisted: boolean;
  onPreviewVideo: (course: Course) => void;
}

export const CourseDetailScreen: React.FC<CourseDetailScreenProps> = ({
  course: initialCourse,
  onNavigate,
  onEnroll,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onPreviewVideo,
}) => {
  // Default to wedding MC masterclass if none passed
  const course = initialCourse || mockCourses[0];
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

  return (
    <div id="course-detail-screen" className="space-y-12 pb-20 animate-fadeIn">
      {/* 1. DARK HERO BANNER */}
      <section className="bg-slate-950 text-white pt-8 pb-14 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button onClick={() => onNavigate('home')} className="hover:text-white">Home</button>
            <span>/</span>
            <button onClick={() => onNavigate('courses')} className="hover:text-white">Courses</button>
            <span>/</span>
            <span className="text-blue-400 font-medium">{course.category}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Header Info */}
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

              {/* Rating & Metadata Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-amber-300 text-sm">{course.rating}</span>
                  <span className="text-slate-400">({course.reviewsCount.toLocaleString()} ratings)</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>{course.studentsCount.toLocaleString()} students enrolled</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{course.language} (Subtitles: {course.subtitles.slice(0, 2).join(', ')})</span>
                </div>
              </div>

              {/* Instructor Lead By */}
              <div className="flex items-center gap-3 pt-3">
                <img
                  src={course.instructor.avatar}
                  alt={course.instructor.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500"
                />
                <div className="text-xs">
                  <div className="text-slate-400">Created by</div>
                  <div className="font-bold text-white text-sm">{course.instructor.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTENT + STICKY SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Left Column */}
          <div className="lg:col-span-8 space-y-10">
            {/* What you'll learn */}
            <section id="what-you-will-learn" className="p-6 sm:p-8 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>What You Will Master in This Program</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {course.learningOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 leading-relaxed font-medium">{outcome}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Course Description */}
            <section id="course-description" className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Course Overview</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Video Content</div>
                  <div className="font-bold text-slate-900">{course.durationHours} Hours HD</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Lectures</div>
                  <div className="font-bold text-slate-900">{course.lecturesCount} Lessons</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Skill Level</div>
                  <div className="font-bold text-slate-900">{course.level}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium">Access</div>
                  <div className="font-bold text-slate-900">Full Lifetime</div>
                </div>
              </div>
            </section>

            {/* Curriculum Accordion */}
            <section id="course-curriculum" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Course Curriculum</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {course.curriculum.length} sections • {course.lecturesCount} lectures • {course.durationHours} hours total
                  </p>
                </div>
                <button
                  onClick={() => {
                    const allOpen = Object.values(openSections).every(Boolean);
                    const updated: Record<string, boolean> = {};
                    course.curriculum.forEach(s => updated[s.id] = !allOpen);
                    setOpenSections(updated);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Expand / Collapse All
                </button>
              </div>

              {/* Sections list */}
              <div className="space-y-3">
                {course.curriculum.map((section) => (
                  <div
                    key={section.id}
                    className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs"
                  >
                    {/* Section Header */}
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

                    {/* Section Lectures */}
                    {openSections[section.id] && (
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
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Requirements & Target Audience */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Requirements</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  {course.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Who This Course is For</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  {course.targetAudience.map((aud, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5" />
                      <span>{aud}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Instructor Profile Card */}
            <section id="instructor-profile" className="p-6 bg-slate-900 text-white rounded-2xl space-y-4">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Master Mentor</span>
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
                    <span className="font-bold text-amber-400">★ {course.instructor.rating} Rating</span>
                    <span>•</span>
                    <span>{course.instructor.studentsCount.toLocaleString()} Students</span>
                    <span>•</span>
                    <span>{course.instructor.coursesCount} Masterclasses</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {course.instructor.bio}
              </p>
            </section>

            {/* Student Reviews */}
            <section id="student-reviews" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Verified Student Feedback</h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{course.rating} Course Rating</span>
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

          {/* Right Sticky Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Video Preview Box */}
              <div className="relative aspect-video bg-black group overflow-hidden">
                <img
                  src={course.videoPreviewThumb || course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => onPreviewVideo(course)}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-900/80 hover:scale-110 transition-all cursor-pointer"
                >
                  <Play className="w-7 h-7 ml-1 fill-white" />
                </button>
                <div className="absolute bottom-2 left-3 px-2 py-0.5 bg-black/70 rounded text-[10px] text-white font-bold">
                  Preview Sample Lesson
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">${course.price}</span>
                    {course.originalPrice && (
                      <>
                        <span className="text-sm text-slate-400 line-through">${course.originalPrice}</span>
                        <span className="text-xs font-bold text-emerald-600">{course.discountPercentage}% OFF</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-rose-500 font-semibold">⚡ Limited time masterclass enrollment rate</p>
                </div>

                {/* Primary CTA buttons */}
                <div className="space-y-2.5">
                  <button
                    id="sticky-enroll-now-btn"
                    onClick={() => onEnroll(course)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enroll Masterclass Now</span>
                  </button>

                  <button
                    id="sticky-add-cart-btn"
                    onClick={() => onAddToCart(course)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Add to Shopping Cart</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onToggleWishlist(course.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isWishlisted ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                      <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Course Includes Bullets */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">This masterclass includes:</div>
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-blue-600" />
                    <span>{course.durationHours} hours on-demand 4K video</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>18 downloadable scripts & timeline sheets</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Access on mobile, tablet, and TV</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <InfinityIcon className="w-4 h-4 text-blue-600" />
                    <span>Full lifetime access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span>Verified MSEEK Certificate of Completion</span>
                  </div>
                </div>

                {/* Guarantee */}
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>30-Day Money-Back Guarantee. No questions asked.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
