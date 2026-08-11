import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import {
  CreateCommentDto,
  GetCommentsQueryDto,
  UpdateCommentDto,
} from './comments.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GuestGuard } from '../auth/guards/guest.guard.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId')
  createComment(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(postId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(commentId, userId, dto);
  }

  @UseGuards(GuestGuard)
  @Get('posts/:postId')
  getCommentsByPost(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string | undefined,
    @Query() query: GetCommentsQueryDto,
  ) {
    return this.commentsService.getCommentsByPost(postId, userId, query);
  }

  @UseGuards(GuestGuard)
  @Get(':commentId/replies')
  getRepliesByComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string | undefined,
    @Query() query: GetCommentsQueryDto,
  ) {
    return this.commentsService.getRepliesByComment(commentId, userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/like')
  toggleLike(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.toggleLike(commentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.commentsService.deleteComment(commentId, userId);
  }
}
