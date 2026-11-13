export type SpeakingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type SpeakingScriptStatus = 'DRAFT' | 'PUBLISHED';

export type SpeakingScope = 'LESSON' | 'CHAPTER' | 'FINAL';

export interface LevelPreviewDto {
  level: SpeakingLevel;
  content: string;
  cleanScriptForScoring?: string;
}

export interface ParsePreviewDto {
  success: boolean;
  errors: string[];
  originalContent: string;
  levels: LevelPreviewDto[];
}

export interface SaveLevelDto {
  level: SpeakingLevel;
  content: string;
  cleanScriptForScoring?: string;
}

export interface SaveScriptRequest {
  title: string;
  originalContent?: string;
  scope?: SpeakingScope;
  moduleId?: number;
  courseId?: number;
  passingScore?: number;
  levels: SaveLevelDto[];
}

export interface CreateSpeakingScriptRequest {
  courseId: number;
  scope: SpeakingScope;
  moduleId?: number | null;
  lessonId?: number | null;
  title: string;
  originalContent?: string;
  passingScore?: number;
  levels: SaveLevelDto[];
}

export interface UpdateSpeakingScriptRequest {
  courseId?: number;
  scope?: SpeakingScope;
  moduleId?: number | null;
  lessonId?: number | null;
  title?: string;
  originalContent?: string;
  passingScore?: number;
  levels?: SaveLevelDto[];
}

export interface UpdateLevelContentRequest {
  content: string;
  cleanScriptForScoring?: string;
}

export interface SpeakingScriptLevelDto {
  levelId: number;
  scriptId: number;
  level: SpeakingLevel;
  content: string;
  cleanScriptForScoring?: string;
  updatedAt: string;
}

export interface SpeakingScriptDto {
  scriptId: number;
  courseId: number;
  courseTitle: string;
  scope: SpeakingScope;
  moduleId?: number | null;
  moduleTitle?: string | null;
  lessonId?: number | null;
  lessonTitle?: string | null;
  title: string;
  originalContent?: string;
  passingScore?: number;
  createdBy?: number;
  createdByName?: string;
  status: SpeakingScriptStatus;
  updatedAt: string;
  levels: SpeakingScriptLevelDto[];
}

export interface BackgroundMusicDto {
  musicId: number;
  title: string;
  audioUrl: string;
  isSystemDefault: boolean;
  lessonId?: number | null;
}

export interface PreUploadMusicResultDto {
  title: string;
  audioUrl: string;
  cloudinaryPublicId: string;
}

export type SpeakingGradeTier = 'Xuất sắc' | 'Giỏi' | 'Cần cải thiện' | 'Trung bình' | 'Yếu';

export interface SpeakingGradeInfo {
  score: number;
  tier: SpeakingGradeTier;
  isPassed: boolean;
  statusLabel: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  bannerBg: string;
  bannerBorder: string;
  scoreText: string;
  defaultFeedback: string;
}

export function getSpeakingGradeInfo(score: number | null | undefined): SpeakingGradeInfo {
  const s = Math.round(Number(score ?? 0));
  if (s >= 95) {
    return {
      score: s,
      tier: 'Xuất sắc',
      isPassed: true,
      statusLabel: 'Xuất sắc - Đạt',
      badgeLabel: 'ĐẠT • XUẤT SẮC',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-300',
      dotColor: 'bg-emerald-500',
      bannerBg: 'bg-emerald-50/70',
      bannerBorder: 'border-emerald-200',
      scoreText: 'text-emerald-700',
      defaultFeedback: 'Phát âm chuẩn xác, ngữ điệu tự nhiên, phong thái tự tin và làm chủ sân khấu rất tốt!',
    };
  }
  if (s >= 80) {
    return {
      score: s,
      tier: 'Giỏi',
      isPassed: true,
      statusLabel: 'Giỏi - Đạt',
      badgeLabel: 'ĐẠT • GIỎI',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-300',
      dotColor: 'bg-blue-500',
      bannerBg: 'bg-blue-50/70',
      bannerBorder: 'border-blue-200',
      scoreText: 'text-blue-700',
      defaultFeedback: 'Phát âm tốt, bài nói lưu loát, đạt yêu cầu hoàn thành bài học. Cần chú ý thêm một vài trọng âm và ngữ điệu tự nhiên hơn.',
    };
  }
  if (s >= 50) {
    return {
      score: s,
      tier: 'Cần cải thiện',
      isPassed: false,
      statusLabel: 'Cần cải thiện - Chưa đạt (Yêu cầu ≥ 80)',
      badgeLabel: 'CHƯA ĐẠT • CẦN CẢI THIỆN',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      dotColor: 'bg-amber-500',
      bannerBg: 'bg-amber-50/70',
      bannerBorder: 'border-amber-200',
      scoreText: 'text-amber-700',
      defaultFeedback: 'Đã hoàn thành bài nói nhưng ngữ điệu và phát âm còn hạn chế, chưa đạt mức 80 để hoàn thành bài học. Cần luyện tập và thu âm lại.',
    };
  }
  if (s >= 30) {
    return {
      score: s,
      tier: 'Trung bình',
      isPassed: false,
      statusLabel: 'Trung bình - Chưa đạt (Yêu cầu ≥ 80)',
      badgeLabel: 'CHƯA ĐẠT • TRUNG BÌNH',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800',
      badgeBorder: 'border-orange-300',
      dotColor: 'bg-orange-500',
      bannerBg: 'bg-orange-50/70',
      bannerBorder: 'border-orange-200',
      scoreText: 'text-orange-700',
      defaultFeedback: 'Bài nói còn ngập ngừng nhiều, phát âm và ngắt câu chưa đúng nhịp. Cần nghe kỹ bài mẫu và nộp lại.',
    };
  }
  return {
    score: s,
    tier: 'Yếu',
    isPassed: false,
    statusLabel: 'Yếu - Chưa đạt (Yêu cầu ≥ 80)',
    badgeLabel: 'CHƯA ĐẠT • YẾU',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    dotColor: 'bg-rose-500',
    bannerBg: 'bg-rose-50/70',
    bannerBorder: 'border-rose-200',
    scoreText: 'text-rose-700',
    defaultFeedback: 'Chưa đạt yêu cầu tối thiểu của bài nói. Cần học kỹ lại phần phát âm và luyện tập theo kịch bản trước khi ghi âm nộp lại.',
  };
}

export type SpeakingSubmissionCategory = 'SUBMITTED' | 'PASSED' | 'FAILED';

export function getSpeakingSubmissionCategory(submission: {
  status?: string;
  score?: number | null;
}): SpeakingSubmissionCategory {
  if (submission.score === null || submission.score === undefined || submission.status === 'SUBMITTED') {
    return 'SUBMITTED';
  }
  return Number(submission.score) >= 80 ? 'PASSED' : 'FAILED';
}

export interface SpeakingScopeInfo {
  scope: SpeakingScope;
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
}

export function getSpeakingScopeInfo(scope?: string | null): SpeakingScopeInfo {
  const s = (scope || 'FINAL').toUpperCase();
  if (s === 'LESSON') {
    return {
      scope: 'LESSON',
      label: 'Bài học hằng ngày',
      shortLabel: 'Bài học',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    };
  }
  if (s === 'CHAPTER') {
    return {
      scope: 'CHAPTER',
      label: 'Bài tập theo chương',
      shortLabel: 'Theo chương',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    scope: 'FINAL',
    label: 'Bài thi nói tổng cuối khóa',
    shortLabel: 'Tổng cuối khóa',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  };
}
