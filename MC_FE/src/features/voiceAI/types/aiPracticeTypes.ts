export interface FeedbackItem { category: string; explanation: string; evidence?: string | null; }
export interface PracticeExercise { title: string; instruction: string; example: string; }
export type CriterionStatus = 'PASSED' | 'FAILED' | 'NOT_EVALUATED' | string;
export interface PracticeCriterionResult {
  code: string;
  name: string;
  status: CriterionStatus;
  evidenceAvailable: boolean;
}
export interface SpeechClarityResult {
  model_version?: string;
  score?: number;
  raw_score?: number;
  deployment_mode?: string;
  automatic_pass_fail?: boolean;
  sample_rate?: number;
  duration_seconds?: number;
}
export interface AIPracticeResult {
  practiceSessionId: number; practiceFeedbackId: number; practiceMode: string;
  courseId: number | null; lessonId: number | null; modelVersion: string;
  checkpointEpoch: number; predictions: Record<string, number>;
  clarity?: SpeechClarityResult | null;
  transcript?: string | null;
  pronunciationAvailable?: boolean;
  criteria?: PracticeCriterionResult[];
  passedCriteriaCount?: number;
  evaluatedCriteriaCount?: number;
  totalCriteriaCount?: number;
  overallAssessment: string; summary: string; strengths: FeedbackItem[];
  issues: FeedbackItem[]; recommendations: string[];
  practicePlan: PracticeExercise[]; encouragement: string; createdAt: string;
}
export interface AIPracticeHistoryItem {
  practiceSessionId: number; practiceMode: string; courseId: number | null;
  lessonId: number | null; status: string; createdAt: string;
}