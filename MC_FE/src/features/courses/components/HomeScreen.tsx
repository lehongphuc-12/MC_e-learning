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
import { Course, ScreenType, Category } from '../../../types';
import { mockInstructors, mockTestimonials, mockPricingPlans } from '../../../data/mockData';
import { CourseCard } from '../../../components/common/CourseCard';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useCategoriesQuery } from '../hooks/useInstructorCourses';

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
  const categoriesQuery = useCategoriesQuery();

  const allCourses = coursesQuery.data || [];
  const rawCategories = categoriesQuery.data || [];

  // Map backend Category model to UI Category shape
  const categories: Category[] = rawCategories.map((cat, idx) => ({
    id: String(cat.categoryId),
    name: cat.categoryName,
    iconName: 'Mic',
    coursesCount: allCourses.filter(c => c.category === cat.categoryName).length,
    image: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
    ][idx % 6],
    description: cat.description || 'Master key skills in this curated discipline.',
    tag: idx === 0 ? 'Trending' : idx === 1 ? 'High Demand' : undefined,
  }));

  const dynamicCategoryTabs = ['All', ...categories.map(c => c.name).slice(0, 4)];

  const filteredCourses = selectedCategoryTab === 'All'
    ? allCourses.slice(0, 4)
    : allCourses.filter(c => c.category.toLowerCase().includes(selectedCategoryTab.toLowerCase())).slice(0, 4);


  const faqs = [
    {
      q: 'Tôi có nhận được chứng chỉ sau khi hoàn thành khóa học masterclass không?',
      a: 'Có! Sau khi hoàn thành 100% bài học và nộp kịch bản dẫn chương trình hoặc bài kiểm tra thực hành cuối khóa, bạn sẽ nhận được Chứng chỉ Số MSEEK có thể xác thực và nhúng trực tiếp vào hồ sơ LinkedIn hoặc Portfolio cá nhân.'
    },
    {
      q: 'Kịch bản mẫu và tài liệu khóa học có thể tải về không?',
      a: 'Hoàn toàn có thể. Mỗi khóa học đều bao gồm đầy đủ tài liệu PDF, Word, khung thời gian Excel, danh mục kiểm tra xử lý sự cố và các mẫu kịch bản chuẩn bị sẵn để bạn tùy chỉnh cho sự kiện thực tế.'
    },
    {
      q: 'Tôi có thể xem bài giảng ngoại tuyến trên thiết bị di động không?',
      a: 'Có, với Gói MSEEK Pro Pass bạn có thể tải toàn bộ các video chất lượng cao để học ngoại tuyến khi di chuyển hoặc chuẩn bị trong hậu trường trước giờ lên sân khấu.'
    },
    {
      q: 'Chính sách hoàn tiền 30 ngày của MSEEK hoạt động như thế nào?',
      a: 'Nếu trong vòng 30 ngày kể từ khi đăng ký bất kỳ khóa học nào bạn cảm thấy kỹ năng của mình chưa cải thiện rõ rệt, hãy liên hệ support@mseek.edu để được hoàn tiền 100% ngay lập tức mà không cần thủ tục phức tạp.'
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
                <span>Nền Tảng Đào Tạo Diễn Diễn Giả & MC Chuyên Nghiệp Hàng Đầu</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Làm Chủ Nghệ Thuật <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
                  Giao Tiếp & Dẫn Chương Trình.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Tự tin làm chủ mọi sân khấu, dẫn dắt các sự kiện cao cấp và làm thuyết trình đầy sức thuyết phục. Học hỏi trực tiếp từ các MC truyền hình, chuyên gia huấn luyện TEDx và diễn giả danh tiếng.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  id="hero-start-learning-btn"
                  onClick={() => onNavigate('courses')}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Bắt Đầu Học Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="hero-browse-courses-btn"
                  onClick={() => onNavigate('courses')}
                  className="w-full sm:w-auto px-7 py-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
                  <span>Xem Khóa Học Masterclass Nổi Bật</span>
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
                  <div className="text-xs text-slate-400">Được tin tưởng bởi hơn 50.000 học viên toàn quốc</div>
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
                    <span className="text-white font-semibold">Mô Phỏng Sân Thấu Thực Tế</span>
                  </div>

                  {allCourses.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400">KHÓA HỌC NỔI BẬT</span>
                        <span className="text-xs font-extrabold text-amber-400">★ {allCourses[0].rating}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{allCourses[0].title}</h3>
                      <p className="text-[11px] text-slate-400">Giảng viên {allCourses[0].instructor.name} • {allCourses[0].durationHours} giờ • {allCourses[0].lecturesCount} bài học</p>
                      <button
                        onClick={() => onSelectCourse(allCourses[0])}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Khám Phá Chi Tiết</span>
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
                    <div className="text-xs font-bold text-white">98% Tỷ Lệ Hài Lòng</div>
                    <div className="text-[10px] text-slate-400">Tự tin nhận show sau 60 ngày</div>
                  </div>
                </div>

                <div className="hidden sm:flex absolute -right-6 bottom-32 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">120+ Khóa Masterclass</div>
                    <div className="text-[10px] text-slate-400">Phát trực tuyến Full HD/4K</div>
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
            <div className="text-xs font-medium text-slate-500 mt-1">Khóa Học Chuyên Sâu</div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">50.000+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Học Viên Tốt Nghiệp</div>
          </div>
          <div className="text-center p-2 border-r border-slate-100 last:border-none">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">15.000+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Chứng Chỉ Đã Cấp</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-600">4.92 / 5</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Đánh Giá Trung Bình</div>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section id="popular-categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Lĩnh Vực Chuyên Môn</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Làm Chủ Lĩnh Vực Của Bạn</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Từ tiệc cưới sang trọng đến các hội nghị doanh nghiệp lớn, hãy chọn chuyên ngành bạn yêu thích.</p>
          </div>
          <button
            onClick={() => onNavigate('courses')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Xem Tất Cả Danh Mục</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.slice(0, 6).map((cat: Category, idx: number) => (
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
                    {cat.tag === 'Trending' ? 'Nổi Bật' : cat.tag === 'High Demand' ? 'Nhu Cầu Cao' : cat.tag}
                  </span>
                )}
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {cat.coursesCount} Khóa học
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
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Chương Trình Hàng Đầu</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Khóa Học Nổi Bật</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Giáo trình thực tế, lộ trình rõ ràng và chứng chỉ hoàn thành được công nhận.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dynamicCategoryTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedCategoryTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'All' ? 'Tất cả' : tab}
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
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Đội Ngũ Chuyên Gia</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Học Hỏi Từ Các Chuyên Gia Hàng Đầu</h2>
            <p className="text-xs sm:text-sm text-slate-400">Đội ngũ giảng viên từng dẫn dắt các sự kiện lớn, các chương trình truyền hình và đại hội quy mô lớn.</p>
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
                    <div className="text-[10px] text-slate-400">Học viên</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-400">★ {inst.rating}</div>
                    <div className="text-[10px] text-slate-400">Đánh giá</div>
                  </div>
                  <div>
                    <div className="font-bold text-white">{inst.coursesCount}</div>
                    <div className="text-[10px] text-slate-400">Khóa học</div>
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
              "MSEEK đã thay đổi hoàn toàn sự nghiệp dẫn chương trình của tôi. Bài học mô phỏng sân khấu và quy trình từng bước của khóa học giúp tôi tự tin dẫn dắt sự kiện 1.200 khách hàng hoàn hảo."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <img
                src={mockTestimonials[0].avatar}
                alt={mockTestimonials[0].author}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-600"
              />
              <div className="text-left">
                <div className="text-sm font-bold text-slate-900">Nguyễn Thu Thảo</div>
                <div className="text-xs text-slate-500">Giám đốc Sự kiện • <span className="text-blue-600 font-semibold">Nexus Global</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thắc Mắc Thường Gặp</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Hỏi & Đáp</h2>
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
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Sẵn Sàng Làm Chủ Giọng Nói Và Tự Tin Trên Mọi Sân Khấu?</h2>
            <p className="text-xs sm:text-sm text-blue-100">
              Gia nhập cùng hơn 50.000 học viên đang rèn luyện kỹ năng nói trước công chúng và dẫn chương trình ngay hôm nay.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white hover:bg-slate-100 text-blue-900 font-extrabold text-sm rounded-xl shadow-lg transition-all text-center cursor-pointer"
            >
              Đăng Ký Học Ngay
            </button>
            <button
              onClick={() => onNavigate('courses')}
              className="px-6 py-4 bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl border border-blue-400/40 transition-all text-center cursor-pointer"
            >
              Xem Danh Mục Khóa Học
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
