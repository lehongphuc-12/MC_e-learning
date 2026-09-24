export interface ChatUser {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  conversationId?: number | null;
  lastSeenAt?: string | null;
}

export interface ChatUserProfile {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  bio?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  experienceLevel?: string | null;
  learningGoal?: string | null;
  preferredLanguage?: string | null;
}

export interface Conversation {
  conversationId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  otherUserLastSeenAt?: string | null;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string | null;
  content?: string | null;
  messageType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  recalledAt?: string | null;
  sticker?: Sticker | null;
  replyTo?: ReplyMessage | null;
  attachments: Attachment[];
  reactions: Reaction[];
  isMine?: boolean;
  isRead: boolean;
}

export interface ReplyMessage {
  messageId: number;
  senderId: number;
  senderName: string;
  content?: string | null;
  messageType: string;
  status: string;
}

export interface Attachment {
  attachmentId: number;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  attachmentType: string;
  durationSeconds?: number | null;
}

export interface Reaction {
  reactionId: number;
  userId: number;
  userName: string;
  reaction: string;
}

export interface Sticker {
  stickerId: number;
  stickerPackId: number;
  name: string;
  imageUrl: string;
}

export interface StickerPack {
  stickerPackId: number;
  name: string;
  thumbnailUrl?: string | null;
  stickers: Sticker[];
}

export interface ChatPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TypingEvent {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface ReadEvent {
  conversationId: number;
  userId: number;
  messageId: number;
}

export interface Call {
  callId: number;
  conversationId: number;
  callerId: number;
  callerName: string;
  callerAvatarUrl?: string | null;
  receiverId: number;
  receiverName: string;
  receiverAvatarUrl?: string | null;
  callType: "VOICE" | "VIDEO";
  status: string;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
}

export interface WebRtcDescription {
  type: "offer" | "answer";
  sdp: string;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}