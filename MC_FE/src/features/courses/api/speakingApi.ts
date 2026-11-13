import { request } from '../../../services/api';
import {
  SpeakingLevel,
  SpeakingScope,
  ParsePreviewDto,
  SaveScriptRequest,
  CreateSpeakingScriptRequest,
  UpdateSpeakingScriptRequest,
  SpeakingScriptDto,
  SpeakingScriptLevelDto,
  UpdateLevelContentRequest,
  BackgroundMusicDto,
  PreUploadMusicResultDto,
} from '../types/speakingTypes';

export interface SpeakingSubmissionDto {
  submissionId: number;
  scriptId?: number | null;
  scriptTitle?: string;
  scope?: SpeakingScope | string;
  lessonId?: number | null;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  courseSlug?: string;
  moduleId?: number | null;
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
  isPassed?: boolean;
  gradeTier?: string;
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

export interface GetSpeakingScriptsParams {
  courseId?: number;
  scope?: SpeakingScope;
  moduleId?: number;
  lessonId?: number;
  search?: string;
}

export const speakingApi = {
  /**
   * GET /api/speaking-scripts
   * Filter speaking scripts by course, scope, module, lesson, and search keyword
   */
  async getSpeakingScripts(params?: GetSpeakingScriptsParams): Promise<ApiResponse<SpeakingScriptDto[]>> {
    const query = new URLSearchParams();
    if (params?.courseId) query.append('courseId', params.courseId.toString());
    if (params?.scope) query.append('scope', params.scope);
    if (params?.moduleId) query.append('moduleId', params.moduleId.toString());
    if (params?.lessonId) query.append('lessonId', params.lessonId.toString());
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/speaking-scripts?${queryString}` : '/speaking-scripts';
    return request(endpoint, {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-scripts/{id}
   */
  async getSpeakingScriptById(scriptId: number): Promise<ApiResponse<SpeakingScriptDto>> {
    return request(`/speaking-scripts/${scriptId}`, {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-scripts/course/{courseId}
   */
  async getSpeakingScriptsByCourse(courseId: number): Promise<ApiResponse<SpeakingScriptDto[]>> {
    return request(`/speaking-scripts/course/${courseId}`, {
      method: 'GET',
    });
  },

  /**
   * POST /api/speaking-scripts
   */
  async createSpeakingScript(data: CreateSpeakingScriptRequest): Promise<ApiResponse<SpeakingScriptDto>> {
    return request('/speaking-scripts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/speaking-scripts/{id}
   */
  async updateSpeakingScript(scriptId: number, data: UpdateSpeakingScriptRequest): Promise<ApiResponse<SpeakingScriptDto>> {
    return request(`/speaking-scripts/${scriptId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/speaking-scripts/{id}
   */
  async deleteSpeakingScript(scriptId: number): Promise<ApiResponse<boolean>> {
    return request(`/speaking-scripts/${scriptId}`, {
      method: 'DELETE',
    });
  },

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
   * GET /api/speaking-submissions/script/{scriptId}
   * Get latest submission of current learner for a specific script
   */
  async getLatestSubmissionByScript(scriptId: number): Promise<ApiResponse<SpeakingSubmissionDto>> {
    return request(`/speaking-submissions/script/${scriptId}`, {
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

  /**
   * POST /api/speaking-scripts/parse-file
   * Parse document (.docx, .txt, .md) directly without requiring an existing lessonId
   */
  async parseScriptFileDirect(file: File): Promise<ApiResponse<ParsePreviewDto>> {
    const formData = new FormData();
    formData.append('File', file);
    return request('/speaking-scripts/parse-file', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * POST /api/speaking-scripts/lessons/{lessonId}/parse
   * Instructor uploads document (.docx, .txt, .md) to parse in-memory into 3 levels
   */
  async parseScriptFile(lessonId: number, file: File): Promise<ApiResponse<ParsePreviewDto>> {
    const formData = new FormData();
    formData.append('File', file);
    return request(`/speaking-scripts/lessons/${lessonId}/parse`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * POST /api/speaking-scripts/lessons/{lessonId}/publish
   * Instructor saves and publishes 3-level script
   */
  async publishScript(lessonId: number, data: SaveScriptRequest): Promise<ApiResponse<SpeakingScriptDto>> {
    return request(`/speaking-scripts/lessons/${lessonId}/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * GET /api/speaking-scripts/lessons/{lessonId}
   * Get speaking script with all 3 levels
   */
  async getScriptByLesson(lessonId: number): Promise<ApiResponse<SpeakingScriptDto>> {
    return request(`/speaking-scripts/lessons/${lessonId}`, {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-scripts/lessons/{lessonId}/level/{level}
   * Get specific level script content
   */
  async getLevelContent(lessonId: number, level: SpeakingLevel): Promise<ApiResponse<SpeakingScriptLevelDto>> {
    return request(`/speaking-scripts/lessons/${lessonId}/level/${level}`, {
      method: 'GET',
    });
  },

  /**
   * PUT /api/speaking-scripts/{scriptId}/levels/{level}
   * Update content of a single level
   */
  async updateLevelContent(
    scriptId: number,
    level: SpeakingLevel,
    data: UpdateLevelContentRequest
  ): Promise<ApiResponse<SpeakingScriptDto>> {
    return request(`/speaking-scripts/${scriptId}/levels/${level}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/speaking-scripts/lessons/{lessonId}
   * Instructor deletes a speaking script
   */
  async deleteScript(lessonId: number): Promise<ApiResponse<boolean>> {
    return request(`/speaking-scripts/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  /**
   * GET /api/speaking-scripts/musics/defaults
   * Get 4 system default background musics
   */
  async getDefaultMusics(): Promise<ApiResponse<BackgroundMusicDto[]>> {
    return request('/speaking-scripts/musics/defaults', {
      method: 'GET',
    });
  },

  /**
   * GET /api/speaking-scripts/lessons/{lessonId}/musics
   * Get all available musics for a lesson (system defaults + custom uploads)
   */
  async getMusicsForLesson(lessonId: number): Promise<ApiResponse<BackgroundMusicDto[]>> {
    return request(`/speaking-scripts/lessons/${lessonId}/musics`, {
      method: 'GET',
    });
  },

  /**
   * POST /api/speaking-scripts/lessons/{lessonId}/musics/upload
   * Instructor uploads custom background music for a lesson
   */
  async uploadMusicForLesson(
    lessonId: number,
    file: File,
    title: string
  ): Promise<ApiResponse<BackgroundMusicDto>> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('Title', title);
    return request(`/speaking-scripts/lessons/${lessonId}/musics/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * DELETE /api/speaking-scripts/musics/{musicId}
   * Instructor deletes a custom background music
   */
  async deleteMusic(musicId: number): Promise<ApiResponse<boolean>> {
    return request(`/speaking-scripts/musics/${musicId}`, {
      method: 'DELETE',
    });
  },

  /**
   * POST /api/speaking-scripts/musics/pre-upload
   * Pre-upload custom background music to Cloudinary in background
   */
  async preUploadMusic(file: File, title: string): Promise<ApiResponse<PreUploadMusicResultDto>> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('Title', title);
    return request('/speaking-scripts/musics/pre-upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * POST /api/speaking-scripts/lessons/{lessonId}/musics/link
   * Link pre-uploaded background musics to a lesson
   */
  async linkMusicsToLesson(
    lessonId: number,
    musics: Array<{ title: string; audioUrl: string; cloudinaryPublicId?: string }>
  ): Promise<ApiResponse<BackgroundMusicDto[]>> {
    return request(`/speaking-scripts/lessons/${lessonId}/musics/link`, {
      method: 'POST',
      body: JSON.stringify({ musics }),
    });
  },
};
