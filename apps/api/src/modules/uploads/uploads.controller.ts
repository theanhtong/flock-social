import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Req,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UploadsService } from './uploads.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @ApiOperation({ summary: 'Upload a single file to MinIO' })
  @ApiQuery({ name: 'folder', required: false, enum: ['posts', 'users', 'avatars', 'banners', 'messages'] })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const uploaderId = req.user?.id ? req.user.id.toString() : undefined;
    return this.uploadsService.uploadFile(file, uploaderId, folder);
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files to MinIO' })
  @ApiQuery({ name: 'folder', required: false, enum: ['posts', 'users', 'avatars', 'banners', 'messages'] })
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Files are required');
    const uploaderId = req.user?.id ? req.user.id.toString() : undefined;
    return this.uploadsService.uploadMultipleFiles(files, uploaderId, folder);
  }
}
