'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { PostCard } from '@/components/posts/post-card';
import { PostCardSkeleton } from '@/components/ui/skeleton';

interface ProfileUserPostsProps {
  username: string;
}

export function ProfileUserPosts({ username }: ProfileUserPostsProps) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserPosts = async () => {
    setIsLoading(true);
    try {
      const data = await postService.getUserPosts(username, activeTab, token);
      setPosts(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load user posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPosts();
  }, [username, activeTab, token]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Profile Feed Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-1 flex items-center gap-1 font-sans text-xs">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2 text-center font-medium rounded-sm transition-colors cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`flex-1 py-2 text-center font-medium rounded-sm transition-colors cursor-pointer ${
            activeTab === 'replies'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Replies
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-2 text-center font-medium rounded-sm transition-colors cursor-pointer ${
            activeTab === 'likes'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Likes
        </button>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex flex-col gap-3 font-sans">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 text-center flex flex-col items-center gap-2 font-sans">
          <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300 text-xs">No posts to display</p>
          <p className="text-[11px] text-slate-500">
            This user has not posted anything under {activeTab} yet.
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            token={token}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
          />
        ))
      )}
    </div>
  );
}
