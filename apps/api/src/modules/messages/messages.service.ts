import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { MessagesGateway } from './messages.gateway.js';
import {
  ConversationDto,
  DirectMessageDto,
  SendMessageDto,
  UserProfileDto,
  MessageReactionDto,
  UpdateGroupConversationDto,
  ConversationFeedResponseDto,
  MessageFeedResponseDto,
} from './messages.dto.js';
import {
  ConversationMemberStatus,
  MemberRole,
  ConversationFolder,
  MessageRequestStatus,
  MessageType,
} from '../../generated/prisma/enums.js';

const MAX_MESSAGE_MEDIA = 10;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly messagesGateway: MessagesGateway,
  ) { }

  private formatUserProfile(user: any): UserProfileDto {
    if (!user) return undefined as any;
    return {
      id: user.id.toString(),
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      status: user.status,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      location: user.location,
      links: user.links,
      birthDate: user.birthDate ? user.birthDate.toISOString() : null,
      role: user.role,
      isVerified: user.isVerified,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount: user.postsCount,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private formatMessage(msg: any): DirectMessageDto {
    if (!msg) return null as any;

    const media =
      msg.media?.map((mm: any) => ({
        id: mm.media.id.toString(),
        url: mm.media.originalUrl,
        mediaType: mm.media.mediaType,
      })) ?? [];

    const reactions =
      msg.reactions?.map((r: any) => ({
        emoji: r.emoji,
        userId: r.userId.toString(),
        user: r.user ? this.formatUserProfile(r.user) : undefined,
      })) ?? [];

    return {
      id: msg.id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      sender: msg.sender ? this.formatUserProfile(msg.sender) : (undefined as any),
      messageType: msg.messageType,
      content: msg.isDeleted ? 'This message was unsent' : msg.content || undefined,
      mediaUrl: msg.isDeleted ? undefined : media[0]?.url,
      mediaUrls: msg.isDeleted ? [] : media.map((mm: any) => mm.url),
      media: msg.isDeleted ? [] : media,
      isDeleted: msg.isDeleted,
      isUnsent: msg.isDeleted,
      replyToMessageId: msg.replyToMessageId ? msg.replyToMessageId.toString() : undefined,
      replyToMessage: msg.replyToMessage ? this.formatMessage(msg.replyToMessage) : undefined,
      sharePostId: msg.sharePostId ? msg.sharePostId.toString() : undefined,
      sharedPost: msg.sharedPost ? msg.sharedPost : undefined,
      reactions,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  private formatConversation(
    conv: any,
    currentUserId: string,
    extra: Partial<ConversationDto> = {},
  ): ConversationDto {
    const curIdStr = String(currentUserId);

    const myMember = conv.members?.find(
      (m: any) => String(m.userId) === curIdStr || String(m.user?.id) === curIdStr,
    );

    const otherMember = conv.members?.find(
      (m: any) => String(m.userId) !== curIdStr && String(m.user?.id) !== curIdStr,
    );

    let unreadCount = 0;
    if (conv.messages && myMember) {
      const lastReadId = myMember.lastReadMessageId;
      unreadCount = conv.messages.filter((m: any) => {
        if (String(m.senderId) === curIdStr) return false;
        if (myMember.clearedAt && m.createdAt <= myMember.clearedAt) return false;
        if (!lastReadId) return true;
        return m.id > lastReadId;
      }).length;
    }

    return {
      id: conv.id.toString(),
      type: conv.type,
      title: conv.title || undefined,
      avatarUrl: conv.avatarUrl || undefined,
      lastMessageContent: extra.lastMessageContent ?? '',
      lastMessageAt: extra.lastMessageAt || conv.updatedAt.toISOString(),
      unreadCount,
      folder: myMember?.folder || ConversationFolder.main,
      requestStatus: myMember?.requestStatus || MessageRequestStatus.accepted,
      isMuted: myMember?.isMuted || false,
      members: (conv.members || []).map((m: any) => ({
        id: `${m.conversationId}_${m.userId}`,
        conversationId: conv.id.toString(),
        userId: m.userId.toString(),
        user: this.formatUserProfile(m.user),
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : new Date().toISOString(),
      })),
      participants: (conv.members || []).map((m: any) => ({
        user: this.formatUserProfile(m.user),
        role: m.role,
        status: m.status,
        folder: m.folder,
        requestStatus: m.requestStatus,
        isMuted: m.isMuted,
        lastReadAt: m.joinedAt.toISOString(),
      })),
      otherUser: otherMember ? this.formatUserProfile(otherMember.user) : undefined,
      myStatus: myMember?.status,
      myRole: myMember?.role,
      ...extra,
    };
  }

  private async ensureNotBlocked(
    blockerId: bigint,
    targetUserId: bigint,
  ): Promise<void> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: blockerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: blockerId },
        ],
      },
    });

    if (block) {
      throw new BadRequestException(
        'This conversation is locked due to block status.',
      );
    }
  }

  private detectMediaType(url: string): 'video' | 'image' {
    return /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url) ? 'video' : 'image';
  }

  private async createSystemEventMessage(
    conversationId: bigint,
    senderId: bigint,
    content: string,
  ): Promise<void> {
    const msgBigInt = this.snowflake.generate();
    const createdMsg = await this.prisma.message.create({
      data: {
        id: msgBigInt,
        conversationId,
        senderId,
        messageType: MessageType.system_event,
        content,
      },
      include: {
        sender: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const formatted = this.formatMessage(createdMsg);
    this.messagesGateway.broadcastMessage(conversationId.toString(), formatted);
  }

  async getConversationById(
    currentUserId: string,
    conversationId: string,
  ): Promise<ConversationDto> {
    const convBigInt = BigInt(conversationId);
    const userBigInt = BigInt(currentUserId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
      include: { members: { include: { user: true } } },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const curIdStr = String(currentUserId);
    const otherMember = conv.members.find(
      (m: any) => String(m.userId) !== curIdStr && String(m.user?.id) !== curIdStr,
    );

    let isBlockedByMe = false;
    let isBlockedByOther = false;

    if (otherMember) {
      const blocks = await this.prisma.userBlock.findMany({
        where: {
          OR: [
            { blockerId: userBigInt, blockedId: otherMember.userId },
            { blockerId: otherMember.userId, blockedId: userBigInt },
          ],
        },
      });

      isBlockedByMe = blocks.some((b) => b.blockerId === userBigInt);
      isBlockedByOther = blocks.some((b) => b.blockerId === otherMember.userId);
    }

    return this.formatConversation(conv, currentUserId, {
      isBlockedByMe,
      isBlockedByOther,
    });
  }

  async getOrCreateConversation(
    currentUserId: string,
    targetUsername: string,
  ): Promise<ConversationDto> {
    const currentUserBigInt = BigInt(currentUserId);

    const targetUser = await this.prisma.user.findFirst({
      where: { username: { equals: targetUsername, mode: 'insensitive' } },
    });
    if (!targetUser) {
      throw new NotFoundException(`User @${targetUsername} not found`);
    }
    if (targetUser.id === currentUserBigInt) {
      throw new BadRequestException('You cannot message yourself');
    }

    await this.ensureNotBlocked(currentUserBigInt, targetUser.id);

    const targetSettings = await this.prisma.userSettings.findUnique({
      where: { userId: targetUser.id },
    });

    if (targetSettings?.whoCanMessageMe === 'nobody') {
      throw new ForbiddenException(
        `@${targetUser.username} does not accept direct messages.`,
      );
    }


    // users who have this setting can create orders.
    // uers who don't have this setting will receive a forbidden result.
    if (targetSettings?.whoCanMessageMe === 'followers') {
      const currentFollowsTarget = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserBigInt,
            followingId: targetUser.id,
          },
        },
      });
      if (!currentFollowsTarget || currentFollowsTarget.isPending) {
        throw new ForbiddenException(
          `@${targetUser.username} only accepts direct messages from followers.`,
        );
      }
    }

    const existingConvs = await this.prisma.conversation.findMany({
      where: {
        type: 'direct',
        members: { some: { userId: currentUserBigInt } },
      },
      include: { members: { include: { user: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const existingConv = existingConvs.find((c) =>
      c.members.some((m) => m.userId === targetUser.id),
    );

    // Check if target user (User 1) follows current user (User 2) and follow is accepted
    const targetFollowsCurrent = await this.prisma.follow.findFirst({
      where: {
        followerId: targetUser.id,
        followingId: currentUserBigInt,
        isPending: false,
      },
    });

    // Conversation must go to pending folder if target user does not follow current user back
    const requiresPending = !targetFollowsCurrent;

    if (existingConv) {
      // Ensure target member folder is 'pending' if message request is required and target hasn't accepted yet
      const targetMember = existingConv.members.find((m) => m.userId === targetUser.id);

      if (requiresPending && targetMember && targetMember.requestStatus !== MessageRequestStatus.accepted) {
        await this.prisma.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId: existingConv.id,
              userId: targetUser.id,
            },
          },
          data: {
            folder: ConversationFolder.pending,
            requestStatus: MessageRequestStatus.pending,
          },
        });
        targetMember.folder = ConversationFolder.pending;
        targetMember.requestStatus = MessageRequestStatus.pending;
      }

      return this.formatConversation(existingConv, currentUserId, {
        lastMessageAt: existingConv.updatedAt.toISOString(),
      });
    }

    const targetRequestStatus = requiresPending
      ? MessageRequestStatus.pending
      : MessageRequestStatus.accepted;
    const targetFolder = requiresPending
      ? ConversationFolder.pending
      : ConversationFolder.main;

    const createdConv = await this.prisma.conversation.create({
      data: {
        id: this.snowflake.generate(),
        type: 'direct',
        members: {
          create: [
            {
              userId: currentUserBigInt,
              role: MemberRole.member,
              status: ConversationMemberStatus.active,
              folder: ConversationFolder.main,
              requestStatus: MessageRequestStatus.accepted,
            },
            {
              userId: targetUser.id,
              role: MemberRole.member,
              status: ConversationMemberStatus.active,
              folder: targetFolder,
              requestStatus: targetRequestStatus,
            },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    return this.formatConversation(createdConv, currentUserId, {
      lastMessageAt: createdConv.createdAt.toISOString(),
    });
  }

  async getUserConversations(
    currentUserId: string,
    folder: string = 'primary',
    cursor?: string,
    limit = 20,
  ): Promise<ConversationFeedResponseDto> {
    const userBigInt = BigInt(currentUserId);
    const targetFolder =
      folder === 'requests' || folder === 'pending'
        ? ConversationFolder.pending
        : ConversationFolder.main;

    const takeLimit = Math.min(Math.max(limit, 1), 50);

    const members = await this.prisma.conversationMember.findMany({
      where: {
        userId: userBigInt,
        folder: targetFolder,
        status: ConversationMemberStatus.active,
      },
      include: {
        conversation: {
          include: {
            members: { include: { user: true } },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              include: {
                sender: true,
                media: {
                  include: { media: true },
                  orderBy: { displayOrder: 'asc' },
                },
                replyToMessage: { include: { sender: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
      take: takeLimit + 1,
      cursor: cursor ? { conversationId_userId: { conversationId: BigInt(cursor), userId: userBigInt } } : undefined,
      skip: cursor ? 1 : 0,
    });

    let nextCursor: string | undefined;
    if (members.length > takeLimit) {
      const nextItem = members.pop();
      nextCursor = nextItem!.conversationId.toString();
    }

    const userBlocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userBigInt }, { blockedId: userBigInt }],
      },
    });

    const myBlockedIds = new Set(
      userBlocks.filter((b) => b.blockerId === userBigInt).map((b) => b.blockedId.toString()),
    );
    const blockedMeIds = new Set(
      userBlocks.filter((b) => b.blockedId === userBigInt).map((b) => b.blockerId.toString()),
    );

    const result: ConversationDto[] = [];
    const seenOtherUserIds = new Set<string>();

    for (const m of members) {
      const conv = m.conversation;
      const validMessages = m.clearedAt
        ? conv.messages.filter((msg) => msg.createdAt > m.clearedAt!)
        : conv.messages;

      if (m.clearedAt && validMessages.length === 0) continue;

      const otherMember = conv.members.find(
        (mem) => mem.userId.toString() !== currentUserId,
      );
      const otherUserId = otherMember?.userId.toString() ?? null;

      if (conv.type === 'direct' && otherUserId) {
        if (seenOtherUserIds.has(otherUserId)) continue;
        seenOtherUserIds.add(otherUserId);
      }

      const isBlockedByMe = otherUserId ? myBlockedIds.has(otherUserId) : false;
      const isBlockedByOther = otherUserId ? blockedMeIds.has(otherUserId) : false;

      const lastMsg = validMessages[0];
      const hasMedia = lastMsg && (lastMsg.media?.length ?? 0) > 0;
      const lastMessageContent = lastMsg
        ? lastMsg.content || (hasMedia ? '[Attachment]' : '')
        : '';

      result.push(
        this.formatConversation(conv, currentUserId, {
          isBlockedByMe,
          isBlockedByOther,
          lastMessageContent,
          lastMessageAt: (lastMsg
            ? lastMsg.createdAt
            : conv.updatedAt
          ).toISOString(),
        }),
      );
    }

    return { conversations: result, nextCursor };
  }

  async acceptMessageRequest(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
      data: {
        requestStatus: MessageRequestStatus.accepted,
        folder: ConversationFolder.main,
      },
    });

    return { success: true };
  }

  async rejectMessageRequest(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
      data: {
        requestStatus: MessageRequestStatus.rejected,
        clearedAt: new Date(),
      },
    });

    return { success: true };
  }

  async moveConversationFolder(
    currentUserId: string,
    conversationId: string,
    folder: string,
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    const validFolder =
      folder === 'requests' || folder === 'pending' ? ConversationFolder.pending : ConversationFolder.main;

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
      data: {
        folder: validFolder,
      },
    });

    return { success: true };
  }

  async getConversationMessages(
    currentUserId: string,
    conversationId: string,
    cursor?: string,
    limit = 30,
  ): Promise<MessageFeedResponseDto> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);
    const takeLimit = Math.min(Math.max(limit, 1), 100);

    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
    });
    if (!member || member.status !== 'active') {
      return { messages: [], nextCursor: undefined };
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: convBigInt,
        ...(member.clearedAt && { createdAt: { gt: member.clearedAt } }),
      },
      orderBy: { id: 'desc' },
      take: takeLimit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        sender: true,
        media: {
          include: { media: true },
          orderBy: { displayOrder: 'asc' as const },
        },
        replyToMessage: { include: { sender: true } },
        sharedPost: true,
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > takeLimit) {
      const nextItem = messages.pop();
      nextCursor = nextItem!.id.toString();
    }

    const formatted = messages.reverse().map((msg) => this.formatMessage(msg));

    return { messages: formatted, nextCursor };
  }

  async sendMessage(
    currentUserId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<DirectMessageDto> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);
    const mediaUrls = dto.mediaUrls ?? [];

    if (!dto.content?.trim() && mediaUrls.length === 0 && !dto.sharePostId) {
      throw new BadRequestException(
        'Message must contain text, media, or a shared post',
      );
    }
    if (mediaUrls.length > MAX_MESSAGE_MEDIA) {
      throw new BadRequestException(
        `A message can contain at most ${MAX_MESSAGE_MEDIA} media items`,
      );
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
      include: { members: true },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const myMember = conv.members.find((m) => m.userId === userBigInt);
    if (!myMember || myMember.status !== 'active') {
      throw new ForbiddenException(
        'You are not an active participant in this conversation',
      );
    }

    const otherMembers = conv.members.filter((m) => m.userId !== userBigInt);
    for (const om of otherMembers) {
      await this.ensureNotBlocked(userBigInt, om.userId);
    }

    if (conv.type === 'direct' && otherMembers.length > 0) {
      const targetUserId = otherMembers[0].userId;
      const targetSettings = await this.prisma.userSettings.findUnique({
        where: { userId: targetUserId },
        select: { whoCanMessageMe: true },
      });

      if (targetSettings?.whoCanMessageMe === 'followers') {
        const currentFollowsTarget = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userBigInt,
              followingId: targetUserId,
            },
          },
        });

        if (!currentFollowsTarget || currentFollowsTarget.isPending) {
          const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { username: true },
          });
          throw new ForbiddenException(
            `@${targetUser?.username || 'user'} only accepts direct messages from followers.`,
          );
        }
      }
    }

    let messageType: MessageType = MessageType.text;
    if (mediaUrls.length > 0) {
      messageType = MessageType.media;
    } else if (dto.sharePostId) {
      messageType = MessageType.post_share;
    }

    const msgBigInt = this.snowflake.generate();
    const replyId = dto.replyToMessageId ? BigInt(dto.replyToMessageId) : null;
    const shareId = dto.sharePostId ? BigInt(dto.sharePostId) : null;

    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          id: msgBigInt,
          conversationId: convBigInt,
          senderId: userBigInt,
          messageType,
          content: dto.content || '',
          replyToMessageId: replyId,
          sharePostId: shareId,
        },
      }),
      this.prisma.conversation.update({
        where: { id: convBigInt },
        data: { updatedAt: new Date() },
      }),
      this.prisma.conversationMember.updateMany({
        where: {
          conversationId: convBigInt,
          userId: userBigInt,
          requestStatus: MessageRequestStatus.pending,
        },
        data: {
          requestStatus: MessageRequestStatus.accepted,
          folder: ConversationFolder.main,
        },
      }),
    ]);

    await this.createMessageMedia(msgBigInt, userBigInt, mediaUrls);

    const createdMsg = await this.prisma.message.findUniqueOrThrow({
      where: { id: msgBigInt },
      include: {
        sender: true,
        media: {
          include: { media: true },
          orderBy: { displayOrder: 'asc' as const },
        },
        replyToMessage: { include: { sender: true } },
        sharedPost: true,
      },
    });

    const formatted = this.formatMessage(createdMsg);
    this.messagesGateway.broadcastMessage(conversationId, formatted);

    return formatted;
  }

  private async createMessageMedia(
    messageId: bigint,
    uploaderId: bigint,
    mediaUrls: string[],
  ): Promise<void> {
    for (let i = 0; i < mediaUrls.length; i++) {
      await this.prisma.media.create({
        data: {
          id: this.snowflake.generate(),
          uploaderId,
          mediaType: this.detectMediaType(mediaUrls[i]),
          originalUrl: mediaUrls[i],
          status: 'ready',
          messages: { create: { messageId, displayOrder: i } },
        },
      });
    }
  }

  async deleteMessage(
    currentUserId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);
    const msgBigInt = BigInt(messageId);

    const msg = await this.prisma.message.findUnique({
      where: { id: msgBigInt },
    });

    if (!msg || msg.conversationId !== convBigInt) {
      throw new NotFoundException('Message not found');
    }

    if (msg.senderId !== userBigInt) {
      throw new ForbiddenException('You can only unsend your own messages');
    }

    await this.prisma.message.update({
      where: { id: msgBigInt },
      data: {
        isDeleted: true,
        content: null,
      },
    });

    this.messagesGateway.broadcastMessageUnsent(conversationId, messageId);

    return { success: true };
  }

  async reactToMessage(
    currentUserId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReactionDto> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);
    const msgBigInt = BigInt(messageId);

    const msg = await this.prisma.message.findUnique({
      where: { id: msgBigInt },
    });

    if (!msg || msg.conversationId !== convBigInt) {
      throw new NotFoundException('Message not found');
    }

    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
    });

    if (!member || member.status !== 'active') {
      throw new ForbiddenException('Not an active participant');
    }

    const reactionDto: MessageReactionDto = {
      id: this.snowflake.generate().toString(),
      emoji,
      userId: currentUserId,
    };

    this.messagesGateway.broadcastMessageReaction(
      conversationId,
      messageId,
      reactionDto,
      'add',
    );

    return reactionDto;
  }

  async removeReaction(
    currentUserId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    this.messagesGateway.broadcastMessageReaction(
      conversationId,
      messageId,
      { id: '', emoji: '', userId: currentUserId },
      'remove',
    );

    return { success: true };
  }

  async markConversationAsRead(
    currentUserId: string,
    conversationId: string,
    lastReadMessageId?: string,
  ): Promise<{ success: boolean; lastReadMessageId: string }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    let targetMessageId: bigint;

    if (lastReadMessageId) {
      targetMessageId = BigInt(lastReadMessageId);
    } else {
      const latestMsg = await this.prisma.message.findFirst({
        where: { conversationId: convBigInt, isDeleted: false },
        orderBy: { id: 'desc' },
      });
      if (!latestMsg) {
        return { success: true, lastReadMessageId: '0' };
      }
      targetMessageId = latestMsg.id;
    }

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
      data: {
        lastReadMessageId: targetMessageId,
      },
    });

    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId: userBigInt },
    });

    if (userSettings?.showReadReceipts ?? true) {
      this.messagesGateway.broadcastMessageRead(
        conversationId,
        currentUserId,
        targetMessageId.toString(),
      );
    }

    return { success: true, lastReadMessageId: targetMessageId.toString() };
  }

  async createGroupConversation(
    currentUserId: string,
    title: string,
    memberUsernames: string[],
    avatarUrl?: string,
    groupStatus?: 'public' | 'private',
  ): Promise<ConversationDto> {
    const currentUserBigInt = BigInt(currentUserId);

    if (!memberUsernames?.length || memberUsernames.length < 2) {
      throw new BadRequestException(
        'At least two members are required to create a group chat',
      );
    }

    const targetUsers = await this.prisma.user.findMany({
      where: {
        username: {
          in: memberUsernames,
          mode: 'insensitive',
        },
      },
    });

    if (targetUsers.length === 0) {
      throw new NotFoundException(
        'No valid members found for group conversation',
      );
    }

    const follows = await this.prisma.follow.findMany({
      where: {
        followingId: currentUserBigInt,
        followerId: {
          in: targetUsers.map((u) => u.id),
        },
        isPending: false,
      },
    });

    const followerUserIds = new Set(
      follows.map((f) => f.followerId.toString()),
    );

    const validMembers = targetUsers.filter((u) =>
      followerUserIds.has(u.id.toString()),
    );

    if (validMembers.length === 0) {
      throw new BadRequestException(
        'Only users who follow you can be added to your group conversation',
      );
    }

    const createdConv = await this.prisma.conversation.create({
      data: {
        id: this.snowflake.generate(),
        type: 'group',
        title: title?.trim() || 'Group Chat',
        avatarUrl: avatarUrl || undefined,
        members: {
          create: [
            {
              userId: currentUserBigInt,
              role: MemberRole.owner,
              status: ConversationMemberStatus.active,
              folder: ConversationFolder.main,
              requestStatus: MessageRequestStatus.accepted,
            },
            ...validMembers.map((u) => ({
              userId: u.id,
              role: MemberRole.member,
              status: ConversationMemberStatus.active,
              folder: ConversationFolder.main,
              requestStatus: MessageRequestStatus.accepted,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserBigInt },
    });
    const systemMsgContent = `@${currentUser?.username || 'User'} created the group "${createdConv.title}".`;
    await this.createSystemEventMessage(
      createdConv.id,
      currentUserBigInt,
      systemMsgContent,
    );

    const myMember = createdConv.members.find(
      (m) => m.userId === currentUserBigInt,
    );

    return this.formatConversation(createdConv, currentUserId, {
      title: createdConv.title || 'Group Chat',
      lastMessageAt: createdConv.createdAt.toISOString(),
      myStatus: myMember?.status || 'active',
      myRole: myMember?.role || 'owner',
      otherUser: undefined,
    });
  }

  async updateGroupConversation(
    currentUserId: string,
    conversationId: string,
    dto: UpdateGroupConversationDto,
  ): Promise<ConversationDto> {
    const requesterId = BigInt(currentUserId);
    const conversationBigInt = BigInt(conversationId);

    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: requesterId,
        },
      },
    });

    if (!member || (member.role !== MemberRole.owner && member.role !== MemberRole.monitor)) {
      throw new ForbiddenException('Only group admins can update group details');
    }

    const updatedConv = await this.prisma.conversation.update({
      where: { id: conversationBigInt },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      include: {
        members: { include: { user: true } },
      },
    });

    const currentUser = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });
    await this.createSystemEventMessage(
      conversationBigInt,
      requesterId,
      `@${currentUser?.username || 'User'} updated the group profile details.`,
    );

    this.messagesGateway.broadcastGroupUpdated(conversationId, {
      title: updatedConv.title,
      avatarUrl: updatedConv.avatarUrl,
    });

    return this.formatConversation(updatedConv, currentUserId);
  }

  async addMember(
    currentUserId: string,
    memberId: string,
    conversationId: string,
  ): Promise<{ success: boolean; status: string }> {
    const requesterId = BigInt(currentUserId);
    const targetUserId = BigInt(memberId);
    const conversationBigInt = BigInt(conversationId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationBigInt },
    });

    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Group conversation not found');
    }

    const requester = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: requesterId,
        },
      },
      include: { user: true },
    });

    if (!requester || requester.status !== 'active') {
      throw new ForbiddenException('Only active members can add users');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: targetUserId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        'User is already a member of this conversation',
      );
    }

    const ownerMember = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId: conversationBigInt,
        role: MemberRole.owner,
      },
    });

    if (ownerMember && ownerMember.userId !== targetUserId) {
      const isFollower = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: ownerMember.userId,
          },
        },
      });

      if (!isFollower || isFollower.isPending) {
        throw new BadRequestException(
          'Only followers of the group owner can be added to this group',
        );
      }
    }

    await this.prisma.conversationMember.create({
      data: {
        conversationId: conversationBigInt,
        userId: targetUserId,
        invitedBy: requesterId,
        role: MemberRole.member,
        status: ConversationMemberStatus.active,
        folder: ConversationFolder.main,
        requestStatus: MessageRequestStatus.accepted,
      },
    });

    await this.createSystemEventMessage(
      conversationBigInt,
      requesterId,
      `@${requester.user.username} added @${targetUser.username} to the group.`,
    );

    this.messagesGateway.broadcastMemberJoined(conversationId, this.formatUserProfile(targetUser));

    return {
      success: true,
      status: 'active',
    };
  }

  async removeMember(
    currentUserId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const requesterId = BigInt(currentUserId);
    const conversationBigInt = BigInt(conversationId);
    const targetId = BigInt(targetUserId);

    const isSelfLeave = currentUserId === targetUserId;

    if (!isSelfLeave) {
      const requester = await this.prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: conversationBigInt,
            userId: requesterId,
          },
        },
      });

      if (!requester || (requester.role !== MemberRole.owner && requester.role !== MemberRole.monitor)) {
        throw new ForbiddenException('Only group admins can remove members');
      }
    }

    const targetMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: targetId,
        },
      },
      include: { user: true },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found in conversation');
    }

    await this.prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: targetId,
        },
      },
    });

    const requesterUser = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    const eventMessage = isSelfLeave
      ? `@${targetMember.user.username} left the group.`
      : `@${requesterUser?.username || 'Admin'} removed @${targetMember.user.username} from the group.`;

    await this.createSystemEventMessage(
      conversationBigInt,
      requesterId,
      eventMessage,
    );

    this.messagesGateway.broadcastMemberRemoved(conversationId, targetUserId);

    return { success: true };
  }

  async updateMemberRole(
    currentUserId: string,
    conversationId: string,
    targetUserId: string,
    newRole: string,
  ): Promise<{ success: boolean }> {
    const requesterId = BigInt(currentUserId);
    const conversationBigInt = BigInt(conversationId);
    const targetId = BigInt(targetUserId);

    const requester = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: requesterId,
        },
      },
    });

    if (!requester || requester.role !== MemberRole.owner) {
      throw new ForbiddenException('Only group owner can update member roles');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const roleEnum =
      newRole === 'admin'
        ? MemberRole.monitor
        : newRole === 'owner'
          ? MemberRole.owner
          : MemberRole.member;

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: targetId,
        },
      },
      data: { role: roleEnum },
    });

    await this.createSystemEventMessage(
      conversationBigInt,
      requesterId,
      `@${targetUser.username} is now a group ${roleEnum}.`,
    );

    return { success: true };
  }

  async toggleMemberMute(
    currentUserId: string,
    conversationId: string,
    targetUserId: string,
    isMuted: boolean,
  ): Promise<{ success: boolean; isMuted: boolean }> {
    const requesterId = BigInt(currentUserId);
    const conversationBigInt = BigInt(conversationId);
    const targetId = BigInt(targetUserId);

    const requester = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: requesterId,
        },
      },
    });

    if (!requester || (requester.role !== MemberRole.owner && requester.role !== MemberRole.monitor)) {
      throw new ForbiddenException('Only group admins can mute or unmute members');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const newStatus = isMuted
      ? ConversationMemberStatus.pending_approval
      : ConversationMemberStatus.active;

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: conversationBigInt,
          userId: targetId,
        },
      },
      data: { status: newStatus },
    });

    await this.createSystemEventMessage(
      conversationBigInt,
      requesterId,
      isMuted
        ? `@${targetUser.username}'s messaging permissions were restricted by admin.`
        : `@${targetUser.username}'s messaging permissions were restored by admin.`,
    );

    return { success: true, isMuted };
  }

  async toggleMuteConversation(
    currentUserId: string,
    conversationId: string,
    isMuted: boolean,
  ): Promise<{ success: boolean; isMuted: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId: convBigInt,
          userId: userBigInt,
        },
      },
      data: {
        isMuted,
      },
    });

    return { success: true, isMuted };
  }

  async searchGroupConversations(
    currentUserId: string,
    query: string,
  ): Promise<ConversationDto[]> {
    const currentUserBigInt = BigInt(currentUserId);
    const trimmed = query?.trim() || '';
    if (!trimmed) return [];

    const groups = await this.prisma.conversation.findMany({
      where: {
        type: 'group',
        title: { contains: trimmed, mode: 'insensitive' },
      },
      include: { members: { include: { user: true } } },
      take: 20,
    });

    return groups.map((g) => {
      const myMem = g.members.find((m) => m.userId === currentUserBigInt);
      return this.formatConversation(g, currentUserId, {
        title: g.title || 'Group Chat',
        myStatus: myMem?.status,
        myRole: myMem?.role,
        otherUser: undefined,
      });
    });
  }

  async joinGroupConversation(
    currentUserId: string,
    conversationId: string,
  ): Promise<ConversationDto> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
    });

    if (!conv || conv.type !== 'group') {
      throw new NotFoundException('Group conversation not found');
    }

    const existingMember = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: convBigInt, userId: userBigInt } },
    });

    if (existingMember && existingMember.status === 'active') {
      return this.formatConversation(conv, currentUserId);
    }

    if (existingMember) {
      await this.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId: convBigInt, userId: userBigInt } },
        data: {
          status: ConversationMemberStatus.active,
          requestStatus: MessageRequestStatus.accepted,
          folder: ConversationFolder.main,
        },
      });
    } else {
      await this.prisma.conversationMember.create({
        data: {
          conversationId: convBigInt,
          userId: userBigInt,
          role: MemberRole.member,
          status: ConversationMemberStatus.active,
          folder: ConversationFolder.main,
          requestStatus: MessageRequestStatus.accepted,
        },
      });
    }

    const currentUser = await this.prisma.user.findUnique({ where: { id: userBigInt } });
    await this.createSystemEventMessage(
      convBigInt,
      userBigInt,
      `@${currentUser?.username || 'User'} joined the group.`,
    );

    const updated = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
      include: { members: { include: { user: true } } },
    });

    return this.formatConversation(updated, currentUserId);
  }

  async requestJoinGroupConversation(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ success: boolean; status: string }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
    });

    if (!conv || conv.type !== 'group') {
      throw new NotFoundException('Group conversation not found');
    }

    const existingMember = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: convBigInt, userId: userBigInt } },
    });

    if (existingMember && existingMember.status === 'active') {
      return { success: true, status: 'active' };
    }

    if (existingMember) {
      await this.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId: convBigInt, userId: userBigInt } },
        data: { status: ConversationMemberStatus.pending_approval },
      });
    } else {
      await this.prisma.conversationMember.create({
        data: {
          conversationId: convBigInt,
          userId: userBigInt,
          role: MemberRole.member,
          status: ConversationMemberStatus.pending_approval,
          folder: ConversationFolder.pending,
          requestStatus: MessageRequestStatus.pending,
        },
      });
    }

    return { success: true, status: 'pending_approval' };
  }

  async deleteConversation(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const userBigInt = BigInt(currentUserId);
    const convBigInt = BigInt(conversationId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: convBigInt },
    });

    if (conv?.type === 'group') {
      await this.removeMember(currentUserId, conversationId, currentUserId);
    } else {
      await this.prisma.conversationMember.updateMany({
        where: { conversationId: convBigInt, userId: userBigInt },
        data: { clearedAt: new Date() },
      });
    }

    return { success: true };
  }
}
