'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  VolumeX,
  Volume2,
  Info,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Ban,
  Trash2,
} from 'lucide-react';
import { useMessageStore } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { messageService } from '@/services/message-service';
import { userService } from '@/services/user-service';
import { MessageItem } from './message-item';
import { MessageComposer } from './message-composer';
import { GroupDetailsOverlay } from './group-details-overlay';
import { toast } from 'sonner';

export function ChatWindow() {
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    activeFolder,
    fetchConversations,
    activeConversationId,
    activeConversation,
    isLoadingActiveConversation,
    messages,
    isLoadingMessages,
    messagesCursor,
    fetchMessages,
    setActiveConversationId,
    isGroupDetailsOpen,
    setGroupDetailsOpen,
    typingUsers,
    updateConversationInList,
    removeConversationFromList,
    deleteConversation,
  } = useMessageStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const activeTyping = activeConversationId ? typingUsers[activeConversationId] || {} : {};

  const typingUserIds = Object.keys(activeTyping).filter(
    (uid) => activeTyping[uid] && uid !== currentUser?.id
  );

  // Auto-scroll to bottom on initial load or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, activeConversationId]);

  const handleLoadOlderMessages = async () => {
    if (!activeConversationId || isLoadingMessages) return;
    const container = feedContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    await fetchMessages(activeConversationId, false);

    if (container) {
      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - oldScrollHeight;
      }, 50);
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-blue-400">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-200 mb-1">Your Messages</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Select an existing conversation from the left sidebar or start a new direct message or group chat.
        </p>
      </div>
    );
  }

  if (isLoadingActiveConversation && !activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-xs text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-400" />
        Loading conversation details...
      </div>
    );
  }

  if (isGroupDetailsOpen) {
    return <GroupDetailsOverlay />;
  }

  const isGroup = activeConversation?.type === 'group';
  const curUserIdStr = currentUser?.id ? String(currentUser.id) : '';
  const otherUser =
    (activeConversation?.otherUser && String(activeConversation.otherUser.id) !== curUserIdStr)
      ? activeConversation.otherUser
      : activeConversation?.participants?.find((p) => String(p.user?.id) !== curUserIdStr)?.user ||
      activeConversation?.members?.find((m) => String(m.userId) !== curUserIdStr)?.user;

  const title = isGroup
    ? activeConversation?.title || 'Group Chat'
    : otherUser?.displayName || otherUser?.username || 'Direct Message';
  const avatar = isGroup ? activeConversation?.avatarUrl : otherUser?.avatarUrl;
  const isMuted = activeConversation?.isMuted;
  const myMember = activeConversation?.participants?.find((p) => p.user?.id === currentUser?.id);
  const isRequest =
    activeConversation?.folder === 'pending' ||
    activeConversation?.folder === 'requests' ||
    activeConversation?.requestStatus === 'pending' ||
    activeConversation?.messageRequestStatus === 'pending' ||
    myMember?.requestStatus === 'pending' ||
    myMember?.folder === 'pending';

  const handleToggleMute = async () => {
    if (!token || !activeConversation) return;
    try {
      const newMuteState = !isMuted;
      await messageService.toggleMute(activeConversation.id, newMuteState, token);
      updateConversationInList({ id: activeConversation.id, isMuted: newMuteState });
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const handleAcceptRequest = async () => {
    if (!token || !activeConversation) return;
    try {
      await messageService.acceptMessageRequest(activeConversation.id, token);
      updateConversationInList({
        id: activeConversation.id,
        folder: 'main',
        requestStatus: 'accepted',
        messageRequestStatus: 'accepted',
      });
      useMessageStore.setState((s) => ({
        activeConversation: s.activeConversation
          ? {
            ...s.activeConversation,
            folder: 'main',
            requestStatus: 'accepted',
            messageRequestStatus: 'accepted',
            participants: s.activeConversation.participants?.map((p) =>
              String(p.user?.id) === String(currentUser?.id)
                ? { ...p, requestStatus: 'accepted', folder: 'main' }
                : p
            ),
          }
          : null,
      }));
      toast.success('Message request accepted');
      fetchConversations(activeFolder, true);
    } catch (err) {
      console.error('Failed to accept message request:', err);
      toast.error('Failed to accept message request');
    }
  };

  const handleRejectRequest = async () => {
    if (!token || !activeConversation) return;
    try {
      await messageService.rejectMessageRequest(activeConversation.id, token);
      setActiveConversationId(null);
      removeConversationFromList(activeConversation.id);
      toast.info('Message request declined');
      fetchConversations(activeFolder, true);
    } catch (err) {
      console.error('Failed to reject message request:', err);
      toast.error('Failed to decline message request');
    }
  };

  const handleBlockUser = async () => {
    if (!token || !activeConversation || !otherUser?.username) return;
    try {
      await userService.toggleBlock(otherUser.username, token);
      updateConversationInList({
        id: activeConversation.id,
        isBlockedByMe: true,
      });
      useMessageStore.setState((s) => ({
        activeConversation: s.activeConversation
          ? {
            ...s.activeConversation,
            isBlockedByMe: true,
          }
          : null,
      }));
      toast.success(`Blocked @${otherUser.username}`);
      fetchConversations(activeFolder, true);
    } catch (err: any) {
      console.error('Failed to block user:', err);
      toast.error(err?.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!token || !activeConversation || !otherUser?.username) return;
    try {
      await userService.toggleBlock(otherUser.username, token);
      updateConversationInList({
        id: activeConversation.id,
        isBlockedByMe: false,
      });
      useMessageStore.setState((s) => ({
        activeConversation: s.activeConversation
          ? {
            ...s.activeConversation,
            isBlockedByMe: false,
          }
          : null,
      }));
      toast.success(`Unblocked @${otherUser.username}`);
      fetchConversations(activeFolder, true);
    } catch (err: any) {
      console.error('Failed to unblock user:', err);
      toast.error(err?.message || 'Failed to unblock user');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-100px)] bg-slate-950 min-w-0 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setActiveConversationId(null)}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {!isGroup && otherUser?.username ? (
            <Link
              href={`/profile/${otherUser.username}`}
              className="flex items-center gap-3 min-w-0 group/profile cursor-pointer"
            >
              <Avatar src={avatar} name={title} size="md" className="group-hover/profile:opacity-90 transition-opacity" />
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-slate-100 truncate group-hover/profile:text-blue-400 transition-colors flex items-center gap-1.5">
                  <span>{title}</span>
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  @{otherUser.username}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar src={avatar} name={title} size="md" />
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                  <span>{title}</span>
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {`${activeConversation?.participants?.length || activeConversation?.members?.length || 0} members`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 h-8 w-8 rounded-full"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!activeConversation) return;
              try {
                await deleteConversation(activeConversation.id);
                toast.success('Conversation deleted');
              } catch (err: any) {
                toast.error(err?.message || 'Failed to delete conversation');
              }
            }}
            title="Delete conversation"
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-2 h-8 w-8 rounded-sm"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGroupDetailsOpen(true)}
            title="Conversation Details & Settings"
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 h-8 w-8 rounded-sm"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Message Request Banner */}
      {isRequest && !activeConversation?.isBlockedByMe && !activeConversation?.isBlockedByOther && (
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-sans">
          <div className="flex items-center gap-2 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Message Request: The sender is not in your primary contacts.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAcceptRequest}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 px-3.5 rounded-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectRequest}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-7 px-3.5 rounded-sm"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Decline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlockUser}
              className="border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-xs h-7 px-3.5 rounded-sm"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Block
            </Button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={feedContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {/* Load More Historical Messages Button */}
        {messagesCursor[activeConversationId] && (
          <div className="text-center py-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoadingMessages}
              onClick={handleLoadOlderMessages}
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-900"
            >
              {isLoadingMessages ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : 'Load older messages'}
            </Button>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          {currentMessages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUserIds.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-slate-400 italic bg-slate-950 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>Someone is typing...</span>
        </div>
      )}

      {/* Message Composer or Block Status Bar */}
      {activeConversation?.isBlockedByMe ? (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
          <div className="text-xs text-rose-400 flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>You have blocked @{otherUser?.username || 'this user'}. You cannot send or receive messages.</span>
          </div>
          <Button
            size="sm"
            onClick={handleUnblockUser}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-8 px-4 rounded-sm"
          >
            Unblock
          </Button>
        </div>
      ) : activeConversation?.isBlockedByOther ? (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 text-xs text-rose-400 font-sans">
          <Ban className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>You cannot send messages to this conversation because you have been blocked by @{otherUser?.username || 'this user'}.</span>
        </div>
      ) : (
        <MessageComposer />
      )}
    </div>
  );
}
