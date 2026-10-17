
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, CloudDownload, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud, X, ChevronDown, AlertTriangle, Info } from 'lucide-react';
import { quizImportApi, type ImportParams, type ImportPreview, type ImportResult } from '../api/quizImportApi';

type Source = 'excel' | 'google';

export default function QuizImportStudio({ courseId, lessons = [], onClose, onImported }: { courseId: number; lessons?: { lessonId: number; title: string }[]; onClose: () => void; onImported?: () => void }) {
  const reduce = useReducedMotion();
  const [source, setSource] = useState<Source>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [lessonId, setLessonId] = useState('');
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const requestId = useRef(0);

  useEffect(() => { requestId.current += 1; setPreview(null); setResult(null); setError(''); setConfirmOpen(false); setExpanded([]); }, [source, file, lessonId, title]);

  const params = (): ImportParams => ({ courseId, lessonId: Number(lessonId), title: title.trim() });

  const validate = () => {
    if (!Number.isInteger(Number(lessonId)) || Number(lessonId) <= 0) throw new Error('Chọn một bài học hợp lệ trước khi import. BE hiện yêu cầu Lesson ID lớn hơn 0.');
    if (!title.trim()) throw new Error('Nhập tên Quiz.');
    if (source === 'excel' && (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size === 0 || file.size > 15 * 1024 * 1024)) throw new Error('Chọn file .xlsx hợp lệ, tối đa 15 MB.');
  };

  const run = async (confirm: boolean) => {
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      validate();
      const p = params();
      if (!confirm) {
        const response = source === 'excel' ? await quizImportApi.previewExcel(file!, p) : await quizImportApi.previewGoogle(p);
        if (currentRequest !== requestId.current) return;
        setPreview(response);
        setResult(null);
      } else {
        if (!preview?.canImport || !preview.previewToken) throw new Error('Cần preview hợp lệ trước khi xác nhận.');
        const response = source === 'excel' ? await quizImportApi.confirmExcel(file!, p, preview.previewToken) : await quizImportApi.confirmGoogle(p, preview.previewToken);
        if (currentRequest !== requestId.current) return;
        setResult(response);
        setPreview(null);
        setConfirmOpen(false);
        if (response.success) onImported?.();
      }
    } catch (e) {
      if (currentRequest === requestId.current) setError(e instanceof Error ? e.message : 'Không thể hoàn tất thao tác.');
      if (currentRequest === requestId.current) setConfirmOpen(false);
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-[#04142b]/70 backdrop-blur-md" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside initial={reduce ? false : { x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 250, damping: 28 }} className="flex h-full w-full max-w-[760px] flex-col overflow-hidden bg-[#f7f9fd] shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#6d28d9] via-[#9333ea] to-[#7e22ce] px-6 py-5 text-white">
          <motion.div aria-hidden className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border border-[#f3d28b]/30" animate={reduce ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 45, ease: 'linear' }} />
          <div className="relative flex justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[.25em] text-purple-100">MSEEK · IMPORT STUDIO</p>
              <h2 className="mt-2 text-2xl font-extrabold">Nhập dữ liệu Quiz</h2>
              <p className="mt-1 text-sm text-purple-100">Preview trước, xác nhận sau — bảo vệ dữ liệu hiện tại.</p>
            </div>
            <button onClick={onClose} aria-label="Đóng" className="self-start rounded-xl bg-white/10 p-2.5 hover:bg-white/20"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            {(['excel', 'google'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all duration-300 ${source === s ? 'border-purple-600 bg-purple-600 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-purple-300'}`}>
                {s === 'excel' ? <FileSpreadsheet size={18}/> : <CloudDownload size={18}/>}
                {s === 'excel' ? 'Excel (.xlsx)' : 'Google Sheets'}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                Course ID
                <input readOnly value={courseId} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"/>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Bài học (Lesson ID)
                <select value={lessonId} onChange={e => setLessonId(e.target.value)} className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500">
                  <option value="">Chọn bài học để nhập Quiz</option>
                  {lessons.slice().sort((a,b) => a.lessonId-b.lessonId).map(lesson => <option key={lesson.lessonId} value={lesson.lessonId}>{lesson.title} (#{lesson.lessonId})</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-600">
              Tên Quiz
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Kiểm tra kỹ năng dẫn chương trình" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-500"/>
            </label>
            {source === 'google' && <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs leading-5 text-purple-900"><div className="flex items-center gap-2 font-bold"><Info size={15}/> Nguồn Google Sheets được cấu hình trên Backend</div><p className="mt-1">BE đang đọc Spreadsheet cố định và liên kết câu hỏi theo <b>Lessons.LessonId / LessonTitle → LessonKey → Questions</b>. Chọn bài học và nhập tên Quiz, sau đó bấm Preview để xem nội dung thực tế. Phiên bản API hiện tại chưa hỗ trợ chọn Spreadsheet ID hoặc tab tùy ý.</p></div>}
            {lessons.length === 0 && <p className="mt-3 text-xs font-semibold text-amber-700">Khóa học chưa có bài học phù hợp để import. Tạo bài học trước; Backend hiện chưa hỗ trợ import Quiz tổng khóa (LessonId rỗng).</p>}
            {source === 'excel' && (
              <label className="mt-5 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 px-4 py-8 text-center transition hover:bg-purple-100">
                <UploadCloud size={32} className="text-purple-600"/>
                <span className="text-sm font-bold text-purple-900">{file?.name || 'Chọn file Excel để tải lên'}</span>
                <span className="text-xs text-slate-500">Chỉ .xlsx · tối đa 15 MB</span>
                <input type="file" accept=".xlsx" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)}/>
              </label>
            )}
          </div>

          {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

          {preview && (
            <motion.div initial={reduce ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-purple-900"><ShieldCheck size={20}/> Kết quả preview</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-purple-50 px-3 py-2 font-bold text-purple-800">{preview.questionCount} câu hỏi</span><span className="rounded-lg bg-slate-100 px-3 py-2">{preview.quiz?.title || title}</span><span className="rounded-lg bg-slate-100 px-3 py-2">Lesson #{lessonId}</span></div>
              <p className={`mt-3 text-sm font-semibold ${preview.canImport ? 'text-emerald-700' : 'text-rose-700'}`}>{preview.canImport ? 'Dữ liệu hợp lệ, có thể xác nhận.' : 'Dữ liệu chưa hợp lệ, không thể import.'}</p>
              {(preview.errors || []).length > 0 && <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-rose-50 p-3">{preview.errors.map((v, i) => <div key={i} className="flex gap-2 text-xs text-rose-800"><AlertTriangle size={14} className="mt-0.5 shrink-0"/><span><b>{v.sheet || 'Dữ liệu'} · dòng {v.row || '-'}</b>: {v.message}</span></div>)}</div>}
              {preview.quiz?.questions && preview.quiz.questions.length > 0 && <div className="mt-4 space-y-2"><h4 className="text-sm font-bold text-slate-800">Chi tiết câu hỏi từ nguồn ({preview.quiz.questions.length})</h4>{preview.quiz.questions.map((q, i) => <div key={i} className="overflow-hidden rounded-xl border border-purple-100"><button type="button" onClick={() => setExpanded(old => old.includes(i) ? old.filter(x => x !== i) : [...old, i])} className="flex w-full items-center justify-between gap-3 bg-purple-50/60 p-3 text-left text-xs font-semibold text-slate-800"><span className="min-w-0 break-words">#{i+1} · {q.questionText || '(Chưa có nội dung)'} <span className="ml-2 font-normal text-purple-700">{q.questionType} · {q.points ?? 0} điểm</span></span><ChevronDown size={16} className={`shrink-0 transition-transform ${expanded.includes(i) ? 'rotate-180' : ''}`}/></button>{expanded.includes(i) && <div className="space-y-2 p-3 text-xs text-slate-700">{q.instruction && <p><b>Hướng dẫn:</b> {q.instruction}</p>}{q.explanation && <p><b>Giải thích:</b> {q.explanation}</p>}{(q.choices || []).map((c,j) => <p key={j} className={c.isCorrect ? 'font-semibold text-emerald-700' : ''}>{j+1}. {c.choiceText} {c.isCorrect ? '✓ Đáp án đúng' : ''}</p>)}<div className="flex flex-wrap gap-2 text-[11px] text-purple-800">{([['Media',q.media],['ErrorRegions',q.errorRegions],['Annotations',q.annotations],['ArrangeItems',q.arrangeItems],['ScenarioNodes',q.scenarioNodes]] as const).map(([label,items]) => (items?.length || 0) > 0 && <span key={label} className="rounded-md bg-purple-50 px-2 py-1">{label}: {items?.length}</span>)}{q.writingConfig != null && <span className="rounded-md bg-purple-50 px-2 py-1">WritingConfig: có</span>}</div></div>}</div>)}</div>}
              {!preview.quiz && <p className="mt-3 text-xs text-slate-500">BE không trả về Quiz chi tiết khi dữ liệu có lỗi. Xem danh sách lỗi phía trên rồi preview lại.</p>}
              {preview.canImport && preview.previewToken && (
                <button disabled={busy} onClick={() => setConfirmOpen(true)} className="mt-5 w-full rounded-xl bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700">Xác nhận import</button>
              )}
            </motion.div>
          )}

          {result && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={20}/> {result.success ? 'Import đã hoàn tất' : 'Import chưa thành công'}</div>
              <p className="mt-2 text-sm text-emerald-900">{result.message || `Trạng thái Google Sheets: ${result.sheetsSync || 'chưa xác định'}`}</p>
              {result.sheetsSync === 'failed' || result.sheetsSync === 'blocked' ? <p className="mt-2 text-sm text-amber-800">Quiz đã lưu vào Database nhưng đồng bộ Google Sheets chưa hoàn tất. Kiểm tra trạng thái trước khi thử lại.</p> : null}
            </div>
          )}

          <button disabled={busy} onClick={() => void run(false)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-4 font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">
            {busy ? <LoaderCircle className="animate-spin" size={18}/> : <ShieldCheck size={18}/>}
            Kiểm tra & preview dữ liệu
          </button>
        </div>

        <AnimatePresence>
          {confirmOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-[#04142b]/70 p-5">
              <motion.div initial={reduce ? false : { scale: .94, y: 15 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
                <h3 className="text-xl font-extrabold text-purple-900">Xác nhận nhập Quiz?</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Dữ liệu vừa preview sẽ được kiểm tra lại ở BE trước khi ghi. Không thể hoàn tác tự động.</p>
                <div className="mt-6 flex gap-3">
                  <button disabled={busy} onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold">Hủy</button>
                  <button disabled={busy} onClick={() => void run(true)} className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white">{busy ? 'Đang lưu...' : 'Xác nhận'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}
