import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserProfileService } from './services/user-profile.service.js';
import { UserSettingsService } from './services/user-settings.service.js';
import { UserFollowService } from './services/user-follow.service.js';
import { UserBlockService } from './services/user-block.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  SearchUsersQueryDto,
  UpdateProfileDto,
  UserProfileDto,
  UpdateUserSettingDto,
} from './users.dto.js';
import { AllowWhileRestricted } from '../auth/guards/allow-while-restricted.decorator.js';

@ApiTags('Users')
@AllowWhileRestricted()
@Controller('users')
export class UsersController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userSettingsService: UserSettingsService,
    private readonly userFollowService: UserFollowService,
    private readonly userBlockService: UserBlockService,
  ) { }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.userProfileService.getMyProfile(userId);
  }



  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userProfileService.updateProfile(userId, dto);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get profile by username' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getProfileByUsername(@Param('username') username: string) {
    return this.userProfileService.getProfileByUsername(username);
  }

  @Get('search/query')
  @ApiOperation({ summary: 'Search users' })
  @ApiResponse({ status: 200 })
  async searchUsers(
    @Query() queryDto: SearchUsersQueryDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.userProfileService.searchUsers(queryDto, userId);
  }

  @Get('me/restriction-status')
  @UseGuards(JwtAuthGuard)
  @AllowWhileRestricted()
  @ApiBearerAuth()
  async getMyRestrictionStatus(@CurrentUser('id') userId: string) {
    return this.userProfileService.getMyRestrictionStatus(userId);
  }

  @Get('me/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user settings' })
  @ApiResponse({ status: 200, description: 'Settings returned successfully.' })
  async getUserSettings(@CurrentUser('id') userId: string) {
    return this.userSettingsService.getUserSettings(userId);
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  async updateConfiguration(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserSettingDto,
  ) {
    return this.userSettingsService.updateConfiguration(userId, dto);
  }

  @Get('me/follow-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending follow requests for current user' })
  @ApiResponse({ status: 200, description: 'Follow requests returned.' })
  async getPendingFollowRequests(@CurrentUser('id') userId: string) {
    return this.userFollowService.getPendingFollowRequests(userId);
  }

  @Post('follow-requests/:requesterId/:action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject a pending follow request' })
  @ApiResponse({ status: 200, description: 'Follow request processed.' })
  async respondFollowRequest(
    @CurrentUser('id') userId: string,
    @Param('requesterId') requesterId: string,
    @Param('action') action: 'accept' | 'reject',
  ) {
    return this.userFollowService.respondFollowRequest(
      userId,
      requesterId,
      action,
    );
  }

  @Get(':username/follow-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get follow status with another user' })
  @ApiResponse({ status: 200, description: 'Follow status returned.' })
  async getFollowStatus(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.userFollowService.getFollowStatus(userId, username);
  }

  @Post(':username/toggle-follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow or unfollow a user' })
  @ApiResponse({ status: 200, description: 'Follow state toggled.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot follow yourself or blocked.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async toggleFollow(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.userFollowService.toggleFollow(userId, username);
  }

  @Delete(':username/followers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a follower from current user' })
  @ApiResponse({ status: 200, description: 'Follower removed successfully.' })
  async removeFollower(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.userFollowService.removeFollower(userId, username);
  }

  @Get(':username/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({ status: 200, description: 'Followers returned successfully.' })
  async getUserFollowers(@Param('username') username: string) {
    return this.userFollowService.getUserFollowers(username);
  }

  @Get(':username/following')
  @ApiOperation({ summary: 'Get users a user is following' })
  @ApiResponse({ status: 200, description: 'Following list returned.' })
  async getUserFollowing(@Param('username') username: string) {
    return this.userFollowService.getUserFollowing(username);
  }

  @Get(':username/block-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get block status with another user' })
  @ApiResponse({ status: 200, description: 'Block status returned.' })
  async getBlockStatus(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.userBlockService.getBlockStatus(userId, username);
  }

  @Post(':username/toggle-block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block or unblock a user' })
  @ApiResponse({ status: 200, description: 'Block state toggled.' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async toggleBlock(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.userBlockService.toggleBlock(userId, username);
  }

}
