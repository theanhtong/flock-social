'use client';

import React, { useState } from 'react';
import { Loader2, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(date.getTime())) return dateString;
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface RepostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newPost: Post) => void;
}

export function RepostModal({
  post,
  isOpen,
  onClose,
  onSuccess,
}: RepostModalProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!post) return null;

  const authorName = post.user?.displayName || post.user?.username || 'User';
  const authorUsername = post.user?.username || 'user';

  const handleRepost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const createdPost = await postService.createPost(
        content.trim(),
        undefined,
        post.id,
        token
      );
      toast.success('Reposted successfully');
      setContent('');
      onSuccess?.(createdPost);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to repost');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setContent('');
        onClose();
      }}
      title="Repost / Quote"
      maxWidth="lg"
    >
      <form onSubmit={handleRepost} className="flex flex-col gap-3 font-sans text-xs">
        {/* User Info & Text Input Area */}
        <div className="flex gap-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username || 'User'}
            size="md"
          />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-xs">
                {user?.displayName || user?.username}
              </span>
              <span className="text-[11px] text-slate-400">@{user?.username}</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment or thought... (optional)"
              rows={3}
              className="w-full bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
              autoFocus
            />
          </div>
        </div>

        {/* Post Preview Card being Reposted */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-sm p-3 flex flex-col gap-2 relative">
          <div className="flex items-center gap-2">
            <Avatar
              src={post.user?.avatarUrl}
              name={authorName}
              size="sm"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-200 text-xs truncate">
                {authorName}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                @{authorUsername}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-slate-500">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          </div>

          {post.content && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap pl-7">
              {post.content}
            </p>
          )}

          {/* Media Attachments Preview if present */}
          {post.media && post.media.length > 0 && (
            <div className="pl-7 mt-1 grid gap-2 grid-cols-2">
              {post.media.map((m) => (
                <div
                  key={m.id}
                  className="relative rounded overflow-hidden border border-slate-800 max-h-40 bg-slate-900"
                >
                  {m.mediaType === 'video' ? (
                    <video
                      src={m.url}
                      className="w-full h-full object-cover max-h-40"
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt="Attachment"
                      className="w-full h-full object-cover max-h-40"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500">
            {content.length}/280
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setContent('');
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5 px-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Repeat2 className="w-3.5 h-3.5" />
              )}
              <span>Repost</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
