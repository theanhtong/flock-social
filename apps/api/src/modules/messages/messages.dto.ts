import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Text content of the message' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ description: 'Array of media attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'ID of message being replied to' })
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional({ description: 'ID of message being replied to' })
  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'ID of post being shared in message' })
  @IsOptional()
  @IsString()
  sharePostId?: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({ description: 'Title of the group conversation' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Usernames of group members (must follow group owner)' })
  @IsArray()
  @IsString({ each: true })
  memberUsernames: string[];

  @ApiPropertyOptional({ description: 'Optional group avatar image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateGroupConversationDto {
  @ApiPropertyOptional({ description: 'New title of the group' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'New group avatar image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'Role to assign to member (owner, admin, monitor, member)' })
  @IsEnum(['owner', 'admin', 'monitor', 'member'])
  role: 'owner' | 'admin' | 'monitor' | 'member';
}

export class MoveConversationDto {
  @ApiProperty({ description: 'Folder to move conversation to (primary, general, main, pending)' })
  @IsEnum(['primary', 'general', 'main', 'pending'])
  folder: 'primary' | 'general' | 'main' | 'pending';
}

export class ReactMessageDto {
  @ApiProperty({ description: 'Emoji character for reaction' })
  @IsNotEmpty()
  @IsString()
  emoji: string;
}

export interface UserProfileDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  birthDate?: string | null;
  links?: any;
  role?: string;
  status?: string;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isOnline?: boolean;
  createdAt?: string;
}

export interface MessageReactionDto {
  id?: string;
  emoji: string;
  userId: string;
  user?: UserProfileDto;
}

export interface DirectMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: UserProfileDto;
  content?: string | null;
  mediaUrl?: string;
  mediaUrls?: string[];
  media?: any[];
  messageType: string;
  replyToId?: string | null;
  replyToMessageId?: string | null;
  replyToMessage?: DirectMessageDto | null;
  replyTo?: DirectMessageDto | null;
  sharePostId?: string;
  sharedPost?: any;
  reactions?: MessageReactionDto[];
  isUnsent?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationMemberDto {
  id: string;
  conversationId: string;
  userId: string;
  user: UserProfileDto;
  role: string;
  status: string;
  joinedAt: string;
  lastReadMessageId?: string | null;
}

export interface ConversationDto {
  id: string;
  type: 'direct' | 'group';
  title?: string | null;
  avatarUrl?: string | null;
  folder: string;
  messageRequestStatus?: string;
  requestStatus?: string;
  isMuted?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByOther?: boolean;
  unreadCount?: number;
  lastMessageContent?: string;
  lastMessageAt?: string;
  lastMessage?: DirectMessageDto | null;
  members?: ConversationMemberDto[];
  participants?: any[];
  otherUser?: UserProfileDto;
  myStatus?: string;
  myRole?: string;
  status?: string;
  groupStatus?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ConversationFeedResponseDto {
  conversations: ConversationDto[];
  nextCursor?: string | null;
}

export interface MessageFeedResponseDto {
  messages: DirectMessageDto[];
  nextCursor?: string | null;
}
