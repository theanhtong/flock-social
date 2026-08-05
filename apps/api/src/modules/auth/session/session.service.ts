import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { SnowflakeService } from '../../../common/snowflake/snowflake.service.js';
import { SessionValidationResult } from './session.enum.js';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly TTL_SECONDS = 7 * 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly snowflake: SnowflakeService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async save(userId: string, sessionId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);

    // db is the source of truth — this write must succeed
    await this.prisma.session.upsert({
      where: { sessionId },
      create: {
        id: this.snowflake.generate(),
        userId: BigInt(userId),
        sessionId,
        refreshTokenHash: tokenHash,
        expiresAt,
      },
      update: {
        refreshTokenHash: tokenHash,
        expiresAt,
      },
    });

    // redis is just a cache — failures here are non-fatal
    try {
      await this.redis.set(`session:${userId}:${sessionId}`, tokenHash, this.TTL_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Redis cache write failed for session ${sessionId}: ${err.message}`);
    }
  }

  async validate(
    userId: string,
    sessionId: string,
    submittedToken: string,
  ): Promise<SessionValidationResult> {
    const tokenHash = this.hashToken(submittedToken);

    // try redis first
    try {
      const cached = await this.redis.get(`session:${userId}:${sessionId}`);
      if (cached) {
        return cached === tokenHash
          ? SessionValidationResult.VALID
          : SessionValidationResult.MISMATCH;
      }
    } catch (err: any) {
      this.logger.warn(`Redis read failed, falling back to DB: ${err.message}`);
    }

    // fallback to db when redis misses or is unavailable
    const session = await this.prisma.session.findUnique({ where: { sessionId } });

    if (!session || session.expiresAt < new Date()) {
      return SessionValidationResult.NOT_FOUND;
    }

    return session.refreshTokenHash === tokenHash
      ? SessionValidationResult.VALID
      : SessionValidationResult.MISMATCH;
  }

  async revoke(sessionId: string) {
    const session = await this.prisma.session
      .findUnique({ where: { sessionId } })
      .catch(() => null);

    await this.prisma.session.delete({ where: { sessionId } }).catch(() => {});

    if (session) {
      try {
        await this.redis.del(`session:${session.userId}:${sessionId}`);
      } catch (err: any) {
        this.logger.warn(`Redis cache delete failed for session ${sessionId}: ${err.message}`);
      }
    }
  }

  async revokeAllSessions(): Promise<number> {
  const { count } = await this.prisma.session.deleteMany({});
  try {
    const keys = await this.redis.client.keys('session:*');
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
  } catch (err: any) {
    this.logger.warn(`Redis cache flush failed during revokeAllSessions: ${err.message}`);
  }

  return count; 
}
}