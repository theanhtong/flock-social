import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReportType, ReportReason, ReportStatus } from '../../generated/prisma/enums.js';

export class CreateReportDto {
  @ApiProperty({ enum: ReportType, example: ReportType.post })
  @IsEnum(ReportType)
  @IsNotEmpty()
  targetType: ReportType;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.spam })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiPropertyOptional({ example: 'This post contains inappropriate content' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class QueryReportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  targetType?: ReportType;
}

export class ResolveReportDto {
  @ApiPropertyOptional({ example: 'Content removed by moderator' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether to delete the reported content' })
  @IsOptional()
  deleteContent?: boolean;
}
