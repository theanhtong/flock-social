import { UserProfileDto } from "./users.dto.js";

export function formatProfile(user: any): UserProfileDto {
  return {
    id: user.id.toString(),
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    location: user.location,
    links: user.links,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    createdAt: user.createdAt.toISOString(),
  };
}