'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, User, Hash, FileText, Sparkles, UserPlus, Heart, MessageSquare, ArrowRight } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

type SearchTab = 'top' | 'posts' | 'people' | 'hashtags';

interface MockUserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  followersCount: number;
  isFollowing?: boolean;
}

interface MockPostResult {
  id: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

interface MockHashtagResult {
  tag: string;
  postsCount: number;
  trendingRank: number;
}

export default function SearchPage() {
  const token = useAuthStore((s) => s.token);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('top');
  const [isSearching, setIsSearching] = useState(false);

  // Mock initial search datasets
  const [people, setPeople] = useState<MockUserResult[]>([
    {
      id: '1',
      username: 'tech_insider',
      displayName: 'Tech Insider',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Latest updates in AI, software engineering & tech trends.',
      followersCount: 14200,
      isFollowing: false,
    },
    {
      id: '2',
      username: 'design_craft',
      displayName: 'Design Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'UI/UX design systems, dark modes & micro-interactions.',
      followersCount: 8900,
      isFollowing: true,
    },
    {
      id: '3',
      username: 'dev_alex',
      displayName: 'Alex Rivers',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Fullstack Next.js developer building flock-social.',
      followersCount: 3400,
      isFollowing: false,
    },
  ]);

  const [posts, setPosts] = useState<MockPostResult[]>([
    {
      id: 'p1',
      author: {
        username: 'tech_insider',
        displayName: 'Tech Insider',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      content: 'Dockerizing Next.js 15 monorepo with standalone output reduces container image size by 70%! #NextJS #Docker',
      createdAt: '10m ago',
      likeCount: 42,
      commentCount: 8,
    },
    {
      id: 'p2',
      author: {
        username: 'dev_alex',
        displayName: 'Alex Rivers',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      content: 'Just launched real-time notifications & moderation dashboard in Flock Social! Check it out. #FlockSocial #DevLog',
      createdAt: '1h ago',
      likeCount: 128,
      commentCount: 24,
    },
  ]);

  const hashtags: MockHashtagResult[] = [
    { tag: 'FlockRelease', postsCount: 1540, trendingRank: 1 },
    { tag: 'NextJS15', postsCount: 890, trendingRank: 2 },
    { tag: 'Dockerize', postsCount: 640, trendingRank: 3 },
    { tag: 'TypeScript', postsCount: 420, trendingRank: 4 },
  ];

  // Simulating debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleFollowUser = (id: string) => {
    setPeople((prev) =>
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

  const filteredPeople = people.filter(
    (p) =>
      p.username.toLowerCase().includes(query.toLowerCase()) ||
      p.displayName.toLowerCase().includes(query.toLowerCase()) ||
      p.bio.toLowerCase().includes(query.toLowerCase())
  );

  const filteredPosts = posts.filter((p) =>
    p.content.toLowerCase().includes(query.toLowerCase())
  );

  const filteredHashtags = hashtags.filter((h) =>
    h.tag.toLowerCase().includes(query.toLowerCase().replace('#', ''))
  );

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        
        {/* Search Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Global Search</span>
            </h1>
            <span className="text-xs text-slate-500 font-mono">Real-time</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, people, or hashtags..."
              className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-sm pl-10 pr-9 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-800/80 pt-1">
            {(['top', 'people', 'posts', 'hashtags'] as SearchTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-sm transition-colors border-b-2 capitalize ${
                  activeTab === tab
                    ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        <div className="flex flex-col gap-3">
          {isSearching ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Searching Flock Social...</span>
            </div>
          ) : query && filteredPeople.length === 0 && filteredPosts.length === 0 && filteredHashtags.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center text-center gap-2">
              <Search className="w-6 h-6 text-slate-600" />
              <span className="text-xs font-bold text-slate-300">No results found for "{query}"</span>
              <span className="text-[11px] text-slate-500 max-w-xs">
                Try searching for another keyword, username (@user), or trending hashtag (#tag).
              </span>
            </div>
          ) : (
            <>
              {/* People Section */}
              {(activeTab === 'top' || activeTab === 'people') && filteredPeople.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>People</span>
                    </span>
                    {activeTab === 'top' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('people')}
                        className="text-[11px] text-blue-400 hover:underline font-medium flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {filteredPeople.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between p-3 rounded-sm bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <Link href={`/profile/${person.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar src={person.avatarUrl} name={person.displayName} size="md" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-100 truncate">{person.displayName}</span>
                            <span className="text-[10px] text-slate-400 truncate">@{person.username}</span>
                            <p className="text-[11px] text-slate-300 truncate mt-0.5">{person.bio}</p>
                          </div>
                        </Link>
                        <Button
                          variant={person.isFollowing ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => toggleFollowUser(person.id)}
                          className="shrink-0 text-xs py-1"
                        >
                          {person.isFollowing ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags Section */}
              {(activeTab === 'top' || activeTab === 'hashtags') && filteredHashtags.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hashtags</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredHashtags.map((ht) => (
                      <Link
                        key={ht.tag}
                        href={`/search?q=%23${ht.tag}`}
                        className="p-3 rounded-sm bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 transition-colors flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-400">#{ht.tag}</span>
                          <span className="text-[10px] text-slate-400">{ht.postsCount.toLocaleString()} posts</span>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                          #{ht.trendingRank} Trending
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {(activeTab === 'top' || activeTab === 'posts') && filteredPosts.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Posts</span>
                  </span>

                  <div className="flex flex-col gap-3">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-sm bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <Link href={`/profile/${post.author.username}`} className="flex items-center gap-2">
                            <Avatar src={post.author.avatarUrl} name={post.author.displayName} size="sm" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-200">{post.author.displayName}</span>
                              <span className="text-[10px] text-slate-400">@{post.author.username}</span>
                            </div>
                          </Link>
                          <span className="text-[10px] text-slate-500">{post.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1 hover:text-rose-400 transition-colors">
                            <Heart className="w-3.5 h-3.5" />
                            <span>{post.likeCount}</span>
                          </span>
                          <span className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{post.commentCount}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
