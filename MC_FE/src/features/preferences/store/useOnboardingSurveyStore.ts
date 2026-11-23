import { create } from 'zustand';

interface OnboardingSurveyStore {
  isOpen: boolean;
  openSurvey: () => void;
  closeSurvey: () => void;
  toggleSurvey: () => void;
}

export const useOnboardingSurveyStore = create<OnboardingSurveyStore>((set) => ({
  isOpen: false,
  openSurvey: () => set({ isOpen: true }),
  closeSurvey: () => set({ isOpen: false }),
  toggleSurvey: () => set((state) => ({ isOpen: !state.isOpen })),
}));
