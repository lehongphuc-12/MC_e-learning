export interface FeedbackItem { category: string; explanation: string; evidence?: string | null; }
export interface PracticeExercise { title: string; instruction: string; example: string; }
export interface AIPracticeResult {
  practiceSessionId: number; practiceFeedbackId: number; practiceMode: string;
  courseId: number | null; lessonId: number | null; modelVersion: string;
  checkpointEpoch: number; predictions: Record<string, number>;
  overallAssessment: string; summary: string; strengths: FeedbackItem[];
  issues: FeedbackItem[]; recommendations: string[];
  practicePlan: PracticeExercise[]; encouragement: string; createdAt: string;
}
export interface AIPracticeHistoryItem {
  practiceSessionId: number; practiceMode: string; courseId: number | null;
  lessonId: number | null; status: string; createdAt: string;
}