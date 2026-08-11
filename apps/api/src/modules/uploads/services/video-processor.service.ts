import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs/promises';
import path from 'path';

const resolvedFfmpegPath = (typeof ffmpegPath === 'string' ? ffmpegPath : (ffmpegPath as any)?.default) as string;
if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

const resolvedFfprobePath = (typeof ffprobePath === 'object' && ffprobePath?.path ? ffprobePath.path : ffprobePath) as string;
if (resolvedFfprobePath) {
  ffmpeg.setFfprobePath(resolvedFfprobePath);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface TranscodeResult {
  outputDir: string;
  masterManifestPath: string;
  thumbnailPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  allFiles: string[];
}

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);

  async getMetadata(inputFilePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const videoStream = metadata?.streams?.find((s) => s.codec_type === 'video');
        const duration = Math.round(metadata?.format?.duration || 0);
        const width = videoStream?.width || 1280;
        const height = videoStream?.height || 720;

        resolve({ duration, width, height });
      });
    });
  }

  async generateThumbnail(inputFilePath: string, outputJpgPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .screenshots({
          count: 1,
          timestamps: ['10%'],
          filename: path.basename(outputJpgPath),
          folder: path.dirname(outputJpgPath),
          size: '640x360',
        })
        .on('end', () => resolve(outputJpgPath))
        .on('error', (err) => reject(err));
    });
  }

  async transcodeToHls(inputFilePath: string, tempOutputDir: string): Promise<TranscodeResult> {
    await fs.mkdir(tempOutputDir, { recursive: true });

    const metadata = await this.getMetadata(inputFilePath).catch(() => ({
      duration: 0,
      width: 1280,
      height: 720,
    }));

    const thumbnailPath = path.join(tempOutputDir, 'thumbnail.jpg');
    await this.generateThumbnail(inputFilePath, thumbnailPath).catch((err) => {
      this.logger.warn(`Failed to generate thumbnail for ${inputFilePath}: ${err?.message}`);
    });

    const isHighRes = metadata.height >= 720;

    // Transcode 480p stream
    const p480Dir = path.join(tempOutputDir, '480p');
    await fs.mkdir(p480Dir, { recursive: true });
    await this.transcodeVariant(inputFilePath, p480Dir, '854x480', '1000k', '128k');

    let is720pCreated = false;
    if (isHighRes) {
      const p720Dir = path.join(tempOutputDir, '720p');
      await fs.mkdir(p720Dir, { recursive: true });
      await this.transcodeVariant(inputFilePath, p720Dir, '1280x720', '2500k', '192k')
        .then(() => {
          is720pCreated = true;
        })
        .catch((err) => {
          this.logger.warn(`Failed to generate 720p variant: ${err?.message}`);
          is720pCreated = false;
        });
    }

    // Generate master.m3u8 manifest
    const masterManifestPath = path.join(tempOutputDir, 'master.m3u8');
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';

    masterContent += '#EXT-X-STREAM-INF:BANDWIDTH=1128000,RESOLUTION=854x480\n480p/index.m3u8\n';

    if (is720pCreated) {
      masterContent += '#EXT-X-STREAM-INF:BANDWIDTH=2692000,RESOLUTION=1280x720\n720p/index.m3u8\n';
    }

    await fs.writeFile(masterManifestPath, masterContent, 'utf-8');

    const allFiles = await this.listAllFiles(tempOutputDir);

    return {
      outputDir: tempOutputDir,
      masterManifestPath,
      thumbnailPath: (await this.fileExists(thumbnailPath)) ? thumbnailPath : '',
      durationSeconds: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      allFiles,
    };
  }

  private transcodeVariant(
    inputFilePath: string,
    outputDir: string,
    resolution: string,
    videoBitrate: string,
    audioBitrate: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .outputOptions([
          `-s ${resolution}`,
          `-b:v ${videoBitrate}`,
          `-b:a ${audioBitrate}`,
          '-c:v libx264',
          '-c:a aac',
          '-pix_fmt yuv420p',
          '-preset ultrafast',
          '-g 48',
          '-sc_threshold 0',
          '-hls_time 4',
          '-hls_playlist_type vod',
          `-hls_segment_filename ${path.join(outputDir, 'segment_%03d.ts')}`,
        ])
        .output(path.join(outputDir, 'index.m3u8'))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private async listAllFiles(dir: string): Promise<string[]> {
    let results: string[] = [];
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const subFiles = await this.listAllFiles(fullPath);
        results = results.concat(subFiles);
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
