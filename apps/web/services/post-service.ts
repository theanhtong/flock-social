import { apiClient } from '@/lib/api-client';

export interface PostUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PostMedia {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  media: PostMedia[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  bookmarkCount: number;
  viewsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isEdited: boolean;
  status: string;
  audience: string;
  postType: string;
  repostOf?: Post;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor?: string;
}

export const postService = {
  getPosts: async (
    cursor?: string,
    token?: string | null
  ): Promise<FeedResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<FeedResponse>(`/posts${queryStr}`, { token });
  },

  createPost: async (
    content: string,
    mediaUrls?: string[],
    repostOfId?: string,
    token?: string | null
  ): Promise<Post> => {
    return apiClient.post<Post>('/posts', { content, mediaUrls, repostOfId }, { token });
  },

  toggleLike: async (postId: string, token?: string | null): Promise<{ liked: boolean; likeCount: number }> => {
    return apiClient.post<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`, {}, { token });
  },

  toggleBookmark: async (postId: string, token?: string | null): Promise<{ bookmarked: boolean }> => {
    return apiClient.post<{ bookmarked: boolean }>(`/posts/${postId}/bookmark`, {}, { token });
  },

  deletePost: async (postId: string, token?: string | null): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/posts/${postId}`, { token });
  },

  getPostById: async (postId: string, token?: string | null): Promise<Post> => {
    return apiClient.get<Post>(`/posts/${postId}`, { token });
  },
};
