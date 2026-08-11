import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [AuthModule, MessagesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
