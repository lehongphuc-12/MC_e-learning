
import type { AIPracticeResult } from '../types/aiPracticeTypes';

export function AIPracticeFeedback({
  result,
}: {
  result: AIPracticeResult;
}) {
  const strengths = result.strengths ?? [];
  const issues = result.issues ?? [];
  const recommendations = result.recommendations ?? [];
  const practicePlan = result.practicePlan ?? [];

  const hasText = (value?: string | null) =>
    typeof value === 'string' && value.trim().length > 0;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Tiêu đề */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Kết quả luyện phát âm
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Phản hồi và hướng dẫn luyện tập dành cho học viên
        </p>
      </div>

      {/* Nhận xét tổng quan */}
      {hasText(result.overallAssessment) && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-800">
            Nhận xét tổng quan
          </h3>
          <p className="whitespace-pre-line leading-7 text-slate-700">
            {result.overallAssessment}
          </p>
        </div>
      )}

      {/* Tóm tắt */}
      {hasText(result.summary) &&
        result.summary.trim() !==
          result.overallAssessment?.trim() && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800">
              Tổng kết luyện tập
            </h3>
            <p className="whitespace-pre-line leading-7 text-slate-700">
              {result.summary}
            </p>
          </div>
        )}

      {/* Điểm mạnh - chỉ hiển thị khi có dữ liệu */}
      {strengths.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Điểm mạnh
          </h3>

          {strengths.map((item, index) => (
            <div
              key={index}
              className="rounded-lg bg-emerald-50 p-3"
            >
              <p className="font-medium text-emerald-900">
                {item.category}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {item.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Điểm cần cải thiện - chỉ khi có bằng chứng */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Điểm cần cải thiện
          </h3>

          {issues.map((item, index) => (
            <div
              key={index}
              className="rounded-lg bg-amber-50 p-3"
            >
              <p className="font-medium text-amber-900">
                {item.category}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {item.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Hướng dẫn cải thiện */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Hướng dẫn luyện tập
          </h3>

          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            {recommendations
              .filter((item) => hasText(item))
              .map((item, index) => (
                <li key={index} className="leading-7">
                  {item}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Bài tập tiếp theo */}
      {practicePlan.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Bài tập tiếp theo
          </h3>

          <div className="space-y-3">
            {practicePlan.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h4 className="font-semibold text-slate-900">
                  {index + 1}. {item.title}
                </h4>

                {hasText(item.instruction) && (
                  <p className="mt-2 whitespace-pre-line leading-7 text-slate-700">
                    {item.instruction}
                  </p>
                )}

                {hasText(item.example) && (
                  <div className="mt-3 rounded-lg bg-white p-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">
                      Nội dung luyện đọc
                    </p>
                    <p className="font-medium italic leading-7 text-slate-800">
                      {item.example}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Động viên */}
      {hasText(result.encouragement) && (
        <div className="rounded-lg bg-purple-50 p-4">
          <h3 className="mb-2 font-semibold text-purple-900">
            Mục tiêu luyện tập
          </h3>
          <p className="leading-7 text-purple-800">
            {result.encouragement}
          </p>
        </div>
      )}
    </section>
  );
}
