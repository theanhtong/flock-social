import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationUserDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export class NotificationDto {
  id: string;
  receiverId: string;
  actorId: string;
  actor: NotificationUserDto;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'follow_request' | 'dm_message' | string;
  entityId?: string | null;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export class NotificationFeedResponseDto {
  notifications: NotificationDto[];
  unreadCount: number;
  nextCursor?: string | null;
}
