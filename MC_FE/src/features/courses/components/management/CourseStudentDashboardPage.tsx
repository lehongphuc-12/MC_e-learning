import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, BookOpen, CheckCircle2, Clock3, LoaderCircle, Search, Users } from 'lucide-react';
import { useCourseDetail } from '../../hooks/useInstructorCourses';
import { useCourseStudentInsights } from '../../../payment/hooks/useCourseStudents';
import type { CourseStudentInsightDto, StudentAssessmentInsightDto } from '../../../payment/types/paymentTypes';
import { UserPlus } from 'lucide-react';
import { AssignRemedialContentModal } from './AssignRemedialContentModal';
import { remedialAssignmentApi, type RemedialAssignmentDto } from '../../api/remedialAssignmentApi';

const riskMeta = {
  SAFE: { label: 'Đúng tiến độ', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  WARNING: { label: 'Cần hỗ trợ', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  DANGER: { label: 'Có nguy cơ', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  INSUFFICIENT_DATA: { label: 'Chưa đủ dữ liệu', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
} as const;

type ProgressStatus = 'SAFE' | 'WARNING' | 'DANGER';

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'rgb(34, 197, 94)';
  if (percentage >= 60) return 'rgb(234, 179, 8)';
  return 'rgb(239, 68, 68)';
};

const assessmentMeta: Record<StudentAssessmentInsightDto['status'], { label: string; classes: string }> = {
  PASSED: { label: 'Đạt', classes: 'text-emerald-700 bg-emerald-50' },
  PENDING_GRADE: { label: 'Chờ chấm', classes: 'text-violet-700 bg-violet-50' },
  OVERDUE: { label: 'Quá hạn', classes: 'text-rose-700 bg-rose-50' },
  NEEDS_REMEDIATION: { label: 'Chưa đạt', classes: 'text-amber-800 bg-amber-50' },
  IN_PROGRESS: { label: 'Đang làm', classes: 'text-blue-700 bg-blue-50' },
  NOT_STARTED: { label: 'Chưa làm', classes: 'text-slate-600 bg-slate-100' },
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa đặt hạn';

export const CourseStudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStudentId = Number(searchParams.get('studentId'));
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | ProgressStatus>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<CourseStudentInsightDto | null>(null);
  const [remedialAssignments, setRemedialAssignments] = useState<RemedialAssignmentDto[]>([]);
  const { data: courseResponse, isLoading: courseLoading } = useCourseDetail(courseId);
  const { data: students = [], isLoading, isError, refetch } = useCourseStudentInsights(courseId);

  const filtered = useMemo(() => students.filter(student => {
    const matchesSearch = `${student.fullName} ${student.email}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (filter === 'ALL' || student.riskStatus === filter);
  }), [students, search, filter]);
  React.useEffect(() => {
    if (Number.isSafeInteger(requestedStudentId) && requestedStudentId > 0 && students.some(s => s.userId === requestedStudentId)) {
      setSelectedStudentId(requestedStudentId);
    }
  }, [requestedStudentId, students]);
  const selected = students.find(student => student.userId === selectedStudentId) ?? null;
  React.useEffect(() => {
    if (!selected) { setRemedialAssignments([]); return; }
    remedialAssignmentApi.getForInstructor(courseId).then(r => setRemedialAssignments((r.data ?? []).filter(x => x.studentId === selected.userId))).catch(() => setRemedialAssignments([]));
  }, [courseId, selected?.userId]);
  const counts = {
    total: students.length,
    danger: students.filter(student => student.riskStatus === 'DANGER').length,
    warning: students.filter(student => student.riskStatus === 'WARNING').length,
    safe: students.filter(student => student.riskStatus === 'SAFE').length,
  };

  return (
    <div className="min-h-full bg-[#f4f7fc] px-4 py-6 sm:px-7 lg:px-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate(`/instructor/courses/${courseId}/lessons`)} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">
              <ArrowLeft size={16} /> Quay lại quản lý khóa học
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Theo dõi lớp học</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Học viên khóa học</h1>
            <p className="mt-1 text-sm text-slate-500">{courseLoading ? 'Đang tải khóa học…' : courseResponse?.title ?? 'Theo dõi tiến độ và từng bài đánh giá'}</p>
          </div>
          <button onClick={() => refetch()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Làm mới dữ liệu</button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Học viên đang học" value={counts.total} icon={<Users size={18} />} color="blue" />
          <Summary label="Đúng tiến độ" value={counts.safe} icon={<CheckCircle2 size={18} />} color="green" />
          <Summary label="Cần hỗ trợ" value={counts.warning} icon={<Clock3 size={18} />} color="amber" />
          <Summary label="Có nguy cơ" value={counts.danger} icon={<AlertCircle size={18} />} color="rose" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <label className="relative block w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </label>
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
              <option value="ALL">Tất cả trạng thái</option><option value="DANGER">Có nguy cơ</option><option value="WARNING">Cần hỗ trợ</option><option value="SAFE">Đúng tiến độ</option>
            </select>
          </div>

          {isLoading ? <div className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Đang tải tiến độ học viên…</div>
            : isError ? <div className="p-12 text-center text-sm text-rose-700">Không thể tải dữ liệu. Hãy thử làm mới.</div>
              : filtered.length === 0 ? <div className="p-14 text-center text-sm text-slate-500">{students.length ? 'Không tìm thấy học viên phù hợp.' : 'Khóa học chưa có học viên đang hoạt động.'}</div>
                : <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Học viên</th><th className="px-4 py-3">Tiến độ</th><th className="px-4 py-3">Bài đạt</th><th className="px-4 py-3">Quá hạn / Chưa đạt</th><th className="px-4 py-3">Hoạt động gần nhất</th><th className="px-5 py-3">Đánh giá</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{filtered.map(student => {
                      const pct = Math.min(100, Math.max(0, Number(student.completionPercentage) || 0));
                      const progressStatus = student.riskStatus === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : student.riskStatus;
                      const risk = riskMeta[progressStatus];
                      const progressColor = getProgressColor(pct);
                      return <tr key={student.enrollmentId} onClick={() => setSelectedStudentId(student.userId)} className="cursor-pointer hover:bg-blue-50/50">
                        <td className="px-5 py-4"><div className="flex items-center gap-3">{student.avatarUrl ? <img src={student.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{student.fullName.slice(0, 1).toUpperCase()}</div>}<div><div className="font-bold text-slate-900">{student.fullName}</div><div className="text-xs text-slate-500">{student.email}</div></div></div></td>
                        <td className="px-4 py-4"><div className="w-36"><div className="mb-1 text-xs font-semibold" style={{ color: progressColor }}>{pct.toFixed(1)}%</div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-[width,background-color] duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: progressColor }} /></div></div></td>
                        <td className="px-4 py-4 font-semibold text-slate-700">{student.passedAssessmentCount} / {student.assessmentCount}</td>
                        <td className="px-4 py-4"><span className="text-rose-700">{student.overdueAssessmentCount} quá hạn</span><span className="mx-1 text-slate-300">·</span><span className="text-amber-700">{student.failedAssessmentCount} chưa đạt</span></td>
                        <td className="px-4 py-4 text-xs text-slate-500">{student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleString('vi-VN') : 'Chưa có hoạt động'}</td>
                        <td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${risk.classes}`}>{risk.label}</span></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span>Đánh giá dựa trên hạn nộp và kết quả gần nhất của Quiz/Speaking; chi tiết lý do có trong hồ sơ từng học viên.</span><span>{filtered.length} học viên</span></div>
        </section>
      </div>

      {selected && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40" onMouseDown={e => e.target === e.currentTarget && setSelectedStudentId(null)}>
        <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hồ sơ tiến độ</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{selected.fullName}</h2><p className="text-sm text-slate-500">{selected.email}</p></div><button onClick={() => setSelectedStudentId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Đóng</button></div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">Tiến độ khóa học</span><span className="font-bold" style={{ color: getProgressColor(Math.min(100, Math.max(0, Number(selected.completionPercentage) || 0))) }}>{Number(selected.completionPercentage).toFixed(1)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full transition-[width,background-color] duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, Number(selected.completionPercentage) || 0))}%`, backgroundColor: getProgressColor(Math.min(100, Math.max(0, Number(selected.completionPercentage) || 0))) }} /></div><div className="mt-3 text-xs text-slate-500">Ghi danh ngày {formatDate(selected.enrolledAt)}</div></div>
          <h3 className="mb-3 mt-7 flex items-center gap-2 font-bold text-slate-900"><BookOpen size={17} className="text-blue-600" /> Bài đánh giá chính thức</h3>
          {selected.assessments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Khóa học chưa có bài đánh giá để theo dõi.</p> : <div className="space-y-3">{selected.assessments.map(item => { const meta = assessmentMeta[item.status]; return <article key={`${item.assessmentType}-${item.assessmentId}`} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><span className="mr-2 rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{item.assessmentType === 'QUIZ' ? 'Quiz' : 'Speaking'}</span><span className="font-semibold text-slate-800">{item.title}</span></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.classes}`}>{meta.label}</span></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>Điểm gần nhất: <b className="text-slate-700">{item.latestScore == null ? '—' : `${item.latestScore}/100`}</b></span><span>Lượt nộp: <b className="text-slate-700">{item.attemptCount}{item.maxAttempts && item.maxAttempts > 0 ? `/${item.maxAttempts}` : ''}</b></span>{item.attemptLimitReached && <span className="font-bold text-rose-700">Đã hết lượt</span>}<span>Hạn: <b className="text-slate-700">{formatDate(item.dueAt)}</b></span></div></article>; })}</div>}
          {selected.riskReasons.length > 0 && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-900">Tình hình bài đánh giá</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{selected.riskReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
          <section className="mt-6"><h3 className="mb-3 text-sm font-bold text-slate-900">Lịch sử bài bổ trợ</h3>{remedialAssignments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Chưa giao nội dung bổ trợ cho học viên này.</p> : <div className="space-y-2">{remedialAssignments.map(task => <article key={`${task.remedialAssignmentId}-${task.studentId}`} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-800">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.contentTitle} · Giao bởi {task.assignedByName || 'giảng viên'}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{task.status === 'COMPLETED' ? 'Hoàn thành' : task.status}</span></div><p className="mt-2 text-xs text-slate-600">{task.reason}</p><p className="mt-2 text-[11px] text-slate-500">Lượt bổ trợ: {task.attemptsUsed}{task.hasUnlimitedAttempts ? ' · Không giới hạn' : `/${task.maxAttempts}`} · Cấp khi đạt: {task.retakeAttemptsGranted} lượt làm lại · Không có hạn hoàn thành{task.hasActiveRetakeGrant && task.retakeExpiresAt ? ` · Lượt làm lại đến ${new Date(task.retakeExpiresAt).toLocaleString('vi-VN')}` : ''}</p></article>)}</div>}</section>
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Bài bổ trợ không cộng vào điều kiện hoàn thành khóa học hay cấp chứng chỉ.</div>
          {selected.riskStatus === 'WARNING' || selected.riskStatus === 'DANGER'
            ? <button onClick={() => setAssigningStudent(selected)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><UserPlus size={16}/> Giao bài bổ trợ riêng</button>
            : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Chỉ giao bài bổ trợ cho học viên đang cần hỗ trợ hoặc có nguy cơ.</p>}
        </aside>
      </div>}
      {assigningStudent && <AssignRemedialContentModal courseId={courseId} studentId={assigningStudent.userId} studentName={assigningStudent.fullName} assessments={assigningStudent.assessments} onClose={() => setAssigningStudent(null)} onCreated={() => { setAssigningStudent(null); void refetch(); }} />}
    </div>
  );
};

const Summary: React.FC<{ label: string; value: number; icon: React.ReactNode; color: 'blue' | 'green' | 'amber' | 'rose' }> = ({ label, value, icon, color }) => {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-extrabold text-slate-900">{value}</p></div></div>;
};
