interface Props {
  onSelect: (emoji: string) => void;
}

const emojis = [
  "😀", "😂", "🥹", "😍", "🥰",
  "😘", "😎", "🤩", "😭", "😡",
  "👍", "👎", "👏", "🙏", "💪",
  "🔥", "❤️", "💙", "💯", "🎉",
  "✨", "😴", "🤔", "😱", "🙈",
  "🤣", "😊", "😉", "😋", "🤗",
];

export function EmojiPicker({ onSelect }: Props) {
  return (
    <div
      className="
        w-[290px] overflow-hidden rounded-[24px]
        border border-white/70 bg-white/95
        p-3 shadow-[0_24px_70px_-15px_rgba(15,23,42,.35)]
        ring-1 ring-slate-900/5 backdrop-blur-2xl
      "
      style={{
        animation: "pickerIn .25s cubic-bezier(.2,.9,.25,1.08)",
      }}
    >
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div>
          <div className="text-xs font-bold text-slate-700">
            Emoji
          </div>

          <div className="mt-0.5 text-[10px] text-slate-400">
            Chọn cảm xúc của bạn
          </div>
        </div>

        <span className="text-xl">✨</span>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {emojis.map((emoji, index) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              text-[21px] transition-all duration-200
              hover:-translate-y-1 hover:scale-125 hover:bg-indigo-50
              active:scale-90
            "
            style={{
              animation: "emojiIn .3s ease-out backwards",
              animationDelay: `${index * 12}ms`,
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}