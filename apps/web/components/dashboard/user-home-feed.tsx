'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Loader2,
  MessageSquare,
  Repeat2,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';

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

export function UserHomeFeed() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await postService.getPosts(undefined, token);
      setPosts(res.posts || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newPost = await postService.createPost(postContent.trim(), [], token);
      setPosts([newPost, ...posts]);
      setPostContent('');
      toast.success('Post published!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          const likeCount = isLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1);
          return { ...p, isLiked, likeCount };
        }
        return p;
      })
    );

    try {
      const res = await postService.toggleLike(postId, token);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.liked, likeCount: res.likeCount }
            : p
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update like status');
      fetchPosts();
    }
  };

  const toggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, isBookmarked: !p.isBookmarked };
        }
        return p;
      })
    );

    try {
      const res = await postService.toggleBookmark(postId, token);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isBookmarked: res.bookmarked } : p
        )
      );
      toast.success(posts.find(p => p.id === postId)?.isBookmarked ? 'Bookmark removed' : 'Post bookmarked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bookmark');
      fetchPosts();
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await postService.deletePost(postId, token);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete post');
    }
  };

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      {/* Post Composer */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex gap-3 font-sans">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username || 'User'}
            size="md"
          />
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What is happening on Flock today?"
            rows={3}
            maxLength={280}
            className="w-full bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
          />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 font-sans">
          <span className="text-[11px] text-slate-500 font-sans">{postContent.length} / 280</span>
          <Button
            variant="primary"
            size="sm"
            disabled={!postContent.trim() || isSubmitting}
            onClick={handleCreatePost}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>

      {/* Feed Posts */}
      <div className="flex flex-col gap-3 font-sans">
        {isLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center flex flex-col items-center justify-center gap-3 font-sans">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center gap-2 font-sans">
            <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
            <p className="font-semibold text-slate-300 text-xs">No new posts right now</p>
            <p className="text-[11px] text-slate-500">
              You're all caught up! Check back later or create a new post above.
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const authorName = post.user?.displayName || post.user?.username || 'User';
            const authorUsername = post.user?.username || 'user';
            const isOwner = user?.id === post.user?.id || user?.username === post.user?.username;

            return (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans hover:border-slate-700/60 transition-colors">
                <div className="flex items-center justify-between font-sans">
                  <Link href={`/profile/${authorUsername}`} className="flex items-center gap-2.5 font-sans group">
                    <Avatar src={post.user?.avatarUrl} name={authorName} size="sm" />
                    <div className="flex items-center gap-2 font-sans">
                      <span className="font-bold text-xs text-slate-100 group-hover:text-blue-400 transition-colors">{authorName}</span>
                      <span className="text-[11px] text-slate-400">@{authorUsername}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">{formatRelativeTime(post.createdAt)}</span>
                    {isOwner && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Delete post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {post.content && (
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Media grid if any */}
                {post.media && post.media.length > 0 && (
                  <div className={`grid gap-2 rounded overflow-hidden mt-1 ${
                    post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}>
                    {post.media.map((m) => (
                      <img
                        key={m.id}
                        src={m.url}
                        alt="Post attachment"
                        className="w-full max-h-80 object-cover rounded border border-slate-800"
                      />
                    ))}
                  </div>
                )}

                {/* Post Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-sans">
                  <div className="flex items-center gap-5">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.isLiked ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                      <span>{post.likeCount < 0 ? '—' : post.likeCount}</span>
                    </button>

                    <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{post.commentCount}</span>
                    </button>

                    <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                      <Repeat2 className="w-3.5 h-3.5" />
                      <span>{post.repostCount}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className={`transition-colors ${
                      post.isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                    }`}
                    title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${post.isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </SidebarLayout>
  );
}
