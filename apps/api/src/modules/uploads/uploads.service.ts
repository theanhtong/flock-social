import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import path from 'path';
import { MediaStatus, MediaType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SnowflakeService } from '../../common/snowflake/snowflake.service.js';
import { VideoQueueProcessor } from './queues/video-queue.processor.js';
import { S3StorageService } from './services/s3-storage.service.js';
import { ImageProcessorService } from './services/image-processor.service.js';

export interface UploadResponse {
  mediaId: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  hlsManifestUrl?: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly s3Storage: S3StorageService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly videoQueueProcessor: VideoQueueProcessor,
  ) {}

  async uploadFile(file: Express.Multer.File, uploaderId?: string): Promise<UploadResponse> {
    if (!file) throw new BadRequestException('No file provided');

    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    const mediaIdBigInt = this.snowflake.generate();
    const mediaId = mediaIdBigInt.toString();

    let fallbackUserId = uploaderId;
    if (!fallbackUserId) {
      const firstUser = await this.prisma.user.findFirst();
      fallbackUserId = firstUser?.id?.toString() || '1';
    }

    if (isImage) {
      // Process Image: Convert to WebP + generate 300x300 thumbnail
      try {
        const imageRes = await this.imageProcessor.processImage(file.buffer);

        const imageKey = `uploads/images/${mediaId}.webp`;
        const thumbKey = `uploads/images/thumb_${mediaId}.webp`;

        const optimizedUrl = await this.s3Storage.uploadBuffer(imageKey, imageRes.optimizedBuffer, 'image/webp');
        const thumbnailUrl = await this.s3Storage.uploadBuffer(thumbKey, imageRes.thumbnailBuffer, 'image/webp');

        const mediaRecord = await this.prisma.media.create({
          data: {
            id: mediaIdBigInt,
            uploaderId: BigInt(fallbackUserId),
            mediaType: MediaType.image,
            originalUrl: optimizedUrl,
            thumbnailUrl,
            width: imageRes.width,
            height: imageRes.height,
            status: MediaStatus.ready,
          },
        });

        return {
          mediaId,
          url: optimizedUrl,
          filename: imageKey,
          mimetype: 'image/webp',
          size: imageRes.optimizedBuffer.length,
          status: 'ready',
          thumbnailUrl: mediaRecord.thumbnailUrl,
          width: imageRes.width,
          height: imageRes.height,
        };
      } catch (err: any) {
        this.logger.warn(`Sharp image optimization failed, falling back to raw upload: ${err?.message}`);
        // Fallback to raw upload if Sharp fails
      }
    }

    // Default Raw / Video Upload logic
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const key = isVideo
      ? `uploads/raw/${mediaId}${ext}`
      : `uploads/raw/${Date.now()}-${randomUUID()}${ext}`;

    const url = await this.s3Storage.uploadBuffer(key, file.buffer, file.mimetype);

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
