import { jest, describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service.js';
import { MessagesGateway } from '../messages/messages.gateway.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { NotificationType } from '../../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';

const snowflake = new SnowflakeService(new ConfigService());
const RECEIVER_ID = snowflake.generateString();
const ACTOR_ID = snowflake.generateString();
const NOTIF_ID = snowflake.generateString();

function makeNotification(overrides: any = {}) {
  return {
    id: BigInt(NOTIF_ID),
    receiverId: BigInt(RECEIVER_ID),
    actorId: BigInt(ACTOR_ID),
    type: NotificationType.like,
    entityId: null,
    isRead: false,
    isDeleted: false,
    createdAt: new Date(),
    actor: {
      id: BigInt(ACTOR_ID),
      username: 'actoruser',
      displayName: 'Actor User',
      avatarUrl: null,
    },
    ...overrides,
  };
}

function makeMockPrisma() {
  const notif = makeNotification();
  return {
    userSettings: {
      findUnique: jest.fn<any>().mockResolvedValue(null),
    },
    notification: {
      create: jest.fn<any>().mockResolvedValue(notif),
      findMany: jest.fn<any>().mockResolvedValue([notif]),
      count: jest.fn<any>().mockResolvedValue(1),
      updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    },
  };
}

const mockMessagesGateway = {
  server: {
    to: jest.fn<any>().mockReturnValue({
      emit: jest.fn<any>(),
    }),
  },
};

async function makeService(mockPrisma = makeMockPrisma()) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationsService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: SnowflakeService, useValue: snowflake },
      { provide: MessagesGateway, useValue: mockMessagesGateway },
    ],
  }).compile();

  return module.get<NotificationsService>(NotificationsService);
}

describe('NotificationsService', () => {
  it('should be defined', async () => {
    const service = await makeService();
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should not notify self', async () => {
      const service = await makeService();

      const result = await service.createNotification({
        receiverId: ACTOR_ID,
        actorId: ACTOR_ID,
        type: NotificationType.like,
      });

      expect(result).toBeNull();
    });

    it('should respect receiver settings if notifyOnLikes is false', async () => {
      const prisma = makeMockPrisma();
      prisma.userSettings.findUnique = jest.fn<any>().mockResolvedValue({ notifyOnLikes: false });
      const service = await makeService(prisma);

      const result = await service.createNotification({
        receiverId: RECEIVER_ID,
        actorId: ACTOR_ID,
        type: NotificationType.like,
      });

      expect(result).toBeNull();
    });

    it('should create and broadcast notification when valid', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.createNotification({
        receiverId: RECEIVER_ID,
        actorId: ACTOR_ID,
        type: NotificationType.like,
      });

      expect(prisma.notification.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.type).toBe(NotificationType.like);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notification feed and unread count', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.getUserNotifications(RECEIVER_ID, 'all');

      expect(prisma.notification.findMany).toHaveBeenCalled();
      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return updated unread count', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.markAsRead(RECEIVER_ID, NOTIF_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalled();
      expect(result).toEqual({ success: true, unreadCount: 1 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.markAllAsRead(RECEIVER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalled();
      expect(result).toEqual({ success: true, unreadCount: 0 });
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete notification', async () => {
      const prisma = makeMockPrisma();
      const service = await makeService(prisma);

      const result = await service.deleteNotification(RECEIVER_ID, NOTIF_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
