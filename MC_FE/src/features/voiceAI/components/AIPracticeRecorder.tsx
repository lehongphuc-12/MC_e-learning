import { useEffect, useRef, useState } from 'react';
import { toWav16k } from './audioToWav';

interface Props {
  onAudio: (file: File | null) => void;
  disabled?: boolean;
}

type RecorderStatus =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'converting';

export function AIPracticeRecorder({
  onAudio,
  disabled = false,
}: Props) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const statusRef = useRef<RecorderStatus>('idle');
  const generationRef = useRef(0);

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (next: RecorderStatus) => {
    statusRef.current = next;

    if (mountedRef.current) {
      setStatus(next);
    }
  };

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

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

  const startRecording = async () => {
    if (
      disabled ||
      statusRef.current !== 'idle'
    ) {
      return;
    }

    const generation = ++generationRef.current;

    updateStatus('starting');
    setError(null);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error('Microphone API không khả dụng.');
      }

      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Người dùng đã chuyển trang trong lúc cấp quyền micro.
      if (
        !mountedRef.current ||
        generation !== generationRef.current
      ) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = media;

      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);

      recorderRef.current = rec;

      rec.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      rec.onerror = () => {
        releaseMicrophone();

        if (
          !mountedRef.current ||
          generation !== generationRef.current
        ) {
          return;
        }

        recorderRef.current = null;
        updateStatus('idle');
        setError('Đã xảy ra lỗi khi ghi âm.');
      };

      rec.onstop = async () => {
        releaseMicrophone();

        if (
          !mountedRef.current ||
          generation !== generationRef.current
        ) {
          return;
        }

        updateStatus('converting');

        try {
          if (chunks.length === 0) {
            throw new Error('Bản ghi không có dữ liệu.');
          }

          const blob = new Blob(chunks, {
            type: rec.mimeType || 'audio/webm',
          });

          const file = await toWav16k(blob);

          if (
            mountedRef.current &&
            generation === generationRef.current
          ) {
            onAudio(file);
          }
        } catch (err) {
          console.error('Lỗi chuyển đổi WAV:', err);

          if (
            mountedRef.current &&
            generation === generationRef.current
          ) {
            setError(
              'Không thể chuyển bản ghi sang WAV. Hãy thử ghi âm lại.'
            );
          }
        } finally {
          if (
            mountedRef.current &&
            generation === generationRef.current
          ) {
            recorderRef.current = null;
            updateStatus('idle');
          }
        }
      };

      // Chỉ xóa bản ghi cũ khi đã có quyền micro.
      onAudio(null);

      rec.start(250);
      updateStatus('recording');
    } catch (err) {
      console.error('Không thể bắt đầu ghi âm:', err);

      releaseMicrophone();
      recorderRef.current = null;

      if (
        mountedRef.current &&
        generation === generationRef.current
      ) {
        updateStatus('idle');
        setError(
          'Không thể truy cập micro. Hãy kiểm tra quyền microphone của trình duyệt.'
        );
      }
    }
  };

  const stopRecording = () => {
    if (statusRef.current !== 'recording') {
      return;
    }

    const rec = recorderRef.current;

    if (!rec || rec.state !== 'recording') {
      return;
    }

    // Khóa thao tác ngay lập tức để tránh nhấn Dừng nhiều lần.
    updateStatus('stopping');

    try {
      rec.stop();
    } catch (err) {
      console.error('Không thể dừng ghi âm:', err);

      releaseMicrophone();
      recorderRef.current = null;
      updateStatus('idle');
      setError('Không thể dừng ghi âm. Vui lòng thử lại.');
    }
  };

  const busy =
    status === 'starting' ||
    status === 'stopping' ||
    status === 'converting';

  const buttonLabel = {
    idle: 'Bắt đầu ghi âm',
    starting: 'Đang mở microphone...',
    recording: 'Dừng ghi âm',
    stopping: 'Đang dừng ghi âm...',
    converting: 'Đang chuyển sang WAV...',
  }[status];

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy || (disabled && status !== 'recording')}
        onClick={
          status === 'recording'
            ? stopRecording
            : startRecording
        }
        className={`rounded-xl px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
          status === 'recording'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {buttonLabel}
      </button>

      {status === 'recording' && (
        <p className="text-sm font-medium text-red-600">
          Micro đang ghi âm. Nhấn "Dừng ghi âm" để hoàn tất.
        </p>
      )}

      {status === 'converting' && (
        <p className="text-sm text-slate-600">
          Đang xử lý âm thanh. Vui lòng chờ...
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}