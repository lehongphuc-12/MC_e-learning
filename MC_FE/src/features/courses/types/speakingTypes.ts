export type SpeakingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type SpeakingScriptStatus = 'DRAFT' | 'PUBLISHED';

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
  levels: SaveLevelDto[];
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
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  title: string;
  originalContent?: string;
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
