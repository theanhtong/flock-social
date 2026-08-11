import { apiClient } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  location?: string | null;
  links?: any;
  birthDate?: string | null;
  role: 'customer' | 'bot_system' | 'moderator' | 'admin';
  status: 'pending_verification' | 'active' | 'suspended' | 'banned';
  isVerified: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  isPrivateProfile?: boolean;
  whoCanMessageMe?: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  location?: string;
}

export interface FollowStatus {
  isFollowing: boolean;
  isPending: boolean;
  followsYou: boolean;
  hasRequestedToFollowYou?: boolean;
}

export interface ToggleFollowResponse {
  isFollowing: boolean;
  isPending: boolean;
  followersCount: number;
}

export const userService = {
  getMyProfile: async (token?: string | null): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/users/me', { token });
  },

  getProfileByUsername: async (username: string, token?: string | null): Promise<UserProfile> => {
    return apiClient.get<UserProfile>(`/users/${username}`, { token });
  },

  updateProfile: async (data: UpdateProfilePayload, token?: string | null): Promise<UserProfile> => {
    return apiClient.patch<UserProfile>('/users/me', data, { token });
  },

  searchUsers: async (query: string, token?: string | null): Promise<UserProfile[]> => {
    const res = await apiClient.get<any>(`/users/search/query?q=${encodeURIComponent(query)}`, { token });
    return Array.isArray(res) ? res : res?.data || [];
  },

  getFollowers: async (username: string, token?: string | null): Promise<UserProfile[]> => {
    const res = await apiClient.get<any>(`/users/${username}/followers`, { token });
    return Array.isArray(res) ? res : res?.data || [];
  },

  getFollowing: async (username: string, token?: string | null): Promise<UserProfile[]> => {
    const res = await apiClient.get<any>(`/users/${username}/following`, { token });
    return Array.isArray(res) ? res : res?.data || [];
  },

  getFollowStatus: async (username: string, token?: string | null): Promise<FollowStatus> => {
    return apiClient.get<FollowStatus>(`/users/${username}/follow-status`, { token });
  },

  toggleFollow: async (username: string, token?: string | null): Promise<ToggleFollowResponse> => {
    return apiClient.post<ToggleFollowResponse>(`/users/${username}/toggle-follow`, {}, { token });
  },

  respondFollowRequest: async (requesterId: string, action: 'accept' | 'reject', token?: string | null): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/users/follow-requests/${requesterId}/${action}`, {}, { token });
  },

  getPendingFollowRequests: async (token?: string | null): Promise<UserProfile[]> => {
    const res = await apiClient.get<any>('/users/me/follow-requests', { token });
    return Array.isArray(res) ? res : res?.data || [];
  },

  removeFollower: async (username: string, token?: string | null): Promise<{ success: boolean; followersCount: number }> => {
    return apiClient.delete<{ success: boolean; followersCount: number }>(`/users/${username}/followers`, { token });
  },

  getBlockStatus: async (username: string, token?: string | null): Promise<{ isBlocked: boolean; isBlockedBy: boolean }> => {
    return apiClient.get<{ isBlocked: boolean; isBlockedBy: boolean }>(`/users/${username}/block-status`, { token });
  },

  toggleBlock: async (username: string, token?: string | null): Promise<{ isBlocked: boolean }> => {
    return apiClient.post<{ isBlocked: boolean }>(`/users/${username}/toggle-block`, {}, { token });
  },

  getUserSettings: async (token?: string | null): Promise<UserSettings> => {
    return apiClient.get<UserSettings>('/users/me/settings', { token });
  },

  updateUserSettings: async (data: Partial<UserSettings>, token?: string | null): Promise<UserSettings> => {
    return apiClient.patch<UserSettings>('/users/me/settings', data, { token });
  },
};

export interface UserSettings {
  userId: string;
  isPrivateProfile: boolean;
  requireFollowApproval: boolean;
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  allowTagging: 'everyone' | 'followers' | 'noone' | string;
  whoCanReplyPosts: 'everyone' | 'followers' | 'noone' | string;
  whoCanMessageMe: 'everyone' | 'followers' | 'noone' | string;
  whoCanAddToGroup: 'everyone' | 'followers' | 'noone' | string;
  notifyOnLikes: boolean;
  notifyOnComments: boolean;
  notifyOnFollows: boolean;
  notifyOnTagging: boolean;
  notifyOnReposts: boolean;
  autoplayVideos: boolean;
  createdAt?: string;
  updatedAt?: string;
}
