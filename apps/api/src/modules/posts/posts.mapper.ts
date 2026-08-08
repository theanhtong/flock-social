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
  if (!user) {
    return {
      id: '0',
      username: 'unknown',
      displayName: 'Unknown',
      avatarUrl: null,
      isVerified: false,
      role: 'user',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    };
  }
  return {
    id: user.id ? user.id.toString() : '0',
    username: user.username || 'user',
    displayName: user.displayName || user.username || 'User',
    avatarUrl: user.avatarUrl ?? null,
    isVerified: !!user.isVerified,
    role: user.role || 'user',
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    postsCount: user.postsCount ?? 0,
  };
}

export function formatPost(post: any, currentUserId?: string): PostDto {
  if (!post) return {} as any;

  const media: PostMediaDto[] = post.media?.map((m: any) => ({
    id: m.media?.id ? m.media.id.toString() : String(m.id || '0'),
    url: m.media?.originalUrl || m.url || '',
    mediaType: (m.media?.mediaType || m.mediaType || MediaType.image) as MediaType,
    thumbnailUrl: m.media?.thumbnailUrl ?? m.thumbnailUrl ?? null,
    width: m.media?.width ?? m.width ?? null,
    height: m.media?.height ?? m.height ?? null,
    durationSeconds: m.media?.durationSeconds ?? m.durationSeconds ?? null,
  })) ?? [];

  const isAuthor = currentUserId && post.user?.id?.toString() === currentUserId;
  const shouldHideLikes = post.user?.settings?.hideLikeCounts && !isAuthor;

  const createdAtStr =
    post.createdAt instanceof Date
      ? post.createdAt.toISOString()
      : typeof post.createdAt === 'string'
      ? post.createdAt
      : new Date().toISOString();

  const updatedAtStr =
    post.updatedAt instanceof Date
      ? post.updatedAt.toISOString()
      : typeof post.updatedAt === 'string'
      ? post.updatedAt
      : new Date().toISOString();

  return {
    id: post.id ? post.id.toString() : '0',
    content: post.content ?? '',
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
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
  if (!comment) return {} as any;

  const createdAtStr =
    comment.createdAt instanceof Date
      ? comment.createdAt.toISOString()
      : typeof comment.createdAt === 'string'
      ? comment.createdAt
      : new Date().toISOString();

  const updatedAtStr =
    comment.updatedAt instanceof Date
      ? comment.updatedAt.toISOString()
      : typeof comment.updatedAt === 'string'
      ? comment.updatedAt
      : new Date().toISOString();

  return {
    id: comment.id ? comment.id.toString() : '0',
    postId: comment.postId ? comment.postId.toString() : '0',
    user: mapUserEmbed(comment.user),
    content: comment.content ?? '',
    mediaUrl: comment.mediaUrl ?? null,
    likeCount: comment.likeCount ?? 0,
    replyCount: comment.replyCount ?? 0,
    isLiked: Array.isArray(comment.commentLikes) && comment.commentLikes.length > 0,
    isDeleted: comment.isDeleted ?? false,
    parentCommentId: comment.parentCommentId?.toString() ?? null,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}
