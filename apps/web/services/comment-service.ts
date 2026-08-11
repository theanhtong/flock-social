import { apiClient } from '@/lib/api-client';
import { PostUser } from './post-service';

export interface CommentItem {
  id: string;
  postId: string;
  user: PostUser;
  content: string;
  mediaUrl?: string | null;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  isDeleted: boolean;
  parentCommentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentFeedResponse {
  comments: CommentItem[];
  nextCursor?: string;
}

export interface CreateCommentPayload {
  content: string;
  mediaUrl?: string;
  parentCommentId?: string;
}

export interface ToggleCommentLikeResponse {
  isLiked: boolean;
  likeCount: number;
}

export const commentService = {
  getCommentsByPost: async (
    postId: string,
    cursor?: string,
    token?: string | null
  ): Promise<CommentFeedResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<CommentFeedResponse>(`/comments/posts/${postId}${query}`, { token });
  },

  getRepliesByComment: async (
    commentId: string,
    cursor?: string,
    token?: string | null
  ): Promise<CommentFeedResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<CommentFeedResponse>(`/comments/${commentId}/replies${query}`, { token });
  },

  createComment: async (
    postId: string,
    payload: CreateCommentPayload,
    token?: string | null
  ): Promise<CommentItem> => {
    return apiClient.post<CommentItem>(`/comments/posts/${postId}`, payload, { token });
  },

  updateComment: async (
    commentId: string,
    content: string,
    token?: string | null
  ): Promise<CommentItem> => {
    return apiClient.patch<CommentItem>(`/comments/${commentId}`, { content }, { token });
  },

  toggleLike: async (
    commentId: string,
    token?: string | null
  ): Promise<ToggleCommentLikeResponse> => {
    return apiClient.post<ToggleCommentLikeResponse>(`/comments/${commentId}/like`, {}, { token });
  },

  deleteComment: async (
    commentId: string,
    token?: string | null
  ): Promise<void> => {
    return apiClient.delete<void>(`/comments/${commentId}`, { token });
  },
};
