'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, TrendingUp, Sparkles, UserPlus, UserCheck, Flame, MessageSquare, Heart, Bookmark, Share2 } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
import { postService, Post } from '@/services/post-service';
import { toast } from 'sonner';

interface RealHashtagTopic {
  tag: string;
  postsCount: number;
}

export default function ExplorePage() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<RealHashtagTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchExploreData = async () => {
      setLoading(true);
      try {
        const [feedRes, usersRes] = await Promise.all([
          postService.getPosts(undefined, token).catch(() => ({ posts: [] })),
          userService.searchUsers('a', token).catch(() => []),
        ]);

        const allPosts = feedRes.posts || [];
        setPosts(allPosts);
        setSuggestedUsers(usersRes || []);

        // Extract real hashtags dynamically from real database post content
        const tagMap: Record<string, number> = {};
        allPosts.forEach((post) => {
          const matches = post.content.match(/#[a-zA-Z0-9_]+/g);
          if (matches) {
            matches.forEach((m) => {
              const tagClean = m.replace('#', '');
              tagMap[tagClean] = (tagMap[tagClean] || 0) + 1;
            });
          }
        });

        const extracted = Object.entries(tagMap).map(([tag, postsCount]) => ({
          tag,
          postsCount,
        }));
        extracted.sort((a, b) => b.postsCount - a.postsCount);
        setTrendingHashtags(extracted);
      } catch (err: any) {
        toast.error('Failed to load explore data from API');
      } finally {
        setLoading(false);
      }
    };

    fetchExploreData();
  }, [token]);

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

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center gap-2">
            <Spinner size="md" variant="white" />
            <span className="text-xs text-slate-400 font-medium">Fetching real data from database...</span>
          </div>
        ) : (
          <>
            {/* Real Trending Hashtags Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Trending Hashtags ({trendingHashtags.length})</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">Live API</span>
              </div>

              {trendingHashtags.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-sm bg-slate-950/40">
                  <span>No hashtags posted yet. Post a feed update with <strong className="text-blue-400">#hashtag</strong> to start a trend!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {trendingHashtags.map((topic, idx) => (
                    <Link
                      key={topic.tag}
                      href={`/search?q=%23${topic.tag}`}
                      className="p-3.5 rounded-sm bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/90 transition-all flex items-start justify-between group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                          #{topic.tag}
                        </span>
                        <span className="text-[10px] text-slate-400">{topic.postsCount} post{topic.postsCount > 1 ? 's' : ''}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        <span>#{idx + 1}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Who to Follow (Real Database Users) */}
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
              <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Suggested Creators ({suggestedUsers.length})</span>
              </h2>

              {suggestedUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-sm bg-slate-950/40">
                  <span>No other user accounts found in the database.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {suggestedUsers.map((user) => {
                    const isFollowing = followingState[user.username] ?? false;
                    return (
                      <div
                        key={user.id}
                        className="p-3.5 rounded-sm bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="md" />
                          <div className="flex flex-col min-w-0 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-100 truncate">
                                {user.displayName || user.username}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">@{user.username}</span>
                            </div>
                            {user.bio && <p className="text-[11px] text-slate-300 truncate mt-0.5">{user.bio}</p>}
                          </div>
                        </Link>
                        <Button
                          variant={isFollowing ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleFollow(user.username)}
                          title={isFollowing ? 'Following' : 'Follow'}
                          className="shrink-0 p-2 text-xs"
                        >
                          {isFollowing ? (
                            <UserCheck className="w-4 h-4 text-blue-400" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
