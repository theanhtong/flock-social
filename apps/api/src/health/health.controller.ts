import { Controller, Get, Res } from '@nestjs/common';
import { HealthService } from './health.service.js';
import type { Response } from 'express';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/ready')
  async health(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.checkHealth();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
