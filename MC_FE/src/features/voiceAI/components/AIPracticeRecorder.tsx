import React, { useEffect, useRef, useState } from 'react';
import { toWav16k } from './audioToWav';

interface Props { onAudio: (file: File | null) => void; disabled?: boolean; }
export function AIPracticeRecorder({ onAudio, disabled = false }: Props) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => {
    alive.current = false;
    recorder.current?.state === 'recording' && recorder.current.stop();
    stream.current?.getTracks().forEach(t => t.stop());
  }, []);
  const start = async () => {
    setError(null); onAudio(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        media.getTracks().forEach(t => t.stop());
        if (!alive.current) return;
        setRecording(false); setConverting(true);
        try { const file = await toWav16k(new Blob(chunks, { type: rec.mimeType })); if (alive.current) onAudio(file); }
        catch { if (alive.current) setError('Không thể chuyển ghi âm sang WAV. Hãy tải tệp WAV/FLAC lên.'); }
        finally { if (alive.current) setConverting(false); }
      };
      rec.start(); setRecording(true);
    } catch { setError('Không thể truy cập micro. Hãy kiểm tra quyền truy cập.'); }
  };
  const stop = () => { if (recorder.current?.state === 'recording') recorder.current.stop(); };
  return <div className="space-y-2">
    <button type="button" disabled={disabled || converting} onClick={recording ? stop : start}
      className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
      {converting ? 'Đang chuyển âm thanh...' : recording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
    </button>
    {recording && <p className="text-sm text-red-600">Micro đang ghi âm...</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
