import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CursorQueryDto, ToggleFollowResult } from '../users.dto.js';
import { UserBlockService } from './user-block.service.js';
import { formatProfile } from '../users.mapper.js';

import { NotificationsService } from '../../notifications/notifications.service.js';
import { NotificationType } from '../../../generated/prisma/client.js';

@Injectable()
export class UserFollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userBlockService: UserBlockService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPendingFollowRequests(userId: string, queryDto?: CursorQueryDto) {
    const userBigInt = BigInt(userId);
    const limit = Number(queryDto?.limit) || 20;
    const cursor = queryDto?.cursor;

    const follows = await this.prisma.follow.findMany({
      where: {
        followingId: userBigInt,
        isPending: true,
      },
      include: { follower: true },
      take: limit + 1,
      cursor: cursor
        ? {
            followerId_followingId: {
              followerId: BigInt(cursor),
              followingId: userBigInt,
            },
          }
        : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      const nextItem = follows.pop();
      nextCursor = nextItem!.follower.id.toString();
    }

    const items = follows.map((f) => ({
      id: f.follower.id.toString(),
      username: f.follower.username,
      displayName: f.follower.displayName,
      avatarUrl: f.follower.avatarUrl ?? null,
      createdAt: f.createdAt.toISOString(),
    }));

    return {
      data: items,
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async getFollowStatus(
    currentUserId: string,
    username: string,
  ): Promise<{
    isFollowing: boolean;
    isPending: boolean;
    followsYou: boolean;
    hasRequestedToFollowYou: boolean;
  }> {
    const targetUser = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!targetUser)
      return {
        isFollowing: false,
        isPending: false,
        followsYou: false,
        hasRequestedToFollowYou: false,
      };

    const currentBigInt = BigInt(currentUserId);

    const [follow, followsYouRecord] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentBigInt,
            followingId: targetUser.id,
          },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUser.id,
            followingId: currentBigInt,
          },
        },
      }),
    ]);

    const isFollowing = follow ? !follow.isPending : false;
    const isPending = follow ? follow.isPending : false;
    const followsYou = followsYouRecord ? !followsYouRecord.isPending : false;
    const hasRequestedToFollowYou = followsYouRecord
      ? followsYouRecord.isPending
      : false;

    return { isFollowing, isPending, followsYou, hasRequestedToFollowYou };
  }

  async getUserFollowers(username: string, queryDto?: CursorQueryDto) {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    const limit = Number(queryDto?.limit) || 20;
    const cursor = queryDto?.cursor;

    const follows = await this.prisma.follow.findMany({
      where: { followingId: user.id, isPending: false },
      include: { follower: true },
      take: limit + 1,
      cursor: cursor
        ? {
            followerId_followingId: {
              followerId: BigInt(cursor),
              followingId: user.id,
            },
          }
        : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      const nextItem = follows.pop();
      nextCursor = nextItem!.follower.id.toString();
    }

    return {
      data: follows.map((f) => formatProfile(f.follower)),
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async getUserFollowing(username: string, queryDto?: CursorQueryDto) {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    const limit = Number(queryDto?.limit) || 20;
    const cursor = queryDto?.cursor;

    const follows = await this.prisma.follow.findMany({
      where: { followerId: user.id, isPending: false },
      include: { following: true },
      take: limit + 1,
      cursor: cursor
        ? {
            followerId_followingId: {
              followerId: user.id,
              followingId: BigInt(cursor),
            },
          }
        : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (follows.length > limit) {
      const nextItem = follows.pop();
      nextCursor = nextItem!.following.id.toString();
    }

    return {
      data: follows.map((f) => formatProfile(f.following)),
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async respondFollowRequest(
    userId: string,
    requesterId: string,
    action: 'accept' | 'reject',
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(userId);
    const requesterBigInt = BigInt(requesterId);

    await this.prisma.notification.updateMany({
      where: {
        receiverId: userBigInt,
        actorId: requesterBigInt,
        type: 'follow_request',
      },
      data: { isDeleted: true },
    });

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterBigInt,
          followingId: userBigInt,
        },
      },
    });

    if (!follow || !follow.isPending) {
      return { success: true };
    }

    if (action === 'accept') {
      await this.prisma.$transaction([
        this.prisma.follow.update({
          where: {
            followerId_followingId: {
              followerId: requesterBigInt,
              followingId: userBigInt,
            },
          },
          data: { isPending: false },
        }),
        this.prisma.user.update({
          where: { id: userBigInt },
          data: { followersCount: { increment: 1 } },
        }),
        this.prisma.user.update({
          where: { id: requesterBigInt },
          data: { followingCount: { increment: 1 } },
        }),
      ]);
    } else {
      await this.prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: requesterBigInt,
            followingId: userBigInt,
          },
        },
      });
    }

    return { success: true };
  }

  async removeFollower(
    userId: string,
    followerUsername: string,
  ): Promise<{ success: boolean; followersCount: number }> {
    const userBigInt = BigInt(userId);
    const followerUser = await this.prisma.user.findFirst({
      where: { username: { equals: followerUsername, mode: 'insensitive' } },
    });

    if (!followerUser) {
      throw new NotFoundException(`User @${followerUsername} not found`);
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerUser.id,
          followingId: userBigInt,
        },
      },
    });

    if (follow) {
      await this.prisma.$transaction([
        this.prisma.follow.delete({
          where: {
            followerId_followingId: {
              followerId: followerUser.id,
              followingId: userBigInt,
            },
          },
        }),
        this.prisma.user.update({
          where: { id: userBigInt },
          data: { followersCount: { decrement: 1 } },
        }),
        this.prisma.user.update({
          where: { id: followerUser.id },
          data: { followingCount: { decrement: 1 } },
        }),
      ]);
    }

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userBigInt },
      select: { followersCount: true },
    });

    return {
      success: true,
      followersCount: Math.max(0, updatedUser?.followersCount || 0),
    };
  }

  async toggleFollow(
    followerId: string,
    username: string,
  ): Promise<ToggleFollowResult> {
    const followerBigInt = BigInt(followerId);

    const targetUser = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!targetUser) {
      throw new NotFoundException(`User @${username} not found`);
    }

    if (targetUser.id === followerBigInt) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: targetUser.id },
      select: { requireFollowApproval: true, isPrivateProfile: true },
    });

    await this.userBlockService.ensureNotBlocked(followerBigInt, targetUser.id);

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerBigInt,
          followingId: targetUser.id,
        },
      },
    });

    if (follow) {
      return this.unfollow(followerBigInt, targetUser.id, follow.isPending);
    }

    const requireApproval = Boolean(settings?.requireFollowApproval || settings?.isPrivateProfile);

    return this.follow(
      followerBigInt,
      targetUser.id,
      requireApproval,
    );
  }

  private async follow(
    followerId: bigint,
    targetUserId: bigint,
    requireApproval: boolean,
  ): Promise<ToggleFollowResult> {
    if (requireApproval) {
      await this.prisma.follow.create({
        data: { followerId, followingId: targetUserId, isPending: true },
      });

      try {
        await this.notificationsService.createNotification({
          receiverId: targetUserId.toString(),
          actorId: followerId.toString(),
          type: NotificationType.follow_request,
        });
      } catch (err) {}

      return { isFollowing: false, isPending: true, followersCount: 0 };
    }

    await this.prisma.$transaction([
      this.prisma.follow.create({
        data: { followerId, followingId: targetUserId, isPending: false },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { followersCount: { increment: 1 } },
      }),
    ]);

    try {
      await this.notificationsService.createNotification({
        receiverId: targetUserId.toString(),
        actorId: followerId.toString(),
        type: NotificationType.follow,
      });
    } catch (err) {}

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { followersCount: true },
    });

    return {
      isFollowing: true,
      isPending: false,
      followersCount: targetUser?.followersCount ?? 1,
    };
  }

  private async unfollow(
    followerId: bigint,
    targetUserId: bigint,
    isPending: boolean,
  ): Promise<ToggleFollowResult> {
    if (!isPending) {
      await this.prisma.$transaction([
        this.prisma.follow.delete({
          where: {
            followerId_followingId: { followerId, followingId: targetUserId },
          },
        }),
        this.prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        }),
        this.prisma.user.update({
          where: { id: targetUserId },
          data: { followersCount: { decrement: 1 } },
        }),
      ]);
    } else {
      await this.prisma.follow.delete({
        where: {
          followerId_followingId: { followerId, followingId: targetUserId },
        },
      });
    }

    await this.prisma.notification.updateMany({
      where: {
        receiverId: targetUserId,
        actorId: followerId,
        type: { in: ['follow', 'follow_request'] },
      },
      data: { isDeleted: true },
    });

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { followersCount: true },
    });

    return {
      isFollowing: false,
      isPending: false,
      followersCount: Math.max(0, targetUser?.followersCount ?? 0),
    };
  }
}