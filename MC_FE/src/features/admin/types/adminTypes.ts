export type AdminTabType = 'overview' | 'users' | 'courses' | 'categories' | 'financials' | 'settings' | 'forum';

export type UserRole = 'student' | 'instructor' | 'admin';

export type UserStatus = 'active' | 'locked' | 'pending';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  joinedDate: string;
  coursesEnrolled?: number;
  coursesCreated?: number;
  totalSpent?: number;
  earnings?: number;
  lastActive?: string;
}

export type CourseModerationStatus = 'published' | 'pending' | 'rejected' | 'draft';

export interface AdminCourse {
  id: string;
  title: string;
  instructorName: string;
  instructorEmail: string;
  category: string;
  price: number;
  status: CourseModerationStatus;
  rating: number;
  studentsCount: number;
  submittedDate: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedByName?: string;
  submissionNote?: string;
  featured?: boolean;
  rejectReason?: string;
  sectionsCount?: number;
  lecturesCount?: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  coursesCount: number;
  description: string;
  status: 'active' | 'inactive';
}

export interface AdminStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalUsers: number;
  usersGrowth: number;
  activeStudents: number;
  totalInstructors: number;
  totalCourses: number;
  coursesGrowth: number;
  pendingCourseApprovals: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  enrollments: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  amount: number;
  requestedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  commissionRatePercent: number;
  payoutMinimum: number;
  allowNewRegistrations: boolean;
  requireCourseApproval: boolean;
}

export const defaultPlatformSettings: PlatformSettings = {
  siteName: 'MSEEK Academy',
  supportEmail: 'support@mseek.edu.vn',
  maintenanceMode: false,
  commissionRatePercent: 15,
  payoutMinimum: 1000000,
  allowNewRegistrations: true,
  requireCourseApproval: true,
};

export const emptyAdminStats: AdminStats = {
  totalRevenue: 0,
  revenueGrowth: 0,
  totalUsers: 0,
  usersGrowth: 0,
  activeStudents: 0,
  totalInstructors: 0,
  totalCourses: 0,
  coursesGrowth: 0,
  pendingCourseApprovals: 0,
  pendingPayoutsCount: 0,
  pendingPayoutsAmount: 0,
};
