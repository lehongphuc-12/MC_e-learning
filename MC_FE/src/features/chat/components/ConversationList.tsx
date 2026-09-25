import {
  Edit,
  Expand,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ChatUser,
  Conversation,
} from "../types/chatTypes";

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
  const [startingUserId, setStartingUserId] =
    useState<number | null>(null);

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

    if (tab === "UNREAD") {
      result = result.filter(
        (conversation) =>
          conversation.unreadCount > 0
      );
    }

    if (query) {
      const keyword = query.toLowerCase();

      result = result.filter(
        (conversation) =>
          conversation.otherUserName
            .toLowerCase()
            .includes(keyword)
      );
    }

    return result;
  }, [
    conversations,
    query,
    tab,
  ]);

  const unreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total +
          (conversation.unreadCount > 0
            ? 1
            : 0),
        0
      ),
    [conversations]
  );

  const handleSelectUser = async (
    user: ChatUser
  ) => {
    if (startingUserId !== null) {
      return;
    }

    try {
      setStartingUserId(user.userId);

      await onSelectUser(user);

      setSearch("");
    } finally {
      setStartingUserId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* HEADER GIỐNG MESSENGER */}
      <div className="shrink-0 px-4 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-bold tracking-[-0.7px] text-slate-900">
            Đoạn chat
          </h2>

          
        </div>

        {/* SEARCH */}
        <div className="relative mt-3">
          <div
            className="
              flex h-[44px] items-center
              rounded-full bg-slate-100
              px-4 transition
              focus-within:bg-slate-50
              focus-within:ring-2
              focus-within:ring-blue-100
            "
          >
            {searching ? (
              <Loader2
                size={19}
                className="mr-2.5 shrink-0 animate-spin text-slate-500"
              />
            ) : (
              <Search
                size={19}
                className="mr-2.5 shrink-0 text-slate-500"
              />
            )}

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Tìm kiếm trên MSeek Chat"
              className="
                min-w-0 flex-1
                bg-transparent
                text-[14px]
                text-slate-800
                outline-none
                placeholder:text-slate-500
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="
                  ml-2 flex h-6 w-6
                  shrink-0 items-center
                  justify-center
                  rounded-full
                  text-slate-500
                  transition
                  hover:bg-slate-200
                "
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        {!query && (
          <div className="mt-3 flex items-center gap-1">
            <TabButton
              active={tab === "ALL"}
              onClick={() =>
                setTab("ALL")
              }
            >
              Tất cả
            </TabButton>

            <TabButton
              active={
                tab === "UNREAD"
              }
              onClick={() =>
                setTab("UNREAD")
              }
            >
              Chưa đọc

              {unreadCount > 0 && (
                <span
                  className={`
                    ml-1.5 flex h-5 min-w-5
                    items-center justify-center
                    rounded-full px-1
                    text-[10px] font-bold
                    ${
                      tab === "UNREAD"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }
                  `}
                >
                  {unreadCount}
                </span>
              )}
            </TabButton>
          </div>
        )}
      </div>

      {/* SEARCH RESULTS */}
      {query ? (
        <div className="mseek-chat-scroll mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {visibleConversations.length >
            0 && (
            <>
              <SectionTitle>
                Đoạn chat
              </SectionTitle>

              {visibleConversations.map(
                (
                  conversation,
                  index
                ) => (
                  <ConversationItem
                    key={
                      conversation.conversationId
                    }
                    conversation={
                      conversation
                    }
                    index={index}
                    isOnline={onlineUserIds.has(
                      Number(
                        conversation.otherUserId
                      )
                    )}
                    lastSeenAt={
                      lastSeenByUserId[
                        Number(
                          conversation.otherUserId
                        )
                      ]
                    }
                    onSelect={
                      onSelect
                    }
                  />
                )
              )}
            </>
          )}

          <SectionTitle>
            Mọi người
          </SectionTitle>

          {searching ? (
            <div className="flex items-center justify-center py-10">
              <Loader2
                size={22}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : searchResults.length >
            0 ? (
            searchResults.map(
              (user, index) => (
                <SearchUserItem
                  key={user.userId}
                  user={user}
                  index={index}
                  isOnline={onlineUserIds.has(
                    Number(
                      user.userId
                    )
                  )}
                  lastSeenAt={
                    lastSeenByUserId[
                      Number(
                        user.userId
                      )
                    ]
                  }
                  loading={
                    startingUserId ===
                    user.userId
                  }
                  disabled={
                    startingUserId !==
                    null
                  }
                  onClick={() =>
                    void handleSelectUser(
                      user
                    )
                  }
                />
              )
            )
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search size={23} />
              </div>

              <div className="mt-3 text-sm font-semibold text-slate-700">
                Không tìm thấy
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Thử tìm bằng tên
                hoặc email khác.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CONVERSATIONS */
        <div className="mseek-chat-scroll mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {visibleConversations.length ===
          0 ? (
            <EmptyState
              unread={
                tab === "UNREAD"
              }
            />
          ) : (
            visibleConversations.map(
              (
                conversation,
                index
              ) => (
                <ConversationItem
                  key={
                    conversation.conversationId
                  }
                  conversation={
                    conversation
                  }
                  index={index}
                  isOnline={onlineUserIds.has(
                    Number(
                      conversation.otherUserId
                    )
                  )}
                  lastSeenAt={
                    lastSeenByUserId[
                      Number(
                        conversation.otherUserId
                      )
                    ]
                  }
                  onSelect={
                    onSelect
                  }
                />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CONVERSATION ITEM
   ========================================================= */

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
  onSelect: (
    conversation: Conversation
  ) => void;
}) {
  const unread =
    conversation.unreadCount > 0;

  const preview =
    getMessagePreview(
      conversation.lastMessage
        ?.messageType,
      conversation.lastMessage
        ?.content
    );

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(conversation)
      }
      style={{
        animationDelay: `${Math.min(
          index,
          8
        ) * 35}ms`,
      }}
      className="
        mseek-list-in group
        relative flex w-full
        items-center gap-3
        rounded-xl px-3 py-2.5
        text-left
        transition-colors
        duration-150
        hover:bg-slate-100
        active:bg-slate-200
      "
    >
      {/* AVATAR */}
      <div className="relative shrink-0">
        <img
          src={
            conversation.otherUserAvatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              conversation.otherUserName
            )}`
          }
          alt={
            conversation.otherUserName
          }
          className="
            h-[56px] w-[56px]
            rounded-full
            bg-slate-200
            object-cover
          "
        />

        {isOnline && (
          <span
            className="
              absolute bottom-[1px]
              right-[1px]
              h-[14px] w-[14px]
              rounded-full
              border-[2.5px]
              border-white
              bg-emerald-500
            "
          />
        )}
      </div>

      {/* TEXT */}
      <div className="min-w-0 flex-1">
        <div
          className={`
            truncate text-[14px]
            leading-5 text-slate-900
            ${
              unread
                ? "font-bold"
                : "font-semibold"
            }
          `}
        >
          {
            conversation.otherUserName
          }
        </div>

        <div className="mt-[2px] flex min-w-0 items-center text-[12px] leading-5">
          <span
            className={`
              min-w-0 truncate
              ${
                unread
                  ? "font-semibold text-slate-900"
                  : "text-slate-500"
              }
            `}
          >
            {preview}
          </span>

          {conversation.lastMessageAt && (
            <>
              <span className="mx-1 shrink-0 text-slate-400">
                ·
              </span>

              <span
                className={`
                  shrink-0
                  ${
                    unread
                      ? "font-semibold text-slate-700"
                      : "text-slate-500"
                  }
                `}
              >
                {formatCompactTime(
                  conversation.lastMessageAt
                )}
              </span>
            </>
          )}
        </div>
      </div>

      
    </button>
  );
}

/* =========================================================
   SEARCH USER
   ========================================================= */

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
      style={{
        animationDelay: `${Math.min(
          index,
          8
        ) * 35}ms`,
      }}
      className="
        mseek-list-in
        flex w-full
        items-center gap-3
        rounded-xl
        px-3 py-2.5
        text-left
        transition-colors
        hover:bg-slate-100
        active:bg-slate-200
        disabled:opacity-60
      "
    >
      <div className="relative shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-[56px] w-[56px] rounded-full bg-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <UserRound
              size={23}
            />
          </div>
        )}

        {isOnline && (
          <span className="absolute bottom-[1px] right-[1px] h-[14px] w-[14px] rounded-full border-[2.5px] border-white bg-emerald-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">
          {user.fullName}
        </div>

        <div className="mt-[2px] truncate text-[12px] text-slate-500">
          {isOnline
            ? "Đang hoạt động"
            : formatLastSeen(
                lastSeenAt
              ) ||
              user.email}
        </div>
      </div>

      {loading && (
        <Loader2
          size={18}
          className="shrink-0 animate-spin text-blue-600"
        />
      )}
    </button>
  );
}

/* =========================================================
   COMPONENT NHỎ
   ========================================================= */

function HeaderButton({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="
        flex h-9 w-9
        items-center justify-center
        rounded-full
        text-slate-700
        transition-colors
        hover:bg-slate-100
        active:bg-slate-200
      "
    >
      {children}
    </button>
  );
}

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
      className={`
        flex h-9 items-center
        rounded-full px-4
        text-[13px] font-semibold
        transition-colors
        ${
          active
            ? "bg-blue-50 text-blue-600"
            : "text-slate-700 hover:bg-slate-100"
        }
      `}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  );
}

function EmptyState({
  unread,
}: {
  unread: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <MessageCircle
          size={28}
        />
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-800">
        {unread
          ? "Không có tin nhắn chưa đọc"
          : "Chưa có đoạn chat"}
      </div>

      <div className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
        {unread
          ? "Các tin nhắn chưa đọc sẽ xuất hiện tại đây."
          : "Tìm một người để bắt đầu trò chuyện."}
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getMessagePreview(
  type?: string | null,
  content?: string | null
) {
  const value =
    type?.toUpperCase();

  switch (value) {
    case "IMAGE":
      return "Bạn đã gửi một ảnh.";

    case "FILE":
      return "Bạn đã gửi một tệp.";

    case "VOICE":
    case "AUDIO":
      return "Tin nhắn thoại";

    case "STICKER":
      return "Bạn đã gửi một sticker.";

    case "CALL":
      return (
        content ||
        "Cuộc gọi đã kết thúc."
      );

    default:
      return (
        content?.trim() ||
        "Bắt đầu trò chuyện"
      );
  }
}

function formatCompactTime(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now = new Date();

  const diff = Math.max(
    0,
    now.getTime() -
      date.getTime()
  );

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "1 phút";
  }

  if (diff < hour) {
    return `${Math.floor(
      diff / minute
    )} phút`;
  }

  if (diff < day) {
    return `${Math.floor(
      diff / hour
    )} giờ`;
  }

  if (diff < day * 7) {
    return `${Math.floor(
      diff / day
    )} ngày`;
  }

  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
    }
  );
}

function formatLastSeen(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const diff = Math.max(
    0,
    Date.now() -
      date.getTime()
  );

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Vừa hoạt động";
  }

  if (diff < hour) {
    return `Hoạt động ${Math.floor(
      diff / minute
    )} phút trước`;
  }

  if (diff < day) {
    return `Hoạt động ${Math.floor(
      diff / hour
    )} giờ trước`;
  }

  const days = Math.floor(
    diff / day
  );

  if (days === 1) {
    return "Hoạt động hôm qua";
  }

  return `Hoạt động ${days} ngày trước`;
}