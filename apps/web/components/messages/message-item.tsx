'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Trash2, Reply, CheckCheck, Info } from 'lucide-react';
import { DirectMessage, MessageReaction } from '@/services/message-service';
import { useAuthStore } from '@/store/auth-store';
import { useMessageStore } from '@/store/message-store';
import { Avatar } from '@/components/ui/avatar';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface MessageItemProps {
  message: DirectMessage;
}

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢'];

export function MessageItem({ message }: MessageItemProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { deleteMessage, reactToMessage, removeReaction, setReplyingToMessage } = useMessageStore();

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });
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

  const mediaList = displayMediaUrls.map((url: string, idx: number) => ({
    id: `msg-${message.id}-${idx}`,
    url,
    mediaType: 'image' as const,
  }));

  return (
    <>
      <div
        className={`relative flex gap-2 mb-3.5 ${isOwn ? 'flex-row-reverse self-end' : 'flex-row self-start'
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
        <div className={`flex flex-col min-w-0 relative ${isOwn ? 'items-end' : 'items-start'}`}>
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
              className={`text-xs p-2 mb-1 rounded-t-lg border-l-2 border-blue-400 bg-slate-800/80 text-slate-300 opacity-90 truncate max-w-full ${isOwn ? 'bg-blue-950/60 border-blue-300' : ''
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

          {/* 1. Detached Standalone Media Grid (No background card) */}
          {displayMediaUrls.length > 0 && !isUnsent && (
            <div
              onContextMenu={handleContextMenu}
              className={`relative grid gap-1.5 mb-1.5 overflow-hidden rounded-2xl ${displayMediaUrls.length === 1
                ? 'grid-cols-1 max-w-[280px] sm:max-w-[320px]'
                : 'grid-cols-2 max-w-[300px] sm:max-w-[340px]'
                }`}
            >
              {displayMediaUrls.map((url: string, idx: number) => (
                <div key={idx} className="relative group/media block overflow-hidden rounded-xl bg-slate-900 border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setLightboxState({ isOpen: true, index: idx })}
                    onContextMenu={handleContextMenu}
                    className="w-full h-full block focus:outline-none cursor-pointer"
                  >
                    <img
                      src={url}
                      alt="attachment"
                      className="w-full h-auto max-h-64 object-cover rounded-xl group-hover/media:scale-105 transition-transform duration-200"
                    />
                  </button>
                  {/* Quick Reaction Button on Image Hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e);
                    }}
                    title="React to message"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700/60 opacity-0 group-hover/media:opacity-100 transition-all shadow-lg text-xs"
                  >
                    ❤️
                  </button>
                </div>
              ))}

              {/* Floating Reaction Pill if image-only message */}
              {!message.content && reactionSummary.length > 0 && (
                <div
                  className={`absolute -bottom-2 ${isOwn ? 'left-2' : 'right-2'
                    } z-10 flex items-center gap-1 bg-slate-900 border border-slate-700/80 shadow-md rounded-full px-1.5 py-0.5 text-[10px] select-none`}
                >
                  {reactionSummary.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReaction(item.emoji);
                      }}
                      className={`inline-flex items-center gap-0.5 hover:scale-110 transition-transform ${item.userReacted ? 'opacity-100 font-bold' : 'opacity-80 hover:opacity-100'
                        }`}
                    >
                      <span>{item.emoji}</span>
                      {item.count > 1 && <span className="text-[9px] text-slate-300 font-semibold">{item.count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Text Content Message Bubble (or Unsent state) */}
          {(message.content || isUnsent) && (
            <div
              onContextMenu={handleContextMenu}
              className={`relative p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm transition-all ${isOwn
                  ? 'bg-blue-600/30 text-blue-50 border border-blue-400/40 rounded-br-xs'
                  : 'bg-slate-800/80 text-slate-100 rounded-bl-xs border border-slate-700/60'
                } ${isUnsent ? 'italic opacity-60 bg-slate-900 text-slate-400 border border-dashed border-slate-700' : ''}`}
            >
              {isUnsent ? (
                <p>Message unsent</p>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Floating Reaction Pill */}
              {reactionSummary.length > 0 && (
                <div
                  className={`absolute -bottom-2.5 ${isOwn ? 'left-2' : 'right-2'
                    } z-10 flex items-center gap-1 bg-slate-900 border border-slate-700/80 shadow-md rounded-full px-1.5 py-0.5 text-[10px] select-none`}
                >
                  {reactionSummary.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReaction(item.emoji);
                      }}
                      className={`inline-flex items-center gap-0.5 hover:scale-110 transition-transform ${item.userReacted ? 'opacity-100 font-bold' : 'opacity-80 hover:opacity-100'
                        }`}
                    >
                      <span>{item.emoji}</span>
                      {item.count > 1 && <span className="text-[9px] text-slate-300 font-semibold">{item.count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timestamp and Sent Status Checkmark */}
          <div className={`flex items-center gap-1 ${reactionSummary.length > 0 ? 'mt-2.5' : 'mt-1'} px-1 text-[10px] text-slate-400`}>
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isOwn && !isUnsent && (
              <span title="Delivered">
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              </span>
            )}
          </div>

          {/* Floating Context Menu (Triggers on Right-Click) */}
          {showContextMenu && !isUnsent && (
            <div
              ref={menuRef}
              className={`absolute top-0 z-30 flex flex-col gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 font-sans min-w-[160px] ${isOwn ? 'right-full mr-2' : 'left-full ml-2'
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
        </div>
      </div>

      {/* Standalone Image Lightbox with Left/Right Navigation */}
      {lightboxState.isOpen && (
        <ImageLightbox
          mediaList={mediaList}
          initialIndex={lightboxState.index}
          isOpen={lightboxState.isOpen}
          onClose={() => setLightboxState({ isOpen: false, index: 0 })}
        />
      )}
    </>
  );
}
