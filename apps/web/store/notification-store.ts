import { create } from 'zustand';
import { useAuthStore } from './auth-store';
import { socketService } from '@/services/socket-service';
import {
  notificationService,
  NotificationItem,
} from '@/services/notification-service';

export type NotificationCategory = 'all' | 'likes' | 'comments' | 'follows' | 'system';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  pendingReportsCount: number;
  activeCategory: NotificationCategory;
  cursor: string | null;
  isLoading: boolean;

  setActiveCategory: (category: NotificationCategory) => void;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchPendingReportsCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  initSocketListeners: () => void;
  cleanSocketListeners: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  pendingReportsCount: 0,
  activeCategory: 'all',
  cursor: null,
  isLoading: false,

  setActiveCategory: (category: NotificationCategory) => {
    set({ activeCategory: category, cursor: null });
    get().fetchNotifications(true);
  },

  fetchPendingReportsCount: async () => {
    const { token, user } = useAuthStore.getState();
    if (!token || (user?.role !== 'admin' && user?.role !== 'moderator')) return;
    try {
      const { reportService } = await import('@/services/report-service');
      const res = await reportService.getPendingReportsCount(token);
      set({ pendingReportsCount: res.pendingCount });
    } catch (err) {}
  },

  fetchNotifications: async (reset = false) => {
    const { token } = useAuthStore.getState();
    const { activeCategory, cursor, notifications, isLoading } = get();

    if (isLoading) return;
    set({ isLoading: true, notifications: reset ? [] : notifications });

    try {
      const currentCursor = reset ? undefined : cursor || undefined;
      const minDelay = reset ? new Promise((resolve) => setTimeout(resolve, 180)) : Promise.resolve();
      
      const [res] = await Promise.all([
        notificationService.getNotifications(activeCategory, currentCursor, token),
        minDelay,
      ]);

      set({
        notifications: reset ? res.notifications : [...notifications, ...res.notifications],
        unreadCount: res.unreadCount,
        cursor: res.nextCursor || null,
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    const { token } = useAuthStore.getState();
    try {
      const res = await notificationService.markAsRead(id, token);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: res.unreadCount,
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    const { token } = useAuthStore.getState();
    try {
      await notificationService.markAllAsRead(token);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  deleteNotification: async (id: string) => {
    const { token } = useAuthStore.getState();
    try {
      const res = await notificationService.deleteNotification(id, token);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: res.unreadCount,
      }));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  clearAll: async () => {
    const { token } = useAuthStore.getState();
    try {
      await notificationService.clearAllNotifications(token);
      set({ notifications: [], unreadCount: 0 });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  },

  initSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.off('notification_received');
    socket.off('notification_read');
    socket.off('notification_read_all');
    socket.off('notification_deleted');
    socket.off('pending_reports_count');

    get().fetchPendingReportsCount();

    socket.on('notification_received', (data: { notification: NotificationItem; unreadCount: number }) => {
      set((state) => ({
        notifications: [data.notification, ...state.notifications],
        unreadCount: data.unreadCount,
      }));
    });

    socket.on('notification_read', (data: { id: string; unreadCount: number }) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === data.id ? { ...n, isRead: true } : n
        ),
        unreadCount: data.unreadCount,
      }));
    });

    socket.on('notification_read_all', () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    });

    socket.on('notification_deleted', (data: { id: string; unreadCount: number }) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== data.id),
        unreadCount: data.unreadCount,
      }));
    });

    socket.on('pending_reports_count', (data: { pendingCount: number }) => {
      set({ pendingReportsCount: data.pendingCount });
    });
  },

  cleanSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.off('notification_received');
    socket.off('notification_read');
    socket.off('notification_read_all');
    socket.off('notification_deleted');
    socket.off('pending_reports_count');
  },
}));
