'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Trash2, Reply, CheckCheck, Info } from 'lucide-react';
import { DirectMessage, MessageReaction } from '@/services/message-service';
import { useAuthStore } from '@/store/auth-store';
import { useMessageStore } from '@/store/message-store';
import { Avatar } from '@/components/ui/avatar';

interface MessageItemProps {
  message: DirectMessage;
}

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢'];

export function MessageItem({ message }: MessageItemProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { deleteMessage, reactToMessage, removeReaction, setReplyingToMessage } = useMessageStore();

  const [showContextMenu, setShowContextMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwn = message.senderId === currentUser?.id;
  const isSystem = message.messageType === 'system_event' || message.sender?.role === 'bot_system';
  const isUnsent = Boolean(
    message.isUnsent ||
      message.isDeleted ||
      message.content === 'This message was unsent' ||
      message.content === 'Message unsent'
  );

  // Close context menu when clicking anywhere outside
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showContextMenu]);

  if (isSystem) {
    return (
      <div className="w-full flex justify-center my-3 px-4 font-sans">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-medium shadow-sm max-w-[85%] text-center">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="break-words">{message.content}</span>
          <span className="text-[10px] text-slate-500 ml-1 shrink-0">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isUnsent) return;
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleToggleReaction = async (emoji: string) => {
    setShowContextMenu(false);
    const existing = message.reactions?.find((r) => r.userId === currentUser?.id && r.emoji === emoji);
    if (existing) {
      await removeReaction(message.id);
    } else {
      await reactToMessage(message.id, emoji);
    }
  };

  const handleReply = () => {
    setShowContextMenu(false);
    setReplyingToMessage(message);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    deleteMessage(message.id);
  };

  const groupReactions = (reactions: MessageReaction[] = []) => {
    const counts: Record<string, { emoji: string; count: number; userReacted: boolean }> = {};
    reactions.forEach((r) => {
      if (!counts[r.emoji]) {
        counts[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false };
      }
      counts[r.emoji].count += 1;
      if (r.userId === currentUser?.id) {
        counts[r.emoji].userReacted = true;
      }
    });
    return Object.values(counts);
  };

  const reactionSummary = groupReactions(message.reactions);

  const displayMediaUrls = (
    message.mediaUrls && message.mediaUrls.length > 0
      ? message.mediaUrls
      : (message as any).media && (message as any).media.length > 0
      ? (message as any).media.map((m: any) => m.url)
      : (message as any).mediaUrl
      ? [(message as any).mediaUrl]
      : []
  ).filter(Boolean);

  return (
    <div
      className={`relative flex gap-2 mb-3.5 ${
        isOwn ? 'flex-row-reverse self-end' : 'flex-row self-start'
      } max-w-[85%] sm:max-w-[70%] font-sans`}
    >
      {/* Sender Avatar for received messages */}
      {!isOwn && (
        <div className="flex-shrink-0 self-end">
          {message.sender?.username ? (
            <Link href={`/profile/${message.sender.username}`} className="block hover:opacity-80 transition-opacity">
              <Avatar
                src={message.sender?.avatarUrl}
                name={message.sender?.displayName || message.sender?.username || 'User'}
                size="xs"
              />
            </Link>
          ) : (
            <Avatar
              src={message.sender?.avatarUrl}
              name={message.sender?.displayName || message.sender?.username || 'User'}
              size="xs"
            />
          )}
        </div>
      )}

      {/* Bubble Container */}
      <div className="flex flex-col min-w-0 relative">
        {/* Sender Name if received in group */}
        {!isOwn && (
          message.sender?.username ? (
            <Link
              href={`/profile/${message.sender.username}`}
              className="text-[10px] font-medium text-slate-400 mb-1 ml-1 truncate hover:text-blue-400 transition-colors"
            >
              {message.sender?.displayName || message.sender?.username}
            </Link>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 mb-1 ml-1 truncate">
              {message.sender?.displayName || message.sender?.username}
            </span>
          )
        )}

        {/* Quoted Message Preview */}
        {message.replyTo && (
          <div
            className={`text-xs p-2 mb-1 rounded-t-lg border-l-2 border-blue-400 bg-slate-800/80 text-slate-300 opacity-90 truncate ${
              isOwn ? 'bg-blue-950/60 border-blue-300' : ''
            }`}
          >
            <span className="font-semibold text-[10px] text-blue-400 block mb-0.5">
              Replying to {message.replyTo.sender?.displayName || 'message'}
            </span>
            <span className="truncate block">
              {message.replyTo.isUnsent ? 'Message unsent' : message.replyTo.content || 'Media'}
            </span>
          </div>
        )}

        {/* Main Message Content */}
        <div
          onContextMenu={handleContextMenu}
          className={`relative p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm transition-all ${
            isOwn
              ? 'bg-blue-600 text-white rounded-br-xs border border-blue-500/30'
              : 'bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/60'
          } ${isUnsent ? 'italic opacity-60 bg-slate-900 text-slate-400 border border-dashed border-slate-700' : ''}`}
        >
          {isUnsent ? (
            <p>Message unsent</p>
          ) : (
            <>
              {/* Media Grid */}
              {displayMediaUrls.length > 0 && (
                <div
                  className={`grid gap-1.5 mb-2 rounded-lg overflow-hidden ${
                    displayMediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {displayMediaUrls.map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group/media block overflow-hidden rounded-md bg-slate-950">
                      <img
                        src={url}
                        alt="attachment"
                        className="w-full max-h-60 object-cover rounded-md hover:scale-105 transition-transform duration-200"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Text Content */}
              {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
            </>
          )}

          {/* Reaction Pills */}
          {reactionSummary.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
              {reactionSummary.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onClick={() => handleToggleReaction(item.emoji)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                    item.userReacted
                      ? 'bg-blue-500/30 border border-blue-400/50 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{item.emoji}</span>
                  {item.count > 1 && <span>{item.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Context Menu (Triggers on Right-Click) */}
        {showContextMenu && !isUnsent && (
          <div
            ref={menuRef}
            className={`absolute top-0 z-30 flex flex-col gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 font-sans min-w-[160px] ${
              isOwn ? 'right-full mr-2' : 'left-full ml-2'
            }`}
          >
            {/* Quick Reactions Bar */}
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(emoji)}
                  className="p-1 text-sm hover:scale-125 transition-transform rounded hover:bg-slate-800"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Context Actions */}
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleReply}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-200 hover:bg-slate-800 hover:text-blue-400 transition-colors w-full text-left"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>

              {isOwn && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors w-full text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unsend</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Timestamp & Status */}
        <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOwn && !isUnsent && <CheckCheck className="w-3-h-3 text-blue-400 inline" />}
        </div>
      </div>
    </div>
  );
}
