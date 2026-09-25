import { MessageCircle, X } from "lucide-react";
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

  if (!currentUser) {
    return null;
  }

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

      {/* Ẩn trên mobile khi panel đang mở (panel đã full-screen + có nút X riêng). */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Đóng khung chat" : "Mở khung chat"}
        className={`
          group fixed bottom-5 right-5 z-40
          flex items-center justify-center
          rounded-full text-white
          transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
          hover:-translate-y-1 hover:scale-105
          active:scale-90
          focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/60
          ${open ? "hidden md:flex" : "flex"}
        `}
        style={{
          width: 60,
          height: 60,
          background:
            "linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%)",
          animation: open ? "none" : "fabGlow 2.8s ease-in-out infinite",
        }}
      >
        {/* vòng lan tỏa nhẹ khi đang đóng */}
        {!open && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-indigo-500/40"
            style={{ animation: "fabRing 2.8s ease-out infinite" }}
          />
        )}

        {/* highlight kính phía trên */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 55%)",
          }}
        />

        {/* ánh sáng khi hover */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,.3) 0%, transparent 70%)",
          }}
        />

        <span className="relative flex h-full w-full items-center justify-center">
          <MessageCircle
            size={26}
            strokeWidth={2.2}
            className={`absolute transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${
              open
                ? "-rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <X
            size={25}
            strokeWidth={2.4}
            className={`absolute transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${
              open
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0"
            }`}
          />
        </span>

        {!open && (
          <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              style={{ animation: "onlinePulse 2s ease-out infinite" }}
            />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        )}
      </button>
    </>
  );
}