import { MessageCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useCall } from "../hooks/useCall";
import { CallScreen } from "./CallScreen";
import { ChatPanel } from "./ChatPanel";
import { IncomingCallModal } from "./IncomingCallModal";

interface Props {
  currentUser: {
    id: string;
    name: string;
  };
}

export function ChatWidget({ currentUser }: Props) {
  const [open, setOpen] = useState(false);
  const calls = useCall();

  if (!currentUser) return null;

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} calls={calls} />}

      {calls.incoming && (
        <IncomingCallModal
          call={calls.incoming}
          onAccept={calls.accept}
          onReject={calls.reject}
        />
      )}

      {calls.call && (
        <CallScreen
          call={calls.call}
          localVideoRef={calls.localVideoRef}
          remoteMediaRef={calls.remoteMediaRef}
          muted={calls.muted}
          cameraEnabled={calls.cameraEnabled}
          connected={calls.connected}
          calling={calls.calling}
          onMute={calls.toggleMute}
          onCamera={calls.toggleCamera}
          onEnd={calls.end}
        />
      )}

      <div className={`fixed bottom-5 right-5 z-[60] ${open ? "hidden md:block" : "block"}`}>
        {/* Glow phía sau */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-[22px] bg-blue-500/25 blur-xl transition-all duration-500 ${
            open ? "scale-75 opacity-30" : "scale-110 opacity-70 group-hover:opacity-100"
          }`}
        />

        {/* Ring lan tỏa khi chat đang đóng */}
        {!open && (
          <span
            className="pointer-events-none absolute inset-[5px] rounded-[18px] border border-blue-400/25"
            style={{ animation: "mseekLauncherRing 2.8s ease-out infinite" }}
          />
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Đóng khung chat" : "Mở khung chat"}
          className={`
            group relative flex h-[58px] items-center overflow-hidden rounded-[20px]
            border border-white/80 bg-white/90 p-[5px]
            shadow-[0_18px_45px_-15px_rgba(37,99,235,.48),0_8px_20px_-12px_rgba(15,23,42,.28)]
            ring-1 ring-slate-900/[0.05] backdrop-blur-2xl
            transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
            hover:-translate-y-1
            hover:shadow-[0_24px_55px_-16px_rgba(37,99,235,.58),0_12px_25px_-14px_rgba(15,23,42,.32)]
            active:translate-y-0 active:scale-[.96]
            focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/30
            ${open ? "w-[58px]" : "w-[58px] hover:w-[154px]"}
          `}
        >
          {/* nền kính */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white/95 to-blue-50/90" />

          {/* ánh sáng góc phải */}
          <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-blue-300/20 blur-2xl transition-all duration-500 group-hover:bg-indigo-300/25" />

          {/* ICON */}
          <span
            className={`
              relative z-10 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px]
              text-white transition-all duration-300
              ${
                open
                  ? "bg-slate-900 shadow-[0_8px_20px_-8px_rgba(15,23,42,.6)]"
                  : "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-[0_10px_24px_-8px_rgba(37,99,235,.75)]"
              }
            `}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

            {!open && (
              <span className="pointer-events-none absolute -left-4 -top-5 h-12 w-12 rounded-full bg-white/15 blur-xl" />
            )}

            <MessageCircle
              size={23}
              strokeWidth={2.25}
              className={`absolute transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${
                open ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />

            <X
              size={21}
              strokeWidth={2.4}
              className={`absolute transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${
                open ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
              }`}
            />
          </span>

          {/* LABEL chỉ hiện khi hover */}
          {!open && (
            <span className="relative z-10 flex min-w-[85px] items-center pl-2 pr-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <span className="min-w-0 text-left">
                <span className="flex items-center gap-1 text-[11px] font-bold tracking-[-0.15px] text-slate-900">
                  MSeek Chat
                  <Sparkles size={10} className="text-blue-500" />
                </span>

                <span className="mt-0.5 block whitespace-nowrap text-[8px] font-semibold text-emerald-600">
                  ● Đang hoạt động
                </span>
              </span>
            </span>
          )}

          {/* Online indicator */}
          {!open && (
            <span className="absolute left-[43px] top-[4px] z-20 flex h-[13px] w-[13px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-[13px] w-[13px] rounded-full border-[2.5px] border-white bg-emerald-500" />
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes mseekLauncherRing {
          0% {
            transform: scale(1);
            opacity: .45;
          }
          70%, 100% {
            transform: scale(1.45);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}