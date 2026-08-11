'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Repeat2,
  Trash2,
  Bookmark,
  Pencil,
  X,
  Users,
  Star,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { uploadService } from '@/services/upload-service';
import { Avatar } from '@/components/ui/avatar';
import { VideoPlayer } from '@/components/ui/video-player';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Button } from '@/components/ui/button';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
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

export function UserHomeFeed() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [postContent, setPostContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);
  const [repostTargetPost, setRepostTargetPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [lightboxState, setLightboxState] = useState<{ mediaList: any[]; index: number; isOpen: boolean }>({
    mediaList: [],
    index: 0,
    isOpen: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';
    const socket = io(`${socketUrl}/ws/posts`, {
      transports: ['websocket', 'polling'],
    });

    socket.on('new_post_created', (newPost: Post) => {
      if (newPost.user?.id === user?.id) return;
      setPendingPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const handleCommentCountDelta = (postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
          : p
      )
    );
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const data = await postService.getPosts(undefined, token);
      setPosts(data.posts || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load posts feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploadingMedia(true);
    try {
      const uploadedResults = await uploadService.uploadMultipleFiles(fileList, token);
      const newUrls = uploadedResults.map((item) => item.url);
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 4));
      toast.success('Uploaded media to MinIO');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload media');
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if ((!postContent.trim() && mediaUrls.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const createdPost = await postService.createPost(
        postContent.trim(),
        mediaUrls.length > 0 ? mediaUrls : undefined,
        undefined,
        token
      );
      setPosts((prev) => [createdPost, ...prev]);
      setPostContent('');
      setMediaUrls([]);
      toast.success('Post created successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
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
      fetchPosts();
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
      fetchPosts();
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
    <SidebarLayout rightPanel={<RightPanel />}>
      {/* Post Composer */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
        <div className="flex gap-3 font-sans">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username || 'User'}
            size="md"
          />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What is happening on Flock today?"
              rows={3}
              maxLength={280}
              className="w-full bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
            />

            {/* Small Square Image/Video Previews in 1 Row */}
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {mediaUrls.map((url, idx) => {
                  const isVideo = isVideoUrl(url);
                  return (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded overflow-hidden relative border border-slate-800 shrink-0 bg-slate-950 group"
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <img
                          src={url}
                          alt="Attachment preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors z-10"
                        title="Remove media"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar: Hidden File Input, Image Icon & Submit Button */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 font-sans">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleSelectFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-blue-400 transition-colors p-1"
              title="Add media"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-500 font-sans">{postContent.length} / 280</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={(!postContent.trim() && mediaUrls.length === 0) || isSubmitting}
            onClick={handleCreatePost}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>

      {/* Feed Posts */}
      <div className="flex flex-col gap-3 font-sans">
        {/* Floating Realtime New Posts Notification Banner */}
        {pendingPosts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPosts((prev) => [...pendingPosts, ...prev]);
              setPendingPosts([]);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/40 animate-in fade-in slide-in-from-top-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>
              {pendingPosts.length} new {pendingPosts.length === 1 ? 'post' : 'posts'} available • Click to view
            </span>
          </button>
        )}

        {isLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center flex flex-col items-center justify-center gap-3 font-sans">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center gap-2 font-sans">
            <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
            <p className="font-semibold text-slate-300 text-xs">No posts yet</p>
            <p className="text-[11px] text-slate-500">
              Be the first to share something on Flock!
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
                      className={`grid gap-2 rounded-xl overflow-hidden mt-1 ${post.media.length === 1 ? 'grid-cols-1 max-w-md sm:max-w-lg' : 'grid-cols-2 max-w-xl'
                        }`}
                    >
                      {post.media.map((m) => {
                        const isVideo = isVideoUrl(m.url, m.mediaType);
                        const isSingle = post.media.length === 1;
                        const mediaHeight = isSingle ? 'max-h-60 sm:max-h-64' : 'max-h-48 sm:max-h-52';

                        return isVideo ? (
                          <VideoPlayer
                            key={m.id}
                            src={m.url}
                            hlsUrl={m.hlsManifestUrl}
                            poster={m.thumbnailUrl}
                            status={m.status}
                            className={`w-full ${mediaHeight} object-cover rounded-xl border border-slate-800`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <img
                            key={m.id}
                            src={m.thumbnailUrl || m.url}
                            alt="Post attachment"
                            className={`w-full ${mediaHeight} object-cover rounded-xl border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity`}
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
                      className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 mt-1 flex flex-col gap-2 hover:border-slate-700 transition-colors max-w-xl"
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
                          className={`grid gap-2 mt-1 ${post.repostOf.media.length === 1 ? 'grid-cols-1 max-w-sm sm:max-w-md' : 'grid-cols-2 max-w-lg'
                            }`}
                        >
                          {post.repostOf.media.map((m) => {
                            const isVideo = isVideoUrl(m.url, m.mediaType);
                            const isSingle = post.repostOf!.media.length === 1;
                            const mediaHeight = isSingle ? 'max-h-48 sm:max-h-52' : 'max-h-40 sm:max-h-44';

                            return isVideo ? (
                              <VideoPlayer
                                key={m.id}
                                src={m.url}
                                hlsUrl={m.hlsManifestUrl}
                                poster={m.thumbnailUrl}
                                status={m.status}
                                className={`w-full ${mediaHeight} object-cover rounded-xl border border-slate-800`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <img
                                key={m.id}
                                src={m.thumbnailUrl || m.url}
                                alt="Repost attachment"
                                className={`w-full ${mediaHeight} object-cover rounded-xl border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity`}
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
                      className={`flex items-center gap-1.5 transition-colors ${post.isLiked
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-rose-400 text-rose-400' : ''
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
                    className={`transition-colors ${post.isBookmarked
                      ? 'text-amber-400'
                      : 'text-slate-500 hover:text-slate-200'
                      }`}
                    title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${post.isBookmarked ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
    </SidebarLayout>
  );
}
