import {
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  IsEnum,
} from 'class-validator';
import {
  PostStatus,
  PostAudience,
  PostType,
  MediaType,
} from '../../generated/prisma/client.js';

export { PostStatus, PostAudience, PostType, MediaType };

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  repostOfId?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(PostAudience)
  audience?: PostAudience;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(PostAudience)
  audience?: PostAudience;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];
}

export class UserEmbedDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  isVerified?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export class PostMediaDto {
  id: string;
  url: string;
  mediaType: MediaType;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export class PostDto {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: UserEmbedDto;
  media: PostMediaDto[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  bookmarkCount: number;
  viewsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isEdited: boolean;
  status: PostStatus;
  audience: PostAudience;
  postType: PostType;
  repostOf?: PostDto;
}

export class CommentDto {
  id: string;
  postId: string;
  user: UserEmbedDto;
  content: string;
  mediaUrl?: string | null;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  isDeleted: boolean;
  parentCommentId?: string | null;
  createdAt: string;
  updatedAt: string;
}
