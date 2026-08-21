'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageSquare,
  Repeat2,
  Bookmark,
  Pencil,
  Trash2,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Post, postService } from '@/services/post-service';
import { Avatar } from '@/components/ui/avatar';
import { VideoPlayer } from '@/components/ui/video-player';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { CommentModal } from '@/components/comments/comment-modal';
import { RepostModal } from '@/components/posts/repost-modal';
import { EditPostModal } from '@/components/posts/edit-post-modal';
import { ReportModal } from '@/components/reports/report-modal';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  token?: string | null;
  onPostUpdated?: (updatedPost: Post) => void;
  onPostDeleted?: (postId: string) => void;
}

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

export function PostCard({ post, currentUserId, token, onPostUpdated, onPostDeleted }: PostCardProps) {
  const router = useRouter();
  const [localPost, setLocalPost] = useState<Post>(post);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [lightboxState, setLightboxState] = useState<{ mediaList: any[]; index: number; isOpen: boolean }>({
    mediaList: [],
    index: 0,
    isOpen: false,
  });

  const authorName = localPost.user?.displayName || localPost.user?.username || 'User';
  const authorUsername = localPost.user?.username || 'user';
  const isOwnPost = currentUserId && localPost.user?.id === currentUserId;

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;

    const previousIsLiked = localPost.isLiked;
    const previousCount = localPost.likeCount;

    setLocalPost((prev) => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? Math.max(0, prev.likeCount - 1) : prev.likeCount + 1,
    }));

    setIsLiking(true);
    try {
      const res = await postService.toggleLike(localPost.id, token);
      setLocalPost((prev) => ({
        ...prev,
        isLiked: res.liked,
        likeCount: res.likeCount,
      }));
    } catch (err: any) {
      setLocalPost((prev) => ({
        ...prev,
        isLiked: previousIsLiked,
        likeCount: previousCount,
      }));
      toast.error(err.message || 'Failed to update like status');
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarking) return;

    const previousIsBookmarked = localPost.isBookmarked;

    setLocalPost((prev) => ({
      ...prev,
      isBookmarked: !prev.isBookmarked,
    }));

    setIsBookmarking(true);
    try {
      const res = await postService.toggleBookmark(localPost.id, token);
      setLocalPost((prev) => ({
        ...prev,
        isBookmarked: res.bookmarked,
      }));
      toast.success(res.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch (err: any) {
      setLocalPost((prev) => ({
        ...prev,
        isBookmarked: previousIsBookmarked,
      }));
      toast.error(err.message || 'Failed to update bookmark status');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postService.deletePost(localPost.id, token);
      toast.success('Post deleted successfully');
      if (onPostDeleted) onPostDeleted(localPost.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    }
  };

  return (
    <>
      <div
        onClick={() => router.push(`/post/${localPost.id}`)}
        className="bg-slate-900 border border-slate-800 rounded-sm p-4 hover:border-slate-700 transition-colors cursor-pointer flex flex-col gap-3 shadow-sm font-sans"
      >
        {/* Author Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href={`/profile/${authorUsername}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <Avatar src={localPost.user?.avatarUrl} name={authorName} size="md" />
            </Link>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/profile/${authorUsername}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-xs text-slate-100 hover:text-blue-400 transition-colors truncate"
                >
                  {authorName}
                </Link>
                <span className="text-[11px] text-slate-400 truncate">@{authorUsername}</span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[11px] text-slate-400">{formatRelativeTime(localPost.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Action Menu (Edit/Delete or Report) */}
          <div className="flex items-center gap-1 shrink-0">
            {isOwnPost ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditModalOpen(true);
                  }}
                  className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                  title="Edit post"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeletePost}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Delete post"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReportModalOpen(true);
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                title="Report Post"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {localPost.content && (
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {localPost.content}
          </p>
        )}

        {/* Media Attachments */}
        {localPost.media && localPost.media.length > 0 && (
          <div
            className={`grid gap-2 rounded-sm overflow-hidden mt-1 ${
              localPost.media.length === 1 ? 'grid-cols-1 max-w-md sm:max-w-lg' : 'grid-cols-2 max-w-xl'
            }`}
          >
            {localPost.media.map((m) => {
              const isVideo = isVideoUrl(m.url, m.mediaType);
              const isSingle = localPost.media.length === 1;
              const mediaHeight = isSingle ? 'max-h-60 sm:max-h-64' : 'max-h-48 sm:max-h-52';

              return isVideo ? (
                <VideoPlayer
                  key={m.id}
                  src={m.url}
                  hlsUrl={m.hlsManifestUrl}
                  poster={m.thumbnailUrl}
                  status={m.status}
                  className={`w-full ${mediaHeight} object-cover rounded-sm border border-slate-800`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  key={m.id}
                  src={m.thumbnailUrl || m.url}
                  alt="Post attachment"
                  className={`w-full ${mediaHeight} object-cover rounded-sm border border-slate-800 cursor-pointer hover:opacity-90 transition-opacity`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const imageMedia = localPost.media.filter((item) => !isVideoUrl(item.url, item.mediaType));
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

        {/* Interactive Action Bar (Like, Comment, Repost, Bookmark) */}
        <div className="flex items-center justify-between text-slate-400 text-xs border-t border-slate-800/80 pt-2.5 mt-1">
          {/* Like */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              localPost.isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${localPost.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{localPost.likeCount}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCommentModalOpen(true);
            }}
            className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{localPost.commentCount}</span>
          </button>

          {/* Repost */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRepostModalOpen(true);
            }}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Repeat2 className="w-4 h-4" />
            <span>{localPost.repostCount}</span>
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              localPost.isBookmarked ? 'text-amber-400' : 'hover:text-amber-400'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${localPost.isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comment Drawer / Modal */}
      {commentModalOpen && (
        <CommentModal
          post={localPost}
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          onCommentCountChange={(_postId, delta) => {
            setLocalPost((prev) => ({
              ...prev,
              commentCount: Math.max(0, prev.commentCount + delta),
            }));
          }}
        />
      )}

      {/* Repost Modal */}
      {repostModalOpen && (
        <RepostModal
          post={localPost}
          isOpen={repostModalOpen}
          onClose={() => setRepostModalOpen(false)}
          onSuccess={() => {
            setLocalPost((prev) => ({
              ...prev,
              repostCount: prev.repostCount + 1,
            }));
          }}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <EditPostModal
          post={localPost}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={(updatedPost: Post) => {
            setLocalPost(updatedPost);
            if (onPostUpdated) onPostUpdated(updatedPost);
          }}
        />
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="post"
          targetId={localPost.id}
          targetName={`Post by @${authorUsername}`}
        />
      )}

      {/* Image Lightbox */}
      {lightboxState.isOpen && (
        <ImageLightbox
          mediaList={lightboxState.mediaList}
          initialIndex={lightboxState.index}
          isOpen={lightboxState.isOpen}
          onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </>
  );
}
