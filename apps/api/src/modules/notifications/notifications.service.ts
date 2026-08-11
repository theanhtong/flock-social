import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { MessagesGateway } from '../messages/messages.gateway.js';
import { NotificationType } from '../../generated/prisma/client.js';
import {
  NotificationDto,
  NotificationFeedResponseDto,
  NotificationUserDto,
} from './notifications.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  private formatUser(user: any): NotificationUserDto {
    return {
      id: user.id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || undefined,
    };
  }

  private formatNotification(notif: any): NotificationDto {
    return {
      id: notif.id.toString(),
      receiverId: notif.receiverId.toString(),
      actorId: notif.actorId.toString(),
      actor: notif.actor ? this.formatUser(notif.actor) : (undefined as any),
      type: notif.type,
      entityId: notif.entityId ? notif.entityId.toString() : null,
      isRead: notif.isRead,
      isDeleted: notif.isDeleted,
      createdAt: notif.createdAt.toISOString(),
    };
  }

  async createNotification(params: {
    receiverId: string;
    actorId: string;
    type: NotificationType;
    entityId?: string;
  }): Promise<NotificationDto | null> {
    const { receiverId, actorId, type, entityId } = params;

    // Do not notify self
    if (receiverId === actorId) return null;

    const receiverBigInt = BigInt(receiverId);
    const actorBigInt = BigInt(actorId);

    // Check receiver's user settings to see if this notification type is allowed
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: receiverBigInt },
    });

    if (settings) {
      if (type === NotificationType.like && settings.notifyOnLikes === false) {
        return null;
      }
      if (type === NotificationType.comment && settings.notifyOnComments === false) {
        return null;
      }
      if (
        (type === NotificationType.follow || type === NotificationType.follow_request) &&
        settings.notifyOnFollows === false
      ) {
        return null;
      }
      if (type === NotificationType.repost && settings.notifyOnReposts === false) {
        return null;
      }
    }

    const notifId = this.snowflake.generate();
    const entityBigInt = entityId ? BigInt(entityId) : null;

    const createdNotif = await this.prisma.notification.create({
      data: {
        id: notifId,
        receiverId: receiverBigInt,
        actorId: actorBigInt,
        type,
        entityId: entityBigInt,
      },
      include: {
        actor: true,
      },
    });

    const formatted = this.formatNotification(createdNotif);

    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: receiverBigInt,
        isRead: false,
        isDeleted: false,
      },
    });

    // Broadcast real-time notification to user's room
    if (this.messagesGateway?.server) {
      this.messagesGateway.server
        .to(`user_${receiverId}`)
        .emit('notification_received', {
          notification: formatted,
          unreadCount,
        });
    }

    return formatted;
  }

  async getUserNotifications(
    userId: string,
    category = 'all',
    cursor?: string,
    limit = 20,
  ): Promise<NotificationFeedResponseDto> {
    const userBigInt = BigInt(userId);
    const takeLimit = Math.min(limit, 50);

    const whereClause: any = {
      receiverId: userBigInt,
      isDeleted: false,
    };

    if (category === 'likes') {
      whereClause.type = NotificationType.like;
    } else if (category === 'comments') {
      whereClause.type = NotificationType.comment;
    } else if (category === 'follows') {
      whereClause.type = {
        in: [NotificationType.follow, NotificationType.follow_request],
      };
    } else if (category === 'system' || category === 'reposts') {
      whereClause.type = {
        in: [NotificationType.repost, NotificationType.dm_message],
      };
    }

    const notifs = await this.prisma.notification.findMany({
      where: whereClause,
      take: takeLimit + 1,
      cursor: cursor ? { id: BigInt(cursor) } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: true,
      },
    });

    let nextCursor: string | undefined;
    if (notifs.length > takeLimit) {
      const nextItem = notifs.pop();
      nextCursor = nextItem!.id.toString();
    }

    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: userBigInt,
        isRead: false,
        isDeleted: false,
      },
    });

    const formatted = notifs.map((n) => this.formatNotification(n));

    return {
      notifications: formatted,
      unreadCount,
      nextCursor,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<{ success: boolean; unreadCount: number }> {
    const userBigInt = BigInt(userId);
    const notifBigInt = BigInt(notificationId);

    await this.prisma.notification.updateMany({
      where: {
        id: notifBigInt,
        receiverId: userBigInt,
      },
      data: {
        isRead: true,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: userBigInt,
        isRead: false,
        isDeleted: false,
      },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server
        .to(`user_${userId}`)
        .emit('notification_read', { id: notificationId, unreadCount });
    }

    return { success: true, unreadCount };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; unreadCount: number }> {
    const userBigInt = BigInt(userId);

    await this.prisma.notification.updateMany({
      where: {
        receiverId: userBigInt,
        isRead: false,
        isDeleted: false,
      },
      data: {
        isRead: true,
      },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server
        .to(`user_${userId}`)
        .emit('notification_read_all', { unreadCount: 0 });
    }

    return { success: true, unreadCount: 0 };
  }

  async deleteNotification(userId: string, notificationId: string): Promise<{ success: boolean; unreadCount: number }> {
    const userBigInt = BigInt(userId);
    const notifBigInt = BigInt(notificationId);

    await this.prisma.notification.updateMany({
      where: {
        id: notifBigInt,
        receiverId: userBigInt,
      },
      data: {
        isDeleted: true,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: userBigInt,
        isRead: false,
        isDeleted: false,
      },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server
        .to(`user_${userId}`)
        .emit('notification_deleted', { id: notificationId, unreadCount });
    }

    return { success: true, unreadCount };
  }

  async clearAllNotifications(userId: string): Promise<{ success: boolean }> {
    const userBigInt = BigInt(userId);

    await this.prisma.notification.updateMany({
      where: {
        receiverId: userBigInt,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server
        .to(`user_${userId}`)
        .emit('notification_cleared_all', { unreadCount: 0 });
    }

    return { success: true };
  }
}
