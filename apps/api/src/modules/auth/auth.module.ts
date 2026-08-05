import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { SessionModule } from './session/session.module.js';
import { MailModule } from '../../common/mail/mail.module.js';
import { SnowflakeModule } from '../../common/snowflake/snowflake.module.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.register({}),
    SessionModule,
    MailModule,
    SnowflakeModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}