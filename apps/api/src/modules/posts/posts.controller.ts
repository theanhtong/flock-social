import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GuestGuard } from '../auth/guards/guest.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreatePostDto, UpdatePostDto } from './posts.dto.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(userId, dto);
  }

  @Get()
  @UseGuards(GuestGuard)
  getPosts(
    @CurrentUser('id') userId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.postsService.getPosts(userId, cursor, limit);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  getUserBookmarks(@CurrentUser('id') userId: string) {
    return this.postsService.getUserBookmarks(userId);
  }

  @Get('user/:username')
  @UseGuards(GuestGuard)
  getUserPosts(
    @Param('username') username: string,
    @CurrentUser('id') currentUserId?: string,
    @Query('tab') tab?: 'posts' | 'replies' | 'likes',
  ) {
    return this.postsService.getUserPosts(username, currentUserId, tab);
  }

  @Get(':id/comments')
  @UseGuards(GuestGuard)
  getPostComments(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.postsService.getPostComments(id, currentUserId);
  }

  @Get(':id')
  @UseGuards(GuestGuard)
  getPostById(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.postsService.getPostById(id, currentUserId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(userId, postId, dto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.postsService.toggleLike(userId, postId);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.postsService.toggleBookmark(userId, postId);
  }

  @Post(':id/view')
  @UseGuards(GuestGuard)
  incrementViews(
    @Param('id') postId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.postsService.incrementViews(postId, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.postsService.deletePost(userId, postId);
  }
}
