
import { request } from '../../../services/api';

export type QuizUploadMediaType = 'AUDIO' | 'VIDEO' | 'IMAGE';

export interface QuizUploadResult {
  mediaUrl: string;
  mediaType: QuizUploadMediaType;
  publicId: string;
}

export async function uploadQuizMedia(file: File, mediaType: QuizUploadMediaType): Promise<QuizUploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('mediaType', mediaType);
  return request<QuizUploadResult>('/quizzes/media/upload', {
    method: 'POST',
    body: form
  });
}
