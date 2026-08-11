import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImageResult {
  optimizedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  format: string;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  async processImage(fileBuffer: Buffer): Promise<ProcessedImageResult> {
    try {
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();

      const width = metadata.width || 800;
      const height = metadata.height || 600;

      // 1. Optimized WebP version (max 1920px width/height)
      const optimizedBuffer = await sharp(fileBuffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Thumbnail WebP version (300x300 cover)
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'centre',
        })
        .webp({ quality: 75 })
        .toBuffer();

      return {
        optimizedBuffer,
        thumbnailBuffer,
        width,
        height,
        format: 'webp',
      };
    } catch (err: any) {
      this.logger.error(`Failed to process image with Sharp: ${err.message}`, err.stack);
      throw err;
    }
  }
}
