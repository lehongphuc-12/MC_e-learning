import {
  AdminStats,
  AdminUser,
  AdminCourse,
  AdminCategory,
  RevenueDataPoint,
  PayoutRequest,
  SystemLog,
  PlatformSettings,
} from '../types/adminTypes';

export const initialAdminStats: AdminStats = {
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

export const mockRevenueChartData: RevenueDataPoint[] = [];

export const initialAdminUsers: AdminUser[] = [];

export const initialAdminCourses: AdminCourse[] = [];

export const initialAdminCategories: AdminCategory[] = [];

export const initialPayoutRequests: PayoutRequest[] = [
  {
    id: 'po-101',
    instructorId: 'u-2',
    instructorName: 'Nguyễn Văn Minh',
    instructorEmail: 'minh.nguyen@mseek.edu.vn',
    amount: 14500000,
    requestedDate: '2026-09-09',
    status: 'pending',
    bankName: 'Vietcombank',
    accountNumber: '9982736412',
    accountName: 'NGUYEN VAN MINH',
  },
  {
    id: 'po-102',
    instructorId: 'u-3',
    instructorName: 'Trần Thị Thu Hà',
    instructorEmail: 'thu.ha@mseek.edu.vn',
    amount: 8900000,
    requestedDate: '2026-09-10',
    status: 'pending',
    bankName: 'Techcombank',
    accountNumber: '19038472615019',
    accountName: 'TRAN THI THU HA',
  },
  {
    id: 'po-100',
    instructorId: 'u-6',
    instructorName: 'Đặng Tuấn Kiệt',
    instructorEmail: 'kiet.dang@instructor.com',
    amount: 9100000,
    requestedDate: '2026-09-01',
    status: 'approved',
    bankName: 'MB Bank',
    accountNumber: '0987654321',
    accountName: 'DANG TUAN KIET',
  },
];

export const initialSystemLogs: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-11 14:30:12',
    action: 'Duyệt khóa học',
    performedBy: 'Phúc Lê (Admin)',
    details: 'Đã chấp nhận xuất bản khóa học: Lập Trình Web ReactJS',
    type: 'success',
  },
  {
    id: 'log-2',
    timestamp: '2026-09-11 11:15:40',
    action: 'Khóa tài khoản',
    performedBy: 'Phúc Lê (Admin)',
    details: 'Đã tạm khóa tài khoản: bich.pham@gmail.com vì vi phạm quy định',
    type: 'warning',
  },
  {
    id: 'log-3',
    timestamp: '2026-09-10 16:45:00',
    action: 'Duyệt Payout',
    performedBy: 'Phúc Lê (Admin)',
    details: 'Đã phê duyệt lệnh thanh toán 9,100,000 VND cho Đặng Tuấn Kiệt',
    type: 'info',
  },
  {
    id: 'log-4',
    timestamp: '2026-09-09 09:20:00',
    action: 'Cập nhật cấu hình',
    performedBy: 'Phúc Lê (Admin)',
    details: 'Thay đổi tỷ lệ hoa hồng nền tảng thành 15%',
    type: 'info',
  },
];

export const defaultPlatformSettings: PlatformSettings = {
  siteName: 'MSEEK Academy',
  supportEmail: 'support@mseek.edu.vn',
  maintenanceMode: false,
  commissionRatePercent: 15,
  payoutMinimum: 1000000,
  allowNewRegistrations: true,
  requireCourseApproval: true,
};
