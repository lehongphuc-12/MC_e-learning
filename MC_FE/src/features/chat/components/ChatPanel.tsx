import { ArrowDown, ArrowLeft, Loader2, MoreHorizontal, Phone, Video } from "lucide-react";
import { ReactNode, UIEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(b - a) / 60000;
}

function isSameDay(first: string, second: string) {
  const a = new Date(first);
  const b = new Date(second);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLastSeen(value?: string | null) {
  if (!value) return "Không hoạt động";

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Không hoạt động";

  const diff = Math.max(0, Date.now() - time);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Vừa hoạt động";
  if (diff < hour) return `Hoạt động ${Math.floor(diff / minute)} phút trước`;
  if (diff < day) return `Hoạt động ${Math.floor(diff / hour)} giờ trước`;

  const days = Math.floor(diff / day);
  if (days === 1) return "Hoạt động hôm qua";
  if (days < 7) return `Hoạt động ${days} ngày trước`;

  return `Hoạt động ${new Date(value).toLocaleDateString("vi-VN")}`;
}

export function ChatPanel({ onClose, calls }: Props) {
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

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = messageContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const loadOlder = async () => {
    const el = messageContainerRef.current;
    if (!el || loadingOlderRef.current || chat.loadingOlder || !chat.hasOlderMessages) return;

    const oldHeight = el.scrollHeight;
    const oldTop = el.scrollTop;
    loadingOlderRef.current = true;

    try {
      await chat.loadOlderMessages();

      requestAnimationFrame(() => {
        const current = messageContainerRef.current;
        if (current) current.scrollTop = current.scrollHeight - oldHeight + oldTop;
        loadingOlderRef.current = false;
      });
    } catch (error) {
      loadingOlderRef.current = false;
      console.error("Load history error:", error);
    }
  };

  const handleMessageScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    shouldStickBottomRef.current = distanceToBottom < 150;
    setShowScrollDown(distanceToBottom > 320);

    if (el.scrollTop <= 80 && chat.hasOlderMessages && !chat.loadingOlder && !loadingOlderRef.current) {
      void loadOlder();
    }
  };

  useLayoutEffect(() => {
    if (chat.loading || !chat.activeConversation) return;

    const conversationId = chat.activeConversation.conversationId;
    if (lastConversationIdRef.current === conversationId) return;

    lastConversationIdRef.current = conversationId;
    shouldStickBottomRef.current = true;

    requestAnimationFrame(() => scrollToBottom());
  }, [chat.loading, chat.activeConversation?.conversationId]);

  const lastMessageId = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].messageId : null;

  useEffect(() => {
    if (!lastMessageId || loadingOlderRef.current || !shouldStickBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [lastMessageId]);

  useEffect(() => {
    if (chat.typingUserId === null || !shouldStickBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [chat.typingUserId]);

  const selectConversation = async (conversation: Conversation) => {
    setReply(null);
    setForwarding(null);
    setShowProfile(false);
    setShowScrollDown(false);

    lastConversationIdRef.current = null;
    loadingOlderRef.current = false;
    shouldStickBottomRef.current = true;

    await chat.openConversation(conversation);
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
    window.setTimeout(onClose, 180);
  };

  const lastMineMessageId = useMemo(() => {
    if (!Number.isFinite(currentUserId)) return null;

    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (Number(chat.messages[i].senderId) === currentUserId) return chat.messages[i].messageId;
    }

    return null;
  }, [chat.messages, currentUserId]);

  const otherUserId = chat.activeConversation ? Number(chat.activeConversation.otherUserId) : null;
  const otherUserOnline = otherUserId !== null && chat.onlineUserIds.has(otherUserId);
  const otherUserLastSeen = otherUserId !== null ? chat.lastSeenByUserId[otherUserId] : null;

  return (
    <div
      className="mseek-chat-root fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f7f9ff] md:inset-auto md:bottom-24 md:right-5 md:h-[min(720px,calc(100vh-125px))] md:w-[410px] md:rounded-[32px] md:border md:border-white/80 md:bg-white/95 md:backdrop-blur-2xl md:ring-1 md:ring-slate-900/[0.05] md:shadow-[0_35px_100px_-24px_rgba(30,41,120,.38),0_18px_40px_-24px_rgba(15,23,42,.28)]"
      style={{ animation: closing ? "chatPanelOut .18s ease-in forwards" : "chatPanelIn .42s cubic-bezier(.2,.9,.25,1.05)" }}
    >
      {!chat.activeConversation ? (
        <div className="flex min-h-0 flex-1 flex-col bg-[#f7f9ff]">
          <ConversationList
            conversations={chat.conversations}
            searchResults={chat.searchResults}
            searching={chat.searching}
            onlineUserIds={chat.onlineUserIds}
            lastSeenByUserId={chat.lastSeenByUserId}
            onSearchUsers={chat.searchUsers}
            onSelect={selectConversation}
            onSelectUser={chat.startConversation}
          />
        </div>
      ) : (
        <>
          <div className="relative z-30 shrink-0 overflow-hidden border-b border-slate-200/60 bg-white/90 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-16 -top-20 h-36 w-36 rounded-full bg-blue-300/15 blur-[55px]" />
              <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full bg-violet-300/15 blur-[55px]" />
            </div>

            <div className="relative flex min-h-[72px] items-center gap-2 px-3 py-3">
              <button
                type="button"
                onClick={() => void closeConversation()}
                aria-label="Quay lại"
                className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-transparent text-slate-400 transition-all duration-200 hover:-translate-x-0.5 hover:border-slate-200/70 hover:bg-white hover:text-slate-700 hover:shadow-sm active:scale-90"
              >
                <ArrowLeft size={19} strokeWidth={2.2} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-[15px] p-1 text-left transition-colors hover:bg-slate-50/80"
              >
                <div className="relative shrink-0">
                  <div className={`rounded-full p-[2px] transition-all duration-500 ${otherUserOnline ? "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500" : "bg-slate-200"}`}>
                    <div className="rounded-full bg-white p-[2px]">
                      <img
                        src={chat.activeConversation.otherUserAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.activeConversation.otherUserName)}`}
                        alt={chat.activeConversation.otherUserName}
                        className="h-[42px] w-[42px] rounded-full bg-slate-100 object-cover"
                      />
                    </div>
                  </div>

                  {otherUserOnline && (
                    <span className="absolute bottom-0 right-0 flex h-[13px] w-[13px]">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400" style={{ animation: "onlinePulse 2s ease-out infinite" }} />
                      <span className="relative h-[13px] w-[13px] rounded-full border-[2.5px] border-white bg-emerald-500" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold tracking-[-0.2px] text-slate-900">
                      {chat.activeConversation.otherUserName}
                    </span>

                    {otherUserOnline && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                  </div>

                  <div className={`mt-0.5 truncate text-[9px] font-semibold ${otherUserOnline ? "text-emerald-600" : "text-slate-400"}`}>
                    {otherUserOnline ? "Đang hoạt động" : formatLastSeen(otherUserLastSeen)}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <HeaderAction title="Gọi thoại" onClick={() => void calls.startCall(chat.activeConversation!.conversationId, "VOICE")}>
                  <Phone size={16} strokeWidth={2.2} />
                </HeaderAction>

                <HeaderAction title="Gọi video" onClick={() => void calls.startCall(chat.activeConversation!.conversationId, "VIDEO")}>
                  <Video size={17} strokeWidth={2.2} />
                </HeaderAction>

                <HeaderAction title="Thông tin người dùng" onClick={() => setShowProfile(true)} neutral>
                  <MoreHorizontal size={18} strokeWidth={2.2} />
                </HeaderAction>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f7f9ff]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-32 top-0 h-[280px] w-[280px] rounded-full bg-blue-200/15 blur-[90px]" />
              <div className="absolute -right-32 top-[30%] h-[300px] w-[300px] rounded-full bg-indigo-200/15 blur-[100px]" />
              <div className="absolute bottom-[-150px] left-[20%] h-[280px] w-[280px] rounded-full bg-cyan-200/10 blur-[100px]" />
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: "radial-gradient(rgba(100,116,139,.22) .7px, transparent .7px)",
                  backgroundSize: "20px 20px",
                }}
              />
            </div>

            <div
              ref={messageContainerRef}
              onScroll={handleMessageScroll}
              className="mseek-chat-scroll relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 py-4 md:px-5"
            >
              {chat.loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 scale-150 rounded-full bg-blue-200/30 blur-xl" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-white bg-white text-blue-600 shadow-[0_12px_30px_-15px_rgba(37,99,235,.5)]">
                      <Loader2 size={21} className="animate-spin" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex min-h-[34px] items-center justify-center pb-2">
                    {chat.loadingOlder ? (
                      <div className="flex items-center gap-2 rounded-full border border-white bg-white/80 px-3 py-1.5 text-[9px] font-semibold text-slate-400 shadow-sm backdrop-blur-xl">
                        <Loader2 size={12} className="animate-spin text-blue-500" />
                        Đang tải tin nhắn cũ...
                      </div>
                    ) : !chat.hasOlderMessages && chat.messages.length > 0 ? (
                      <div className="flex items-center gap-2 rounded-full border border-white bg-white/75 px-3 py-1.5 text-[9px] font-semibold text-slate-400 shadow-sm backdrop-blur-xl">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Bắt đầu cuộc trò chuyện
                      </div>
                    ) : null}
                  </div>

                  {chat.messages.map((message, index) => {
                    const previousMessage = index > 0 ? chat.messages[index - 1] : null;
                    const nextMessage = index < chat.messages.length - 1 ? chat.messages[index + 1] : null;

                    const sameSenderAsPrevious = previousMessage !== null && Number(previousMessage.senderId) === Number(message.senderId);
                    const sameSenderAsNext = nextMessage !== null && Number(nextMessage.senderId) === Number(message.senderId);

                    const closeToPrevious = previousMessage !== null && minutesBetween(previousMessage.createdAt, message.createdAt) <= GROUP_MESSAGE_MINUTES;
                    const closeToNext = nextMessage !== null && minutesBetween(message.createdAt, nextMessage.createdAt) <= GROUP_MESSAGE_MINUTES;

                    const isFirstInGroup = !sameSenderAsPrevious || !closeToPrevious;
                    const isLastInGroup = !sameSenderAsNext || !closeToNext;

                    const showTimeSeparator =
                      !previousMessage ||
                      !isSameDay(previousMessage.createdAt, message.createdAt) ||
                      minutesBetween(previousMessage.createdAt, message.createdAt) >= TIME_SEPARATOR_MINUTES;

                    const showStatus = Number(message.senderId) === currentUserId && message.messageId === lastMineMessageId;

                    return (
                      <div key={message.messageId} className={isLastInGroup ? "mb-4" : "mb-0.5"}>

                        <MessageBubble
                          message={message}
                          showTimeSeparator={showTimeSeparator}
                          showStatus={showStatus}
                          isFirstInGroup={isFirstInGroup}
                          isLastInGroup={isLastInGroup}
                          otherUserAvatarUrl={chat.activeConversation?.otherUserAvatarUrl}
                          onReply={setReply}
                          onForward={setForwarding}
                          onReact={chat.react}
                          onRecall={chat.recall}
                        />
                      </div>
                    );
                  })}

                  {chat.typingUserId !== null && (
                    <div className="mb-3 flex items-end gap-2 pl-9" style={{ animation: "messageInOther .26s cubic-bezier(.2,.8,.2,1)" }}>
                      <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[7px] border border-white bg-white/90 px-4 py-3 shadow-[0_8px_24px_-15px_rgba(15,23,42,.35)] ring-1 ring-slate-200/60 backdrop-blur-xl">
                        {[0, 1, 2].map((item) => (
                          <span
                            key={item}
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            style={{
                              animation: "typingBounce 1.2s ease-in-out infinite",
                              animationDelay: `${item * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="h-1" />
                </>
              )}
            </div>

            {showScrollDown && !chat.loading && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                aria-label="Cuộn xuống tin mới nhất"
                className="mseek-scroll-btn absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-[14px] border border-white bg-white/95 text-blue-600 shadow-[0_12px_30px_-12px_rgba(37,99,235,.45)] ring-1 ring-slate-900/[0.05] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-12px_rgba(37,99,235,.55)] active:scale-90"
              >
                <ArrowDown size={17} strokeWidth={2.3} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
              </button>
            )}
          </div>

          {/* COMPOSER */}
          <div className="relative z-30 shrink-0 border-t border-slate-200/60 bg-white/90 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-blue-50/20 to-transparent" />

            <div className="relative">
              <MessageComposer
                reply={reply}
                stickers={chat.stickers}
                onCancelReply={() => setReply(null)}
                onSendText={chat.sendText}
                onSendFile={chat.sendFile}
                onSendVoice={chat.sendVoice}
                onSendSticker={chat.sendSticker}
                onTyping={chat.typing}
              />
            </div>
          </div>

          {showProfile && (
            <ChatUserProfileModal
              conversation={chat.activeConversation}
              onClose={() => setShowProfile(false)}
            />
          )}

          {forwarding && (
            <ForwardMessageModal
              message={forwarding}
              conversations={chat.conversations}
              onClose={() => setForwarding(null)}
              onForward={chat.forwardMessage}
            />
          )}
        </>
      )}
    </div>
  );
}

function HeaderAction({
  children,
  title,
  onClick,
  neutral = false,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  neutral?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border transition-all duration-200 hover:-translate-y-0.5 active:scale-90 ${
        neutral
          ? "border-transparent bg-transparent text-slate-400 hover:border-slate-200/70 hover:bg-white hover:text-slate-700 hover:shadow-sm"
          : "border-blue-100/70 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-[0_5px_14px_-8px_rgba(37,99,235,.45)] hover:border-blue-200 hover:shadow-[0_8px_18px_-8px_rgba(37,99,235,.5)]"
      }`}
    >
      {children}
    </button>
  );
}