import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { paymentApi } from '../../features/payment/api/paymentApi';
import { useAuthStore } from '../../store/useAuthStore';

interface CheckoutModalProps {
  course: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: any) => void;
}

// Bảng ánh xạ toàn diện giữa ID/Slug/Title thực tế từ CSV và CourseID số nguyên
const COURSE_MAP: Record<string, { id: number; title: string; price: number }> = {
  // 1. Khóa học MC Đám Cưới Chuyên Nghiệp (ID: 1)
  'khoa-hoc-mc-dam-cuoi-chuyen-nghiep': { id: 1, title: 'Khóa học MC Đám Cưới Chuyên Nghiệp', price: 199000 },
  'course-wedding-mc': { id: 1, title: 'Khóa học MC Đám Cưới Chuyên Nghiệp', price: 199000 },
  '1': { id: 1, title: 'Khóa học MC Đám Cưới Chuyên Nghiệp', price: 199000 },

  // 2. Khóa học MC Sự Kiện & Hội Nghị (ID: 2)
  'khoa-hoc-mc-su-kien-hoi-nghi': { id: 2, title: 'Khóa học MC Sự Kiện & Hội Nghị', price: 299000 },
  'course-stage-presence': { id: 2, title: 'Khóa học MC Sự Kiện & Hội Nghị', price: 299000 },
  'course-public-speaking': { id: 2, title: 'Khóa học MC Sự Kiện & Hội Nghị', price: 299000 },
  '2': { id: 2, title: 'Khóa học MC Sự Kiện & Hội Nghị', price: 299000 },

  // 3. Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn (ID: 3)
  'ky-thuat-luyen-giong-noi-phat-am-chuan': { id: 3, title: 'Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn', price: 150000 },
  'course-voice-mastery': { id: 3, title: 'Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn', price: 150000 },
  '3': { id: 3, title: 'Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn', price: 150000 },
};

const parseValidCourseId = (course: any): number => {
  if (course?.courseId && !isNaN(Number(course.courseId))) {
    return Number(course.courseId);
  }
  if (typeof course?.id === 'number') {
    return course.id;
  }
  if (typeof course?.id === 'string') {
    const key = course.id.trim();
    if (COURSE_MAP[key]) return COURSE_MAP[key].id;

    // Nhận diện theo từ khóa trong ID / slug
    if (key.includes('dam-cuoi') || key.includes('wedding')) return 1;
    if (key.includes('su-kien') || key.includes('hoi-nghi') || key.includes('stage') || key.includes('speaking')) return 2;
    if (key.includes('giong-noi') || key.includes('phat-am') || key.includes('voice')) return 3;

    const matched = key.match(/\d+/);
    if (matched) return parseInt(matched[0], 10);
  }
  return 1;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  course,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [selectedGateway, setSelectedGateway] = useState<'VNPAY' | 'QR'>('VNPAY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !course) return null;

  const realCourseId = parseValidCourseId(course);
  
  // Đồng bộ tiêu đề và giá tiền thực tế theo Database CSV
  const matchedCourseInfo = Object.values(COURSE_MAP).find((c) => c.id === realCourseId);
  const courseTitle: string = course.title || matchedCourseInfo?.title || 'Khóa học MC Chuyên Nghiệp';
  const coursePrice: number = Number(course.price ?? matchedCourseInfo?.price ?? 199000);
  
  const courseThumbnail: string = 
    course.thumbnailUrl || 
    course.thumbnail || 
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
  const instructorName: string = 
    course.instructorName || 
    course.instructor?.name || 
    'Học viện MSEEK Mentor';
  const categoryName: string = 
    course.categoryName || 
    course.category || 
    'Nghệ Thuật MC';
  const isFreeCourse = coursePrice <= 0;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra đăng nhập
    if (!token || !user) {
      sessionStorage.setItem('pending_checkout_course_id', realCourseId.toString());
      onClose();
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setIsAlreadyEnrolled(false);

    try {
      // 2. LE02: Ghi danh khóa học (POST /api/v1/enrollments/courses/{courseId})
      const enrollRes = await paymentApi.enrollCourse(realCourseId);

      if (!enrollRes.success && enrollRes.message?.includes('đã đăng ký')) {
        setIsAlreadyEnrolled(true);
        setErrorMessage(enrollRes.message);
        setIsProcessing(false);
        return;
      }

      if (!enrollRes.success || !enrollRes.data) {
        throw new Error(enrollRes.message || 'Không thể tạo đơn ghi danh khóa học.');
      }

      const enrollment = enrollRes.data;

      // 3. Khóa học miễn phí (Price = 0) hoặc đã ACTIVE sẵn
      if (isFreeCourse || enrollment.status === 'ACTIVE') {
        setIsProcessing(false);
        setIsComplete(true);
        setTimeout(() => {
          onSuccess(course);
          setIsComplete(false);
          onClose();
          navigate(`/courses/${realCourseId}/learn`);
        }, 1200);
        return;
      }

      // 4. LE03: Khởi tạo URL thanh toán VNPay (POST /api/v1/payments)
      const paymentRes = await paymentApi.createPayment(enrollment.enrollmentId);

      if (!paymentRes.success || !paymentRes.data?.paymentUrl) {
        throw new Error(paymentRes.message || 'Cổng VNPay không trả về liên kết thanh toán.');
      }

      sessionStorage.setItem('mseek_active_payment_id', paymentRes.data.paymentId.toString());

      // 5. Chuyển hướng sang VNPay Sandbox
      window.location.href = paymentRes.data.paymentUrl;

    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(
        err?.message || 'Có lỗi xảy ra khi kết nối tới máy chủ thanh toán. Vui lòng thử lại.'
      );
    }
  };

  return (
    <div 
      id="checkout-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#020617]/85 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="checkout-modal-card" 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0B132B] via-[#070B19] to-[#040711] text-white rounded-3xl shadow-2xl border border-blue-500/25 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spotlight Stage Glow Background */}
        <div className="absolute -top-28 -left-28 w-72 h-72 bg-blue-600/25 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-indigo-600/25 rounded-full blur-[110px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Sparkles className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">MSEEK Secure Checkout</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Course #{realCourseId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Thanh toán bảo mật SSL 256-Bit • Kích hoạt tức thì</p>
            </div>
          </div>
          <button
            id="close-checkout-modal-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo đã ghi danh thành công */}
        {isComplete ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-4 relative z-10 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-black text-white">Ghi Danh Thành Công!</h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm">
              Bạn đã có toàn quyền học tập khóa <span className="font-bold text-blue-400">{courseTitle}</span>. Đang mở phòng học...
            </p>
          </div>
        ) : (
          <form onSubmit={handleProcessPayment} className="p-6 sm:p-8 space-y-6 relative z-10">
            {/* Lỗi cảnh báo */}
            {errorMessage && (
              <div className={`p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 animate-fadeIn ${
                isAlreadyEnrolled 
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' 
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}>
                {isAlreadyEnrolled ? (
                  <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="flex-1">
                  <span className="leading-relaxed">{errorMessage}</span>
                  {isAlreadyEnrolled && (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/courses/${realCourseId}/learn`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all cursor-pointer shadow-md"
                      >
                        <span>Vào phòng học ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Course Summary Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
              <div className="relative w-full sm:w-28 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-700/80 bg-slate-800">
                <img 
                  src={courseThumbnail} 
                  alt={courseTitle} 
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600/95 text-white shadow">
                  {categoryName}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-bold text-white truncate leading-tight">{courseTitle}</h4>
                <p className="text-xs text-slate-400">
                  Giảng viên: <span className="text-slate-200 font-semibold">{instructorName}</span>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-blue-400">
                    <Clock className="w-3.5 h-3.5" />
                    {course.durationHours || 12}h học tập
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Award className="w-3.5 h-3.5" />
                    Chứng chỉ xác thực
                  </span>
                </div>
              </div>

              <div className="sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                  {isFreeCourse ? 'MIỄN PHÍ' : `${coursePrice.toLocaleString('vi-VN')} VNĐ`}
                </span>
                {course.originalPrice && (
                  <span className="block text-[11px] text-slate-500 line-through">
                    {course.originalPrice.toLocaleString('vi-VN')} VNĐ
                  </span>
                )}
              </div>
            </div>

            {/* Lựa chọn cổng thanh toán */}
            {!isFreeCourse && !isAlreadyEnrolled && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cổng thanh toán chính thức
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cổng VNPay */}
                  <div
                    onClick={() => setSelectedGateway('VNPAY')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedGateway === 'VNPAY'
                        ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-600/20'
                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                        VNP
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Cổng VNPAY Sandbox</div>
                        <div className="text-[10px] text-slate-400">ATM Nội Địa • QR Pay • Visa/Master</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedGateway === 'VNPAY' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                    }`}>
                      {selectedGateway === 'VNPAY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Chuyển khoản QR */}
                  <div
                    onClick={() => setSelectedGateway('QR')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between opacity-50 hover:opacity-75 ${
                      selectedGateway === 'QR'
                        ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40'
                        : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                        QR
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Chuyển Khoản 24/7</div>
                        <div className="text-[10px] text-slate-400">VietQR Tự động (Sắp ra mắt)</div>
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded-full border border-slate-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết thanh toán */}
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Khóa đào tạo:</span>
                <span className="text-slate-200 font-semibold truncate max-w-[260px]">{courseTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Thời hạn truy cập:</span>
                <span className="text-emerald-400 font-semibold">90 ngày học tập (Tự động kích hoạt)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-200">Tổng thanh toán:</span>
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                  {isFreeCourse ? '0 VNĐ' : `${coursePrice.toLocaleString('vi-VN')} VNĐ`}
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            {!isAlreadyEnrolled && (
              <div className="space-y-3 pt-2">
                <button
                  id="confirm-pay-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Đang kết nối cổng VNPay...</span>
                    </>
                  ) : isFreeCourse ? (
                    <>
                      <span>Bắt đầu học ngay (Miễn phí)</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Tiếp tục thanh toán qua VNPAY</span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cam kết hoàn tiền 100% trong 30 ngày nếu không hài lòng</span>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};