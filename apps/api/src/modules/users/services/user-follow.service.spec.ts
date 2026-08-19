import { jest, describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserFollowService } from './user-follow.service.js';
import { UserBlockService } from './user-block.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../../common/snowflake/snowflake.service.js';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

const snowflake = new SnowflakeService(new ConfigService());
const USER_ID = snowflake.generateString();
const TARGET_ID = snowflake.generateString();

function makeUser(overrides: any = {}) {
  return {
    id: BigInt(TARGET_ID),
    username: 'targetuser',
    displayName: 'Target User',
    avatarUrl: null,
    followersCount: 10,
    followingCount: 5,
    ...overrides,
  };
}

function makeMockPrisma() {
  const user = makeUser();
  return {
    user: {
      findFirst: jest.fn<any>().mockResolvedValue(user),
      findUnique: jest.fn<any>().mockResolvedValue(user),
      update: jest.fn<any>().mockResolvedValue(user),
    },
    userSettings: {
      findUnique: jest.fn<any>().mockResolvedValue({ requireFollowApproval: false, isPrivateProfile: false }),
    },
    follow: {
      findMany: jest.fn<any>().mockResolvedValue([]),
      findUnique: jest.fn<any>().mockResolvedValue(null),
      create: jest.fn<any>().mockResolvedValue(undefined),
      delete: jest.fn<any>().mockResolvedValue(undefined),
      update: jest.fn<any>().mockResolvedValue(undefined),
    },
    notification: {
      updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn<any>().mockImplementation((arg: any) =>
      Array.isArray(arg) ? Promise.resolve(arg) : typeof arg === 'function' ? arg(makeMockPrisma()) : Promise.resolve([]),
    ),
  };
}

const mockUserBlockService = {
  ensureNotBlocked: jest.fn<any>().mockResolvedValue(undefined),
};

const mockNotificationsService = {
  createNotification: jest.fn<any>().mockResolvedValue(null),
};

async function makeService(mockPrisma = makeMockPrisma()) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UserFollowService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: UserBlockService, useValue: mockUserBlockService },
      { provide: NotificationsService, useValue: mockNotificationsService },
    ],
  }).compile();

  return module.get<UserFollowService>(UserFollowService);
}

describe('UserFollowService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('toggleFollow', () => {
    it('should throw NotFoundException if target user missing', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findFirst = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.toggleFollow(USER_ID, 'nobody')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on self-follow', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findFirst = jest.fn<any>().mockResolvedValue({ id: BigInt(USER_ID), username: 'self' });
      const service = await makeService(prisma);

      await expect(service.toggleFollow(USER_ID, 'self')).rejects.toThrow(BadRequestException);
    });

    it('should follow public user directly when not following', async () => {
      const prisma = makeMockPrisma();
      prisma.follow.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      const result = await service.toggleFollow(USER_ID, 'targetuser');

      expect(prisma.follow.create).toHaveBeenCalled();
      expect(result.isFollowing).toBe(true);
      expect(result.isPending).toBe(false);
    });

    it('should unfollow when already following', async () => {
      const prisma = makeMockPrisma();
      prisma.follow.findUnique = jest.fn<any>().mockResolvedValue({ isPending: false });
      const service = await makeService(prisma);

      const result = await service.toggleFollow(USER_ID, 'targetuser');

      expect(prisma.follow.delete).toHaveBeenCalled();
      expect(result.isFollowing).toBe(false);
      expect(result.isPending).toBe(false);
    });
  });

  describe('respondFollowRequest', () => {
    it('should accept pending follow request', async () => {
      const prisma = makeMockPrisma();
      prisma.follow.findUnique = jest.fn<any>().mockResolvedValue({ isPending: true });
      const service = await makeService(prisma);

      const result = await service.respondFollowRequest(TARGET_ID, USER_ID, 'accept');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should reject pending follow request', async () => {
      const prisma = makeMockPrisma();
      prisma.follow.findUnique = jest.fn<any>().mockResolvedValue({ isPending: true });
      const service = await makeService(prisma);

      const result = await service.respondFollowRequest(TARGET_ID, USER_ID, 'reject');

      expect(prisma.follow.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('getFollowStatus', () => {
    it('should return follow status flags', async () => {
      const prisma = makeMockPrisma();
      prisma.follow.findUnique = jest.fn<any>()
        .mockResolvedValueOnce({ isPending: false })
        .mockResolvedValueOnce(null);
      const service = await makeService(prisma);

      const status = await service.getFollowStatus(USER_ID, 'targetuser');

      expect(status).toEqual({
        isFollowing: true,
        isPending: false,
        followsYou: false,
        hasRequestedToFollowYou: false,
      });
    });
  });
});
