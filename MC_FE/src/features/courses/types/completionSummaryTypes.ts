export interface CourseCompletionSummary {
  isUnlocked: boolean;
  currentProgress: number;
  message: string;
  overview?: CourseCompletionOverview | null;
  beforeAfterComparison?: BeforeAfterComparison | null;
  growthMetrics?: GrowthMetrics | null;
  feedbackTimeline?: FeedbackTimelineItem[];
}

export interface CourseCompletionOverview {
  courseId: number;
  courseTitle: string;
  completedAt?: string | null;
  finalScore: number;
  certificateId?: number | null;
  certificateUrl?: string | null;
  remedialCount: number;
  passedRemedialCount: number;
  journeySummaryText: string;
}

export interface BeforeAfterComparison {
  initialSubmission?: SubmissionComparisonItem | null;
  finalSubmission?: SubmissionComparisonItem | null;
}

export interface SubmissionComparisonItem {
  submissionId: number;
  assignmentTitle: string;
  scope: string;
  submittedAt: string;
  audioUrl: string;
  score: number;
  instructorFeedback: string;
}

export interface GrowthMetrics {
  scoreTimeline: ScoreTimelineItem[];
  rubricBreakdown: RubricBreakdownItem[];
}

export interface ScoreTimelineItem {
  submissionId: number;
  title: string;
  scope: string;
  isRemedial: boolean;
  score: number;
  submittedAt: string;
}

export interface RubricBreakdownItem {
  criterionName: string;
  initialScore: number;
  finalScore: number;
  maxScore: number;
  improvementDelta: number;
}

export interface FeedbackTimelineItem {
  submissionId: number;
  assignmentTitle: string;
  isRemedial: boolean;
  score?: number | null;
  instructorFeedback: string;
  gradedAt?: string | null;
}
