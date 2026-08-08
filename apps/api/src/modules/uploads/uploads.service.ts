import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
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

  private async ensureBucketExists() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket '${this.bucketName}' exists.`);
    } catch (err: any) {
      this.logger.log(`Bucket '${this.bucketName}' not found or error. Creating bucket...`);
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket '${this.bucketName}' created successfully.`);

        // set public read policy
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

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
    if (!file) throw new BadRequestException('No file provided');

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const key = `uploads/${Date.now()}-${randomUUID()}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    return {
      url,
      filename: key,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<{ url: string; filename: string; mimetype: string; size: number }[]> {
    if (!files || files.length === 0) throw new BadRequestException('No files provided');
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }
}
