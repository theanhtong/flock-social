import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { PostStatus, PostAudience, PostType } from './posts.dto.js';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';

const snowflake = new SnowflakeService(new ConfigService());

jest.mock('./posts.helpers', () => ({
  buildAudienceWhere: jest.fn().mockResolvedValue({ status: 'active' }),
  isPostVisibleToUser: jest.fn().mockResolvedValue(true),
  postInclude: jest.fn().mockReturnValue({}),
}));

jest.mock('./posts.mapper', () => ({
  formatPost: jest.fn().mockImplementation((post: any) => ({
    id: post.id?.toString(),
    content: post.content,
  })),
  formatComment: jest.fn().mockImplementation((c: any) => ({
    id: c.id?.toString(),
    content: c.content,
  })),
}));

const USER_ID = snowflake.generateString();
const POST_ID = snowflake.generateString();

function makePost(overrides: any = {}) {
  return {
    id: BigInt(POST_ID),
    userId: BigInt(USER_ID),
    content: 'Hello world',
    postType: PostType.post,
    status: PostStatus.active,
    audience: PostAudience.everyone,
    targetUserIds: [] as bigint[],
    likeCount: 0,
    repostCount: 0,
    commentCount: 0,
    isEdited: false,
    repostOfId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: BigInt(USER_ID), username: 'user', displayName: 'User', avatarUrl: null, isVerified: false, role: 'standard', followersCount: 0, followingCount: 0, postsCount: 0 },
    media: [],
    postLikes: [],
    bookmarks: [],
    _count: { bookmarks: 0 },
    repostOf: null,
    ...overrides,
  };
}

function makeMockPrisma() {
  const post = makePost();
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ status: 'active' }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    post: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn().mockResolvedValue(post),
      findUniqueOrThrow: jest.fn().mockResolvedValue(post),
      findMany: jest.fn().mockResolvedValue([post]),
      update: jest.fn().mockResolvedValue(undefined),
    },
    postLike: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    bookmark: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    },
    postMedia: {
      deleteMany: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    },
    media: { create: jest.fn().mockResolvedValue({ id: BigInt('1') }) },
    comment: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockImplementation((arg: any) =>
      typeof arg === 'function' ? arg(makeMockPrisma()) : Promise.resolve([undefined, undefined]),
    ),
  };
}

const MOCK_SNOWFLAKE = {
  generate: jest.fn().mockReturnValue(BigInt('999')),
  generateString: jest.fn().mockReturnValue('sf-string'),
};

async function makeService(prisma = makeMockPrisma()): Promise<PostsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PostsService,
      { provide: PrismaService, useValue: prisma },
      { provide: SnowflakeService, useValue: MOCK_SNOWFLAKE },
    ],
  }).compile();

  return module.get<PostsService>(PostsService);
}

describe('PostsService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('should create a post and return formatted result', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn().mockImplementation((fn: any) => fn(prisma));
      const service = await makeService(prisma);

      const result = await service.createPost(USER_ID, { content: 'Hello world' } as any);

      expect(prisma.post.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { postsCount: { increment: 1 } } }),
      );
      expect(result).toHaveProperty('content', 'Hello world');
    });

    it('should throw ForbiddenException for unverified account', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn().mockResolvedValue({ status: 'pending_verification' });
      const service = await makeService(prisma);

      await expect(service.createPost(USER_ID, { content: 'x' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when more than 4 media URLs provided', async () => {
      const service = await makeService();

      await expect(
        service.createPost(USER_ID, { mediaUrls: ['a', 'b', 'c', 'd', 'e'] } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when a media URL is empty string', async () => {
      const service = await makeService();

      await expect(
        service.createPost(USER_ID, { mediaUrls: ['https://cdn.example.com/a.jpg', ''] } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePost', () => {
    it('should update post and return new version', async () => {
      const prisma = makeMockPrisma();
      prisma.$transaction = jest.fn().mockImplementation((fn: any) => fn(prisma));
      prisma.post.findUniqueOrThrow = jest.fn().mockResolvedValue(makePost({ content: 'Updated' }));
      const service = await makeService(prisma);

      const result = await service.updatePost(USER_ID, POST_ID, { content: 'Updated' } as any);

      expect(prisma.post.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when post does not exist', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.updatePost(USER_ID, POST_ID, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when editing another user post', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(makePost({ userId: snowflake.generate() }));
      const service = await makeService(prisma);

      await expect(service.updatePost(USER_ID, POST_ID, {} as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deletePost', () => {
    it('should soft-delete post and decrement postsCount', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.deletePost(USER_ID, POST_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.deletePost(USER_ID, POST_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another user post', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(makePost({ userId: snowflake.generate() }));
      const service = await makeService(prisma);

      await expect(service.deletePost(USER_ID, POST_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPostById', () => {
    it('should return post when visible to viewer', async () => {
      const { isPostVisibleToUser } = (await import('./posts.helpers.js')) as any;
      (isPostVisibleToUser as unknown as jest.Mock).mockResolvedValue(true);
      const service = await makeService();

      const result = await service.getPostById(POST_ID, USER_ID);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when post is soft-deleted', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(makePost({ status: PostStatus.deleted_by_user }));
      const service = await makeService(prisma);

      await expect(service.getPostById(POST_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when post is not visible to viewer', async () => {
      const { isPostVisibleToUser } = (await import('./posts.helpers.js')) as any;
      (isPostVisibleToUser as unknown as jest.Mock).mockResolvedValueOnce(false);
      const service = await makeService();

      await expect(service.getPostById(POST_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when post not found in DB', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.getPostById(POST_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleLike', () => {
    it('should like a post when not yet liked', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn()
        .mockResolvedValueOnce(makePost())
        .mockResolvedValueOnce({ likeCount: 1 });
      prisma.postLike.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      const result = await service.toggleLike(USER_ID, POST_ID);

      expect(result).toEqual({ liked: true, likeCount: 1 });
    });

    it('should unlike a post when already liked', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn()
        .mockResolvedValueOnce(makePost())
        .mockResolvedValueOnce({ likeCount: 0 });
      prisma.postLike.findUnique = jest.fn().mockResolvedValue({ postId: BigInt(POST_ID), userId: BigInt(USER_ID) });
      const service = await makeService(prisma);

      const result = await service.toggleLike(USER_ID, POST_ID);

      expect(result).toEqual({ liked: false, likeCount: 0 });
    });

    it('should throw NotFoundException when post not found', async () => {
      const prisma = makeMockPrisma();
      prisma.post.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.toggleLike(USER_ID, POST_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when post is not visible', async () => {
      const { isPostVisibleToUser } = (await import('./posts.helpers.js')) as any;
      (isPostVisibleToUser as unknown as jest.Mock).mockResolvedValueOnce(false);
      const service = await makeService();

      await expect(service.toggleLike(USER_ID, POST_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleBookmark', () => {
    it('should add bookmark when not yet bookmarked', async () => {
      const prisma = makeMockPrisma();
      prisma.bookmark.count = jest.fn().mockResolvedValue(1);
      const service = await makeService(prisma);

      const result = await service.toggleBookmark(USER_ID, POST_ID);

      expect(prisma.bookmark.create).toHaveBeenCalled();
      expect(result).toEqual({ bookmarked: true, bookmarkCount: 1 });
    });

    it('should remove bookmark when already bookmarked', async () => {
      const prisma = makeMockPrisma();
      prisma.bookmark.findUnique = jest.fn().mockResolvedValue({ userId: BigInt(USER_ID), postId: BigInt(POST_ID) });
      prisma.bookmark.count = jest.fn().mockResolvedValue(0);
      const service = await makeService(prisma);

      const result = await service.toggleBookmark(USER_ID, POST_ID);

      expect(prisma.bookmark.delete).toHaveBeenCalled();
      expect(result).toEqual({ bookmarked: false, bookmarkCount: 0 });
    });
  });

  describe('getUserPosts', () => {
    it('should return posts for an existing username', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: BigInt(USER_ID), username: 'testuser' });
      const service = await makeService(prisma);

      const result = await service.getUserPosts('testuser', USER_ID);

      expect(prisma.post.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException for unknown username', async () => {
      const prisma = makeMockPrisma();
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(service.getUserPosts('nobody', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
