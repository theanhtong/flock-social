import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { ALLOW_WHILE_RESTRICTED_KEY } from './allow-while-restricted.decorator.js';
import { UserStatus } from '../../../generated/prisma/enums.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired Access Token');
    }

    const userId = payload.id || payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, status: true, isDeleted: true, role: true },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Account no longer exists');
    }

    const allowWhileRestricted = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHILE_RESTRICTED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isRestricted = user.status === UserStatus.suspended || user.status === UserStatus.banned;

    if (isRestricted && !allowWhileRestricted) {
      const activeSanction = await this.prisma.userSanction.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: { type: true, reason: true, expiresAt: true },
      });

      throw new ForbiddenException({
        message: `Account is ${user.status}`,
        code: 'ACCOUNT_RESTRICTED',
        status: user.status,
        reason: activeSanction?.reason ?? null,
        expiresAt: activeSanction?.expiresAt ?? null,
      });
    }

    request.user = { ...payload, id: userId, role: user.role, status: user.status };
    return true;
  }
}