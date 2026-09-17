import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  Edit2,
  Eye,
  Clock,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';

import { useQuizzesByCourse } from '../hooks/useQuiz';

export const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();

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
      <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-indigo-900 text-white shadow-md">
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

                <span className="text-sm font-semibold text-violet-200">
                  Quiz Management
                </span>
              </div>

              <h1 className="text-3xl font-bold">
                Quản lý Quiz
              </h1>

              <p className="mt-2 text-sm text-indigo-200">
                Quản lý các bài kiểm tra của khóa học
              </p>
            </div>

            <button
              onClick={() =>
                navigate(
                  `/instructor/quizzes/new?courseId=${courseId}`
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <PlusCircle className="h-5 w-5" />
              Tạo Quiz
            </button>

          </div>
        </div>
      </div>

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
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
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

                  {quizzes.map((quiz) => (

                    <tr
                      key={quiz.quizId}
                      className="hover:bg-violet-50/30"
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
                            quiz.status === 'PUBLISHED'
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
    </div>
  );
};

export default QuizManagementPage;