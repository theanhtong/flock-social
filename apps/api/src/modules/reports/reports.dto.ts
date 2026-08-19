import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType, ReportReason, ReportStatus, SanctionType } from '../../generated/prisma/enums.js';

export class SanctionPayloadDto {
  @ApiProperty({ enum: SanctionType, example: SanctionType.warning })
  @IsEnum(SanctionType)
  type: SanctionType;

  @ApiProperty({ example: '12345678901234567', description: 'ID of the user to sanction' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({ example: 'Violated community guidelines' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: 7, description: 'Duration in days (suspension only; null = permanent ban)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;
}

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

  @ApiPropertyOptional({ example: '{"text":"This post is spam","images":[]}' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
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

  @ApiPropertyOptional({ description: 'Optional sanction to issue against the reported user/author' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SanctionPayloadDto)
  sanction?: SanctionPayloadDto;
}

export class DismissReportDto {
  @ApiPropertyOptional({ description: 'Optional sanction to issue against the reporter for false report' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SanctionPayloadDto)
  sanction?: SanctionPayloadDto;

  @ApiPropertyOptional({ example: 'This report did not violate any guidelines' })
  @IsOptional()
  @IsString()
  resolution?: string;
}
