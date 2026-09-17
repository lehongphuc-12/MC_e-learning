import { request } from '../../../services/api';
import type { Certificate, CertificateVerification } from '../types/learningTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const certificateApi = {
  async getMyCertificates(): Promise<Certificate[]> {
    try {
      const response = await request<ApiEnvelope<Certificate[]>>('/certificates/my-certificates');
      return response.data;
    } catch (err) {
      console.warn('Backend getMyCertificates error:', err);
      return [];
    }
  },

  async getCertificateByCourse(courseId: number): Promise<Certificate | null> {
    try {
      const response = await request<ApiEnvelope<Certificate>>(`/certificates/course/${courseId}`);
      return response.data;
    } catch (err) {
      console.warn(`Backend getCertificateByCourse error for course ${courseId}:`, err);
      return null;
    }
  },

  async getCertificateById(certificateId: number): Promise<Certificate | null> {
    try {
      const response = await request<ApiEnvelope<Certificate>>(`/certificates/${certificateId}`);
      return response.data;
    } catch (err) {
      console.warn(`Backend getCertificateById error for id ${certificateId}:`, err);
      return null;
    }
  },

  async issueCertificate(courseId: number): Promise<Certificate> {
    const response = await request<ApiEnvelope<Certificate>>(`/certificates/issue/${courseId}`, {
      method: 'POST',
    });
    return response.data;
  },

  async verifyCertificate(code: string): Promise<CertificateVerification | null> {
    try {
      const response = await request<ApiEnvelope<CertificateVerification>>(`/certificates/verify/${encodeURIComponent(code)}`);
      return response.data;
    } catch (err) {
      console.warn(`Backend verifyCertificate error for code ${code}:`, err);
      return null;
    }
  },
};
