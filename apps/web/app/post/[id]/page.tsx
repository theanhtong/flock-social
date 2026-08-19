'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { PostComments } from '@/components/comments/post-comments';
import { RepostModal } from '@/components/posts/repost-modal';
import { EditPostModal } from '@/components/posts/edit-post-modal';
import { PostCardSkeleton } from '@/components/ui/skeleton';

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

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ mediaList: any[]; index: number; isOpen: boolean }>({
    mediaList: [],
    index: 0,
    isOpen: false,
  });

  const fetchPost = async () => {
    if (!postId) return;
    setIsLoading(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 200));
    try {
      const [data] = await Promise.all([
        postService.getPostById(postId, token),
        minDelay,
      ]);
      setPost(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId, token]);

  const toggleLike = async () => {
    if (!post) return;

    const isLiked = !post.isLiked;
    const likeCount = isLiked ? post.likeCount + 1 : Math.max(0, post.likeCount - 1);
    setPost({ ...post, isLiked, likeCount });

    try {
      const res = await postService.toggleLike(post.id, token);
      setPost((prev) => (prev ? { ...prev, isLiked: res.liked, likeCount: res.likeCount } : null));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update like status');
      fetchPost();
    }
  };

  const toggleBookmark = async () => {
    if (!post) return;

    const isBookmarked = !post.isBookmarked;
    const bookmarkCount = isBookmarked ? post.bookmarkCount + 1 : Math.max(0, post.bookmarkCount - 1);
    setPost({ ...post, isBookmarked, bookmarkCount });

    try {
      const res = await postService.toggleBookmark(post.id, token);
      setPost((prev) => (prev ? { ...prev, isBookmarked: res.bookmarked } : null));
      toast.success(isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bookmark status');
      fetchPost();
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      await postService.deletePost(post.id, token);
      toast.success('Post deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete post');
    }
  };

  const handleCommentCountChange = (delta: number) => {
    setPost((prev) =>
      prev ? { ...prev, commentCount: Math.max(0, prev.commentCount + delta) } : null
    );
  };

  const authorName = post?.user?.displayName || post?.user?.username || 'User';
  const authorUsername = post?.user?.username || 'user';
  const isOwner = user?.id === post?.user?.id || user?.username === post?.user?.username;

  return (
    <SidebarLayout rightPanel={<RightPanel />}>
      <div className="flex flex-col gap-4 font-sans">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded p-3 text-slate-200">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-sm">@{post?.user?.username}</h1>
        </div>

        {/* Post Detail Card */}
        {isLoading ? (
          <PostCardSkeleton />
        ) : !post ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center gap-2">
            <p className="font-semibold text-slate-300 text-xs">Post not found</p>
            <p className="text-[11px] text-slate-500">
              The post you are looking for does not exist or has been deleted.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-4">

            {/* Header: Author & Options */}
            <div className="flex items-center justify-between">
              <Link
                href={`/profile/${authorUsername}`}
                className="flex items-center gap-3 group"
              >
                <Avatar src={post.user?.avatarUrl} name={authorName} size="md" />
                <div className="flex flex-col">
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
                      onClick={() => setIsEditModalOpen(true)}
                      className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                      title="Edit post"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            {post.content && (
              <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
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
                    />
                  ) : (
                    <img
                      key={m.id}
                      src={m.thumbnailUrl || m.url}
                      alt="Attachment"
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
                onClick={() => router.push(`/post/${post.repostOf?.id}`)}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 hover:border-slate-700 transition-colors cursor-pointer max-w-xl"
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

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleLike}
                  className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>{post.likeCount}</span>
                </button>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentCount}</span>
                </div>

                <button
                  onClick={() => setIsRepostModalOpen(true)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-green-400 transition-colors"
                  title="Repost / Quote"
                >
                  <Repeat2 className="w-4 h-4" />
                  <span>{post.repostCount}</span>
                </button>
              </div>

              <button
                onClick={toggleBookmark}
                className={`transition-colors ${post.isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                  }`}
                title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Post Comments Section */}
            <PostComments
              postId={post.id}
              onCommentCountChange={handleCommentCountChange}
            />

            <RepostModal
              post={post}
              isOpen={isRepostModalOpen}
              onClose={() => setIsRepostModalOpen(false)}
              onSuccess={() => {
                setPost((prev) =>
                  prev ? { ...prev, repostCount: prev.repostCount + 1 } : null
                );
              }}
            />

            <EditPostModal
              post={post}
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={(updatedPost) => {
                setPost(updatedPost);
              }}
            />

            <ImageLightbox
              mediaList={lightboxState.mediaList}
              initialIndex={lightboxState.index}
              isOpen={lightboxState.isOpen}
              onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
            />
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
