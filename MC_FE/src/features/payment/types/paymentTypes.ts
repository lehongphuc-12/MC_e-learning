export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// ============================================================
// ENROLLMENT
// ============================================================

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

// ============================================================
// CREATE PAYMENT
// ============================================================

export interface CreatePaymentResponseDto {
  paymentId: number;
  enrollmentId: number;
  amount: number;
  currency: string;
  status: string;
  paymentUrl: string;
  expiresAt: string;
}

// ============================================================
// TRANSACTION
// ============================================================

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

// ============================================================
// PAYMENT DETAIL
// ============================================================

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

  amount: number;
  currency: string;
  paymentMethod: string;

  paymentStatus: string;

  merchantTxnRef: string;

  vnPayTransactionNo?: string | null;
  vnPayResponseCode?: string | null;
  vnPayTransactionStatus?: string | null;

  createdAt: string;
  updatedAt: string;

  latestTransaction?:
    | PaymentTransactionDto
    | null;
}

// ============================================================
// VNPAY QUERY
// ============================================================

export interface VnPayQueryResultDto {
  requestSucceeded: boolean;

  responseCode?: string | null;

  message?: string | null;

  transactionStatus?: string | null;

  transactionNo?: string | null;

  bankCode?: string | null;

  amount?: number | null;

  rawResponse?: string | null;
}

// ============================================================
// VERIFY
// ============================================================

export interface VerifyPaymentResultDto {
  valid: boolean;

  isSuccess: boolean;

  message: string;

  transactionStatus?: string | null;

  issues: string[];

  payment?: PaymentDetailsDto | null;

  vnPay?: VnPayQueryResultDto | null;
}

// ============================================================
// PAGING
// ============================================================

export interface PagedResult<T> {
  items: T[];

  totalCount: number;
  totalItems: number;

  totalPages: number;

  page: number;
  pageSize: number;
}

// ============================================================
// FILTER
// ============================================================

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