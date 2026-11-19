import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, X } from 'lucide-react';
import { courseSyllabusApi, type SyllabusVersion } from '../../api/courseSyllabusApi';
import { CourseSyllabusDocumentViewer } from '../CourseSyllabusDocumentViewer';

interface Props {
  isOpen: boolean;
  courseId: number;
  courseTitle: string;
  onClose: () => void;
}

const statusLabels: Record<SyllabusVersion['reviewStatus'], string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Đang chờ Admin duyệt',
  APPROVED: 'Đã được Admin duyệt',
  REJECTED: 'Cần chỉnh sửa',
};

export function InstructorSyllabusModal({ isOpen, courseId, courseTitle, onClose }: Props) {
  const [version, setVersion] = useState<SyllabusVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);
    setVersion(null);
    courseSyllabusApi.getCurrent(courseId)
      .then((current) => { if (active) setVersion(current); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được syllabus.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog" aria-modal="true" aria-labelledby="instructor-syllabus-title"
            className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <header className="flex items-start gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4 sm:px-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><FileText size={21} /></span>
              <div className="min-w-0 flex-1">
                <h2 id="instructor-syllabus-title" className="text-lg font-extrabold text-slate-900">Đề cương khóa học</h2>
                <p className="mt-1 truncate text-sm text-slate-500">{courseTitle}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Đóng cửa sổ đề cương" className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"><X size={20} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-medium text-slate-500"><Loader2 className="animate-spin" size={19} /> Đang tải syllabus…</div>
              ) : error ? (
                <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700"><AlertCircle size={28} /><p>{error}</p></div>
              ) : !version ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm"><FileText size={26} /></span>
                  <div><h3 className="font-bold text-slate-800">Chưa có syllabus cho khóa học này</h3><p className="mt-1 max-w-md text-sm text-slate-500">Bạn có thể thêm file PDF hoặc DOCX trong trang chỉnh sửa thông tin khóa học.</p></div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700"><FileText size={19} /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{version.originalFileName}</p><p className="mt-0.5 text-xs text-slate-500">Phiên bản v{version.versionNumber} · {(version.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</p></div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${version.reviewStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : version.reviewStatus === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {version.reviewStatus === 'APPROVED' ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{statusLabels[version.reviewStatus]}
                    </span>
                  </div>
                  {version.reviewNote && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Ghi chú duyệt:</strong> {version.reviewNote}</p>}
                  <CourseSyllabusDocumentViewer courseId={courseId} version={version} />
                </>
              )}
            </div>

            <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-7">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Đóng</button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
