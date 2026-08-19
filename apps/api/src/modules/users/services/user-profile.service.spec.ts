import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../../common/snowflake/snowflake.service.js';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

const snowflake = new SnowflakeService(new ConfigService());
const USER_ID = snowflake.generateString();

function makeUser(overrides: any = {}) {
  return {
    id: BigInt(USER_ID),
    username: 'testuser',
    displayName: 'Test User',
    bio: 'Software engineer',
    avatarUrl: 'https://example.com/avatar.png',
    bannerUrl: null,
    location: 'Hanoi',
    links: [],
    birthDate: null,
    status: 'active',
    isVerified: false,
    role: 'standard',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: { isPrivate: false },
    ...overrides,
  };
}

function makeMockPrisma() {
  const user = makeUser();
  return {
    user: {
      findUnique: jest.fn<any>().mockResolvedValue(user),
      findFirst: jest.fn<any>().mockResolvedValue(user),
      findMany: jest.fn<any>().mockResolvedValue([user]),
      update: jest.fn<any>().mockResolvedValue(user),
    },
    follow: {
      count: jest.fn<any>().mockResolvedValue(5),
    },
    userSanction: {
      findFirst: jest.fn<any>().mockResolvedValue(null),
    },
    userBlock: {
      findMany: jest.fn<any>().mockResolvedValue([]),
    },
  };
}

async function makeService(mockPrisma = makeMockPrisma()) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UserProfileService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();

  return module.get<UserProfileService>(UserProfileService);
}

describe('UserProfileService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should return user profile with follower counts', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getMyProfile(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(prisma.follow.count).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('followersCount', 5);
      expect(result).toHaveProperty('followingCount', 5);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.getMyProfile(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyRestrictionStatus', () => {
    it('should return restricted: false when status is active', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getMyRestrictionStatus(USER_ID);

      expect(result).toEqual({ restricted: false });
    });

    it('should return restriction details when status is suspended', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn<any>().mockResolvedValue({ status: 'suspended' });
      prisma.userSanction.findFirst = jest.fn<any>().mockResolvedValue({
        type: 'suspend',
        reason: 'Violation of Terms',
        expiresAt: new Date('2026-12-31'),
      });
      const service = await makeService(prisma);

      const result = await service.getMyRestrictionStatus(USER_ID);

      expect(result.restricted).toBe(true);
      expect(result.status).toBe('suspended');
      expect(result.reason).toBe('Violation of Terms');
    });

    it('should throw NotFoundException if user missing', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.getMyRestrictionStatus(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfileByUsername', () => {
    it('should find user profile by username', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getProfileByUsername('testuser');

      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(result.username).toBe('testuser');
    });

    it('should throw NotFoundException if username not found', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findFirst = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.getProfileByUsername('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields and return formatted profile', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.updateProfile(USER_ID, {
        displayName: 'Updated Name',
        bio: 'New Bio',
      });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('searchUsers', () => {
    it('should return empty result if query is empty', async () => {
      const service = await makeService();

      const result = await service.searchUsers({ q: '' }, USER_ID);

      expect(result.data).toEqual([]);
    });

    it('should search users matching query', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.searchUsers({ q: 'test' }, USER_ID);

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });
});
