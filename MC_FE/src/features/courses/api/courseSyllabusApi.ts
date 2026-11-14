import { request, requestBlob } from '../../../services/api';

export interface SyllabusVersion {
  syllabusVersionId: number;
  courseId: number;
  versionNumber: number;
  originalFileName: string;
  contentType: string;
  fileExtension: string;
  fileSizeBytes: number;
  reviewStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  isCurrent: boolean;
  uploadedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: number | null;
  reviewNote?: string | null;
}

export interface SyllabusOutline {
  courseId: number;
  description: string;
  modules: Array<{
    moduleId: number;
    title: string;
    orderIndex: number;
    totalDurationMinutes: number;
    lessons: Array<{ lessonId: number; title: string; durationMinutes: number; isPreview: boolean }>;
  }>;
  fullSyllabusFileName?: string | null;
  fullSyllabusVersionId?: number | null;
  fullSyllabusContentType?: string | null;
  hasFullSyllabus: boolean;
}

interface Envelope<T> { success: boolean; data: T; message?: string }

const root = (courseId: number) => `/courses/${courseId}/syllabus`;

export const courseSyllabusApi = {
  getCurrent: async (courseId: number) =>
    (await request<Envelope<SyllabusVersion>>(`${root(courseId)}/current`)).data,

  getSubmitted: async (courseId: number) =>
    (await request<Envelope<SyllabusVersion>>(`${root(courseId)}/submitted`)).data,

  getOutline: async (courseId: number) =>
    (await request<Envelope<SyllabusOutline>>(`${root(courseId)}/public-outline`)).data,

  getContent: (courseId: number, versionId: number) =>
    requestBlob(`${root(courseId)}/versions/${versionId}/content`),

  getPreview: (courseId: number, versionId: number) =>
    requestBlob(`${root(courseId)}/versions/${versionId}/preview`),

  upload: async (courseId: number, file: File) => {
    const sessionResponse = await request<Envelope<{ sessionId: string; uploadUrl: string; contentType: string }>>(
      `${root(courseId)}/upload-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
      },
    );
    const session = sessionResponse.data;
    const uploaded = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': session.contentType },
      body: file,
    });
    if (!uploaded.ok) throw new Error(`Tải syllabus lên R2 thất bại (HTTP ${uploaded.status}).`);
    const completed = await request<Envelope<SyllabusVersion>>(
      `${root(courseId)}/upload-sessions/${session.sessionId}/complete`,
      { method: 'POST' },
    );
    return completed.data;
  },

  deleteDraft: async (courseId: number, versionId: number) =>
    request<Envelope<string>>(`${root(courseId)}/versions/${versionId}`, { method: 'DELETE' }),
};
