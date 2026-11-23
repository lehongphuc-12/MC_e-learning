export interface UserPreferenceDto {
  id: number;
  userId: number;
  targetCategories: string[];
  experienceLevel: string | null;
  focusSkills: string[];
  isCompleted: boolean;
  updatedAt: string;
}

export interface SaveUserPreferenceRequest {
  targetCategories: string[];
  experienceLevel: string;
  focusSkills: string[];
}
