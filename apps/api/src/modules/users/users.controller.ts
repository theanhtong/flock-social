import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserProfileService } from './services/user-profile.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SearchUsersQueryDto, UpdateProfileDto, UserProfileDto } from './users.dto.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly userProfileService: UserProfileService,
  ) {}

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
}
