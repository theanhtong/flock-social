'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageSquare,
  Loader2,
  Send,
  Trash2,
  Edit2,
  X,
  MoreHorizontal,
  Flag,
  Reply,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { commentService, CommentItem } from '@/services/comment-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(date.getTime())) return dateString;
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderFormattedContent(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-blue-400 font-semibold hover:underline">
        {part}
      </span>
    ) : (
      part
    )
  );
}

interface PostCommentsProps {
  postId: string;
  isModal?: boolean;
  onCommentCountChange?: (delta: number) => void;
}

export function PostComments({
  postId,
  isModal = false,
  onCommentCountChange,
}: PostCommentsProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Top level Root Comment input state
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await commentService.getCommentsByPost(postId, undefined, token);
      setComments(res.comments || []);
      setNextCursor(res.nextCursor);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, token]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await commentService.getCommentsByPost(postId, nextCursor, token);
      setComments((prev) => [...prev, ...(res.comments || [])]);
      setNextCursor(res.nextCursor);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load more comments');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCreateRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await commentService.createComment(
        postId,
        { content: content.trim() },
        token
      );
      setComments((prev) => [newComment, ...prev]);
      setContent('');
      onCommentCountChange?.(1);
      toast.success('Comment added');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isLiked = !c.isLiked;
          const likeCount = isLiked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1);
          return { ...c, isLiked, likeCount };
        }
        return c;
      })
    );

    try {
      const res = await commentService.toggleLike(commentId, token);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: res.isLiked, likeCount: res.likeCount }
            : c
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle like');
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId, token);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(-1);
      toast.success('Comment deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete comment');
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await commentService.updateComment(commentId, editContent.trim(), token);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated.content } : c))
      );
      setEditingCommentId(null);
      setEditContent('');
      toast.success('Comment updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update comment');
    }
  };

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80 font-sans text-xs">
      {/* Root Comment Input Box */}
      <form onSubmit={handleCreateRootComment} className="flex gap-2">
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName || user?.username || 'User'}
          size="sm"
        />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!content.trim() || isSubmitting}
            type="submit"
            className="px-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </form>

      {/* Root Comments List */}
      {isLoading ? (
        <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-[11px]">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-slate-500">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="flex flex-col gap-3 mt-1">
          {comments.map((comment) => (
            <RootCommentRow
              key={comment.id}
              comment={comment}
              postId={postId}
              isModal={isModal}
              currentUserId={user?.id}
              currentUserAvatar={user?.avatarUrl}
              currentUserName={user?.displayName || user?.username}
              onLike={() => handleToggleLike(comment.id)}
              onDelete={() => handleDeleteComment(comment.id)}
              editingCommentId={editingCommentId}
              editContent={editContent}
              setEditingCommentId={setEditingCommentId}
              setEditContent={setEditContent}
              onSaveEdit={handleSaveEdit}
              onCommentCountChange={onCommentCountChange}
              token={token}
            />
          ))}

          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-[11px] text-blue-400 hover:text-blue-300 py-1 text-center font-medium flex items-center justify-center gap-1.5"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </>
              ) : (
                'View more comments'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 1. ROOT COMMENT ROW (Top Level)
interface RootCommentRowProps {
  comment: CommentItem;
  postId: string;
  isModal?: boolean;
  currentUserId?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string;
  onLike: () => void;
  onDelete: () => void;
  editingCommentId: string | null;
  editContent: string;
  setEditingCommentId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  onSaveEdit: (id: string) => void;
  onCommentCountChange?: (delta: number) => void;
  token?: string | null;
}

function RootCommentRow({
  comment,
  postId,
  isModal = false,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  onLike,
  onDelete,
  editingCommentId,
  editContent,
  setEditingCommentId,
  setEditContent,
  onSaveEdit,
  onCommentCountChange,
  token,
}: RootCommentRowProps) {
  const isOwner = currentUserId === comment.user.id;
  const isEditing = editingCommentId === comment.id;

  const [showMenu, setShowMenu] = useState(false);
  const [showLevel1Replies, setShowLevel1Replies] = useState(false);
  const [level1Replies, setLevel1Replies] = useState<CommentItem[]>([]);
  const [isLoadingLevel1Replies, setIsLoadingLevel1Replies] = useState(false);
  const [level1Cursor, setLevel1Cursor] = useState<string | undefined>(undefined);
  const [isLoadingMoreLevel1, setIsLoadingMoreLevel1] = useState(false);

  // Inline reply state & click outside ref
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const replyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReplying) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (replyBoxRef.current && !replyBoxRef.current.contains(e.target as Node)) {
        setIsReplying(false);
        setReplyText('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReplying]);

  const toggleLevel1Replies = async () => {
    if (!showLevel1Replies && level1Replies.length === 0 && comment.replyCount > 0) {
      setIsLoadingLevel1Replies(true);
      try {
        const res = await commentService.getRepliesByComment(comment.id, undefined, token);
        setLevel1Replies(res.comments || []);
        setLevel1Cursor(res.nextCursor);
      } catch (err: any) {
        toast.error('Failed to load replies');
      } finally {
        setIsLoadingLevel1Replies(false);
      }
    }
    setShowLevel1Replies((prev) => !prev);
  };

  const handleLoadMoreLevel1 = async () => {
    if (!level1Cursor || isLoadingMoreLevel1) return;
    setIsLoadingMoreLevel1(true);
    try {
      const res = await commentService.getRepliesByComment(comment.id, level1Cursor, token);
      setLevel1Replies((prev) => [...prev, ...(res.comments || [])]);
      setLevel1Cursor(res.nextCursor);
    } catch (err: any) {
      toast.error('Failed to load more replies');
    } finally {
      setIsLoadingMoreLevel1(false);
    }
  };

  const handleOpenInlineReply = () => {
    setIsReplying((prev) => {
      const nextState = !prev;
      if (nextState && !replyText) {
        setReplyText(`@${comment.user.username} `);
      } else if (!nextState) {
        setReplyText('');
      }
      return nextState;
    });
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      let finalContent = replyText.trim();
      if (!finalContent.startsWith(`@${comment.user.username}`)) {
        finalContent = `@${comment.user.username} ${finalContent}`;
      }

      const newReply = await commentService.createComment(
        postId,
        { content: finalContent, parentCommentId: comment.id },
        token
      );

      setLevel1Replies((prev) => [...prev, newReply]);
      setShowLevel1Replies(true);
      comment.replyCount += 1;
      onCommentCountChange?.(1);

      setReplyText('');
      setIsReplying(false);
      toast.success('Reply added');
    } catch (err: any) {
      toast.error('Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteLevel1Reply = async (replyId: string) => {
    try {
      await commentService.deleteComment(replyId, token);
      setLevel1Replies((prev) => prev.filter((r) => r.id !== replyId));
      toast.success('Reply deleted');
    } catch (err: any) {
      toast.error('Failed to delete reply');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      {/* Root Comment Content */}
      <div className="flex gap-2.5 items-start">
        <Link href={`/profile/${comment.user.username}`}>
          <Avatar
            src={comment.user.avatarUrl}
            name={comment.user.displayName || comment.user.username}
            size="sm"
          />
        </Link>
        <div className="flex-1 bg-slate-950/40 border border-slate-800/80 rounded p-2.5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${comment.user.username}`}
                className="font-bold text-slate-200 hover:text-blue-400 text-[11px]"
              >
                {comment.user.displayName || comment.user.username}
              </Link>
              <span className="text-[10px] text-slate-500">
                @{comment.user.username}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-slate-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            <div className="relative flex items-center gap-1.5">
              {isOwner && !isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditContent(comment.content);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Edit comment"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onDelete}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : !isOwner ? (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-5 bg-slate-900 border border-slate-700 rounded shadow-lg z-20 py-1 w-32">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          toast.success('Comment reported');
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-rose-400 hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <Flag className="w-3 h-3" />
                        Report
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-1.5 flex flex-col gap-1.5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCommentId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSaveEdit(comment.id)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-200 mt-1 whitespace-pre-wrap">
              {renderFormattedContent(comment.content)}
            </p>
          )}

          {/* Root Comment Footer & Inline Reply Form Wrapper */}
          <div ref={replyBoxRef}>
            <div className="flex items-center gap-4 mt-2 pt-1 text-[10px] text-slate-400">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 hover:text-rose-400 transition-colors ${comment.isLiked ? 'text-rose-400 font-medium' : ''
                  }`}
              >
                <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{comment.likeCount}</span>
              </button>

              {/* MessageSquare Toggle Level 1 Replies button */}
              {comment.replyCount > 0 && (
                <button
                  onClick={toggleLevel1Replies}
                  className={`flex items-center gap-1 transition-colors ${showLevel1Replies ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-blue-400'
                    }`}
                  title="Toggle replies"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{comment.replyCount}</span>
                </button>
              )}

              {/* Separate Reply Button */}
              <button
                onClick={handleOpenInlineReply}
                className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </div>

            {/* Inline Reply Form for Root Comment */}
            {isReplying && (
              <form onSubmit={handleInlineSubmit} className="mt-2.5 flex gap-2 pt-2 border-t border-slate-800/60">
                <Avatar
                  src={currentUserAvatar}
                  name={currentUserName || 'User'}
                  size="sm"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to @${comment.user.username}...`}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="px-2.5"
                  >
                    {isSubmittingReply ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    className="px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL 1 REPLIES (INDENTED ROOT COMMENT -> pl-6 border-l) */}
      {showLevel1Replies && (
        <div className="pl-6 flex flex-col gap-2 border-l border-slate-800 ml-3.5 mt-1">
          {isLoadingLevel1Replies ? (
            <div className="py-2 text-[10px] text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Loading replies...
            </div>
          ) : (
            <>
              {level1Replies.map((reply) => (
                <Level1ReplyRow
                  key={reply.id}
                  reply={reply}
                  postId={postId}
                  isModal={isModal}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserName={currentUserName}
                  onDelete={() => handleDeleteLevel1Reply(reply.id)}
                  onCommentCountChange={onCommentCountChange}
                  token={token}
                />
              ))}

              {level1Cursor && (
                <button
                  onClick={handleLoadMoreLevel1}
                  disabled={isLoadingMoreLevel1}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium py-1 flex items-center gap-1"
                >
                  {isLoadingMoreLevel1 ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </>
                  ) : (
                    'View more replies'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 2. LEVEL 1 REPLY ROW (Child of Root Comment)
interface Level1ReplyRowProps {
  reply: CommentItem;
  postId: string;
  isModal?: boolean;
  currentUserId?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string;
  onDelete: () => void;
  onCommentCountChange?: (delta: number) => void;
  token?: string | null;
}

function Level1ReplyRow({
  reply,
  postId,
  isModal = false,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  onDelete,
  onCommentCountChange,
  token,
}: Level1ReplyRowProps) {
  const isOwner = currentUserId === reply.user.id;
  const [isLiked, setIsLiked] = useState(reply.isLiked);
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const [showMenu, setShowMenu] = useState(false);

  // Level 2 Sub-replies state
  const [showLevel2Replies, setShowLevel2Replies] = useState(false);
  const [level2Replies, setLevel2Replies] = useState<CommentItem[]>([]);
  const [isLoadingLevel2Replies, setIsLoadingLevel2Replies] = useState(false);
  const [level2Cursor, setLevel2Cursor] = useState<string | undefined>(undefined);
  const [isLoadingMoreLevel2, setIsLoadingMoreLevel2] = useState(false);

  // Inline reply state & click outside ref
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const replyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReplying) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (replyBoxRef.current && !replyBoxRef.current.contains(e.target as Node)) {
        setIsReplying(false);
        setReplyText('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReplying]);

  const toggleLevel2Replies = async () => {
    if (!showLevel2Replies && level2Replies.length === 0 && reply.replyCount > 0) {
      setIsLoadingLevel2Replies(true);
      try {
        const res = await commentService.getRepliesByComment(reply.id, undefined, token);
        setLevel2Replies(res.comments || []);
        setLevel2Cursor(res.nextCursor);
      } catch (err: any) {
        toast.error('Failed to load level 2 replies');
      } finally {
        setIsLoadingLevel2Replies(false);
      }
    }
    setShowLevel2Replies((prev) => !prev);
  };

  const handleLoadMoreLevel2 = async () => {
    if (!level2Cursor || isLoadingMoreLevel2) return;
    setIsLoadingMoreLevel2(true);
    try {
      const res = await commentService.getRepliesByComment(reply.id, level2Cursor, token);
      setLevel2Replies((prev) => [...prev, ...(res.comments || [])]);
      setLevel2Cursor(res.nextCursor);
    } catch (err: any) {
      toast.error('Failed to load more level 2 replies');
    } finally {
      setIsLoadingMoreLevel2(false);
    }
  };

  const handleOpenInlineReply = () => {
    setIsReplying((prev) => {
      const nextState = !prev;
      if (nextState && !replyText) {
        setReplyText(`@${reply.user.username} `);
      } else if (!nextState) {
        setReplyText('');
      }
      return nextState;
    });
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      let finalContent = replyText.trim();
      if (!finalContent.startsWith(`@${reply.user.username}`)) {
        finalContent = `@${reply.user.username} ${finalContent}`;
      }

      const newSubReply = await commentService.createComment(
        postId,
        { content: finalContent, parentCommentId: reply.id },
        token
      );

      setLevel2Replies((prev) => [...prev, newSubReply]);
      setShowLevel2Replies(true);
      reply.replyCount += 1;
      onCommentCountChange?.(1);

      setReplyText('');
      setIsReplying(false);
      toast.success('Reply added');
    } catch (err: any) {
      toast.error('Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await commentService.toggleLike(reply.id, token);
      setIsLiked(res.isLiked);
      setLikeCount(res.likeCount);
    } catch (err: any) {
      toast.error('Failed to toggle like');
    }
  };

  const handleDeleteLevel2Reply = async (subId: string) => {
    try {
      await commentService.deleteComment(subId, token);
      setLevel2Replies((prev) => prev.filter((r) => r.id !== subId));
      toast.success('Level 2 reply deleted');
    } catch (err: any) {
      toast.error('Failed to delete level 2 reply');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      <div className="flex gap-2 items-start bg-slate-950/60 border border-slate-800/60 rounded p-2 text-xs relative">
        <Link href={`/profile/${reply.user.username}`}>
          <Avatar
            src={reply.user.avatarUrl}
            name={reply.user.displayName || reply.user.username}
            size="sm"
          />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${reply.user.username}`}
                className="font-bold text-[11px] text-slate-200 hover:text-blue-400"
              >
                {reply.user.displayName || reply.user.username}
              </Link>
              <span className="text-[10px] text-slate-500">
                @{reply.user.username}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-slate-500">
                {formatRelativeTime(reply.createdAt)}
              </span>
            </div>

            <div className="relative flex items-center gap-1.5">
              {isOwner ? (
                <button
                  onClick={onDelete}
                  className="text-slate-500 hover:text-rose-400 p-0.5"
                  title="Delete reply"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Options"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-5 bg-slate-900 border border-slate-700 rounded shadow-lg z-20 py-1 w-32">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          toast.success('Reply reported');
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-rose-400 hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <Flag className="w-3 h-3" />
                        Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-200 mt-0.5 whitespace-pre-wrap">
            {renderFormattedContent(reply.content)}
          </p>

          {/* Level 1 Reply Footer & Inline Form Wrapper */}
          <div ref={replyBoxRef}>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1 hover:text-rose-400 transition-colors ${isLiked ? 'text-rose-400 font-medium' : ''
                  }`}
              >
                <Heart
                  className={`w-3 h-3 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`}
                />
                <span>{likeCount}</span>
              </button>

              {/* MessageSquare Toggle Level 2 Replies */}
              {reply.replyCount > 0 && (
                <button
                  onClick={toggleLevel2Replies}
                  className={`flex items-center gap-1 transition-colors ${showLevel2Replies ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-blue-400'
                    }`}
                  title="Toggle replies"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{reply.replyCount}</span>
                </button>
              )}

              {/* Separate Reply Button */}
              <button
                onClick={handleOpenInlineReply}
                className="flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
              >
                <Reply className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>

            {/* Inline Reply Form for Level 1 Reply */}
            {isReplying && (
              <form onSubmit={handleInlineSubmit} className="mt-2 flex gap-2 pt-1.5 border-t border-slate-800/60">
                <Avatar
                  src={currentUserAvatar}
                  name={currentUserName || 'User'}
                  size="sm"
                />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to @${reply.user.username}...`}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="px-2.5"
                  >
                    {isSubmittingReply ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    className="px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL 2 REPLIES (INDENTED LEVEL 1 -> pl-6 border-l inside pl-6) */}
      {showLevel2Replies && (
        <div className="pl-6 flex flex-col gap-2 border-l border-slate-800 ml-3 mt-1">
          {isLoadingLevel2Replies ? (
            <div className="py-2 text-[10px] text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Loading level 2 replies...
            </div>
          ) : (
            <>
              {level2Replies.map((sub) => (
                <Level2ReplyRow
                  key={sub.id}
                  reply={sub}
                  currentUserId={currentUserId}
                  onDelete={() => handleDeleteLevel2Reply(sub.id)}
                  token={token}
                />
              ))}

              {level2Cursor && (
                <button
                  onClick={handleLoadMoreLevel2}
                  disabled={isLoadingMoreLevel2}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium py-1 flex items-center gap-1"
                >
                  {isLoadingMoreLevel2 ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </>
                  ) : (
                    'View more level 2 replies'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 3. LEVEL 2 REPLY ROW (Leaf level - No further sub-replies)
interface Level2ReplyRowProps {
  reply: CommentItem;
  currentUserId?: string;
  onDelete: () => void;
  token?: string | null;
}

function Level2ReplyRow({
  reply,
  currentUserId,
  onDelete,
  token,
}: Level2ReplyRowProps) {
  const isOwner = currentUserId === reply.user.id;
  const [isLiked, setIsLiked] = useState(reply.isLiked);
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await commentService.toggleLike(reply.id, token);
      setIsLiked(res.isLiked);
      setLikeCount(res.likeCount);
    } catch (err: any) {
      toast.error('Failed to toggle like');
    }
  };

  return (
    <div className="flex gap-2 items-start bg-slate-950/80 border border-slate-800/80 rounded p-2 text-xs relative">
      <Link href={`/profile/${reply.user.username}`}>
        <Avatar
          src={reply.user.avatarUrl}
          name={reply.user.displayName || reply.user.username}
          size="sm"
        />
      </Link>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${reply.user.username}`}
              className="font-bold text-[11px] text-slate-200 hover:text-blue-400"
            >
              {reply.user.displayName || reply.user.username}
            </Link>
            <span className="text-[10px] text-slate-500">
              @{reply.user.username}
            </span>
            <span className="text-[10px] text-slate-500">•</span>
            <span className="text-[10px] text-slate-500">
              {formatRelativeTime(reply.createdAt)}
            </span>
          </div>

          <div className="relative flex items-center gap-1.5">
            {isOwner ? (
              <button
                onClick={onDelete}
                className="text-slate-500 hover:text-rose-400 p-0.5"
                title="Delete reply"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                  title="Options"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-5 bg-slate-900 border border-slate-700 rounded shadow-lg z-20 py-1 w-32">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        toast.success('Reply reported');
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-rose-400 hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <Flag className="w-3 h-3" />
                      Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-200 mt-0.5 whitespace-pre-wrap">
          {renderFormattedContent(reply.content)}
        </p>

        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1 hover:text-rose-400 transition-colors ${isLiked ? 'text-rose-400 font-medium' : ''
              }`}
          >
            <Heart
              className={`w-3 h-3 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`}
            />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
