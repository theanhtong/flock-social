import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import path from 'path';
import { MediaStatus, MediaType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { VideoQueueProcessor } from './queues/video-queue.processor.js';
import { S3StorageService } from './services/s3-storage.service.js';

export interface UploadResponse {
  mediaId: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly s3Storage: S3StorageService,
    private readonly videoQueueProcessor: VideoQueueProcessor,
  ) {}

  async uploadFile(file: Express.Multer.File, uploaderId?: string): Promise<UploadResponse> {
    if (!file) throw new BadRequestException('No file provided');

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const isVideo = file.mimetype.startsWith('video/');
    const mediaIdBigInt = this.snowflake.generate();
    const mediaId = mediaIdBigInt.toString();

    const key = isVideo
      ? `uploads/raw/${mediaId}${ext}`
      : `uploads/${Date.now()}-${randomUUID()}${ext}`;

    const url = await this.s3Storage.uploadBuffer(key, file.buffer, file.mimetype);

    let fallbackUserId = uploaderId;
    if (!fallbackUserId) {
      const firstUser = await this.prisma.user.findFirst();
      fallbackUserId = firstUser?.id?.toString() || '1';
    }

    const mediaRecord = await this.prisma.media.create({
      data: {
        id: mediaIdBigInt,
        uploaderId: BigInt(fallbackUserId),
        mediaType: isVideo ? MediaType.video : MediaType.image,
        originalUrl: url,
        status: isVideo ? MediaStatus.pending : MediaStatus.ready,
      },
    });

    if (isVideo) {
      // Trigger background transcoding job
      await this.videoQueueProcessor.addJob(mediaId, key).catch((err) => {
        this.logger.error(`Failed to add video transcoding job: ${err?.message}`);
      });
    }

    return {
      mediaId,
      url,
      filename: key,
      mimetype: file.mimetype,
      size: file.size,
      status: isVideo ? 'pending' : 'ready',
      hlsManifestUrl: mediaRecord.hlsManifestUrl,
      thumbnailUrl: mediaRecord.thumbnailUrl,
    };
  }

  async uploadMultipleFiles(files: Express.Multer.File[], uploaderId?: string): Promise<UploadResponse[]> {
    if (!files || files.length === 0) throw new BadRequestException('No files provided');
    return Promise.all(files.map((file) => this.uploadFile(file, uploaderId)));
  }
}
