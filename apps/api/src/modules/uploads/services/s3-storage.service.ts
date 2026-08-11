import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || 'minio_user';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || 'minio_pass';
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';

    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'flock-social-media';
    this.publicUrl = this.configService.get<string>('S3_PUBLIC_URL') || `${endpoint}/${this.bucketName}`;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  getPublicUrl(): string {
    return this.publicUrl;
  }

  private async ensureBucketExists() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket '${this.bucketName}' exists.`);
    } catch (err: any) {
      this.logger.log(`Bucket '${this.bucketName}' not found or error. Creating bucket...`);
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket '${this.bucketName}' created successfully.`);

        const readPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };

        await this.s3Client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucketName,
            Policy: JSON.stringify(readPolicy),
          }),
        );
        this.logger.log(`Bucket '${this.bucketName}' policy set to public read.`);
      } catch (createErr) {
        this.logger.error(`Failed to create bucket '${this.bucketName}'`, createErr);
      }
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async downloadFileToDisk(key: string, localFilePath: string): Promise<void> {
    await fs.mkdir(path.dirname(localFilePath), { recursive: true });
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;
    const writeStream = fsSync.createWriteStream(localFilePath);
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  async uploadDirectoryToMinIO(dirPath: string, s3Prefix: string): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();
    const files = await this.listAllFiles(dirPath);

    for (const filePath of files) {
      const relativePath = path.relative(dirPath, filePath).replace(/\\/g, '/');
      const key = `${s3Prefix}/${relativePath}`;
      const fileBuffer = await fs.readFile(filePath);

      let contentType = 'application/octet-stream';
      if (filePath.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
      else if (filePath.endsWith('.ts')) contentType = 'video/MP2T';
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filePath.endsWith('.png')) contentType = 'image/png';

      await this.uploadBuffer(key, fileBuffer, contentType);

      const publicUrl = `${this.publicUrl}/${key}`;
      resultMap.set(relativePath, publicUrl);
    }

    return resultMap;
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
}
