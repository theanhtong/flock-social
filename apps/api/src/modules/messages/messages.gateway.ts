import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { DirectMessageDto, MessageReactionDto } from './messages.dto.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/messages',
})
@Injectable()
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!authHeader) {
        this.logger.warn(`Unauthorized WebSocket connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      client.data.user = payload;
      client.join(`user_${payload.sub}`);
      if (payload.role === 'admin' || payload.role === 'moderator') {
        client.join('moderators_room');
      }
      this.logger.log(`Authenticated WebSocket client connected: ${client.id} (user: ${payload.sub}, role: ${payload.role})`);
    } catch (err: any) {
      this.logger.warn(`WebSocket auth verification failed for ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitPendingReportsCount(count: number) {
    this.server.to('moderators_room').emit('pending_reports_count', { pendingCount: count });
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.user?.sub;
    if (!userId || !data?.conversationId) return;

    try {
      const membership = await this.prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: BigInt(data.conversationId),
            userId: BigInt(userId),
          },
        },
      });

      if (membership && membership.status === 'active') {
        client.join(`conv_${data.conversationId}`);
        this.logger.log(`User ${userId} joined room: conv_${data.conversationId}`);
      } else {
        this.logger.warn(`Unauthorized room join attempt by user ${userId} to conversation ${data.conversationId}`);
      }
    } catch (err: any) {
      this.logger.error(`Error verifying room join authorization: ${err.message}`);
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conv_${data.conversationId}`);
      this.logger.log(`Socket ${client.id} left conversation: conv_${data.conversationId}`);
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.user?.sub;
    if (userId && data?.conversationId) {
      client.to(`conv_${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data?.user?.sub;
    if (userId && data?.conversationId) {
      client.to(`conv_${data.conversationId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    }
  }

  broadcastMessage(conversationId: string, message: DirectMessageDto) {
    this.server.to(`conv_${conversationId}`).emit('message_received', message);
  }

  broadcastMessageUnsent(conversationId: string, messageId: string) {
    this.server.to(`conv_${conversationId}`).emit('message_unsent', {
      conversationId,
      messageId,
    });
  }

  broadcastMessageReaction(
    conversationId: string,
    messageId: string,
    reaction: MessageReactionDto,
    action: 'add' | 'remove',
  ) {
    this.server.to(`conv_${conversationId}`).emit('message_reacted', {
      conversationId,
      messageId,
      reaction,
      action,
    });
  }

  broadcastMessageRead(conversationId: string, userId: string, lastReadMessageId: string) {
    this.server.to(`conv_${conversationId}`).emit('message_read', {
      conversationId,
      userId,
      lastReadMessageId,
    });
  }

  broadcastGroupUpdated(conversationId: string, groupDetails: { title?: string | null; avatarUrl?: string | null }) {
    this.server.to(`conv_${conversationId}`).emit('group_updated', {
      conversationId,
      ...groupDetails,
    });
  }

  broadcastMemberJoined(conversationId: string, member: any) {
    this.server.to(`conv_${conversationId}`).emit('member_joined', {
      conversationId,
      member,
    });
  }

  broadcastMemberRemoved(conversationId: string, memberId: string) {
    this.server.to(`conv_${conversationId}`).emit('member_removed', {
      conversationId,
      memberId,
    });
  }

  notifyUserBlocked(blockerId: string, blockedId: string, isBlocked: boolean) {
    if (this.server) {
      this.server.to(`user_${blockedId}`).emit('user_blocked', {
        blockerId,
        blockedId,
        isBlocked,
      });
      this.server.to(`user_${blockerId}`).emit('user_blocked', {
        blockerId,
        blockedId,
        isBlocked,
      });
    }
  }
}
