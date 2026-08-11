import { apiClient } from '@/lib/api-client';

export interface NotificationUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface NotificationItem {
  id: string;
  receiverId: string;
  actorId: string;
  actor: NotificationUser;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'follow_request' | 'dm_message' | string;
  entityId?: string | null;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface NotificationFeedResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  nextCursor?: string | null;
}

export const notificationService = {
  getNotifications: async (
    category = 'all',
    cursor?: string,
    token?: string | null
  ): Promise<NotificationFeedResponse> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (cursor) params.append('cursor', cursor);

    return apiClient.get<NotificationFeedResponse>(`/notifications?${params.toString()}`, { token });
  },

  markAsRead: async (
    notificationId: string,
    token?: string | null
  ): Promise<{ success: boolean; unreadCount: number }> => {
    return apiClient.patch<{ success: boolean; unreadCount: number }>(
      `/notifications/${notificationId}/read`,
      {},
      { token }
    );
  },

  markAllAsRead: async (
    token?: string | null
  ): Promise<{ success: boolean; unreadCount: number }> => {
    return apiClient.patch<{ success: boolean; unreadCount: number }>(
      '/notifications/read-all',
      {},
      { token }
    );
  },

  deleteNotification: async (
    notificationId: string,
    token?: string | null
  ): Promise<{ success: boolean; unreadCount: number }> => {
    return apiClient.delete<{ success: boolean; unreadCount: number }>(
      `/notifications/${notificationId}`,
      { token }
    );
  },

  clearAllNotifications: async (
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>('/notifications/clear-all', { token });
  },
};
