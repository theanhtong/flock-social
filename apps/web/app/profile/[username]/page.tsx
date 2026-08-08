'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera, Loader2, MoreHorizontal, Flag } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile, FollowStatus } from '@/services/user-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ImagePreviewModal } from '@/components/profile/image-preview-modal';
import { toast } from 'sonner';

import { SidebarLayout } from '@/components/layout/sidebar';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    type: 'avatar' | 'banner';
  }>({
    isOpen: false,
    type: 'avatar',
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await userService.getProfileByUsername(username, token);
        setProfile(data);

        // Fetch follow status if logged in and not self profile
        const isSelf = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();
        if (token && !isSelf) {
          try {
            const status = await userService.getFollowStatus(username, token);
            setFollowStatus(status);
          } catch (err) {
            console.error('Failed to load follow status', err);
          }
        }
      } catch (err: any) {
        toast.error(`User @${username} not found`);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username, token, currentUser]);

  const isSelf = currentUser && currentUser.username.toLowerCase() === username?.toLowerCase();

  const handleToggleFollow = async () => {
    if (!token) {
      toast.error('Please log in to follow users');
      return;
    }
    if (!profile) return;

    setIsFollowLoading(true);
    try {
      const res = await userService.toggleFollow(username, token);
      
      setFollowStatus((prev) => ({
        isFollowing: res.isFollowing,
        isPending: res.isPending,
        followsYou: prev?.followsYou ?? false,
      }));

      setProfile((prev) =>
        prev ? { ...prev, followersCount: res.followersCount } : null
      );

      if (res.isPending) {
        toast.info(`Follow request sent to @${username}`);
      } else if (res.isFollowing) {
        toast.success(`You are now following @${username}`);
      } else {
        toast.info(`Unfollowed @${username}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update follow state');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center p-12 text-blue-500">
          <Spinner size="lg" />
        </div>
      </SidebarLayout>
    );
  }

  if (!profile) {
    return (
      <SidebarLayout>
        <div className="bg-slate-900 border border-slate-800 rounded p-8 text-slate-100 flex flex-col items-center justify-center gap-4">
          <p className="text-slate-400 text-sm">User @{username} not found.</p>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  const renderFollowButton = () => {
    if (isSelf) {
      return (
        <Link href="/profile">
          <Button variant="secondary" size="sm" className="w-32 justify-center font-sans">
            Edit Profile
          </Button>
        </Link>
      );
    }

    if (isFollowLoading) {
      return (
        <Button variant="secondary" size="sm" disabled className="w-32 justify-center font-sans">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </Button>
      );
    }

    if (followStatus?.isFollowing) {
      return (
        <button
          onClick={handleToggleFollow}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-32 py-1.5 text-xs font-semibold rounded-md border transition-all duration-150 border-slate-700 bg-slate-800/80 text-slate-200 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 text-center shrink-0 font-sans"
        >
          {isHovered ? 'Unfollow' : 'Following'}
        </button>
      );
    }

    if (followStatus?.isPending) {
      return (
        <button
          onClick={handleToggleFollow}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-32 py-1.5 text-xs font-semibold rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150 text-center shrink-0 font-sans"
        >
          {isHovered ? 'Cancel Request' : 'Requested'}
        </button>
      );
    }

    if (followStatus?.followsYou) {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={handleToggleFollow}
          className="w-32 justify-center font-sans"
        >
          Follow Back
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleToggleFollow}
        className="w-32 justify-center font-sans"
      >
        Follow
      </Button>
    );
  };

  return (
    <SidebarLayout>
      <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xl flex flex-col font-sans">
        {/* Banner */}
        <div
          onClick={() => setImageModalState({ isOpen: true, type: 'banner' })}
          className="h-36 sm:h-44 bg-slate-800 relative border-b border-slate-800 cursor-pointer group overflow-hidden"
          title="Click to view banner"
        >
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
            <Camera className="w-4 h-4" />
            <span>Preview Banner</span>
          </div>
        </div>

        {/* Profile Header Info */}
        <div className="p-6 relative pt-0 flex flex-col gap-4">
          {/* Avatar row */}
          <div className="-mt-10 sm:-mt-12 mb-1">
            <div
              onClick={() => setImageModalState({ isOpen: true, type: 'avatar' })}
              className="relative inline-block group cursor-pointer"
              title="Click to view avatar"
            >
              <Avatar
                src={profile.avatarUrl}
                name={profile.displayName || profile.username}
                size="xl"
                isOnline
                className="ring-4 ring-slate-900"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* User Names, Role Badge & Action button in same row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 truncate">{profile.displayName}</h1>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400 font-mono truncate">@{profile.username}</p>
                {followStatus?.followsYou && !isSelf && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
                    Follows you
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {renderFollowButton()}

              {!isSelf && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu((prev) => !prev)}
                    className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors flex items-center justify-center"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-md shadow-xl py-1 z-20 font-sans">
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          toast.info(`Reported @${profile.username}`);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-sans"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report User</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-xs text-slate-300 leading-relaxed mt-1">{profile.bio}</p>
          )}

          {/* Details (Location, Joined) */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1">
            {profile.location && <span>📍 {profile.location}</span>}
            <span>📅 Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="font-bold text-slate-100 mr-1">{profile.postsCount}</span>
              <span className="text-slate-400">Posts</span>
            </div>
            <div>
              <span className="font-bold text-slate-100 mr-1">{profile.followingCount}</span>
              <span className="text-slate-400">Following</span>
            </div>
            <div>
              <span className="font-bold text-slate-100 mr-1">{profile.followersCount}</span>
              <span className="text-slate-400">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState((prev) => ({ ...prev, isOpen: false }))}
        type={imageModalState.type}
        imageUrl={imageModalState.type === 'avatar' ? profile?.avatarUrl : profile?.bannerUrl}
        isEditable={false}
      />
    </SidebarLayout>
  );
}
