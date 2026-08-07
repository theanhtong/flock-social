import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable()
export class UserBlockService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlockStatus(
    currentUserId: string,
    username: string,
  ): Promise<{ isBlocked: boolean; isBlockedBy: boolean }> {
    const targetUser = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!targetUser) return { isBlocked: false, isBlockedBy: false };

    const blockerBigInt = BigInt(currentUserId);

    const [block, blockedBy] = await Promise.all([
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: blockerBigInt,
            blockedId: targetUser.id,
          },
        },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUser.id,
            blockedId: blockerBigInt,
          },
        },
      }),
    ]);

    return { isBlocked: Boolean(block), isBlockedBy: Boolean(blockedBy) };
  }

  async toggleBlock(
    blockerId: string,
    username: string,
  ): Promise<{ isBlocked: boolean }> {
    const blockerBigInt = BigInt(blockerId);
    const targetUser = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });

    if (!targetUser) {
      throw new NotFoundException(`User @${username} not found`);
    }

    if (targetUser.id === blockerBigInt) {
      throw new BadRequestException('You cannot block yourself');
    }

    const existingBlock = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: blockerBigInt,
          blockedId: targetUser.id,
        },
      },
    });

    if (existingBlock) {
      await this.prisma.userBlock.delete({
        where: {
          blockerId_blockedId: {
            blockerId: blockerBigInt,
            blockedId: targetUser.id,
          },
        },
      });
      return { isBlocked: false };
    }

    await this.prisma.$transaction(async (tx) => {
      const follow1 = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: blockerBigInt,
            followingId: targetUser.id,
          },
        },
      });

      if (follow1) {
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId: blockerBigInt,
              followingId: targetUser.id,
            },
          },
        });
        await tx.user.update({
          where: { id: blockerBigInt },
          data: { followingCount: { decrement: 1 } },
        });
        await tx.user.update({
          where: { id: targetUser.id },
          data: { followersCount: { decrement: 1 } },
        });
      }

      const follow2 = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUser.id,
            followingId: blockerBigInt,
          },
        },
      });

      if (follow2) {
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId: targetUser.id,
              followingId: blockerBigInt,
            },
          },
        });
        await tx.user.update({
          where: { id: targetUser.id },
          data: { followingCount: { decrement: 1 } },
        });
        await tx.user.update({
          where: { id: blockerBigInt },
          data: { followersCount: { decrement: 1 } },
        });
      }

      await tx.userBlock.create({
        data: {
          blockerId: blockerBigInt,
          blockedId: targetUser.id,
        },
      });
    });

    return { isBlocked: true };
  }

  // verify users due to block each other
  async ensureNotBlocked(
    followerId: bigint,
    targetUserId: bigint,
  ): Promise<void> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: followerId },
        ],
      },
    });

    if (block) {
      throw new BadRequestException(
        'Cannot follow this user due to block status.',
      );
    }
  }
}
