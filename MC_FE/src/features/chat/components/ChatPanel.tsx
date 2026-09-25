import {
  ArrowDown,
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Phone,
  Video,
} from "lucide-react";
import {
  UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { useChat } from "../hooks/useChat";
import { useCall } from "../hooks/useCall";
import { ChatMessage, Conversation } from "../types/chatTypes";
import { ConversationList } from "./ConversationList";
import { ChatUserProfileModal } from "./ChatUserProfileModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

interface Props {
  onClose: () => void;
  calls: ReturnType<typeof useCall>;
}

const TIME_SEPARATOR_MINUTES = 15;
const GROUP_MESSAGE_MINUTES = 5;

function minutesBetween(first: string, second: string) {
  const a = new Date(first).getTime();
  const b = new Date(second).getTime();

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(b - a) / 60000;
}

function isSameDay(first: string, second: string) {
  const a = new Date(first);
  const b = new Date(second);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatLastSeen(value?: string | null) {
  if (!value) return "Không hoạt động";

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "Không hoạt động";
  }

  const diff = Math.max(0, Date.now() - time);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Vừa hoạt động";

  if (diff < hour) {
    return `Hoạt động ${Math.floor(diff / minute)} phút trước`;
  }

  if (diff < day) {
    return `Hoạt động ${Math.floor(diff / hour)} giờ trước`;
  }

  const days = Math.floor(diff / day);

  if (days === 1) {
    return "Hoạt động hôm qua";
  }

  if (days < 7) {
    return `Hoạt động ${days} ngày trước`;
  }

  return `Hoạt động ${new Date(value).toLocaleDateString("vi-VN")}`;
}

export function ChatPanel({
  onClose,
  calls,
}: Props) {
  const chat = useChat();
  const user = useAuthStore((state) => state.user);

  const currentUserId = Number(user?.id);

  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const lastConversationIdRef = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  const shouldStickBottomRef = useRef(true);

  const scrollToBottom = (
    behavior: ScrollBehavior = "auto"
  ) => {
    const el = messageContainerRef.current;

    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  };

  const loadOlder = async () => {
    const el = messageContainerRef.current;

    if (
      !el ||
      loadingOlderRef.current ||
      chat.loadingOlder ||
      !chat.hasOlderMessages
    ) {
      return;
    }

    const oldHeight = el.scrollHeight;
    const oldTop = el.scrollTop;

    loadingOlderRef.current = true;

    try {
      await chat.loadOlderMessages();

      requestAnimationFrame(() => {
        const current = messageContainerRef.current;

        if (current) {
          current.scrollTop =
            current.scrollHeight -
            oldHeight +
            oldTop;
        }

        loadingOlderRef.current = false;
      });
    } catch (error) {
      loadingOlderRef.current = false;

      console.error(
        "Load history error:",
        error
      );
    }
  };

  const handleMessageScroll = (
    event: UIEvent<HTMLDivElement>
  ) => {
    const el = event.currentTarget;

    const distanceToBottom =
      el.scrollHeight -
      el.scrollTop -
      el.clientHeight;

    shouldStickBottomRef.current =
      distanceToBottom < 150;

    setShowScrollDown(
      distanceToBottom > 320
    );

    if (
      el.scrollTop <= 80 &&
      chat.hasOlderMessages &&
      !chat.loadingOlder &&
      !loadingOlderRef.current
    ) {
      void loadOlder();
    }
  };

  useLayoutEffect(() => {
    if (
      chat.loading ||
      !chat.activeConversation
    ) {
      return;
    }

    const conversationId =
      chat.activeConversation.conversationId;

    if (
      lastConversationIdRef.current !==
      conversationId
    ) {
      lastConversationIdRef.current =
        conversationId;

      shouldStickBottomRef.current = true;

      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [
    chat.loading,
    chat.activeConversation?.conversationId,
  ]);

  const lastMessageId =
    chat.messages.length > 0
      ? chat.messages[
          chat.messages.length - 1
        ].messageId
      : null;

  useEffect(() => {
    if (
      !lastMessageId ||
      loadingOlderRef.current ||
      !shouldStickBottomRef.current
    ) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [lastMessageId]);

  useEffect(() => {
    if (
      chat.typingUserId === null ||
      !shouldStickBottomRef.current
    ) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [chat.typingUserId]);

  const selectConversation = async (
    conversation: Conversation
  ) => {
    setReply(null);
    setForwarding(null);
    setShowProfile(false);
    setShowScrollDown(false);

    lastConversationIdRef.current = null;
    loadingOlderRef.current = false;
    shouldStickBottomRef.current = true;

    await chat.openConversation(
      conversation
    );
  };

  const closeConversation = async () => {
    setReply(null);
    setForwarding(null);
    setShowProfile(false);
    setShowScrollDown(false);

    lastConversationIdRef.current = null;
    loadingOlderRef.current = false;
    shouldStickBottomRef.current = true;

    await chat.closeConversation();
  };

  const handleClose = () => {
    if (closing) return;

    setClosing(true);

    window.setTimeout(
      onClose,
      180
    );
  };

  const lastMineMessageId = useMemo(() => {
    if (!Number.isFinite(currentUserId)) {
      return null;
    }

    for (
      let i = chat.messages.length - 1;
      i >= 0;
      i--
    ) {
      if (
        Number(chat.messages[i].senderId) ===
        currentUserId
      ) {
        return chat.messages[i].messageId;
      }
    }

    return null;
  }, [
    chat.messages,
    currentUserId,
  ]);

  const otherUserId =
    chat.activeConversation
      ? Number(
          chat.activeConversation.otherUserId
        )
      : null;

  const otherUserOnline =
    otherUserId !== null &&
    chat.onlineUserIds.has(
      otherUserId
    );

  const otherUserLastSeen =
    otherUserId !== null
      ? chat.lastSeenByUserId[
          otherUserId
        ]
      : null;

  return (
    <div
      className={`
        mseek-chat-root
        fixed inset-0 z-50
        flex flex-col
        overflow-hidden
        bg-white

        md:inset-auto
        md:bottom-24
        md:right-5
        md:h-[min(700px,calc(100vh-130px))]
        md:w-[400px]
        md:rounded-[30px]
        md:bg-white/95
        md:backdrop-blur-2xl
        md:ring-1
        md:ring-slate-900/5
        md:shadow-[0_40px_100px_-20px_rgba(30,41,120,.45),0_18px_36px_-18px_rgba(15,23,42,.3)]
      `}
      style={{
        animation: closing
          ? "chatPanelOut .18s ease-in forwards"
          : "chatPanelIn .42s cubic-bezier(.2,.9,.25,1.05)",
      }}
    >
      {!chat.activeConversation ? (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <ConversationList
            conversations={
              chat.conversations
            }
            searchResults={
              chat.searchResults
            }
            searching={
              chat.searching
            }
            onlineUserIds={
              chat.onlineUserIds
            }
            lastSeenByUserId={
              chat.lastSeenByUserId
            }
            onSearchUsers={
              chat.searchUsers
            }
            onSelect={
              selectConversation
            }
            onSelectUser={
              chat.startConversation
            }
          />
        </div>
      ) : (
        <>
          {/* ================= HEADER ================= */}

          <div
            className="
              relative z-20
              flex shrink-0 items-center gap-2
              border-b border-slate-100/80
              bg-white/90
              px-3 py-3
              backdrop-blur-xl
            "
          >
            <button
              type="button"
              onClick={() =>
                void closeConversation()
              }
              aria-label="Quay lại"
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                text-slate-500
                transition-all duration-200
                hover:-translate-x-0.5
                hover:bg-slate-100
                hover:text-slate-800
                active:scale-90
              "
            >
              <ArrowLeft size={19} />
            </button>

            <div className="relative shrink-0">
              <div
                className={`
                  rounded-full p-[2px]
                  transition-all duration-500
                  ${
                    otherUserOnline
                      ? "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500"
                      : "bg-slate-200"
                  }
                `}
              >
                <img
                  src={
                    chat
                      .activeConversation
                      .otherUserAvatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      chat
                        .activeConversation
                        .otherUserName
                    )}`
                  }
                  alt={
                    chat
                      .activeConversation
                      .otherUserName
                  }
                  className="
                    h-10 w-10
                    rounded-full
                    border-2 border-white
                    object-cover
                  "
                />
              </div>

              {otherUserOnline && (
                <span className="absolute bottom-0 right-0 flex h-3 w-3">
                  <span
                    className="
                      absolute inline-flex
                      h-full w-full
                      rounded-full
                      bg-emerald-400
                    "
                    style={{
                      animation:
                        "onlinePulse 2s ease-out infinite",
                    }}
                  />

                  <span
                    className="
                      relative h-3 w-3
                      rounded-full
                      border-2 border-white
                      bg-emerald-500
                    "
                  />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-slate-800">
                {
                  chat
                    .activeConversation
                    .otherUserName
                }
              </div>

              {otherUserOnline ? (
                <div className="text-[11px] font-medium text-emerald-600">
                  Đang hoạt động
                </div>
              ) : (
                <div className="truncate text-[11px] text-slate-400">
                  {formatLastSeen(
                    otherUserLastSeen
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                void calls.startCall(
                  chat
                    .activeConversation!
                    .conversationId,
                  "VOICE"
                )
              }
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                bg-blue-50
                text-blue-600
                transition-all duration-200
                hover:scale-110
                hover:bg-blue-100
                active:scale-90
              "
              title="Gọi thoại"
            >
              <Phone size={17} />
            </button>

            <button
              type="button"
              onClick={() =>
                void calls.startCall(
                  chat
                    .activeConversation!
                    .conversationId,
                  "VIDEO"
                )
              }
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                bg-indigo-50
                text-indigo-600
                transition-all duration-200
                hover:scale-110
                hover:bg-indigo-100
                active:scale-90
              "
              title="Gọi video"
            >
              <Video size={18} />
            </button>

            <button
              type="button"
              onClick={() =>
                setShowProfile(true)
              }
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-full
                text-slate-400
                transition-all duration-200
                hover:scale-110
                hover:bg-slate-100
                hover:text-slate-700
                active:scale-90
              "
              title="Thông tin người dùng"
            >
              <MoreHorizontal
                size={20}
              />
            </button>
          </div>

          {/* ================= MESSAGES ================= */}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={
                messageContainerRef
              }
              onScroll={
                handleMessageScroll
              }
              className="
                mseek-chat-scroll
                h-full
                overflow-y-auto
                overflow-x-hidden
                px-4
                py-4
                md:px-5
              "
              style={{
                background:
                  "radial-gradient(120% 60% at 50% 0%, rgba(99,102,241,.07) 0%, transparent 60%), linear-gradient(to bottom, #f8fafc, #ffffff)",
              }}
            >
              {chat.loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    size={26}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : (
                <>
                  <div className="flex h-7 items-center justify-center">
                    {chat.loadingOlder ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />

                        Đang tải tin nhắn
                        cũ...
                      </div>
                    ) : !chat.hasOlderMessages &&
                      chat.messages
                        .length >
                        0 ? (
                      <div
                        className="
                          rounded-full
                          bg-white
                          px-3 py-1
                          text-[10px]
                          font-medium
                          text-slate-400
                          shadow-sm
                          ring-1
                          ring-slate-100
                        "
                      >
                        Bắt đầu cuộc trò
                        chuyện
                      </div>
                    ) : null}
                  </div>

                  {chat.messages.map(
                    (
                      message,
                      index
                    ) => {
                      const previousMessage =
                        index > 0
                          ? chat
                              .messages[
                              index -
                                1
                            ]
                          : null;

                      const nextMessage =
                        index <
                        chat.messages
                          .length -
                          1
                          ? chat
                              .messages[
                              index +
                                1
                            ]
                          : null;

                      const sameSenderAsPrevious =
                        previousMessage !==
                          null &&
                        Number(
                          previousMessage.senderId
                        ) ===
                          Number(
                            message.senderId
                          );

                      const sameSenderAsNext =
                        nextMessage !==
                          null &&
                        Number(
                          nextMessage.senderId
                        ) ===
                          Number(
                            message.senderId
                          );

                      const closeToPrevious =
                        previousMessage !==
                          null &&
                        minutesBetween(
                          previousMessage.createdAt,
                          message.createdAt
                        ) <=
                          GROUP_MESSAGE_MINUTES;

                      const closeToNext =
                        nextMessage !==
                          null &&
                        minutesBetween(
                          message.createdAt,
                          nextMessage.createdAt
                        ) <=
                          GROUP_MESSAGE_MINUTES;

                      const isFirstInGroup =
                        !sameSenderAsPrevious ||
                        !closeToPrevious;

                      const isLastInGroup =
                        !sameSenderAsNext ||
                        !closeToNext;

                      const showTimeSeparator =
                        !previousMessage ||
                        !isSameDay(
                          previousMessage.createdAt,
                          message.createdAt
                        ) ||
                        minutesBetween(
                          previousMessage.createdAt,
                          message.createdAt
                        ) >=
                          TIME_SEPARATOR_MINUTES;

                      const showStatus =
                        Number(
                          message.senderId
                        ) ===
                          currentUserId &&
                        message.messageId ===
                          lastMineMessageId;

                      return (
                        <div
                          key={
                            message.messageId
                          }
                          className={
                            isLastInGroup
                              ? "mb-4"
                              : "mb-0.5"
                          }
                        >
                          <MessageBubble
                            message={
                              message
                            }
                            showTimeSeparator={
                              showTimeSeparator
                            }
                            showStatus={
                              showStatus
                            }
                            isFirstInGroup={
                              isFirstInGroup
                            }
                            isLastInGroup={
                              isLastInGroup
                            }
                            otherUserAvatarUrl={
                              chat
                                .activeConversation
                                ?.otherUserAvatarUrl
                            }
                            onReply={
                              setReply
                            }
                            onForward={
                              setForwarding
                            }
                            onReact={
                              chat.react
                            }
                            onRecall={
                              chat.recall
                            }
                          />
                        </div>
                      );
                    }
                  )}

                  {chat.typingUserId !==
                    null && (
                    <div
                      className="
                        mb-2 flex
                        items-end gap-2
                        pl-9
                      "
                      style={{
                        animation:
                          "messageInOther .26s cubic-bezier(.2,.8,.2,1)",
                      }}
                    >
                      <div
                        className="
                          flex items-center
                          gap-1
                          rounded-2xl
                          rounded-bl-md
                          bg-white
                          px-3.5 py-3
                          shadow-sm
                          ring-1
                          ring-slate-200/70
                        "
                      >
                        {[
                          0,
                          1,
                          2,
                        ].map(
                          (
                            item
                          ) => (
                            <span
                              key={
                                item
                              }
                              className="
                                h-1.5
                                w-1.5
                                rounded-full
                                bg-indigo-400
                              "
                              style={{
                                animation:
                                  "typingBounce 1.2s ease-in-out infinite",
                                animationDelay: `${item * 0.15}s`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="h-1" />
                </>
              )}
            </div>

            {/* ============= SCROLL DOWN ============= */}

            {showScrollDown &&
              !chat.loading && (
                <button
                  type="button"
                  onClick={() =>
                    scrollToBottom(
                      "smooth"
                    )
                  }
                  aria-label="Cuộn xuống tin mới nhất"
                  className="
                    mseek-scroll-btn
                    absolute bottom-3
                    right-4 z-20
                    flex h-9 w-9
                    items-center
                    justify-center
                    rounded-full
                    bg-white
                    text-blue-600
                    shadow-lg
                    ring-1
                    ring-slate-200
                    transition-transform
                    duration-200
                    hover:scale-110
                    active:scale-90
                  "
                >
                  <ArrowDown
                    size={17}
                  />
                </button>
              )}
          </div>

          {/* ================= COMPOSER ================= */}

          <MessageComposer
            reply={reply}
            stickers={
              chat.stickers
            }
            onCancelReply={() =>
              setReply(null)
            }
            onSendText={
              chat.sendText
            }
            onSendFile={
              chat.sendFile
            }
            onSendVoice={
              chat.sendVoice
            }
            onSendSticker={
              chat.sendSticker
            }
            onTyping={
              chat.typing
            }
          />

          {/* ================= PROFILE ================= */}

          {showProfile && (
            <ChatUserProfileModal
              conversation={
                chat.activeConversation
              }
              onClose={() =>
                setShowProfile(
                  false
                )
              }
            />
          )}

          {/* ================= FORWARD ================= */}

          {forwarding && (
            <ForwardMessageModal
              message={
                forwarding
              }
              conversations={
                chat.conversations
              }
              onClose={() =>
                setForwarding(null)
              }
              onForward={
                chat.forwardMessage
              }
            />
          )}
        </>
      )}
    </div>
  );
}