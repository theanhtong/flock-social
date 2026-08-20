'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Hash, ArrowLeft, Loader2, FileText, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { PostCard } from '@/components/posts/post-card';

interface HashtagPageProps {
  params: Promise<{ tag: string }>;
}

type HashtagTab = 'top' | 'latest' | 'media';

export default function HashtagPage({ params }: HashtagPageProps) {
  const resolvedParams = use(params);
  const rawTag = resolvedParams.tag || '';
  const cleanTag = decodeURIComponent(rawTag).replace(/^#/, '').trim();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<HashtagTab>('top');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cleanTag) {
      setLoading(false);
      return;
    }

    const fetchHashtagPosts = async () => {
      setLoading(true);
      try {
        const results = await postService.searchPosts(`#${cleanTag}`, token);
        setPosts(results || []);
      } catch (err) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtagPosts();
  }, [cleanTag, token]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleShareHashtag = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(`Copied link for #${cleanTag}`);
    }
  };

  const mediaPosts = posts.filter((p) => p.media && p.media.length > 0);

  const displayedPosts = activeTab === 'media' ? mediaPosts : posts;

  const tabs = [
    { id: 'top', label: 'Top' },
    { id: 'latest', label: 'Latest' },
    { id: 'media', label: `Media (${mediaPosts.length})` },
  ];

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        
        {/* Sleek Minimalist Hashtag Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden shadow-sm flex flex-col font-sans">
          
          {/* Top Title Bar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="p-1.5 rounded-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
                title="Back to Search"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-100 truncate">#{cleanTag}</h1>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-semibold flex items-center gap-1 shrink-0">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                    <span>Trending</span>
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {loading ? 'Fetching posts...' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareHashtag}
              className="p-2 rounded-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
              title="Share Hashtag"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as HashtagTab)}
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
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Fetching #{cleanTag} posts...</span>
            </div>
          ) : displayedPosts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center text-center gap-2">
              <Hash className="w-8 h-8 text-slate-600 mb-1" />
              <span className="text-sm font-bold text-slate-200">No posts found for #{cleanTag}</span>
              <span className="text-xs text-slate-400 max-w-xs">
                Be the first to create a post using the hashtag <span className="text-blue-400 font-bold">#{cleanTag}</span>!
              </span>
              <Link href="/" className="mt-2">
                <Button variant="primary" size="sm">
                  Create Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  token={token}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
