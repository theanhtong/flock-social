import { create } from 'zustand';
import {
  messageService,
  Conversation,
  ConversationMember,
  DirectMessage,
  MessageReaction,
  SendMessagePayload,
} from '@/services/message-service';
import { socketService } from '@/services/socket-service';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export type FolderType = 'main' | 'pending';

const computeTotalUnread = (conversations: Record<FolderType, Conversation[]>): number => {
  const mainCount = (conversations.main || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const pendingCount = (conversations.pending || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  return mainCount + pendingCount;
};

interface MessageState {
  activeFolder: FolderType;
  conversations: Record<FolderType, Conversation[]>;
  conversationsCursor: Record<FolderType, string | null>;
  isLoadingConversations: boolean;
  unreadMessageCount: number;

  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isLoadingActiveConversation: boolean;

  messages: Record<string, DirectMessage[]>;
  messagesCursor: Record<string, string | null>;
  isLoadingMessages: boolean;

  typingUsers: Record<string, Record<string, boolean>>; // conversationId -> { userId: boolean }
  replyingToMessage: DirectMessage | null;

  isNewDirectOpen: boolean;
  isCreateGroupOpen: boolean;
  isGroupDetailsOpen: boolean;

  // Actions
  setActiveFolder: (folder: FolderType) => void;
  fetchConversations: (folder?: FolderType, reset?: boolean) => Promise<void>;
  setActiveConversationId: (id: string | null) => Promise<void>;
  fetchMessages: (conversationId?: string, reset?: boolean) => Promise<void>;
  sendDirectMessage: (payload: SendMessagePayload) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearHistory: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string, isMuted: boolean) => Promise<void>;
  moveConversationToFolder: (conversationId: string, targetFolder: FolderType) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  markConversationAsRead: (conversationId?: string) => Promise<void>;

  setReplyingToMessage: (msg: DirectMessage | null) => void;
  setNewDirectOpen: (open: boolean) => void;
  setCreateGroupOpen: (open: boolean) => void;
  setGroupDetailsOpen: (open: boolean) => void;

  updateConversationInList: (updatedConv: Partial<Conversation> & { id: string }) => void;
  removeConversationFromList: (conversationId: string) => void;

  // Real-time Event Handlers
  initSocketListeners: () => void;
  cleanSocketListeners: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  activeFolder: 'main',
  conversations: {
    main: [],
    pending: [],
  },
  conversationsCursor: {
    main: null,
    pending: null,
  },
  isLoadingConversations: false,
  unreadMessageCount: 0,

  activeConversationId: null,
  activeConversation: null,
  isLoadingActiveConversation: false,

  messages: {},
  messagesCursor: {},
  isLoadingMessages: false,

  typingUsers: {},
  replyingToMessage: null,

  isNewDirectOpen: false,
  isCreateGroupOpen: false,
  isGroupDetailsOpen: false,

  setActiveFolder: (folder: FolderType) => {
    set({ activeFolder: folder });
    get().fetchConversations(folder, true);
  },

  fetchConversations: async (folderParam?: FolderType, reset = false) => {
    const folder = folderParam || get().activeFolder;
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoadingConversations: true });
    try {
      const cursor = reset ? undefined : (get().conversationsCursor[folder] || undefined);
      const res = await messageService.getUserConversations(folder, cursor, 20, token);

      set((state) => {
        const existing = reset ? [] : state.conversations[folder];
        const newConvs = res.conversations || [];

        const map = new Map<string, Conversation>();
        existing.forEach((c: Conversation) => map.set(c.id, c));
        newConvs.forEach((c: Conversation) => map.set(c.id, c));

        const nextConvs = {
          ...state.conversations,
          [folder]: Array.from(map.values()),
        };

        return {
          conversations: nextConvs,
          unreadMessageCount: computeTotalUnread(nextConvs),
          conversationsCursor: {
            ...state.conversationsCursor,
            [folder]: res.nextCursor || null,
          },
        };
      });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversationId: async (id: string | null) => {
    const prevId = get().activeConversationId;
    if (id && prevId === id && get().activeConversation) {
      return;
    }

    if (prevId && prevId !== id) {
      socketService.leaveConversation(prevId);
    }

    set({
      activeConversationId: id,
      activeConversation: null,
      replyingToMessage: null,
    });

    if (!id) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    socketService.joinConversation(id);

    set({ isLoadingActiveConversation: true });
    try {
      const conv = await messageService.getConversationById(id, token);

      const convFolder: FolderType =
        conv.folder === 'pending' || conv.folder === 'requests' ? 'pending' : 'main';

      if (get().activeFolder !== convFolder) {
        set({ activeFolder: convFolder });
        await get().fetchConversations(convFolder, true);
      }

      set({ activeConversation: conv });
      get().updateConversationInList(conv);

      await get().fetchMessages(id, true);

      get().markConversationAsRead(id);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      set({ isLoadingActiveConversation: false });
    }
  },

  fetchMessages: async (conversationIdParam?: string, reset = false) => {
    const convId = conversationIdParam || get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    if (reset) {
      set((state) => ({
        isLoadingMessages: true,
        messages: {
          ...state.messages,
          [convId]: [],
        },
        messagesCursor: {
          ...state.messagesCursor,
          [convId]: null,
        },
      }));
    } else {
      set({ isLoadingMessages: true });
    }

    try {
      const currentCursor = reset ? undefined : (get().messagesCursor[convId] || undefined);
      const res = await messageService.getConversationMessages(convId, currentCursor, 30, token);

      set((state) => {
        const existingMessages = reset ? [] : (state.messages[convId] || []);
        const fetchedMessages = res.messages || [];

        const map = new Map<string, DirectMessage>();
        fetchedMessages.forEach((m: DirectMessage) => map.set(m.id, m));
        existingMessages.forEach((m: DirectMessage) => map.set(m.id, m));

        const sorted = Array.from(map.values()).sort(
          (a: DirectMessage, b: DirectMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        return {
          messages: {
            ...state.messages,
            [convId]: sorted,
          },
          messagesCursor: {
            ...state.messagesCursor,
            [convId]: res.nextCursor || null,
          },
        };
      });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendDirectMessage: async (payload: SendMessagePayload) => {
    const convId = get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const newMsg = await messageService.sendMessage(convId, payload, token);

      set({ replyingToMessage: null });

      set((state) => {
        const currentMsgs = state.messages[convId] || [];
        if (currentMsgs.some((m: DirectMessage) => m.id === newMsg.id)) return state;

        return {
          messages: {
            ...state.messages,
            [convId]: [...currentMsgs, newMsg],
          },
        };
      });

      get().updateConversationInList({
        id: convId,
        lastMessage: newMsg,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  },

  deleteMessage: async (messageId: string) => {
    const convId = get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await messageService.deleteMessage(convId, messageId, token);
      set((state) => {
        const list = state.messages[convId] || [];
        return {
          messages: {
            ...state.messages,
            [convId]: list.map((m: DirectMessage) =>
              m.id === messageId ? { ...m, isUnsent: true, content: null, mediaUrls: [] } : m
            ),
          },
        };
      });
    } catch (err) {
      console.error('Failed to unsend message:', err);
    }
  },

  clearHistory: async (conversationId: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await messageService.deleteConversation(conversationId, token);

      set((state) => {
        const activeFolder = state.activeFolder;
        const currentFolderList = state.conversations[activeFolder] || [];
        const updatedFolderList = currentFolderList.filter((c) => c.id !== conversationId);

        const isCurrentActive = state.activeConversationId === conversationId;

        return {
          messages: {
            ...state.messages,
            [conversationId]: [],
          },
          conversations: {
            ...state.conversations,
            [activeFolder]: updatedFolderList,
          },
          ...(isCurrentActive
            ? { activeConversationId: null, activeConversation: null }
            : {}),
        };
      });

      toast.success('Chat history cleared');
      get().fetchConversations(get().activeFolder, true);
    } catch (err) {
      console.error('Failed to clear conversation history:', err);
      toast.error('Failed to clear chat history');
    }
  },

  deleteConversation: async (conversationId: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      await messageService.deleteConversation(conversationId, token);
      get().removeConversationFromList(conversationId);
      if (get().activeConversationId === conversationId) {
        set({ activeConversationId: null, activeConversation: null });
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  },

  toggleMute: async (conversationId: string, isMuted: boolean) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      await messageService.toggleMute(conversationId, isMuted, token);
      get().updateConversationInList({ id: conversationId, isMuted });
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      throw err;
    }
  },

  moveConversationToFolder: async (conversationId: string, targetFolder: FolderType) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const apiFolder = targetFolder === 'main' ? 'primary' : 'general';
      await messageService.moveConversationFolder(conversationId, apiFolder, token);
      get().removeConversationFromList(conversationId);
    } catch (err) {
      console.error('Failed to move conversation:', err);
      throw err;
    }
  },

  reactToMessage: async (messageId: string, emoji: string) => {
    const convId = get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) return;

    try {
      const newReaction = await messageService.reactToMessage(convId, messageId, emoji, token);

      set((state) => {
        const list = state.messages[convId] || [];
        return {
          messages: {
            ...state.messages,
            [convId]: list.map((m: DirectMessage) => {
              if (m.id !== messageId) return m;
              const existing = m.reactions || [];
              const filtered = existing.filter((r: MessageReaction) => r.userId !== currentUser.id);
              return {
                ...m,
                reactions: [...filtered, { ...newReaction, user: currentUser }],
              };
            }),
          },
        };
      });
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  },

  removeReaction: async (messageId: string) => {
    const convId = get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) return;

    try {
      await messageService.removeReaction(convId, messageId, token);

      set((state) => {
        const list = state.messages[convId] || [];
        return {
          messages: {
            ...state.messages,
            [convId]: list.map((m: DirectMessage) => {
              if (m.id !== messageId) return m;
              return {
                ...m,
                reactions: (m.reactions || []).filter((r: MessageReaction) => r.userId !== currentUser.id),
              };
            }),
          },
        };
      });
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  },

  markConversationAsRead: async (conversationIdParam?: string) => {
    const convId = conversationIdParam || get().activeConversationId;
    if (!convId) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    const msgs = get().messages[convId] || [];
    const lastMsg = msgs[msgs.length - 1];

    try {
      await messageService.markConversationAsRead(convId, lastMsg?.id, token);
      get().updateConversationInList({ id: convId, unreadCount: 0 });
    } catch (err) {
      console.error('Failed to mark conversation read:', err);
    }
  },

  setReplyingToMessage: (msg: DirectMessage | null) => set({ replyingToMessage: msg }),
  setNewDirectOpen: (open: boolean) => set({ isNewDirectOpen: open }),
  setCreateGroupOpen: (open: boolean) => set({ isCreateGroupOpen: open }),
  setGroupDetailsOpen: (open: boolean) => set({ isGroupDetailsOpen: open }),

  updateConversationInList: (updated: Partial<Conversation> & { id: string }) => {
    set((state) => {
      const activeFolder = state.activeFolder;
      const targetFolder: FolderType =
        updated.folder === 'pending' || updated.folder === 'requests'
          ? 'pending'
          : updated.folder === 'main'
          ? 'main'
          : activeFolder;

      const otherFolder: FolderType = targetFolder === 'main' ? 'pending' : 'main';

      const targetList = state.conversations[targetFolder] || [];
      const otherList = state.conversations[otherFolder] || [];

      const existsInTarget = targetList.some((c) => c.id === updated.id);
      let newTargetList: Conversation[];

      if (existsInTarget) {
        newTargetList = targetList.map((c: Conversation) =>
          c.id === updated.id ? { ...c, ...updated } : c
        );
      } else {
        const existingConv = otherList.find((c) => c.id === updated.id) || state.activeConversation;
        const fullConv = ({ ...existingConv, ...updated }) as Conversation;
        newTargetList = [fullConv, ...targetList];
      }

      const newOtherList = otherList.filter((c: Conversation) => c.id !== updated.id);

      const nextConvs = {
        ...state.conversations,
        [targetFolder]: newTargetList,
        [otherFolder]: newOtherList,
      };

      return {
        conversations: nextConvs,
        unreadMessageCount: computeTotalUnread(nextConvs),
        activeConversation:
          state.activeConversation?.id === updated.id
            ? { ...state.activeConversation, ...updated }
            : state.activeConversation,
      };
    });
  },

  removeConversationFromList: (conversationId: string) => {
    set((state) => {
      const folderKey = state.activeFolder;
      const list = state.conversations[folderKey] || [];
      const nextConvs = {
        ...state.conversations,
        [folderKey]: list.filter((c: Conversation) => c.id !== conversationId),
      };
      return {
        conversations: nextConvs,
        unreadMessageCount: computeTotalUnread(nextConvs),
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        activeConversation: state.activeConversation?.id === conversationId ? null : state.activeConversation,
      };
    });
  },

  initSocketListeners: () => {
    const s = socketService.getSocket();
    if (!s) return;

    s.off('message_received');
    s.off('message_unsent');
    s.off('message_reacted');
    s.off('message_read');
    s.off('user_typing');
    s.off('group_updated');
    s.off('member_joined');
    s.off('member_removed');

    s.on('message_received', (msg: DirectMessage) => {
      const convId = msg.conversationId;
      set((state) => {
        const currentMsgs = state.messages[convId] || [];
        if (currentMsgs.some((m: DirectMessage) => m.id === msg.id)) return state;

        return {
          messages: {
            ...state.messages,
            [convId]: [...currentMsgs, msg],
          },
        };
      });

      const isActive = get().activeConversationId === convId;
      const conv = get().conversations[get().activeFolder]?.find((c: Conversation) => c.id === convId);

      get().updateConversationInList({
        id: convId,
        lastMessage: msg,
        unreadCount: isActive ? 0 : (conv?.unreadCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    });

    s.on('message_unsent', (data: { conversationId: string; messageId: string }) => {
      set((state) => {
        const list = state.messages[data.conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [data.conversationId]: list.map((m: DirectMessage) =>
              m.id === data.messageId ? { ...m, isUnsent: true, content: null, mediaUrls: [] } : m
            ),
          },
        };
      });
    });

    s.on('message_reacted', (data: { conversationId: string; messageId: string; reaction: MessageReaction; action: 'add' | 'remove' }) => {
      set((state) => {
        const list = state.messages[data.conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [data.conversationId]: list.map((m: DirectMessage) => {
              if (m.id !== data.messageId) return m;
              const existing = m.reactions || [];
              if (data.action === 'add') {
                const filtered = existing.filter((r: MessageReaction) => r.userId !== data.reaction.userId);
                return { ...m, reactions: [...filtered, data.reaction] };
              } else {
                return { ...m, reactions: existing.filter((r: MessageReaction) => r.userId !== data.reaction.userId) };
              }
            }),
          },
        };
      });
    });

    s.on('user_typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      set((state) => {
        const current = state.typingUsers[data.conversationId] || {};
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.conversationId]: {
              ...current,
              [data.userId]: data.isTyping,
            },
          },
        };
      });
    });

    s.on('group_updated', (data: { conversationId: string; title?: string; avatarUrl?: string }) => {
      get().updateConversationInList({
        id: data.conversationId,
        title: data.title,
        avatarUrl: data.avatarUrl,
      });
    });

    s.on('member_joined', (data: { conversationId: string; member: ConversationMember }) => {
      if (get().activeConversationId === data.conversationId) {
        get().setActiveConversationId(data.conversationId);
      }
    });

    s.on('member_removed', (data: { conversationId: string; memberId: string }) => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && data.memberId === currentUser.id) {
        get().removeConversationFromList(data.conversationId);
      } else if (get().activeConversationId === data.conversationId) {
        get().setActiveConversationId(data.conversationId);
      }
    });
  },

  cleanSocketListeners: () => {
    const s = socketService.getSocket();
    if (!s) return;
    s.off('message_received');
    s.off('message_unsent');
    s.off('message_reacted');
    s.off('message_read');
    s.off('user_typing');
    s.off('group_updated');
    s.off('member_joined');
    s.off('member_removed');
  },
}));
