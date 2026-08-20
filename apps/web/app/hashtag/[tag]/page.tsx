'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Hash, ArrowLeft, Loader2, Sparkles, Heart, MessageSquare, User, FileText } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';

interface HashtagPageProps {
  params: Promise<{ tag: string }>;
}

export default function HashtagPage({ params }: HashtagPageProps) {
  const resolvedParams = use(params);
  const rawTag = resolvedParams.tag || '';
  const cleanTag = decodeURIComponent(rawTag).replace(/^#/, '').trim();

  const token = useAuthStore((s) => s.token);
  const [posts, setPosts] = useState<Post[]>([]);
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

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        
        {/* Hashtag Banner Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="p-2 rounded-sm bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-sm bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Hash className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-100">#{cleanTag}</h1>
                <span className="text-xs text-slate-400">
                  {loading ? 'Counting posts...' : `${posts.length} post${posts.length !== 1 ? 's' : ''} tagged`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Container */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Fetching #{cleanTag} posts...</span>
            </div>
          ) : posts.length === 0 ? (
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
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Posts ({posts.length})</span>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-sm bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${post.user.username}`} className="flex items-center gap-2.5">
                        <Avatar src={post.user.avatarUrl} name={post.user.displayName || post.user.username} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-100 hover:text-blue-400 transition-colors">
                            {post.user.displayName || post.user.username}
                          </span>
                          <span className="text-[10px] text-slate-400">@{post.user.username}</span>
                        </div>
                      </Link>
                      <span className="text-[10px] text-slate-500">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/40 mt-1">
                      <span className="flex items-center gap-1 hover:text-rose-400 transition-colors cursor-pointer">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{post.likeCount}</span>
                      </span>
                      <span className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.commentCount}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
