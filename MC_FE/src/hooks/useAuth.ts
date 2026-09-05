import { useAuthStore } from '../store/useAuthStore';
import { User } from '../types';

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  logout: () => void;
}

/**
 * Abstraction Hook for Auth State.
 * Decouples UI components from Zustand or Redux implementation details.
 * If migrating to Redux Toolkit in the future, only update this hook to call `useAppSelector` & `useAppDispatch`.
 */
export const useAuth = (): UseAuthReturn => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    updateUser,
    logout,
  };
};
