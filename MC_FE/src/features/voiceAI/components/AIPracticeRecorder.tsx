
import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  CheckCircle2,
  CircleAlert,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  Radio,
  ShieldCheck,
  Square,
  Volume2,
} from 'lucide-react';
import { toWav16k } from './audioToWav';

interface Props {
  onAudio: (file: File | null) => void;
  disabled?: boolean;
}

type RecorderStatus = 'idle' | 'starting' | 'recording' | 'stopping' | 'converting';

const WAVE_HEIGHTS = [14, 22, 32, 18, 38, 27, 45, 23, 34, 48, 29, 19, 42, 30, 17, 36, 46, 25, 39, 20, 31, 44, 24, 15, 35, 21, 40, 28, 17, 32, 23, 38];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function AIPracticeRecorder({ onAudio, disabled = false }: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const statusRef = useRef<RecorderStatus>('idle');
  const generationRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveBarsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const [level, setLevel] = useState(0);

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);

  const updateStatus = (next: RecorderStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    analyserRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) void context.close().catch(() => undefined);
    waveBarsRef.current.forEach((bar, i) => {
      if (bar) bar.style.height = `${Math.max(5, Math.round(WAVE_HEIGHTS[i] * 0.45))}px`;
    });
  };

  const startVisualizer = (stream: MediaStream) => {
    if (typeof window.AudioContext === 'undefined') return;
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;
      const tick = (now: number) => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const volume = Math.min(1, (sum / data.length) / 95);
        waveBarsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const sample = data[Math.min(data.length - 1, Math.floor(i / WAVE_HEIGHTS.length * data.length))] / 255;
          bar.style.height = `${Math.round(5 + Math.min(1, sample * 1.9 + volume * 0.3) * 35)}px`;
        });
        if (now - lastUpdate > 100) {
          setLevel(Math.round(volume * 100));
          lastUpdate = now;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // Visualization is optional; microphone recording must still work.
    }
  };

  const releaseMicrophone = () => {
    stopVisualizer();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      const current = recorderRef.current;
      if (current && current.state !== 'inactive') {
        current.onstop = null;
        current.ondataavailable = null;
        current.onerror = null;
        try {
          current.stop();
        } catch {
          // Recorder có thể đã tự dừng.
        }
      }
      recorderRef.current = null;
      releaseMicrophone();
    };
  }, []);

  useEffect(() => {
    if (status !== 'recording') return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [status]);

  const startRecording = async () => {
    if (disabled || statusRef.current !== 'idle') return;

    const generation = ++generationRef.current;
    updateStatus('starting');
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API không khả dụng.');
      }

      const media = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!mountedRef.current || generation !== generationRef.current) {
        media.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = media;
      startVisualizer(media);
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);
      recorderRef.current = rec;

      rec.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      rec.onerror = () => {
        releaseMicrophone();
        if (!mountedRef.current || generation !== generationRef.current) return;
        recorderRef.current = null;
        startedAtRef.current = null;
        updateStatus('idle');
        setError('Đã xảy ra lỗi khi ghi âm. Vui lòng thử lại.');
      };

      rec.onstop = async () => {
        releaseMicrophone();
        startedAtRef.current = null;

        if (!mountedRef.current || generation !== generationRef.current) return;

        updateStatus('converting');

        try {
          if (chunks.length === 0) {
            throw new Error('Bản ghi không có dữ liệu.');
          }

          const blob = new Blob(chunks, {
            type: rec.mimeType || 'audio/webm',
          });

          const file = await toWav16k(blob);

          if (mountedRef.current && generation === generationRef.current) {
            onAudio(file);
            setHasRecording(true);
          }
        } catch (err) {
          console.error('Lỗi chuyển đổi WAV:', err);
          if (mountedRef.current && generation === generationRef.current) {
            setError('Không thể chuyển bản ghi sang WAV. Hãy thử ghi âm lại.');
          }
        } finally {
          if (mountedRef.current && generation === generationRef.current) {
            recorderRef.current = null;
            updateStatus('idle');
          }
        }
      };

      rec.start(250);
      onAudio(null);
      setHasRecording(false);
      setDuration(0);
      startedAtRef.current = Date.now();
      updateStatus('recording');
    } catch (err) {
      console.error('Không thể bắt đầu ghi âm:', err);
      releaseMicrophone();
      recorderRef.current = null;

      if (mountedRef.current && generation === generationRef.current) {
        startedAtRef.current = null;
        updateStatus('idle');
        setError('Không thể truy cập micro. Hãy kiểm tra quyền microphone của trình duyệt.');
      }
    }
  };

  const stopRecording = () => {
    if (statusRef.current !== 'recording') return;

    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;

    updateStatus('stopping');

    try {
      rec.stop();
    } catch (err) {
      console.error('Không thể dừng ghi âm:', err);
      releaseMicrophone();
      recorderRef.current = null;
      startedAtRef.current = null;
      updateStatus('idle');
      setError('Không thể dừng ghi âm. Vui lòng thử lại.');
    }
  };

  const isRecording = status === 'recording';
  const isBusy = status === 'starting' || status === 'stopping' || status === 'converting';

  const statusLabel: Record<RecorderStatus, string> = {
    idle: hasRecording ? 'Đã ghi âm thành công' : 'Sẵn sàng ghi âm',
    starting: 'Đang kết nối microphone',
    recording: 'Đang ghi âm',
    stopping: 'Đang hoàn tất bản ghi',
    converting: 'Đang xử lý âm thanh',
  };

  const buttonLabel: Record<RecorderStatus, string> = {
    idle: hasRecording ? 'Ghi âm lại' : 'Bắt đầu ghi âm',
    starting: 'Đang mở microphone...',
    recording: 'Dừng ghi âm',
    stopping: 'Đang dừng ghi âm...',
    converting: 'Đang chuyển sang WAV...',
  };

  return (
    <section className="w-full text-[#102344]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#2563eb]/20 text-[#93b9ff] transition-all duration-300 hover:scale-105">
            <Mic size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Thu âm giọng nói</h3>
            <p className="text-[11px] text-[#9db2d6]">Studio · WAV 16 kHz</p>
          </div>
        </div>
        <span role="status" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
          isRecording ? 'border-rose-400/30 bg-rose-500/15 text-rose-200' :
          hasRecording && status === 'idle' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200' :
          'border-white/10 bg-white/5 text-[#c5d5ef]'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isRecording ? 'animate-pulse bg-rose-400' : hasRecording ? 'bg-emerald-400' : 'bg-[#84a9ec]'}`} />
          {statusLabel[status]}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 py-5 sm:flex-row sm:justify-between sm:gap-6">
        <div className="flex items-center gap-4">
          <div className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border transition-all duration-300 ${isRecording ? "border-rose-400/60 bg-rose-500/20 text-rose-300 shadow-[0_0_26px_rgba(244,63,94,.22)]" : "border-[#6389d4]/30 bg-[#244577] text-[#9fc3ff]"}`}>
            {isRecording && <span className="absolute inset-0 animate-ping rounded-2xl border border-rose-400/30" />}
            {isBusy ? <Loader2 size={25} className="animate-spin" /> : isRecording ? <Radio size={25} className="text-rose-300" /> : hasRecording ? <CheckCircle2 size={25} className="text-emerald-300" /> : <Mic size={25} />}
          </div>
          <div>
            <div className="font-mono text-[28px] font-extrabold tabular-nums tracking-tight text-white">{formatDuration(duration)}</div>
            <p className="text-[11px] text-[#a5b8d8]">{isRecording ? `Đang thu âm · Âm lượng ${level}%` : hasRecording ? 'Bản ghi đã sẵn sàng' : 'Sẵn sàng bắt đầu'}</p>
          </div>
        </div>
        <div ref={waveformRef} aria-hidden="true" className="flex h-11 max-w-[240px] flex-1 items-center justify-center gap-[3px] overflow-hidden">
          {WAVE_HEIGHTS.map((height, index) => (
            <span key={index} ref={el => { waveBarsRef.current[index] = el; }} className={`w-[3px] shrink-0 rounded-full transition-[background-color] duration-300 ${isRecording ? 'bg-[#79adff]' : 'bg-[#466ca9]'}`}
              style={{height: `${Math.max(5, Math.round(height * 0.65))}px`, animationDelay: `${(index % 8) * 90}ms`}} />
          ))}
        </div>
        <button type="button" disabled={isBusy || (disabled && !isRecording)}
          onClick={isRecording ? stopRecording : startRecording}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_6px_18px_rgba(21,89,255,.22)] transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${isRecording ? 'bg-rose-500' : 'bg-[#1559ff]'}`}>
          {isBusy ? <Loader2 size={17} className="animate-spin" /> : isRecording ? <Square size={15} fill="currentColor" /> : <Mic size={17} />}
          {buttonLabel[status]}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[11px] text-[#a8bcdf]">
        <span className="inline-flex items-center gap-1.5"><Headphones size={13} /> Nơi yên tĩnh</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Chuẩn hóa WAV 16 kHz</span>
        <span className="inline-flex items-center gap-1.5"><Volume2 size={13} /> Nói rõ, đều giọng</span>
      </div>
      {hasRecording && status === 'idle' && !error && <p role="status" className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">Ghi âm hoàn tất. Bạn có thể gửi phân tích AI hoặc ghi lại.</p>}
      {isBusy && <p role="status" className="mt-3 text-xs text-[#a9c6ff]">{status === 'starting' ? 'Đang kết nối microphone...' : status === 'stopping' ? 'Đang hoàn tất bản ghi...' : 'Đang chuyển âm thanh sang WAV...'}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
    </section>
  );
}
