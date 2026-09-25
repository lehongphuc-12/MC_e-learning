import {
  Check,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import {
  ChatMessage,
  Conversation,
} from "../types/chatTypes";

interface Props {
  message: ChatMessage;
  conversations: Conversation[];
  onClose: () => void;
  onForward: (
    messageId: number,
    conversationIds: number[]
  ) => Promise<void>;
}

export function ForwardMessageModal({
  message,
  conversations,
  onClose,
  onForward,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [selected, setSelected] =
    useState<number[]>([]);

  const [sending, setSending] =
    useState(false);

  const filtered =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          conversation.otherUserName
            .toLowerCase()
            .includes(keyword)
      );
    }, [
      conversations,
      search,
    ]);

  const toggle = (
    conversationId: number
  ) => {
    setSelected((current) =>
      current.includes(
        conversationId
      )
        ? current.filter(
            (id) =>
              id !== conversationId
          )
        : [
            ...current,
            conversationId,
          ]
    );
  };

  const submit =
    async () => {
      if (
        selected.length === 0 ||
        sending
      ) {
        return;
      }

      setSending(true);

      try {
        await onForward(
          message.messageId,
          selected
        );

        onClose();
      } finally {
        setSending(false);
      }
    };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[520px] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Chuyển tiếp
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Chọn người nhận tin nhắn
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5">
            <Search
              size={18}
              className="shrink-0 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Tìm người..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="mseek-chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              Không tìm thấy cuộc trò chuyện
            </div>
          ) : (
            filtered.map(
              (conversation) => {
                const checked =
                  selected.includes(
                    conversation
                      .conversationId
                  );

                return (
                  <button
                    key={
                      conversation
                        .conversationId
                    }
                    type="button"
                    onClick={() =>
                      toggle(
                        conversation
                          .conversationId
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <img
                      src={
                        conversation
                          .otherUserAvatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          conversation
                            .otherUserName
                        )}`
                      }
                      alt={
                        conversation
                          .otherUserName
                      }
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {
                          conversation
                            .otherUserName
                        }
                      </div>

                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        {
                          conversation
                            .lastMessage
                            ?.content ||
                          conversation
                            .lastMessage
                            ?.messageType ||
                          "Cuộc trò chuyện"
                        }
                      </div>
                    </div>

                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        checked
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && (
                        <Check
                          size={14}
                        />
                      )}
                    </div>
                  </button>
                );
              }
            )
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            disabled={
              selected.length === 0 ||
              sending
            }
            onClick={() =>
              void submit()
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={17} />

            {sending
              ? "Đang gửi..."
              : selected.length > 0
                ? `Gửi (${selected.length})`
                : "Chọn người nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}