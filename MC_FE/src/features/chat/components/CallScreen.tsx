import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { ReactNode, RefObject } from "react";
import { Call } from "../types/chatTypes";

interface Props {
  call: Call;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteMediaRef: RefObject<HTMLMediaElement | null>;
  muted: boolean;
  cameraEnabled: boolean;
  connected: boolean;
  calling: boolean;
  onMute: () => void;
  onCamera: () => void;
  onEnd: () => void;
}

interface ControlButtonProps {
  active?: boolean;
  danger?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function ControlButton({
  active = true,
  danger = false,
  label,
  onClick,
  children,
}: ControlButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`
          group relative flex h-14 w-14 items-center justify-center
          overflow-hidden rounded-full border transition-all duration-300
          ease-[cubic-bezier(.2,.8,.2,1)]
          hover:-translate-y-1 hover:scale-105 active:scale-90
          ${
            danger
              ? "border-red-400/30 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_12px_32px_rgba(239,68,68,.35)]"
              : active
                ? "border-white/15 bg-white/15 text-white shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur-xl hover:bg-white/25"
                : "border-white/80 bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,.25)]"
          }
        `}
      >
        <span className="pointer-events-none absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
        <span className="relative">{children}</span>
      </button>

      <span className="text-[11px] font-medium text-white/60">
        {label}
      </span>
    </div>
  );
}

export function CallScreen({
  call,
  localVideoRef,
  remoteMediaRef,
  muted,
  cameraEnabled,
  connected,
  calling,
  onMute,
  onCamera,
  onEnd,
}: Props) {
  const isVideo = call.callType.toUpperCase() === "VIDEO";

  const name =
    call.receiverName ||
    call.callerName ||
    "Người dùng";

  const avatar =
    call.receiverAvatarUrl ||
    call.callerAvatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden bg-[#050816] text-white"
      style={{ animation: "callScreenIn .35s cubic-bezier(.2,.8,.2,1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="call-orb call-orb-a" />
        <div className="call-orb call-orb-b" />
        <div className="call-orb call-orb-c" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,.25)_55%,rgba(2,6,23,.8)_100%)]" />
      </div>

      {isVideo ? (
        <>
          <video
            ref={remoteMediaRef as RefObject<HTMLVideoElement | null>}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />

          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm">
              <AvatarPulse avatar={avatar} name={name} />

              <h2 className="mt-6 text-2xl font-bold tracking-tight">
                {name}
              </h2>

              <CallingStatus
                connected={connected}
                calling={calling}
              />
            </div>
          )}

          <div
            className="absolute right-5 top-5 overflow-hidden rounded-[24px] border border-white/20 bg-slate-900/80 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-xl"
            style={{
              animation: "localVideoIn .5s cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-44 w-32 object-cover"
            />

            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <VideoOff size={25} className="text-white/50" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/10" />
          </div>

          {connected && (
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              <span className="text-xs font-medium text-white/80">
                Đã kết nối
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center px-6">
          <div className="absolute left-1/2 top-[18%] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />

          <AvatarPulse avatar={avatar} name={name} />

          <h2 className="relative mt-8 text-center text-[28px] font-bold tracking-tight">
            {name}
          </h2>

          <CallingStatus
            connected={connected}
            calling={calling}
          />

          <audio
            ref={remoteMediaRef as RefObject<HTMLAudioElement | null>}
            autoPlay
          />
        </div>
      )}

      <div
        className="
          absolute bottom-7 left-1/2 flex -translate-x-1/2
          items-center gap-5 rounded-[30px] border border-white/10
          bg-black/25 px-6 py-4
          shadow-[0_24px_70px_rgba(0,0,0,.35)]
          backdrop-blur-2xl
        "
        style={{
          animation: "callControlsIn .5s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <ControlButton
          active={!muted}
          label={muted ? "Bật mic" : "Tắt mic"}
          onClick={onMute}
        >
          {muted ? <MicOff size={21} /> : <Mic size={21} />}
        </ControlButton>

        {isVideo && (
          <ControlButton
            active={cameraEnabled}
            label={cameraEnabled ? "Tắt camera" : "Bật camera"}
            onClick={onCamera}
          >
            {cameraEnabled ? (
              <Video size={21} />
            ) : (
              <VideoOff size={21} />
            )}
          </ControlButton>
        )}

        <ControlButton
          danger
          label="Kết thúc"
          onClick={onEnd}
        >
          <PhoneOff size={23} />
        </ControlButton>
      </div>
    </div>
  );
}

function AvatarPulse({
  avatar,
  name,
}: {
  avatar: string;
  name: string;
}) {
  return (
    <div className="relative">
      <span className="call-avatar-ring call-avatar-ring-1" />
      <span className="call-avatar-ring call-avatar-ring-2" />
      <span className="call-avatar-ring call-avatar-ring-3" />

      <div className="relative rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-600 p-[3px] shadow-[0_25px_80px_rgba(79,70,229,.4)]">
        <img
          src={avatar}
          alt={name}
          className="h-36 w-36 rounded-full border-[5px] border-[#090d1c] object-cover"
        />
      </div>
    </div>
  );
}

function CallingStatus({
  connected,
  calling,
}: {
  connected: boolean;
  calling: boolean;
}) {
  return (
    <div className="mt-3 flex min-h-6 items-center justify-center gap-2 text-sm text-white/55">
      {connected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Đã kết nối
        </>
      ) : (
        <>
          <span className="flex items-end gap-1">
            {[0, 1, 2, 3].map((item) => (
              <span
                key={item}
                className="call-wave h-3 w-1 rounded-full bg-indigo-400"
                style={{
                  animationDelay: `${item * 120}ms`,
                }}
              />
            ))}
          </span>

          {calling ? "Đang gọi..." : "Đang kết nối..."}
        </>
      )}
    </div>
  );
}