import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { MediaStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { VideoProcessorService } from '../services/video-processor.service.js';
import { S3StorageService } from '../services/s3-storage.service.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface VideoJobData {
  mediaId: string;
  rawKey: string;
}

@Injectable()
export class VideoQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoQueueProcessor.name);
  private queue: Queue<VideoJobData>;
  private worker: Worker<VideoJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly videoProcessor: VideoProcessorService,
    private readonly s3Storage: S3StorageService
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);

    const connection = { host: redisHost, port: redisPort };

    this.queue = new Queue<VideoJobData>('video-transcoding', { connection });

    this.worker = new Worker<VideoJobData>(
      'video-transcoding',
      async (job: Job<VideoJobData>) => {
        await this.processVideoJob(job);
      },
      { connection, concurrency: 2 }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Video job ${job?.id} failed: ${err.message}`, err.stack);
    });
  }

  onModuleInit() {}

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }

  async addJob(mediaId: string, rawKey: string) {
    await this.queue.add('transcode', { mediaId, rawKey }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 }
    });
    this.logger.log(`Added video transcoding job for media ${mediaId}`);
  }

  private async processVideoJob(job: Job<VideoJobData>) {
    const { mediaId, rawKey } = job.data;
    this.logger.log(`Starting video transcoding for mediaId: ${mediaId}`);

    const tempDir = path.join(os.tmpdir(), `video-${mediaId}-${Date.now()}`);
    const rawFilePath = path.join(tempDir, 'raw.mp4');
    const hlsOutputDir = path.join(tempDir, 'hls');

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Update status to processing
      await this.prisma.media.update({
        where: { id: BigInt(mediaId) },
        data: { status: MediaStatus.processing },
      });

      // Download raw video from MinIO
      await this.s3Storage.downloadFileToDisk(rawKey, rawFilePath);

      // Transcode video to HLS
      const result = await this.videoProcessor.transcodeToHls(rawFilePath, hlsOutputDir);

      // Upload HLS output & thumbnail to MinIO
      const prefix = `hls/${mediaId}`;
      const uploadedUrls = await this.s3Storage.uploadDirectoryToMinIO(hlsOutputDir, prefix);

      const masterManifestUrl = uploadedUrls.get('master.m3u8') || `${this.s3Storage.getPublicUrl()}/${prefix}/master.m3u8`;
      const thumbnailUrl = uploadedUrls.get('thumbnail.jpg') || (result.thumbnailPath ? `${this.s3Storage.getPublicUrl()}/${prefix}/thumbnail.jpg` : null);

      // Update Media record in DB
      await this.prisma.media.update({
        where: { id: BigInt(mediaId) },
        data: {
          hlsManifestUrl: masterManifestUrl,
          thumbnailUrl,
          durationSeconds: result.durationSeconds,
          width: result.width,
          height: result.height,
          status: MediaStatus.ready,
        },
      });

      this.logger.log(`Completed video transcoding for media ${mediaId}. HLS: ${masterManifestUrl}`);
    } catch (err: any) {
      this.logger.error(`Error processing video media ${mediaId}: ${err.message}`, err.stack);
      await this.prisma.media.update({
        where: { id: BigInt(mediaId) },
        data: { status: MediaStatus.failed },
      }).catch(() => {});
      throw err;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
