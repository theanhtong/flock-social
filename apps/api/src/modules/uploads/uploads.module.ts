import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { SnowflakeModule } from '../../common/snowflake/snowflake.module.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';
import { S3StorageService } from './services/s3-storage.service.js';
import { VideoProcessorService } from './services/video-processor.service.js';
import { VideoQueueProcessor } from './queues/video-queue.processor.js';

@Module({
  imports: [AuthModule, PrismaModule, SnowflakeModule],
  controllers: [UploadsController],
  providers: [S3StorageService, VideoProcessorService, VideoQueueProcessor, UploadsService],
  exports: [S3StorageService, VideoProcessorService, VideoQueueProcessor, UploadsService],
})
export class UploadsModule {}
