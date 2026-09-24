import { useEffect, useState } from "react";
import { StickerPack } from "../types/chatTypes";

interface Props {
  packs: StickerPack[];
  onSelect: (stickerId: number) => void;
}

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5239";

function resolveMediaUrl(url?: string | null) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return `${BACKEND_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function StickerPicker({
  packs,
  onSelect,
}: Props) {
  const [activePack, setActivePack] = useState<number | null>(
    packs[0]?.stickerPackId ?? null
  );

  useEffect(() => {
    if (!packs.length) {
      setActivePack(null);
      return;
    }

    if (!packs.some((item) => item.stickerPackId === activePack)) {
      setActivePack(packs[0].stickerPackId);
    }
  }, [packs, activePack]);

  const pack =
    packs.find((item) => item.stickerPackId === activePack) ??
    packs[0];

  return (
    <div
      className="
        absolute bottom-[68px] left-3 z-50
        w-[300px] overflow-hidden rounded-[26px]
        border border-white/70 bg-white/95
        shadow-[0_28px_80px_-18px_rgba(15,23,42,.4)]
        ring-1 ring-slate-900/5 backdrop-blur-2xl
      "
      style={{
        animation: "pickerIn .28s cubic-bezier(.2,.9,.25,1.08)",
      }}
    >
      <div className="relative overflow-hidden border-b border-slate-100 px-4 py-3.5">
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-indigo-100 blur-2xl" />

        <div className="relative">
          <div className="text-sm font-bold text-slate-800">
            Stickers
          </div>

          <div className="mt-0.5 text-[10px] text-slate-400">
            {pack?.name || "Chọn sticker"}
          </div>
        </div>
      </div>

      {!packs.length ? (
        <div className="flex h-40 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 text-4xl">🐱</div>

          <div className="text-sm font-semibold text-slate-600">
            Chưa có sticker
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            Thêm sticker vào hệ thống để sử dụng.
          </div>
        </div>
      ) : (
        <>
          <div className="mseek-chat-scroll grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto p-3">
            {pack?.stickers?.map((sticker, index) => (
              <button
                key={sticker.stickerId}
                type="button"
                onClick={() => onSelect(sticker.stickerId)}
                className="
                  group flex aspect-square items-center justify-center
                  rounded-2xl p-1.5 transition-all duration-200
                  hover:-translate-y-1 hover:scale-110 hover:bg-indigo-50
                  active:scale-90
                "
                style={{
                  animation: "stickerIn .32s ease-out backwards",
                  animationDelay: `${index * 20}ms`,
                }}
              >
                <img
                  src={resolveMediaUrl(sticker.imageUrl)}
                  alt={sticker.name}
                  className="
                    h-14 w-14 object-contain
                    transition-transform duration-300
                    group-hover:rotate-[-3deg]
                  "
                />
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-slate-50/70 p-2">
            {packs.map((item) => {
              const active =
                item.stickerPackId === pack?.stickerPackId;

              return (
                <button
                  key={item.stickerPackId}
                  type="button"
                  onClick={() => setActivePack(item.stickerPackId)}
                  className={`
                    relative flex h-11 min-w-11 items-center justify-center
                    rounded-2xl p-1.5 transition-all duration-250
                    active:scale-90
                    ${
                      active
                        ? "bg-white shadow-sm ring-1 ring-indigo-100"
                        : "hover:bg-white"
                    }
                  `}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={resolveMediaUrl(item.thumbnailUrl)}
                      alt={item.name}
                      className={`h-8 w-8 object-contain transition ${
                        active ? "scale-110" : ""
                      }`}
                    />
                  ) : (
                    <span className="px-1 text-[10px] font-medium text-slate-600">
                      {item.name}
                    </span>
                  )}

                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}