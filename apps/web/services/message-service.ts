import { apiClient } from '@/lib/api-client';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
  isOnline?: boolean;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user?: UserSummary;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: UserSummary;
  content?: string | null;
  mediaUrls?: string[];
  messageType: 'text' | 'media' | 'post_share' | 'system_event' | string;
  replyToId?: string | null;
  replyTo?: DirectMessage | null;
  reactions?: MessageReaction[];
  isUnsent?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  user: UserSummary;
  role: 'owner' | 'admin' | 'member' | 'monitor' | string;
  status: 'active' | 'pending_approval' | string;
  joinedAt: string;
  lastReadMessageId?: string | null;
}

export interface Participant {
  user: UserSummary;
  role?: string;
  status?: string;
  folder?: string;
  requestStatus?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title?: string | null;
  avatarUrl?: string | null;
  folder: 'primary' | 'general' | 'requests' | 'main' | 'pending' | string;
  requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected' | string;
  messageRequestStatus?: 'none' | 'pending' | 'accepted' | 'rejected' | string;
  isMuted?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByOther?: boolean;
  unreadCount?: number;
  lastMessage?: DirectMessage | null;
  members?: ConversationMember[];
  participants?: Participant[];
  otherUser?: UserSummary | null;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationFeedResponse {
  conversations: Conversation[];
  nextCursor?: string | null;
}

export interface MessageFeedResponse {
  messages: DirectMessage[];
  nextCursor?: string | null;
}

export interface CreateGroupPayload {
  title: string;
  memberUsernames: string[];
  avatarUrl?: string;
}

export interface SendMessagePayload {
  content?: string;
  mediaUrls?: string[];
  replyToId?: string;
}

export const messageService = {
  getUserConversations: async (
    folder?: string,
    cursor?: string,
    limit = 20,
    token?: string | null
  ): Promise<ConversationFeedResponse> => {
    const params = new URLSearchParams();
    if (folder) params.set('folder', folder);
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ConversationFeedResponse>(`/conversations${query}`, { token });
  },

  getConversationById: async (
    conversationId: string,
    token?: string | null
  ): Promise<Conversation> => {
    return apiClient.get<Conversation>(`/conversations/${conversationId}`, { token });
  },

  getOrCreateConversation: async (
    targetUsername: string,
    token?: string | null
  ): Promise<Conversation> => {
    return apiClient.post<Conversation>('/conversations', { targetUsername }, { token });
  },

  createGroupConversation: async (
    payload: CreateGroupPayload,
    token?: string | null
  ): Promise<Conversation> => {
    return apiClient.post<Conversation>('/conversations/group', payload, { token });
  },

  acceptMessageRequest: async (
    conversationId: string,
    token?: string | null
  ): Promise<Conversation> => {
    return apiClient.post<Conversation>(`/conversations/${conversationId}/accept-request`, {}, { token });
  },

  rejectMessageRequest: async (
    conversationId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/conversations/${conversationId}/reject-request`, {}, { token });
  },

  moveConversationFolder: async (
    conversationId: string,
    folder: 'primary' | 'general',
    token?: string | null
  ): Promise<{ success: boolean; folder: string }> => {
    return apiClient.post<{ success: boolean; folder: string }>(
      `/conversations/${conversationId}/move`,
      { folder },
      { token }
    );
  },

  getConversationMessages: async (
    conversationId: string,
    cursor?: string,
    limit = 30,
    token?: string | null
  ): Promise<MessageFeedResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<MessageFeedResponse>(`/conversations/${conversationId}/messages${query}`, { token });
  },

  sendMessage: async (
    conversationId: string,
    payload: SendMessagePayload,
    token?: string | null
  ): Promise<DirectMessage> => {
    return apiClient.post<DirectMessage>(`/conversations/${conversationId}/messages`, payload, { token });
  },

  deleteMessage: async (
    conversationId: string,
    messageId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(
      `/conversations/${conversationId}/messages/${messageId}`,
      { token }
    );
  },

  reactToMessage: async (
    conversationId: string,
    messageId: string,
    emoji: string,
    token?: string | null
  ): Promise<MessageReaction> => {
    return apiClient.post<MessageReaction>(
      `/conversations/${conversationId}/messages/${messageId}/react`,
      { emoji },
      { token }
    );
  },

  removeReaction: async (
    conversationId: string,
    messageId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(
      `/conversations/${conversationId}/messages/${messageId}/react`,
      { token }
    );
  },

  markConversationAsRead: async (
    conversationId: string,
    lastReadMessageId?: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(
      `/conversations/${conversationId}/read`,
      { lastReadMessageId },
      { token }
    );
  },

  updateGroupConversation: async (
    conversationId: string,
    payload: { title?: string; avatarUrl?: string },
    token?: string | null
  ): Promise<Conversation> => {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}/group`, payload, { token });
  },

  addMember: async (
    conversationId: string,
    memberId: string,
    token?: string | null
  ): Promise<ConversationMember> => {
    return apiClient.post<ConversationMember>(
      `/conversations/${conversationId}/members`,
      { memberId },
      { token }
    );
  },

  removeMember: async (
    conversationId: string,
    memberId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(
      `/conversations/${conversationId}/members/${memberId}`,
      { token }
    );
  },

  updateMemberRole: async (
    conversationId: string,
    memberId: string,
    role: 'owner' | 'admin' | 'member',
    token?: string | null
  ): Promise<ConversationMember> => {
    return apiClient.patch<ConversationMember>(
      `/conversations/${conversationId}/members/${memberId}/role`,
      { role },
      { token }
    );
  },

  toggleMemberMute: async (
    conversationId: string,
    memberId: string,
    isMuted: boolean,
    token?: string | null
  ): Promise<{ success: boolean; isMuted: boolean }> => {
    return apiClient.patch<{ success: boolean; isMuted: boolean }>(
      `/conversations/${conversationId}/members/${memberId}/mute`,
      { isMuted },
      { token }
    );
  },

  leaveGroup: async (
    conversationId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/conversations/${conversationId}/leave`, {}, { token });
  },

  toggleMute: async (
    conversationId: string,
    isMuted: boolean,
    token?: string | null
  ): Promise<{ success: boolean; isMuted: boolean }> => {
    return apiClient.post<{ success: boolean; isMuted: boolean }>(
      `/conversations/${conversationId}/mute`,
      { isMuted },
      { token }
    );
  },

  deleteConversation: async (
    conversationId: string,
    token?: string | null
  ): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/conversations/${conversationId}`, { token });
  },
};
