import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';
import { MessagesGateway } from './messages.gateway.js';
import { AuthModule } from '../auth/auth.module.js';
import { SnowflakeModule } from '../../common/snowflake/snowflake.module.js';

@Module({
  imports: [AuthModule, SnowflakeModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
