import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  Mic2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Award,
  MessageSquare,
  User,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Send,
  X,
  Volume2,
  FileAudio,
  Plus,
  Layers,
  Trash2,
  Edit2,
  Check,
  Sliders,
  ListChecks,
  Calculator,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { speakingApi, SpeakingSubmissionDto } from '../../api/speakingApi';
import {
  getSpeakingGradeInfo,
  SpeakingGradeInfo,
  getSpeakingSubmissionCategory,
  getSpeakingScopeInfo,
  SpeakingRubricCriterionDto,
} from '../../types/speakingTypes';
import { courseApi } from '../../api/courseApi';
import { moduleApi } from '../../api/moduleApi';
import { lessonApi } from '../../api/lessonApi';
import { Course } from '../../types/courseTypes';
import { SpeakingScriptUploadModal } from './SpeakingScriptUploadModal';
import { FileText, UploadCloud } from 'lucide-react';
import { ToastType } from '../../../../components/common/Toast';
import {
  aiPracticeApi,
  type InstructorAIPracticeHistoryItem,
} from '@/features/voiceAI/api/aiPracticeApi';

import type { AIPracticeResult } from '@/features/voiceAI/types/aiPracticeTypes';
export interface SpeakingAssignmentItem {
  lessonId: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description?: string;
  durationMinutes: number;
  videoUrl?: string;
}

interface InstructorSpeakingPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

export const InstructorSpeakingPage: React.FC<InstructorSpeakingPageProps> = ({ onToast }) => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SpeakingSubmissionDto[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseIdParam || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PASSED' | 'FAILED' | 'GRADED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active grading modal state
  const [activeSubmission, setActiveSubmission] = useState<SpeakingSubmissionDto | null>(null);
  const [scoreInput, setScoreInput] = useState<number | ''>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState<boolean>(false);

  // Rubric State for Active Modal
  const [activeRubricCriteria, setActiveRubricCriteria] = useState<SpeakingRubricCriterionDto[]>([]);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [isLoadingRubric, setIsLoadingRubric] = useState<boolean>(false);

  const [aiHistory, setAiHistory] = useState<
    InstructorAIPracticeHistoryItem[]
  >([]);

const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
const [aiHistoryError, setAiHistoryError] = useState<string | null>(null);

const [selectedAIResult, setSelectedAIResult] =
  useState<AIPracticeResult | null>(null);

const [aiDetailLoadingId, setAiDetailLoadingId] =
  useState<number | null>(null);
  // Kiểm tra có tiêu chí Rubric nào bị điểm liệt (<= 0) không
  const hasZeroCriterion = useMemo(() => {
    if (activeRubricCriteria.length === 0) return false;
    return activeRubricCriteria.some((c) => {
      const s = criterionScores[c.code] ?? (typeof scoreInput === 'number' ? scoreInput : 0);
      return s <= 0;
    });
  }, [activeRubricCriteria, criterionScores, scoreInput]);

  // Real-time calculated grade tier & pass status for active modal
  const currentScoreGradeInfo = useMemo(() => {
    return getSpeakingGradeInfo(
      typeof scoreInput === 'number' ? scoreInput : 0,
      !hasZeroCriterion,
      hasZeroCriterion
    );
  }, [scoreInput, hasZeroCriterion]);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  // Create Speaking Assignment Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createCourseId, setCreateCourseId] = useState<number | ''>('');
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createDuration, setCreateDuration] = useState<number>(15);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState<boolean>(false);
  const createAssignmentLockRef = useRef(false);

  // Created Speaking Assignments state
  const [speakingAssignments, setSpeakingAssignments] = useState<SpeakingAssignmentItem[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);
  const [scriptModalAssignment, setScriptModalAssignment] = useState<SpeakingAssignmentItem | null>(null);

  // Fetch created speaking assignments for instructor's courses
  const loadAssignments = async (courseList: Course[]) => {
    if (!courseList || courseList.length === 0) return;
    setIsLoadingAssignments(true);
    try {
      const items: SpeakingAssignmentItem[] = [];
      for (const course of courseList) {
        try {
          const lessons = await lessonApi.getLessonsByCourseId(course.courseId);
          const assignmentLessons = lessons.filter((l) => l.lessonType === 'ASSIGNMENT');
          for (const al of assignmentLessons) {
            items.push({
              lessonId: al.lessonId,
              courseId: course.courseId,
              courseTitle: course.title,
              title: al.title,
              description: al.description,
              durationMinutes: al.durationMinutes,
              videoUrl: al.videoUrl,
            });
          }
        } catch (err) {
          // ignore single course error
        }
      }
      setSpeakingAssignments(items);
    } catch (err) {
      console.warn('Failed to load speaking assignments', err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleDeleteAssignment = async (lessonId: number) => {
    try {
      await lessonApi.deleteLesson(lessonId);
      if (onToast) onToast('Đã xóa bài tập nói', '', 'success');
      setSpeakingAssignments((prev) => prev.filter((a) => a.lessonId !== lessonId));
    } catch (err: any) {
      console.error('Failed to delete speaking assignment', err);
      if (onToast) onToast('Thất bại', err.message || 'Không thể xóa bài tập nói.', 'error');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createAssignmentLockRef.current || isCreatingAssignment) return;
    if (!createCourseId) {
      if (onToast) onToast('Vui lòng chọn khóa học', 'Khóa học là bắt buộc.', 'error');
      return;
    }
    if (!createTitle.trim()) {
      if (onToast) onToast('Vui lòng nhập tên bài tập nói', '', 'error');
      return;
    }

    createAssignmentLockRef.current = true;
    setIsCreatingAssignment(true);
    try {
      await lessonApi.createLesson(Number(createCourseId), {
        title: createTitle.trim(),
        description: createDescription.trim(),
        durationMinutes: createDuration || 15,
        moduleId: undefined,
        lessonType: 'ASSIGNMENT',
        status: 'ACTIVE',
        isPreview: false,
      });

      if (onToast)
        onToast('Tạo bài tập nói thành công!', 'Bài tập nói tổng khóa học đã được khởi tạo.', 'success');
      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateDuration(15);
      setCreateCourseId('');
      loadSubmissions(true);
      loadAssignments(courses);
    } catch (err: any) {
      console.error('Failed to create speaking assignment:', err);
      if (onToast)
        onToast('Thất bại', err.message || 'Có lỗi xảy ra khi tạo bài tập nói.', 'error');
    } finally {
      createAssignmentLockRef.current = false;
      setIsCreatingAssignment(false);
    }
  };

  // Fetch courses taught by instructor for filtering dropdown & creation modal
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await courseApi.getInstructorCourses();
        if (res && Array.isArray(res.data)) {
          setCourses(res.data);
          loadAssignments(res.data);
        }
      } catch (err) {
        console.warn('Failed to load instructor courses', err);
      }
    };
    loadCourses();
  }, []);

  // Filtered Speaking Assignments
  const filteredAssignments = useMemo(() => {
    if (selectedCourseId !== 'ALL' && !isNaN(Number(selectedCourseId))) {
      return speakingAssignments.filter((a) => a.courseId === Number(selectedCourseId));
    }
    return speakingAssignments;
  }, [speakingAssignments, selectedCourseId]);

  // Fetch submissions
  const loadSubmissions = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let res;
      if (selectedCourseId !== 'ALL' && !isNaN(Number(selectedCourseId))) {
        res = await speakingApi.getCourseSubmissions(Number(selectedCourseId));
      } else {
        res = await speakingApi.getInstructorSubmissions();
      }

      if (res.success && res.data) {
        setSubmissions(res.data);
      } else {
        setError(res.message || 'Không thể tải danh sách bài nộp nói.');
      }
    } catch (err: any) {
      console.error('Error fetching speaking submissions:', err);
      setError(err.message || 'Lỗi kết nối khi tải danh sách bài nộp.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [selectedCourseId]);

  // Derived Statistics (Sử dụng chung helper getSpeakingSubmissionCategory)
  const stats = useMemo(() => {
    const totalAssignments = speakingAssignments.length;
    const total = submissions.length;
    let pending = 0;
    let passed = 0;
    let failed = 0;
    const gradedScores: number[] = [];

    submissions.forEach((s) => {
      const cat = getSpeakingSubmissionCategory(s);
      if (cat === 'SUBMITTED') {
        pending++;
      } else if (cat === 'PASSED') {
        passed++;
        gradedScores.push(Number(s.score));
      } else if (cat === 'FAILED') {
        failed++;
        gradedScores.push(Number(s.score));
      }
    });

    const graded = passed + failed;
    const avgScore =
      gradedScores.length > 0
        ? Math.round(gradedScores.reduce((acc, curr) => acc + curr, 0) / gradedScores.length)
        : 0;

    return { totalAssignments, total, pending, passed, failed, graded, avgScore };
  }, [speakingAssignments, submissions]);

  // Filtered List (Nhất quán 100% với hàm helper getSpeakingSubmissionCategory)
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const cat = getSpeakingSubmissionCategory(s);

      // Status filter
      if (statusFilter === 'SUBMITTED' && cat !== 'SUBMITTED') return false;
      if (statusFilter === 'PASSED' && cat !== 'PASSED') return false;
      if (statusFilter === 'FAILED' && cat !== 'FAILED') return false;
      if (statusFilter === 'GRADED' && cat === 'SUBMITTED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLearner = s.learnerName.toLowerCase().includes(q) || s.learnerEmail.toLowerCase().includes(q);
        const matchLesson = (s.scriptTitle || s.lessonTitle || '').toLowerCase().includes(q);
        const matchCourse = s.courseTitle.toLowerCase().includes(q);
        if (!matchLearner && !matchLesson && !matchCourse) return false;
      }

      return true;
    });
  }, [submissions, statusFilter, searchQuery]);
  const loadAIHistory = async (sub: SpeakingSubmissionDto) => {
  setAiHistory([]);
  setSelectedAIResult(null);
  setAiHistoryError(null);

  if (!sub.lessonId) {
    setAiHistoryError(
      'Bài nộp này chưa liên kết với bài học nên chưa thể xác định lịch sử AI tương ứng.'
    );
    return;
  }

  setAiHistoryLoading(true);

  try {
    const allHistory: InstructorAIPracticeHistoryItem[] = [];
    const pageSize = 100;

    for (let page = 1; page <= 20; page++) {
      const response = await aiPracticeApi.instructorHistory(
        sub.courseId,
        page,
        pageSize,
        sub.lessonId
      );

      // API trả về mảng trực tiếp
      const items: InstructorAIPracticeHistoryItem[] = response;

      allHistory.push(
        ...items.filter(
          (item) =>
            item.learnerId === sub.learnerId &&
            item.lessonId === sub.lessonId
        )
      );

      if (items.length < pageSize) {
        break;
      }
    }

    allHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    setAiHistory(allHistory);
  } catch (error) {
    console.error('Failed to load AI history:', error);

    setAiHistoryError(
      error instanceof Error
        ? error.message
        : 'Không thể tải lịch sử feedback AI.'
    );
  } finally {
    setAiHistoryLoading(false);
  }
};
  const handleViewAIFeedback = async (practiceSessionId: number) => {
  setAiDetailLoadingId(practiceSessionId);

  try {
    const result: AIPracticeResult =
      await aiPracticeApi.instructorDetail(practiceSessionId);

    setSelectedAIResult(result);
  } catch (error) {
    console.error('Failed to load AI feedback:', error);

    if (onToast) {
      onToast(
        'Không thể xem feedback AI',
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra.',
        'error'
      );
    }
  } finally {
    setAiDetailLoadingId(null);
  }
};
const handleOpenGradingModal = async (sub: SpeakingSubmissionDto) => {
  setActiveSubmission(sub);
  const initialScore = sub.score ?? 85;
  setScoreInput(initialScore);
  setFeedbackInput(sub.feedback || '');

  void loadAIHistory(sub);

  // Load Rubric Criteria
  setIsLoadingRubric(true);
  let criteria: SpeakingRubricCriterionDto[] = [];
  if (sub.rubricCriteria && sub.rubricCriteria.length > 0) {
    criteria = sub.rubricCriteria;
  } else {
    try {
      if (sub.scriptId) {
        const res = await speakingApi.getScriptById(sub.scriptId);
        if (res.success && res.data?.rubricCriteria?.length) {
          criteria = res.data.rubricCriteria;
        }
      } else if (sub.lessonId) {
        const res = await speakingApi.getScriptByLesson(sub.lessonId);
        if (res.success && res.data?.rubricCriteria?.length) {
          criteria = res.data.rubricCriteria;
        }
      }
    } catch (err) {
      console.warn('Could not fetch script rubric criteria:', err);
    }
  }

  // Fallback 3 tiêu chí cốt lõi nếu bài tập chưa có rubric
  if (criteria.length === 0) {
    criteria = [
      { criterionId: 1, scriptId: sub.scriptId ?? 0, code: 'C01', name: 'Phát âm & thanh điệu', weightPercentage: 18, isMandatory: true, orderIndex: 1, updatedAt: '' },
      { criterionId: 2, scriptId: sub.scriptId ?? 0, code: 'C02', name: 'Độ rõ lời', weightPercentage: 10, isMandatory: true, orderIndex: 2, updatedAt: '' },
      { criterionId: 3, scriptId: sub.scriptId ?? 0, code: 'C03', name: 'Độ chính xác nội dung', weightPercentage: 7, isMandatory: true, orderIndex: 3, updatedAt: '' },
    ];
  }

  setActiveRubricCriteria(criteria);

  // Khởi tạo điểm cho từng tiêu chí bằng initialScore
  const initialCriterionScores: Record<string, number> = {};
  criteria.forEach((c) => {
    initialCriterionScores[c.code] = initialScore;
  });
  setCriterionScores(initialCriterionScores);
  setIsLoadingRubric(false);
};

// Cập nhật điểm cho một tiêu chí cụ thể và tự động tính tổng điểm theo trọng số
const handleCriterionScoreChange = (code: string, newScore: number) => {
  const clampedScore = Math.min(100, Math.max(0, newScore));
  const nextScores = { ...criterionScores, [code]: clampedScore };
  setCriterionScores(nextScores);

  if (activeRubricCriteria.length > 0) {
    const totalWeight = activeRubricCriteria.reduce((sum, c) => sum + (c.weightPercentage || 0), 0);
    let calculatedTotal = 0;

    if (totalWeight > 0) {
      if (Math.round(totalWeight) === 100) {
        // Chuẩn 100%: Điểm từng tiêu chí nhân với trọng số % rồi cộng lại
        calculatedTotal = activeRubricCriteria.reduce((sum, c) => {
          const s = nextScores[c.code] ?? 0;
          return sum + (s * (c.weightPercentage / 100));
        }, 0);
      } else {
        // Chuẩn hóa theo tỷ lệ nếu tổng trọng số khác 100%
        const weightedSum = activeRubricCriteria.reduce((sum, c) => {
          const s = nextScores[c.code] ?? 0;
          return sum + (s * c.weightPercentage);
        }, 0);
        calculatedTotal = weightedSum / totalWeight;
      }
    }

    setScoreInput(Math.round(calculatedTotal));
  }
};

// Khi giảng viên đổi trực tiếp điểm tổng (kéo slider tổng hoặc nhập ô điểm tổng)
const handleTotalScoreChange = (newTotalScore: number) => {
  const clamped = Math.min(100, Math.max(0, newTotalScore));
  setScoreInput(clamped);
  // Đồng bộ điểm của tất cả các tiêu chí về cùng mức này (đảm bảo > 0 nếu clamped > 0)
  setCriterionScores(() => {
    const next: Record<string, number> = {};
    activeRubricCriteria.forEach((c) => {
      next[c.code] = clamped;
    });
    return next;
  });
};

// Gán đồng đều điểm cho tất cả tiêu chí Rubric (dành cho các nút chọn nhanh 100đ, 85đ, 80đ)
const handleSetAllCriteriaScores = (val: number) => {
  handleTotalScoreChange(val);
};

// Nút chèn bảng Rubric vào Lời nhận xét
const handleAppendRubricToFeedback = () => {
  if (activeRubricCriteria.length === 0) return;
  const lines = activeRubricCriteria.map((c) => {
    const score = criterionScores[c.code] ?? (typeof scoreInput === 'number' ? scoreInput : 85);
    const contribution = ((score * c.weightPercentage) / 100).toFixed(1);
    const zeroFlag = score <= 0 ? ' [ĐIỂM LIỆT (0đ)]' : '';
    return `• [${c.code}] ${c.name} (${c.weightPercentage}%): ${score}/100 đ (Đóng góp: ${contribution} đ)${zeroFlag}`;
  });
  const isActualPassed = (typeof scoreInput === 'number' ? scoreInput : 0) >= 80 && !hasZeroCriterion;
  const statusSummary = isActualPassed
    ? 'ĐẠT'
    : hasZeroCriterion
    ? 'CHƯA ĐẠT (Có tiêu chí 0 điểm - Điểm liệt)'
    : 'CHƯA ĐẠT (Yêu cầu ≥ 80)';

  const rubricText = `\n\n[ĐÁNH GIÁ CHI TIẾT THEO TIÊU CHÍ RUBRIC]:\n${lines.join('\n')}\n=> TỔNG ĐIỂM: ${scoreInput}/100 (${currentScoreGradeInfo.tier} - ${statusSummary})`;
  
  setFeedbackInput((prev) => (prev.trim() ? `${prev.trim()}${rubricText}` : rubricText.trim()));
  if (onToast) onToast('Đã chèn Rubric', 'Đã thêm bảng điểm tiêu chí vào phần nhận xét.', 'info');
};

  // Handle submit grade
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    if (scoreInput === '' || Number(scoreInput) < 0 || Number(scoreInput) > 100) {
      if (onToast) onToast('Điểm số không hợp lệ', 'Điểm phải từ 0 đến 100.', 'error');
      return;
    }

    setIsSubmittingGrade(true);
    try {
      const criterionScoresPayload = activeRubricCriteria.map((c) => ({
        code: c.code,
        name: c.name,
        weightPercentage: c.weightPercentage,
        score: criterionScores[c.code] ?? Number(scoreInput),
      }));

      const res = await speakingApi.gradeSubmission(activeSubmission.submissionId, {
        score: Number(scoreInput),
        feedback: feedbackInput.trim() || undefined,
        criterionScores: criterionScoresPayload,
      });

      if (res.success && res.data) {
        const isPassedActual = res.data.isPassed ?? (Number(res.data.score) >= 80 && !hasZeroCriterion);
        const gradeInfo = getSpeakingGradeInfo(res.data.score);
        if (onToast) {
          onToast(
            'Chấm điểm thành công!',
            `Đã lưu kết quả cho ${res.data.learnerName}: ${res.data.score} điểm (${gradeInfo.tier} - ${isPassedActual ? 'Đạt' : 'Chưa đạt'}${hasZeroCriterion ? ' do có tiêu chí 0 điểm' : ''}).`,
            isPassedActual ? 'success' : 'warning'
          );
        }
        
        // Update local state
        setSubmissions((prev) =>
          prev.map((item) => (item.submissionId === res.data.submissionId ? res.data : item))
        );
        setActiveSubmission(null);
      } else {
        if (onToast) onToast('Thất bại', res.message || 'Không thể lưu điểm.', 'error');
      }
    } catch (err: any) {
      console.error('Error grading submission:', err);
      if (onToast) onToast('Lỗi hệ thống', err.message || 'Có lỗi xảy ra khi chấm điểm.', 'error');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Quick preset grade setter
  const setScorePreset = (val: number, defaultRemark: string) => {
    handleTotalScoreChange(val);
    if (!feedbackInput.trim()) {
      setFeedbackInput(defaultRemark);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 tracking-wider uppercase mb-1">
                <Mic2 className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>Instructor Portal</span>
                <span className="text-slate-500">•</span>
                <span>Chấm bài nói (Speaking)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Quản lý Bài nói Cuối khóa
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">
                  {stats.pending} Bài chờ chấm
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Nghe file thu âm trực tiếp (.mp3, .wav), đánh giá kỹ năng phát âm & lưu lời nhận xét chi tiết cho học viên.
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold border border-blue-400/30 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Bài tập nói mới</span>
              </button>

              <button
                onClick={() => loadSubmissions(true)}
                disabled={isRefreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* ── Quick Stats Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6">
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
              <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span>Tổng bài nộp</span>
                <FileAudio className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
            </div>

            <div className="bg-amber-500/10 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20">
              <div className="text-xs font-medium text-amber-300 flex items-center justify-between">
                <span>Chờ chấm</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
            </div>

            <div className="bg-emerald-500/10 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/20">
              <div className="text-xs font-medium text-emerald-300 flex items-center justify-between">
                <span>Đã đạt (≥ 80)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{stats.passed}</div>
            </div>

            <div className="bg-rose-500/10 backdrop-blur-md rounded-2xl p-4 border border-rose-500/20">
              <div className="text-xs font-medium text-rose-300 flex items-center justify-between">
                <span>Chưa đạt (&lt; 80)</span>
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">{stats.failed}</div>
            </div>

            <div className="bg-indigo-500/10 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/20">
              <div className="text-xs font-medium text-indigo-300 flex items-center justify-between">
                <span>Điểm trung bình</span>
                <Award className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-300 mt-1">{stats.avgScore} / 100</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ── Section 1: Created Speaking Assignments List ── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bài tập nói Tổng khóa học đã khởi tạo ({filteredAssignments.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Danh sách đề bài thu âm giọng nói tổng khóa mà bạn đã tạo cho các khóa học
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-blue-500/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Bài tập nói mới</span>
            </button>
          </div>

          {isLoadingAssignments ? (
            <div className="py-8 text-center text-xs font-semibold text-blue-600">
              Đang tải danh sách bài tập nói...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200">
              <Mic2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Chưa có Bài tập nói nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Bạn chưa khởi tạo Bài tập nói tổng khóa nào. Bấm nút "Tạo Bài tập nói mới" ở trên để khởi tạo bài tập thu âm cho học viên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.lessonId}
                  className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[11px] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-blue-600" />
                        {assignment.courseTitle}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assignment.durationMinutes} phút dự kiến
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{assignment.title}</h4>

                    {assignment.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setScriptModalAssignment(assignment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-all cursor-pointer border border-blue-200 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Kịch bản 3 Level</span>
                      </button>
                      <button
                      onClick={() => navigate(`/instructor/courses/${assignment.courseId}/lessons`)}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Quản lý trong Khóa học</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    </div>

                    <button
                      onClick={() => handleDeleteAssignment(assignment.lessonId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Xóa bài tập nói này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 2: Student Audio Submissions ── */}
        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          {/* Left: Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({submissions.length})
            </button>

            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ chấm ({stats.pending})</span>
            </button>

            <button
              onClick={() => setStatusFilter('PASSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'PASSED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đạt ≥ 80 ({stats.passed})</span>
            </button>

            <button
              onClick={() => setStatusFilter('FAILED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'FAILED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Chưa đạt &lt; 80 ({stats.failed})</span>
            </button>
          </div>

          {/* Right: Search & Course Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Course Filter Dropdown */}
            <div className="relative w-full sm:w-64">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">Tất cả khóa học</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.title}
                  </option>
                ))}
              </select>
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm tên học viên, bài học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Submissions Table / Cards List ── */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">Đang tải danh sách bài thu âm...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-rose-900">{error}</h3>
            <button
              onClick={() => loadSubmissions()}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Không tìm thấy bài nộp nào</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Chưa có học viên nào gửi bài thu âm nói phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Học viên</th>
                    <th className="py-4 px-4">Bài học / Khóa học</th>
                    <th className="py-4 px-4">File Ghi âm</th>
                    <th className="py-4 px-4">Trạng thái / Điểm</th>
                    <th className="py-4 px-4">Thời gian nộp</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSubmissions.map((sub) => {
                    const category = getSpeakingSubmissionCategory(sub);
                    const isGraded = category !== 'SUBMITTED';
                    const hasZeroCriterionInSub = sub.criterionScores?.some((c) => Number(c.score) <= 0) || sub.status === 'NEEDS_RESUBMISSION';
                    const isPassedActual = sub.isPassed !== undefined && sub.isPassed !== null
                      ? sub.isPassed
                      : (sub.status === 'GRADED' && (sub.score ?? 0) >= 80 && !hasZeroCriterionInSub);
                    const gradeInfo = isGraded && sub.score !== null && sub.score !== undefined
                      ? getSpeakingGradeInfo(sub.score, isPassedActual, hasZeroCriterionInSub)
                      : null;

                    return (
                      <tr key={sub.submissionId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Student Info */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
                              {sub.learnerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{sub.learnerName}</div>
                              <div className="text-slate-500 text-[11px] font-medium">{sub.learnerEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* Course & Lesson */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{sub.scriptTitle || sub.lessonTitle || 'Bài tập nói'}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getSpeakingScopeInfo(sub.scope).badgeClass}`}>
                              {getSpeakingScopeInfo(sub.scope).shortLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            <span>{sub.courseTitle}</span>
                            {sub.moduleTitle && <span>• Chương: {sub.moduleTitle}</span>}
                          </div>
                        </td>

                        {/* Audio Player Inline */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <audio
                              controls
                              preload="none"
                              src={sub.audioUrl}
                              className="h-8 max-w-[180px] rounded-md border border-slate-200"
                            />
                          </div>
                          {sub.note && (
                            <div className="text-[11px] italic text-slate-500 mt-1 truncate max-w-[200px]" title={sub.note}>
                              "{sub.note}"
                            </div>
                          )}
                        </td>

                        {/* Status & Score */}
                        <td className="py-4 px-4">
                          {isGraded && gradeInfo ? (
                            <div className="space-y-1">
                              <span
                                className={`px-2.5 py-1 rounded-full border font-black text-[11px] inline-flex items-center gap-1.5 shadow-2xs ${
                                  gradeInfo.isPassed
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                {gradeInfo.isPassed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>{sub.score} / 100</span>
                              </span>
                              <div
                                className={`text-[10px] font-extrabold flex items-center gap-1 ${
                                  gradeInfo.isPassed ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                <span>{gradeInfo.tier}</span>
                                <span>•</span>
                                <span>{gradeInfo.isPassed ? 'Đạt' : 'Chưa đạt (Cần ≥ 80)'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Chờ chấm
                            </span>
                          )}
                        </td>

                        {/* Submitted Date */}
                        <td className="py-4 px-4 text-slate-500 font-medium">
                          {new Date(sub.submittedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Action Button */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenGradingModal(sub)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm ${
                              isGraded
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isGraded ? 'Sửa điểm' : 'Chấm điểm'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Grading Modal Drawer (Rubric Enhanced) ── */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-blue-900/40">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-black shadow-inner">
                  <Award className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white leading-tight">Chấm điểm Bài nói Speaking</h3>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs ${getSpeakingScopeInfo(activeSubmission.scope).badgeClass}`}>
                      {getSpeakingScopeInfo(activeSubmission.scope).shortLabel}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                    {activeSubmission.scriptTitle || activeSubmission.lessonTitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubmission(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - 2 Columns Responsive Layout */}
            <form onSubmit={handleSaveGrade} className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#f8fafc]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── CỘT TRÁI (6 COLS): Học viên, Audio, Lịch sử AI, Nhận xét ── */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Student Details Card */}
                  <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {activeSubmission.learnerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{activeSubmission.learnerName}</div>
                        <div className="text-xs text-slate-500 font-medium">{activeSubmission.learnerEmail}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Nộp bài lúc</span>
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(activeSubmission.submittedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(activeSubmission.submittedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Audio Playback Player */}
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-blue-900/50">
                    <div className="text-xs font-bold text-blue-300 flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                        Bản thu âm của học viên
                      </span>
                      <span className="text-[11px] text-blue-200/80 font-mono bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/30">
                        .MP3 / .WAV
                      </span>
                    </div>

                    <audio controls src={activeSubmission.audioUrl} className="w-full h-10 rounded-lg mt-1" />

                    {activeSubmission.note && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-950/70 border border-blue-400/20 text-xs text-slate-200">
                        <span className="font-bold text-blue-300">Ghi chú của học viên: </span>
                        <span className="italic">"{activeSubmission.note}"</span>
                      </div>
                    )}
                  </div>

                  {/* AI Practice History */}
                  <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Lịch sử feedback AI
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Các lần luyện tập AI của học viên trong bài học này
                        </p>
                      </div>

                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 border border-indigo-200">
                        {aiHistory.length} lần
                      </span>
                    </div>

                    {aiHistoryLoading ? (
                      <div className="py-4 text-center text-xs text-indigo-600 font-medium">
                        Đang tải lịch sử feedback AI...
                      </div>
                    ) : aiHistoryError ? (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                        {aiHistoryError}
                      </div>
                    ) : aiHistory.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center text-xs text-slate-500">
                        Học viên chưa có lịch sử luyện tập AI trong bài học này.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {aiHistory.map((item, index) => (
                          <div
                            key={item.practiceSessionId}
                            className="rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-indigo-100 p-2.5 flex items-center justify-between gap-3 transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Lần luyện #{aiHistory.length - index}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={aiDetailLoadingId === item.practiceSessionId}
                              onClick={() => void handleViewAIFeedback(item.practiceSessionId)}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
                            >
                              {aiDetailLoadingId === item.practiceSessionId ? 'Đang tải...' : 'Xem feedback'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedAIResult && (
                      <div className="mt-3 rounded-xl bg-indigo-50/60 border border-indigo-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-bold text-slate-900">Chi tiết feedback AI</h5>
                          <button
                            type="button"
                            onClick={() => setSelectedAIResult(null)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono bg-white p-2.5 rounded-lg border border-indigo-100">
                          {JSON.stringify(selectedAIResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Feedback Textarea */}
                  <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        Lời nhận xét của Giảng viên
                      </label>
                      <button
                        type="button"
                        onClick={handleAppendRubricToFeedback}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title="Chèn bảng điểm Rubric vào ô nhận xét"
                      >
                        <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                        <span>Chèn bảng điểm Rubric</span>
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      placeholder="Ghi nhận xét chi tiết về phát âm, cột hơi, ngữ điệu, phong thái để giúp học viên tiến bộ..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all leading-relaxed"
                    />
                  </div>
                </div>

                {/* ── CỘT PHẢI (6 COLS): Bảng Rubric & Điểm số Thang 100 ── */}
                <div className="lg:col-span-6 space-y-4">
                  {/* BẢNG TIÊU CHÍ CHẤM ĐIỂM (RUBRIC CRITERIA) */}
                  <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
                    <div className="flex items-center justify-between border-b border-blue-50 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          <Sliders className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider">
                            Tiêu chí chấm điểm (Rubric)
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Chấm từng tiêu chí hoặc chọn nhanh điểm tổng
                          </span>
                        </div>
                      </div>

                      {/* Quick preset buttons for all criteria */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetAllCriteriaScores(100)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Gán tất cả tiêu chí 100 điểm"
                        >
                          100 đ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllCriteriaScores(85)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Gán tất cả tiêu chí 85 điểm"
                        >
                          85 đ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllCriteriaScores(80)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Gán tất cả tiêu chí 80 điểm (chuẩn đạt)"
                        >
                          80 đ
                        </button>
                      </div>
                    </div>

                    {isLoadingRubric ? (
                      <div className="py-6 text-center text-xs text-blue-600 font-medium">
                        Đang tải danh sách tiêu chí Rubric...
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                        {activeRubricCriteria.map((c) => {
                          const score = criterionScores[c.code] ?? (typeof scoreInput === 'number' ? scoreInput : 85);
                          const contribution = ((score * c.weightPercentage) / 100).toFixed(1);
                          const isMandatory = c.isMandatory || c.code === 'C01' || c.code === 'C02' || c.code === 'C03';
                          const isZeroScore = score <= 0;

                          return (
                            <div
                              key={c.code}
                              className={`rounded-xl border p-2.5 transition-colors ${
                                isZeroScore
                                  ? 'border-rose-300 bg-rose-50/50 shadow-xs ring-1 ring-rose-200'
                                  : 'border-blue-100 bg-blue-50/20 hover:bg-blue-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-black ${
                                    isZeroScore
                                      ? 'bg-rose-100 border-rose-200 text-rose-800'
                                      : 'bg-blue-100 border-blue-200 text-blue-800'
                                  }`}>
                                    {c.code}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 truncate" title={c.name}>
                                    {c.name}
                                  </span>
                                  {isZeroScore ? (
                                    <span className="rounded-full bg-rose-600 text-white px-2 py-0.2 text-[9px] font-black shrink-0 flex items-center gap-1 shadow-2xs animate-pulse">
                                      ⚠️ Điểm liệt (0đ)
                                    </span>
                                  ) : isMandatory ? (
                                    <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                                      Bắt buộc
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500">
                                    Trọng số: <span className="text-blue-700 font-extrabold">{c.weightPercentage}%</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">•</span>
                                  <span className={`text-[11px] font-black px-1.5 py-0.2 rounded-md border ${
                                    isZeroScore
                                      ? 'text-rose-700 bg-rose-50 border-rose-200'
                                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  }`}>
                                    +{contribution} đ
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={score}
                                  onChange={(e) => handleCriterionScoreChange(c.code, Number(e.target.value))}
                                  className={`flex-1 h-1.5 bg-slate-200 rounded-lg cursor-pointer ${
                                    isZeroScore ? 'accent-rose-600' : 'accent-blue-600'
                                  }`}
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={score}
                                    onChange={(e) => handleCriterionScoreChange(c.code, Number(e.target.value) || 0)}
                                    className={`w-12 px-1.5 py-0.5 text-center text-xs font-black rounded-lg focus:outline-none transition-all ${
                                      isZeroScore
                                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-700 font-extrabold'
                                        : 'bg-white border border-slate-200 text-slate-800 focus:border-blue-500'
                                    }`}
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">/100</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5 text-blue-600" />
                        Tổng điểm Rubric tính theo trọng số:
                      </span>
                      <span className="font-black text-blue-700 text-sm">
                        {scoreInput}/100 điểm
                      </span>
                    </div>
                  </div>

                  {/* KHỐI ĐIỂM SỐ TỔNG (THANG ĐIỂM 100) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        Điểm số tổng kết (Thang 100) <span className="text-rose-500">*</span>
                      </label>

                      {/* Real-time Dynamic Status Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all shadow-2xs ${
                            currentScoreGradeInfo.isPassed && !hasZeroCriterion
                              ? currentScoreGradeInfo.score >= 95
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                              : hasZeroCriterion && typeof scoreInput === 'number' && scoreInput >= 80
                              ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-300'
                              : currentScoreGradeInfo.score >= 50
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : currentScoreGradeInfo.score >= 30
                              ? 'bg-orange-100 text-orange-900 border-orange-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              currentScoreGradeInfo.isPassed && !hasZeroCriterion
                                ? currentScoreGradeInfo.dotColor
                                : 'bg-rose-500'
                            } animate-pulse`}
                          />
                          <span>
                            {currentScoreGradeInfo.isPassed && !hasZeroCriterion
                              ? `${currentScoreGradeInfo.tier} — Đạt`
                              : hasZeroCriterion && typeof scoreInput === 'number' && scoreInput >= 80
                              ? 'Chưa đạt (Có tiêu chí 0 điểm)'
                              : `${currentScoreGradeInfo.tier} — Chưa đạt (Yêu cầu ≥ 80)`}
                          </span>
                        </div>
                        {hasZeroCriterion && typeof scoreInput === 'number' && scoreInput >= 80 && (
                          <span className="text-[10px] font-bold text-rose-600 italic">
                            * Yêu cầu tất cả tiêu chí phải lớn hơn 0 điểm để Đạt
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={scoreInput}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value)));
                          if (typeof val === 'number') handleTotalScoreChange(val);
                          else setScoreInput('');
                        }}
                        className={`w-24 px-3 py-2 text-2xl font-black text-center bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                          currentScoreGradeInfo.isPassed && !hasZeroCriterion
                            ? 'border-emerald-400 text-emerald-700'
                            : 'border-rose-400 text-rose-700 bg-rose-50/20'
                        }`}
                      />

                      {/* Range Slider with 80-mark threshold indicator */}
                      <div className="flex-1 relative py-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={scoreInput === '' ? 0 : scoreInput}
                          onChange={(e) => handleTotalScoreChange(Number(e.target.value))}
                          className="w-full accent-blue-600 h-2.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                          <span>0 (Yếu)</span>
                          <span>30 (TB)</span>
                          <span>50 (Cần cải thiện)</span>
                          <span className="text-blue-600 font-black">| 80 (Đạt)</span>
                          <span className="text-emerald-600 font-black">95+ (Xuất sắc)</span>
                        </div>
                      </div>
                    </div>

                    {/* Score Presets: 5 tiers separated into Pass vs Not-Pass */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-500">Chọn nhanh mức điểm chuẩn:</span>
                        <span className="font-semibold text-slate-400 italic">Mức tối thiểu để Đạt: 80 điểm</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Nhóm Đạt (>= 80) */}
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-emerald-50/70 border border-emerald-200">
                          <span className="text-[10px] font-extrabold text-emerald-700 uppercase px-1">ĐẠT:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(95, 'Phát âm chuẩn xác, ngữ điệu tự nhiên, phong thái tự tin và làm chủ sân khấu rất tốt!')
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              scoreInput === 95
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            ✓ 95 (Xuất sắc)
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(85, 'Phát âm tốt, bài nói lưu loát, đạt yêu cầu hoàn thành bài học. Cần chú ý thêm một vài trọng âm.')
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              scoreInput === 85 && !hasZeroCriterion
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            ✓ 85 (Giỏi)
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(80, 'Bài nói đạt chuẩn đầu ra (80 điểm), ngữ điệu ổn định, phát âm rõ ràng.')
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              scoreInput === 80 && !hasZeroCriterion
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            ✓ 80 (Đạt chuẩn)
                          </button>
                        </div>

                        {/* Nhóm Chưa đạt (< 80) */}
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-rose-50/70 border border-rose-200">
                          <span className="text-[10px] font-extrabold text-rose-700 uppercase px-1">CHƯA ĐẠT:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(65, 'Đã hoàn thành bài nói nhưng ngữ điệu và phát âm còn hạn chế, chưa đạt mức 80 để hoàn thành bài học. Cần luyện tập và thu âm lại.')
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              scoreInput === 65
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            ✕ 65 (Cần cải thiện)
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(40, 'Bài nói còn ngập ngừng nhiều, phát âm và ngắt câu chưa đúng nhịp. Cần nghe kỹ bài mẫu và nộp lại.')
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              scoreInput === 40
                                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-100'
                            }`}
                          >
                            ✕ 40 (TB)
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScorePreset(20, 'Chưa đạt yêu cầu tối thiểu của bài nói. Cần học kỹ lại phần phát âm và luyện tập theo kịch bản trước khi ghi âm nộp lại.')
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              scoreInput === 20
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            ✕ 20 (Yếu)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="mt-6 pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingGrade ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu kết quả...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu kết quả & Đánh giá</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Speaking Assignment Modal Drawer ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-800 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-black">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Tạo Bài tập nói (Speaking Assignment)</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Tạo đề bài luyện nói / bài thu âm cuối khóa cho học viên</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAssignment} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Select Course */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Khóa học <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={createCourseId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateCourseId(val === '' ? '' : Number(val));
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="">-- Chọn khóa học để tạo bài tập nói tổng khóa --</option>
                    {courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.title} ({c.status === 'PUBLISHED' ? 'Đã xuất bản' : c.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : 'Bản nháp'})
                      </option>
                    ))}
                  </select>
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Title & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Tên Bài tập nói <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bài tập nói Cuối khóa - Lời dẫn Đám Cưới"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Thời lượng (Phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={createDuration}
                    onChange={(e) => setCreateDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-center text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Description / De bai */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Mô tả & Yêu cầu Đề bài thu âm
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập hướng dẫn chi tiết cho học viên: Yêu cầu đọc bài dẫn, thời lượng tối đa, tiêu chí chấm điểm..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAssignment || !createCourseId}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreatingAssignment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác nhận Tạo Bài tập</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Speaking Script Upload & 3-Level Management Modal */}
      {scriptModalAssignment && (
        <SpeakingScriptUploadModal
          isOpen={Boolean(scriptModalAssignment)}
          onClose={() => setScriptModalAssignment(null)}
          lessonId={scriptModalAssignment.lessonId}
          lessonTitle={scriptModalAssignment.title}
          courseTitle={scriptModalAssignment.courseTitle}
          onSuccess={() => {
            if (onToast) onToast('Kịch bản đã được lưu!', 'Học viên đã có thể luyện nói theo 3 cấp độ.', 'success');
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
};