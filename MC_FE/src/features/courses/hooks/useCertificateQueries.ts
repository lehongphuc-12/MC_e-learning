import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificateApi } from '../api/certificateApi';

export const certificateQueryKeys = {
  myCertificates: ['my-certificates'] as const,
  courseCertificate: (courseId: number) => ['course-certificate', courseId] as const,
  certificateDetail: (certificateId: number) => ['certificate-detail', certificateId] as const,
  verifyCertificate: (code: string) => ['verify-certificate', code] as const,
};

export function useMyCertificates() {
  return useQuery({
    queryKey: certificateQueryKeys.myCertificates,
    queryFn: () => certificateApi.getMyCertificates(),
  });
}

export function useCourseCertificate(courseId: number) {
  return useQuery({
    queryKey: certificateQueryKeys.courseCertificate(courseId),
    queryFn: () => certificateApi.getCertificateByCourse(courseId),
    enabled: courseId > 0,
  });
}

export function useCertificateDetail(certificateId: number) {
  return useQuery({
    queryKey: certificateQueryKeys.certificateDetail(certificateId),
    queryFn: () => certificateApi.getCertificateById(certificateId),
    enabled: certificateId > 0,
  });
}

export function useIssueCertificate(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => certificateApi.issueCertificate(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateQueryKeys.myCertificates });
      queryClient.invalidateQueries({ queryKey: certificateQueryKeys.courseCertificate(courseId) });
    },
  });
}

export function useVerifyCertificate(code: string) {
  return useQuery({
    queryKey: certificateQueryKeys.verifyCertificate(code),
    queryFn: () => certificateApi.verifyCertificate(code),
    enabled: Boolean(code && code.trim().length > 0),
  });
}
