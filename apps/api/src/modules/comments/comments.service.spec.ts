import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

const snowflake = new SnowflakeService(new ConfigService());
const USER_ID = snowflake.generateString();
const POST_ID = snowflake.generateString();
const COMMENT_ID = snowflake.generateString();

function makeComment(overrides: any = {}) {
  return {
    id: BigInt(COMMENT_ID),
    postId: BigInt(POST_ID),
    userId: BigInt(USER_ID),
    content: 'Test comment content',
    mediaUrl: null,
    likeCount: 0,
    replyCount: 0,
    isDeleted: false,
    parentCommentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: BigInt(USER_ID),
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      isVerified: false,
      role: 'standard',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    },
    ...overrides,
  };
}

function makeMockPrisma() {
  const comment = makeComment();
  return {
    post: {
      findFirst: jest.fn<any>().mockResolvedValue({ id: BigInt(POST_ID), userId: BigInt(USER_ID) }),
      update: jest.fn<any>().mockResolvedValue(undefined),
    },
    userSettings: {
      findUnique: jest.fn<any>().mockResolvedValue(null),
    },
    follow: {
      findUnique: jest.fn<any>().mockResolvedValue(null),
    },
    comment: {
      create: jest.fn<any>().mockResolvedValue(comment),
      findFirst: jest.fn<any>().mockResolvedValue(comment),
      findUnique: jest.fn<any>().mockResolvedValue(comment),
      findMany: jest.fn<any>().mockResolvedValue([comment]),
      update: jest.fn<any>().mockResolvedValue(comment),
    },
    commentLike: {
      findUnique: jest.fn<any>().mockResolvedValue(null),
      findMany: jest.fn<any>().mockResolvedValue([]),
      create: jest.fn<any>().mockResolvedValue(undefined),
      delete: jest.fn<any>().mockResolvedValue(undefined),
      count: jest.fn<any>().mockResolvedValue(0),
    },
    $transaction: jest.fn<any>().mockImplementation((arg: any) =>
      typeof arg === 'function' ? arg(makeMockPrisma()) : Promise.resolve([undefined, undefined]),
    ),
  };
}

async function makeService(mockPrisma = makeMockPrisma()) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CommentsService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: SnowflakeService, useValue: snowflake },
    ],
  }).compile();

  return module.get<CommentsService>(CommentsService);
}

describe('CommentsService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create root comment successfully', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn<any>().mockImplementation((fn: any) => fn(prisma));
      const service = await makeService(prisma);

      const result = await service.createComment(POST_ID, USER_ID, { content: 'New Comment' });

      expect(prisma.post.findFirst).toHaveBeenCalled();
      expect(prisma.comment.create).toHaveBeenCalled();
      expect(result).toHaveProperty('content', 'Test comment content');
    });

    it('should throw NotFoundException if post does not exist', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findFirst = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.createComment(POST_ID, USER_ID, { content: 'New Comment' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if author set whoCanReplyPosts to nobody', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findFirst = jest.fn<any>().mockResolvedValue({ id: BigInt(POST_ID), userId: BigInt('9999999') });
      prisma.userSettings.findUnique = jest.fn<any>().mockResolvedValue({ whoCanReplyPosts: 'nobody' });
      const service = await makeService(prisma);

      await expect(
        service.createComment(POST_ID, USER_ID, { content: 'New Comment' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if whoCanReplyPosts is followers and actor is not follower', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findFirst = jest.fn<any>().mockResolvedValue({ id: BigInt(POST_ID), userId: BigInt('9999999') });
      prisma.userSettings.findUnique = jest.fn<any>().mockResolvedValue({ whoCanReplyPosts: 'followers' });
      prisma.follow.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.createComment(POST_ID, USER_ID, { content: 'New Comment' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create reply comment when parentCommentId is provided', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn<any>().mockImplementation((fn: any) => fn(prisma));
      const parentComment = makeComment({ id: BigInt('888888') });
      prisma.comment.findFirst = jest.fn<any>().mockResolvedValue(parentComment);
      const service = await makeService(prisma);

      const result = await service.createComment(POST_ID, USER_ID, {
        content: 'Reply comment',
        parentCommentId: '888888',
      });

      expect(result).toBeDefined();
      expect(prisma.comment.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if parent comment is missing', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findFirst = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.createComment(POST_ID, USER_ID, {
          content: 'Reply comment',
          parentCommentId: '888888',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateComment', () => {
    it('should update comment if user is author', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.updateComment(COMMENT_ID, USER_ID, { content: 'Updated content' });

      expect(prisma.comment.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if comment missing or soft deleted', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.updateComment(COMMENT_ID, USER_ID, { content: 'Updated content' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findUnique = jest.fn<any>().mockResolvedValue(makeComment({ userId: BigInt('9999999') }));
      const service = await makeService(prisma);

      await expect(
        service.updateComment(COMMENT_ID, USER_ID, { content: 'Updated content' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCommentsByPost', () => {
    it('should return comments feed for a post', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getCommentsByPost(POST_ID, USER_ID, { limit: 10 });

      expect(prisma.comment.findMany).toHaveBeenCalled();
      expect(result.comments).toHaveLength(1);
    });
  });

  describe('getRepliesByComment', () => {
    it('should return replies feed for a parent comment', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getRepliesByComment(COMMENT_ID, USER_ID, { limit: 10 });

      expect(prisma.comment.findMany).toHaveBeenCalled();
      expect(result.comments).toHaveLength(1);
    });
  });

  describe('toggleLike', () => {
    it('should like comment when not yet liked', async () => {
      const prisma = makeMockPrisma();
      prisma.commentLike.findUnique = jest.fn<any>().mockResolvedValue(null);
      prisma.commentLike.count = jest.fn<any>().mockResolvedValue(1);
      const service = await makeService(prisma);

      const result = await service.toggleLike(COMMENT_ID, USER_ID);

      expect(prisma.commentLike.create).toHaveBeenCalled();
      expect(result).toEqual({ isLiked: true, likeCount: 1 });
    });

    it('should unlike comment when already liked', async () => {
      const prisma = makeMockPrisma();
      prisma.commentLike.findUnique = jest.fn<any>().mockResolvedValue({ commentId: BigInt(COMMENT_ID), userId: BigInt(USER_ID) });
      prisma.commentLike.count = jest.fn<any>().mockResolvedValue(0);
      const service = await makeService(prisma);

      const result = await service.toggleLike(COMMENT_ID, USER_ID);

      expect(prisma.commentLike.delete).toHaveBeenCalled();
      expect(result).toEqual({ isLiked: false, likeCount: 0 });
    });

    it('should throw NotFoundException if comment missing', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findFirst = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.toggleLike(COMMENT_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteComment', () => {
    it('should soft delete comment and decrement counts', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn<any>().mockImplementation((fn: any) => fn(prisma));
      const service = await makeService(prisma);

      await service.deleteComment(COMMENT_ID, USER_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if comment missing', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findUnique = jest.fn<any>().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.deleteComment(COMMENT_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not author', async () => {
      const prisma = makeMockPrisma();
      prisma.comment.findUnique = jest.fn<any>().mockResolvedValue(makeComment({ userId: BigInt('9999999') }));
      const service = await makeService(prisma);

      await expect(service.deleteComment(COMMENT_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
