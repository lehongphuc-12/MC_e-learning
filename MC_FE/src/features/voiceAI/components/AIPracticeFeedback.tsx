import type { AIPracticeResult } from '../types/aiPracticeTypes';
export function AIPracticeFeedback({ result }: { result: AIPracticeResult }) {
  return <section className="space-y-4 rounded-xl border bg-white p-5">
    <h2 className="text-xl font-bold">Kết quả luyện tập · {result.modelVersion}</h2>
    <p className="text-sm text-slate-500">Các giá trị dự đoán thể hiện đầu ra mô hình, không phải điểm thi chính thức.</p>
    <p className="font-semibold">{result.overallAssessment}</p><p>{result.summary}</p>
    <div className="grid gap-2 sm:grid-cols-2">{Object.entries(result.predictions).map(([label, value]) =>
      <div key={label} className="rounded-lg bg-slate-50 p-3"><strong>{label}</strong>: {(value * 100).toFixed(1)}%</div>)}</div>
    <h3 className="font-bold">Điểm mạnh</h3>
    {result.strengths.map((x, i) => <p key={i}><strong>{x.category}:</strong> {x.explanation} {x.evidence || ''}</p>)}
    <h3 className="font-bold">Điểm cần cải thiện</h3>
    {result.issues.map((x, i) => <p key={i}><strong>{x.category}:</strong> {x.explanation} {x.evidence || ''}</p>)}
    <h3 className="font-bold">Đề xuất</h3><ul className="list-disc pl-5">{result.recommendations.map((x,i) => <li key={i}>{x}</li>)}</ul>
    <h3 className="font-bold">Bài tập tiếp theo</h3>
    {result.practicePlan.map((x,i) => <div key={i}><strong>{x.title}</strong><p>{x.instruction}</p><p className="italic">{x.example}</p></div>)}
    <p className="text-purple-700">{result.encouragement}</p>
  </section>;
}
