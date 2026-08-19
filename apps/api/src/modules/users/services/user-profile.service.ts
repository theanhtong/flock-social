import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { SearchUsersQueryDto, UpdateProfileDto, UserProfileDto } from '../users.dto.js';
import { formatProfile } from '../users.mapper.js';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) { }

  async getMyProfile(userId: string): Promise<UserProfileDto> {
    const userBigInt = BigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userBigInt },
      include: { settings: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const [followersCount, followingCount] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: userBigInt, isPending: false },
      }),
      this.prisma.follow.count({
        where: { followerId: userBigInt, isPending: false },
      }),
    ]);

    return formatProfile({ ...user, followersCount, followingCount });
  }

  async getMyRestrictionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { status: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.status === 'active') return { restricted: false };

    const sanction = await this.prisma.userSanction.findFirst({
      where: { userId: BigInt(userId), status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: { type: true, reason: true, expiresAt: true },
    });

    return {
      restricted: true,
      status: user.status,
      reason: sanction?.reason ?? null,
      expiresAt: sanction?.expiresAt ?? null,
    };
  }

  async getProfileByUsername(username: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      include: { settings: true },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    const [followersCount, followingCount] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: user.id, isPending: false },
      }),
      this.prisma.follow.count({
        where: { followerId: user.id, isPending: false },
      }),
    ]);

    return formatProfile({ ...user, followersCount, followingCount });
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.links !== undefined && { links: dto.links as any }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
      },
    });

    return formatProfile(user);
  }

  async searchUsers(
    queryDto: SearchUsersQueryDto,
    currentUserId?: string,
  ) {
    const limit = Number(queryDto.limit) || 20;
    const cursor = queryDto.cursor;
    const query = queryDto.q?.trim().replace(/^@/, '');

    if (!query) {
      return {
        data: [],
        meta: { limit, nextCursor: null, hasNextPage: false },
      };
    }

    let excludedUserIds: bigint[] = [];
    if (currentUserId) {
      const viewerBigInt = BigInt(currentUserId);
      excludedUserIds.push(viewerBigInt);

      const blocks = await this.prisma.userBlock.findMany({
        where: {
          OR: [{ blockerId: viewerBigInt }, { blockedId: viewerBigInt }],
        },
        select: { blockerId: true, blockedId: true },
      });
      for (const b of blocks) {
        excludedUserIds.push(b.blockerId === viewerBigInt ? b.blockedId : b.blockerId);
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        ...(excludedUserIds.length > 0 && {
          id: { notIn: excludedUserIds },
        }),
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'desc' },
    });

    let nextCursor: string | null = null;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id.toString();
    }

    return {
      data: users.map((u) => formatProfile(u)),
      meta: {
        limit,
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }
}