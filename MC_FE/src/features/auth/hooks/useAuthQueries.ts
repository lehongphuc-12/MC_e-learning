import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';

export const AUTH_QUERY_KEYS = {
  me: ['auth', 'me'] as const,
};

export const useUserQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: () => authApi.getMe(),
    enabled: enabled && !!localStorage.getItem('token'),
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
};

export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
};

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: ({ fullName, email, password }: { fullName: string; email: string; password: string }) =>
      authApi.register(fullName, email, password),
  });
};

export const useGoogleLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idToken: string) => authApi.googleLogin(idToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
};

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: ({ token, email, newPassword }: { token: string; email: string; newPassword: string }) =>
      authApi.resetPassword(token, email, newPassword),
  });
};
