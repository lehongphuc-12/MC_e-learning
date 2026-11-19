import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  Trophy,
  FileText,
  CalendarDays,
  UserCheck,
  RotateCcw,
  Volume2,
  Play,
  Pause,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Award,
  Sparkles,
  BookOpen,
  Mic,
} from 'lucide-react';
import { speakingApi, SpeakingSubmissionDto } from '../api/speakingApi';
import type { SpeakingSubmissionHistoryDto } from '../types/speakingTypes';

interface NavigationState {
  returnTo?: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa có dữ liệu';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? 'Chưa có dữ liệu'
    : d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
};

const formatSeconds = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const SpeakingResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { submissionId, courseId } = useParams<{ submissionId: string; courseId?: string }>();
  const returnTo = (location.state as NavigationState | null)?.returnTo;

  const [submission, setSubmission] = useState<SpeakingSubmissionDto | null>(null);
  const [history, setHistory] = useState<SpeakingSubmissionHistoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const subIdNumber = submissionId ? Number(submissionId) : null;

  useEffect(() => {
    let alive = true;
    if (!subIdNumber || subIdNumber <= 0) {
      setIsError(true);
      setErrorMessage('Mã bài nộp không hợp lệ.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    speakingApi
      .getSubmissionById(subIdNumber)
      .then((res) => {
        if (!alive) return;
        if (res.success && res.data) {
          setSubmission(res.data);
          // Fetch history based on script or lesson
          if (res.data.scriptId) {
            speakingApi
              .getSubmissionHistoryByScript(res.data.scriptId)
              .then((histRes) => {
                if (alive && histRes.success && histRes.data) {
                  setHistory(histRes.data);
                }
              })
              .catch(() => {});
          } else if (res.data.lessonId) {
            speakingApi
              .getSubmissionHistoryByLesson(res.data.lessonId)
              .then((histRes) => {
                if (alive && histRes.success && histRes.data) {
                  setHistory(histRes.data);
                }
              })
              .catch(() => {});
          }
        } else {
          setIsError(true);
          setErrorMessage(res.message || 'Không tìm thấy bài nộp nói này.');
        }
      })
      .catch((err) => {
        if (!alive) return;
        setIsError(true);
        setErrorMessage(err.message || 'Có lỗi xảy ra khi tải kết quả bài nói.');
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [subIdNumber]);

  // Audio player handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo);
    } else if (courseId) {
      navigate(`/courses/${courseId}/learn`);
    } else if (submission?.courseId) {
      navigate(`/courses/${submission.courseId}/learn`);
    } else {
      navigate('/my-courses');
    }
  };

  const handleSelectHistoryItem = (targetSubId: number) => {
    if (targetSubId === subIdNumber) return;
    const route = courseId
      ? `/courses/${courseId}/speaking/result/${targetSubId}`
      : `/speaking/result/${targetSubId}`;
    navigate(route, { state: { returnTo } });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f4f8ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-xs font-semibold text-slate-500">Đang tải kết quả bài nộp nói...</p>
        </div>
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
          <XCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Không thể tải kết quả</h2>
        <p className="mt-1 text-xs text-rose-600">{errorMessage || 'Bài nộp không tồn tại hoặc bạn không có quyền truy cập.'}</p>
        <button
          type="button"
          onClick={handleBack}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          <ArrowLeft size={14} /> Quay lại khóa học
        </button>
      </div>
    );
  }

  const passingScore = submission.passingScore || 80;
  const isGraded = submission.score != null;
  const scoreNumber = isGraded ? Number(submission.score) : null;
  const criteria = submission.rubricCriteria || [];
  const criterionScores = submission.criterionScores || [];

  const zeroCriteria = criterionScores.filter((c) => Number(c.score) <= 0);
  const hasZeroCriterion = zeroCriteria.length > 0;

  const isPassed = submission.isPassed !== undefined && submission.isPassed !== null
    ? submission.isPassed
    : (scoreNumber !== null && scoreNumber >= passingScore && !hasZeroCriterion && submission.status !== 'NEEDS_RESUBMISSION');

  const awaiting = submission.status === 'SUBMITTED' || !isGraded;
  const scoreDisplay = scoreNumber == null || !Number.isFinite(scoreNumber) ? '—' : scoreNumber.toFixed(1);
  const scoreProgress = scoreNumber == null ? 0 : Math.max(0, Math.min(100, scoreNumber));

  // Categorize criteria
  const lowCriteria = criterionScores.filter((c) => Number(c.score) < passingScore);
  const highCriteria = criterionScores.filter((c) => Number(c.score) >= passingScore && Number(c.score) > 0);

  // Grade tier text
  const isFailedDueToZero = !isPassed && (hasZeroCriterion || (scoreNumber !== null && scoreNumber >= passingScore));
  const gradeTier = awaiting
    ? 'Chờ chấm'
    : isPassed
    ? (submission.gradeTier || 'Đạt')
    : isFailedDueToZero
    ? 'Chưa đạt (Điểm liệt tiêu chí)'
    : 'Chưa đạt';

  // Format level text
  const levelDisplay =
    submission.selectedLevel === 'BEGINNER'
      ? 'Cơ bản (Beginner)'
      : submission.selectedLevel === 'INTERMEDIATE'
      ? 'Trung cấp (Intermediate)'
      : submission.selectedLevel === 'ADVANCED'
      ? 'Nâng cao (Advanced)'
      : submission.selectedLevel || 'Mặc định';

  return (
    <div className="min-h-screen bg-[#f4f8ff] pb-12 text-[#102654]">
      {/* Hidden audio element */}
      {submission.audioUrl && (
        <audio
          ref={audioRef}
          src={submission.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      )}

      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8">
        {/* =====================================================================
            BANNER HEADER (Đồng bộ 100% với QuizResultPage)
        ===================================================================== */}
        <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-r from-[#071e52] via-[#0750cf] to-[#071d4f] px-6 py-7 text-white shadow-[0_18px_45px_rgba(9,49,119,.16)] sm:px-9 lg:py-9">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 55% 75%,#27a9ff 0,transparent 28%),linear-gradient(145deg,transparent 33%,#116bfc55 34%,transparent 57%)',
            }}
          />
          <div className="pointer-events-none absolute right-[20%] top-[-60px] hidden h-72 w-72 rounded-full border-[35px] border-blue-400/15 lg:block" />

          <div className="relative z-10 max-w-[72%] sm:max-w-[65%]">
            <button
              type="button"
              onClick={handleBack}
              className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold transition hover:bg-white/25"
            >
              <ArrowLeft size={15} /> Quay lại khóa học
            </button>

            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-100">
              <Mic size={13} /> Kết quả bài nói speaking
            </p>

            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-[34px]">
              {awaiting
                ? 'Đã nộp bài thành công!'
                : isPassed
                ? 'Hoàn thành bài luyện nói!'
                : hasZeroCriterion
                ? 'Kết quả: Chưa đạt (Do có tiêu chí 0 điểm)'
                : 'Đã có kết quả đánh giá bài nói'}
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-blue-100 sm:text-sm">
              {awaiting
                ? 'Bản ghi âm đã được gửi đến giảng viên. Điểm số và nhận xét chi tiết theo bảng tiêu chí Rubric sẽ được cập nhật sau khi chấm.'
                : isPassed
                ? 'Chúc mừng bạn đã đạt yêu cầu bài tập nói! Hãy xem lại chi tiết điểm số và lời góp ý của giảng viên để tiếp tục phát huy.'
                : hasZeroCriterion
                ? `Tổng điểm bài làm đạt ${scoreDisplay}/100, tuy nhiên bài nộp Chưa đạt do có tiêu chí bị 0 điểm (Điểm liệt). Quy chế MSEEK yêu cầu tất cả tiêu chí Rubric phải > 0 điểm để đạt.`
                : 'Hãy xem lại bản ghi âm, điểm từng tiêu chí và nhận xét của giảng viên để cải thiện trong lần thu âm tiếp theo.'}
            </p>
          </div>

          <div className="pointer-events-none absolute bottom-[-36px] right-[17%] hidden text-[155px] leading-none drop-shadow-[0_10px_24px_rgba(255,190,0,.35)] md:block">
            {isPassed ? '🏆' : '🎙️'}
          </div>

          <div
            className={`absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-white/15 p-4 backdrop-blur-sm xl:flex ${
              awaiting ? 'text-amber-200' : isPassed ? 'text-emerald-200' : 'text-white'
            }`}
          >
            {awaiting ? <Clock3 size={36} /> : isPassed ? <CheckCircle2 size={36} /> : <FileText size={36} />}
            <div>
              <p className="text-sm font-extrabold">
                {awaiting ? 'Đang chờ chấm' : isPassed ? 'Đạt yêu cầu' : hasZeroCriterion ? 'Chưa đạt (Điểm liệt)' : 'Chưa đạt'}
              </p>
              <p className="mt-1 text-[11px] text-blue-100">Điểm đạt: {passingScore}/100</p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            MAIN CONTENT: 2 CỘT (Cột trái: Điểm + Audio + Info | Cột phải: Feedback + Rubric)
        ===================================================================== */}
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {/* ======================= CỘT TRÁI ======================= */}
          <div className="space-y-4">
            {/* Card 1: Vòng tròn điểm số */}
            <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-[0_8px_25px_rgba(23,61,120,.04)] sm:p-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <div
                  className="relative flex h-[176px] w-[176px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: awaiting
                      ? '#eaf0f8'
                      : `conic-gradient(#075bf2 ${scoreProgress * 3.6}deg,#eaf0f8 0deg)`,
                  }}
                >
                  <div className="flex h-[151px] w-[151px] flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-[42px] font-black leading-none text-[#09285e]">
                      {scoreDisplay}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-[#7790b6]">/ 100</span>
                  </div>
                </div>

                <div className="w-full min-w-0">
                  <p className="text-sm font-bold text-slate-700">Điểm của bạn</p>
                  <p className="mt-2 text-4xl font-black text-[#0a2a65]">
                    {scoreDisplay}
                    <span className="ml-2 text-xl font-semibold text-[#8da0bf]">/ 100</span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                        awaiting
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {awaiting ? (
                        <Clock3 size={15} />
                      ) : isPassed ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <XCircle size={15} />
                      )}
                      {awaiting
                        ? 'Đang chờ chấm'
                        : isPassed
                        ? `Đạt yêu cầu (${gradeTier})`
                        : isFailedDueToZero
                        ? 'Chưa đạt • Có tiêu chí 0 điểm (Điểm liệt)'
                        : `Chưa đạt (${gradeTier})`}
                    </span>
                  </div>

                  {hasZeroCriterion && !isPassed && !awaiting ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                      <AlertTriangle className="shrink-0 text-rose-500" size={23} />
                      <div>
                        <p className="text-xs font-bold text-rose-950">
                          Chưa đạt do vi phạm quy tắc Điểm liệt tiêu chí
                        </p>
                        <p className="mt-0.5 text-[11px] text-rose-700">
                          Có {zeroCriteria.length} tiêu chí bị 0 điểm. Dù tổng điểm {scoreDisplay}/100 đạt ngưỡng ≥ {passingScore}, bài làm vẫn Chưa đạt. Vui lòng thu âm lại để cải thiện.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#eefaf5] px-4 py-3">
                      <Trophy className="shrink-0 text-amber-500" size={23} />
                      <div>
                        <p className="text-xs font-bold text-emerald-950">
                          Điểm tối thiểu: {passingScore}/100
                        </p>
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          {awaiting
                            ? 'Chờ giảng viên hoàn tất chấm điểm để xác định kết quả.'
                            : isPassed
                            ? 'Chúc mừng! Bạn đã vượt qua bài tập nói này.'
                            : 'Tiếp tục luyện tập và thu âm lại để đạt mục tiêu.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 ô thống kê nhỏ */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl p-3 bg-[#eafaf2]">
                  <CheckCircle2 size={23} className="text-emerald-600" />
                  <p className="mt-2 text-xl font-black text-slate-800">
                    {highCriteria.length}
                  </p>
                  <p className="text-[11px] text-[#647b9f]">Tiêu chí Đạt</p>
                </div>

                <div className="rounded-xl p-3 bg-[#fff0f1]">
                  <AlertTriangle size={23} className="text-rose-500" />
                  <p className="mt-2 text-xl font-black text-slate-800">
                    {lowCriteria.length}
                  </p>
                  <p className="text-[11px] text-[#647b9f]">Cần cải thiện</p>
                </div>

                <div className="rounded-xl p-3 bg-[#fff8e7]">
                  <RotateCcw size={23} className="text-amber-500" />
                  <p className="mt-2 text-xl font-black text-slate-800">
                    Lần {submission.attemptNumber || 1}
                  </p>
                  <p className="text-[11px] text-[#647b9f]">Lượt làm bài</p>
                </div>

                <div className="rounded-xl p-3 bg-[#edf5ff]">
                  <Layers size={23} className="text-blue-600" />
                  <p className="mt-2 text-xl font-black text-slate-800">
                    {criteria.length}
                  </p>
                  <p className="text-[11px] text-[#647b9f]">Tổng tiêu chí</p>
                </div>
              </div>
            </section>

            {/* Card 2: Trình phát Audio nghe lại bản ghi âm */}
            {submission.audioUrl && (
              <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#09285e]">
                    <Volume2 size={18} className="text-blue-600" /> Bản ghi âm của bạn
                  </h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    {formatSeconds(currentTime)} / {formatSeconds(duration)}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 active:scale-95"
                    title={isPlaying ? 'Tạm dừng' : 'Phát bản ghi âm'}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>{formatSeconds(currentTime)}</span>
                      <span>{formatSeconds(duration)}</span>
                    </div>
                  </div>
                </div>

                {submission.note && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-600">Ghi chú của bạn khi nộp bài:</p>
                    <p className="mt-1 text-xs text-slate-700 italic">"{submission.note}"</p>
                  </div>
                )}
              </section>
            )}

            {/* Card 3: Thông tin bài làm */}
            <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-extrabold text-[#09285e]">
                <FileText size={18} className="text-blue-600" /> Thông tin bài làm
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Mic,
                    label: 'Bài tập nói',
                    value: submission.scriptTitle || submission.lessonTitle || 'Bài tập thực hành nói',
                  },
                  {
                    icon: BookOpen,
                    label: 'Khóa học',
                    value: submission.courseTitle || 'Chưa có thông tin',
                  },
                  {
                    icon: Sparkles,
                    label: 'Cấp độ kịch bản',
                    value: levelDisplay,
                  },
                  {
                    icon: RotateCcw,
                    label: 'Lượt nộp',
                    value: `Lần thứ ${submission.attemptNumber || 1}${
                      submission.totalAttempts && submission.totalAttempts > 1
                        ? ` / ${submission.totalAttempts} lượt`
                        : ''
                    }`,
                  },
                  {
                    icon: CalendarDays,
                    label: 'Thời gian nộp',
                    value: formatDate(submission.submittedAt),
                  },
                  {
                    icon: UserCheck,
                    label: 'Giảng viên chấm',
                    value: submission.gradedByName || submission.instructorName || 'Chờ giảng viên chấm',
                  },
                  {
                    icon: CalendarDays,
                    label: 'Thời gian chấm',
                    value: submission.gradedAt ? formatDate(submission.gradedAt) : 'Chưa chấm',
                  },
                  {
                    icon: Trophy,
                    label: 'Hình thức đánh giá',
                    value: 'Chấm điểm chuyên môn qua Rubric',
                  },
                ].map((s) => (
                  <div key={s.label} className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f7faff] p-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-blue-600">
                      <s.icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#7388aa]">{s.label}</p>
                      <p className="mt-0.5 break-words text-xs font-bold text-slate-800 line-clamp-2">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Accordion lịch sử các lần nộp */}
              {history.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs font-bold text-blue-700 hover:text-blue-800"
                  >
                    <span>Lịch sử điểm ({history.length} lượt)</span>
                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showHistory && (
                    <div className="mt-3 space-y-2">
                      {history.map((h) => {
                        const hIsGraded = h.score != null;
                        const hScoreNum = hIsGraded ? Number(h.score) : null;
                        const hIsPassed = hScoreNum !== null && hScoreNum >= passingScore;
                        const isCurrent = h.submissionId === subIdNumber;

                        return (
                          <button
                            key={h.submissionId}
                            type="button"
                            onClick={() => handleSelectHistoryItem(h.submissionId)}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-blue-50 ${
                              isCurrent ? 'border-blue-500 bg-blue-50 font-bold' : 'border-slate-200'
                            }`}
                          >
                            <span>
                              Lần {h.attemptNumber} · {formatDate(h.submittedAt)}
                            </span>
                            <b>
                              {h.score == null
                                ? 'Chờ chấm'
                                : `${Number(h.score).toFixed(1)}/100 · ${
                                    hIsPassed ? 'Đạt' : 'Chưa đạt'
                                  }`}
                              {' →'}
                            </b>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ======================= CỘT PHẢI ======================= */}
          <div className="space-y-4">
            {/* Cảnh báo các kỹ năng cần cải thiện (nếu có điểm dưới 80) */}
            {!awaiting && lowCriteria.length > 0 && (
              <section className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-amber-950">
                      Bạn cần cải thiện những kỹ năng sau
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Các tiêu chí dưới đây có điểm thấp hơn ngưỡng đạt ({passingScore}/100). Hãy chú ý luyện tập kỹ năng này trong lần thu âm tới!
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {lowCriteria.map((c) => (
                    <div
                      key={c.code}
                      className="rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-amber-950">
                          {c.code}: {c.name}
                        </p>
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                          {Number(c.score).toFixed(1)} / 100
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-800">
                        Trọng số: {c.weightPercentage}% trong tổng điểm
                      </p>
                      {c.feedback && (
                        <p className="mt-2 text-xs text-slate-700 leading-relaxed bg-amber-50/70 p-2 rounded-lg">
                          <b>Góp ý của giảng viên:</b> {c.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Khối nhận xét tổng quan của giảng viên */}
            <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-[0_8px_25px_rgba(23,61,120,.04)] sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#09285e]">
                  <Award size={18} className="text-blue-600" /> Nhận xét tổng quan từ giảng viên
                </h2>
                {submission.gradedByName && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Người chấm: <b className="text-slate-800">{submission.gradedByName}</b>
                  </span>
                )}
              </div>

              {submission.feedback ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-[#f7faff] p-4">
                  <p className="whitespace-pre-wrap text-xs leading-6 text-slate-800">
                    {submission.feedback}
                  </p>
                  {submission.gradedAt && (
                    <p className="mt-3 text-right text-[10px] text-slate-400">
                      Chấm lúc: {formatDate(submission.gradedAt)}
                    </p>
                  )}
                </div>
              ) : awaiting ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50/70 border border-amber-100 p-4 text-amber-800">
                  <Clock3 className="shrink-0 text-amber-600" size={24} />
                  <p className="text-xs leading-relaxed">
                    Giảng viên đang xem xét bài nói của bạn. Nhận xét và đánh giá chuyên môn sẽ xuất hiện tại đây ngay khi hoàn tất.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-xs italic text-slate-500">
                  Giảng viên không để lại nhận xét bằng văn bản.
                </p>
              )}
            </section>

            {/* Khối chi tiết điểm từng tiêu chí Rubric */}
            <section className="rounded-[22px] border border-[#e2eaf6] bg-white p-5 shadow-[0_8px_25px_rgba(23,61,120,.04)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#09285e]">
                  <Layers size={18} className="text-blue-600" /> Chi tiết điểm theo tiêu chí (Rubric)
                </h2>
                <span className="text-[11px] font-bold text-slate-500">
                  {criterionScores.length || criteria.length} tiêu chí đánh giá
                </span>
              </div>

              {criterionScores.length > 0 ? (
                <div className="mt-4 space-y-3.5">
                  {criterionScores.map((c) => {
                    const cScoreNum = Number(c.score);
                    const isZeroScore = cScoreNum <= 0;
                    const cPassed = cScoreNum >= passingScore && !isZeroScore;
                    return (
                      <div
                        key={c.code}
                        className={`rounded-xl border p-4 transition-all ${
                          isZeroScore
                            ? 'border-rose-300 bg-rose-50/60 ring-1 ring-rose-200 shadow-2xs'
                            : cPassed
                            ? 'border-emerald-100 bg-[#fbfdfb]'
                            : 'border-amber-100 bg-[#fefdfa]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-black ${
                              isZeroScore ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {c.code}
                            </span>
                            <p className="text-xs font-bold text-slate-800">{c.name}</p>
                            {isZeroScore && (
                              <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-black shrink-0 flex items-center gap-1 shadow-2xs animate-pulse">
                                ⚠️ Điểm liệt (0đ)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Trọng số: {c.weightPercentage}%
                            </span>
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                                isZeroScore
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : cPassed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {cScoreNum.toFixed(1)} / 100{isZeroScore ? ' • Điểm liệt' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Thanh progress bar */}
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isZeroScore ? 'bg-rose-600' : cPassed ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, cScoreNum))}%` }}
                          />
                        </div>

                        {isZeroScore && (
                          <p className="mt-2 text-xs font-bold text-rose-700 bg-rose-100/90 p-2.5 rounded-lg border border-rose-200 flex items-center gap-1.5 leading-relaxed">
                            <span>⚠️ <b>Quy chế điểm liệt:</b> Tiêu chí này bị 0 điểm khiến toàn bộ bài làm Chưa đạt dù tổng điểm đạt chuẩn. Bạn cần tập trung cải thiện kỹ năng này và nộp lại.</span>
                          </p>
                        )}

                        {c.feedback && (
                          <p className="mt-2.5 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            <b className="text-slate-700">Nhận xét:</b> {c.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : criteria.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500 italic">
                    {awaiting
                      ? 'Danh sách tiêu chí sẽ được giảng viên đánh giá:'
                      : 'Kịch bản có các tiêu chí sau:'}
                  </p>
                  {criteria.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {c.code}
                        </span>
                        <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500">Trọng số: {c.weightPercentage}%</span>
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          {awaiting ? 'Chờ chấm' : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500 italic">
                  Chưa có thông tin tiêu chí Rubric cho bài tập này.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
