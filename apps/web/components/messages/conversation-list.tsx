'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  VolumeX,
  Volume2,
  Inbox,
  MoreVertical,
  Trash2,
  FolderInput,
} from 'lucide-react';
import { useMessageStore, FolderType } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/services/message-service';
import { toast } from 'sonner';

export function ConversationList() {
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    activeFolder,
    setActiveFolder,
    conversations,
    isLoadingConversations,
    fetchConversations,
    activeConversationId,
    setActiveConversationId,
    setCreateGroupOpen,
    deleteConversation,
    toggleMute,
    moveConversationToFolder,
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

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenuConvId]);

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuConvId(null);
    try {
      await deleteConversation(convId);
      toast.success('Conversation deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete conversation');
    }
  };

  const handleToggleMuteConv = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuConvId(null);
    try {
      await toggleMute(conv.id, !conv.isMuted);
      toast.success(conv.isMuted ? 'Conversation unmuted' : 'Conversation muted');
    } catch (err: any) {
      toast.error('Failed to update mute settings');
    }
  };

  const handleMoveFolderConv = async (conv: Conversation, targetFolder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuConvId(null);
    try {
      await moveConversationToFolder(conv.id, targetFolder);
      toast.success(`Moved to ${targetFolder}`);
    } catch (err: any) {
      toast.error('Failed to move conversation');
    }
  };

  const currentList = conversations[activeFolder] || [];

  const filteredConversations = currentList.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    if (conv.type === 'group') {
      return conv.title?.toLowerCase().includes(query);
    }

    const otherUser = conv.participants?.find((p) => String(p.user?.id) !== String(currentUser?.id))?.user;
    return (
      otherUser?.displayName?.toLowerCase().includes(query) ||
      otherUser?.username?.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getConversationDetails = (conv: Conversation) => {
    if (conv.type === 'group') {
      return {
        title: conv.title || 'Group Chat',
        avatar: conv.avatarUrl || null,
        subtitle: `${conv.members?.length || conv.participants?.length || 0} members`,
      };
    }

    const otherUser = conv.participants?.find(
      (p) => String(p.user?.id) !== String(currentUser?.id)
    )?.user;

    return {
      title: otherUser?.displayName || otherUser?.username || 'User',
      avatar: otherUser?.avatarUrl || null,
      subtitle: `@${otherUser?.username || 'user'}`,
    };
  };

  return (
    <div className="w-full md:w-80 flex flex-col h-[calc(100vh-100px)] bg-slate-900 border-r border-slate-800 flex-shrink-0 font-sans">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Messages</span>
          </h1>
          <Button
            size="sm"
            onClick={() => setCreateGroupOpen(true)}
            className="text-xs h-7 px-2.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            New Group
          </Button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 text-xs border border-slate-800 rounded-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-1 shrink-0 font-sans">
        {(['main', 'pending'] as FolderType[]).map((folder) => {
          const isActive = activeFolder === folder;
          const count = conversations[folder]?.reduce((acc, c) => acc + (c.unreadCount || 0), 0) || 0;
          const label = folder === 'main' ? 'Main' : 'Pending';

          return (
            <button
              key={folder}
              type="button"
              onClick={() => setActiveFolder(folder)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversation List Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/40">
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
                className={`group/conv relative p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-slate-800/40 ${
                  isSelected
                    ? 'bg-blue-500/10 border-l-2 border-blue-500'
                    : 'hover:bg-slate-800/30'
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
                    <div className="flex items-center gap-1 flex-shrink-0 relative">
                      <span className="text-[10px] text-slate-500">{timeStr}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuConvId(isMenuOpen ? null : conv.id);
                        }}
                        title="Conversation options"
                        className="p-0.5 text-slate-400 hover:text-slate-200 rounded-sm hover:bg-slate-800 opacity-0 group-hover/conv:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Action Menu */}
                      {isMenuOpen && (
                        <div className="absolute right-0 top-6 z-30 w-44 bg-slate-900 border border-slate-800 rounded-sm shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in duration-100 text-xs">
                          <button
                            type="button"
                            onClick={(e) => handleToggleMuteConv(conv, e)}
                            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 rounded-sm text-left"
                          >
                            {conv.isMuted ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                                <span>Unmute</span>
                              </>
                            ) : (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                                <span>Mute</span>
                              </>
                            )}
                          </button>

                          {activeFolder !== 'main' && (
                            <button
                              type="button"
                              onClick={(e) => handleMoveFolderConv(conv, 'main', e)}
                              className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 rounded-sm text-left transition-colors"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-blue-400" />
                              <span>Move to Main</span>
                            </button>
                          )}

                          {activeFolder !== 'pending' && (
                            <button
                              type="button"
                              onClick={(e) => handleMoveFolderConv(conv, 'pending', e)}
                              className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 rounded-sm text-left transition-colors"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                              <span>Move to Pending</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-950/50 text-rose-400 rounded-sm text-left font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Conversation</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <p
                      className={`truncate flex-1 ${
                        hasUnread ? 'font-semibold text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {conv.lastMessage ? (
                        <span>
                          {conv.lastMessage.sender?.id === currentUser?.id ? 'You: ' : ''}
                          {conv.lastMessage.content || 'Sent an attachment'}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">{subtitle}</span>
                      )}
                    </p>

                    {hasUnread && (
                      <span className="ml-2 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
