import {
  Mic,
  Send,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

interface Props {
  onSend: (
    blob: Blob,
    durationSeconds: number
  ) => Promise<void>;
}

const WAVE_BARS = [
  8, 15, 11, 21, 13, 25, 17, 10,
  20, 14, 24, 12, 18, 9, 22, 14,
];

export function VoiceRecorder({
  onSend,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sending, setSending] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = null;
  };

  const stop = (shouldSend: boolean) => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    clearTimer();

    recorder.onstop = async () => {
      const seconds = durationRef.current;
      const chunks = [...chunksRef.current];

      const mimeType =
        recorder.mimeType ||
        chunks[0]?.type ||
        "audio/webm";

      recorder.stream
        .getTracks()
        .forEach((track) => track.stop());

      try {
        if (
          shouldSend &&
          seconds >= 1 &&
          chunks.length > 0
        ) {
          const blob = new Blob(chunks, {
            type: mimeType,
          });

          if (blob.size > 0) {
            setSending(true);
            await onSend(blob, seconds);
          }
        }
      } catch (error) {
        console.error("Send voice error:", error);
      } finally {
        chunksRef.current = [];
        recorderRef.current = null;
        durationRef.current = 0;

        setDuration(0);
        setRecording(false);
        setSending(false);
      }
    };

    recorder.stop();
  };

  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Trình duyệt không hỗ trợ microphone."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      let recorder: MediaRecorder;

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
      } else if (
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
      } else {
        recorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      durationRef.current = 0;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      recorderRef.current = recorder;
      recorder.start(250);

      setDuration(0);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);

        if (durationRef.current >= 600) {
          const current = recorderRef.current;

          if (
            current &&
            current.state !== "inactive"
          ) {
            clearTimer();
            current.stop();
          }
        }
      }, 1000);
    } catch (error) {
      console.error("Microphone error:", error);

      alert(
        "Không thể sử dụng microphone. Hãy cấp quyền microphone cho trình duyệt."
      );
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();

      const recorder = recorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.onstop = null;
        recorder.stop();
      }

      recorder?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  if (!recording) {
    return (
      <button
        type="button"
        onClick={() => void start()}
        disabled={sending}
        title="Tin nhắn thoại"
        className="
          group flex h-10 w-10 shrink-0 items-center justify-center
          rounded-full text-slate-500 transition-all duration-250
          hover:-translate-y-0.5 hover:bg-indigo-50 hover:text-indigo-600
          active:scale-90 disabled:opacity-50
        "
      >
        <Mic
          size={20}
          className="transition-transform duration-200 group-hover:scale-110"
        />
      </button>
    );
  }

  return (
    <div
      className="
        absolute bottom-2 left-3 right-3 z-50
        flex h-[54px] items-center gap-3
        rounded-[22px] border border-red-100/80
        bg-white/95 px-2.5
        shadow-[0_14px_40px_-12px_rgba(15,23,42,.35)]
        backdrop-blur-xl
      "
      style={{
        animation: "voiceRecorderIn .3s cubic-bezier(.2,.9,.25,1.08)",
      }}
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
        <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
        <Mic size={17} className="relative" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex h-6 items-center gap-[3px] overflow-hidden">
          {WAVE_BARS.map((height, index) => (
            <span
              key={index}
              className="voice-wave-bar w-[3px] shrink-0 rounded-full bg-gradient-to-t from-red-400 to-rose-500"
              style={{
                height,
                animationDelay: `${index * 55}ms`,
              }}
            />
          ))}
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

          <span className="text-[10px] font-semibold tabular-nums text-red-500">
            {Math.floor(duration / 60)}:
            {String(duration % 60).padStart(2, "0")}
          </span>

          <span className="text-[10px] text-slate-400">
            Đang ghi âm
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => stop(false)}
        title="Hủy"
        className="
          flex h-9 w-9 shrink-0 items-center justify-center
          rounded-full text-slate-400 transition-all duration-200
          hover:bg-red-50 hover:text-red-500
          active:scale-90
        "
      >
        <Trash2 size={17} />
      </button>

      <button
        type="button"
        onClick={() => stop(true)}
        disabled={duration < 1 || sending}
        title="Gửi"
        className="
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
          text-white shadow-[0_8px_18px_rgba(79,70,229,.3)]
          transition-all duration-200
          hover:-translate-y-0.5 hover:scale-105
          active:scale-90 disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <Send size={17} />
      </button>
    </div>
  );
}