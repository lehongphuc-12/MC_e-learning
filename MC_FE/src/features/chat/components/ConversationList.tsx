import { CheckCheck, Loader2, MessageCircle, Search, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { ChatUser, Conversation } from "../types/chatTypes";

interface Props {
  conversations: Conversation[];
  searchResults: ChatUser[];
  searching: boolean;
  onlineUserIds: Set<number>;
  lastSeenByUserId: Record<number, string | null>;
  onSearchUsers: (keyword: string) => Promise<void>;
  onSelect: (conversation: Conversation) => void;
  onSelectUser: (user: ChatUser) => Promise<void>;
}

type TabType = "ALL" | "UNREAD";

export function ConversationList({
  conversations,
  searchResults,
  searching,
  onlineUserIds,
  lastSeenByUserId,
  onSearchUsers,
  onSelect,
  onSelectUser,
}: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabType>("ALL");
  const [startingUserId, setStartingUserId] = useState<number | null>(null);

  const query = search.trim();

  useEffect(() => {
    const keyword = search.trim();

    if (!keyword) {
      void onSearchUsers("");
      return;
    }

    const timer = window.setTimeout(() => {
      void onSearchUsers(keyword);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, onSearchUsers]);

  const visibleConversations = useMemo(() => {
    let result = conversations;

    if (tab === "UNREAD") result = result.filter((conversation) => conversation.unreadCount > 0);

    if (query) {
      const keyword = query.toLowerCase();
      result = result.filter((conversation) => conversation.otherUserName.toLowerCase().includes(keyword));
    }

    return result;
  }, [conversations, query, tab]);

  const unreadCount = useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount > 0 ? 1 : 0), 0),
    [conversations]
  );

  const handleSelectUser = async (user: ChatUser) => {
    if (startingUserId !== null) return;

    try {
      setStartingUserId(user.userId);
      await onSelectUser(user);
      setSearch("");
    } finally {
      setStartingUserId(null);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8faff]">
      {/* AMBIENT BACKGROUND */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[250px] overflow-hidden">
        <div className="absolute -left-20 -top-24 h-52 w-52 rounded-full bg-blue-200/35 blur-[70px]" />
        <div className="absolute -right-20 -top-16 h-48 w-48 rounded-full bg-indigo-200/35 blur-[70px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 shrink-0 border-b border-white/70 bg-white/75 px-5 pb-4 pt-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[25px] font-bold tracking-[-0.8px] text-slate-950">Đoạn chat</h2>

              <span className="flex h-6 items-center gap-1 rounded-full border border-blue-100 bg-blue-50/80 px-2 text-[10px] font-bold text-blue-600">
                <Sparkles size={11} />
                MSeek
              </span>
            </div>

            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              Kết nối và trò chuyện cùng mọi người
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-[0_8px_22px_-10px_rgba(37,99,235,.5)] ring-1 ring-slate-900/[0.04]">
            <MessageCircle size={19} strokeWidth={2.2} />
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative mt-4">
          <div className="group flex h-[46px] items-center rounded-[16px] border border-slate-200/70 bg-white/90 px-3.5 shadow-[0_5px_18px_-12px_rgba(15,23,42,.35)] ring-1 ring-transparent transition-all duration-200 focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-500/[0.07]">
            {searching ? (
              <Loader2 size={18} className="mr-2.5 shrink-0 animate-spin text-blue-500" />
            ) : (
              <Search size={18} className="mr-2.5 shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-500" />
            )}

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm người hoặc cuộc trò chuyện..."
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-700 active:scale-90"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        {!query && (
          <div className="mt-3 flex rounded-[14px] border border-slate-200/60 bg-slate-100/70 p-1">
            <TabButton active={tab === "ALL"} onClick={() => setTab("ALL")}>
              Tất cả
            </TabButton>

            <TabButton active={tab === "UNREAD"} onClick={() => setTab("UNREAD")}>
              <span>Chưa đọc</span>

              {unreadCount > 0 && (
                <span
                  className={`ml-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    tab === "UNREAD" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabButton>
          </div>
        )}
      </div>

      {/* CONTENT */}
      {query ? (
        <div className="mseek-chat-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {visibleConversations.length > 0 && (
            <>
              <SectionTitle>Cuộc trò chuyện</SectionTitle>

              <div className="space-y-1">
                {visibleConversations.map((conversation, index) => (
                  <ConversationItem
                    key={conversation.conversationId}
                    conversation={conversation}
                    index={index}
                    isOnline={onlineUserIds.has(Number(conversation.otherUserId))}
                    lastSeenAt={lastSeenByUserId[Number(conversation.otherUserId)]}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </>
          )}

          <SectionTitle>Mọi người</SectionTitle>

          {searching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <Loader2 size={20} className="animate-spin text-blue-600" />
              </div>

              <span className="mt-3 text-[11px] font-medium text-slate-400">Đang tìm kiếm...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((user, index) => (
                <SearchUserItem
                  key={user.userId}
                  user={user}
                  index={index}
                  isOnline={onlineUserIds.has(Number(user.userId))}
                  lastSeenAt={lastSeenByUserId[Number(user.userId)]}
                  loading={startingUserId === user.userId}
                  disabled={startingUserId !== null}
                  onClick={() => void handleSelectUser(user)}
                />
              ))}
            </div>
          ) : (
            <SearchEmptyState query={query} />
          )}
        </div>
      ) : (
        <div className="mseek-chat-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          {visibleConversations.length === 0 ? (
            <EmptyState unread={tab === "UNREAD"} />
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Tin nhắn gần đây</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {visibleConversations.length} cuộc trò chuyện
                </span>
              </div>

              <div className="space-y-1">
                {visibleConversations.map((conversation, index) => (
                  <ConversationItem
                    key={conversation.conversationId}
                    conversation={conversation}
                    index={index}
                    isOnline={onlineUserIds.has(Number(conversation.otherUserId))}
                    lastSeenAt={lastSeenByUserId[Number(conversation.otherUserId)]}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CONVERSATION ITEM
   ============================================================ */

function ConversationItem({
  conversation,
  isOnline,
  lastSeenAt,
  index,
  onSelect,
}: {
  conversation: Conversation;
  isOnline: boolean;
  lastSeenAt?: string | null;
  index: number;
  onSelect: (conversation: Conversation) => void;
}) {
  const currentUserId = Number(useAuthStore((state) => state.user?.id));
  const unread = conversation.unreadCount > 0;
  const isMine = !!conversation.lastMessage && Number(conversation.lastMessage.senderId) === currentUserId;
  const preview = getMessagePreview(conversation.lastMessage?.messageType, conversation.lastMessage?.content, isMine);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className={`mseek-list-in group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all duration-200 active:scale-[0.985] ${
        unread
          ? "border-blue-100/80 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/50 shadow-[0_7px_22px_-15px_rgba(37,99,235,.5)] hover:border-blue-200 hover:shadow-[0_10px_28px_-14px_rgba(37,99,235,.45)]"
          : "border-transparent bg-transparent hover:border-slate-200/70 hover:bg-white hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,.3)]"
      }`}
    >
      {unread && <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-500" />}

      {/* AVATAR */}
      <div className="relative shrink-0">
        <div className={`rounded-full p-[2px] transition-all duration-300 ${isOnline ? "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500" : "bg-slate-200/80"}`}>
          <img
            src={conversation.otherUserAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.otherUserName)}`}
            alt={conversation.otherUserName}
            className="h-[52px] w-[52px] rounded-full border-2 border-white bg-slate-100 object-cover"
          />
        </div>

        {isOnline && (
          <span className="absolute bottom-[1px] right-[1px] flex h-[14px] w-[14px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative h-[14px] w-[14px] rounded-full border-[2.5px] border-white bg-emerald-500" />
          </span>
        )}
      </div>

      {/* TEXT */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-[14px] tracking-[-0.15px] text-slate-900 ${unread ? "font-bold" : "font-semibold"}`}>
            {conversation.otherUserName}
          </span>

          {conversation.lastMessageAt && (
            <span className={`shrink-0 text-[10px] ${unread ? "font-bold text-blue-600" : "font-medium text-slate-400"}`}>
              {formatCompactTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-[12px] leading-[18px] ${unread ? "font-semibold text-slate-700" : "font-normal text-slate-500"}`}>
            {preview}
          </span>

          {unread ? (
            <span className="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 px-1.5 text-[9px] font-bold text-white shadow-[0_4px_10px_-3px_rgba(37,99,235,.6)]">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          ) : (
            <CheckCheck size={14} className="shrink-0 text-blue-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </div>

        {isOnline ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-semibold text-emerald-600">Đang hoạt động</span>
          </div>
        ) : lastSeenAt ? (
          <div className="mt-1 truncate text-[9px] font-medium text-slate-400">{formatLastSeen(lastSeenAt)}</div>
        ) : null}
      </div>

      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  );
}

/* ============================================================
   SEARCH USER
   ============================================================ */

function SearchUserItem({
  user,
  isOnline,
  lastSeenAt,
  index,
  loading,
  disabled,
  onClick,
}: {
  user: ChatUser;
  isOnline: boolean;
  lastSeenAt?: string | null;
  index: number;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="mseek-list-in group flex w-full items-center gap-3 rounded-[18px] border border-transparent px-3 py-3 text-left transition-all duration-200 hover:border-slate-200/70 hover:bg-white hover:shadow-[0_10px_30px_-18px_rgba(15,23,42,.3)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="relative shrink-0">
        <div className={`rounded-full p-[2px] ${isOnline ? "bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500" : "bg-slate-200"}`}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="h-[52px] w-[52px] rounded-full border-2 border-white bg-slate-100 object-cover" />
          ) : (
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
              <UserRound size={21} />
            </div>
          )}
        </div>

        {isOnline && <span className="absolute bottom-[1px] right-[1px] h-[14px] w-[14px] rounded-full border-[2.5px] border-white bg-emerald-500" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">{user.fullName}</div>

        <div className={`mt-1 truncate text-[11px] ${isOnline ? "font-medium text-emerald-600" : "text-slate-400"}`}>
          {isOnline ? "Đang hoạt động" : formatLastSeen(lastSeenAt) || user.email}
        </div>
      </div>

      {loading ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Loader2 size={17} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 opacity-0 transition-all duration-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:opacity-100">
          <MessageCircle size={16} />
        </div>
      )}
    </button>
  );
}

/* ============================================================
   SMALL COMPONENTS
   ============================================================ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 flex-1 items-center justify-center rounded-[11px] px-3 text-[12px] font-semibold transition-all duration-200 ${
        active
          ? "bg-white text-blue-600 shadow-[0_3px_10px_-5px_rgba(15,23,42,.25)] ring-1 ring-slate-900/[0.04]"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 pb-2 pt-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function EmptyState({ unread }: { unread: boolean }) {
  return (
    <div className="flex h-full min-h-[330px] flex-col items-center justify-center px-8 pb-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-full bg-blue-200/30 blur-2xl" />

        <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-[24px] border border-white bg-gradient-to-br from-white to-blue-50 text-blue-600 shadow-[0_18px_45px_-18px_rgba(37,99,235,.5)] ring-1 ring-blue-100/60">
          <MessageCircle size={31} strokeWidth={1.8} />
        </div>

        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f8faff] bg-gradient-to-br from-blue-500 to-indigo-600">
          <Sparkles size={11} className="text-white" />
        </span>
      </div>

      <div className="mt-6 text-[15px] font-bold tracking-[-0.2px] text-slate-800">
        {unread ? "Bạn đã xem hết rồi" : "Bắt đầu một cuộc trò chuyện"}
      </div>

      <div className="mt-2 max-w-[245px] text-[11px] leading-[18px] text-slate-400">
        {unread
          ? "Hiện tại không còn tin nhắn nào đang chờ bạn đọc."
          : "Tìm kiếm một người phía trên để bắt đầu kết nối và trò chuyện."}
      </div>
    </div>
  );
}

function SearchEmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border border-slate-200/70 bg-white text-slate-400 shadow-[0_12px_30px_-18px_rgba(15,23,42,.4)]">
        <Search size={24} />
      </div>

      <div className="mt-4 text-[13px] font-bold text-slate-700">Không tìm thấy kết quả</div>

      <div className="mt-1.5 max-w-[230px] text-[11px] leading-[18px] text-slate-400">
        Không tìm thấy người hoặc cuộc trò chuyện phù hợp với “{query}”.
      </div>
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function getMessagePreview(type?: string | null, content?: string | null, isMine = false) {
  const prefix = isMine ? "Bạn: " : "";
  const value = type?.toUpperCase();

  switch (value) {
    case "IMAGE":
      return `${prefix}📷 Đã gửi một ảnh`;
    case "FILE":
      return `${prefix}📎 Đã gửi một tệp`;
    case "VOICE":
    case "AUDIO":
      return `${prefix}🎙️ Tin nhắn thoại`;
    case "STICKER":
      return `${prefix}✨ Đã gửi một sticker`;
    case "CALL":
      return `${prefix}${content || "📞 Cuộc gọi đã kết thúc"}`;
    default:
      return `${prefix}${content?.trim() || "Bắt đầu trò chuyện"}`;
  }
}

function formatCompactTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLastSeen(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Vừa hoạt động";
  if (diff < hour) return `Hoạt động ${Math.floor(diff / minute)} phút trước`;
  if (diff < day) return `Hoạt động ${Math.floor(diff / hour)} giờ trước`;

  const days = Math.floor(diff / day);

  if (days === 1) return "Hoạt động hôm qua";

  return `Hoạt động ${days} ngày trước`;
}