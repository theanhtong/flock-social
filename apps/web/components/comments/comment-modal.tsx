'use client';

import React from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Post } from '@/services/post-service';
import { PostComments } from './post-comments';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(date.getTime())) return dateString;
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CommentModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
}

export function CommentModal({
  post,
  isOpen,
  onClose,
  onCommentCountChange,
}: CommentModalProps) {
  if (!post) return null;

  const authorName = post.user?.displayName || post.user?.username || 'User';
  const authorUsername = post.user?.username || 'user';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Post Reply"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4 font-sans text-xs">
        {/* Main Post Header & Content */}
        <div className="flex gap-3 pb-3 border-b border-slate-800">
          <Avatar
            src={post.user?.avatarUrl}
            name={authorName}
            size="md"
          />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${authorUsername}`}
                  className="font-bold text-slate-100 hover:text-blue-400 text-xs"
                >
                  {authorName}
                </Link>
                <span className="text-[11px] text-slate-400">
                  @{authorUsername}
                </span>
                <span className="text-[11px] text-slate-500">•</span>
                <span className="text-[11px] text-slate-500">
                  {formatRelativeTime(post.createdAt)}
                </span>
              </div>
            </div>

            {post.content && (
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap mt-1">
                {post.content}
              </p>
            )}

            {post.media && post.media.length > 0 && (
              <div
                className={`grid gap-2 rounded overflow-hidden mt-2 ${
                  post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {post.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt="Post attachment"
                    className="w-full max-h-60 object-cover rounded border border-slate-800"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments section inside Modal */}
        <PostComments
          postId={post.id}
          isModal={true}
          onCommentCountChange={(delta) => onCommentCountChange?.(post.id, delta)}
        />
      </div>
    </Modal>
  );
}
