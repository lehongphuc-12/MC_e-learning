export interface ForumTopic {
  topicId: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  orderIndex: number;
  postsCount: number;
}

export interface ForumPost {
  postId: number;
  topicId: number;
  topicName: string;
  topicSlug: string;
  authorId: number;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole: string;
  title: string;
  content: string;
  imageUrl?: string;
  viewsCount: number;
  reactionsCount: number;
  commentsCount: number;
  reportsCount: number;
  status: 'PUBLISHED' | 'HIDDEN_BY_REPORTS' | 'HIDDEN_BY_ADMIN' | 'DELETED';
  isPinned: boolean;
  isLocked: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  updatedAt: string;
  userReaction?: 'LIKE' | 'LOVE' | 'HELPFUL';
  userHasReported: boolean;
  isAuthor: boolean;
}

export interface CreatePostPayload {
  topicId: number;
  title: string;
  content: string;
  imageUrl?: string;
  isAnonymous?: boolean;
}

export interface ForumComment {
  commentId: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  parentCommentId?: number;
  depthLevel: number;
  content: string;
  imageUrl?: string;
  isAnonymous: boolean;
  reactionsCount: number;
  reportsCount: number;
  status: 'ACTIVE' | 'HIDDEN_BY_REPORTS' | 'HIDDEN_BY_ADMIN' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  userReaction?: 'LIKE' | 'LOVE' | 'HELPFUL';
  userHasReported: boolean;
  isAuthor: boolean;
  replies?: ForumComment[];
}

export interface CreateCommentPayload {
  postId: number;
  parentCommentId?: number;
  content: string;
  imageUrl?: string;
  isAnonymous: boolean;
}

export interface ForumReactionSummary {
  isReacted: boolean;
  reactionType?: 'LIKE' | 'LOVE' | 'HELPFUL';
  totalReactions: number;
}

export interface CreateReportPayload {
  targetType: 'POST' | 'COMMENT';
  postId?: number;
  commentId?: number;
  reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISINFORMATION' | 'OTHER';
  details?: string;
}

export interface ForumReport {
  reportId: number;
  reporterId: number;
  reporterName: string;
  targetType: 'POST' | 'COMMENT';
  postId?: number;
  postTitle?: string;
  postContent?: string;
  postImageUrl?: string;
  postTopicName?: string;
  commentId?: number;
  commentSnippet?: string;
  commentContent?: string;
  commentImageUrl?: string;
  authorId: number;
  authorName: string;
  authorEmail?: string;
  targetStatus?: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt?: string;
  resolvedByName?: string;
}

export interface ForumPostQuery {
  page?: number;
  limit?: number;
  topicId?: number;
  search?: string;
  sortBy?: 'latest' | 'hot' | 'most_commented';
}
