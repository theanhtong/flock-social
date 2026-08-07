'use client';

import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Repeat2,
  Search,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { SidebarLayout } from '@/components/layout/sidebar';

interface PostItem {
  id: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    isVerified: boolean;
  };
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export function UserHomeFeed() {
  const user = useAuthStore((s) => s.user);

  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [trendingTopics] = useState<Array<{ tag: string; postsCount: string }>>([]);
  const [suggestedUsers] = useState<Array<{ name: string; username: string; role: string }>>([]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    const newPost: PostItem = {
      id: Date.now().toString(),
      author: {
        name: user?.displayName || user?.username || 'You',
        username: user?.username || 'me',
        avatarUrl: user?.avatarUrl || null,
        role: user?.role || 'customer',
        isVerified: user?.isVerified || false,
      },
      content: postContent.trim(),
      createdAt: 'Just now',
      likes: 0,
      comments: 0,
      isLiked: false,
    };

    setPosts([newPost, ...posts]);
    setPostContent('');
    toast.success('Post published!');
  };

  const toggleLike = (id: string) => {
    setPosts(
      posts.map((p) =>
        p.id === id ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p
      )
    );
  };

  const rightPanel = (
    <>
      {/* Search */}
      <div className="relative font-sans">
        <Input placeholder="Search Flock..." className="text-xs font-sans pr-8" />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
      </div>

      {/* Trending Topics */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
            Trending Topics
          </h3>
        </div>
        {trendingTopics.length === 0 ? (
          <span className="text-[11px] text-slate-500 font-sans">No trending topics yet</span>
        ) : (
          <div className="flex flex-col gap-2.5 font-sans">
            {trendingTopics.map((t, i) => (
              <div key={i} className="flex flex-col font-sans">
                <span className="text-xs font-semibold text-blue-400 hover:underline cursor-pointer font-sans">{t.tag}</span>
                <span className="text-[10px] text-slate-500 font-sans">{t.postsCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested People */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
            Suggested People
          </h3>
        </div>
        {suggestedUsers.length === 0 ? (
          <span className="text-[11px] text-slate-500 font-sans">No suggestions yet</span>
        ) : (
          suggestedUsers.map((u, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 font-sans">
              <div className="flex items-center gap-2 min-w-0 font-sans">
                <Avatar name={u.name} size="xs" />
                <div className="flex flex-col min-w-0 font-sans">
                  <span className="text-[11px] font-bold text-slate-200 truncate font-sans">{u.name}</span>
                  <span className="text-[10px] text-slate-400 font-sans truncate">@{u.username}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="px-2 py-0.5 text-[10px] font-sans">Follow</Button>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <SidebarLayout rightPanel={rightPanel}>
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
            className="w-full bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
          />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 font-sans">
          <span className="text-[11px] text-slate-500 font-sans">{postContent.length} / 280</span>
          <Button variant="primary" size="sm" disabled={!postContent.trim()} onClick={handleCreatePost}>
            Post
          </Button>
        </div>
      </div>

      {/* Feed Posts */}
      <div className="flex flex-col gap-3 font-sans">
        {posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center gap-2 font-sans">
            <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
            <p className="font-semibold text-slate-300 text-xs">No posts available yet</p>
            <p className="text-[11px] text-slate-500">Be the first to share your thoughts above!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
              <div className="flex items-center justify-between font-sans">
                <div className="flex items-center gap-2.5 font-sans">
                  <Avatar src={post.author.avatarUrl} name={post.author.name} size="sm" isVerified={post.author.isVerified} />
                  <div className="flex items-center gap-2 font-sans">
                    <span className="font-bold text-xs text-slate-100">{post.author.name}</span>
                    <RoleBadge role={post.author.role} size="sm" />
                    <span className="text-[11px] text-slate-400">@{post.author.username}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">{post.createdAt}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-4 pt-2 border-t border-slate-800/60 text-xs font-sans">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors">
                  <Repeat2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </SidebarLayout>
  );
}
