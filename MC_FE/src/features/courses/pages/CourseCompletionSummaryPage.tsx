import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  ArrowLeft,
  Sparkles,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Volume2,
  Quote,
  Clock,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  BookOpen,
  RotateCcw,
  Star,
  CheckCircle,
} from 'lucide-react';
import { useCompletionSummaryQuery } from '../hooks/useCompletionSummaryQuery';

export const CourseCompletionSummaryPage: React.FC = () => {
  const { id, courseId } = useParams<{ id?: string; courseId?: string }>();
  const navigate = useNavigate();
  const targetCourseId = Number(id || courseId || 0);

  const { data, isLoading, isError, refetch } = useCompletionSummaryQuery(targetCourseId);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // ── 1. Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/60 pb-20 pt-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-72 w-full animate-pulse rounded-3xl bg-slate-200 shadow-sm" />
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
          </div>
          <div className="mt-8 h-96 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  // ── 2. Error State ────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50/60 pb-20 pt-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-sm">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">Không thể tải thông tin báo cáo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Đã có lỗi xảy ra khi truy vấn dữ liệu tổng kết hoặc bạn chưa ghi danh khóa học này.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </button>
            <button
              onClick={() => navigate('/my-courses')}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Về Khóa học của tôi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Locked State (Chưa đạt 100%) ──────────────────────────────────────────
  if (!data.isUnlocked) {
    const progress = Math.round(data.currentProgress || 0);
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-slate-50 to-white pb-20 pt-12">
        <div className="mx-auto max-w-xl px-4">
          <button
            onClick={() => navigate('/my-courses')}
            className="mb-6 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Về Khóa học của tôi
          </button>

          <div className="overflow-hidden rounded-3xl border border-amber-200/80 bg-white p-8 text-center shadow-xl shadow-amber-500/5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-100 shadow-inner">
              <Lock className="h-10 w-10 stroke-[2.2]" />
            </div>

            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-amber-100/70 px-3 py-1 text-xs font-bold text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              Báo cáo đang bị khóa
            </span>

            <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
              Hoàn thành khóa học để mở khóa
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {data.message || 'Bạn cần hoàn thành 100% lộ trình và các bài tập Speaking/Quiz bắt buộc để mở khóa Báo cáo tổng kết hành trình.'}
            </p>

            {/* Progress Meter */}
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Tiến độ hiện tại của bạn:</span>
                <span className="text-blue-600 text-sm">{progress}%</span>
              </div>
              <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Cần thêm <span className="font-bold text-slate-700">{Math.max(0, 100 - progress)}%</span> nữa để xem phân tích giọng nói trước - sau và lời phê của giảng viên.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/courses/${targetCourseId}/learn`)}
                className="flex-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" />
                Tiếp tục học ngay
              </button>
              <button
                onClick={() => navigate('/my-courses')}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Về danh sách khóa học
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Unlocked State (Báo cáo 4 tầng) ────────────────────────────────────────
  const { overview, beforeAfterComparison, growthMetrics, feedbackTimeline = [] } = data;

  const initialSub = beforeAfterComparison?.initialSubmission;
  const finalSub = beforeAfterComparison?.finalSubmission;
  const isSingleSub = initialSub && finalSub && initialSub.submissionId === finalSub.submissionId;

  const scoreTimeline = growthMetrics?.scoreTimeline || [];
  const rubricBreakdown = growthMetrics?.rubricBreakdown || [];

  const displayedFeedbacks = isFeedbackExpanded
    ? feedbackTimeline
    : feedbackTimeline.slice(0, 4);

  // SVG Chart Calculations
  const chartHeight = 220;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const points = scoreTimeline.map((item, index) => {
    const x = scoreTimeline.length > 1
      ? paddingX + (index / (scoreTimeline.length - 1)) * plotWidth
      : chartWidth / 2;
    const scoreVal = Math.max(0, Math.min(100, item.score));
    const y = paddingY + plotHeight - (scoreVal / 100) * plotHeight;
    return { ...item, x, y, scoreVal };
  });

  const svgPathD = points.length > 0
    ? points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
    : '';

  const svgAreaD = points.length > 0
    ? `${svgPathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  const scoreDiff = initialSub && finalSub ? Math.round((finalSub.score - initialSub.score) * 10) / 10 : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 pt-4 sm:pt-6 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/my-courses')}
            className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Khóa học của tôi</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle className="h-3.5 w-3.5" />
              Đã mở khóa toàn bộ
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            TẦNG 1: HEADER VINH DANH & HÀNH TRÌNH VƯỢT KHÓ
           ══════════════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1437] to-blue-950 p-6 sm:p-10 text-white shadow-2xl shadow-blue-950/20 border border-blue-900/40">
          {/* Background Decorative Rings */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20">
                  <Trophy className="h-3.5 w-3.5" />
                  Hoàn thành xuất sắc
                </span>

                {overview?.completedAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-200/80">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(overview.completedAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {overview?.courseTitle || 'Báo cáo Tổng kết Khóa học'}
              </h1>

              <p className="text-sm text-blue-100/80 leading-relaxed">
                Chúc mừng bạn đã hoàn thành trọn vẹn chương trình đào tạo. Dưới đây là phân tích chi tiết về sự tiến bộ của bạn từ bài học đầu tiên đến bài dẫn tốt nghiệp.
              </p>
            </div>

            {/* Score & Certificate Box */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 shrink-0 text-center">
              <div>
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                  Điểm trung bình Speaking
                </p>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight">
                    {overview?.finalScore?.toFixed(1) ?? '0.0'}
                  </span>
                  <span className="text-lg font-bold text-blue-200/70">/ 100</span>
                </div>
              </div>

              {overview?.certificateId ? (
                <button
                  onClick={() => navigate(`/certificates/${overview.certificateId}`)}
                  className="w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition active:scale-[0.98]"
                >
                  <Award className="h-4 w-4" />
                  <span>Xem Chứng chỉ</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/courses/${targetCourseId}/learn`)}
                  className="w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Cấp chứng chỉ</span>
                </button>
              )}
            </div>
          </div>

          {/* Highlight Journey Summary Alert Box */}
          <div className="relative z-10 mt-8 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-4 sm:p-5 backdrop-blur-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Hành trình vượt khó &amp; Phong độ học tập
                  </h4>
                  {overview && overview.remedialCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Đạt {overview.passedRemedialCount}/{overview.remedialCount} bài bổ trợ
                    </span>
                  )}
                </div>
                <p className="text-sm text-emerald-100 leading-relaxed font-medium">
                  {overview?.journeySummaryText ||
                    'Phong độ ổn định: Bạn đã duy trì trạng thái An toàn (Xanh) xuyên suốt 100% lộ trình khóa học.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════════
            TẦNG 2: THỬ THÁCH "TRƯỚC & SAU" — NGHE LẠI CHÍNH MÌNH (AUDIO)
           ══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Volume2 className="h-6 w-6 text-blue-600" />
                <span>Thử thách "Trước &amp; Sau" — Nghe lại chính mình</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Lắng nghe sự khác biệt rõ rệt về ngữ điệu, phát âm và độ lưu loát giữa ngày đầu và bài tốt nghiệp
              </p>
            </div>

            {scoreDiff !== 0 && (
              <span className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-3 py-1 text-xs font-black shadow-xs ${
                scoreDiff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                <TrendingUp className="h-3.5 w-3.5" />
                {scoreDiff > 0 ? `Tăng +${scoreDiff} điểm` : `${scoreDiff} điểm`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột Trái: Bài đầu tiên (Khởi đầu) */}
            <div className="flex flex-col justify-between rounded-3xl border border-amber-200/90 bg-gradient-to-b from-amber-50/50 via-white to-white p-6 shadow-sm hover:border-amber-300 transition duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5" />
                    Ngày đầu nhập môn
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {initialSub?.submittedAt
                      ? new Date(initialSub.submittedAt).toLocaleDateString('vi-VN')
                      : 'Lần nộp đầu'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {initialSub?.assignmentTitle || 'Bài luyện giọng cơ bản'}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-600">
                      {initialSub?.score?.toFixed(1) ?? '—'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 100 điểm</span>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-amber-600" />
                    File ghi âm ban đầu
                  </p>
                  {initialSub?.audioUrl ? (
                    <audio
                      controls
                      src={initialSub.audioUrl}
                      className="w-full h-10 rounded-lg focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có bản ghi âm tương ứng</p>
                  )}
                </div>
              </div>

              {/* Nhận xét lúc đó */}
              <div className="mt-5 rounded-2xl bg-amber-50/60 p-4 border border-amber-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Quote className="h-3.5 w-3.5" />
                  <span>Lời phê của giảng viên:</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-700 leading-relaxed italic">
                  "{initialSub?.instructorFeedback || 'Học viên có tiềm năng, cần rèn luyện thêm về độ mở khẩu hình và điều hòa hơi thở.'}"
                </p>
              </div>
            </div>

            {/* Cột Phải: Bài cuối khóa (Hiện tại) */}
            <div className="flex flex-col justify-between rounded-3xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/50 via-white to-white p-6 shadow-sm hover:border-emerald-300 transition duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <Award className="h-3.5 w-3.5" />
                    Hoàn thành khóa học
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {finalSub?.submittedAt
                      ? new Date(finalSub.submittedAt).toLocaleDateString('vi-VN')
                      : 'Bài tốt nghiệp'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {finalSub?.assignmentTitle || 'Bài dẫn chung kết'}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">
                      {finalSub?.score?.toFixed(1) ?? '—'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ 100 điểm</span>
                    {scoreDiff > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        +{scoreDiff} đ
                      </span>
                    )}
                  </div>
                </div>

                {/* Audio Player */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
                    Bản ghi âm hoàn thiện
                  </p>
                  {finalSub?.audioUrl ? (
                    <audio
                      controls
                      src={finalSub.audioUrl}
                      className="w-full h-10 rounded-lg focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có bản ghi âm tương ứng</p>
                  )}
                </div>
              </div>

              {/* Nhận xét mới nhất */}
              <div className="mt-5 rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Quote className="h-3.5 w-3.5" />
                  <span>Lời phê tốt nghiệp:</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-700 leading-relaxed italic">
                  "{finalSub?.instructorFeedback || 'Tiến bộ vượt bậc! Tông giọng tròn vành rõ chữ, nhịp điệu cuốn hút và rất tự tin.'}"
                </p>
              </div>
            </div>
          </div>

          {isSingleSub && (
            <p className="text-center text-xs text-slate-500 italic">
              * Khóa học ghi nhận bài nộp Speaking tiêu biểu này để đánh giá chất lượng toàn diện của bạn.
            </p>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════════════
            TẦNG 3: BIỂU ĐỒ TĂNG TRƯỞNG & CHI TIẾT RUBRIC
           ══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <span>Biểu đồ tăng trưởng năng lực &amp; Chi tiết Rubric</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Theo dõi sự thăng tiến qua từng bài nộp và phân tích cải thiện từng tiêu chí chấm điểm
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột Trái: Biểu đồ đường SVG tương tác */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Tiến trình điểm số các bài Speaking
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      Chính thức
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      Bổ trợ
                    </span>
                  </div>
                </div>

                {points.length > 0 ? (
                  <div className="relative mt-4">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-56 overflow-visible"
                    >
                      <defs>
                        <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 25, 50, 75, 100].map((val) => {
                        const y = paddingY + plotHeight - (val / 100) * plotHeight;
                        return (
                          <g key={val}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={chartWidth - paddingX}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeWidth="1"
                            />
                            <text
                              x={paddingX - 10}
                              y={y + 3}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-medium"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Passing line at 80 */}
                      <line
                        x1={paddingX}
                        y1={paddingY + plotHeight - (80 / 100) * plotHeight}
                        x2={chartWidth - paddingX}
                        y2={paddingY + plotHeight - (80 / 100) * plotHeight}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      <text
                        x={chartWidth - paddingX + 5}
                        y={paddingY + plotHeight - (80 / 100) * plotHeight + 3}
                        className="fill-emerald-600 text-[9px] font-bold"
                      >
                        Đạt (80)
                      </text>

                      {/* Area Fill */}
                      {svgAreaD && <path d={svgAreaD} fill="url(#scoreAreaGradient)" />}

                      {/* Score Line */}
                      {svgPathD && (
                        <path
                          d={svgPathD}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Points */}
                      {points.map((pt, i) => (
                        <g
                          key={pt.submissionId || i}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(i)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPointIndex === i ? 7 : 5}
                            fill={pt.isRemedial ? '#f59e0b' : '#2563eb'}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="transition-all duration-200"
                          />
                        </g>
                      ))}
                    </svg>

                    {/* Interactive Tooltip Card */}
                    {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                      <div className="absolute top-2 right-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs p-3 text-xs shadow-lg animate-in fade-in duration-150">
                        <p className="font-bold text-slate-900">
                          {points[hoveredPointIndex].title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-black text-blue-600 text-sm">
                            {points[hoveredPointIndex].score.toFixed(1)} / 100 đ
                          </span>
                          {points[hoveredPointIndex].isRemedial && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Bài bổ trợ
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Ngày nộp: {new Date(points[hoveredPointIndex].submittedAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Chưa có bài nộp Speaking nào được chấm điểm.
                  </div>
                )}
              </div>

              <p className="mt-4 text-[11px] text-slate-400 text-center">
                * Di chuột vào từng điểm mốc để xem chi tiết tên bài và điểm số đạt được
              </p>
            </div>

            {/* Cột Phải: Phân tích từng tiêu chí Rubric */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100">
                  Đánh giá chi tiết tiêu chí Rubric
                </h3>

                <div className="mt-4 space-y-4">
                  {rubricBreakdown.length > 0 ? (
                    rubricBreakdown.map((crit) => {
                      const pct = Math.max(0, Math.min(100, Math.round((crit.finalScore / crit.maxScore) * 100)));
                      const isImproved = crit.improvementDelta > 0;
                      return (
                        <div key={crit.criterionName} className="space-y-1.5 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{crit.criterionName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500">
                                {crit.initialScore.toFixed(1)} &rarr;{' '}
                                <span className="font-bold text-slate-900">{crit.finalScore.toFixed(1)}</span>
                              </span>
                              {crit.improvementDelta !== 0 && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  isImproved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {isImproved ? `+${crit.improvementDelta.toFixed(1)}` : crit.improvementDelta.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Chưa có dữ liệu phân tích Rubric cho khóa học này.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Thang điểm chuẩn hóa tối đa: 100 điểm cho mỗi tiêu chí</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════════
            TẦNG 4: NHẬT KÝ NHẬN XÉT CỦA GIẢNG VIÊN (INSTRUCTOR FEEDBACK TIMELINE)
           ══════════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Quote className="h-6 w-6 text-blue-600" />
                <span>Nhật ký nhận xét của Giảng viên</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Lưu giữ trọn vẹn từng lời dặn dò, sửa lỗi và động viên của giảng viên xuyên suốt khóa học
              </p>
            </div>

            <span className="text-xs font-bold text-slate-500">
              {feedbackTimeline.length} nhận xét được ghi nhận
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            {feedbackTimeline.length > 0 ? (
              <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-6">
                {displayedFeedbacks.map((fb, idx) => (
                  <div key={fb.submissionId || idx} className="relative group">
                    {/* Bullet marker */}
                    <div className={`absolute -left-[27px] sm:-left-[35px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white ${
                      fb.isRemedial ? 'border-amber-500 text-amber-500' : 'border-blue-600 text-blue-600'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${fb.isRemedial ? 'bg-amber-500' : 'bg-blue-600'}`} />
                    </div>

                    {/* Content Box */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 hover:bg-slate-50 hover:border-blue-100 transition duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {fb.assignmentTitle}
                          </h4>
                          {fb.isRemedial ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Bài bổ trợ (Remedial)
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                              Bài chính thức
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {fb.score !== null && fb.score !== undefined && (
                            <span className="font-bold text-blue-600">
                              {fb.score.toFixed(1)}/100 đ
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {fb.gradedAt ? new Date(fb.gradedAt).toLocaleDateString('vi-VN') : 'Đã chấm'}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                        "{fb.instructorFeedback}"
                      </p>
                    </div>
                  </div>
                ))}

                {feedbackTimeline.length > 4 && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-blue-600 shadow-xs hover:bg-blue-50 transition active:scale-[0.98]"
                    >
                      {isFeedbackExpanded ? (
                        <>
                          <span>Thu gọn nhật ký</span>
                          <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <span>Xem toàn bộ nhật ký ({feedbackTimeline.length} nhận xét)</span>
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có nhật ký nhận xét nào từ giảng viên cho khóa học này.
              </div>
            )}
          </div>
        </section>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => navigate('/my-courses')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Về Khóa học của tôi
          </button>

          <div className="flex items-center gap-3">
            {overview?.certificateId && (
              <button
                onClick={() => navigate(`/certificates/${overview.certificateId}`)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition"
              >
                <Award className="h-4 w-4" />
                <span>Xem Chứng chỉ khóa học</span>
              </button>
            )}
            <button
              onClick={() => navigate(`/courses/${targetCourseId}/learn`)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Ôn lại bài học</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
