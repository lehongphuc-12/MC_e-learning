import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { courseSyllabusApi, type SyllabusVersion } from '../api/courseSyllabusApi';

interface Props {
  courseId: number;
  version: Pick<SyllabusVersion, 'syllabusVersionId' | 'contentType' | 'versionNumber'>;
  className?: string;
}

/** Fetches authorized content through the API; no storage URL is exposed to the browser. */
export function CourseSyllabusDocumentViewer({ courseId, version, className = '' }: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setLoading(true);
    setError(null);
    setSource(null);
    courseSyllabusApi.getPreview(courseId, version.syllabusVersionId)
      .then(async (blob) => {
        if (!active) return;
        if (version.contentType === 'application/pdf') {
          objectUrl = URL.createObjectURL(blob);
          setSource(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`);
        } else {
          objectUrl = URL.createObjectURL(new Blob([await blob.text()], { type: 'text/html' }));
          setSource(objectUrl);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Không thể mở syllabus.'))
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [courseId, version.syllabusVersionId, version.contentType]);

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {loading ? (
        <div className="flex h-80 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải tài liệu…</div>
      ) : error ? (
        <div role="alert" className="flex h-80 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-rose-600"><FileText className="h-8 w-8" />{error}</div>
      ) : source ? (
        <iframe title={`Syllabus phiên bản ${version.versionNumber}`} src={source} className="h-[min(72vh,850px)] w-full bg-white" sandbox="allow-same-origin" />
      ) : null}
    </div>
  );
}
