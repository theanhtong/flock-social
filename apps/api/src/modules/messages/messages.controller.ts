import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  SendMessageDto,
  CreateGroupConversationDto,
  UpdateGroupConversationDto,
  UpdateMemberRoleDto,
  MoveConversationDto,
  ReactMessageDto,
} from './messages.dto.js';

@ApiTags('Messages')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get conversations filtered by folder with cursor pagination' })
  async getUserConversations(
    @CurrentUser('id') userId: string,
    @Query('folder') folder?: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.messagesService.getUserConversations(userId, folder, cursor, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Get or create direct conversation with username' })
  async getOrCreateConversation(
    @CurrentUser('id') userId: string,
    @Body('targetUsername') targetUsername: string,
  ) {
    return this.messagesService.getOrCreateConversation(userId, targetUsername);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a new group conversation' })
  async createGroupConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.messagesService.createGroupConversation(
      userId,
      dto.title,
      dto.memberUsernames,
      dto.avatarUrl,
      'private',
    );
  }

  @Get('search-groups')
  @ApiOperation({ summary: 'Search group conversations by title' })
  async searchGroupConversations(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
  ) {
    return this.messagesService.searchGroupConversations(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single conversation details by ID' })
  async getConversationById(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.getConversationById(userId, conversationId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a public group conversation directly' })
  async joinGroupConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.joinGroupConversation(userId, conversationId);
  }

  @Post(':id/request-join-group')
  @ApiOperation({ summary: 'Request to join an approval-required public group' })
  async requestJoinGroupConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.requestJoinGroupConversation(userId, conversationId);
  }

  @Post(':id/accept-request')
  @ApiOperation({ summary: 'Accept a message request' })
  async acceptMessageRequest(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.acceptMessageRequest(userId, conversationId);
  }

  @Post(':id/reject-request')
  @ApiOperation({ summary: 'Reject/Decline a message request' })
  async rejectMessageRequest(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.rejectMessageRequest(userId, conversationId);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move conversation between primary and general folders' })
  async moveConversationFolder(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: MoveConversationDto,
  ) {
    return this.messagesService.moveConversationFolder(userId, conversationId, dto.folder);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get message history of a conversation with cursor pagination' })
  async getConversationMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit = 30,
  ) {
    return this.messagesService.getConversationMessages(userId, conversationId, cursor, limit);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send direct or group message in a conversation' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(userId, conversationId, dto);
  }

  @Delete(':id/messages/:messageId')
  @ApiOperation({ summary: 'Unsend a message for everyone' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.deleteMessage(userId, conversationId, messageId);
  }

  @Post(':id/messages/:messageId/react')
  @ApiOperation({ summary: 'React to a message with an emoji' })
  async reactToMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.messagesService.reactToMessage(userId, conversationId, messageId, dto.emoji);
  }

  @Delete(':id/messages/:messageId/react')
  @ApiOperation({ summary: 'Remove reaction from a message' })
  async removeReaction(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.removeReaction(userId, conversationId, messageId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  async markConversationAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body('lastReadMessageId') lastReadMessageId?: string,
  ) {
    return this.messagesService.markConversationAsRead(userId, conversationId, lastReadMessageId);
  }

  @Patch(':id/group')
  @ApiOperation({ summary: 'Update group title or avatar' })
  async updateGroupConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: UpdateGroupConversationDto,
  ) {
    return this.messagesService.updateGroupConversation(userId, conversationId, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a group conversation' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body('memberId') memberId: string,
  ) {
    return this.messagesService.addMember(userId, memberId, conversationId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a group conversation' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.messagesService.removeMember(userId, conversationId, memberId);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (owner, admin, member)' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.messagesService.updateMemberRole(userId, conversationId, memberId, dto.role);
  }

  @Patch(':id/members/:memberId/mute')
  @ApiOperation({ summary: 'Mute or restrict a member from sending messages in group' })
  async toggleMemberMute(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
    @Body('isMuted') isMuted: boolean,
  ) {
    return this.messagesService.toggleMemberMute(userId, conversationId, memberId, isMuted);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave group conversation' })
  async leaveGroup(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.removeMember(userId, conversationId, userId);
  }

  @Post(':id/mute')
  @ApiOperation({ summary: 'Mute or unmute notifications for conversation' })
  async toggleMute(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body('isMuted') isMuted: boolean,
  ) {
    return this.messagesService.toggleMuteConversation(userId, conversationId, isMuted);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or clear conversation for current user' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.deleteConversation(userId, conversationId);
  }
}
