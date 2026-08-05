import { Module } from '@nestjs/common';
import { SessionService } from './session.service.js';
import { RedisModule } from '../../../common/redis/redis.module.js';
import { PrismaModule } from '../../../common/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}