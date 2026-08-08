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
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
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

  removeFollower: async (username: string, token?: string | null): Promise<{ success: boolean; followersCount: number }> => {
    return apiClient.delete<{ success: boolean; followersCount: number }>(`/users/${username}/followers`, { token });
  },
};
