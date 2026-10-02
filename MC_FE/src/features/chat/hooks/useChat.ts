import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { chatApi } from "../api/chatApi";
import {
  getOnlineUsers,
  onUserOffline,
  onUserOnline,
  startChatHub,
  stopChatHub,
} from "../services/chatHub";
import {
  ChatMessage,
  ChatUser,
  Conversation,
  ReadEvent,
  StickerPack,
  TypingEvent,
} from "../types/chatTypes";

const MESSAGE_PAGE_SIZE = 30;

export function useChat() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = Number(user?.id);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stickers, setStickers] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [lastSeenByUserId, setLastSeenByUserId] = useState<Record<number, string | null>>({});

  const activeRef = useRef<Conversation | null>(null);
  const currentUserIdRef = useRef(currentUserId);
  const searchRequestRef = useRef(0);
  const currentPageRef = useRef(1);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    activeRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const normalizeMessage = useCallback(
    (message: ChatMessage): ChatMessage => ({
      ...message,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      reactions: Array.isArray(message.reactions) ? message.reactions : [],
    }),
    []
  );

  const sortMessages = useCallback(
    (items: ChatMessage[]) =>
      [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      ),
    []
  );

  const isMyMessage = useCallback((message: ChatMessage) => {
    const id = currentUserIdRef.current;
    return Number.isFinite(id) && Number(message.senderId) === id;
  }, []);

  const upsertMessage = useCallback(
    (raw: ChatMessage) => {
      const message = normalizeMessage(raw);

      setMessages((current) => {
        const index = current.findIndex(
          (item) => item.messageId === message.messageId
        );

        if (index === -1) {
          return sortMessages([...current, message]);
        }

        const next = [...current];
        next[index] = message;
        return next;
      });
    },
    [normalizeMessage, sortMessages]
  );

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      const items = Array.isArray(data) ? data : [];

      setConversations(items);

      setLastSeenByUserId((current) => {
        const next = { ...current };

        items.forEach((item) => {
          if (item.otherUserLastSeenAt) {
            next[Number(item.otherUserId)] =
              item.otherUserLastSeenAt;
          }
        });

        return next;
      });
    } catch (error) {
      console.error("Load conversations error:", error);
      setConversations([]);
    }
  }, []);

  const loadStickers = useCallback(async () => {
    try {
      const data = await chatApi.getStickers();
      setStickers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load stickers error:", error);
      setStickers([]);
    }
  }, []);

  const searchUsers = useCallback(async (keyword: string) => {
    const query = keyword.trim();
    const requestId = ++searchRequestRef.current;

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    try {
      const data = await chatApi.searchUsers(query);

      if (requestId !== searchRequestRef.current) return;

      const items = Array.isArray(data) ? data : [];

      setSearchResults(items);

      setLastSeenByUserId((current) => {
        const next = { ...current };

        items.forEach((item) => {
          if (item.lastSeenAt) {
            next[Number(item.userId)] = item.lastSeenAt;
          }
        });

        return next;
      });
    } catch (error) {
      console.error("Search users error:", error);

      if (requestId === searchRequestRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let hub: Awaited<ReturnType<typeof startChatHub>> | null = null;

    const clearChatState = () => {
      activeRef.current = null;
      currentPageRef.current = 1;
      loadingOlderRef.current = false;
      searchRequestRef.current += 1;

      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setStickers([]);
      setLoading(false);
      setLoadingOlder(false);
      setHasOlderMessages(false);
      setTypingUserId(null);
      setSearchResults([]);
      setSearching(false);
      setOnlineUserIds(new Set());
      setLastSeenByUserId({});
    };

    const initialize = async () => {
      /*
       * Logout hoặc chưa có user.
       * Không được tạo SignalR connection.
       */
      if (
        !Number.isFinite(currentUserId) ||
        currentUserId <= 0
      ) {
        clearChatState();

        try {
          await stopChatHub();
        } catch (error) {
          console.warn("Stop ChatHub error:", error);
        }

        return;
      }

      try {
        /*
         * Đóng connection của account trước nếu còn tồn tại.
         * Sau đó mới tạo connection bằng token/user hiện tại.
         */
        await stopChatHub();

        if (disposed) return;

        clearChatState();

        await Promise.all([
          loadConversations(),
          loadStickers(),
        ]);

        if (disposed) return;

        hub = await startChatHub();

        if (disposed) {
          await stopChatHub();
          return;
        }

        hub.off("ReceiveMessage");
        hub.off("ConversationUpdated");
        hub.off("MessageRecalled");
        hub.off("MessageReactionChanged");
        hub.off("UserTyping");
        hub.off("MessagesRead");
        hub.off("UserOnline");
        hub.off("UserOffline");

        hub.on("ReceiveMessage", (message: ChatMessage) => {
          const active = activeRef.current;

          if (
            active?.conversationId ===
            message.conversationId
          ) {
            upsertMessage(message);

            if (!isMyMessage(message)) {
              void (async () => {
                try {
                  await chatApi.markRead(
                    message.conversationId,
                    message.messageId
                  );

                  const connectedHub =
                    await startChatHub();

                  await connectedHub.invoke(
                    "MarkRead",
                    message.conversationId,
                    message.messageId
                  );
                } catch (error) {
                  console.warn(
                    "Realtime mark read error:",
                    error
                  );
                }
              })();
            }
          }

          void loadConversations();
        });

        hub.on(
          "ConversationUpdated",
          () => void loadConversations()
        );

        hub.on(
          "MessageRecalled",
          (message: ChatMessage) => {
            if (
              activeRef.current?.conversationId ===
              message.conversationId
            ) {
              upsertMessage(message);
            }

            void loadConversations();
          }
        );

        hub.on(
          "MessageReactionChanged",
          (message: ChatMessage) => {
            if (
              activeRef.current?.conversationId ===
              message.conversationId
            ) {
              upsertMessage(message);
            }
          }
        );

        hub.on(
          "UserTyping",
          (event: TypingEvent) => {
            if (
              event.conversationId !==
                activeRef.current?.conversationId ||
              event.userId === currentUserIdRef.current
            ) {
              return;
            }

            setTypingUserId(
              event.isTyping ? event.userId : null
            );
          }
        );

        hub.on(
          "MessagesRead",
          (event: ReadEvent) => {
            if (
              event.conversationId !==
              activeRef.current?.conversationId
            ) {
              return;
            }

            setMessages((current) =>
              current.map((message) =>
                Number(message.senderId) ===
                  currentUserIdRef.current &&
                message.messageId <= event.messageId
                  ? {
                      ...message,
                      isRead: true,
                    }
                  : message
              )
            );
          }
        );

        onUserOnline((userId) => {
          if (disposed) return;

          setOnlineUserIds((current) => {
            const next = new Set(current);
            next.add(Number(userId));
            return next;
          });
        });

        onUserOffline((userId, lastSeenAt) => {
          if (disposed) return;

          const id = Number(userId);

          setOnlineUserIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });

          setLastSeenByUserId((current) => ({
            ...current,
            [id]: lastSeenAt,
          }));
        });

        const onlineIds = await getOnlineUsers();

        if (disposed) return;

        setOnlineUserIds(
          new Set(
            onlineIds
              .map(Number)
              .filter((id) => Number.isFinite(id))
          )
        );
      } catch (error) {
        if (!disposed) {
          console.error(
            "Chat SignalR initialize error:",
            error
          );
        }
      }
    };

    void initialize();

    return () => {
      disposed = true;

      activeRef.current = null;
      currentPageRef.current = 1;
      loadingOlderRef.current = false;
      searchRequestRef.current += 1;

      if (hub) {
        hub.off("ReceiveMessage");
        hub.off("ConversationUpdated");
        hub.off("MessageRecalled");
        hub.off("MessageReactionChanged");
        hub.off("UserTyping");
        hub.off("MessagesRead");
        hub.off("UserOnline");
        hub.off("UserOffline");
      }

      /*
       * Rất quan trọng:
       * user đổi/logout => đóng connection cũ.
       * Backend sẽ chạy OnDisconnectedAsync và lưu LastSeenAt.
       */
      void stopChatHub();
    };
  }, [
    currentUserId,
    isMyMessage,
    loadConversations,
    loadStickers,
    upsertMessage,
  ]);

  const openConversation = useCallback(
    async (conversation: Conversation) => {
      setLoading(true);

      try {
        const hub = await startChatHub();
        const previous = activeRef.current;

        if (
          previous &&
          previous.conversationId !==
            conversation.conversationId
        ) {
          try {
            await hub.invoke(
              "LeaveConversation",
              previous.conversationId
            );
          } catch (error) {
            console.warn(
              "Leave conversation error:",
              error
            );
          }
        }

        /*
         * Backend xác nhận membership trước.
         * Chỉ khi JoinConversation thành công mới set active.
         */
        await hub.invoke(
          "JoinConversation",
          conversation.conversationId
        );

        activeRef.current = conversation;
        currentPageRef.current = 1;
        loadingOlderRef.current = false;

        setActiveConversation(conversation);
        setTypingUserId(null);
        setMessages([]);
        setLoadingOlder(false);
        setHasOlderMessages(false);

        const result = await chatApi.getMessages(
          conversation.conversationId,
          1,
          MESSAGE_PAGE_SIZE
        );

        /*
         * Trong lúc request chạy user có thể đã chuyển chat.
         */
        if (
          activeRef.current?.conversationId !==
          conversation.conversationId
        ) {
          return;
        }

        const loaded = Array.isArray(result?.items)
          ? result.items.map(normalizeMessage)
          : [];

        const sorted = sortMessages(loaded);

        setMessages(sorted);
        currentPageRef.current = 1;

        setHasOlderMessages(
          loaded.length === MESSAGE_PAGE_SIZE
        );

        const lastReceived = [...sorted]
          .reverse()
          .find(
            (message) =>
              Number(message.senderId) !==
              currentUserIdRef.current
          );

        if (lastReceived) {
          try {
            await chatApi.markRead(
              conversation.conversationId,
              lastReceived.messageId
            );

            await hub.invoke(
              "MarkRead",
              conversation.conversationId,
              lastReceived.messageId
            );

            await loadConversations();
          } catch (error) {
            console.warn(
              "Mark read error:",
              error
            );
          }
        }
      } catch (error) {
        /*
         * JoinConversation fail thì không được giữ
         * conversation sai làm active.
         */
        if (
          activeRef.current?.conversationId ===
          conversation.conversationId
        ) {
          activeRef.current = null;
          setActiveConversation(null);
          setMessages([]);
          setTypingUserId(null);
          setHasOlderMessages(false);
        }

        console.error(
          "Open conversation error:",
          error
        );

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      loadConversations,
      normalizeMessage,
      sortMessages,
    ]
  );

  const loadOlderMessages = useCallback(async () => {
    const conversation = activeRef.current;

    if (
      !conversation ||
      loadingOlderRef.current
    ) {
      return;
    }

    const conversationId =
      conversation.conversationId;

    const nextPage =
      currentPageRef.current + 1;

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const result = await chatApi.getMessages(
        conversationId,
        nextPage,
        MESSAGE_PAGE_SIZE
      );

      if (
        activeRef.current?.conversationId !==
        conversationId
      ) {
        return;
      }

      const older = Array.isArray(result?.items)
        ? result.items.map(normalizeMessage)
        : [];

      if (!older.length) {
        setHasOlderMessages(false);
        return;
      }

      setMessages((current) => {
        const map =
          new Map<number, ChatMessage>();

        older.forEach((message) => {
          map.set(
            message.messageId,
            message
          );
        });

        current.forEach((message) => {
          map.set(
            message.messageId,
            message
          );
        });

        return sortMessages(
          Array.from(map.values())
        );
      });

      currentPageRef.current = nextPage;

      setHasOlderMessages(
        older.length === MESSAGE_PAGE_SIZE
      );
    } catch (error) {
      console.error(
        "Load older messages error:",
        error
      );

      throw error;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [normalizeMessage, sortMessages]);

  const startConversation = useCallback(
    async (chatUser: ChatUser) => {
      setLoading(true);

      try {
        const conversation =
          await chatApi.createConversation(
            chatUser.userId
          );

        await loadConversations();

        setSearchResults([]);

        await openConversation(
          conversation
        );
      } catch (error) {
        console.error(
          "Start conversation error:",
          error
        );

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      loadConversations,
      openConversation,
    ]
  );

  const closeConversation =
    useCallback(async () => {
      const active = activeRef.current;

      if (active) {
        try {
          const hub =
            await startChatHub();

          await hub.invoke(
            "LeaveConversation",
            active.conversationId
          );
        } catch (error) {
          console.warn(
            "Leave conversation error:",
            error
          );
        }
      }

      activeRef.current = null;
      currentPageRef.current = 1;
      loadingOlderRef.current = false;

      setActiveConversation(null);
      setMessages([]);
      setTypingUserId(null);
      setLoadingOlder(false);
      setHasOlderMessages(false);
    }, []);

  const sendText = useCallback(
    async (
      content: string,
      replyId?: number | null
    ) => {
      const conversation =
        activeRef.current;

      if (!conversation) return;

      const text = content.trim();

      if (!text) return;

      if (text.length > 5000) {
        throw new Error(
          "Tin nhắn tối đa 5000 ký tự."
        );
      }

      const message =
        await chatApi.sendText(
          conversation.conversationId,
          text,
          replyId
        );

      upsertMessage(message);
      void loadConversations();
    },
    [
      loadConversations,
      upsertMessage,
    ]
  );

  const sendFile = useCallback(
    async (
      file: File,
      replyId?: number | null
    ) => {
      const conversation =
        activeRef.current;

      if (!conversation) return;

      const isImage =
        file.type.startsWith("image/");

      const maxSize =
        isImage ? 10 : 25;

      if (
        file.size >
        maxSize * 1024 * 1024
      ) {
        throw new Error(
          isImage
            ? "Ảnh tối đa 10MB."
            : "File tối đa 25MB."
        );
      }

      const message =
        await chatApi.sendFile(
          conversation.conversationId,
          file,
          replyId
        );

      upsertMessage(message);
      void loadConversations();
    },
    [
      loadConversations,
      upsertMessage,
    ]
  );

  const sendVoice = useCallback(
    async (
      blob: Blob,
      duration: number,
      replyId?: number | null
    ) => {
      const conversation =
        activeRef.current;

      if (!conversation) return;

      if (
        duration < 1 ||
        duration > 600
      ) {
        throw new Error(
          "Voice message phải từ 1 đến 600 giây."
        );
      }

      if (
        blob.size >
        20 * 1024 * 1024
      ) {
        throw new Error(
          "Voice tối đa 20MB."
        );
      }

      const message =
        await chatApi.sendVoice(
          conversation.conversationId,
          blob,
          duration,
          replyId
        );

      upsertMessage(message);
      void loadConversations();
    },
    [
      loadConversations,
      upsertMessage,
    ]
  );

  const sendSticker = useCallback(
    async (
      stickerId: number,
      replyId?: number | null
    ) => {
      const conversation =
        activeRef.current;

      if (!conversation) return;

      const message =
        await chatApi.sendSticker(
          conversation.conversationId,
          stickerId,
          replyId
        );

      upsertMessage(message);
      void loadConversations();
    },
    [
      loadConversations,
      upsertMessage,
    ]
  );

  const forwardMessage = useCallback(
    async (
      messageId: number,
      conversationIds: number[]
    ) => {
      const targetIds = [
        ...new Set(
          conversationIds.filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          )
        ),
      ];

      if (!targetIds.length) return;

      const result =
        await chatApi.forwardMessage(
          messageId,
          targetIds
        );

      const forwarded =
        Array.isArray(result)
          ? result.map(normalizeMessage)
          : [];

      const active =
        activeRef.current;

      if (active) {
        forwarded
          .filter(
            (message) =>
              message.conversationId ===
              active.conversationId
          )
          .forEach(upsertMessage);
      }

      await loadConversations();
    },
    [
      loadConversations,
      normalizeMessage,
      upsertMessage,
    ]
  );

  const react = useCallback(
    async (
      messageId: number,
      reaction: string
    ) => {
      const message =
        await chatApi.react(
          messageId,
          reaction
        );

      upsertMessage(message);
    },
    [upsertMessage]
  );

  const recall = useCallback(
    async (messageId: number) => {
      const message =
        await chatApi.recall(
          messageId
        );

      upsertMessage(message);
      void loadConversations();
    },
    [
      loadConversations,
      upsertMessage,
    ]
  );

  const typing = useCallback(
    (value: boolean) => {
      const conversation =
        activeRef.current;

      if (!conversation) return;

      void (async () => {
        try {
          const hub =
            await startChatHub();

          /*
           * conversation chỉ được set active
           * sau khi JoinConversation thành công.
           */
          if (
            activeRef.current
              ?.conversationId !==
            conversation.conversationId
          ) {
            return;
          }

          await hub.invoke(
            "Typing",
            conversation.conversationId,
            value
          );
        } catch (error) {
          console.warn(
            "Typing SignalR error:",
            error
          );
        }
      })();
    },
    []
  );

  return {
    conversations,
    activeConversation,
    messages,
    stickers,
    loading,
    loadingOlder,
    hasOlderMessages,
    typingUserId,
    searchResults,
    searching,
    onlineUserIds,
    lastSeenByUserId,
    searchUsers,
    openConversation,
    startConversation,
    closeConversation,
    loadOlderMessages,
    sendText,
    sendFile,
    sendVoice,
    sendSticker,
    forwardMessage,
    react,
    recall,
    typing,
  };
}