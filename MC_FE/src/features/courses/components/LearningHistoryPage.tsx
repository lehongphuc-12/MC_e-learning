import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../../services/api';

type QuizAttempt = { attemptId: number; quizTitle: string; attemptNumber: number; score: number | null; resultStatus: string; submittedAt: string };
type SpeakingSubmission = { submissionId: number; title: string; score: number | null; status: string; feedback: string | null; submittedAt: string };
type LessonProgress = { lessonId: number; lessonTitle: string; isCompleted: boolean; timeSpentMinutes: number };
type HistoryCourse = { enrollmentId: number; courseId: number; courseTitle: string; status: string; isExpired: boolean; expiresAt: string | null; completionPercentage: number; quizAttempts: QuizAttempt[]; speakingSubmissions: SpeakingSubmission[]; lessonProgresses: LessonProgress[] };
type Envelope<T> = { data: T; success: boolean; message?: string };

const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Không giới hạn';

export const LearningHistoryPage: React.FC = () => {
  const [courses, setCourses] = useState<HistoryCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request<Envelope<HistoryCourse[]>>('/learning/history')
      .then(res => { if (active) setCourses(res.data ?? []); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Không thể tải lịch sử học tập.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <main className="mx-auto max-w-5xl px-4 py-10 text-slate-800">
    <div className="mb-6"><Link to="/my-courses" className="text-blue-700 hover:underline">← Khóa học của tôi</Link></div>
    <h1 className="mb-2 text-3xl font-bold">Lịch sử học tập</h1>
    <p className="mb-8 text-slate-600">Xem lại điểm Quiz, Speaking và tiến độ đã lưu. Khóa học hết hạn chỉ được xem lịch sử, không thể học hoặc nộp bài mới.</p>
    {loading && <p>Đang tải lịch sử...</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !error && courses.length === 0 && <p>Chưa có lịch sử khóa học.</p>}
    {courses.map(course => <section key={course.enrollmentId} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{course.courseTitle}</h2>
        <span className="rounded bg-slate-100 px-3 py-1 text-sm">{course.isExpired ? 'Đã hết hạn' : course.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Tiến độ đã lưu: {course.completionPercentage}% · Hạn truy cập: {dateText(course.expiresAt)}</p>
      <details className="mt-5" open><summary className="cursor-pointer font-semibold">Điểm Quiz ({course.quizAttempts.length} lần nộp)</summary>
        {course.quizAttempts.length === 0 ? <p className="py-2 text-sm text-slate-500">Chưa có điểm Quiz.</p> :
          <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Bài kiểm tra</th><th className="p-2">Lần</th><th className="p-2">Điểm</th><th className="p-2">Kết quả</th><th className="p-2">Ngày nộp</th></tr></thead><tbody>{course.quizAttempts.map(a => <tr key={a.attemptId} className="border-b"><td className="p-2">{a.quizTitle}</td><td className="p-2">{a.attemptNumber}</td><td className="p-2">{a.score ?? 'Chưa chấm'}</td><td className="p-2">{a.resultStatus}</td><td className="p-2">{dateText(a.submittedAt)}</td></tr>)}</tbody></table></div>}
      </details>
      <details className="mt-5"><summary className="cursor-pointer font-semibold">Điểm Speaking ({course.speakingSubmissions.length} bài nộp)</summary>
        {course.speakingSubmissions.length === 0 ? <p className="py-2 text-sm text-slate-500">Chưa có bài Speaking.</p> :
          <ul className="mt-2 space-y-2">{course.speakingSubmissions.map(s => <li key={s.submissionId} className="rounded border p-3 text-sm"><strong>{s.title}</strong> · {s.score ?? 'Chưa chấm'} điểm · {s.status} · {dateText(s.submittedAt)}{s.feedback && <p className="mt-1 text-slate-600">Nhận xét: {s.feedback}</p>}</li>)}</ul>}
      </details>
      <details className="mt-5"><summary className="cursor-pointer font-semibold">Tiến độ video/bài học ({course.lessonProgresses.length})</summary>
        <ul className="mt-2 space-y-2">{course.lessonProgresses.map(p => <li key={p.lessonId} className="text-sm">{p.isCompleted ? '✓' : '○'} {p.lessonTitle} · {p.timeSpentMinutes} phút</li>)}</ul>
      </details>
    </section>)}
  </main>;
};
