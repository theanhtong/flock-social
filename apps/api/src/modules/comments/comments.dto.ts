import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CommentDto } from '../posts/posts.dto.js';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @IsString()
  content: string;
}

export class GetCommentsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class CommentFeedResponseDto {
  comments: CommentDto[];
  nextCursor?: string;
}

export class ToggleCommentLikeResultDto {
  isLiked: boolean;
  likeCount: number;
}
