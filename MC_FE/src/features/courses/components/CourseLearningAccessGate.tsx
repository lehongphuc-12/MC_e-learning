import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpenCheck, CircleAlert, LockKeyhole } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../../types';
import { courseApi } from '../api/courseApi';
import { paymentApi } from '../../payment/api/paymentApi';

interface CourseLearningAccessGateProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * Prevents the learning page (and its lesson, module, quiz and material queries)
 * from mounting until the current account is entitled to the requested course.
 * The backend repeats this check; this component is only the user-facing gate.
 */
export const CourseLearningAccessGate: React.FC<CourseLearningAccessGateProps> = ({ user, children }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);

  const enrollmentsQuery = useQuery({
    queryKey: ['learning-access', 'enrollments', user?.id],
    queryFn: async () => (await paymentApi.getMyEnrollments()).data ?? [],
    enabled: !!user && user.role === 'student' && Number.isInteger(courseId) && courseId > 0,
    staleTime: 0,
  });

  const instructorCourseQuery = useQuery({
    queryKey: ['learning-access', 'instructor-course', courseId],
    queryFn: () => courseApi.getCourseById(courseId),
    enabled: !!user && user.role === 'instructor' && Number.isInteger(courseId) && courseId > 0,
    staleTime: 30_000,
  });

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return (
      <AccessDialog
        icon={<CircleAlert className="h-6 w-6" />}
        title="Không tìm thấy khóa học"
        description="Đường dẫn khóa học không hợp lệ. Hãy quay lại danh mục khóa học để chọn nội dung."
        primaryLabel="Về danh mục khóa học"
        onPrimary={() => navigate('/courses', { replace: true })}
      />
    );
  }

  if (user?.role === 'admin') return <>{children}</>;

  if (user?.role === 'instructor') {
    if (instructorCourseQuery.isPending) return <AccessLoading />;
    if (instructorCourseQuery.data && String(instructorCourseQuery.data.instructorId) === String(user.id)) {
      return <>{children}</>;
    }

    return (
      <AccessDialog
        icon={<CircleAlert className="h-6 w-6" />}
        title="Bạn không có quyền quản lý khóa học này"
        description="Chỉ giảng viên sở hữu khóa học mới có thể mở khu vực học tập này."
        primaryLabel="Về quản lý khóa học"
        onPrimary={() => navigate('/instructor/courses', { replace: true })}
        secondaryLabel="Quay lại"
        onSecondary={() => navigate(-1)}
      />
    );
  }

  if (user?.role !== 'student') {
    return (
      <AccessDialog
        icon={<CircleAlert className="h-6 w-6" />}
        title="Không thể mở khóa học"
        description="Tài khoản hiện tại không được cấp quyền truy cập khu vực học tập."
        primaryLabel="Về danh mục khóa học"
        onPrimary={() => navigate('/courses', { replace: true })}
      />
    );
  }

  if (enrollmentsQuery.isPending || enrollmentsQuery.isFetching) return <AccessLoading />;

  if (enrollmentsQuery.isError) {
    return (
      <AccessDialog
        icon={<CircleAlert className="h-6 w-6" />}
        title="Chưa xác minh được quyền học"
        description="Hệ thống chưa xác nhận được trạng thái ghi danh. Hãy thử lại trước khi mở nội dung khóa học."
        primaryLabel="Thử lại"
        onPrimary={() => void enrollmentsQuery.refetch()}
        secondaryLabel="Về danh mục khóa học"
        onSecondary={() => navigate('/courses', { replace: true })}
      />
    );
  }

  const now = Date.now();
  const hasValidEnrollment = enrollmentsQuery.data?.some((enrollment) => {
    const status = String(enrollment.status).toUpperCase();
    const notExpired = !enrollment.expiresAt || Date.parse(enrollment.expiresAt) > now;
    return Number(enrollment.courseId) === courseId &&
      (status === 'ACTIVE' || status === 'COMPLETED') && notExpired;
  });

  if (!hasValidEnrollment) {
    return (
      <AccessDialog
        icon={<LockKeyhole className="h-6 w-6" />}
        title="Bạn cần ghi danh để học khóa học này"
        description="Nội dung bài học chỉ mở sau khi ghi danh và thanh toán được xác nhận. Hãy quay lại danh mục để xem thông tin và mua khóa học."
        primaryLabel="Xem khóa học để mua"
        onPrimary={() => navigate('/courses', { replace: true })}
        secondaryLabel="Quay lại"
        onSecondary={() => navigate(-1)}
      />
    );
  }

  return <>{children}</>;
};

const AccessLoading: React.FC = () => (
  <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-700" aria-live="polite">
    <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm">
      Đang xác minh quyền truy cập khóa học…
    </p>
  </main>
);

interface AccessDialogProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const AccessDialog: React.FC<AccessDialogProps> = ({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}) => (
  <main className="grid min-h-screen place-items-center bg-slate-950/5 px-5 py-10">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-access-title"
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/10"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h1 id="course-access-title" className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onPrimary}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          <BookOpenCheck className="h-4 w-4" />
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {secondaryLabel}
          </button>
        )}
      </div>
    </section>
  </main>
);
