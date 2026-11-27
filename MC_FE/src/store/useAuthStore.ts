import { create } from "zustand";
import {
  createJSONStorage,
  persist,
} from "zustand/middleware";
import { User } from "../types";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionRevision: number;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionRevision: 0,

      setAuth: (user: User, token: string) => {
        set((state) => ({
          user,
          token,
          isAuthenticated: true,
          sessionRevision: state.sessionRevision + 1,
        }));
      },

      setAccessToken: (token: string) => {
        set((state) => ({
          token,
          isAuthenticated: !!state.user && !!token,
        }));
      },

      updateUser: (updatedUser: Partial<User>) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...updatedUser,
              }
            : null,
        }));
      },

      logout: () => {
        set((state) => ({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionRevision: state.sessionRevision + 1,
        }));
      },
    }),
    {
      name: "mc-auth-storage",
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
