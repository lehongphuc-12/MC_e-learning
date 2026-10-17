
import { request } from '../../../services/api';

export interface ImportParams { courseId: number; lessonId: number; title: string }
export interface ImportProblem { sheet: string; row: string; message: string }
export interface ImportQuestion { questionText?: string; questionType?: string | number; points?: number; isRequired?: boolean; instruction?: string; explanation?: string; choices?: { choiceText?: string; isCorrect?: boolean; optionValue?: string }[]; media?: unknown[]; errorRegions?: unknown[]; annotations?: unknown[]; arrangeItems?: unknown[]; writingConfig?: unknown; scenarioNodes?: unknown[] }
export interface ImportPreview { quiz?: { title?: string; courseId?: number; lessonId?: number | null; questions?: ImportQuestion[] } | null; errors: ImportProblem[]; questionCount: number; canImport: boolean; previewToken: string | null }
export interface ImportResult { success: boolean; quiz?: { quizId?: number; QuizId?: number }; sheetsSync?: 'success' | 'blocked' | 'failed' | 'source-google-sheets'; rowsWritten?: number | null; message?: string }
const query = (p: ImportParams, token?: string) => {
  const params = new URLSearchParams({ courseId: String(p.courseId), lessonId: String(p.lessonId), title: p.title.trim() });
  if (token) params.set('previewToken', token);
  return params.toString();
};
const form = (file: File, p: ImportParams, token?: string) => {
  const data = new FormData();
  data.append('file', file); data.append('courseId', String(p.courseId)); data.append('lessonId', String(p.lessonId)); data.append('title', p.title.trim());
  if (token) data.append('previewToken', token);
  return data;
};
export const quizImportApi = {
  previewExcel: (file: File, p: ImportParams) => request<ImportPreview>('/quizzes/import/excel/preview', { method: 'POST', body: form(file, p) }),
  confirmExcel: (file: File, p: ImportParams, token: string) => request<ImportResult>('/quizzes/import/excel/confirm', { method: 'POST', body: form(file, p, token) }),
  previewGoogle: (p: ImportParams) => request<ImportPreview>(`/quizzes/import/google/preview?${query(p)}`),
  confirmGoogle: (p: ImportParams, token: string) => request<ImportResult>(`/quizzes/import/google/confirm?${query(p, token)}`, { method: 'POST' }),
  exportGoogle: (quizId: number) => request<ImportResult>(`/quizzes/import/google/export/${quizId}`, { method: 'POST' }),
};
