import {
  PostStatus,
  PostAudience,
  PostType,
  MediaType,
  PostDto,
  PostMediaDto,
  CommentDto,
  UserEmbedDto,
} from './posts.dto.js';

function mapUserEmbed(user: any): UserEmbedDto {
  return {
    id: user.id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    isVerified: user.isVerified,
    role: user.role,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    postsCount: user.postsCount ?? 0,
  };
}

export function formatPost(post: any, currentUserId?: string): PostDto {
  const media: PostMediaDto[] = post.media?.map((m: any) => ({
    id: m.media.id.toString(),
    url: m.media.originalUrl,
    mediaType: m.media.mediaType as MediaType,
    thumbnailUrl: m.media.thumbnailUrl ?? null,
    width: m.media.width ?? null,
    height: m.media.height ?? null,
    durationSeconds: m.media.durationSeconds ?? null,
  })) ?? [];

  const isAuthor = currentUserId && post.user?.id?.toString() === currentUserId;
  const shouldHideLikes = post.user?.settings?.hideLikeCounts && !isAuthor;

  return {
    id: post.id.toString(),
    content: post.content ?? '',
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    user: mapUserEmbed(post.user),
    media,
    likeCount: shouldHideLikes ? -1 : (post.likeCount ?? 0),
    repostCount: post.repostCount ?? 0,
    commentCount: post.commentCount ?? 0,
    bookmarkCount: post._count?.bookmarks ?? 0,
    viewsCount: post.viewsCount ?? 0,
    isLiked: Array.isArray(post.postLikes) && post.postLikes.length > 0,
    isBookmarked: Array.isArray(post.bookmarks) && post.bookmarks.length > 0,
    isEdited: post.isEdited ?? false,
    status: post.status as PostStatus,
    audience: post.audience as PostAudience,
    postType: post.postType as PostType,
    repostOf: post.repostOf ? formatPost(post.repostOf, currentUserId) : undefined,
  };
}

export function formatComment(comment: any, currentUserId?: string): CommentDto {
  return {
    id: comment.id.toString(),
    postId: comment.postId.toString(),
    user: mapUserEmbed(comment.user),
    content: comment.content,
    mediaUrl: comment.mediaUrl ?? null,
    likeCount: comment.likeCount ?? 0,
    replyCount: comment.replyCount ?? 0,
    isLiked: Array.isArray(comment.commentLikes) && comment.commentLikes.length > 0,
    isDeleted: comment.isDeleted ?? false,
    parentCommentId: comment.parentCommentId?.toString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
