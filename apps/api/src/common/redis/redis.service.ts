import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
  const redisUrl = this.configService.get<string>('REDIS_URL');

  if (redisUrl) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    this.logger.log('Connected to Redis via REDIS_URL');
  } else {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = Number(this.configService.get<number>('REDIS_PORT'));
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const username = this.configService.get<string>('REDIS_USERNAME');

    this.client = new Redis({
      host,
      port,
      username,
      password,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    this.logger.log(`Connecting to Redis Server at ${host}:${port}`);
  }

  this.client.on('error', (err) => {
    this.logger.error('Redis Client Error: ' + err.message);
  });

  try {
    await this.client.connect();
    this.logger.log('Redis connected successfully');
  } catch (err) {
    this.logger.error('Failed initial Redis connection: ' + err.message);
  }
}

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected.');
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!members.length) return 0;
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
