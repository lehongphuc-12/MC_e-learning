import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import QuizImportStudio from '../components/QuizImportStudio';
import QuizSyncStudio from '../components/QuizSyncStudio';
import { quizImportApi } from '../api/quizImportApi';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  Edit2,
  Eye,
  Clock,
  HelpCircle,
  FileQuestion, FileUp, GitCompareArrows, CloudUpload, Search, Sparkles,
} from 'lucide-react';

import { useQuizzesByCourse } from '../hooks/useQuiz';

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [importOpen, setImportOpen] = useState(false);
  const [syncQuiz, setSyncQuiz] = useState<{ id: number; title: string } | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState<number | null>(null);
  const [exportNotice, setExportNotice] = useState('');

  const { courseId: courseIdParam } =
    useParams<{ courseId: string }>();

  const courseId = courseIdParam
    ? Number(courseIdParam)
    : null;

  const {
    data: quizzes = [],
    isLoading,
    isError,
    error,
  } = useQuizzesByCourse(courseId);

  if (!courseId || !Number.isInteger(courseId)) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          Course ID không hợp lệ.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#061b34] via-[#0a315a] to-[#103b68] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-6 py-8">

          <button
            onClick={() =>
              navigate(
                `/instructor/courses/${courseId}/lessons`
              )
            }
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-indigo-100 hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại khóa học
          </button>

          <div className="flex items-center justify-between gap-6">

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileQuestion className="h-5 w-5" />

                <span className="text-sm font-semibold text-[#efd091]">
                  Quiz Management
                </span>
              </div>

              <h1 className="text-3xl font-bold">
                Quản lý Quiz
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                Quản lý các bài kiểm tra của khóa học
              </p>
            </div>

            <button
              onClick={() =>
                navigate(
                  `/instructor/quizzes/new?courseId=${courseId}`
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#c8a35c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#dfbd7c]"
            >
              <PlusCircle className="h-5 w-5" />
              Tạo Quiz
            </button>

          </div>
        </div>
      </div>

      <div className="mx-auto -mt-4 flex max-w-7xl flex-wrap gap-3 px-6 relative z-10">
        <motion.button whileHover={reducedMotion ? {} : { y: -3, scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => setImportOpen(true)} className="flex items-center gap-2 rounded-2xl border border-[#e9d6aa] bg-white px-5 py-4 text-sm font-extrabold text-[#113253] shadow-lg"><FileUp size={18}/> Import Excel / Google Sheets</motion.button>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-600 shadow-sm"><Sparkles size={17} className="text-[#b98c40]"/> Đồng bộ tự động bởi Backend</div>
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-7"><label className="relative block max-w-md"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm Quiz theo tên hoặc mô tả..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#c8a35c]"/></label>{exportNotice && <p role="status" className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{exportNotice}</p>}</div>
      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 pt-8">

        {isLoading && (
          <div className="rounded-2xl bg-white p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />

            <p className="text-sm text-slate-500">
              Đang tải danh sách Quiz...
            </p>
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h3 className="font-semibold text-red-700">
              Không thể tải danh sách Quiz
            </h3>

            <p className="mt-1 text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : 'Có lỗi xảy ra.'}
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          quizzes.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <HelpCircle className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Chưa có Quiz
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Khóa học này chưa có bài kiểm tra nào.
              </p>

              <button
                onClick={() =>
                  navigate(
                    `/instructor/quizzes/new?courseId=${courseId}`
                  )
                }
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#c8a35c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <PlusCircle className="h-4 w-4" />
                Tạo Quiz đầu tiên
              </button>

            </div>
          )}

        {!isLoading &&
          !isError &&
          quizzes.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">

                    <th className="px-6 py-4">
                      Quiz
                    </th>

                    <th className="px-4 py-4">
                      Thời gian
                    </th>

                    <th className="px-4 py-4">
                      Điểm đạt
                    </th>

                    <th className="px-4 py-4">
                      Số lần làm
                    </th>

                    <th className="px-4 py-4">
                      Trạng thái
                    </th>

                    <th className="px-6 py-4 text-right">
                      Thao tác
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {quizzes.filter(q => `${q.title} ${q.description || ''}`.toLowerCase().includes(search.toLowerCase())).map((quiz) => (

                    <tr
                      key={quiz.quizId}
                      className="transition duration-300 hover:bg-[#f6f0e5]/50"
                    >

                      <td className="px-6 py-5">

                        <div>
                          <p className="font-semibold text-slate-900">
                            {quiz.title}
                          </p>

                          {quiz.description && (
                            <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                              {quiz.description}
                            </p>
                          )}

                        </div>

                      </td>

                      <td className="px-4 py-5">

                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Clock className="h-4 w-4" />

                          {quiz.timeLimitMinutes > 0
                            ? `${quiz.timeLimitMinutes} phút`
                            : 'Không giới hạn'}
                        </span>

                      </td>

                      <td className="px-4 py-5 font-semibold text-slate-700">
                        {quiz.passingScore}
                      </td>

                      <td className="px-4 py-5 text-slate-600">
                        {quiz.maxAttempts}
                      </td>

                      <td className="px-4 py-5">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            quiz.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : quiz.status === 'ARCHIVED'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {quiz.status}
                        </span>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex justify-end gap-2">

                          <button onClick={() => navigate(`/instructor/quizzes/${quiz.quizId}/grading`)} title="Chấm bài học viên" className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">Chấm bài</button>
                          <button onClick={() => setSyncQuiz({ id: quiz.quizId, title: quiz.title })} title="Trung tâm đồng bộ" className="rounded-xl p-2 text-[#b98c40] transition hover:-translate-y-0.5 hover:bg-amber-50"><GitCompareArrows className="h-4 w-4"/></button>
                          <button disabled={exporting === quiz.quizId} onClick={async () => { setExporting(quiz.quizId); setExportNotice(''); try { const result = await quizImportApi.exportGoogle(quiz.quizId); setExportNotice(result.success ? `Đã export Quiz #${quiz.quizId} lên Google Sheets.` : result.message || 'Export chưa thành công.'); } catch (e) { setExportNotice(e instanceof Error ? e.message : 'Export thất bại.'); } finally { setExporting(null); } }} title="Export Google Sheets" className="rounded-xl p-2 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:opacity-40"><CloudUpload className="h-4 w-4"/></button>
                          <button
                            onClick={() =>
                              navigate(
                                `/instructor/quizzes/${quiz.quizId}/edit`
                              )
                            }
                            title="Chỉnh sửa Quiz"
                            className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/quizzes/${quiz.quizId}/take`
                              )
                            }
                            title="Xem / Làm Quiz"
                            className="rounded-xl p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

      </div>
      <AnimatePresence>{importOpen && <QuizImportStudio courseId={courseId} onClose={() => setImportOpen(false)}/>}</AnimatePresence>
      <AnimatePresence>{syncQuiz && <QuizSyncStudio key={syncQuiz.id} quizId={syncQuiz.id} title={syncQuiz.title} onClose={() => setSyncQuiz(null)}/>}</AnimatePresence>
    </div>
  );
};

export default QuizManagementPage;