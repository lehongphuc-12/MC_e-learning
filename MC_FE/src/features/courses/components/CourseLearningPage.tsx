import { LearnerQuizHistoryActions } from '../../quizzes/pages/LearnerQuizHistoryActions';
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
  UploadCloud,
  FileAudio,
  Download,
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
import { request } from '../../../services/api';

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

  // Audio Device & Submission Mode Selection
  const [submissionMode, setSubmissionMode] = useState<'MIC' | 'UPLOAD'>('MIC');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Local Audio File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    // Reset local recording states & file upload states
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setUploadedFile(null);
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
      setUploadedAudioUrl(null);
    }
    setLearnerNote('');
    setIsReRecording(false);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lesson.lessonId]);

  // Handle local audio file selection (.mp3, .wav, etc.)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate audio file format
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext) && !file.type.startsWith('audio/')) {
      setErrorMsg('Vui lòng chọn file âm thanh hợp lệ (.mp3, .wav, .m4a, .ogg, .webm, .aac)');
      return;
    }

    // Validate max size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Dung lượng file vượt quá giới hạn 50MB. Vui lòng nén hoặc chọn file nhỏ hơn.');
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);
  };

  const handleResetUploadedFile = () => {
    setUploadedFile(null);
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
      setUploadedAudioUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  // Submit audio assignment to backend (supports either live record blob or uploaded file)
  const handleSubmitAssignment = async () => {
    const fileToUpload = submissionMode === 'MIC' ? audioBlob : uploadedFile;
    if (!fileToUpload) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('LessonId', lesson.lessonId.toString());

      if (fileToUpload instanceof File) {
        formData.append('AudioFile', fileToUpload, fileToUpload.name);
      } else {
        formData.append('AudioFile', fileToUpload, `speaking_record_${Date.now()}.webm`);
      }

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
        setUploadedFile(null);
        if (uploadedAudioUrl) {
          URL.revokeObjectURL(uploadedAudioUrl);
          setUploadedAudioUrl(null);
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
    <div className="flex flex-col h-full w-full bg-[#f4f7fa] p-5 md:p-8 overflow-y-auto text-slate-900 scrollbar-thin scrollbar-thumb-slate-800">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold mb-2">
            <Mic className="w-3.5 h-3.5" />
            <span>BÀI KIỂM TRA NÓI CUỐI KHÓA</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {lesson.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-500">
            <Clock className="w-4 h-4 text-violet-400" />
            <span>Thời lượng: {lesson.durationMinutes || 15} phút</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left / Prompt Area (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur-sm shadow-lg">
            <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              <span>Đề Bài & Yêu Cầu</span>
            </h3>

            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-[#f4f7fa]/60 p-4 rounded-xl border border-slate-200/60">
              {lesson.description ||
                'Hãy đọc kỹ kịch bản bài học và thực hiện thu âm giọng nói của bạn. Giảng viên sẽ nghe trực tiếp bài thu âm này để đánh giá ngữ điệu, tốc độ, cảm xúc và đưa ra điểm số kèm nhận xét chi tiết.'}
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Hướng dẫn thực hiện:
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pl-4 list-disc">
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
            <div className="flex flex-col items-center justify-center p-12 bg-white/60 rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500">Đang tải thông tin bài làm...</p>
            </div>
          ) : submission && !isReRecording ? (
            /* ── Existing Submission View ────────────────────────────────── */
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-md">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
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

                <span className="text-[11px] text-slate-500">
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
                    <div className="mt-3 text-xs text-slate-200 bg-[#f4f7fa]/70 p-3.5 rounded-xl border border-emerald-500/20 leading-relaxed">
                      <span className="font-bold text-emerald-400 block mb-1">Lời nhận xét:</span>
                      "{submission.feedback}"
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Không có nhận xét thêm.</p>
                  )}

                  {submission.gradedByName && (
                    <div className="mt-3 text-[11px] text-slate-500 text-right">
                      Người chấm: <span className="font-semibold text-slate-200">{submission.gradedByName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Submitted Audio Player */}
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-violet-400" />
                  <span>Bài thu âm của bạn đã lưu trên Cloud:</span>
                </label>
                <div className="p-3 bg-[#f4f7fa] rounded-xl border border-slate-200">
                  <audio controls src={submission.audioUrl} className="w-full h-10" />
                </div>
              </div>

              {submission.note && (
                <div className="mb-5 text-xs text-slate-500 bg-[#f4f7fa]/50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Ghi chú đã gửi:</span>
                  "{submission.note}"
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsReRecording(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-violet-400" />
                  <span>Ghi âm & Nộp bài làm mới</span>
                </button>
              </div>
            </div>
          ) : (
            /* ── Interactive Audio Recording Workspace ────────────────── */
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-md">
              {/* Header & Submission Mode Selector Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-4 h-4 text-violet-400" />
                  <span>Khu Vực Làm Bài Thi Nói</span>
                </h3>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 bg-[#f4f7fa] p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSubmissionMode('MIC')}
                    disabled={isRecording || isSubmitting}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      submissionMode === 'MIC'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Ghi âm trực tiếp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionMode('UPLOAD')}
                    disabled={isRecording || isSubmitting}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      submissionMode === 'UPLOAD'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Tải file MP3 / Audio</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* MODE 1: LIVE VOICE RECORDING */}
              {submissionMode === 'MIC' && (
                <>
                  {/* Microphone Device Selector Dropdown */}
                  <div className="mb-5 bg-[#f4f7fa]/80 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-violet-600" />
                        <span>Chọn thiết bị Micrô ghi âm:</span>
                      </label>
                      {audioDevices.length > 0 && (
                        <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full font-bold border border-violet-200">
                          {audioDevices.length} thiết bị
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        disabled={isRecording || isSubmitting}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 transition-all cursor-pointer"
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
                      <Mic className="w-4 h-4 text-violet-600 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Record State 1: IDLE (Not Recording, No Audio Blob) */}
                  {!isRecording && !audioBlob && (
                    <div className="flex flex-col items-center justify-center p-8 bg-[#f4f7fa]/70 rounded-2xl border border-slate-200/80 text-center">
                      <button
                        onClick={handleStartRecording}
                        className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-violet-600 hover:from-violet-500 hover:to-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer mb-4 group"
                      >
                        <Mic className="w-9 h-9 group-hover:scale-110 transition-transform" />
                      </button>

                      <h4 className="text-base font-bold text-slate-900">Bắt đầu Ghi âm giọng nói</h4>
                      <p className="text-xs text-slate-500 max-w-xs mt-1">
                        Nhấn vào nút micro phía trên để cho phép trình duyệt truy cập và bắt đầu thu âm bài phát biểu của bạn.
                      </p>
                    </div>
                  )}

                  {/* Record State 2: RECORDING IN PROGRESS */}
                  {isRecording && (
                    <div className="flex flex-col items-center justify-center p-8 bg-[#f4f7fa]/90 rounded-2xl border border-rose-300 text-center relative overflow-hidden">
                      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        ĐANG GHI ÂM
                      </div>

                      <div className="text-4xl font-black text-slate-900 font-mono tracking-wider mb-4 mt-2">
                        {formatTime(recordingTime)}
                      </div>

                      {/* Sound Wave Animation */}
                      <div className="flex items-center gap-1.5 h-8 mb-6">
                        {[40, 70, 30, 90, 60, 100, 50, 80, 40, 70].map((h, i) => (
                          <div
                            key={i}
                            className="w-1.5 rounded-full bg-violet-600 animate-pulse"
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
                      <div className="p-4 bg-[#f4f7fa] rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span>Nghe lại bản thu âm (Thời lượng: {formatTime(recordingTime)})</span>
                          </span>
                        </div>

                        <audio controls src={audioUrl} className="w-full h-10 mt-1" />
                      </div>

                      {/* Optional Learner Note Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">
                          Ghi chú cho giảng viên (Không bắt buộc):
                        </label>
                        <textarea
                          rows={2}
                          value={learnerNote}
                          onChange={(e) => setLearnerNote(e.target.value)}
                          placeholder="Nhập ghi chú hoặc thắc mắc nếu có..."
                          className="w-full p-3 bg-[#f4f7fa] border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          onClick={handleResetRecording}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-300 shadow-2xs disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4 text-slate-500" />
                          <span>Thực hiện lại</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {submission && isReRecording && (
                            <button
                              onClick={() => setIsReRecording(false)}
                              disabled={isSubmitting}
                              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                            >
                              Hủy
                            </button>
                          )}

                          <button
                            onClick={handleSubmitAssignment}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
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
                </>
              )}

              {/* MODE 2: UPLOAD LOCAL AUDIO FILE (.mp3, .wav, .m4a, .ogg) */}
              {submissionMode === 'UPLOAD' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
                    className="hidden"
                  />

                  {!uploadedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-8 bg-[#f4f7fa]/70 rounded-2xl border-2 border-dashed border-slate-300 hover:border-violet-500 text-center transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Tải file ghi âm từ máy cá nhân</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Bấm vào đây để chọn file âm thanh bài phát biểu của bạn từ máy tính.
                      </p>
                      <span className="mt-3 text-[11px] font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                        Định dạng hỗ trợ: .MP3, .WAV, .M4A, .OGG, .WEBM (Tối đa 50MB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected File Card */}
                      <div className="p-4 bg-[#f4f7fa] rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
                              <FileAudio className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate max-w-[220px] sm:max-w-[300px]">
                                {uploadedFile.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetUploadedFile}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-300 shadow-2xs shrink-0"
                          >
                            Đổi file khác
                          </button>
                        </div>

                        {/* Inline Preview Player */}
                        {uploadedAudioUrl && (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Nghe thử trước khi nộp:</span>
                            </label>
                            <audio controls src={uploadedAudioUrl} className="w-full h-10" />
                          </div>
                        )}
                      </div>

                      {/* Optional Note */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">
                          Ghi chú cho giảng viên (Không bắt buộc):
                        </label>
                        <textarea
                          rows={2}
                          value={learnerNote}
                          onChange={(e) => setLearnerNote(e.target.value)}
                          placeholder="Nhập ghi chú hoặc thắc mắc nếu có..."
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        {submission && isReRecording && (
                          <button
                            type="button"
                            onClick={() => setIsReRecording(false)}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                          >
                            Hủy
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleSubmitAssignment}
                          disabled={isSubmitting}
                          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
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
                  )}
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

  // Handle YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    
    try {
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      const urlObj = new URL(formattedUrl);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname === '/watch') {
          videoId = urlObj.searchParams.get('v') || '';
        } else if (urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1];
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1];
        } else if (urlObj.pathname.startsWith('/v/')) {
          videoId = urlObj.pathname.split('/v/')[1];
        }
      } else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      }
    } catch (e) {
      // Fallback regex if URL parsing fails
      const ytMatch = url.match(/(?:youtu\.be\/|v\/|u\/\w+\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
      if (ytMatch && ytMatch[1]) {
        videoId = ytMatch[1];
      }
    }

    if (videoId) {
      // Origin is required for enablejsapi=1 to work properly without errors
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
    }
  }

  // Handle Vimeo
  if (url.includes('vimeo.com')) {
    const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch && vimeoMatch[3]) {
      return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&api=1&player_id=video-player-iframe`;
    }
  }

  // Handle Google Drive
  if (url.includes('drive.google.com')) {
    const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
    }
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

  // Real materials attached to the course or current lesson.
  const [courseMaterials, setCourseMaterials] = useState<Array<{ materialId: number; lessonId: number | null; title: string; fileUrl: string; materialType: string | null }>>([]);
  const [materialsError, setMaterialsError] = useState(false);
  useEffect(() => {
    let alive = true;
    setCourseMaterials([]);
    setMaterialsError(false);
    if (!courseId || !user?.id) return;
    request<{ success: boolean; data: Array<{ materialId: number; lessonId: number | null; title: string; fileUrl: string; materialType: string | null }> }>(`/courses/${courseId}/materials`)
      .then(res => { if (alive) setCourseMaterials(res.data ?? []); })
      .catch(() => { if (alive) setMaterialsError(true); });
    return () => { alive = false; };
  }, [courseId, user?.id]);

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
      const isAssignment = l.lessonType?.toUpperCase() === 'ASSIGNMENT';

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

  const lessonMaterials = courseMaterials.filter(m => m.lessonId == null || m.lessonId === activeLesson?.lessonId);

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

  // Dynamic video durations in seconds (mapped by lessonId)
  const [detectedDurations, setDetectedDurations] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mseek_lesson_duration_')) {
          const lId = Number(key.replace('mseek_lesson_duration_', ''));
          const val = parseFloat(localStorage.getItem(key) || '');
          if (!isNaN(lId) && !isNaN(val) && val > 0) {
            initial[lId] = val;
          }
        }
      }
    } catch (_) {}
    return initial;
  });

  const handleSaveLessonDuration = (lessonId: number, durationSec: number) => {
    if (!lessonId || isNaN(durationSec) || durationSec <= 0) return;
    const rounded = Math.round(durationSec);
    try {
      localStorage.setItem(`mseek_lesson_duration_${lessonId}`, rounded.toString());
    } catch (_) {}
    setDetectedDurations((prev) => {
      if (prev[lessonId] === rounded) return prev;
      return { ...prev, [lessonId]: rounded };
    });
  };

  // Pre-load durations for direct video files in the playlist in background
  useEffect(() => {
    orderedLessons.forEach((l) => {
      if (l.videoUrl && l.videoUrl.trim() !== '') {
        if (detectedDurations[l.lessonId]) return;

        const isEmbed =
          l.videoUrl.includes('youtube.com') ||
          l.videoUrl.includes('youtu.be') ||
          l.videoUrl.includes('vimeo.com') ||
          l.videoUrl.includes('drive.google.com');

        if (!isEmbed) {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = l.videoUrl;
          v.onloadedmetadata = () => {
            if (v.duration && !isNaN(v.duration) && v.duration > 0) {
              handleSaveLessonDuration(l.lessonId, v.duration);
            }
          };
        }
      }
    });
  }, [orderedLessons, detectedDurations]);

  // Format lesson duration: if no video => calculate by content or default '10 phút', if has video => actual video duration
  const getLessonDuration = (lesson?: Lesson | null): string => {
    if (!lesson) return '10 phút';
    const hasVideo = !!(
      lesson.videoUrl &&
      lesson.videoUrl.trim() !== '' &&
      lesson.lessonType?.toUpperCase() !== 'ASSIGNMENT'
    );
    if (!hasVideo) {
      // Calculate according to content length
      const desc = (lesson.description || '').trim();
      const wordCount = desc.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 20) {
        const readingMins = Math.max(1, Math.ceil(wordCount / 150));
        return `${readingMins} phút`;
      }
      if (lesson.durationMinutes && lesson.durationMinutes > 0 && lesson.durationMinutes !== 10) {
        return `${lesson.durationMinutes} phút`;
      }
      return '10 phút';
    }

    const durationSec = detectedDurations[lesson.lessonId];
    if (durationSec && durationSec > 0) {
      const totalSecs = Math.round(durationSec);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // If video duration is not yet detected, check if lesson has custom durationMinutes from DB
    if (
      lesson.durationMinutes &&
      lesson.durationMinutes > 0 &&
      lesson.durationMinutes !== 10 &&
      lesson.durationMinutes !== 35
    ) {
      return `${lesson.durationMinutes} phút`;
    }

    // If no video duration yet, check content
    const desc = (lesson.description || '').trim();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20) {
      const readingMins = Math.max(1, Math.ceil(wordCount / 150));
      return `${readingMins} phút`;
    }

    // Default when video is not loaded yet
    return '10 phút';
  };

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

  const storageKey = user?.id
    ? `mc_completed_lessons_${user.id}_${courseId}`
    : `mc_completed_lessons_guest_${courseId}`;

  // ===========================================================================
  // Sync completed lesson IDs from LocalStorage & backend progress
  // ===========================================================================

  // Only the authenticated learner's backend progress is authoritative.
  // Never import old browser completions into another account's database.
  useEffect(() => {
    setCompletedLessonIds([]);
    hasMarkedEndedRef.current = {};
    watchedSecondsRef.current = {};
    lastPlaybackRef.current = null;
    videoCompletionTriggeredRef.current = {};
    setVideoWatchProgress({});
  }, [user?.id, courseId]);

  useEffect(() => {
    if (!user?.id || !progressData) return;
    const backendCompleted = (progressData.lessonProgresses ?? [])
      .filter((lp) => lp.isCompleted).map((lp) => lp.lessonId);
    setCompletedLessonIds(backendCompleted);
    try { localStorage.setItem(storageKey, JSON.stringify(backendCompleted)); } catch (_) {}
  }, [progressData, storageKey, user?.id]);

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
    lastPlaybackRef.current = null;
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

  const renderQuizButton = (lessonId: number) => {
    const quiz = getQuizForLesson(lessonId);
    if (!quiz) return null;
    return <div className="ml-7 mt-1 max-w-md"><LearnerQuizHistoryActions quizId={quiz.quizId} maxAttempts={quiz.maxAttempts} passingScore={quiz.passingScore} returnTo={getQuizReturnTo(lessonId)} onTake={() => handleTakeQuiz(quiz.quizId, lessonId)} /></div>;
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

  const [replayKey, setReplayKey] = useState(0);

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
                onReady: (event: any) => {
                  try {
                    const dur = event.target.getDuration();
                    if (dur && dur > 0 && activeLessonRef.current) {
                      handleSaveLessonDuration(activeLessonRef.current.lessonId, dur);
                    }
                  } catch (_) {}
                },
                onStateChange: (
                  event: any,
                ) => {
                  // 0 means ENDED
                  if (event.data === 0) {
                    const current = activeLessonRef.current;
                    const duration = event.target?.getDuration?.() || 0;
                    if (!current || !recordActualPlayback(current.lessonId, event.target?.getCurrentTime?.() || duration, duration)) return;
                    videoCompletionTriggeredRef.current[current.lessonId] = true;
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
                if (activeLessonRef.current) {
                  handleSaveLessonDuration(
                    activeLessonRef.current.lessonId,
                    duration,
                  );
                }

                handleVideoTimeUpdate(
                  currentTime,
                );
                const watchedEnough = activeLessonRef.current ? recordActualPlayback(activeLessonRef.current.lessonId, currentTime, duration) : false;

                if (watchedEnough && currentTime >= duration * 0.95 && !videoCompletionTriggeredRef.current[activeLessonRef.current?.lessonId || 0]) {
                  videoCompletionTriggeredRef.current[activeLessonRef.current!.lessonId] = true;
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
              }
            } catch (_) {}
          }
        }, 1000);
      } catch (error) { ytPlayerRef.current = null; console.error('[CourseLearning] Cannot attach YouTube player', error); }
    };

    const win = window as any;

    // Wait for BOTH the YouTube API and the actual iframe to be mounted.
    // The old code tried YT.Player before React had rendered the iframe,
    // silently swallowed the error, and never retried.
    let apiWaitTimer: ReturnType<typeof setInterval> | null = null;
    let initialized = false;
    let attempts = 0;
    const tryInit = () => {
      if (initialized) return;
      const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
      if (!iframe || !iframe.src.includes('youtube.com/embed/')) return;
      if (!win.YT?.Player) return;
      try {
        initYTPlayer();
        initialized = !!ytPlayerRef.current;
        if (initialized && apiWaitTimer) { clearInterval(apiWaitTimer); apiWaitTimer = null; }
      } catch (error) { console.error('[CourseLearning] YouTube player initialization failed', error); }
    };
    tryInit();
    if (!initialized) apiWaitTimer = setInterval(() => {
      tryInit();
      if (++attempts >= 100 && apiWaitTimer) {
        clearInterval(apiWaitTimer);
        apiWaitTimer = null;
        console.warn('[CourseLearning] YouTube iframe/API unavailable after 30 seconds');
      }
    }, 300);

    return () => {
      if (apiWaitTimer) clearInterval(apiWaitTimer);
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
    replayKey,
  ]);

  // ===========================================================================
  // Detect video completion via window postMessage
  // ===========================================================================

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent,
    ) => {
      try {
        const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
        if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;
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

        // Vimeo player.js postMessage: { event: 'timeupdate', data: { seconds, duration, percent } }.
        // Google Drive preview does not expose playback events to third-party pages.
        if (iframe.src.includes('player.vimeo.com')) {
          if (!/^https:\/\/(?:player\.)?vimeo\.com$/.test(event.origin)) return;
          const payload = data.data || {};
          const seconds = Number(payload.seconds ?? payload.currentTime);
          const length = Number(payload.duration);
          if (Number.isFinite(length) && length > 0 && activeLessonRef.current) handleSaveLessonDuration(activeLessonRef.current.lessonId, length);
          if (Number.isFinite(seconds) && Number.isFinite(length) && length > 0 && activeLessonRef.current) {
            handleVideoTimeUpdate(seconds);
            const current = activeLessonRef.current;
            if (recordActualPlayback(current.lessonId, seconds, length) && !videoCompletionTriggeredRef.current[current.lessonId]) {
              videoCompletionTriggeredRef.current[current.lessonId] = true;
              handleMarkLessonComplete(current.lessonId, true);
              setIsVideoEnded(true);
            }
          }
          if (data.event === 'ended' && activeLessonRef.current && !videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId]) {
            const current = activeLessonRef.current;
            videoCompletionTriggeredRef.current[current.lessonId] = true;
            setVideoWatchProgress(prev => ({ ...prev, [current.lessonId]: 100 }));
            handleMarkLessonComplete(current.lessonId, true);
            setIsVideoEnded(true);
          }
          return;
        }
        if (!/^https:\/\/(?:www\.|www-nocookie\.)?youtube\.com$/.test(event.origin)) return;
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

        // Automatically save detected duration whenever received from video player
        if (typeof duration === 'number' && duration > 0 && !isNaN(duration)) {
          if (activeLessonRef.current) {
            handleSaveLessonDuration(
              activeLessonRef.current.lessonId,
              duration,
            );
          }
        }

        // Track playback progress
        if (typeof currentTime === 'number' && currentTime > 0 && !isNaN(currentTime)) {
          handleVideoTimeUpdate(currentTime);
        }

        const isEndedByState =
          data.event === 'finish' ||
          data.ended === true ||
          (data.event ===
            'onStateChange' &&
            (info === 0 ||
              data.info === 0)) ||
          playerState === 0;

        const watchedEnough = activeLessonRef.current && typeof currentTime === 'number' && typeof duration === 'number'
          ? recordActualPlayback(activeLessonRef.current.lessonId, currentTime, duration) : false;
        if (isEndedByState && watchedEnough && activeLessonRef.current && !videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId]) {
          videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId] = true;
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
          watchedEnough && typeof currentTime === 'number' && typeof duration === 'number' && currentTime >= duration * 0.95 && activeLessonRef.current && !videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId]
        ) {
          videoCompletionTriggeredRef.current[activeLessonRef.current.lessonId] = true;
          setIsVideoEnded(true);
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

    // Periodically ping YouTube iframe to request duration metadata
    const pingTimer = setInterval(() => {
      const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          if (iframe.src.includes('player.vimeo.com')) {
            for (const eventName of ['timeupdate', 'ended', 'loaded']) iframe.contentWindow.postMessage({ method: 'addEventListener', value: eventName }, 'https://player.vimeo.com');
            return;
          }
          if (!iframe.src.includes('youtube.com')) return;
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), 'https://www.youtube.com');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getDuration', args: [] }), '*');
        } catch (_) {}
      }
    }, 1000);

    return () => {
      clearInterval(pingTimer);
      window.removeEventListener(
        'message',
        handleMessage,
      );
    };
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
    setReplayKey(0);
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

  const watchedSecondsRef = useRef<Record<number, number>>({});
  const [videoWatchProgress, setVideoWatchProgress] = useState<Record<number, number>>({});
  const videoCompletionTriggeredRef = useRef<Record<number, boolean>>({});
  const lastPlaybackRef = useRef<{ lessonId: number; position: number; at: number } | null>(null);
  const recordActualPlayback = (lessonId: number, position: number, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return false;
    const percent = Math.max(0, Math.min(100, Math.floor(position / duration * 100)));
    setVideoWatchProgress(prev => prev[lessonId] === percent ? prev : { ...prev, [lessonId]: percent });
    // Video lessons complete at the 95% playback position (including YouTube and direct video).
    return position >= duration * 0.95;
  };
  const lastUpdatedSecRef =
    useRef<number>(0);

  const handleVideoTimeUpdate = (
    currentTime: number,
  ) => {
    const currentSec =
      Math.floor(currentTime);

    if (
      activeLessonRef.current &&
      currentSec > 0 &&
      currentSec !==
        lastUpdatedSecRef.current &&
      currentSec % 5 === 0
    ) {
      lastUpdatedSecRef.current =
        currentSec;

      updateProgressMutation.mutate({
        lessonId:
          activeLessonRef.current!.lessonId,
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

  // Automatically advance after a video finishes; do not skip assignments or quizzes.
  const [autoNextSeconds, setAutoNextSeconds] = useState(5);
  const [autoNextCancelled, setAutoNextCancelled] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (isVideoEnded) { setAutoNextSeconds(5); setAutoNextCancelled(false); }
  }, [isVideoEnded]);
  const handleReplayVideo = () => {
    setAutoNextCancelled(true);
    setIsVideoEnded(false);
    const iframe = document.getElementById('video-player-iframe') as HTMLIFrameElement | null;
    const url = activeLesson?.videoUrl || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try { ytPlayerRef.current?.seekTo?.(0, true); ytPlayerRef.current?.playVideo?.(); } catch (_) { setReplayKey(k => k + 1); }
    } else if (url.includes('vimeo.com') && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ method: 'setCurrentTime', value: 0 }, 'https://player.vimeo.com');
      iframe.contentWindow.postMessage({ method: 'play' }, 'https://player.vimeo.com');
    } else if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
      void videoElementRef.current.play().catch(() => {});
    } else { setReplayKey(k => k + 1); }
  };
  useEffect(() => {
    setAutoNextSeconds(5);
    setAutoNextCancelled(false);
  }, [activeLesson?.lessonId]);
  useEffect(() => {
    if (!isVideoEnded || !nextLesson || autoNextCancelled ||
        !activeLesson?.videoUrl?.trim() ||
        activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
        quizzes.some(q => q.lessonId === activeLesson?.lessonId && q.status === 'ACTIVE')) return;
    if (autoNextSeconds <= 0) { handleSelectLesson(nextLesson); return; }
    const timer = window.setTimeout(() => setAutoNextSeconds(n => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isVideoEnded, nextLesson?.lessonId, autoNextCancelled, autoNextSeconds, activeLesson?.lessonId, quizzes]);

  // ===========================================================================
  // Total duration
  // ===========================================================================

  const totalDuration = orderedLessons.reduce((sum, l) => {
    const hasVideo = !!(
      l.videoUrl &&
      l.videoUrl.trim() !== '' &&
      l.lessonType?.toUpperCase() !== 'ASSIGNMENT'
    );
    if (hasVideo) {
      const sec = detectedDurations[l.lessonId];
      if (sec && sec > 0) {
        return sum + Math.max(1, Math.round(sec / 60));
      }
      if (l.durationMinutes && l.durationMinutes > 0 && l.durationMinutes !== 10 && l.durationMinutes !== 35) {
        return sum + l.durationMinutes;
      }
    }
    const desc = (l.description || '').trim();
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20) {
      return sum + Math.max(1, Math.ceil(wordCount / 150));
    }
    return sum + (l.durationMinutes || 10);
  }, 0);

  // ===========================================================================
  // Loading state
  // ===========================================================================

  if (
    isCourseLoading ||
    isLessonsLoading ||
    isQuizzesLoading
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f7fa] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />

          <p className="text-xs font-medium text-slate-500">
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
    <div className="mseek-light-studio flex h-screen w-full flex-col bg-[#eaf3ff] text-slate-900 overflow-hidden font-sans">
      <style>{`
        .mseek-light-studio{background:linear-gradient(145deg,#dbeaff 0%,#f0f7ff 50%,#dceaff 100%);color:#101d50}
        .mseek-topbar{backdrop-filter:blur(16px);background:linear-gradient(90deg,#f9fcff,#e9f2ff 55%,#edf3ff);border-color:#c9ddff}
        .mseek-stage-hero{background:linear-gradient(90deg,rgba(222,235,255,.92) 0%,rgba(199,221,255,.60) 43%,rgba(191,214,255,.13) 78%),url('/images/mseek-mc-blue-banner.png') center/cover no-repeat,#bcd5ff;min-height:132px}
        .mseek-stage-glow{background:radial-gradient(circle at 24% 0%,rgba(255,255,255,.68),transparent 34%);pointer-events:none}
        .mseek-stage-mic{animation:mseekFloat 5s ease-in-out infinite}
        .mseek-stage-main{background:transparent}
        .mseek-curriculum,.mseek-right-rail{box-shadow:0 8px 32px rgba(18,69,154,.08)}
        .mseek-light-studio button{transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease,border-color .2s ease}
        .mseek-light-studio button:not(:disabled):active{transform:scale(.97)}
        .mseek-light-studio button:focus-visible{outline:3px solid #93baff;outline-offset:3px}
        .mseek-light-studio .shadow-2xl{box-shadow:0 16px 38px rgba(26,75,156,.12)}
        .mseek-light-studio .shadow-xl{box-shadow:0 10px 30px rgba(26,75,156,.10)}
        .mseek-light-studio .shadow-lg{box-shadow:0 6px 24px rgba(26,75,156,.09)}
        .mseek-light-studio audio{accent-color:#1557f5}
        .mseek-light-studio .bg-violet-600{background-color:#1654f5}
        .mseek-light-studio .hover\:bg-violet-700:hover{background-color:#0c3fce}
        .mseek-light-studio .text-violet-700{color:#1648c7}
        .mseek-light-studio .text-violet-600{color:#1554e8}
        .mseek-light-studio .border-violet-100{border-color:#d5e4ff}
        .mseek-light-studio .border-violet-200{border-color:#bed5ff}
        .mseek-light-studio .bg-violet-50{background-color:#eef5ff}
        .mseek-light-studio .bg-violet-100{background-color:#dceaff}
        @keyframes mseekFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @media(max-width:1279px){.mseek-right-rail{display:none}}
        @media(max-width:767px){.mseek-curriculum{width:min(80vw,320px)}.mseek-stage-hero{padding:14px 16px;min-height:112px}}
        @media(prefers-reduced-motion:reduce){.mseek-stage-mic{animation:none}.mseek-light-studio *{transition-duration:.01ms!important;animation-duration:.01ms!important}}
      `}</style>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}

      <header className="mseek-topbar flex min-h-16 shrink-0 items-center justify-between border-b border-blue-100 bg-white/95 px-4 md:px-6 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLessons}
            title="Quay lại quản lý bài học"
            className="flex items-center gap-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-violet-600 border border-slate-200 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />

            <span>
              Thoát / Về quản lý bài học
            </span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200" />

          <div>
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <span>
                {course?.title ??
                  'Chi tiết khóa học'}
              </span>
            </h1>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
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

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700 font-semibold">
            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    completionPercentage,
                  )}%`,
                }}
              />
            </div>

            <span className="text-[11px] text-blue-700 font-black">
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
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md shadow-amber-500/20"
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

          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs text-violet-700 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />

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
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm shadow-violet-500/20"
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

      {/* Course banner: dynamic title, decorative background only */}
      <section className="mseek-stage-hero relative shrink-0 overflow-hidden rounded-b-2xl border-b border-blue-200 px-5 py-4 md:px-8 md:py-5">
        <div className="mseek-stage-glow absolute inset-0" />
        <div className="relative z-10 flex min-h-[86px] items-center gap-4">
          <div className="mseek-stage-mic flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/90 shadow-lg"><BookOpen className="h-7 w-7 text-blue-600" /></div>
          <div className="min-w-0 max-w-[min(65%,760px)]">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[.16em] text-blue-700">MSEEK · MC VOICE STUDIO</p>
            <h2 className="text-lg font-black tracking-tight text-[#09236c] md:text-2xl">{course?.title || 'Hành trình làm chủ giọng nói'}</h2>
            <p className="mt-1 text-xs font-medium text-blue-700">Tự tin cất tiếng · Truyền cảm hứng · Tỏa sáng trên sân khấu</p>
          </div>
        </div>
      </section>

      {/* ── Main Container ──────────────────────────────────────────────── */}

      <div className="flex flex-1 overflow-hidden relative flex-row-reverse">
        {/* Right study summary: only data already available in this page */}
        <aside className="mseek-right-rail hidden w-[286px] shrink-0 flex-col gap-3 overflow-y-auto bg-transparent p-3 xl:flex">
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><Award className="h-4 w-4 text-blue-600"/> Tiến độ học tập</h3>
            <div className="flex items-center gap-4">
              <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full" style={{background:`conic-gradient(#1554f5 ${Math.min(100,completionPercentage)}%,#dbe8ff 0)`}}>
                <div className="grid h-[69px] w-[69px] place-items-center rounded-full bg-white text-xl font-black text-blue-700">{completionPercentage}%</div>
              </div>
              <div className="space-y-2 text-[11px] text-slate-600"><p>✓ Đã hoàn thành <b>{completedLessonIds.length}/{totalLessonCount} bài</b></p><p>◷ Tổng thời lượng: <b>{totalDuration} phút</b></p><p>▣ Bài hiện tại: <b>{currentIndex >= 0 ? currentIndex+1 : 1}/{totalLessonCount}</b></p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><FileText className="h-4 w-4 text-blue-600"/> Thông tin bài học</h3>
            <p className="text-xs font-bold text-blue-700">{activeLesson?.title || 'Chọn bài học để bắt đầu'}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{activeLesson?.description || 'Xem nội dung, học qua video và thực hành luyện giọng theo lộ trình.'}</p>
            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">Thời lượng: {getLessonDuration(activeLesson)}</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0c2056]"><Mic className="h-4 w-4 text-blue-600"/> Luyện tập giọng nói</h3>
            <p className="text-xs leading-relaxed text-slate-600">Chọn bài tập nói trong lộ trình để ghi âm hoặc tải tệp âm thanh lên cho giảng viên đánh giá.</p>
            <div className="mt-4 flex h-12 items-center justify-center gap-[3px]">{[12,22,32,18,38,26,14,34,43,19,30,17,40,23,12,35,26,15,33,20,38,16,27,12].map((h,i)=><span key={i} className="w-[3px] rounded-full bg-blue-400/80" style={{height:h}}/>)}</div>
          </div>
        </aside>
        {/* Left / Center Main Content */}

        <main className="mseek-stage-main min-w-0 flex-1 overflow-y-auto bg-transparent p-3 md:p-4 scrollbar-thin scrollbar-thumb-violet-300">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Main Workspace Container (Video or Speaking Assignment) */}

            <div
              className={`relative w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xl group ${
                activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
                (!activeLesson?.videoUrl && activeLesson !== null)
                  ? 'min-h-[550px] bg-[#f4f7fa]'
                  : 'aspect-video bg-black'
              }`}
            >
              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ? (
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
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#f4f7fa]/95 backdrop-blur-md p-6 text-center animate-fadeIn">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        Bạn đã hoàn thành bài học này!
                      </h3>

                      <p className="mt-1.5 text-xs text-slate-600 max-w-md line-clamp-2">
                        {activeLesson?.title}
                      </p>

                      {nextLesson && !quizzes.some(q => q.lessonId === activeLesson?.lessonId && q.status === 'ACTIVE') && (
                        <div className="mt-3 text-xs text-slate-600">
                          {autoNextCancelled ? 'Đã hủy tự chuyển bài.' : `Tự chuyển sang bài tiếp theo sau ${autoNextSeconds} giây.`}

                        </div>
                      )}
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleReplayVideo}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-slate-900 transition-all cursor-pointer border border-slate-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Xem lại video
                        </button>

                        {nextLesson && (
                          <button
                            onClick={() => {
                              setIsVideoEnded(false);

                              handleSelectLesson(nextLesson);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white shadow-violet-500/30 hover:bg-violet-500 active:scale-95 transition-all cursor-pointer"
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
                        key={`${activeLesson?.lessonId}-${replayKey}`}
                        id="video-player-iframe"
                        src={embedUrl}
                        title={activeLesson?.title}
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        ref={videoElementRef}
                        key={`${activeLesson?.lessonId}-${replayKey}`}
                        src={embedUrl}
                        controls
                        autoPlay
                        onLoadedMetadata={(e) => {
                          if (activeLesson && e.currentTarget.duration) {
                            handleSaveLessonDuration(
                              activeLesson.lessonId,
                              e.currentTarget.duration,
                            );
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget;

                          handleVideoTimeUpdate(v.currentTime);
                          const watchedEnough = activeLesson ? recordActualPlayback(activeLesson.lessonId, v.currentTime, v.duration) : false;

                          if (watchedEnough && v.currentTime >= v.duration * 0.95 && activeLesson && !videoCompletionTriggeredRef.current[activeLesson.lessonId]) {
                            videoCompletionTriggeredRef.current[activeLesson.lessonId] = true;
                            setIsVideoEnded(true);
                            handleMarkLessonComplete(activeLesson.lessonId, true);
                          }
                        }}
                        onPause={(e) =>
                          handleVideoTimeUpdate(e.currentTarget.currentTime)
                        }
                        onEnded={(e) => {
                          if (!activeLesson || !recordActualPlayback(activeLesson.lessonId, e.currentTarget.currentTime, e.currentTarget.duration)) return;
                          if (videoCompletionTriggeredRef.current[activeLesson.lessonId]) return;
                          videoCompletionTriggeredRef.current[activeLesson.lessonId] = true;
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
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-slate-950">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-3">
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

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-sm">
              <button
                disabled={!prevLesson}
                onClick={() =>
                  prevLesson &&
                  handleSelectLesson(
                    prevLesson,
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-violet-600 border border-slate-300 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" />

                <span className="hidden sm:inline text-slate-900 font-bold">
                  Bài trước:
                </span>

                <span className="truncate max-w-[140px] text-slate-600">
                  {prevLesson
                    ? prevLesson.title
                    : '---'}
                </span>
              </button>

              {activeLesson?.lessonType?.toUpperCase() === 'ASSIGNMENT' ||
              (!activeLesson?.videoUrl && activeLesson !== null) ? (
                <div
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border transition-all ${
                    activeLesson && completedLessonIds.includes(activeLesson.lessonId)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                  }`}
                >
                  {activeLesson && completedLessonIds.includes(activeLesson.lessonId) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Đã hoàn thành (Đã chấm điểm)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                      <span>Chờ Giảng viên chấm điểm...</span>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() =>
                    activeLesson && !activeLesson.videoUrl?.trim() &&
                    toggleComplete(activeLesson.lessonId)
                  }
                  disabled={!!activeLesson?.videoUrl?.trim()}
                  title={activeLesson?.videoUrl?.trim() ? 'Bài video được tự động hoàn thành khi xem đủ 95%' : 'Đánh dấu đã đọc xong bài lý thuyết'}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                    activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-300'
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 ${activeLesson && completedLessonIds.includes(activeLesson.lessonId) ? 'text-emerald-600' : 'text-slate-400'}`} />

                  <span>
                    {activeLesson &&
                    completedLessonIds.includes(
                      activeLesson.lessonId,
                    )
                      ? 'Đã hoàn thành'
                      : activeLesson?.videoUrl?.trim() ? 'Tự hoàn thành khi xem 95%' : 'Đã đọc xong – Đánh dấu hoàn thành'}
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
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-violet-600 transition-all cursor-pointer shadow-md shadow-violet-500/20"
              >
                <span className="hidden sm:inline">
                  Bài tiếp:
                </span>

                <span className="truncate max-w-[140px]">
                  {nextLesson
                    ? nextLesson.title
                    : '---'}
                </span>

                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Lesson Title & Info */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200">
                      Bài #
                      {activeLesson?.orderIndex ??
                        (currentIndex >= 0
                          ? currentIndex + 1
                          : 1)}
                    </span>

                    {activeLesson?.isPreview && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <Eye className="h-3 w-3 text-emerald-600" />
                        Xem thử
                      </span>
                    )}

                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />

                      {getLessonDuration(activeLesson)}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>
                      Mở link gốc Video
                    </span>
                  </a>
                )}
              </div>

              {/* Tabs */}

              <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold text-slate-500 pt-2">
                <button
                  onClick={() =>
                    setActiveTab(
                      'overview',
                    )
                  }
                  className={`pb-2.5 transition-colors relative cursor-pointer ${
                    activeTab ===
                    'overview'
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Mô tả bài học

                  {activeTab ===
                    'overview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
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
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Tài liệu & Ghi chú

                  {activeTab ===
                    'notes' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
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
                      ? 'text-violet-600 font-bold'
                      : 'hover:text-slate-800'
                  }`}
                >
                  Thảo luận & Hỏi đáp

                  {activeTab ===
                    'discussion' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                  )}
                </button>
              </div>

              {/* Tab Content */}

              <div className="pt-2 text-xs text-slate-600 leading-relaxed">
                {activeTab ===
                  'overview' && (
                  <p className="whitespace-pre-line text-slate-600 text-sm">
                    {activeLesson?.description ||
                      'Bài học này chưa có nội dung mô tả chi tiết.'}
                  </p>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-slate-500">Tài liệu học tập được giảng viên đính kèm cho bài học và khóa học:</p>
                    {materialsError ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700">Không thể tải danh sách tài liệu. Vui lòng thử tải lại trang.</p> : lessonMaterials.length === 0 ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500">Bài học hiện chưa có tài liệu đính kèm.</p> : lessonMaterials.map(material => (
                      <div key={material.materialId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <FileText className="h-5 w-5 shrink-0 text-violet-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{material.title}</p>
                          <p className="text-[11px] text-slate-500">{material.lessonId == null ? 'Tài liệu chung của khóa học' : 'Tài liệu bài học'}</p>
                        </div>
                        <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" download className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700" title="Tải hoặc mở tài liệu">
                          <Download className="h-4 w-4" /> Tải xuống
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab ===
                  'discussion' && (
                  <div className="space-y-3">
                    <p className="text-slate-500">
                      Bình luận và trao đổi ý kiến với học viên & giảng viên:
                    </p>

                    <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-200">
                      <MessageSquare className="h-5 w-5 text-violet-600" />

                      <input
                        type="text"
                        placeholder="Viết câu hỏi hoặc nhận xét của bạn..."
                        className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
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
          <aside className="mseek-curriculum w-[310px] shrink-0 border-r border-violet-100 bg-white/90 flex flex-col h-full z-20 transition-all duration-300">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-violet-600" />
                  Lộ trình học tập
                </h3>

                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {completedLessonIds.length}/
                  {totalLessonCount}{' '}
                  bài đã xem
                </p>
              </div>
            </div>

            {/* Lesson List grouped by Modules */}

            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-300">
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
                          className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                        >
                          {/* Module Header */}

                          <button
                            onClick={() =>
                              toggleModuleCollapse(
                                mod.moduleId,
                              )
                            }
                            className="w-full flex items-center justify-between p-3 bg-slate-50/80 hover:bg-violet-50/50 text-left transition-colors cursor-pointer border-b border-slate-100"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Layers className="h-3.5 w-3.5 text-violet-600 shrink-0" />

                              <span className="text-xs font-bold text-slate-800 truncate">
                                Chương{' '}
                                {
                                  mod.orderIndex
                                }
                                :{' '}
                                {mod.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-slate-500">
                              <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold border border-violet-200/60">
                                {
                                  modLessons.length
                                }
                              </span>

                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
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
                                              ? 'bg-violet-50 border border-violet-300 text-violet-900 shadow-2xs font-bold'
                                              : 'hover:bg-slate-100/70 border border-transparent text-slate-700'
                                          }`}
                                        >
                                          <div className="shrink-0 mt-0.5">
                                            {isCompleted ? (
                                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : isActive ? (
                                              <PlayCircle className="h-4 w-4 text-violet-600 animate-pulse" />
                                            ) : (
                                              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                                #
                                                {
                                                  lesson.orderIndex
                                                }
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <p
                                              className={`line-clamp-2 ${
                                                isActive
                                                  ? 'text-violet-700 font-bold'
                                                  : 'text-slate-800 font-medium'
                                              }`}
                                            >
                                              {
                                                lesson.title
                                              }
                                            </p>

                                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                              <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-slate-400" />

                                                {getLessonDuration(lesson)}
                                              </span>

                                              {lesson.isPreview && (
                                                <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 font-bold">
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
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="p-3 bg-slate-50 text-xs font-bold text-slate-800 border-b border-slate-100 flex items-center justify-between">
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
                                      ? 'bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs'
                                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                  }`}
                                >
                                  <div className="shrink-0 mt-0.5">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : isActive ? (
                                      <PlayCircle className="h-4 w-4 text-amber-600 animate-pulse" />
                                    ) : (
                                      <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                        #
                                        {
                                          lesson.orderIndex
                                        }
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`line-clamp-2 ${
                                        isActive
                                          ? 'text-amber-800 font-bold'
                                          : 'text-slate-700 font-medium'
                                      }`}
                                    >
                                      {
                                        lesson.title
                                      }
                                    </p>

                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        {getLessonDuration(lesson)}
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
                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Mic className="h-4 w-4 text-purple-600 animate-pulse" />
                          <span>Bài thi nói cuối khóa ({speakingAssignmentLessons.length})</span>
                        </span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
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
                                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 border border-purple-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <Mic className="h-4 w-4 text-purple-500 shrink-0" />
                                )}
                                <span className="font-bold truncate">
                                  {lesson.title}
                                </span>
                              </div>

                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                              }`}>
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
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 border border-violet-200">
                          <Award className="h-4 w-4 text-violet-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-violet-950">
                            Quiz tổng hợp khóa học
                          </p>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                            Kiểm tra tổng hợp kiến thức của toàn bộ khóa học.
                          </p>

                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
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

                          <div className="mt-3">
                            <LearnerQuizHistoryActions
                              quizId={overallQuiz.quizId}
                              maxAttempts={overallQuiz.maxAttempts}
                              passingScore={overallQuiz.passingScore}
                              returnTo={getQuizReturnTo(activeLesson?.lessonId)}
                              onTake={() => handleTakeQuiz(overallQuiz.quizId, activeLesson?.lessonId)}
                            />
                          </div>
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
                              ? 'bg-violet-50 border border-violet-300 text-violet-900 shadow-2xs'
                              : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : isActive ? (
                              <PlayCircle className="h-4 w-4 text-violet-600 animate-pulse" />
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold text-slate-400">
                                #
                                {
                                  lesson.orderIndex
                                }
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`line-clamp-2 ${
                                isActive
                                  ? 'text-violet-700 font-bold'
                                  : 'text-slate-800 font-medium'
                              }`}
                            >
                              {
                                lesson.title
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />

                                {getLessonDuration(lesson)}
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