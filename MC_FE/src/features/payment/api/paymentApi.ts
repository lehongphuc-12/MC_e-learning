import { request } from '../../../services/api';

import type {
  ApiResponse,
  EnrollmentDto,
  CreatePaymentResponseDto,
  PaymentDetailsDto,
  VerifyPaymentResultDto,
  PagedResult,
  PaymentFilterRequest,
} from '../types/paymentTypes';

export const paymentApi = {
  // ============================================================
  // ENROLLMENT
  // ============================================================

  async enrollCourse(
    courseId: number
  ): Promise<ApiResponse<EnrollmentDto>> {
    return await request<ApiResponse<EnrollmentDto>>(
      `/v1/enrollments/courses/${courseId}`,
      {
        method: 'POST',
      }
    );
  },

  async getMyEnrollments(): Promise<
    ApiResponse<EnrollmentDto[]>
  > {
    return await request<ApiResponse<EnrollmentDto[]>>(
      '/v1/enrollments/me'
    );
  },

  async cancelPendingEnrollment(
    enrollmentId: number
  ): Promise<ApiResponse<boolean>> {
    return await request<ApiResponse<boolean>>(
      `/v1/enrollments/${enrollmentId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ============================================================
  // PAYMENT - LEARNER
  // ============================================================

  async createPayment(
    enrollmentId: number
  ): Promise<
    ApiResponse<CreatePaymentResponseDto>
  > {
    return await request<
      ApiResponse<CreatePaymentResponseDto>
    >('/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        enrollmentId,
      }),
    });
  },

  async getMyPayment(
    paymentId: number
  ): Promise<
    ApiResponse<PaymentDetailsDto>
  > {
    return await request<
      ApiResponse<PaymentDetailsDto>
    >(
      `/v1/payments/${paymentId}`
    );
  },

  // ============================================================
  // ADMIN - AD07 LIST
  // ============================================================

  async searchPaymentsAdmin(
    filter: PaymentFilterRequest = {}
  ): Promise<
    ApiResponse<PagedResult<PaymentDetailsDto>>
  > {
    const params =
      new URLSearchParams();

    params.append(
      'Page',
      String(filter.page ?? 1)
    );

    params.append(
      'PageSize',
      String(filter.pageSize ?? 20)
    );

    if (filter.status?.trim()) {
      params.append(
        'Status',
        filter.status.trim()
      );
    }

    if (filter.keyword?.trim()) {
      params.append(
        'Keyword',
        filter.keyword.trim()
      );
    }

    if (filter.fromDate) {
      params.append(
        'FromDate',
        filter.fromDate
      );
    }

    if (filter.toDate) {
      params.append(
        'ToDate',
        filter.toDate
      );
    }

    if (
      filter.minAmount !== undefined &&
      filter.minAmount !== null
    ) {
      params.append(
        'MinAmount',
        String(filter.minAmount)
      );
    }

    if (
      filter.maxAmount !== undefined &&
      filter.maxAmount !== null
    ) {
      params.append(
        'MaxAmount',
        String(filter.maxAmount)
      );
    }

    const query =
      params.toString();

    return await request<
      ApiResponse<PagedResult<PaymentDetailsDto>>
    >(
      `/v1/admin/payments${
        query ? `?${query}` : ''
      }`
    );
  },

  // ============================================================
  // ADMIN - AD07 DETAIL
  // ============================================================

  async getPaymentAdmin(
    paymentId: number
  ): Promise<
    ApiResponse<PaymentDetailsDto>
  > {
    return await request<
      ApiResponse<PaymentDetailsDto>
    >(
      `/v1/admin/payments/${paymentId}`
    );
  },

  // ============================================================
  // ADMIN - AD06 VERIFY
  // ============================================================

  async verifyPaymentAdmin(
    paymentId: number
  ): Promise<
    ApiResponse<VerifyPaymentResultDto>
  > {
    return await request<
      ApiResponse<VerifyPaymentResultDto>
    >(
      `/v1/admin/payments/${paymentId}/verify`,
      {
        method: 'POST',
      }
    );
  },
};