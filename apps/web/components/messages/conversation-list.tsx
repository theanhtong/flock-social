'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  VolumeX,
  Inbox,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useMessageStore, FolderType } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/services/message-service';

export function ConversationList() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    activeFolder,
    setActiveFolder,
    conversations,
    isLoadingConversations,
    fetchConversations,
    activeConversationId,
    setActiveConversationId,
    setCreateGroupOpen,
    clearHistory,
  } = useMessageStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations(activeFolder, true);
  }, [activeFolder, fetchConversations]);

  useEffect(() => {
    if (!activeMenuConvId) return;

    const handleClickOutside = () => {
      setActiveMenuConvId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenuConvId]);

  const currentList = conversations[activeFolder] || [];

  const getOtherUser = (conv: Conversation) => {
    if (conv.otherUser) return conv.otherUser;
    const participant = conv.participants?.find((p) => p.user?.id !== currentUser?.id);
    if (participant?.user) return participant.user;
    const member = conv.members?.find((m) => m.userId !== currentUser?.id);
    return member?.user;
  };

  const filteredConversations = currentList.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (conv.type === 'group') {
      return conv.title?.toLowerCase().includes(q);
    }

    const otherUser = getOtherUser(conv);
    return (
      otherUser?.displayName?.toLowerCase().includes(q) ||
      otherUser?.username?.toLowerCase().includes(q)
    );
  });

  const getConversationDetails = (conv: Conversation) => {
    if (conv.type === 'group') {
      return {
        title: conv.title || 'Group Chat',
        avatar: conv.avatarUrl,
        subtitle: `${conv.participants?.length || conv.members?.length || 0} members`,
      };
    }

    const otherUser = getOtherUser(conv);
    return {
      title: otherUser?.displayName || otherUser?.username || 'Direct Message',
      avatar: otherUser?.avatarUrl,
      subtitle: `@${otherUser?.username || 'user'}`,
    };
  };

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 w-full flex-shrink-0 select-none min-h-0 overflow-hidden font-sans">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Messages</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateGroupOpen(true)}
              title="Create Group Chat"
              className="text-xs px-2.5 h-8 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Group
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Folder Tabs */}
        <div className="flex items-center p-1 bg-slate-950 rounded-sm border border-slate-800 gap-1 text-xs">
          {(['main', 'pending'] as FolderType[]).map((folder) => {
            const isActive = activeFolder === folder;
            const count = conversations[folder]?.reduce((acc, c) => acc + (c.unreadCount || 0), 0) || 0;
            const label = folder === 'main' ? 'Main' : 'Pending';

            return (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`flex-1 py-1 px-2 rounded-sm font-medium text-center transition-all capitalize flex items-center justify-center gap-1.5 cursor-pointer ${isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation List Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-850/50">
        {isLoadingConversations && currentList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No conversations found</p>
            <p className="text-[11px] text-slate-500">
              {searchQuery ? 'Try another search query' : 'Start a new conversation above'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const { title, avatar, subtitle } = getConversationDetails(conv);
            const isSelected = activeConversationId === conv.id;
            const hasUnread = (conv.unreadCount || 0) > 0;
            const timeStr = formatTimestamp(conv.lastMessage?.createdAt || conv.updatedAt);
            const isMenuOpen = activeMenuConvId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  if (activeConversationId !== conv.id) {
                    setActiveConversationId(conv.id);
                  }
                }}
                className={`group/conv relative p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-slate-800/60 ${isSelected ? 'bg-blue-950/40 border-l-4 border-blue-500 pl-2' : ''
                  }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar src={avatar} name={title} size="md" />
                  {conv.type === 'group' && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300">
                      <Users className="w-2.5 h-2.5 text-blue-400" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                      <span className="truncate">{title}</span>
                      {conv.isMuted && <VolumeX className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] text-slate-500">{timeStr}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuConvId(isMenuOpen ? null : conv.id);
                        }}
                        title="Conversation actions"
                        className="p-0.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 opacity-0 group-hover/conv:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <p
                      className={`truncate flex-1 ${hasUnread ? 'font-semibold text-slate-100' : 'text-slate-400'
                        }`}
                    >
                      {conv.lastMessage?.isUnsent
                        ? 'Message unsent'
                        : conv.lastMessage?.content || conv.lastMessage?.mediaUrls?.length
                          ? conv.lastMessage.content || 'Media attachment'
                          : subtitle}
                    </p>

                    {hasUnread && (
                      <span className="ml-2 w-4 h-4 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-10 w-44 bg-slate-900 border border-slate-800 rounded-sm shadow-xl z-30 p-1 font-sans"
                  >
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setActiveMenuConvId(null);
                        await clearHistory(conv.id);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-sm transition-colors text-left font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
