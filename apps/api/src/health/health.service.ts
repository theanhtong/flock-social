import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { RedisService } from '../common/redis/redis.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkHealth() {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    const dbUp = dbResult.status === 'fulfilled';
    const redisUp = redisResult.status === 'fulfilled';
    const allUp = dbUp && redisUp;

    return {
      status: allUp ? 'ok' : 'degraded',
      database: dbUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}