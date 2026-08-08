'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Loader2,
  MessageSquare,
  Repeat2,
  Trash2,
  Bookmark,
  Pencil,
  Users,
  Star,
  Lock,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { Avatar } from '@/components/ui/avatar';
import { VideoPlayer } from '@/components/ui/video-player';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { CommentModal } from '@/components/comments/comment-modal';
import { RepostModal } from '@/components/posts/repost-modal';
import { EditPostModal } from '@/components/posts/edit-post-modal';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(date.getTime())) return dateString;
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}d`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isVideoUrl(url: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('data:video/')) return true;
  return false;
}

interface ProfileUserPostsProps {
  username: string;
}

export function ProfileUserPosts({ username }: ProfileUserPostsProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);
  const [repostTargetPost, setRepostTargetPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [lightboxState, setLightboxState] = useState<{ mediaList: any[]; index: number; isOpen: boolean }>({
    mediaList: [],
    index: 0,
    isOpen: false,
  });

  const fetchUserPosts = async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const data = await postService.getUserPosts(username, activeTab, token);
      setPosts(data || []);
    } catch (err: any) {
      toast.error('Failed to load user posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPosts();
  }, [username, activeTab, token]);

  const handleCommentCountDelta = (postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
          : p
      )
    );
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
      fetchUserPosts();
    }
  };

  const toggleBookmark = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isBookmarked = !p.isBookmarked;
          const bookmarkCount = isBookmarked ? p.bookmarkCount + 1 : Math.max(0, p.bookmarkCount - 1);
          return { ...p, isBookmarked, bookmarkCount };
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
      toast.success(
        posts.find((p) => p.id === postId)?.isBookmarked
          ? 'Removed from bookmarks'
          : 'Saved to bookmarks'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bookmark status');
      fetchUserPosts();
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
    <div className="flex flex-col gap-3 font-sans">
      {/* Profile Feed Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded p-1 flex items-center gap-1 font-sans text-xs">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2 text-center font-medium rounded transition-colors ${
            activeTab === 'posts'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`flex-1 py-2 text-center font-medium rounded transition-colors ${
            activeTab === 'replies'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Replies
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-2 text-center font-medium rounded transition-colors ${
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
        <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center flex flex-col items-center justify-center gap-3 font-sans">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center gap-2 font-sans">
          <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300 text-xs">No posts to display</p>
          <p className="text-[11px] text-slate-500">
            This user has not posted anything under {activeTab} yet.
          </p>
        </div>
      ) : (
        posts.map((post) => {
          const authorName = post.user?.displayName || post.user?.username || 'User';
          const authorUsername = post.user?.username || 'user';
          const isOwner = user?.id === post.user?.id || user?.username === post.user?.username;

          return (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans hover:border-slate-700/60 transition-colors"
            >
              {/* Repost Header Badge if this post is a Repost */}
              {post.repostOf && (
                <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium pb-1 border-b border-slate-800/60">
                  <Repeat2 className="w-3.5 h-3.5" />
                  <span>{authorName} reposted</span>
                </div>
              )}

              {/* Clickable Post Content Area */}
              <div
                onClick={() => router.push(`/post/${post.id}`)}
                className="flex flex-col gap-3 cursor-pointer"
              >
                <div className="flex items-center justify-between font-sans">
                  <Link
                    href={`/profile/${authorUsername}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 font-sans group"
                  >
                    <Avatar src={post.user?.avatarUrl} name={authorName} size="sm" />
                    <div className="flex items-center gap-2 font-sans">
                      <span className="font-bold text-xs text-slate-100 group-hover:text-blue-400 transition-colors">
                        {authorName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        @{authorUsername}
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                    {post.isEdited && (
                      <span className="text-[10px] text-slate-500 italic">
                        (Edited)
                      </span>
                    )}
                    {post.audience && post.audience !== 'everyone' && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                        {post.audience === 'followers' ? (
                          <>
                            <Users className="w-3 h-3 text-blue-400" />
                            <span>Followers</span>
                          </>
                        ) : post.audience === 'close_friends' ? (
                          <>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                            <span>Close Friends</span>
                          </>
                        ) : post.audience === 'restricted' ? (
                          <>
                            <Lock className="w-3 h-3 text-rose-400" />
                            <span>Restricted</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span className="capitalize">{post.audience}</span>
                          </>
                        )}
                      </span>
                    )}
                    {isOwner && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPost(post);
                          }}
                          className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                          title="Edit post"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {post.content && (
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {/* Media grid if any */}
                {post.media && post.media.length > 0 && (
                  <div
                    className={`grid gap-2 rounded overflow-hidden mt-1 ${
                      post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {post.media.map((m) => {
                      const isVideo = isVideoUrl(m.url, m.mediaType);
                      return isVideo ? (
                        <VideoPlayer
                          key={m.id}
                          src={m.url}
                          hlsUrl={m.hlsManifestUrl}
                          poster={m.thumbnailUrl}
                          status={m.status}
                          className="w-full max-h-80 object-cover rounded border border-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <img
                          key={m.id}
                          src={m.thumbnailUrl || m.url}
                          alt="Post attachment"
                          className="w-full max-h-80 object-cover rounded border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            const imageMedia = post.media.filter((item) => !isVideoUrl(item.url, item.mediaType));
                            const imgIdx = imageMedia.findIndex((item) => item.id === m.id);
                            setLightboxState({
                              mediaList: imageMedia,
                              index: imgIdx >= 0 ? imgIdx : 0,
                              isOpen: true,
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Reposted Embedded Post Preview */}
                {post.repostOf && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/post/${post.repostOf?.id}`);
                    }}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 mt-1 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={post.repostOf.user?.avatarUrl}
                        name={post.repostOf.user?.displayName || post.repostOf.user?.username || 'User'}
                        size="sm"
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-slate-200 truncate">
                          {post.repostOf.user?.displayName || post.repostOf.user?.username}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          @{post.repostOf.user?.username}
                        </span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] text-slate-500">
                          {formatRelativeTime(post.repostOf.createdAt)}
                        </span>
                      </div>
                    </div>
                    {post.repostOf.content && (
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {post.repostOf.content}
                      </p>
                    )}
                    {post.repostOf.media && post.repostOf.media.length > 0 && (
                      <div
                        className={`grid gap-2 mt-1 ${
                          post.repostOf.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                        }`}
                      >
                        {post.repostOf.media.map((m) => {
                          const isVideo = isVideoUrl(m.url, m.mediaType);
                          return isVideo ? (
                            <VideoPlayer
                              key={m.id}
                              src={m.url}
                              hlsUrl={m.hlsManifestUrl}
                              poster={m.thumbnailUrl}
                              status={m.status}
                              className="w-full max-h-60 object-cover rounded border border-slate-800"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <img
                              key={m.id}
                              src={m.thumbnailUrl || m.url}
                              alt="Repost attachment"
                              className="w-full max-h-60 object-cover rounded border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const imageMedia = post.repostOf!.media.filter(
                                  (item) => !isVideoUrl(item.url, item.mediaType)
                                );
                                const imgIdx = imageMedia.findIndex((item) => item.id === m.id);
                                setLightboxState({
                                  mediaList: imageMedia,
                                  index: imgIdx >= 0 ? imgIdx : 0,
                                  isOpen: true,
                                });
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Post Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-sans">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      post.isLiked
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        post.isLiked ? 'fill-rose-400 text-rose-400' : ''
                      }`}
                    />
                    <span>{post.likeCount < 0 ? '—' : post.likeCount}</span>
                  </button>

                  <button
                    onClick={() => setActiveModalPost(post)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentCount}</span>
                  </button>

                  <button
                    onClick={() => setRepostTargetPost(post)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-green-400 transition-colors"
                    title="Repost / Quote"
                  >
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span>{post.repostCount}</span>
                  </button>
                </div>

                <button
                  onClick={() => toggleBookmark(post.id)}
                  className={`transition-colors ${
                    post.isBookmarked
                      ? 'text-amber-400'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                  title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      post.isBookmarked ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })
      )}

      <CommentModal
        post={activeModalPost}
        isOpen={!!activeModalPost}
        onClose={() => setActiveModalPost(null)}
        onCommentCountChange={handleCommentCountDelta}
      />

      <RepostModal
        post={repostTargetPost}
        isOpen={!!repostTargetPost}
        onClose={() => setRepostTargetPost(null)}
        onSuccess={(newPost) => {
          setPosts((prev) => [
            newPost,
            ...prev.map((p) =>
              p.id === repostTargetPost?.id
                ? { ...p, repostCount: p.repostCount + 1 }
                : p
            ),
          ]);
        }}
      />

      <EditPostModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSuccess={(updatedPost) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
          );
        }}
      />

      <ImageLightbox
        mediaList={lightboxState.mediaList}
        initialIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
