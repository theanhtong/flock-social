import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PostStatus, PostAudience } from './posts.dto.js';

export type PostAudienceInput = {
  status: string;
  audience: string;
  userId: bigint;
  targetUserIds: bigint[];
};

export async function fetchFollowingIds(
  prisma: PrismaService,
  followerId: bigint,
): Promise<bigint[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId, isPending: false },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

export async function isPostVisibleToUser(
  prisma: PrismaService,
  post: PostAudienceInput,
  currentUserId?: string,
): Promise<boolean> {
  if (post.status === PostStatus.deleted_by_user) return false;

  const viewerId = currentUserId ? BigInt(currentUserId) : undefined;

  if (viewerId && viewerId === post.userId) return true;

  if (post.status === PostStatus.hidden) return false;

  switch (post.audience as PostAudience) {
    case PostAudience.everyone:
      return true;

    case PostAudience.followers: {
      if (!viewerId) return false;
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: post.userId,
          },
        },
        select: { isPending: true },
      });
      return follow !== null && !follow.isPending;
    }

    case PostAudience.close_friends:
      return viewerId
        ? post.targetUserIds.some((id) => id === viewerId)
        : false;

    case PostAudience.restricted:
      return viewerId
        ? !post.targetUserIds.some((id) => id === viewerId)
        : true;

    default:
      return false;
  }
}

function buildStatusFilter(context: 'feed' | 'profile') {
  return context === 'feed'
    ? { status: PostStatus.active }
    : { status: { not: PostStatus.deleted_by_user } };
}

function buildAudienceConditions(
  viewerId: bigint | undefined,
  followingIds: bigint[],
) {
  const conditions: any[] = [{ audience: PostAudience.everyone }];

  if (!viewerId) return conditions;

  conditions.push({ userId: viewerId });

  if (followingIds.length > 0) {
    conditions.push({
      audience: PostAudience.followers,
      userId: { in: followingIds },
    });
  }

  conditions.push({
    audience: PostAudience.close_friends,
    targetUserIds: { has: viewerId },
  });

  return conditions;
}

export async function buildAudienceWhere(
  prisma: PrismaService,
  currentUserId: string | undefined,
  context: 'feed' | 'profile' = 'feed',
) {
  const viewerId = currentUserId ? BigInt(currentUserId) : undefined;
  const followingIds = viewerId
    ? await fetchFollowingIds(prisma, viewerId)
    : [];

  return {
    ...buildStatusFilter(context),
    NOT: viewerId
      ? {
          AND: [
            { audience: PostAudience.restricted },
            { targetUserIds: { has: viewerId } },
          ],
        }
      : undefined,
    OR: buildAudienceConditions(viewerId, followingIds),
  };
}

export function postInclude(viewerId?: bigint) {
  return {
    user: { include: { settings: true } },
    media: {
      include: { media: true },
      orderBy: { displayOrder: 'asc' as const },
    },
    postLikes: viewerId ? { where: { userId: viewerId } } : false,
    bookmarks: viewerId ? { where: { userId: viewerId } } : false,
    repostOf: {
      include: {
        user: { include: { settings: true } },
        media: {
          include: { media: true },
          orderBy: { displayOrder: 'asc' as const },
        },
      },
    },
    _count: { select: { bookmarks: true } },
  } as const;
}
