import { Phone, PhoneOff, Video } from "lucide-react";
import { Call } from "../types/chatTypes";

interface Props {
  call: Call;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  call,
  onAccept,
  onReject,
}: Props) {
  const isVideo = call.callType.toUpperCase() === "VIDEO";

  const avatar =
    call.callerAvatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      call.callerName
    )}`;

  return (
    <div
      className="
        fixed inset-0 z-[100] flex items-center justify-center
        overflow-hidden bg-slate-950/65 p-4 backdrop-blur-xl
      "
      style={{
        animation: "fadeIn .25s ease-out",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="incoming-orb incoming-orb-a" />
        <div className="incoming-orb incoming-orb-b" />
      </div>

      <div
        className="
          relative w-full max-w-[360px] overflow-hidden
          rounded-[34px] border border-white/50
          bg-white/90 px-7 pb-7 pt-8 text-center
          shadow-[0_35px_100px_-20px_rgba(15,23,42,.55)]
          backdrop-blur-2xl
        "
        style={{
          animation: "incomingCardIn .45s cubic-bezier(.2,.9,.25,1.08)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-50/90 to-transparent" />

        <div className="relative mx-auto w-fit">
          <span className="incoming-ring incoming-ring-one" />
          <span className="incoming-ring incoming-ring-two" />

          <div className="relative rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 p-[3px] shadow-[0_18px_45px_rgba(79,70,229,.3)]">
            <img
              src={avatar}
              alt={call.callerName}
              className="h-24 w-24 rounded-full border-4 border-white object-cover"
            />
          </div>

          <div
            className="
              absolute -bottom-1 -right-1 flex h-9 w-9
              items-center justify-center rounded-full
              border-4 border-white bg-indigo-600 text-white shadow-lg
            "
          >
            {isVideo ? <Video size={15} /> : <Phone size={15} />}
          </div>
        </div>

        <h3 className="relative mt-6 text-[22px] font-bold tracking-tight text-slate-900">
          {call.callerName}
        </h3>

        <div className="relative mt-2 flex items-center justify-center gap-2 text-[13px] font-medium text-slate-500">
          <span className="flex items-end gap-[3px]">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className="call-wave h-3 w-[3px] rounded-full bg-indigo-500"
                style={{
                  animationDelay: `${item * 130}ms`,
                }}
              />
            ))}
          </span>

          Cuộc gọi {isVideo ? "video" : "thoại"} đến
        </div>

        <div className="relative mt-9 flex items-start justify-center gap-16">
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={onReject}
              aria-label="Từ chối"
              className="
                flex h-[60px] w-[60px] items-center justify-center
                rounded-full bg-gradient-to-br from-red-500 to-rose-600
                text-white shadow-[0_14px_30px_rgba(239,68,68,.3)]
                transition-all duration-300
                hover:-translate-y-1 hover:scale-110
                hover:shadow-[0_18px_38px_rgba(239,68,68,.4)]
                active:scale-90
              "
            >
              <PhoneOff size={23} />
            </button>

            <span className="text-[11px] font-medium text-slate-400">
              Từ chối
            </span>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />

              <button
                type="button"
                onClick={onAccept}
                aria-label="Trả lời"
                className="
                  relative flex h-[60px] w-[60px] items-center justify-center
                  rounded-full bg-gradient-to-br from-emerald-400 to-teal-600
                  text-white shadow-[0_14px_30px_rgba(16,185,129,.3)]
                  transition-all duration-300
                  hover:-translate-y-1 hover:scale-110
                  hover:shadow-[0_18px_38px_rgba(16,185,129,.4)]
                  active:scale-90
                "
              >
                {isVideo ? <Video size={23} /> : <Phone size={23} />}
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-400">
              Trả lời
            </span>
          </div>
        </div>

        <div className="relative mt-7 text-[11px] text-slate-400">
          {isVideo
            ? "Người gọi muốn bắt đầu cuộc gọi video"
            : "Cuộc gọi thoại đến"}
        </div>
      </div>
    </div>
  );
}