import React, { useState } from 'react';
import { 
  Mic, 
  Sparkles, 
  ArrowRight, 
  Star, 
  Award, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Course, ScreenType } from '../../../types';
import { mockCategories, mockInstructors, mockTestimonials, mockPricingPlans } from '../../../data/mockData';
import { CourseCard } from '../../../components/common/CourseCard';
import { useCoursesQuery } from '../hooks/useCoursesQuery';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectCourse: (course: Course) => void;
  onPreviewVideo: (course: Course) => void;
  onAddToCart: (course: Course) => void;
  onToggleWishlist: (courseId: string) => void;
  wishlistCourseIds: string[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onSelectCourse,
  onPreviewVideo,
  onToggleWishlist,
  wishlistCourseIds,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [isAnnualPricing, setIsAnnualPricing] = useState<boolean>(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const coursesQuery = useCoursesQuery();
  const allCourses = coursesQuery.data || [];

  const filteredCourses = selectedCategoryTab === 'All'
    ? allCourses.slice(0, 4)
    : allCourses.filter(c => c.category.includes(selectedCategoryTab) || selectedCategoryTab === 'All').slice(0, 4);

  const faqs = [
    {
      q: 'Do I receive a verified certificate upon completing a masterclass?',
      a: 'Yes! Upon finishing 100% of the lectures and submitting your final speech run-sheet or practical audit, you receive a verifiable MSEEK Digital Certificate which can be embedded directly onto LinkedIn or your professional portfolio.'
    },
    {
      q: 'Are the masterclass run-sheets and templates downloadable?',
      a: 'Absolutely. Every course includes full PDF, Word, and Excel timeline architectures, crisis checklist run-sheets, and fill-in-the-blank script templates that you can customize for your real events.'
    },
    {
      q: 'Can I watch lectures offline on mobile devices?',
      a: 'Yes, with MSEEK Pro Pass you can download all high-definition video modules for offline study while traveling or in green rooms before your stage appearances.'
    },
    {
      q: 'What is the MSEEK 30-Day Money-Back Guarantee?',
      a: 'If within 30 days of enrolling in any individual masterclass you feel the skills have not dramatically boosted your stage confidence, contact support@mseek.edu for a 100% immediate, no-questions-asked refund.'
    }
  ];

  return (
    <div id="home-screen-container" className="space-y-20 pb-20 animate-fadeIn">
      {/* HERO SECTION */}
      <section id="hero-section" className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The Premier Masterclass Platform for Speakers & Hosts</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Master the Art of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
                  Live Communication.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Command any stage, host luxury galas, and deliver electrifying keynotes. Learn directly from world-renowned broadcast hosts, TEDx coaches, and master MCs.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  id="hero-start-learning-btn"
                  onClick={() => onNavigate('courses')}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start Learning Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="hero-browse-courses-btn"
                  onClick={() => onNavigate('course-detail')}
                  className="w-full sm:w-auto px-7 py-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
                  <span>Preview Featured MC Masterclass</span>
                </button>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 border-t border-slate-800/80">
                <div className="flex -space-x-2.5">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Student" className="w-9 h-9 rounded-full ring-2 ring-slate-900 object-cover" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Student" className="w-9 h-9 rounded-full ring-2 ring-slate-900 object-cover" />
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" alt="Student" className="w-9 h-9 rounded-full ring-2 ring-slate-900 object-cover" />
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Student" className="w-9 h-9 rounded-full ring-2 ring-slate-900 object-cover" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-white ml-1">4.9/5</span>
                  </div>
                  <div className="text-xs text-slate-400">Trusted by 50,000+ graduates in 64 countries</div>
                </div>
              </div>
            </div>

            {/* Right Visual Stage Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
                    alt="Stage Host in Spotlight"
                    className="w-full h-[440px] object-cover filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 flex items-center gap-2 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-white font-semibold">Live Stage Simulation</span>
                  </div>

                  {allCourses.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400">FEATURED MASTERCLASS</span>
                        <span className="text-xs font-extrabold text-amber-400">★ {allCourses[0].rating}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{allCourses[0].title}</h3>
                      <p className="text-[11px] text-slate-400">By {allCourses[0].instructor.name} • {allCourses[0].durationHours} hrs • {allCourses[0].lecturesCount} Lectures</p>
                      <button
                        onClick={() => onSelectCourse(allCourses[0])}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Explore Masterclass</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex absolute -left-6 top-16 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl items-center gap-3 animate-float">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">98% Success Rate</div>
                    <div className="text-[10px] text-slate-400">Bookings after 60 days</div>
                  </div>
                </div>

                <div className="hidden sm:flex absolute -right-6 bottom-32 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">120+ Masterclasses</div>
                    <div className="text-[10px] text-slate-400">On-demand 4K streaming</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section id="stats-strip" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl shadow-xl border border-slate-200/80">
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">120+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Expert Masterclasses</div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">50,000+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Global Alumni</div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">15,000+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Certificates Issued</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-600">4.92 / 5</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Average Student Rating</div>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section id="popular-categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Curated Disciplines</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Master Your Stage Niche</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">From intimate wedding receptions to Fortune 500 summits, choose your specialty.</p>
          </div>
          <button
            onClick={() => onNavigate('courses')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockCategories.slice(0, 6).map((cat, idx) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('courses')}
              className={`group relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer ${
                idx === 0 || idx === 3 ? 'md:col-span-2' : 'md:col-span-1'
              }`}
            >
              <div className="h-52 overflow-hidden relative">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                {cat.tag && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-blue-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow">
                    {cat.tag}
                  </span>
                )}
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {cat.coursesCount} Courses
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section id="featured-courses-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Top Tier Programs</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Featured Masterclasses</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">High-impact curriculum with practical drills, run-sheets, and verified certification.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['All', 'Wedding & Gala', 'MC & Event', 'Public Speaking'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedCategoryTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isWishlisted={wishlistCourseIds.includes(course.id)}
              onSelect={onSelectCourse}
              onPreview={onPreviewVideo}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* TOP INSTRUCTORS */}
      <section id="top-instructors-section" className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">World-Class Mentors</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Learn from the Stage Giants</h2>
            <p className="text-xs sm:text-sm text-slate-400">Our mentors have hosted royal events, TED stages, BBC broadcasts, and Fortune 50 summits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockInstructors.slice(0, 3).map((inst) => (
              <div
                key={inst.id}
                className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 flex flex-col items-center text-center space-y-4 hover:border-blue-500/50 transition-all group"
              >
                <div className="relative">
                  <img
                    src={inst.avatar}
                    alt={inst.name}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-600/30 group-hover:scale-105 transition-transform"
                  />
                  {inst.verified && (
                    <span className="absolute bottom-0 right-0 p-1 rounded-full bg-blue-600 text-white shadow">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">{inst.name}</h3>
                  <p className="text-xs text-blue-400 font-semibold">{inst.title}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{inst.bio}</p>
                <div className="pt-3 border-t border-slate-700 w-full flex items-center justify-around text-xs text-slate-300">
                  <div>
                    <div className="font-bold text-white">{inst.studentsCount.toLocaleString()}+</div>
                    <div className="text-[10px] text-slate-400">Students</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-400">★ {inst.rating}</div>
                    <div className="text-[10px] text-slate-400">Instructor Rating</div>
                  </div>
                  <div>
                    <div className="font-bold text-white">{inst.coursesCount}</div>
                    <div className="text-[10px] text-slate-400">Masterclasses</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL SPOTLIGHT */}
      <section id="testimonials-section" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-blue-900/20 via-blue-600/10 to-indigo-900/20 border border-blue-200/80 shadow-md">
          <div className="space-y-6 text-center">
            <div className="flex justify-center text-amber-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400" />
              ))}
            </div>
            <blockquote className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
              "{mockTestimonials[0].quote}"
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <img
                src={mockTestimonials[0].avatar}
                alt={mockTestimonials[0].author}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-600"
              />
              <div className="text-left">
                <div className="text-sm font-bold text-slate-900">{mockTestimonials[0].author}</div>
                <div className="text-xs text-slate-500">{mockTestimonials[0].role} • <span className="text-blue-600 font-semibold">{mockTestimonials[0].company}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TIERS */}
      <section id="pricing-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Flexible Access</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Invest in Your Stage Future</h2>
          <p className="text-xs sm:text-sm text-slate-500">Choose individual masterclass ownership or unlock the complete MSEEK Pro catalog.</p>

          <div className="pt-3 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${!isAnnualPricing ? 'text-slate-900' : 'text-slate-400'}`}>Monthly Billing</span>
            <button
              onClick={() => setIsAnnualPricing(!isAnnualPricing)}
              className="w-12 h-6 rounded-full bg-slate-900 p-1 flex items-center transition-colors cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAnnualPricing ? 'translate-x-6 bg-blue-500' : 'translate-x-0'}`} />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${isAnnualPricing ? 'text-slate-900' : 'text-slate-400'}`}>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase">Save 25%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mockPricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 flex flex-col justify-between border transition-all duration-300 relative ${
                plan.popular
                  ? 'bg-slate-900 text-white border-blue-500 shadow-2xl scale-105 z-10'
                  : 'bg-white text-slate-900 border-slate-200 shadow-sm hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow">
                  Most Popular Choice
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className={`text-lg font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <p className={`text-xs mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    ${isAnnualPricing ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className={`text-xs ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>/ month</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-slate-200/20 text-xs">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={plan.popular ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className={`w-full mt-8 py-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/40'
                    : 'bg-slate-900 hover:bg-blue-600 text-white'
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Frequently Asked</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Questions & Answers</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-blue-600' : ''}`} />
              </button>
              {openFaqIndex === idx && (
                <div className="px-6 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section id="bottom-cta-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-8 sm:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Ready to Find Your Voice and Command Any Stage?</h2>
            <p className="text-xs sm:text-sm text-blue-100">
              Join over 50,000 learners mastering public speaking, wedding MCing, and executive communication today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white hover:bg-slate-100 text-blue-900 font-extrabold text-sm rounded-xl shadow-lg transition-all text-center cursor-pointer"
            >
              Start Free 7-Day Trial
            </button>
            <button
              onClick={() => onNavigate('courses')}
              className="px-6 py-4 bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl border border-blue-400/40 transition-all text-center cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
