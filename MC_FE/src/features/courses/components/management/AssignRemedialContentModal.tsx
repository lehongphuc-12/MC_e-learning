import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { lessonApi } from '../../api/lessonApi';
import { quizApi } from '../../../quizzes/api/quizApi';
import { speakingApi } from '../../api/speakingApi';
import { remedialAssignmentApi, type RemedialContentType } from '../../api/remedialAssignmentApi';
import type { Lesson } from '../../types/lessonTypes';
import type { QuizListItemDto } from '../../../quizzes/types/quizTypes';
import type { SpeakingScriptDto } from '../../types/speakingTypes';
import type { StudentAssessmentInsightDto } from '../../../payment/types/paymentTypes';

interface Props { courseId: number; studentId: number; studentName: string; assessments: StudentAssessmentInsightDto[]; onClose: () => void; onCreated: () => void; }
export const AssignRemedialContentModal: React.FC<Props> = ({ courseId, studentId, studentName, assessments, onClose, onCreated }) => {
  const [type, setType] = useState<RemedialContentType>('LESSON');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<QuizListItemDto[]>([]);
  const [officialQuizzes, setOfficialQuizzes] = useState<QuizListItemDto[]>([]);
  const [scripts, setScripts] = useState<SpeakingScriptDto[]>([]);
  const [officialScripts, setOfficialScripts] = useState<SpeakingScriptDto[]>([]);
  const [contentId, setContentId] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<'' | 'QUIZ' | 'SPEAKING'>('');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [limitAttempts, setLimitAttempts] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [retakeAttemptsGranted, setRetakeAttemptsGranted] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      lessonApi.getLessonsByCourseId(courseId).catch(() => [] as Lesson[]),
      quizApi.getQuizzesByCourse(courseId).then(r => r.data ?? []).catch(() => [] as QuizListItemDto[]),
      speakingApi.getSpeakingScriptsByCourse(courseId).then(r => r.data ?? []).catch(() => [] as SpeakingScriptDto[]),
    ]).then(([l, q, s]) => { if (alive) { setLessons(l.filter(x => x.isRemedial)); setQuizzes(q.filter(x => x.isRemedial)); setOfficialQuizzes(q.filter(x => !x.isRemedial)); setScripts(s.filter(x => x.isRemedial)); setOfficialScripts(s.filter(x => !x.isRemedial)); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [courseId]);

  const options = useMemo(() => type === 'LESSON' ? lessons.map(x => ({ id: x.lessonId, title: x.title }))
    : type === 'QUIZ' ? quizzes.map(x => ({ id: x.quizId, title: x.title })) : scripts.map(x => ({ id: x.scriptId, title: x.title })), [type, lessons, quizzes, scripts]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contentId || !title.trim() || !reason.trim()) { setError('Hãy chọn nội dung bổ trợ và điền tiêu đề, lý do giao.'); return; }
    if (targetType && !targetId) { setError('Hãy chọn bài đánh giá cần mở lượt làm lại hoặc bỏ chọn loại bài.'); return; }
    setSaving(true); setError('');
    try {
      const response = await remedialAssignmentApi.create(courseId, {
        title: title.trim(), reason: reason.trim(), maxAttempts: limitAttempts ? maxAttempts : 0,
        retakeAttemptsGranted, studentIds: [studentId],
        ...(targetId && targetType === 'QUIZ' ? { targetQuizId: targetId } : {}),
        ...(targetId && targetType === 'SPEAKING' ? { targetSpeakingScriptId: targetId } : {}),
        ...(type === 'LESSON' ? { lessonId: contentId } : type === 'QUIZ' ? { quizId: contentId } : { speakingScriptId: contentId }),
      });
      if (!response.success) throw new Error(response.message || 'Không thể giao bài bổ trợ.');
      onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể giao bài bổ trợ.'); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
    <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Lộ trình cá nhân</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">Giao bài bổ trợ</h2><p className="mt-1 text-sm text-slate-500">Học viên: {studentName}</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></header>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={15} className="mr-1 inline"/>Chỉ nội dung đã đánh dấu “bài bổ trợ” mới xuất hiện. Bài bổ trợ không có hạn hoàn thành và không tính vào hoàn thành khóa học/chứng chỉ. Khi học viên đạt, lượt làm lại quiz có hiệu lực 7 ngày.</div>
        <div className="grid grid-cols-3 gap-2">{(['LESSON','QUIZ','SPEAKING'] as const).map(value => <button key={value} type="button" onClick={() => { setType(value); setContentId(null); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${type === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{value === 'LESSON' ? 'Bài học' : value === 'QUIZ' ? 'Quiz' : 'Speaking'}</button>)}</div>
        <label className="block text-sm font-semibold text-slate-700">Nội dung bổ trợ<select value={contentId ?? ''} onChange={e => setContentId(e.target.value ? Number(e.target.value) : null)} disabled={loading || options.length === 0} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">{loading ? <option>Đang tải…</option> : <option value="">Chọn nội dung</option>}{options.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
        {!loading && options.length === 0 && <p className="text-xs text-slate-500">Chưa có nội dung bổ trợ loại này. Tạo nội dung và bật cờ “bài bổ trợ” trước.</p>}
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-slate-700">Mở lượt làm lại bài chính thức<select value={targetType} onChange={e=>{setTargetType(e.target.value as typeof targetType);setTargetId(null);}} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal"><option value="">Không mở lượt làm lại</option><option value="QUIZ">Quiz</option><option value="SPEAKING">Speaking</option></select></label><label className="block text-sm font-semibold text-slate-700">Bài đánh giá<select value={targetId ?? ''} onChange={e=>setTargetId(e.target.value ? Number(e.target.value) : null)} disabled={!targetType || loading} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal"><option value="">Chọn bài đánh giá</option>{targetType === 'QUIZ' ? officialQuizzes.filter(x=>assessments.find(a => a.assessmentType === 'QUIZ' && a.assessmentId === x.quizId)?.status !== 'PASSED').map(x=><option key={x.quizId} value={x.quizId}>{x.title}</option>) : targetType === 'SPEAKING' ? officialScripts.filter(x=>assessments.find(a => a.assessmentType === 'SPEAKING' && a.assessmentId === x.scriptId)?.status !== 'PASSED').map(x=><option key={x.scriptId} value={x.scriptId}>{x.title}</option>) : null}</select></label></div>
        {targetType && targetId && <label className="block text-sm font-semibold text-slate-700">Số lượt làm lại bài chính khi học viên đạt bài bổ trợ<input type="number" min={1} max={20} value={retakeAttemptsGranted} onChange={e => setRetakeAttemptsGranted(Math.min(20, Math.max(1, Number(e.target.value))))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"/><span className="mt-1 block text-xs font-normal text-slate-500">Mỗi lượt dùng một lần. Toàn bộ lượt được cấp có hạn 7 ngày kể từ khi học viên đạt bài bổ trợ.</span></label>}
        <label className="block text-sm font-semibold text-slate-700">Tiêu đề giao bài<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" placeholder="Ví dụ: Ôn tập kỹ thuật dẫn mở đầu"/></label>
        <label className="block text-sm font-semibold text-slate-700">Lý do / hướng dẫn<input value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" placeholder="Nêu kiến thức cần củng cố"/></label>
        <div className="rounded-xl border border-slate-200 p-3"><label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" checked={limitAttempts} onChange={e => setLimitAttempts(e.target.checked)} className="rounded border-slate-300"/>Giới hạn số lượt làm bài bổ trợ</label>{limitAttempts ? <label className="mt-3 block text-sm font-semibold text-slate-700">Số lượt tối đa<input type="number" min={1} max={20} value={maxAttempts} onChange={e => setMaxAttempts(Math.min(20, Math.max(1, Number(e.target.value))))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"/></label> : <p className="mt-2 text-xs text-slate-500">Học viên có thể làm đến khi đạt. Bài bổ trợ không có hạn hoàn thành.</p>}</div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button><button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving && <LoaderCircle size={15} className="animate-spin"/>}Giao cho học viên</button></footer>
    </form>
  </div>;
};
