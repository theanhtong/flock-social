'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, TrendingUp, Sparkles, UserPlus, Flame, MessageSquare, Heart, Bookmark, Share2 } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TrendingTopic {
  id: string;
  category: string;
  hashtag: string;
  postsCount: number;
  isHot?: boolean;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  isFollowing: boolean;
}

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [trendingTopics] = useState<TrendingTopic[]>([
    { id: '1', category: 'Tech', hashtag: 'FlockRelease', postsCount: 12450, isHot: true },
    { id: '2', category: 'Development', hashtag: 'NextJS15', postsCount: 8900, isHot: true },
    { id: '3', category: 'DevOps', hashtag: 'Dockerize', postsCount: 5400 },
    { id: '4', category: 'AI & ML', hashtag: 'DeepMind', postsCount: 18900, isHot: true },
    { id: '5', category: 'Design', hashtag: 'DarkUI', postsCount: 3200 },
    { id: '6', category: 'Engineering', hashtag: 'TypeScript5', postsCount: 4100 },
  ]);

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([
    {
      id: 'u1',
      username: 'deepmind_ai',
      displayName: 'DeepMind Labs',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      bio: 'Pioneering intelligence to advance science and benefit humanity.',
      isFollowing: false,
    },
    {
      id: 'u2',
      username: 'frontend_master',
      displayName: 'Frontend Master',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Crafting responsive UI, micro-animations & clean design systems.',
      isFollowing: false,
    },
    {
      id: 'u3',
      username: 'cloud_native',
      displayName: 'Cloud Native Architect',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'Kubernetes, Docker monorepo pipelines & microservices.',
      isFollowing: true,
    },
  ]);

  const categories = ['all', 'Tech', 'Development', 'AI & ML', 'Design', 'DevOps'];

  const toggleFollow = (id: string) => {
    setSuggestedUsers((prev) =>
      prev.map((user) => {
        if (user.id === id) {
          const nextState = !user.isFollowing;
          toast.success(nextState ? `Following @${user.username}` : `Unfollowed @${user.username}`);
          return { ...user, isFollowing: nextState };
        }
        return user;
      })
    );
  };

  const filteredTopics =
    selectedCategory === 'all'
      ? trendingTopics
      : trendingTopics.filter((t) => t.category === selectedCategory);

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        
        {/* Explore Featured Banner */}
        <div className="relative rounded-sm overflow-hidden bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-900/60 border border-slate-800 p-6 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore What's Happening</span>
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Trending Discussions & Tech Innovations
          </h1>
          <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
            Discover community posts, trending engineering topics, and recommended developers building on Flock Social.
          </p>
        </div>

        {/* Trending Categories Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <TrendingUp className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium capitalize transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Trending Topics Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Trending Hashtags</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Updated live</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/search?q=%23${topic.hashtag}`}
                className="p-3.5 rounded-sm bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/90 transition-all flex items-start justify-between group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    {topic.category}
                  </span>
                  <span className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                    #{topic.hashtag}
                  </span>
                  <span className="text-[10px] text-slate-400">{topic.postsCount.toLocaleString()} posts</span>
                </div>
                {topic.isHot && (
                  <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" />
                    <span>HOT</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Who to Follow Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>Suggested Creators to Follow</span>
          </h2>

          <div className="flex flex-col gap-2.5">
            {suggestedUsers.map((user) => (
              <div
                key={user.id}
                className="p-3.5 rounded-sm bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
                  <div className="flex flex-col min-w-0 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 truncate">{user.displayName}</span>
                      <span className="text-[10px] text-slate-400 truncate">@{user.username}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">{user.bio}</p>
                  </div>
                </Link>
                <Button
                  variant={user.isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => toggleFollow(user.id)}
                  className="shrink-0 text-xs py-1"
                >
                  {user.isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
