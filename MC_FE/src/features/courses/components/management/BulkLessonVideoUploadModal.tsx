import React, { useMemo, useState } from 'react';
import { CheckCircle2, CloudUpload, Film, Loader2, X } from 'lucide-react';
import { lessonApi } from '../../api/lessonApi';
import type { Lesson } from '../../types/lessonTypes';

type UploadState = { progress: number; status: 'ready' | 'uploading' | 'done' | 'error'; error?: string };

interface Props {
  courseId: number;
  lessons: Lesson[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => Promise<unknown> | void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const getVideoContentType = (file: File) => {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpeg: 'video/mpeg', mpg: 'video/mpeg',
  };
  return byExtension[extension ?? ''] ?? file.type;
};

export const BulkLessonVideoUploadModal: React.FC<Props> = ({ courseId, lessons, isOpen, onClose, onComplete }) => {
  const [filesByLesson, setFilesByLesson] = useState<Record<number, File>>({});
  const [availableFiles, setAvailableFiles] = useState<File[]>([]);
  const [states, setStates] = useState<Record<number, UploadState>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState('');

  const videoLessons = useMemo(() => lessons
    .filter((lesson) => lesson.lessonType !== 'ASSIGNMENT' && lesson.lessonType !== 'QUIZ')
    .sort((a, b) => a.orderIndex - b.orderIndex), [lessons]);

  if (!isOpen) return null;

  const setFile = (lessonId: number, file?: File) => {
    if (file && file.size > MAX_FILE_SIZE) {
      setNotice(`“${file.name}” vượt quá giới hạn 500 MB.`);
      return;
    }
    setNotice('');
    setFilesByLesson((current) => {
      const next = { ...current };
      if (file) {
        // A video is assigned to only one lesson in this batch.
        for (const [key, existing] of Object.entries(next)) if (existing === file) delete next[Number(key)];
        next[lessonId] = file;
      } else delete next[lessonId];
      return next;
    });
    setStates((current) => ({ ...current, [lessonId]: { status: 'ready', progress: 0 } }));
  };

  const upload = async (lessonIds: number[]) => {
    const selected = lessonIds.map((lessonId) => ({ lessonId, file: filesByLesson[lessonId] })).filter((item): item is { lessonId: number; file: File } => !!item.file);
    if (!selected.length) {
      setNotice('Hãy chọn video và ghép với bài học trước khi tải lên.');
      return;
    }
    if (selected.length > 30) {
      setNotice('Mỗi đợt hỗ trợ tối đa 30 video.');
      return;
    }
    const duplicateNames = new Set<string>();
    const seenNames = new Set<string>();
    selected.forEach(({ file }) => {
      const name = file.name.toLocaleLowerCase();
      if (seenNames.has(name)) duplicateNames.add(name);
      seenNames.add(name);
    });
    if (duplicateNames.size) {
      setNotice('Có nhiều tệp trùng tên. Hãy đổi tên để dễ đối chiếu trước khi tải.');
      return;
    }

    setIsUploading(true);
    setNotice('');
    setStates((current) => Object.fromEntries([...Object.entries(current), ...selected.map(({ lessonId }) => [lessonId, { status: 'uploading', progress: 0 }])]) as Record<number, UploadState>);
    let successCount = 0;
    const failures: string[] = [];
    try {
      const sessions = await lessonApi.createVideoUploadSessions(courseId, selected.map(({ lessonId, file }) => ({
        lessonId, fileName: file.name, contentType: getVideoContentType(file), size: file.size,
      })));
      let cursor = 0;
      const worker = async () => {
        while (cursor < sessions.length) {
          const session = sessions[cursor++];
          const file = selected.find((item) => item.lessonId === session.lessonId)?.file;
          if (!file) continue;
          try {
            await lessonApi.uploadVideoDirect(session.uploadUrl, session.contentType, file, (progress) => {
              setStates((current) => ({ ...current, [session.lessonId]: { status: 'uploading', progress } }));
            });
            await lessonApi.completeVideoUploadSession(courseId, session.sessionId);
            successCount++;
            setStates((current) => ({ ...current, [session.lessonId]: { status: 'done', progress: 100 } }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải video.';
            failures.push(message);
            setStates((current) => ({ ...current, [session.lessonId]: { status: 'error', progress: 0, error: message } }));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(2, sessions.length) }, worker));
      if (successCount) await onComplete();
      setNotice(failures.length
        ? `Đã tải ${successCount}/${selected.length} video. Video lỗi có thể chọn lại rồi tải tiếp.`
        : `Đã tải và gắn thành công ${successCount} video.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể khởi tạo phiên tải video.');
      setStates((current) => Object.fromEntries(selected.map(({ lessonId }) => [lessonId, { status: 'error', progress: 0, error: 'Phiên tải không được tạo.' }])) as Record<number, UploadState>);
    } finally {
      setIsUploading(false);
    }
  };

  const assignedCount = Object.keys(filesByLesson).length;
  const failedIds = videoLessons.filter((lesson) => states[lesson.lessonId]?.status === 'error' && filesByLesson[lesson.lessonId]).map((lesson) => lesson.lessonId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bulk-video-title">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div><div className="mb-2 inline-flex rounded-xl bg-blue-50 p-2 text-blue-600"><CloudUpload size={20}/></div><h2 id="bulk-video-title" className="text-xl font-bold text-slate-900">Tải video hàng loạt</h2><p className="mt-1 text-sm text-slate-500">Ghép từng tệp với bài học. Video được tải trực tiếp lên R2 riêng tư.</p></div>
          <button disabled={isUploading} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40" aria-label="Đóng"><X size={20}/></button>
        </div>
        <div className="grid grid-cols-[1fr_1.1fr] gap-5 overflow-y-auto p-6">
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center hover:bg-blue-50">
            <Film className="mb-3 text-blue-600" size={28}/><span className="font-semibold text-slate-800">Chọn nhiều video từ thiết bị</span><span className="mt-1 text-xs text-slate-500">MP4/WebM/MOV · tối đa 500 MB mỗi tệp</span>
            <input type="file" accept="video/*" multiple disabled={isUploading} className="sr-only" onChange={(event) => {
              const available = videoLessons.filter((lesson) => !filesByLesson[lesson.lessonId]);
              const chosen = Array.from(event.target.files ?? []);
              setAvailableFiles((current) => [...current, ...chosen]);
              chosen.forEach((file, index) => { if (available[index]) setFile(available[index].lessonId, file); });
              if (chosen.length > available.length) setNotice(`Đã chọn ${available.length}/${chosen.length} tệp; hãy chọn thêm bài học hoặc bỏ bớt tệp.`);
              event.currentTarget.value = '';
            }}/>
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-800">Cách ghép tệp</p><ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600"><li>Chọn nhiều video ở khung bên trái.</li><li>Chọn đúng tệp trong danh sách của từng bài.</li><li>Bấm tải lên; tối đa 2 video được truyền đồng thời.</li></ol><p className="mt-3 text-xs text-slate-500">Tệp được chọn tự động gợi ý theo thứ tự bài học; hãy kiểm tra lại trước khi tải.</p></div>
          <div className="col-span-2 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Bài học</span><span>Video được ghép</span><span>Tiến độ</span></div>
            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {videoLessons.map((lesson) => {
                const state = states[lesson.lessonId]; const file = filesByLesson[lesson.lessonId];
                return <div key={lesson.lessonId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] items-center gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{lesson.orderIndex}. {lesson.title}</p><p className="text-xs text-slate-400">{lesson.hasVideo ? 'Đã có video · tải lên sẽ thay video hiện tại' : 'Chưa có video'}</p></div>
                  <select disabled={isUploading} value={file ? `${file.name}:${file.size}:${file.lastModified}` : ''} onChange={(event) => {
                    const selected = availableFiles.find((candidate) => `${candidate.name}:${candidate.size}:${candidate.lastModified}` === event.target.value);
                    setFile(lesson.lessonId, selected);
                  }} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="">Chọn tệp…</option>{availableFiles.map((candidate) => <option key={`${candidate.name}:${candidate.size}:${candidate.lastModified}`} value={`${candidate.name}:${candidate.size}:${candidate.lastModified}`}>{candidate.name}</option>)}</select>
                  <div className="text-xs">{state?.status === 'done' ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14}/> Xong</span> : state?.status === 'uploading' ? <span className="flex items-center gap-1 text-blue-600"><Loader2 className="animate-spin" size={14}/>{state.progress}%</span> : state?.status === 'error' ? <span title={state.error} className="text-red-600">Lỗi</span> : <span className="text-slate-400">—</span>}</div>
                </div>;
              })}
              {videoLessons.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Khóa học chưa có bài học phù hợp để gắn video.</p>}
            </div>
          </div>
        </div>
        {notice && <p className="mx-6 mb-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">{notice}</p>}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4"><span className="text-sm text-slate-500">Đã ghép {assignedCount} bài học</span><div className="flex gap-2"><button disabled={isUploading} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Đóng</button>{failedIds.length > 0 ? <button disabled={isUploading} onClick={() => void upload(failedIds)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isUploading ? 'Đang tải…' : 'Tải lại video lỗi'}</button> : null}<button disabled={isUploading || assignedCount === 0} onClick={() => void upload(videoLessons.filter((lesson) => filesByLesson[lesson.lessonId] && states[lesson.lessonId]?.status !== 'done').map((lesson) => lesson.lessonId))} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isUploading && <Loader2 className="animate-spin" size={16}/>} {isUploading ? 'Đang tải…' : 'Tải video lên'}</button></div></div>
      </div>
    </div>
  );
};
