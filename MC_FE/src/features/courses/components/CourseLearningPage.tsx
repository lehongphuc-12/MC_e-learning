// =============================================================================
// CourseLearningPage.tsx — Course Video Player / Learning Page
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ClipboardList,
  Mic,
  Square,
  Send,
  Volume2,
  AlertCircle,
  Sliders,
} from 'lucide-react';

import { useCourseDetail } from '../hooks/useInstructorCourses';
import { useCourseLessons } from '../hooks/useLessonQueries';
import { useCourseModules } from '../hooks/useModuleQueries';
import {
  useCourseProgress,
  useUpdateLessonProgress,
} from '../hooks/useLearningQueries';
import {
  useCourseCertificate,
  useIssueCertificate,
} from '../hooks/useCertificateQueries';
import { CertificateModal } from './CertificateModal';
import { useAuthStore } from '../../../store/useAuthStore';

import type { Lesson } from '../types/lessonTypes';
import type { Certificate } from '../types/learningTypes';

import { useQuizzesByCourse } from '../../quizzes/hooks/useQuiz';
import { speakingApi, SpeakingSubmissionDto } from '../api/speakingApi';

// =============================================================================
// LearnerSpeakingWorkspace — Voice Recording & Submission for Learners
// =============================================================================

interface LearnerSpeakingWorkspaceProps {
  lesson: Lesson;
  courseId: number;
  onMarkComplete?: (lessonId: number) => void;
}

const LearnerSpeakingWorkspace: React.FC<LearnerSpeakingWorkspaceProps> = ({
  lesson,
  courseId,
  onMarkComplete,
}) => {
  const [submission, setSubmission] = useState<SpeakingSubmissionDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [learnerNote, setLearnerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReRecording, setIsReRecording] = useState<boolean>(false);

  // Audio Device Selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Enumerate connected audio input devices (microphones)
  const loadAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioInputs = devices.filter((d) => d.kind === 'audioinput');

      // If device labels are hidden (privacy restriction before user gesture/permission),
      // prompt for temp permission to populate human readable device labels
      if (audioInputs.length > 0 && audioInputs.some((d) => !d.label)) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach((track) => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((d) => d.kind === 'audioinput');
        } catch (e) {
          console.log('Permission pending for device labels');
        }
      }

      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating audio devices:', err);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices);
      };
    }
  }, []);

  // Fetch current student's submission for this lesson
  const fetchSubmission = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await speakingApi.getLatestSubmissionByLesson(lesson.lessonId);
      if (res.success && res.data) {
        setSubmission(res.data);
        if (res.data.status === 'GRADED' && onMarkComplete) {
          onMarkComplete(lesson.lessonId);
        }
      } else {
        setSubmission(null);
      }
    } catch (err) {
      console.log('No prior submission found or error fetching submission');
      setSubmission(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
    // Reset local recording states
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setLearnerNote('');
    setIsReRecording(false);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lesson.lessonId]);

  // Start microphone recording with selected device
  const handleStartRecording = async () => {
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all audio tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error opening microphone:', err);
      setErrorMsg('Không thể truy cập Micrô! Vui lòng kiểm tra và cấp quyền sử dụng micrô trên trình duyệt của bạn.');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Reset local recording
  const handleResetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Submit audio assignment to backend
  const handleSubmitAssignment = async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('LessonId', lesson.lessonId.toString());
      formData.append('AudioFile', audioBlob, `speaking_record_${Date.now()}.webm`);
      if (learnerNote.trim()) {
        formData.append('Note', learnerNote.trim());
      }

      const res = await speakingApi.submitSpeakingAssignment(formData);
      if (res.success && res.data) {
        setSubmission(res.data);
        setIsReRecording(false);
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        if (res.data.status === 'GRADED' && onMarkComplete) {
          onMarkComplete(lesson.lessonId);
        }
      } else {
        setErrorMsg(res.message || 'Không thể nộp bài thu âm. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Submit speaking assignment error:', err);
      setErrorMsg('Đã xảy ra lỗi khi nộp bài ghi âm. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 p-5 md:p-8 overflow-y-auto text-slate-100 scrollbar-thin scrollbar-thumb-slate-800">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
            <Mic className="w-3.5 h-3.5" />
            <span>BÀI KIỂM TRA NÓI CUỐI KHÓA</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            {lesson.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Thời lượng: {lesson.durationMinutes || 15} phút</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left / Prompt Area (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-sm shadow-lg">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              <span>Đề Bài & Yêu Cầu</span>
            </h3>

            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
              {lesson.description ||
                'Hãy đọc kỹ kịch bản bài học và thực hiện thu âm giọng nói của bạn. Giảng viên sẽ nghe trực tiếp bài thu âm này để đánh giá ngữ điệu, tốc độ, cảm xúc và đưa ra điểm số kèm nhận xét chi tiết.'}
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Hướng dẫn thực hiện:
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 pl-4 list-disc">
                <li>Bấm nút ghi âm và đọc theo đúng kịch bản yêu cầu.</li>
                <li>Hệ thống tự động lưu file lên Cloudinary để giảng viên nghe và chấm điểm.</li>
                <li>Bạn có thể nghe lại bài ghi âm trước khi chính thức bấm nộp bài.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right / Recording & Grading Workspace (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 rounded-2xl border border-slate-800">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400">Đang tải thông tin bài làm...</p>
            </div>
          ) : submission && !isReRecording ? (
            /* ── Existing Submission View ────────────────────────────────── */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {submission.status === 'GRADED' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      ĐÃ CHẤM ĐIỂM
                    </span>
                  ) : submission.status === 'NEEDS_RESUBMISSION' ? (
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      YÊU CẦU NỘP LẠI
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      ĐÃ NỘP - CHỜ CHẤM ĐIỂM
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  Nộp lúc: {new Date(submission.submittedAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Score & Feedback Box (If Graded) */}
              {submission.status === 'GRADED' && (
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <span>Kết Quả Đánh Giá Giảng Viên</span>
                    </div>

                    <div className="flex items-baseline gap-1 px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xl shadow-inner">
                      <span>{submission.score}</span>
                      <span className="text-xs text-emerald-400/70 font-semibold">/100</span>
                    </div>
                  </div>

                  {submission.feedback ? (
                    <div className="mt-3 text-xs text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-emerald-500/20 leading-relaxed">
                      <span className="font-bold text-emerald-400 block mb-1">Lời nhận xét:</span>
                      "{submission.feedback}"
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Không có nhận xét thêm.</p>
                  )}

                  {submission.gradedByName && (
                    <div className="mt-3 text-[11px] text-slate-400 text-right">
                      Người chấm: <span className="font-semibold text-slate-200">{submission.gradedByName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Submitted Audio Player */}
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Bài thu âm của bạn đã lưu trên Cloud:</span>
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <audio controls src={submission.audioUrl} className="w-full h-10" />
                </div>
              </div>

              {submission.note && (
                <div className="mb-5 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-300 block mb-0.5">Ghi chú đã gửi:</span>
                  "{submission.note}"
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsReRecording(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-indigo-400" />
                  <span>Ghi âm & Nộp bài làm mới</span>
                </button>
              </div>
            </div>
          ) : (
            /* ── Interactive Audio Recording Workspace ────────────────── */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Khu Vực Ghi Âm Bài Nói</span>
              </h3>

              {/* Microphone Device Selector Dropdown */}
              <div className="mb-5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Chọn thiết bị Micrô ghi âm:</span>
                  </label>
                  {audioDevices.length > 0 && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
                      {audioDevices.length} thiết bị
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={isRecording || isSubmitting}
                    className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {audioDevices.length === 0 ? (
                      <option value="">(Micrô mặc định của thiết bị)</option>
                    ) : (
                      audioDevices.map((device, index) => (
                        <option
                          key={device.deviceId || index}
                          value={device.deviceId}
                        >
                          {device.label || `Microphone ${index + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                  <Mic className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Record State 1: IDLE (Not Recording, No Audio Blob) */}
              {!isRecording && !audioBlob && (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-center">
                  <button
                    onClick={handleStartRecording}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer mb-4 group"
                  >
                    <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
                  </button>

                  <h4 className="text-base font-bold text-white">Bắt đầu Ghi âm giọng nói</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Nhấn vào nút micro phía trên để cho phép trình duyệt truy cập và bắt đầu thu âm bài phát biểu của bạn.
                  </p>
                </div>
              )}

              {/* Record State 2: RECORDING IN PROGRESS */}
              {isRecording && (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-950/90 rounded-2xl border border-rose-500/30 text-center relative overflow-hidden">
                  <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[11px] font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    ĐANG GHI ÂM
                  </div>

                  <div className="text-4xl font-black text-white font-mono tracking-wider mb-4 mt-2">
                    {formatTime(recordingTime)}
                  </div>

                  {/* Sound Wave Animation */}
                  <div className="flex items-center gap-1.5 h-8 mb-6">
                    {[40, 70, 30, 90, 60, 100, 50, 80, 40, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-indigo-500 animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleStopRecording}
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Dừng & Kiểm Tra Bài Ghi Âm</span>
                  </button>
                </div>
              )}

              {/* Record State 3: RECORDED (PREVIEW & SUBMIT) */}
              {!isRecording && audioBlob && audioUrl && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>Nghe lại bản thu âm (Thời lượng: {formatTime(recordingTime)})</span>
                      </span>
                    </div>

                    <audio controls src={audioUrl} className="w-full h-10 mt-1" />
                  </div>

                  {/* Optional Learner Note Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">
                      Ghi chú cho giảng viên (Không bắt buộc):
                    </label>
                    <textarea
                      rows={2}
                      value={learnerNote}
                      onChange={(e) => setLearnerNote(e.target.value)}
                      placeholder="Nhập ghi chú hoặc thắc mắc nếu có..."
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleResetRecording}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Thực hiện lại</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {submission && isReRecording && (
                        <button
                          onClick={() => setIsReRecording(false)}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold transition-all cursor-pointer border border-slate-800"
                        >
                          Hủy
                        </button>
                      )}

                      <button
                        onClick={handleSubmitAssignment}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang nộp bài lên Cloud...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Chính thức Nộp bài thi nói</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to convert various YouTube / Vimeo / Direct video URLs
 * to embeddable iframe source.
 */
export function getEmbedVideoUrl(url?: string): string | null {
  if (!url) return null;

  // Standard YouTube Watch or Short links
  const ytRegex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|v\/|u\/\w+\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;

  const ytMatch = url.match(ytRegex);

  if (ytMatch && ytMatch[1].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`;
  }

  // Vimeo
  const vimeoRegex =
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/;

  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`;
  }

  // Google Drive
  const gdriveRegex =
    /drive\.google\.com\/file\/d\/([^\/]+)/;

  const gdriveMatch = url.match(gdriveRegex);

  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
  }

  return url;
}

export const CourseLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const courseId = id ? Number(id) : 0;

  const initialLessonId = searchParams.get('lessonId')
    ? Number(searchParams.get('lessonId'))
    : null;

  const user = useAuthStore((state) => state.user);

  // ===========================================================================
  // Data fetching
  // ===========================================================================

  const {
    data: course,
    isLoading: isCourseLoading,
  } = useCourseDetail(courseId);

  const {
    data: lessons = [],
    isLoading: isLessonsLoading,
  } = useCourseLessons(courseId);

  const { data: modules = [] } = useCourseModules(courseId);

  const {
    data: quizzes = [],
    isLoading: isQuizzesLoading,
  } = useQuizzesByCourse(courseId);

  // Real progress & certificate queries
  const { data: progressData } = useCourseProgress(courseId);

  const updateProgressMutation =
    useUpdateLessonProgress(courseId);

  const { data: certificate } =
    useCourseCertificate(courseId);

  const issueCertMutation =
    useIssueCertificate(courseId);

  // ===========================================================================
  // Sort modules by orderIndex
  // ===========================================================================

  const sortedModules = useMemo(() => {
    return [...modules].sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );
  }, [modules]);

  // ===========================================================================
  // Organize lessons by module and build a single sequential orderedLessons
  // ===========================================================================

  const {
    lessonsByModule,
    unassignedLessons,
    speakingAssignmentLessons,
    orderedLessons,
  } = useMemo(() => {
    const byMod: Record<number, Lesson[]> = {};
    const unassigned: Lesson[] = [];
    const speakingAssignments: Lesson[] = [];

    lessons.forEach((l) => {
      const isAssignment =
        l.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
        (!l.videoUrl && !l.moduleId);

      if (isAssignment) {
        speakingAssignments.push(l);
      } else if (l.moduleId) {
        if (!byMod[l.moduleId]) {
          byMod[l.moduleId] = [];
        }

        byMod[l.moduleId].push(l);
      } else {
        unassigned.push(l);
      }
    });

    // Sort lessons inside each module by orderIndex
    Object.keys(byMod).forEach((modIdKey) => {
      const modId = Number(modIdKey);

      byMod[modId].sort(
        (a, b) =>
          (a.orderIndex ?? 0) -
          (b.orderIndex ?? 0),
      );
    });

    unassigned.sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );

    speakingAssignments.sort(
      (a, b) =>
        (a.orderIndex ?? 0) -
        (b.orderIndex ?? 0),
    );

    // Construct flat ordered list following module sequence
    const ordered: Lesson[] = [];

    sortedModules.forEach((mod) => {
      if (byMod[mod.moduleId]) {
        ordered.push(...byMod[mod.moduleId]);
      }
    });

    ordered.push(...unassigned);
    ordered.push(...speakingAssignments);

    // Fallback if modules aren't used yet
    const finalOrdered =
      ordered.length > 0
        ? ordered
        : [...lessons].sort(
            (a, b) =>
              (a.orderIndex ?? 0) -
              (b.orderIndex ?? 0),
          );

    return {
      lessonsByModule: byMod,
      unassignedLessons: unassigned,
      speakingAssignmentLessons: speakingAssignments,
      orderedLessons: finalOrdered,
    };
  }, [lessons, sortedModules]);

  // ===========================================================================
  // Active state
  // ===========================================================================

  const [activeLesson, setActiveLesson] =
    useState<Lesson | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<'overview' | 'notes' | 'discussion'>(
      'overview',
    );

  const [completedLessonIds, setCompletedLessonIds] =
    useState<number[]>([]);

  const [isVideoEnded, setIsVideoEnded] =
    useState(false);

  const [isCertModalOpen, setIsCertModalOpen] =
    useState(false);

  const [activeCert, setActiveCert] =
    useState<Certificate | null>(null);

  // Accordion state for sidebar modules
  const [collapsedModules, setCollapsedModules] =
    useState<Record<number, boolean>>({});

  // ===========================================================================
  // Sync activeCert from query
  // ===========================================================================

  useEffect(() => {
    if (certificate) {
      setActiveCert(certificate);
    }
  }, [certificate]);

  // ===========================================================================
  // LocalStorage storage key for persistent fallback progress
  // ===========================================================================

  const storageKey =
    `mc_completed_lessons_${courseId}`;

  // ===========================================================================
  // Sync completed lesson IDs from LocalStorage & backend progress
  // ===========================================================================

  useEffect(() => {
    let savedLocal: number[] = [];

    try {
      const stored =
        localStorage.getItem(storageKey);

      if (stored) {
        savedLocal = JSON.parse(stored);
      }
    } catch (_) {}

    const backendCompleted =
      (progressData?.lessonProgresses ?? [])
        .filter((lp) => lp.isCompleted)
        .map((lp) => lp.lessonId);

    const merged = Array.from(
      new Set([
        ...savedLocal,
        ...backendCompleted,
      ]),
    );

    setCompletedLessonIds(merged);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(merged),
      );
    } catch (_) {}

    // Auto-sync local completions to backend if backend is missing them
    if (savedLocal.length > 0 && progressData) {
      savedLocal.forEach((id) => {
        if (!backendCompleted.includes(id)) {
          updateProgressMutation.mutate({
            lessonId: id,
            dto: {
              isCompleted: true,
            },
          });
        }
      });
    }
  }, [
    progressData,
    courseId,
    storageKey,
  ]);

  const toggleModuleCollapse = (
    moduleId: number,
  ) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // ===========================================================================
  // Direct back to lessons management page
  // ===========================================================================

  const handleBackToLessons = () => {
    if (courseId) {
      navigate(
        `/instructor/courses/${courseId}/lessons`,
      );
    } else {
      navigate('/instructor/courses');
    }
  };

  // ===========================================================================
  // Reset video ended state when activeLesson changes
  // ===========================================================================

  useEffect(() => {
    setIsVideoEnded(false);
  }, [activeLesson?.lessonId]);

  const hasMarkedEndedRef =
    useRef<Record<number, boolean>>({});

  // ===========================================================================
  // Handle explicit lesson completion
  // ===========================================================================

  const handleMarkLessonComplete = (
    lessonId: number,
    isCompleted: boolean,
  ) => {
    if (
      isCompleted &&
      hasMarkedEndedRef.current[lessonId]
    ) {
      return;
    }

    if (isCompleted) {
      hasMarkedEndedRef.current[lessonId] = true;
    } else {
      delete hasMarkedEndedRef.current[lessonId];
    }

    setCompletedLessonIds((prev) => {
      const nextCompleted = isCompleted
        ? prev.includes(lessonId)
          ? prev
          : [...prev, lessonId]
        : prev.filter(
            (id) => id !== lessonId,
          );

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(nextCompleted),
        );
      } catch (_) {}

      return nextCompleted;
    });

    updateProgressMutation.mutate({
      lessonId,
      dto: {
        isCompleted,
      },
    });
  };

  const activeLessonRef =
    useRef<Lesson | null>(null);

  useEffect(() => {
    activeLessonRef.current = activeLesson;
  }, [activeLesson]);

  const embedUrl = getEmbedVideoUrl(
    activeLesson?.videoUrl,
  );

  // ===========================================================================
  // Quiz logic
  // ===========================================================================

  // Get the quiz belonging to a specific lesson.
  const getQuizForLesson = (
    lessonId: number,
  ) => {
    return quizzes.find(
      (quiz: (typeof quizzes)[number]) =>
        quiz.lessonId === lessonId &&
        quiz.status === 'ACTIVE',
    );
  };

  // Overall course quiz: lessonId === null
  const overallQuiz = quizzes.find(
    (quiz: (typeof quizzes)[number]) =>
      quiz.lessonId == null &&
      quiz.status === 'ACTIVE',
  );

  // ===========================================================================
  // Quiz navigation
  //
  // Khi mở Quiz, lưu lại chính xác CourseLearningPage hiện tại.
  // TakeQuizPage sẽ forward returnTo này sang QuizResultPage.
  // QuizResultPage dùng returnTo để quay lại CourseLearning thay vì navigate(-1).
  // ===========================================================================

  const getQuizReturnTo = (lessonId?: number) => {
    if (!courseId) {
      return '/';
    }

    if (lessonId) {
      return `/courses/${courseId}/learn?lessonId=${lessonId}`;
    }

    if (activeLesson?.lessonId) {
      return `/courses/${courseId}/learn?lessonId=${activeLesson.lessonId}`;
    }

    return `/courses/${courseId}/learn`;
  };

  const handleTakeQuiz = (
    quizId: number,
    lessonId?: number,
  ) => {
    navigate(
      `/quizzes/${quizId}/take`,
      {
        state: {
          returnTo:
            getQuizReturnTo(lessonId),
        },
      },
    );
  };

  const renderQuizButton = (
    lessonId: number,
  ) => {
    const quiz = getQuizForLesson(lessonId);

    if (!quiz) return null;

    return (
      <button
        type="button"
        onClick={() =>
          handleTakeQuiz(
            quiz.quizId,
            lessonId,
          )
        }
        className="mt-1 ml-7 inline-flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-300 border border-violet-500/30 transition-all hover:bg-violet-600/30 hover:text-white active:scale-95"
      >
        <ClipboardList className="h-3 w-3" />
        Làm Quiz
      </button>
    );
  };

  // ===========================================================================
  // Load YouTube Iframe API script dynamically
  // ===========================================================================

  useEffect(() => {
    const win = window as any;

    if (!win.YT) {
      const tag =
        document.createElement('script');

      tag.src =
        'https://www.youtube.com/iframe_api';

      const firstScriptTag =
        document.getElementsByTagName(
          'script',
        )[0];

      firstScriptTag?.parentNode?.insertBefore(
        tag,
        firstScriptTag,
      );
    }
  }, []);

  // ===========================================================================
  // Track YouTube Player via window.YT.Player
  // ===========================================================================

  const ytPlayerRef =
    useRef<any>(null);

  useEffect(() => {
    if (
      !embedUrl ||
      !embedUrl.includes('youtube.com')
    ) {
      return;
    }

    let intervalId: any = null;

    const initYTPlayer = () => {
      const win = window as any;

      if (!win.YT || !win.YT.Player) {
        return;
      }

      try {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (_) {}
        }

        ytPlayerRef.current =
          new win.YT.Player(
            'video-player-iframe',
            {
              events: {
                onStateChange: (
                  event: any,
                ) => {
                  // 0 means ENDED
                  if (event.data === 0) {
                    setIsVideoEnded(true);

                    if (
                      activeLessonRef.current
                    ) {
                      handleMarkLessonComplete(
                        activeLessonRef.current
                          .lessonId,
                        true,
                      );
                    }
                  }
                },
              },
            },
          );

        // Interval checking current time vs duration
        intervalId = setInterval(() => {
          if (
            ytPlayerRef.current &&
            typeof ytPlayerRef.current
              .getCurrentTime ===
              'function'
          ) {
            try {
              const currentTime =
                ytPlayerRef.current.getCurrentTime();

              const duration =
                ytPlayerRef.current.getDuration();

              if (
                typeof currentTime ===
                  'number' &&
                typeof duration ===
                  'number' &&
                duration > 0
              ) {
                handleVideoTimeUpdate(
                  currentTime,
                );

                if (
                  duration -
                    currentTime <=
                    4 ||
                  currentTime /
                    duration >=
                    0.95
                ) {
                  if (
                    activeLessonRef.current
                  ) {
                    handleMarkLessonComplete(
                      activeLessonRef.current
                        .lessonId,
                      true,
                    );
                  }
                }
              }
            } catch (_) {}
          }
        }, 1000);
      } catch (_) {}
    };

    const win = window as any;

    if (win.YT && win.YT.Player) {
      initYTPlayer();
    } else {
      win.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}

        ytPlayerRef.current = null;
      }
    };
  }, [
    activeLesson?.lessonId,
    embedUrl,
  ]);

  // ===========================================================================
  // Detect video completion via window postMessage
  // ===========================================================================

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent,
    ) => {
      try {
        let data = event.data;

        if (typeof data === 'string') {
          if (data.startsWith('{')) {
            data = JSON.parse(data);
          } else {
            return;
          }
        }

        if (
          !data ||
          typeof data !== 'object'
        ) {
          return;
        }

        const info =
          data.info || data;

        const playerState =
          info?.playerState ??
          data?.playerState;

        const currentTime =
          info?.currentTime ??
          data?.currentTime;

        const duration =
          info?.duration ??
          data?.duration;

        const isEndedByState =
          data.event === 'finish' ||
          data.ended === true ||
          (data.event ===
            'onStateChange' &&
            (info === 0 ||
              data.info === 0)) ||
          playerState === 0;

        const isEndedByScrub =
          typeof currentTime ===
            'number' &&
          typeof duration ===
            'number' &&
          duration > 0 &&
          (duration - currentTime <=
            5 ||
            currentTime /
              duration >=
              0.95);

        if (isEndedByState) {
          setIsVideoEnded(true);

          const currentTargetLesson =
            activeLessonRef.current;

          if (currentTargetLesson) {
            handleMarkLessonComplete(
              currentTargetLesson.lessonId,
              true,
            );
          }
        } else if (
          isEndedByScrub
        ) {
          const currentTargetLesson =
            activeLessonRef.current;

          if (currentTargetLesson) {
            handleMarkLessonComplete(
              currentTargetLesson.lessonId,
              true,
            );
          }
        }
      } catch (_) {}
    };

    window.addEventListener(
      'message',
      handleMessage,
    );

    return () =>
      window.removeEventListener(
        'message',
        handleMessage,
      );
  }, []);

  // ===========================================================================
  // Sync active lesson from URL or select first UNCOMPLETED lesson by default
  // ===========================================================================

  useEffect(() => {
    if (orderedLessons.length > 0) {
      if (initialLessonId) {
        const found =
          orderedLessons.find(
            (l) =>
              l.lessonId ===
              initialLessonId,
          );

        if (found) {
          setActiveLesson(found);
          return;
        }
      }

      if (
        !activeLesson ||
        !orderedLessons.some(
          (l) =>
            l.lessonId ===
            activeLesson.lessonId,
        )
      ) {
        const firstUncompleted =
          orderedLessons.find(
            (l) =>
              !completedLessonIds.includes(
                l.lessonId,
              ),
          );

        const targetLesson =
          firstUncompleted ||
          orderedLessons[0];

        setActiveLesson(
          targetLesson,
        );
      }
    }
  }, [
    orderedLessons,
    initialLessonId,
    completedLessonIds,
  ]);

  // ===========================================================================
  // Handle lesson selection
  // ===========================================================================

  const handleSelectLesson = (
    lesson: Lesson,
  ) => {
    setIsVideoEnded(false);
    setActiveLesson(lesson);

    setSearchParams(
      {
        lessonId:
          lesson.lessonId.toString(),
      },
      {
        replace: true,
      },
    );
  };

  // ===========================================================================
  // Handle video playback time updates
  // ===========================================================================

  const lastUpdatedSecRef =
    useRef<number>(0);

  const handleVideoTimeUpdate = (
    currentTime: number,
  ) => {
    const currentSec =
      Math.floor(currentTime);

    if (
      activeLesson &&
      currentSec > 0 &&
      currentSec !==
        lastUpdatedSecRef.current &&
      currentSec % 5 === 0
    ) {
      lastUpdatedSecRef.current =
        currentSec;

      updateProgressMutation.mutate({
        lessonId:
          activeLesson.lessonId,
        dto: {
          lastPositionSeconds:
            currentSec,
          timeSpentSeconds:
            currentSec,
        },
      });
    }
  };

  // ===========================================================================
  // Toggle lesson completed checkmark
  // ===========================================================================

  const toggleComplete = (
    lessonId: number,
  ) => {
    const isCurrentlyDone =
      completedLessonIds.includes(
        lessonId,
      );

    handleMarkLessonComplete(
      lessonId,
      !isCurrentlyDone,
    );
  };

  // ===========================================================================
  // Sequential Navigation handlers
  // ===========================================================================

  const currentIndex =
    orderedLessons.findIndex(
      (l) =>
        l.lessonId ===
        activeLesson?.lessonId,
    );

  const prevLesson =
    currentIndex > 0
      ? orderedLessons[
          currentIndex - 1
        ]
      : null;

  const nextLesson =
    currentIndex >= 0 &&
    currentIndex <
      orderedLessons.length - 1
      ? orderedLessons[
          currentIndex + 1
        ]
      : null;

  // ===========================================================================
  // Total duration
  // ===========================================================================

  const totalDuration =
    orderedLessons.reduce(
      (sum, l) =>
        sum +
        l.durationMinutes,
      0,
    );

  // ===========================================================================
  // Loading state
  // ===========================================================================

  if (
    isCourseLoading ||
    isLessonsLoading ||
    isQuizzesLoading
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />

          <p className="text-xs font-medium text-slate-400">
            Đang tải không gian học tập...
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Completion
  // ===========================================================================

  const totalLessonCount =
    orderedLessons.length;

  const localPercentage =
    totalLessonCount > 0
      ? Math.round(
          (completedLessonIds.length /
            totalLessonCount) *
            100,
        )
      : 0;

  const completionPercentage =
    Math.max(
      progressData?.completionPercentage ??
        0,
      localPercentage,
    );

  const is100Percent =
    completionPercentage >=
      100 ||
    (totalLessonCount > 0 &&
      completedLessonIds.length >=
        totalLessonCount);

  // ===========================================================================
  // Certificate
  // ===========================================================================

  const handleOpenCertificate =
    async () => {
      let certToDisplay =
        activeCert || certificate;

      if (!certToDisplay && courseId) {
        try {
          const issued =
            await issueCertMutation.mutateAsync();

          if (issued) {
            certToDisplay = issued;
            setActiveCert(issued);
          }
        } catch (err) {
          console.warn(
            'Backend issue certificate error, fallback to local certificate:',
            err,
          );
        }
      }

      if (!certToDisplay) {
        certToDisplay = {
          certificateId: 1,
          enrollmentId:
            progressData?.enrollmentId ||
            1,
          learnerId:
            Number(user?.id) || 1,
          learnerName:
            user?.name ||
            (user as any)?.fullName ||
            'Học viên',
          courseId: courseId,
          courseTitle:
            course?.title ||
            'Kỹ Thuật Xử Lý Kịch Bản MC & Biến Tấu Linh Hoạt',
          instructorName:
            'Giảng Viên MSEEK Academy',
          certificateCode:
            progressData?.certificateCode ||
            `CERT-2026-${Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase()}`,
          issuedAt:
            new Date().toISOString(),
          completionPercentage: 100,
          grade: 'EXCELLENT',
          status: 'ACTIVE',
        };

        setActiveCert(
          certToDisplay,
        );
      }

      setIsCertModalOpen(true);
    };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLessons}
            title="Quay lại quản lý bài học"
            className="flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700/60"
          >
            <ArrowLeft className="h-4 w-4 text-indigo-400" />

            <span>
              Thoát / Về quản lý bài học
            </span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800" />

          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>
                {course?.title ??
                  'Chi tiết khóa học'}
              </span>
            </h1>

            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>
                {sortedModules.length}{' '}
                Chương
              </span>

              <span>•</span>

              <span>
                {totalLessonCount}{' '}
                bài học
              </span>

              <span>•</span>

              <span>
                {totalDuration} phút
              </span>
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
                style={{
                  width: `${Math.min(
                    100,
                    completionPercentage,
                  )}%`,
                }}
              />
            </div>

            <span className="text-[11px] text-emerald-400 font-bold">
              {completionPercentage}%
            </span>
          </div>

          {/* Certificate Button */}

          {(is100Percent ||
            certificate ||
            progressData?.certificateCode) && (
            <button
              onClick={
                handleOpenCertificate
              }
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Award className="h-4 w-4" />

              <span>
                {certificate ||
                progressData?.certificateCode
                  ? 'Xem Chứng Chỉ'
                  : 'Nhận Chứng Chỉ'}
              </span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-400 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />

            <span>
              Bài{' '}
              {currentIndex >= 0
                ? currentIndex + 1
                : 1}{' '}
              / {totalLessonCount}
            </span>
          </div>

          <button
            onClick={() =>
              setIsSidebarOpen(
                !isSidebarOpen,
              )
            }
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            {isSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}

            <span className="hidden sm:inline">
              {isSidebarOpen
                ? 'Ẩn danh sách'
                : 'Danh sách bài học'}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────────────── */}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left / Center Main Content */}

        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Main Workspace Container (Video or Speaking Assignment) */}

            <div
              className={`relative w-full overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl group ${
                activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
                (!activeLesson?.videoUrl && activeLesson !== null)
                  ? 'min-h-[550px] bg-slate-950'
                  : 'aspect-video bg-black'
              }`}
            >
              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
              (!activeLesson?.videoUrl && activeLesson !== null) ? (
                <LearnerSpeakingWorkspace
                  lesson={activeLesson}
                  courseId={courseId}
                  onMarkComplete={(lessonId) =>
                    handleMarkLessonComplete(lessonId, true)
                  }
                />
              ) : (
                <>
                  {/* Custom Completion Overlay */}

                  {isVideoEnded && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center animate-fadeIn">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>

                      <h3 className="text-xl font-bold text-white">
                        Bạn đã hoàn thành bài học này!
                      </h3>

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
                            <span>
                              Bài tiếp theo: {nextLesson.title}
                            </span>

                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {embedUrl ? (
                    embedUrl.includes('youtube.com') ||
                    embedUrl.includes('vimeo.com') ||
                    embedUrl.includes('drive.google.com') ? (
                      <iframe
                        key={activeLesson?.lessonId}
                        id="video-player-iframe"
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
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget;

                          handleVideoTimeUpdate(v.currentTime);

                          if (
                            v.duration > 0 &&
                            (v.duration - v.currentTime <= 4 ||
                              v.currentTime / v.duration >= 0.95)
                          ) {
                            if (activeLesson) {
                              handleMarkLessonComplete(
                                activeLesson.lessonId,
                                true,
                              );
                            }
                          }
                        }}
                        onPause={(e) =>
                          handleVideoTimeUpdate(e.currentTarget.currentTime)
                        }
                        onEnded={() => {
                          setIsVideoEnded(true);

                          if (activeLesson) {
                            handleMarkLessonComplete(
                              activeLesson.lessonId,
                              true,
                            );
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

                      <h3 className="text-base font-bold text-white">
                        Chưa chọn hoặc chưa có Video bài học
                      </h3>

                      <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        {activeLesson
                          ? 'Bài học này chưa được cập nhật liên kết Video. Vui lòng chọn bài học khác.'
                          : 'Vui lòng chọn bài học từ danh sách bên phải để bắt đầu xem video.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Navigation & Controls Bar */}

            <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm">
              <button
                disabled={!prevLesson}
                onClick={() =>
                  prevLesson &&
                  handleSelectLesson(
                    prevLesson,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Bài trước:
                </span>

                <span className="truncate max-w-[140px]">
                  {prevLesson
                    ? prevLesson.title
                    : '---'}
                </span>
              </button>

              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
              (!activeLesson?.videoUrl && activeLesson !== null) ? (
                <button
                  disabled
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all cursor-not-allowed ${
                    activeLesson && completedLessonIds.includes(activeLesson.lessonId)
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {activeLesson && completedLessonIds.includes(activeLesson.lessonId) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Đã hoàn thành (Đã chấm điểm)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                      <span>Chờ Giảng viên chấm điểm...</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() =>
                    activeLesson &&
                    toggleComplete(
                      activeLesson.lessonId,
                    )
                  }
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />

                  <span>
                    {activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'Đã hoàn thành'
                      : 'Đánh dấu hoàn thành'}
                  </span>
                </button>
              )}

              <button
                disabled={!nextLesson}
                onClick={() =>
                  nextLesson &&
                  handleSelectLesson(
                    nextLesson,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <span className="hidden sm:inline">
                  Bài tiếp:
                </span>

                <span className="truncate max-w-[140px]">
                  {nextLesson
                    ? nextLesson.title
                    : '---'}
                </span>

                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Lesson Title & Info */}

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-400 border border-indigo-500/20">
                      Bài #
                      {activeLesson?.orderIndex ??
                        (currentIndex >= 0
                          ? currentIndex + 1
                          : 1)}
                    </span>

                    {activeLesson?.isPreview && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                        <Eye className="h-3 w-3" />
                        Xem thử
                      </span>
                    )}

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />

                      {activeLesson?.durationMinutes ??
                        0}{' '}
                      phút
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {activeLesson?.title ??
                      'Bài học chưa có tiêu đề'}
                  </h2>
                </div>

                {activeLesson?.videoUrl && (
                  <a
                    href={
                      activeLesson.videoUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>
                      Mở link gốc Video
                    </span>
                  </a>
                )}
              </div>

              {/* Tabs */}

              <div className="border-b border-slate-800 flex items-center gap-6 text-xs font-semibold text-slate-400 pt-2">
                <button
                  onClick={() =>
                    setActiveTab(
                      'overview',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'overview'
                      ? 'text-indigo-400 font-bold'
                      : 'hover:text-slate-200'
                  }`}
                >
                  Mô tả bài học

                  {activeTab ===
                    'overview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      'notes',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'notes'
                      ? 'text-indigo-400 font-bold'
                      : 'hover:text-slate-200'
                  }`}
                >
                  Tài liệu & Ghi chú

                  {activeTab ===
                    'notes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      'discussion',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'discussion'
                      ? 'text-indigo-400 font-bold'
                      : 'hover:text-slate-200'
                  }`}
                >
                  Thảo luận & Hỏi đáp

                  {activeTab ===
                    'discussion' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* Tab Content */}

              <div className="pt-2 text-xs text-slate-300 leading-relaxed">
                {activeTab ===
                  'overview' && (
                  <p className="whitespace-pre-line text-slate-300">
                    {activeLesson?.description ||
                      'Bài học này chưa có nội dung mô tả chi tiết.'}
                  </p>
                )}

                {activeTab ===
                  'notes' && (
                  <div className="space-y-3">
                    <p className="text-slate-400">
                      Các tài liệu đính kèm hoặc ghi chú quan trọng cho bài học này:
                    </p>

                    <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3 border border-slate-800">
                      <FileText className="h-5 w-5 text-indigo-400" />

                      <div>
                        <p className="font-semibold text-slate-200">
                          Giao-trinh-
                          {activeLesson?.title}
                          .pdf
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Tài liệu tham khảo chính thức
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab ===
                  'discussion' && (
                  <div className="space-y-3">
                    <p className="text-slate-400">
                      Bình luận và trao đổi ý kiến với học viên & giảng viên:
                    </p>

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

        {/* ── Right Sidebar Playlist ───────────────────────────────────── */}

        {isSidebarOpen && (
          <aside className="w-80 shrink-0 border-l border-slate-800/80 bg-slate-900/90 flex flex-col h-full z-20 transition-all duration-300">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Lộ trình học tập
                </h3>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  {completedLessonIds.length}/
                  {totalLessonCount}{' '}
                  bài đã xem
                </p>
              </div>
            </div>

            {/* Lesson List grouped by Modules */}

            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
              {totalLessonCount ===
              0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Chưa có bài học nào trong khóa học này.
                </div>
              ) : sortedModules.length >
                0 ? (
                <>
                  {sortedModules.map(
                    (mod) => {
                      const modLessons =
                        lessonsByModule[
                          mod.moduleId
                        ] || [];

                      const isCollapsed =
                        collapsedModules[
                          mod.moduleId
                        ];

                      return (
                        <div
                          key={
                            mod.moduleId
                          }
                          className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/50"
                        >
                          {/* Module Header */}

                          <button
                            onClick={() =>
                              toggleModuleCollapse(
                                mod.moduleId,
                              )
                            }
                            className="w-full flex items-center justify-between p-3 bg-slate-900/80 hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />

                              <span className="text-xs font-bold text-slate-200 truncate">
                                Chương{' '}
                                {
                                  mod.orderIndex
                                }
                                :{' '}
                                {mod.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-slate-400">
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                                {
                                  modLessons.length
                                }
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
                              {modLessons.length ===
                              0 ? (
                                <div className="p-3 text-[11px] text-slate-500 text-center italic">
                                  Chưa có bài học
                                </div>
                              ) : (
                                modLessons.map(
                                  (lesson) => {
                                    const isActive =
                                      lesson.lessonId ===
                                      activeLesson?.lessonId;

                                    const isCompleted =
                                      completedLessonIds.includes(
                                        lesson.lessonId,
                                      );

                                    return (
                                      <div
                                        key={
                                          lesson.lessonId
                                        }
                                        className="space-y-1"
                                      >
                                        {/* Lesson */}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectLesson(
                                              lesson,
                                            )
                                          }
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
                                                #
                                                {
                                                  lesson.orderIndex
                                                }
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <p
                                              className={`font-semibold line-clamp-2 ${
                                                isActive
                                                  ? 'text-indigo-300'
                                                  : 'text-slate-200'
                                              }`}
                                            >
                                              {
                                                lesson.title
                                              }
                                            </p>

                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                              <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />

                                                {
                                                  lesson.durationMinutes
                                                }{' '}
                                                phút
                                              </span>

                                              {lesson.isPreview && (
                                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-emerald-400 font-bold">
                                                  Xem thử
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </button>

                                        {/* Quiz của lesson */}

                                        {renderQuizButton(
                                          lesson.lessonId,
                                        )}
                                      </div>
                                    );
                                  },
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}

                  {/* Unassigned lessons */}

                  {unassignedLessons.length >
                    0 && (
                    <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/50">
                      <div className="p-3 bg-slate-900/80 text-xs font-bold text-amber-400 flex items-center justify-between">
                        <span>
                          Bài học tự do (
                          {
                            unassignedLessons.length
                          }
                          )
                        </span>
                      </div>

                      <div className="p-1 space-y-1">
                        {unassignedLessons.map(
                          (lesson) => {
                            const isActive =
                              lesson.lessonId ===
                              activeLesson?.lessonId;

                            const isCompleted =
                              completedLessonIds.includes(
                                lesson.lessonId,
                              );

                            return (
                              <div
                                key={
                                  lesson.lessonId
                                }
                                className="space-y-1"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSelectLesson(
                                      lesson,
                                    )
                                  }
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
                                        #
                                        {
                                          lesson.orderIndex
                                        }
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`font-semibold line-clamp-2 ${
                                        isActive
                                          ? 'text-amber-300'
                                          : 'text-slate-200'
                                      }`}
                                    >
                                      {
                                        lesson.title
                                      }
                                    </p>

                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                      <span>
                                        {
                                          lesson.durationMinutes
                                        }{' '}
                                        phút
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                {renderQuizButton(
                                  lesson.lessonId,
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {/* Speaking Assignments Section */}

                  {speakingAssignmentLessons.length > 0 && (
                    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-indigo-950/40 to-slate-950/60 p-3 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Mic className="h-4 w-4 text-purple-400 animate-pulse" />
                          <span>Bài thi nói cuối khóa ({speakingAssignmentLessons.length})</span>
                        </span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded-full border border-purple-500/30">
                          SPEAKING
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {speakingAssignmentLessons.map((lesson) => {
                          const isActive =
                            lesson.lessonId === activeLesson?.lessonId;
                          const isCompleted =
                            completedLessonIds.includes(lesson.lessonId);

                          return (
                            <button
                              key={lesson.lessonId}
                              type="button"
                              onClick={() => handleSelectLesson(lesson)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-purple-600/40 border border-purple-400 text-white shadow-md'
                                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-purple-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Mic className="h-4 w-4 text-purple-400 shrink-0" />
                                )}
                                <span className="font-bold truncate">
                                  {lesson.title}
                                </span>
                              </div>

                              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold shrink-0">
                                Làm bài
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* =====================================================
                      OVERALL COURSE QUIZ
                  ===================================================== */}

                  {overallQuiz && (
                    <div className="mt-4 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/60 via-indigo-950/40 to-slate-950/60 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
                          <Award className="h-4 w-4 text-violet-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-violet-200">
                            Quiz tổng hợp khóa học
                          </p>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            Kiểm tra tổng hợp kiến thức của toàn bộ khóa học.
                          </p>

                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>
                              {
                                overallQuiz.questionCount ??
                                0
                              }{' '}
                              câu hỏi
                            </span>

                            <span>•</span>

                            <span>
                              {
                                overallQuiz.timeLimitMinutes ??
                                0
                              }{' '}
                              phút
                            </span>

                            <span>•</span>

                            <span>
                              Đạt{' '}
                              {
                                overallQuiz.passingScore ??
                                0
                              }
                              %
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleTakeQuiz(
                                overallQuiz.quizId,
                                activeLesson?.lessonId,
                              )
                            }
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-[0.98]"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />

                            Làm Quiz tổng hợp
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Fallback flat list if no modules created yet */

                orderedLessons.map(
                  (lesson) => {
                    const isActive =
                      lesson.lessonId ===
                      activeLesson?.lessonId;

                    const isCompleted =
                      completedLessonIds.includes(
                        lesson.lessonId,
                      );

                    return (
                      <div
                        key={
                          lesson.lessonId
                        }
                        className="space-y-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectLesson(
                              lesson,
                            )
                          }
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
                                #
                                {
                                  lesson.orderIndex
                                }
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold line-clamp-2 ${
                                isActive
                                  ? 'text-indigo-300'
                                  : 'text-slate-200'
                              }`}
                            >
                              {
                                lesson.title
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />

                                {
                                  lesson.durationMinutes
                                }{' '}
                                phút
                              </span>
                            </div>
                          </div>
                        </button>

                        {renderQuizButton(
                          lesson.lessonId,
                        )}
                      </div>
                    );
                  },
                )
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Certificate Modal */}

      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() =>
          setIsCertModalOpen(false)
        }
        certificate={
          activeCert ||
          certificate ||
          null
        }
        courseTitle={
          course?.title
        }
        learnerName={
          user?.name ||
          (user as any)?.fullName ||
          'Học viên'
        }
      />
    </div>
  );
};