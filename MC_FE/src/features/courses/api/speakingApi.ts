import { request } from '../../../services/api';

export interface SpeakingSubmissionDto {
  submissionId: number;
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  courseSlug?: string;
  moduleId?: number;
  moduleTitle?: string;
  learnerId: number;
  learnerName: string;
  learnerEmail: string;
  instructorId: number;
  instructorName: string;
  audioUrl: string;
  note?: string;
  status: 'SUBMITTED' | 'GRADED' | 'NEEDS_RESUBMISSION';
  score?: number;
  feedback?: string;
  gradedById?: number;
  gradedByName?: string;
  gradedAt?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface GradeSpeakingSubmissionRequest {
  score: number;
  feedback?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export const speakingApi = {
  /**
   * GET /api/speaking-submissions/instructor
   * Instructor retrieves all speaking submissions for courses they teach
   */
  async getInstructorSubmissions(): Promise<ApiResponse<SpeakingSubmissionDto[]>> {
    return request('/speaking-submissions/instructor', {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-submissions/course/{courseId}
   * Instructor retrieves speaking submissions for a specific course
   */
  async getCourseSubmissions(courseId: number): Promise<ApiResponse<SpeakingSubmissionDto[]>> {
    return request(`/speaking-submissions/course/${courseId}`, {
      method: 'GET',
    });
  },

  /**
   * PUT /api/speaking-submissions/{submissionId}/grade
   * Instructor grades a student speaking submission
   */
  async gradeSubmission(
    submissionId: number,
    data: GradeSpeakingSubmissionRequest
  ): Promise<ApiResponse<SpeakingSubmissionDto>> {
    return request(`/speaking-submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/speaking-submissions
   * Learner submits a speaking assignment audio file (.mp3 / .wav)
   */
  async submitSpeakingAssignment(formData: FormData): Promise<ApiResponse<SpeakingSubmissionDto>> {
    return request('/speaking-submissions', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * GET /api/speaking-submissions/lesson/{lessonId}
   * Get latest submission of current learner for a specific lesson
   */
  async getLatestSubmissionByLesson(lessonId: number): Promise<ApiResponse<SpeakingSubmissionDto>> {
    return request(`/speaking-submissions/lesson/${lessonId}`, {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-submissions/my-submissions
   * Get all submissions submitted by current learner
   */
  async getMySubmissions(): Promise<ApiResponse<SpeakingSubmissionDto[]>> {
    return request('/speaking-submissions/my-submissions', {
      method: 'GET',
    });
  },
};
