import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import { AUTH_QUERY_KEYS } from '../../auth/hooks/useAuthQueries';

export const PROFILE_QUERY_KEYS = {
  profile: ['profile'] as const,
};

export const useProfileQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.profile,
    queryFn: () => profileApi.getProfile(),
    enabled: enabled && !!localStorage.getItem('token'),
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData: Parameters<typeof profileApi.updateProfile>[0]) =>
      profileApi.updateProfile(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
};

export const useUpdateAvatarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof profileApi.updateAvatar>[0]) =>
      profileApi.updateAvatar(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword, confirmPassword }: { oldPassword: string | null; newPassword: string; confirmPassword: string }) =>
      profileApi.changePassword(oldPassword, newPassword, confirmPassword),
  });
};
