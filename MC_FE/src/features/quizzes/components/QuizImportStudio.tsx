
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle, AlertTriangle, ArrowRight, BookOpen, Check, CheckCircle2,
  ChevronDown, CloudDownload, FileCheck2, FileSpreadsheet, FileText,
  Info, LoaderCircle, Mic2, ShieldCheck, Sparkles, UploadCloud, X
} from 'lucide-react';
import { quizImportApi, type ImportParams, type ImportPreview, type ImportResult } from '../api/quizImportApi';

type Source = 'excel' | 'google';

export default function QuizImportStudio({ courseId, lessons = [], onClose, onImported }: {
  courseId: number;
  lessons?: { lessonId: number; title: string }[];
  onClose: () => void;
  onImported?: () => void;
}) {
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
  const [dragging, setDragging] = useState(false);
  const requestId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestId.current += 1;
    setPreview(null);
    setResult(null);
    setError('');
    setConfirmOpen(false);
    setExpanded([]);
  }, [source, file, lessonId, title]);

  const params = (): ImportParams => ({ courseId, lessonId: Number(lessonId), title: title.trim() });

  const validate = () => {
    if (!Number.isInteger(Number(lessonId)) || Number(lessonId) <= 0)
      throw new Error('Chọn một bài học hợp lệ trước khi import. BE hiện yêu cầu Lesson ID lớn hơn 0.');
    if (!title.trim()) throw new Error('Nhập tên Quiz.');
    if (source === 'excel' && (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size === 0 || file.size > 15 * 1024 * 1024))
      throw new Error('Chọn file .xlsx hợp lệ, tối đa 15 MB.');
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
        const response = source === 'excel'
          ? await quizImportApi.confirmExcel(file!, p, preview.previewToken)
          : await quizImportApi.confirmGoogle(p, preview.previewToken);
        if (currentRequest !== requestId.current) return;
        setResult(response);
        setPreview(null);
        setConfirmOpen(false);
        if (response.success) onImported?.();
      }
    } catch (e) {
      if (currentRequest === requestId.current) {
        setError(e instanceof Error ? e.message : 'Không thể hoàn tất thao tác.');
        setConfirmOpen(false);
      }
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  };

  const handleFile = (selected: File | null) => {
    setFile(selected);
    setDragging(false);
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-[#DCE5F3] bg-[#F7F9FE] px-3.5 py-2.5 text-[12px] font-medium text-[#123B7A] outline-none transition-all duration-200 placeholder:text-[#9AAAC2] hover:border-[#A8BEE4] focus:border-[#245DB5] focus:bg-white focus:ring-[3px] focus:ring-[#245DB5]/10';
  const sectionTitle = 'text-[14px] font-extrabold tracking-[-.02em] text-[#123B7A]';
  const cardClass = 'rounded-[18px] border border-[#E1E9F5] bg-white p-4 shadow-[0_5px_18px_rgba(25,65,125,.045)] sm:p-5';

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-[#071B3D]/65 backdrop-blur-[5px]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside
        initial={reduce ? false : { x: 65, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 65, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mseek-import-title"
        className="relative flex h-full w-full max-w-[780px] flex-col overflow-hidden bg-[#F2F6FD] shadow-[-18px_0_55px_rgba(7,27,61,.22)]"
      >
        <style>{`
          @keyframes mseekWave { 0%,100% { transform:scaleY(.45) } 50% { transform:scaleY(1) } }
          @keyframes mseekShine { from { transform:translateX(-160%) skewX(-20deg) } to { transform:translateX(350%) skewX(-20deg) } }
          .mseek-wave span { animation:mseekWave 1.5s ease-in-out infinite; transform-origin:center; }
          .mseek-import-button { position:relative; overflow:hidden; }
          .mseek-import-button:after { content:""; position:absolute; inset:0; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); transform:translateX(-160%) skewX(-20deg); pointer-events:none; }
          .mseek-import-button:not(:disabled):hover:after { animation:mseekShine .85s ease-out; }
          @media(prefers-reduced-motion:reduce) { .mseek-wave span,.mseek-import-button:after { animation:none!important; } }
        `}</style>

        {/* HEADER */}
        <div
          className="relative shrink-0 overflow-hidden px-5 py-5 text-white sm:px-6"
          style={{ background: 'radial-gradient(ellipse at 85% 0%,#326FC0 0%,transparent 45%),linear-gradient(110deg,#123B7A 0%,#194D98 65%,#245DB5 100%)' }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-14 -top-24 h-56 w-56 rounded-full border border-[#E8C584]/20" />
            <div className="absolute -right-1 -top-12 h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#E8C584]/70 to-transparent" />
          </div>

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 sm:h-12 sm:w-12">
                <Mic2 size={22} strokeWidth={1.7} className="text-[#E8C584]" />
                <Sparkles size={11} className="absolute -right-1 -top-1 text-[#F4DCA7]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#E8C584]">MSEEK ACADEMY · IMPORT STUDIO</p>
                <h2 id="mseek-import-title" className="mt-1 text-[22px] font-black tracking-[-.035em] sm:text-[25px]">
                  Nhập dữ liệu <span className="text-[#E8C584]">Quiz</span>
                </h2>
                <p className="mt-1 text-[11px] leading-5 text-[#E1ECFF]">Tạo bài kiểm tra từ Excel hoặc Google Sheets.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20">
              <X size={18}/>
            </button>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">
              <ShieldCheck size={12} className="text-[#E8C584]"/> Kiểm tra trước khi lưu
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">
              <FileCheck2 size={12} className="text-[#E8C584]"/> Dữ liệu từ API
            </span>
            <div aria-hidden="true" className="mseek-wave ml-auto hidden h-5 items-center gap-[3px] sm:flex">
              {[8,14,19,11,17,9,15,20,12,17,8,13].map((h,i) => (
                <span key={i} style={{ height:h,animationDelay:`${i*.09}s` }} className="w-[3px] rounded-full bg-[#E8C584]"/>
              ))}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">

          {/* SOURCE */}
          <section className={cardClass}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#245DB5]"><CloudDownload size={16}/></span>
              <div>
                <h3 className={sectionTitle}>01 · Chọn nguồn dữ liệu</h3>
                <p className="mt-0.5 text-[10px] text-[#8194B0]">Lựa chọn phương thức nhập câu hỏi</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(['excel','google'] as const).map(s => {
                const active = source === s;
                const Icon = s === 'excel' ? FileSpreadsheet : CloudDownload;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSource(s)}
                    className={`group relative flex min-h-[88px] flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                      active ? 'border-[#245DB5] bg-[#EAF2FF] shadow-[0_4px_13px_rgba(36,93,181,.09)]' : 'border-[#DCE5F3] bg-[#FAFCFF] hover:border-[#9DBAE8]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-[#245DB5] text-white' : 'bg-[#EAF0FA] text-[#6483B3]'}`}><Icon size={17}/></span>
                      {active ? <CheckCircle2 size={17} className="text-[#245DB5]"/> : <span className="h-4 w-4 rounded-full border border-[#AFC1DD]"/>}
                    </div>
                    <div className="mt-2">
                      <p className={`text-[12px] font-extrabold ${active ? 'text-[#123B7A]' : 'text-[#405674]'}`}>{s === 'excel' ? 'Excel (.xlsx)' : 'Google Sheets'}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-[#7A8FAC]">{s === 'excel' ? 'Tải tệp từ máy tính · Tối đa 15 MB' : 'Nguồn dữ liệu cấu hình tại Backend'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* QUIZ INFORMATION */}
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#245DB5]"><BookOpen size={16}/></span>
              <div>
                <h3 className={sectionTitle}>02 · Thông tin bài kiểm tra</h3>
                <p className="mt-0.5 text-[10px] text-[#8194B0]">Thiết lập Quiz trước khi nhập dữ liệu</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[11px] font-bold text-[#526B91]">
                Khóa học · Course ID
                <input readOnly value={courseId} className={`${fieldClass} cursor-default bg-[#F0F4FA]`}/>
              </label>
              <label className="block text-[11px] font-bold text-[#526B91]">
                Bài học <span className="text-rose-500">*</span>
                <select value={lessonId} onChange={e => setLessonId(e.target.value)} className={fieldClass}>
                  <option value="">Chọn bài học để nhập Quiz</option>
                  {lessons.slice().sort((a,b) => a.lessonId-b.lessonId).map(lesson => (
                    <option key={lesson.lessonId} value={lesson.lessonId}>{lesson.title} (#{lesson.lessonId})</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-[11px] font-bold text-[#526B91]">
              Tên bài kiểm tra <span className="text-rose-500">*</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Kiểm tra kỹ năng dẫn chương trình" className={fieldClass}/>
            </label>

            {lessons.length === 0 && (
              <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0"/>
                Khóa học chưa có bài học phù hợp để import. Tạo bài học trước; Backend hiện chưa hỗ trợ import Quiz tổng khóa (LessonId rỗng).
              </div>
            )}
          </section>

          {/* FILE / GOOGLE SOURCE */}
          <section className={cardClass}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#245DB5]">
                {source === 'excel' ? <UploadCloud size={16}/> : <CloudDownload size={16}/>}
              </span>
              <div>
                <h3 className={sectionTitle}>03 · {source === 'excel' ? 'Tệp dữ liệu Excel' : 'Nguồn Google Sheets'}</h3>
                <p className="mt-0.5 text-[10px] text-[#8194B0]">{source === 'excel' ? 'Chọn hoặc kéo thả tệp để tiếp tục' : 'Sử dụng nguồn đã cấu hình trên Backend'}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {source === 'excel' ? (
                <motion.div key="excel" initial={reduce ? false : { opacity:0,y:7 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="relative">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={e => { e.preventDefault(); setDragging(false); }}
                    onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] || null); }}
                    className={`rounded-xl border-2 border-dashed transition-all duration-200 ${dragging ? 'border-[#245DB5] bg-[#EAF2FF]' : file ? 'border-[#A1BFEA] bg-[#F0F6FF]' : 'border-[#C5D6EF] bg-[#F8FAFF] hover:border-[#648FD1]'}`}
                  >
                    <input ref={fileInputRef} type="file" accept=".xlsx" className="sr-only" onChange={e => handleFile(e.target.files?.[0] || null)}/>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4EEFF] text-[#245DB5]">
                        {file ? <FileSpreadsheet size={22}/> : <UploadCloud size={22}/>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-all text-[12px] font-bold text-[#123B7A]">{file?.name || 'Chọn hoặc kéo thả file Excel vào đây'}</span>
                        <span className="mt-1 block text-[10px] text-[#7A90AF]">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Nhấn để thay đổi file` : 'Định dạng .xlsx · Dung lượng tối đa 15 MB'}</span>
                      </span>
                      <span className="hidden shrink-0 rounded-lg border border-[#C7D8F0] bg-white px-3 py-2 text-[10px] font-bold text-[#245DB5] sm:block">Chọn tệp</span>
                    </button>
                  </div>
                  {file && (
                    <button type="button" aria-label="Xóa file đã chọn" onClick={() => { handleFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute right-2 top-2 rounded-lg bg-white p-1.5 text-[#7185A3] hover:text-rose-600"><X size={14}/></button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="google" initial={reduce ? false : { opacity:0,y:7 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="flex gap-3 rounded-xl border border-[#D1E0F5] bg-[#F0F6FF] p-3.5">
                  <Info size={18} className="mt-0.5 shrink-0 text-[#245DB5]"/>
                  <div>
                    <p className="text-[11px] font-extrabold text-[#123B7A]">Google Sheets đã cấu hình trên Backend</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#607BA4]">
                      Backend đọc Spreadsheet cố định và liên kết câu hỏi theo <b>Lessons.LessonId / LessonTitle → LessonKey → Questions</b>. Chọn bài học và nhập tên Quiz, sau đó Preview. API hiện tại chưa hỗ trợ chọn Spreadsheet ID hoặc tab tùy ý.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ERROR */}
          <AnimatePresence>
            {error && (
              <motion.div role="alert" initial={reduce ? false : { opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[12px] leading-5 text-rose-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0"/>
                <div><p className="font-extrabold">Không thể hoàn tất thao tác</p><p className="mt-1">{error}</p></div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PREVIEW */}
          <AnimatePresence mode="wait">
            {preview && (
              <motion.section key="preview" initial={reduce ? false : { opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className={cardClass}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#245DB5]"><ShieldCheck size={19}/></span>
                  <div className="min-w-0 flex-1">
                    <h3 className={sectionTitle}>04 · Kết quả Preview</h3>
                    <p className="mt-0.5 text-[10px] text-[#8194B0]">Dữ liệu thực tế từ Backend</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${preview.canImport ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {preview.canImport ? 'Hợp lệ' : 'Cần kiểm tra'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-[#F2F6FD] p-3">
                    <p className="text-[10px] text-[#8194B0]">Câu hỏi</p>
                    <p className="mt-1 text-[19px] font-black text-[#245DB5]">{preview.questionCount}</p>
                  </div>
                  <div className="rounded-lg bg-[#F2F6FD] p-3">
                    <p className="text-[10px] text-[#8194B0]">Bài học</p>
                    <p className="mt-1 text-[13px] font-bold text-[#123B7A]">#{lessonId}</p>
                  </div>
                  <div className="rounded-lg bg-[#F2F6FD] p-3">
                    <p className="text-[10px] text-[#8194B0]">Trạng thái</p>
                    <p className={`mt-1 text-[11px] font-bold ${preview.canImport ? 'text-emerald-700' : 'text-rose-700'}`}>{preview.canImport ? 'Sẵn sàng nhập' : 'Chưa thể nhập'}</p>
                  </div>
                </div>

                <p className="mt-3 break-words text-[12px] text-[#526B91]">Quiz: <b className="text-[#123B7A]">{preview.quiz?.title || title}</b></p>
                <p className={`mt-2 text-[11px] font-semibold ${preview.canImport ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {preview.canImport ? 'Dữ liệu hợp lệ, có thể xác nhận.' : 'Dữ liệu chưa hợp lệ, không thể import.'}
                </p>

                {(preview.errors || []).length > 0 && (
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-rose-100 bg-rose-50 p-3">
                    <p className="text-[12px] font-extrabold text-rose-800">Các vấn đề cần xử lý</p>
                    {preview.errors.map((v,i) => (
                      <div key={i} className="flex gap-2 text-[11px] leading-5 text-rose-800">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
                        <span><b>{v.sheet || 'Dữ liệu'} · dòng {v.row || '-'}</b>: {v.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {preview.quiz?.questions && preview.quiz.questions.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-[12px] font-extrabold text-[#123B7A]">Chi tiết câu hỏi từ nguồn</h4>
                      <span className="rounded-full bg-[#EAF2FF] px-2.5 py-1 text-[10px] font-bold text-[#245DB5]">{preview.quiz.questions.length} câu</span>
                    </div>
                    <div className="space-y-2">
                      {preview.quiz.questions.map((q,i) => (
                        <div key={i} className="overflow-hidden rounded-xl border border-[#E1E9F5]">
                          <button type="button" aria-expanded={expanded.includes(i)} onClick={() => setExpanded(old => old.includes(i) ? old.filter(x => x !== i) : [...old,i])} className="flex w-full items-center gap-2.5 bg-[#F8FAFF] p-3 text-left transition hover:bg-[#EAF2FF]">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E4EEFF] text-[11px] font-extrabold text-[#245DB5]">{i+1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-[12px] font-semibold text-[#123B7A]">{q.questionText || '(Chưa có nội dung)'}</span>
                              <span className="mt-0.5 block text-[10px] text-[#8194B0]">{q.questionType} · {q.points ?? 0} điểm</span>
                            </span>
                            <ChevronDown size={15} className={`shrink-0 text-[#6483B3] transition-transform ${expanded.includes(i) ? 'rotate-180' : ''}`}/>
                          </button>
                          <AnimatePresence initial={false}>
                            {expanded.includes(i) && (
                              <motion.div initial={reduce ? false : { height:0,opacity:0 }} animate={{ height:'auto',opacity:1 }} exit={{ height:0,opacity:0 }} transition={{ duration:.2 }} className="overflow-hidden">
                                <div className="space-y-2.5 border-t border-[#E1E9F5] p-3 text-[11px] leading-5 text-[#526B91]">
                                  {q.instruction && <p><b className="text-[#123B7A]">Hướng dẫn:</b> {q.instruction}</p>}
                                  {q.explanation && <p><b className="text-[#123B7A]">Giải thích:</b> {q.explanation}</p>}
                                  {(q.choices || []).map((c,j) => (
                                    <div key={j} className={`flex items-start gap-2 rounded-lg border p-2 ${c.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[#E1E9F5] bg-[#FAFCFF]'}`}>
                                      <span className="font-bold">{j+1}.</span>
                                      <span className="min-w-0 flex-1 break-words">{c.choiceText}</span>
                                      {c.isCorrect && <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold"><Check size={12}/> Đáp án đúng</span>}
                                    </div>
                                  ))}
                                  <div className="flex flex-wrap gap-1.5 text-[10px] text-[#245DB5]">
                                    {([['Media',q.media],['ErrorRegions',q.errorRegions],['Annotations',q.annotations],['ArrangeItems',q.arrangeItems],['ScenarioNodes',q.scenarioNodes]] as const).map(([label,items]) =>
                                      (items?.length || 0) > 0 && <span key={label} className="rounded-md bg-[#EAF2FF] px-2 py-1">{label}: {items?.length}</span>
                                    )}
                                    {q.writingConfig != null && <span className="rounded-md bg-[#EAF2FF] px-2 py-1">WritingConfig: có</span>}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!preview.quiz && <p className="mt-3 rounded-lg bg-[#F2F6FD] p-3 text-[11px] text-[#7185A3]">BE không trả về Quiz chi tiết khi dữ liệu có lỗi. Xem danh sách lỗi phía trên rồi preview lại.</p>}

                {preview.canImport && preview.previewToken && (
                  <button type="button" disabled={busy} onClick={() => setConfirmOpen(true)} className="mseek-import-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#245DB5] px-4 py-3 text-[12px] font-bold text-white shadow-[0_5px_15px_rgba(36,93,181,.18)] transition hover:bg-[#194D98] disabled:opacity-50">
                    <CheckCircle2 size={16}/> Xác nhận import <ArrowRight size={15}/>
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* RESULT */}
          {result && (
            <motion.div initial={reduce ? false : { opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className={`rounded-xl border p-4 ${result.success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
              <div className={`flex items-center gap-2 text-[13px] font-extrabold ${result.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                {result.success ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
                {result.success ? 'Import đã hoàn tất' : 'Import chưa thành công'}
              </div>
              <p className={`mt-2 text-[11px] leading-5 ${result.success ? 'text-emerald-900' : 'text-rose-900'}`}>
                {result.message || `Trạng thái Google Sheets: ${result.sheetsSync || 'chưa xác định'}`}
              </p>
              {(result.sheetsSync === 'failed' || result.sheetsSync === 'blocked') && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-800">
                  Quiz đã lưu vào Database nhưng đồng bộ Google Sheets chưa hoàn tất. Kiểm tra trạng thái trước khi thử lại.
                </p>
              )}
            </motion.div>
          )}

          <div className="flex gap-2 rounded-xl border border-[#DCE7F6] bg-[#EAF2FF]/60 p-3">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#245DB5]"/>
            <p className="text-[10px] leading-[18px] text-[#607BA4]">
              <b className="text-[#123B7A]">Quy trình an toàn:</b> Hệ thống kiểm tra dữ liệu trước khi cho phép xác nhận. Backend sẽ xác minh lại preview token trước khi ghi dữ liệu.
            </p>
          </div>
        </div>

        {/* COMPACT FOOTER */}
        <div className="shrink-0 border-t border-[#DCE5F3] bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-extrabold text-[#123B7A]">Bước kiểm tra dữ liệu</p>
              <p className="mt-0.5 text-[10px] text-[#8194B0]">Preview không trực tiếp ghi dữ liệu Quiz</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(false)}
              className="mseek-import-button flex min-h-[43px] w-full items-center justify-center gap-2 rounded-xl bg-[#245DB5] px-4 text-[12px] font-bold text-white shadow-[0_5px_14px_rgba(36,93,181,.15)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#194D98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}
              {busy ? 'Đang xử lý...' : 'Kiểm tra & Preview dữ liệu'}
              {!busy && <ArrowRight size={15}/>}
            </button>
          </div>
        </div>

        {/* CONFIRM MODAL */}
        <AnimatePresence>
          {confirmOpen && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-[#071B3D]/65 p-4 backdrop-blur-sm">
              <motion.div
                initial={reduce ? false : { scale:.95,y:12,opacity:0 }}
                animate={{ scale:1,y:0,opacity:1 }}
                exit={reduce ? {} : { scale:.97,opacity:0 }}
                transition={{ type:'spring',stiffness:270,damping:25 }}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="mseek-confirm-title"
                className="w-full max-w-[370px] overflow-hidden rounded-[20px] bg-white shadow-2xl"
              >
                <div className="bg-[#194D98] px-5 py-5 text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#E8C584]"><ShieldCheck size={22}/></span>
                  <h3 id="mseek-confirm-title" className="mt-3 text-[19px] font-extrabold">Xác nhận nhập Quiz?</h3>
                  <p className="mt-1 text-[11px] text-[#D9E7FF]">Vui lòng kiểm tra trước khi hoàn tất.</p>
                </div>
                <div className="p-5">
                  <div className="flex gap-2.5 rounded-xl border border-[#E1E9F5] bg-[#F7F9FE] p-3">
                    <Info size={17} className="mt-0.5 shrink-0 text-[#245DB5]"/>
                    <p className="text-[11px] leading-5 text-[#526B91]">
                      Dữ liệu vừa preview sẽ được kiểm tra lại ở Backend trước khi ghi. <b className="text-[#123B7A]">Không thể hoàn tác tự động.</b>
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2.5">
                    <button type="button" disabled={busy} onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border border-[#DCE5F3] py-2.5 text-[12px] font-bold text-[#526B91] hover:bg-[#F7F9FE] disabled:opacity-50">Hủy</button>
                    <button type="button" disabled={busy} onClick={() => void run(true)} className="mseek-import-button flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#245DB5] py-2.5 text-[12px] font-bold text-white hover:bg-[#194D98] disabled:opacity-50">
                      {busy ? <LoaderCircle size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
                      {busy ? 'Đang lưu...' : 'Xác nhận'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}
