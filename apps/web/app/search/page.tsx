'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, User, Hash, FileText, Sparkles, UserPlus, Heart, MessageSquare, ArrowRight } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
import { postService, Post } from '@/services/post-service';
import { toast } from 'sonner';

type SearchTab = 'top' | 'posts' | 'people' | 'hashtags';

interface ExtractedHashtag {
  tag: string;
  postsCount: number;
}

export default function SearchPage() {
  const token = useAuthStore((s) => s.token);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('top');
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<ExtractedHashtag[]>([]);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});

  // Fetch initial posts to build search corpus & extracted hashtags
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const feed = await postService.getPosts(undefined, token);
        const allPosts = feed.posts || [];
        setPosts(allPosts);

        // Extract real hashtags from real post contents
        const tagMap: Record<string, number> = {};
        allPosts.forEach((post) => {
          const matches = post.content.match(/#[a-zA-Z0-9_]+/g);
          if (matches) {
            matches.forEach((m) => {
              const tagClean = m.replace('#', '').toLowerCase();
              tagMap[tagClean] = (tagMap[tagClean] || 0) + 1;
            });
          }
        });

        const extracted = Object.entries(tagMap).map(([tag, postsCount]) => ({
          tag,
          postsCount,
        }));
        extracted.sort((a, b) => b.postsCount - a.postsCount);
        setHashtags(extracted);
      } catch (err) {
        // Silent catch for initial feed
      }
    };
    fetchInitialData();
  }, [token]);

  // Execute real database user search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const searchResults = await userService.searchUsers(query, token);
        setUsers(searchResults || []);
      } catch (err: any) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  const handleToggleFollow = async (username: string) => {
    try {
      const res = await userService.toggleFollow(username, token);
      setFollowingState((prev) => ({
        ...prev,
        [username]: res.isFollowing,
      }));
      toast.success(res.isFollowing ? `Following @${username}` : `Unfollowed @${username}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle follow status');
    }
  };

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
            <span className="text-xs text-slate-500 font-mono">Live API</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by name/handle, keywords, or #hashtags..."
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
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Searching database...</span>
            </div>
          ) : query && users.length === 0 && filteredPosts.length === 0 && filteredHashtags.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center text-center gap-2">
              <Search className="w-6 h-6 text-slate-600" />
              <span className="text-xs font-bold text-slate-300">No results found for "{query}"</span>
              <span className="text-[11px] text-slate-500 max-w-xs">
                Try searching for another username (@user), display name, or post content.
              </span>
            </div>
          ) : (
            <>
              {/* Real Database Users Section */}
              {(activeTab === 'top' || activeTab === 'people') && users.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>People ({users.length})</span>
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
                    {users.map((u) => {
                      const isFollowing = followingState[u.username] ?? false;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-sm bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <Link href={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="md" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-100 truncate">
                                {u.displayName || u.username}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">@{u.username}</span>
                              {u.bio && <p className="text-[11px] text-slate-300 truncate mt-0.5">{u.bio}</p>}
                            </div>
                          </Link>
                          <Button
                            variant={isFollowing ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleFollow(u.username)}
                            className="shrink-0 text-xs py-1"
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real Extracted Hashtags Section */}
              {(activeTab === 'top' || activeTab === 'hashtags') && filteredHashtags.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hashtags</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredHashtags.map((ht, idx) => (
                      <Link
                        key={ht.tag}
                        href={`/search?q=%23${ht.tag}`}
                        className="p-3 rounded-sm bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 transition-colors flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-400">#{ht.tag}</span>
                          <span className="text-[10px] text-slate-400">{ht.postsCount} post{ht.postsCount > 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                          #{idx + 1} Trending
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Real Database Posts Section */}
              {(activeTab === 'top' || activeTab === 'posts') && filteredPosts.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Posts ({filteredPosts.length})</span>
                  </span>

                  <div className="flex flex-col gap-3">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-sm bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <Link href={`/profile/${post.user.username}`} className="flex items-center gap-2">
                            <Avatar src={post.user.avatarUrl} name={post.user.displayName || post.user.username} size="sm" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-200">
                                {post.user.displayName || post.user.username}
                              </span>
                              <span className="text-[10px] text-slate-400">@{post.user.username}</span>
                            </div>
                          </Link>
                          <span className="text-[10px] text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
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
