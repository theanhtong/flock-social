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

type ProfileTab = 'posts' | 'replies' | 'likes';

export function ProfileUserPosts({ username }: ProfileUserPostsProps) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
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

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'replies', label: 'Replies' },
    { id: 'likes', label: 'Likes' },
  ];

  return (
    <div className="flex flex-col gap-3 font-sans">
      
      {/* Profile Feed Tabs (Styled identically to Notifications Page) */}
      <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden shadow-sm flex flex-col font-sans">
        <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ProfileTab)}
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
