import { request } from '../../../services/api';
import {
  ForumTopic,
  ForumPost,
  ForumComment,
  CreatePostPayload,
  CreateCommentPayload,
  ForumReactionSummary,
  CreateReportPayload,
  ForumReport,
  ForumPostQuery,
} from '../types/forumTypes';

export const forumApi = {
  // Topics
  async getTopics(): Promise<ForumTopic[]> {
    try {
      const res = await request<{ success: boolean; data: ForumTopic[] }>('/forum/topics');
      if (res.success && res.data) return res.data;
    } catch (_) {}
    return [
      { topicId: 1, name: 'Thảo luận chung', slug: 'thao-luan-chung', description: 'Trao đổi các chủ đề chung về MC và diễn xuất', icon: 'MessageSquare', orderIndex: 1, postsCount: 12 },
      { topicId: 2, name: 'Kỹ năng & Mẹo MC', slug: 'ky-nang-meo-mc', description: 'Chia sẻ kinh nghiệm làm chủ sân khấu, giọng nói', icon: 'Mic', orderIndex: 2, postsCount: 8 },
      { topicId: 3, name: 'Hỏi đáp khóa học', slug: 'hoi-dap-khoa-hoc', description: 'Giải đáp thắc mắc về nội dung các bài học', icon: 'HelpCircle', orderIndex: 3, postsCount: 15 },
      { topicId: 4, name: 'Góc tuyển dụng & Show', slug: 'tuyen-dung-show', description: 'Cơ hội việc làm, tìm bạn đồng hành, tìm show', icon: 'Briefcase', orderIndex: 4, postsCount: 5 },
    ];
  },

  // Posts
  async getPosts(query: ForumPostQuery = {}): Promise<{ items: ForumPost[]; totalItems: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));
      if (query.topicId) params.append('topicId', String(query.topicId));
      if (query.search) params.append('search', query.search);
      if (query.sortBy) params.append('sortBy', query.sortBy);

      const res = await request<{ success: boolean; data: any }>(`/forum/posts?${params.toString()}`);
      if (res.success && res.data) {
        return {
          items: res.data.items || [],
          totalItems: res.data.totalItems || 0,
          page: res.data.page || 1,
          totalPages: res.data.totalPages || 1,
        };
      }
    } catch (_) {}
    return { items: [], totalItems: 0, page: 1, totalPages: 1 };
  },

  async getPostById(postId: number | string): Promise<ForumPost | null> {
    try {
      const res = await request<{ success: boolean; data: ForumPost }>(`/forum/posts/${postId}`);
      if (res.success && res.data) return res.data;
    } catch (_) {}
    return null;
  },

  async createPost(payload: CreatePostPayload): Promise<{ success: boolean; data?: ForumPost; message?: string }> {
    try {
      const res = await request<{ success: boolean; data: ForumPost; message?: string }>('/forum/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { success: res.success, data: res.data, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể tạo bài viết.' };
    }
  },

  async updatePost(postId: number | string, payload: CreatePostPayload): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await request<{ success: boolean; message?: string }>(`/forum/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể cập nhật bài viết.' };
    }
  },

  async deletePost(postId: number | string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await request<{ success: boolean; message?: string }>(`/forum/posts/${postId}`, {
        method: 'DELETE',
      });
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể xóa bài viết.' };
    }
  },

  async togglePostReaction(postId: number | string, reactionType: 'LIKE' | 'LOVE' | 'HELPFUL'): Promise<ForumReactionSummary | null> {
    try {
      const res = await request<{ success: boolean; data: ForumReactionSummary }>(`/forum/posts/${postId}/react`, {
        method: 'POST',
        body: JSON.stringify({ targetType: 'POST', postId: Number(postId), reactionType }),
      });
      if (res.success && res.data) return res.data;
    } catch (_) {}
    return null;
  },

  async reportPost(postId: number | string, reason: string, details?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await request<{ success: boolean; message?: string }>(`/forum/posts/${postId}/report`, {
        method: 'POST',
        body: JSON.stringify({ targetType: 'POST', postId: Number(postId), reason, details }),
      });
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể gửi báo cáo vi phạm.' };
    }
  },

  // Comments
  async getComments(postId: number | string): Promise<ForumComment[]> {
    try {
      const res = await request<{ success: boolean; data: ForumComment[] }>(`/forum/posts/${postId}/comments`);
      if (res.success && res.data) return res.data;
    } catch (_) {}
    return [];
  },

  async addComment(payload: CreateCommentPayload): Promise<{ success: boolean; data?: ForumComment; message?: string }> {
    try {
      const res = await request<{ success: boolean; data: ForumComment; message?: string }>('/forum/comments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { success: res.success, data: res.data, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể gửi bình luận.' };
    }
  },

  async deleteComment(commentId: number | string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await request<{ success: boolean; message?: string }>(`/forum/comments/${commentId}`, {
        method: 'DELETE',
      });
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể xóa bình luận.' };
    }
  },

  async toggleCommentReaction(commentId: number | string, reactionType: 'LIKE' | 'LOVE' | 'HELPFUL'): Promise<ForumReactionSummary | null> {
    try {
      const res = await request<{ success: boolean; data: ForumReactionSummary }>(`/forum/comments/${commentId}/react`, {
        method: 'POST',
        body: JSON.stringify({ targetType: 'COMMENT', commentId: Number(commentId), reactionType }),
      });
      if (res.success && res.data) return res.data;
    } catch (_) {}
    return null;
  },

  async reportComment(commentId: number | string, reason: string, details?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await request<{ success: boolean; message?: string }>(`/forum/comments/${commentId}/report`, {
        method: 'POST',
        body: JSON.stringify({ targetType: 'COMMENT', commentId: Number(commentId), reason, details }),
      });
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể gửi báo cáo bình luận.' };
    }
  },

  // Admin Moderation
  async getReports(page: number = 1, limit: number = 10, status?: string): Promise<{ items: ForumReport[]; totalItems: number }> {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.append('status', status);

      const res = await request<{ success: boolean; data: any }>(`/admin/forum/reports?${params.toString()}`);
      if (res.success && res.data) {
        return {
          items: res.data.items || [],
          totalItems: res.data.totalItems || 0,
        };
      }
    } catch (_) {}
    return { items: [], totalItems: 0 };
  },

  async getAdminPosts(page: number = 1, limit: number = 10, topicId?: number, status?: string, search?: string): Promise<{ items: ForumPost[]; totalItems: number; totalPages: number }> {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (topicId) params.append('topicId', String(topicId));
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const res = await request<{ success: boolean; data: any }>(`/admin/forum/posts?${params.toString()}`);
      if (res.success && res.data) {
        return {
          items: res.data.items || [],
          totalItems: res.data.totalItems || 0,
          totalPages: res.data.totalPages || 1,
        };
      }
    } catch (_) {}
    return { items: [], totalItems: 0, totalPages: 1 };
  },

  async updatePostStatus(postId: number, status: string): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/forum/posts/${postId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      return res.success;
    } catch (_) {
      return false;
    }
  },

  async resolveReport(reportId: number, action: 'DISMISS' | 'HIDE' | 'DELETE'): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/forum/reports/${reportId}/resolve?action=${action}`, {
        method: 'POST',
      });
      return res.success;
    } catch (_) {
      return false;
    }
  },

  async restorePost(postId: number): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/forum/posts/${postId}/restore`, {
        method: 'POST',
      });
      return res.success;
    } catch (_) {
      return false;
    }
  },

  async restoreComment(commentId: number): Promise<boolean> {
    try {
      const res = await request<{ success: boolean }>(`/admin/forum/comments/${commentId}/restore`, {
        method: 'POST',
      });
      return res.success;
    } catch (_) {
      return false;
    }
  },

  async uploadImage(file: File): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await request<{ success: boolean; data?: string; message?: string }>('/forum/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.success && res.data) {
        return { success: true, imageUrl: res.data };
      }
      return { success: false, message: res.message || 'Tải ảnh thất bại.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể kết nối máy chủ để tải ảnh.' };
    }
  },
};
