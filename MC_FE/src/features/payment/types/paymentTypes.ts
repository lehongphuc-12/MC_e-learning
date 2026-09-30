export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface EnrollmentDto {
  enrollmentId: number;
  learnerId: number;
  courseId: number;
  paymentId?: number | null;
  status:
    | 'ACTIVE'
    | 'PENDING_PAYMENT'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REVOKED'
    | 'REFUNDED';
  completionPercentage: number;
  enrolledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface CreatePaymentResponseDto {
  paymentId: number;
  enrollmentId: number;
  enrollmentIds: number[];
  courseIds: number[];
  amount: number;
  currency: string;
  status: string;
  paymentUrl: string;
  expiresAt: string;
}

export interface PaymentItemDto {
  paymentItemId: number;
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  courseThumbnailUrl: string;
  courseDescription: string;
  enrollmentStatus: string;
  amount: number;
}

export interface PaymentTransactionDto {
  transactionId: number;
  provider: string;
  providerTransactionNo?: string | null;
  responseCode?: string | null;
  transactionStatus?: string | null;
  bankCode?: string | null;
  amount: number;
  status: string;
  signatureValid: boolean;
  processedAt: string;
}

export interface PaymentDetailsDto {
  paymentId: number;
  learnerId: number;
  learnerName: string;
  learnerEmail: string;

  courseId: number;
  courseTitle: string;
  courseThumbnailUrl: string;
  courseDescription: string;

  enrollmentId: number;
  enrollmentStatus: string;

  items: PaymentItemDto[];

  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  merchantTxnRef: string;

  createdAt: string;
  updatedAt: string;

  latestTransaction?: PaymentTransactionDto | null;
}

export interface PayOsQueryResultDto {
  requestSucceeded: boolean;
  orderCode: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  status: string;
  paymentLinkId?: string | null;
  reference?: string | null;
  cancellationReason?: string | null;
  message: string;
}

export interface VerifyPaymentResultDto {
  valid: boolean;
  isSuccess: boolean;
  message: string;
  transactionStatus?: string | null;
  issues: string[];
  payment?: PaymentDetailsDto | null;
  payOs?: PayOsQueryResultDto | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface PaymentFilterRequest {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}