import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { SearchUsersQueryDto, UpdateProfileDto, UserProfileDto } from '../users.dto.js';
import { formatProfile } from '../users.mapper.js';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<UserProfileDto> {
    const userBigInt = BigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userBigInt },
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

  async getProfileByUsername(username: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
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

    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        id: currentUserId ? { not: BigInt(currentUserId) } : undefined,
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