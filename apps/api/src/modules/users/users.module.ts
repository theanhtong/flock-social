import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SnowflakeModule } from '../../common/snowflake/snowflake.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersController } from './users.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { UserProfileService } from './services/user-profile.service.js';
import { UserSettingsService } from './services/user-settings.service.js';
import { UserFollowService } from './services/user-follow.service.js';
import { UserBlockService } from './services/user-block.service.js';
import { AdminUsersService } from './services/admin-users.service.js';

@Module({
  imports: [AuthModule, SnowflakeModule, NotificationsModule],
  controllers: [UsersController, AdminUsersController],
  providers: [
    AdminUsersService,
    UserProfileService,
    UserSettingsService,
    UserFollowService,
    UserBlockService,
  ],
  exports: [UserProfileService, AdminUsersService],
})
export class UsersModule {}