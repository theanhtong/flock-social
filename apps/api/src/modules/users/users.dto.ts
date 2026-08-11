import {
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CursorQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchUsersQueryDto extends CursorQueryDto {
  @IsString()
  q: string;
}

class UserLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsString()
  @MaxLength(512)
  url: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserLinkDto)
  links?: UserLinkDto[];

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

export class UpdateUserSettingDto {
  @IsOptional()
  @IsBoolean()
  isPrivateProfile?: boolean;

  @IsOptional()
  @IsBoolean()
  requireFollowApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  showReadReceipts?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsString()
  allowTagging?: string;

  @IsOptional()
  @IsString()
  whoCanReplyPosts?: string;

  @IsOptional()
  @IsString()
  whoCanMessageMe?: string;

  @IsOptional()
  @IsString()
  whoCanAddToGroup?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnLikes?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnComments?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnFollows?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnTagging?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnReposts?: boolean;

  @IsOptional()
  @IsBoolean()
  autoplayVideos?: boolean;
}

export class UserProfileDto {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  location?: string | null;
  links?: UserLinkDto[] | null;
  birthDate?: string | null;
  role: string;
  status: string;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  isPrivateProfile?: boolean;
  whoCanMessageMe?: string;
}

export class UserSettingDto {
  userId: string;
  isPrivateProfile: boolean;
  requireFollowApproval: boolean;
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  allowTagging: string;
  whoCanReplyPosts: string;
  whoCanMessageMe: string;
  whoCanAddToGroup: string;
  notifyOnLikes: boolean;
  notifyOnComments: boolean;
  notifyOnFollows: boolean;
  notifyOnTagging: boolean;
  notifyOnReposts: boolean;
  autoplayVideos: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ToggleFollowResult {
  isFollowing: boolean;
  isPending: boolean;
  followersCount: number;
}
