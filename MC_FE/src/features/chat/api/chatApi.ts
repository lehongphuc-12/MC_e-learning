import { request } from "../../../services/api";
import {
  ChatMessage,
  ChatPagedResult,
  ChatUser,
  ChatUserProfile,
  Conversation,
  StickerPack,
} from "../types/chatTypes";

const CHAT_BASE = "/v1/chat";

export const chatApi = {
  searchUsers(keyword: string): Promise<ChatUser[]> {
    const value = encodeURIComponent(keyword.trim());

    return request(`${CHAT_BASE}/users/search?keyword=${value}`, {
      method: "GET",
    });
  },

  createConversation(otherUserId: number): Promise<Conversation> {
    return request(`${CHAT_BASE}/conversations`, {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });
  },

  getConversations(): Promise<Conversation[]> {
    return request(`${CHAT_BASE}/conversations`, {
      method: "GET",
    });
  },

  getUserProfile(conversationId: number): Promise<ChatUserProfile> {
    return request(
      `${CHAT_BASE}/conversations/${conversationId}/profile`,
      { method: "GET" }
    );
  },

  getMessages(
    conversationId: number,
    page = 1,
    pageSize = 30
  ): Promise<ChatPagedResult<ChatMessage>> {
    return request(
      `${CHAT_BASE}/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
      { method: "GET" }
    );
  },

  sendText(
    conversationId: number,
    content: string,
    replyToMessageId?: number | null
  ): Promise<ChatMessage> {
    return request(`${CHAT_BASE}/messages/text`, {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        content,
        replyToMessageId: replyToMessageId ?? null,
      }),
    });
  },

  sendSticker(
    conversationId: number,
    stickerId: number,
    replyToMessageId?: number | null
  ): Promise<ChatMessage> {
    return request(`${CHAT_BASE}/messages/sticker`, {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        stickerId,
        replyToMessageId: replyToMessageId ?? null,
      }),
    });
  },

  sendFile(
    conversationId: number,
    file: File,
    replyToMessageId?: number | null
  ): Promise<ChatMessage> {
    const form = new FormData();

    form.append("ConversationId", String(conversationId));
    form.append("File", file, file.name);

    if (replyToMessageId != null)
      form.append("ReplyToMessageId", String(replyToMessageId));

    return request(`${CHAT_BASE}/messages/file`, {
      method: "POST",
      body: form,
    });
  },

  sendVoice(
    conversationId: number,
    audio: Blob,
    durationSeconds: number,
    replyToMessageId?: number | null
  ): Promise<ChatMessage> {
    const form = new FormData();
    const mimeType = (audio.type || "audio/webm")
      .split(";")[0]
      .toLowerCase();

    const extension =
      mimeType === "audio/ogg"
        ? "ogg"
        : mimeType === "audio/mp4"
          ? "m4a"
          : mimeType === "audio/mpeg"
            ? "mp3"
            : mimeType === "audio/wav" || mimeType === "audio/x-wav"
              ? "wav"
              : "webm";

    form.append("ConversationId", String(conversationId));
    form.append("Audio", audio, `voice-${Date.now()}.${extension}`);
    form.append("DurationSeconds", String(durationSeconds));

    if (replyToMessageId != null)
      form.append("ReplyToMessageId", String(replyToMessageId));

    return request(`${CHAT_BASE}/messages/voice`, {
      method: "POST",
      body: form,
    });
  },

  forwardMessage(
    messageId: number,
    conversationIds: number[]
  ): Promise<ChatMessage[]> {
    return request(`${CHAT_BASE}/messages/${messageId}/forward`, {
      method: "POST",
      body: JSON.stringify({ conversationIds }),
    });
  },

  recall(messageId: number): Promise<ChatMessage> {
    return request(`${CHAT_BASE}/messages/${messageId}/recall`, {
      method: "POST",
    });
  },

  react(
    messageId: number,
    reaction: string
  ): Promise<ChatMessage> {
    return request(`${CHAT_BASE}/messages/${messageId}/reaction`, {
      method: "POST",
      body: JSON.stringify({ reaction }),
    });
  },

  async markRead(
    conversationId: number,
    messageId: number
  ): Promise<void> {
    await request<void>(
      `${CHAT_BASE}/conversations/${conversationId}/read/${messageId}`,
      { method: "POST" }
    );
  },

  getStickers(): Promise<StickerPack[]> {
    return request(`${CHAT_BASE}/stickers`, {
      method: "GET",
    });
  },
};