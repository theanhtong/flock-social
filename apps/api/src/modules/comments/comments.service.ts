import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import {
  CreateCommentDto,
  GetCommentsQueryDto,
  CommentFeedResponseDto,
  ToggleCommentLikeResultDto,
  UpdateCommentDto,
} from './comments.dto.js';
import { CommentDto } from '../posts/posts.dto.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async createComment(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const actorId = BigInt(userId);
    const post = await this.prisma.post.findFirst({
      where: { id: BigInt(postId), status: 'active' },
      select: { id: true, userId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    if (post.userId !== actorId) {
      const authorSettings = await this.prisma.userSettings.findUnique({
        where: { userId: post.userId },
      });

      if (authorSettings?.whoCanReplyPosts === 'nobody') {
        throw new ForbiddenException(
          'Comments on this post have been turned off by the author.',
        );
      }

      if (authorSettings?.whoCanReplyPosts === 'followers') {
        const commenterFollowsAuthor = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: actorId,
              followingId: post.userId,
            },
          },
        });
        if (!commenterFollowsAuthor || commenterFollowsAuthor.isPending) {
          throw new ForbiddenException(
            'Only followers can comment on this post.',
          );
        }
      }
    }

    let parentId: bigint | null = null;
    let parentUserId: bigint | null = null;
    if (dto.parentCommentId) {
      const parent = await this.prisma.comment.findFirst({
        where: {
          id: BigInt(dto.parentCommentId),
          postId: BigInt(postId),
          isDeleted: false,
        },
        select: { id: true, userId: true },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
      parentId = parent.id;
      parentUserId = parent.userId;
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          id: this.snowflake.generate(),
          postId: BigInt(postId),
          userId: BigInt(userId),
          content: dto.content,
          mediaUrl: dto.mediaUrl,
          parentCommentId: parentId,
        },
        include: { user: true },
      });

      await tx.post.update({
        where: { id: BigInt(postId) },
        data: { commentCount: { increment: 1 } },
      });

      if (parentId) {
        await tx.comment.update({
          where: { id: parentId },
          data: { replyCount: { increment: 1 } },
        });
      }

      return created;
    });

    // TODO: Send notification when NotificationsModule is ready
    /*
    await this.notificationsService.createNotification(
      post.userId,
      actorId,
      'comment',
      comment.id,
    );

    if (parentUserId && parentUserId !== post.userId) {
      await this.notificationsService.createNotification(
        parentUserId,
        actorId,
        'comment',
        comment.id,
      );
    }
    */

    return this.formatComment(comment, false);
  }

  async updateComment(
  commentId: string,
  userId: string,
  dto: UpdateCommentDto,
): Promise<CommentDto> {
  const comment = await this.prisma.comment.findUnique({
    where: { id: BigInt(commentId) },
    select: { id: true, userId: true, isDeleted: true },
  });
  if (!comment || comment.isDeleted) {
    throw new NotFoundException('Comment not found');
  }
  if (comment.userId !== BigInt(userId)) {
    throw new ForbiddenException('Not allowed to edit this comment');
  }

  const updated = await this.prisma.comment.update({
    where: { id: comment.id },
    data: { content: dto.content },
    include: { user: true },
  });

  return this.formatComment(updated, false);
}

  async getCommentsByPost(
    postId: string,
    currentUserId: string | undefined,
    query: GetCommentsQueryDto,
  ): Promise<CommentFeedResponseDto> {
    return this.getComments(
      { postId: BigInt(postId), parentCommentId: null },
      currentUserId,
      query,
    );
  }

  async getRepliesByComment(
    commentId: string,
    currentUserId: string | undefined,
    query: GetCommentsQueryDto,
  ): Promise<CommentFeedResponseDto> {
    return this.getComments(
      { parentCommentId: BigInt(commentId) },
      currentUserId,
      query,
    );
  }

  async toggleLike(
    commentId: string,
    userId: string,
  ): Promise<ToggleCommentLikeResultDto> {
    const actorId = BigInt(userId);
    const targetCommentId = BigInt(commentId);

    const comment = await this.prisma.comment.findFirst({
      where: { id: targetCommentId, isDeleted: false },
      select: { id: true, userId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: { commentId: targetCommentId, userId: actorId },
      },
    });

    if (existing) {
      await this.prisma.commentLike.delete({
        where: {
          commentId_userId: { commentId: targetCommentId, userId: actorId },
        },
      });
      const count = await this.prisma.commentLike.count({
        where: { commentId: targetCommentId },
      });
      await this.prisma.comment.update({
        where: { id: targetCommentId },
        data: { likeCount: count },
      });
      return { isLiked: false, likeCount: count };
    }

    try {
      await this.prisma.commentLike.create({
        data: { commentId: targetCommentId, userId: actorId },
      });
    } catch {
      // Ignore duplicate unique constraint on rapid clicks
    }

    const count = await this.prisma.commentLike.count({
      where: { commentId: targetCommentId },
    });
    await this.prisma.comment.update({
      where: { id: targetCommentId },
      data: { likeCount: count },
    });

    return { isLiked: true, likeCount: count };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: BigInt(commentId) },
      select: { id: true, userId: true, isDeleted: true, postId: true, parentCommentId: true },
    });
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== BigInt(userId)) {
      throw new ForbiddenException('Not allowed to delete this comment');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: comment.id },
        data: { isDeleted: true, content: '[deleted]', mediaUrl: null },
      });

      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });

      if (comment.parentCommentId) {
        await tx.comment.update({
          where: { id: comment.parentCommentId },
          data: { replyCount: { decrement: 1 } },
        });
      }
    });
  }

  private async getComments(
    where: { postId?: bigint; parentCommentId: bigint | null },
    currentUserId: string | undefined,
    query: GetCommentsQueryDto,
  ): Promise<CommentFeedResponseDto> {
    const limit = query.limit ?? 20;

    const comments = await this.prisma.comment.findMany({
      where: { ...where, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: BigInt(query.cursor) },
        skip: 1,
      }),
      include: { user: true },
    });

    const hasMore = comments.length > limit;
    const page = hasMore ? comments.slice(0, limit) : comments;

    let likedIds = new Set<string>();
    if (currentUserId && page.length > 0) {
      const likes = await this.prisma.commentLike.findMany({
        where: {
          userId: BigInt(currentUserId),
          commentId: { in: page.map((c) => c.id) },
        },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId.toString()));
    }

    return {
      comments: page.map((c) =>
        this.formatComment(c, likedIds.has(c.id.toString())),
      ),
      nextCursor: hasMore ? page[page.length - 1].id.toString() : undefined,
    };
  }

  private formatComment(comment: any, isLiked: boolean): CommentDto {
    return {
      id: comment.id.toString(),
      postId: comment.postId.toString(),
      user: {
        id: comment.user.id.toString(),
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
        isVerified: comment.user.isVerified,
        role: comment.user.role,
        followersCount: comment.user.followersCount,
        followingCount: comment.user.followingCount,
        postsCount: comment.user.postsCount,
      },
      content: comment.content,
      mediaUrl: comment.mediaUrl,
      likeCount: comment.likeCount,
      replyCount: comment.replyCount,
      isLiked,
      isDeleted: comment.isDeleted,
      parentCommentId: comment.parentCommentId?.toString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }
}
