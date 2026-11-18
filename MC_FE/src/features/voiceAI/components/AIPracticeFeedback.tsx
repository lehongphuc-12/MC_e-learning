import type { ReactNode } from 'react';
import type { AIPracticeResult, PracticeCriterionResult } from '../types/aiPracticeTypes';

interface Props {
  result: AIPracticeResult;
}

/**
 * Chỉ hỗ trợ đánh dấu **văn bản** từ phản hồi Backend.
 * React tự escape nội dung, không thực thi HTML do LLM tạo ra.
 */
function renderHighlightedText(value: string): ReactNode[] {
  return value.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-amber-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

const DEFAULT_CRITERIA: Pick<PracticeCriterionResult, 'code' | 'name'>[] = [
  { code: 'C01', name: 'Phát âm & thanh điệu' },
  { code: 'C02', name: 'Độ rõ lời' },
  { code: 'C03', name: 'Độ chính xác nội dung' },
];

function criterionStatusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case 'PASSED': return 'Đạt';
    case 'FAILED': return 'Chưa đạt';
    default: return 'Chưa đủ căn cứ đánh giá';
  }
}

export function AIPracticeFeedback({ result }: Props) {
  // Backend is the source of truth for statuses. Never derive pass/fail from raw scores.
  const criteria = DEFAULT_CRITERIA.map((item) => {
    const fromBe = result.criteria?.find((c) => c.code?.toUpperCase() === item.code);
    return { ...item, status: fromBe?.status ?? 'NOT_EVALUATED', evidenceAvailable: fromBe?.evidenceAvailable ?? false };
  });
  const evaluatedCount = criteria.filter((c) => c.status === 'PASSED' || c.status === 'FAILED').length;
  const passedCount = criteria.filter((c) => c.status === 'PASSED').length;
  const strengths = result.strengths ?? [];
  const issues = result.issues ?? [];
  const recommendations = result.recommendations ?? [];
  const practicePlan = result.practicePlan ?? [];

  const hasStrengths = strengths.length > 0;
  const hasIssues = issues.length > 0;
  const hasRecommendations = recommendations.length > 0;
  const hasPracticePlan = practicePlan.length > 0;

  const hasOverallAssessment = Boolean(
    result.overallAssessment?.trim()
  );

  const hasSummary = Boolean(
    result.summary?.trim()
  );

  const hasEncouragement = Boolean(
    result.encouragement?.trim()
  );

  // Không tự suy đoán lỗi phát âm từ dữ liệu văn bản.
  // Backend chịu trách nhiệm xác minh bằng chứng.
  //
  // CONFIRMED: Lỗi được xác minh bằng phân tích âm học.
  // SUSPECTED: Vị trí cần kiểm tra hoặc nghe lại.
  // PRACTICE_TIP: Gợi ý luyện tập tham khảo.
  //
  // DTO hiện tại chưa có trường evidenceLevel,
  // vì vậy FE không tự gán nhãn CONFIRMED.

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      {/* BA TIÊU CHÍ: chỉ sử dụng trạng thái BE xác nhận */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Đánh giá theo 3 tiêu chí</h2>
        <p className="text-sm font-medium text-slate-700">
          {evaluatedCount === 3
            ? `Đã đạt ${passedCount}/3 tiêu chí`
            : 'Chưa đủ căn cứ xác định số tiêu chí đạt'}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {criteria.map((criterion) => (
            <div key={criterion.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-wide text-violet-700">{criterion.code}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{criterion.name}</h3>
              <p className="mt-2 text-sm text-slate-700">{criterionStatusLabel(criterion.status)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {criterion.evidenceAvailable
                  ? 'Đã có dữ liệu mô hình để tham khảo; chưa đồng nghĩa với kết luận đạt.'
                  : 'Chưa có dữ liệu mô hình được xác nhận.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* KẾT QUẢ TỔNG QUAN */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">
          Kết quả luyện giọng
        </h2>

        {hasOverallAssessment && (
          <p className="mt-2 font-medium text-slate-800">
            {result.overallAssessment}
          </p>
        )}

        {hasSummary && (
          <p className="mt-2 text-slate-600">
            {result.summary}
          </p>
        )}
      </div>

      {/* ĐIỂM MẠNH
          Chỉ hiển thị khi Backend có dữ liệu.
          Không tự tạo lời khen hoặc lời khuyên thay thế.
      */}
      {hasStrengths && (
        <div className="space-y-3">
          <h3 className="font-bold text-emerald-700">
            Điểm mạnh
          </h3>

          {strengths.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-emerald-100 bg-emerald-50 p-4"
            >
              <p className="font-semibold text-slate-900">
                {item.category}
              </p>

              <p className="mt-1 text-slate-700">
                {item.explanation}
              </p>

              {item.evidence?.trim() && (
                <p className="mt-2 text-sm text-slate-600">
                  {item.evidence}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NỘI DUNG CẦN CHÚ Ý
          Chỉ hiển thị khi có vấn đề hoặc vị trí
          cần xác minh từ Backend.
          Các dấu **...** trong evidence được hiển thị in đậm.
      */}
      {hasIssues && (
        <div className="space-y-3">
          <h3 className="font-bold text-amber-700">
            Nội dung cần chú ý
          </h3>

          {issues.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-amber-100 bg-amber-50 p-4"
            >
              <p className="font-semibold text-slate-900">
                {item.category}
              </p>

              <p className="mt-1 whitespace-pre-line text-slate-700">
                {item.explanation}
              </p>

              {item.evidence?.trim() && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {renderHighlightedText(item.evidence)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ĐỀ XUẤT CẢI THIỆN */}
      {hasRecommendations && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">
            Đề xuất cải thiện
          </h3>

          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            {recommendations.map((item, index) => (
              <li key={index}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BÀI TẬP THAM KHẢO
          Bài tập được đề xuất không đồng nghĩa
          học viên đã mắc lỗi phát âm tương ứng.
      */}
      {hasPracticePlan && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">
            Bài luyện đề xuất
          </h3>

          <p className="text-sm text-slate-500">
            Các bài luyện dưới đây giúp bạn rèn luyện
            thêm kỹ năng phát âm và cách thể hiện.
            Đây không phải danh sách lỗi phát âm
            đã được xác nhận.
          </p>

          {practicePlan.map((exercise, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <h4 className="font-semibold text-slate-900">
                {index + 1}. {exercise.title}
              </h4>

              <p className="mt-2 text-slate-700">
                {exercise.instruction}
              </p>

              {exercise.example?.trim() && (
                <p className="mt-2 italic text-slate-600">
                  Ví dụ: {exercise.example}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LỜI ĐỘNG VIÊN */}
      {hasEncouragement && (
        <p className="rounded-lg bg-purple-50 p-4 text-purple-700">
          {result.encouragement}
        </p>
      )}
    </section>
  );
}
