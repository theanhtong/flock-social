import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import {
  PostStatus,
  PostAudience,
  PostType,
  MediaType,
  CreatePostDto,
  UpdatePostDto,
  PostDto,
  CommentDto,
} from './posts.dto.js';
import {
  buildAudienceWhere,
  isPostVisibleToUser,
  postInclude,
} from './posts.helpers.js';
import { formatPost, formatComment } from './posts.mapper.js';
import { PostsGateway } from './posts.gateway.js';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly redisService: RedisService,
    private readonly postsGateway: PostsGateway,
  ) { }

  async createPost(userId: string, dto: CreatePostDto): Promise<PostDto> {
    const authorId = BigInt(userId);

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { status: true },
    });
    if (author?.status === 'pending_verification') {
      throw new ForbiddenException(
        'Account email is not verified. Please verify your email before posting.',
      );
    }

    const postId = this.snowflake.generate();

    // if reposting, find the root post safely
    let repostOfId: bigint | null = null;
    if (
      dto.repostOfId &&
      typeof dto.repostOfId === 'string' &&
      dto.repostOfId.trim().length > 0 &&
      dto.repostOfId !== 'undefined' &&
      dto.repostOfId !== 'null'
    ) {
      try {
        repostOfId = BigInt(dto.repostOfId);
      } catch (err) {
        repostOfId = null;
      }
    }

    if (repostOfId) {
      const target = await this.prisma.post.findUnique({
        where: { id: repostOfId },
        select: { id: true },
      });
      if (!target) {
        repostOfId = null;
      }
    }

    const postType: PostType =
      repostOfId ? PostType.repost : PostType.post;

    if (dto.mediaUrls?.length) {
      if (dto.mediaUrls.length > 4) {
        throw new ForbiddenException('A post can have at most 4 media items');
      }
      for (const url of dto.mediaUrls) {
        if (!url?.trim()) {
          throw new ForbiddenException('Media URL must not be empty');
        }
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.post.create({
        data: {
          id: postId,
          userId: authorId,
          content: dto.content ?? '',
          postType,
          repostOfId,
          status: dto.status ?? PostStatus.active,
          audience: dto.audience ?? PostAudience.everyone,
          targetUserIds: dto.targetUserIds?.map(BigInt) ?? [],
        },
      });

      if (dto.mediaUrls?.length) {
        for (let i = 0; i < dto.mediaUrls.length; i++) {
          const mediaUrl = dto.mediaUrls[i];
          let existingMedia = await tx.media.findFirst({
            where: { originalUrl: mediaUrl },
          });

          if (!existingMedia) {
            const isVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(mediaUrl);
            existingMedia = await tx.media.create({
              data: {
                id: this.snowflake.generate(),
                uploaderId: authorId,
                mediaType: isVideo ? MediaType.video : MediaType.image,
                originalUrl: mediaUrl,
              },
            });
          }

          await tx.postMedia.create({
            data: { postId, mediaId: existingMedia.id, displayOrder: i },
          });
        }
      }

      await tx.user.update({
        where: { id: authorId },
        data: { postsCount: { increment: 1 } },
      });

      if (repostOfId) {
        const count = await tx.post.count({
          where: { repostOfId, status: PostStatus.active },
        });
        await tx.post.update({
          where: { id: repostOfId },
          data: { repostCount: count },
        });
      }

      return tx.post.findUniqueOrThrow({
        where: { id: postId },
        include: postInclude(authorId),
      });
    });

    const formatted = formatPost(created, userId);
    try {
      this.postsGateway.broadcastNewPost(formatted);
    } catch (err) {
      // Ignore ws broadcast errors
    }
    return formatted;
  }

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostDto> {
    const authorId = BigInt(userId);
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({ where: { id: targetPostId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== authorId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: targetPostId },
        data: {
          content: dto.content ?? post.content,
          status: dto.status ?? post.status,
          audience: dto.audience ?? post.audience,
          targetUserIds: dto.targetUserIds?.map(BigInt) ?? post.targetUserIds,
          isEdited: true,
        },
      });

      if (dto.mediaUrls !== undefined) {
        await tx.postMedia.deleteMany({ where: { postId: targetPostId } });
        for (let i = 0; i < dto.mediaUrls.length; i++) {
          const isVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(dto.mediaUrls[i]);
          const media = await tx.media.create({
            data: {
              id: this.snowflake.generate(),
              uploaderId: authorId,
              mediaType: isVideo ? MediaType.video : MediaType.image,
              originalUrl: dto.mediaUrls[i],
            },
          });
          await tx.postMedia.create({
            data: { postId: targetPostId, mediaId: media.id, displayOrder: i },
          });
        }
      }
    });

    const updated = await this.prisma.post.findUniqueOrThrow({
      where: { id: targetPostId },
      include: postInclude(authorId),
    });
    return formatPost(updated, userId);
  }

  async deletePost(userId: string, postId: string): Promise<{ success: boolean }> {
    const authorId = BigInt(userId);
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({ where: { id: targetPostId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: targetPostId },
        data: { status: PostStatus.deleted_by_user },
      }),
      this.prisma.user.update({
        where: { id: authorId },
        data: { postsCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  async getHomeFeed(
    userId?: string,
    cursor?: string,
    limit = 10,
    search?: string,
  ): Promise<{ posts: PostDto[]; nextCursor?: string }> {
    const viewerId = userId ? BigInt(userId) : undefined;
    const baseWhere = await buildAudienceWhere(this.prisma, userId, 'feed');

    let viewedPostIds: bigint[] = [];

    // Filter out posts that user has already seen (stored in Redis) on initial load
    if (userId && !cursor && !search) {
      const seenStrList = await this.redisService.smembers(`user:seen:${userId}`);
      if (seenStrList && seenStrList.length > 0) {
        viewedPostIds = seenStrList.map((idStr) => BigInt(idStr));
      }
    }

    let whereCondition: any = baseWhere;
    if (viewedPostIds.length > 0) {
      whereCondition = {
        AND: [
          baseWhere,
          { id: { notIn: viewedPostIds } },
        ],
      };
    }

    if (search && search.trim()) {
      const searchClean = search.trim();
      whereCondition = {
        AND: [
          baseWhere,
          {
            content: {
              contains: searchClean,
              mode: 'insensitive' as const,
            },
          },
        ],
      };
    }

    let rows = await this.prisma.post.findMany({
      where: whereCondition,
      orderBy: { id: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      include: postInclude(viewerId),
    });

    // Fallback: If all available posts have been seen, reset Redis seen cache & return fresh feed
    if (rows.length === 0 && viewedPostIds.length > 0 && !search) {
      const redisKey = `user:seen:${userId}`;
      await this.redisService.del(redisKey).catch(() => {});

      rows = await this.prisma.post.findMany({
        where: baseWhere,
        orderBy: { id: 'desc' },
        take: limit + 1,
        cursor: cursor ? { id: BigInt(cursor) } : undefined,
        skip: cursor ? 1 : 0,
        include: postInclude(viewerId),
      });
    }

    let nextCursor: string | undefined = undefined;
    const pageRows = [...rows];
    if (pageRows.length > limit) {
      pageRows.pop();
      nextCursor = pageRows[pageRows.length - 1].id.toString();
    }

    if (userId && pageRows.length > 0 && !search) {
      const redisKey = `user:seen:${userId}`;
      const postIdsStr = pageRows.map((p) => p.id.toString());
      await this.redisService.sadd(redisKey, ...postIdsStr).catch(() => {});
      await this.redisService.expire(redisKey, 7 * 24 * 60 * 60).catch(() => {});
    }

    return { posts: pageRows.map((p) => formatPost(p, userId)), nextCursor };
  }

  async searchPosts(
    query?: string,
    cursor?: string,
    limit = 20,
    userId?: string,
  ): Promise<{ posts: PostDto[]; nextCursor?: string }> {
    const q = query?.trim();
    if (!q) {
      return { posts: [] };
    }

    const maxLimit = Math.min(limit, 50);
    const viewerId = userId ? BigInt(userId) : undefined;
    const baseWhere = await buildAudienceWhere(this.prisma, userId, 'feed');

    const cleanQ = q.replace(/^#/, '').trim();
    if (!cleanQ) {
      return { posts: [] };
    }

    const searchWhere = {
      AND: [
        baseWhere,
        {
          content: {
            contains: cleanQ,
            mode: 'insensitive' as const,
          },
        },
      ],
    };

    const rows = await this.prisma.post.findMany({
      where: searchWhere,
      orderBy: { id: 'desc' },
      take: maxLimit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      include: postInclude(viewerId),
    });

    let nextCursor: string | undefined = undefined;
    const pageRows = [...rows];
    if (pageRows.length > maxLimit) {
      pageRows.pop();
      nextCursor = pageRows[pageRows.length - 1].id.toString();
    }

    return {
      posts: pageRows.map((p) => formatPost(p, userId)),
      nextCursor,
    };
  }

  async getTrendingHashtags(limit = 10): Promise<{ tag: string; postsCount: number }[]> {
    const maxLimit = Math.min(limit || 10, 50);
    const activePosts = await this.prisma.post.findMany({
      where: { status: PostStatus.active },
      select: { content: true },
      orderBy: { id: 'desc' },
      take: 300,
    });

    const tagCounts: Record<string, number> = {};
    for (const post of activePosts) {
      if (!post.content) continue;
      const matches = post.content.match(/#[a-zA-Z0-9_]+/g);
      if (matches) {
        for (const match of matches) {
          const tag = match.replace('#', '').toLowerCase();
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      }
    }

    return Object.entries(tagCounts)
      .map(([tag, postsCount]) => ({ tag, postsCount }))
      .sort((a, b) => b.postsCount - a.postsCount)
      .slice(0, maxLimit);
  }

  async searchHashtags(query: string, limit = 10): Promise<{ tag: string; postsCount: number }[]> {
    const q = query?.replace(/^#/, '').toLowerCase().trim();
    if (!q) return [];

    const trending = await this.getTrendingHashtags(50);
    return trending.filter((t) => t.tag.includes(q)).slice(0, limit);
  }

  async getPosts(
    userId?: string,
    cursor?: string,
    limit = 20,
    search?: string,
  ): Promise<{ posts: PostDto[]; nextCursor?: string }> {
    return this.getHomeFeed(userId, cursor, limit, search);
  }

  async getUserPosts(
    username: string,
    currentUserId?: string,
    tab: "posts" | "replies" | "likes" = "posts",
  ): Promise<PostDto[]> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException(`User @${username} not found`);

    const viewerId = currentUserId ? BigInt(currentUserId) : undefined;
    const where = await buildAudienceWhere(this.prisma, currentUserId, 'profile');

    if (tab === 'likes') {
      const userLikes = await this.prisma.postLike.findMany({
        where: { userId: user.id },
        select: { postId: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const likedPostIds = userLikes.map((l) => l.postId);
      if (likedPostIds.length === 0) return [];

      const rows = await this.prisma.post.findMany({
        where: { id: { in: likedPostIds }, ...where },
        orderBy: { id: 'desc' },
        include: postInclude(viewerId),
      });

      return rows.map((p) => formatPost(p, currentUserId));
    }

    if (tab === 'replies') {
      const userComments = await this.prisma.comment.findMany({
        where: { userId: user.id },
        select: { postId: true },
        distinct: ['postId'],
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const commentedPostIds = userComments.map((c) => c.postId);
      if (commentedPostIds.length === 0) return [];

      const rows = await this.prisma.post.findMany({
        where: { id: { in: commentedPostIds }, ...where },
        orderBy: { id: 'desc' },
        include: postInclude(viewerId),
      });

      return rows.map((p) => formatPost(p, currentUserId));
    }

    const rows = await this.prisma.post.findMany({
      where: { userId: user.id, ...where },
      orderBy: { id: 'desc' },
      include: postInclude(viewerId),
    });

    return rows.map((p) => formatPost(p, currentUserId));
  }

  async incrementViews(postId: string, userId?: string): Promise<{ viewsCount: number }> {
    try {
      const id = BigInt(postId);

      if (userId) {
        const redisKey = `user:seen:${userId}`;
        await this.redisService.sadd(redisKey, postId).catch(() => {});
        await this.redisService.expire(redisKey, 7 * 24 * 60 * 60).catch(() => {});
      }

      const updated = await this.prisma.post.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
        select: { viewsCount: true },
      });
      return { viewsCount: updated.viewsCount };
    } catch (err) {
      return { viewsCount: 0 };
    }
  }

  async getPostById(postId: string, currentUserId?: string): Promise<PostDto> {
    const viewerId = currentUserId ? BigInt(currentUserId) : undefined;
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id: targetPostId },
      include: postInclude(viewerId),
    });

    if (!post || post.status === PostStatus.deleted_by_user) {
      throw new NotFoundException('Post not found or has been deleted');
    }

    const visible = await isPostVisibleToUser(this.prisma, post, currentUserId);
    if (!visible) throw new NotFoundException('Post not found or is private');

    return formatPost(post, currentUserId);
  }

  async getPostComments(postId: string, currentUserId?: string): Promise<CommentDto[]> {
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id: targetPostId },
      select: { status: true, audience: true, userId: true, targetUserIds: true },
    });
    if (!post) return [];

    const visible = await isPostVisibleToUser(this.prisma, post, currentUserId);
    if (!visible) return [];

    const viewerId = currentUserId ? BigInt(currentUserId) : undefined;

    const comments = await this.prisma.comment.findMany({
      where: { postId: targetPostId, isDeleted: false, parentCommentId: null },
      orderBy: { id: 'asc' },
      include: {
        user: true,
        commentLikes: viewerId ? { where: { userId: viewerId } } : false,
      },
    });

    return comments.map((c) => formatComment(c, currentUserId));
  }

  async toggleLike(
    userId: string,
    postId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const actorId = BigInt(userId);
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id: targetPostId },
      select: { status: true, audience: true, userId: true, targetUserIds: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const visible = await isPostVisibleToUser(this.prisma, post, userId);
    if (!visible) throw new ForbiddenException('This post is private');

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId: targetPostId, userId: actorId } },
    });

    if (existing) {
      await this.prisma.postLike.delete({
        where: { postId_userId: { postId: targetPostId, userId: actorId } },
      });
      const count = await this.prisma.postLike.count({ where: { postId: targetPostId } });
      await this.prisma.post.update({
        where: { id: targetPostId },
        data: { likeCount: count },
      });
      return { liked: false, likeCount: count };
    }

    try {
      await this.prisma.postLike.create({
        data: { postId: targetPostId, userId: actorId },
      });
    } catch {
      // Ignore duplicate unique constraint error on rapid clicks
    }

    const count = await this.prisma.postLike.count({ where: { postId: targetPostId } });
    await this.prisma.post.update({
      where: { id: targetPostId },
      data: { likeCount: count },
    });
    return { liked: true, likeCount: count };
  }

  async toggleBookmark(
    userId: string,
    postId: string,
  ): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
    const actorId = BigInt(userId);
    const targetPostId = BigInt(postId);

    const post = await this.prisma.post.findUnique({
      where: { id: targetPostId },
      select: { status: true, audience: true, userId: true, targetUserIds: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const visible = await isPostVisibleToUser(this.prisma, post, userId);
    if (!visible) throw new ForbiddenException('This post is private');

    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_postId: { userId: actorId, postId: targetPostId } },
    });

    if (existing) {
      await this.prisma.bookmark.delete({
        where: { userId_postId: { userId: actorId, postId: targetPostId } },
      });
      const count = await this.prisma.bookmark.count({ where: { postId: targetPostId } });
      return { bookmarked: false, bookmarkCount: count };
    }

    try {
      await this.prisma.bookmark.create({
        data: { userId: actorId, postId: targetPostId },
      });
    } catch {
      // Ignore duplicate unique constraint error on rapid clicks
    }

    const count = await this.prisma.bookmark.count({ where: { postId: targetPostId } });
    return { bookmarked: true, bookmarkCount: count };
  }

  async getUserBookmarks(userId: string): Promise<PostDto[]> {
    const viewerId = BigInt(userId);

    const bookmarks = await this.prisma.bookmark.findMany({
      where: {
        userId: viewerId,
        post: { status: { not: PostStatus.deleted_by_user } },
      },
      orderBy: { createdAt: 'desc' },
      include: { post: { include: postInclude(viewerId) } },
    });

    const result: PostDto[] = [];
    for (const b of bookmarks) {
      const visible = await isPostVisibleToUser(this.prisma, b.post, userId);
      if (visible) result.push(formatPost(b.post, userId));
    }
    return result;
  }
}
