'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  Repeat,
  CheckCheck,
  Trash2,
  Check,
  X,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import {
  useNotificationStore,
  NotificationCategory,
} from '@/store/notification-store';
import { userService } from '@/services/user-service';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotificationItemSkeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const token = useAuthStore((s) => s.token);
  const {
    notifications,
    unreadCount,
    activeCategory,
    isLoading,
    cursor,
    setActiveCategory,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    initSocketListeners,
    cleanSocketListeners,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
    initSocketListeners();

    return () => {
      cleanSocketListeners();
    };
  }, [fetchNotifications, initSocketListeners, cleanSocketListeners]);

  const handleRespondFollowRequest = async (
    requesterId: string,
    action: 'accept' | 'reject',
    notificationId: string
  ) => {
    if (!token) return;
    try {
      await userService.respondFollowRequest(requesterId, action, token);
      toast.success(action === 'accept' ? 'Follow request accepted' : 'Follow request declined');
      await deleteNotification(notificationId);
    } catch (err: any) {
      console.error('Failed to respond to follow request:', err);
      toast.error(err?.message || 'Failed to respond');
    }
  };

  const getNotificationDetails = (item: any) => {
    const actorName = item.actor?.displayName || item.actor?.username || 'Someone';

    switch (item.type) {
      case 'like':
        return {
          icon: <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />,
          text: `${actorName} liked your post`,
          link: item.entityId ? `/post/${item.entityId}` : '#',
        };
      case 'comment':
        return {
          icon: <MessageSquare className="w-4 h-4 text-blue-400 fill-blue-400/20" />,
          text: `${actorName} commented on your post`,
          link: item.entityId ? `/post/${item.entityId}` : '#',
        };
      case 'follow':
        return {
          icon: <UserPlus className="w-4 h-4 text-emerald-400" />,
          text: `${actorName} started following you`,
          link: item.actor?.username ? `/profile/${item.actor.username}` : '#',
        };
      case 'follow_request':
        return {
          icon: <UserPlus className="w-4 h-4 text-amber-400" />,
          text: `${actorName} requested to follow you`,
          link: item.actor?.username ? `/profile/${item.actor.username}` : '#',
          isFollowRequest: true,
        };
      case 'repost':
        return {
          icon: <Repeat className="w-4 h-4 text-emerald-400" />,
          text: `${actorName} reposted your post`,
          link: item.entityId ? `/post/${item.entityId}` : '#',
        };
      case 'system_warning':
        return {
          icon: <Megaphone className="w-4 h-4 text-blue-400" />,
          text: item.message || 'System Notice: Account warning or report notification received.',
          link: '#',
          isSystem: true,
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-blue-400" />,
          text: `${actorName} interacted with you`,
          link: '#',
        };
    }
  };

  const tabs: { id: NotificationCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'likes', label: 'Likes' },
    { id: 'comments', label: 'Comments' },
    { id: 'follows', label: 'Follows' },
    { id: 'reposts', label: 'Reposts' },
    { id: 'system', label: 'System' },
  ];

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans min-h-[80vh] flex flex-col">
        {/* Top Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <h1 className="text-base font-bold text-slate-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-blue-600 text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 h-8"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-slate-800 h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {isLoading && notifications.length === 0 ? (
            <div className="divide-y divide-slate-800/60">
              <NotificationItemSkeleton />
              <NotificationItemSkeleton />
              <NotificationItemSkeleton />
              <NotificationItemSkeleton />
              <NotificationItemSkeleton />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">No notifications in this category</p>
            </div>
          ) : (
            notifications.map((item) => {
              const details = getNotificationDetails(item);

              return (
                <div
                  key={item.id}
                  className={`group relative p-4 flex items-start gap-3.5 transition-colors hover:bg-slate-850/60 ${
                    !item.isRead ? 'bg-blue-950/20' : 'bg-slate-900/40'
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}

                  {/* Notification Icon Badge */}
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar
                      src={item.actor?.avatarUrl}
                      name={item.actor?.displayName || item.actor?.username || 'User'}
                      size="sm"
                    />
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-800">
                      {details.icon}
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <Link
                        href={item.actor?.username ? `/profile/${item.actor.username}` : '#'}
                        className="text-xs font-bold text-slate-100 hover:text-blue-400 transition-colors"
                      >
                        {item.actor?.displayName || item.actor?.username}
                      </Link>
                      <span className="text-xs text-slate-300">{details.text.replace(item.actor?.displayName || item.actor?.username || 'Someone', '')}</span>
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Follow Request Actions */}
                    {details.isFollowRequest && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespondFollowRequest(item.actorId, 'accept', item.id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] h-7 px-3 rounded-md"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondFollowRequest(item.actorId, 'reject', item.id)}
                          className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] h-7 px-3 rounded-md"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!item.isRead && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-md hover:bg-slate-800 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(item.id)}
                      title="Delete notification"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Load More Button */}
          {cursor && (
            <div className="p-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={() => fetchNotifications(false)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : 'Load older notifications'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
