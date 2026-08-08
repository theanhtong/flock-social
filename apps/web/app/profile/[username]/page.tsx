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
import { FollowersModal } from '@/components/profile/followers-modal';
import { ProfileUserPosts } from '@/components/profile/profile-posts';
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
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  const [followModal, setFollowModal] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following' | null;
  }>({
    isOpen: false,
    type: null,
  });

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
        toast.info('Follow request sent');
      } else if (res.isFollowing) {
        toast.success(`Followed @${username}`);
      } else {
        toast.info(`Unfollowed @${username}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-blue-500">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 font-sans">
        <p className="text-slate-400 text-sm">User @{username} not found.</p>
        <Link href="/" className="mt-4">
          <Button variant="outline" size="sm">Go Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-4 font-sans">
        {/* Profile Header Card */}
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
            </div>
          </div>

          {/* Profile Header Info */}
          <div className="p-6 relative pt-0 flex flex-col gap-4 font-sans">
            {/* Avatar row */}
            <div className="-mt-10 sm:-mt-12 mb-1 flex justify-between items-end">
              <div
                onClick={() => setImageModalState({ isOpen: true, type: 'avatar' })}
                className="relative inline-block group cursor-pointer"
                title="Click to view avatar"
              >
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.displayName || profile.username}
                  size="xl"
                  className="ring-4 ring-slate-900"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Names & Follow Action Buttons in same row */}
            <div className="flex items-center justify-between gap-4 font-sans">
              <div className="flex flex-col font-sans">
                <div className="flex items-center gap-2 font-sans">
                  <h1 className="text-xl font-bold text-slate-100">{profile.displayName}</h1>
                  {followStatus?.followsYou && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      Follows you
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">@{profile.username}</p>
              </div>

              {/* Action Buttons inline with username */}
              <div className="flex items-center gap-2">
                {isSelf ? (
                  <Link href="/profile">
                    <Button variant="secondary" size="sm">Edit Profile</Button>
                  </Link>
                ) : (
                  <>
                    {followStatus?.isFollowing ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isFollowLoading}
                        onClick={handleToggleFollow}
                        className="bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30"
                      >
                        {isFollowLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Unfollow'
                        )}
                      </Button>
                    ) : followStatus?.isPending ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isFollowLoading}
                        onClick={handleToggleFollow}
                      >
                        {isFollowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Requested'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isFollowLoading}
                        onClick={handleToggleFollow}
                      >
                        {isFollowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Follow'}
                      </Button>
                    )}

                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu((prev) => !prev)}
                        className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-20">
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              toast.info(`User @${username} reported`);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  </>
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

            {/* Stats Bar with Clickable Following & Followers */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-100 mr-1">{profile.postsCount}</span>
                <span className="text-slate-400">Posts</span>
              </div>
              <button
                onClick={() => setFollowModal({ isOpen: true, type: 'following' })}
                className="hover:underline text-left cursor-pointer transition-colors"
              >
                <span className="font-bold text-slate-100 mr-1">{profile.followingCount}</span>
                <span className="text-slate-400 hover:text-blue-400">Following</span>
              </button>
              <button
                onClick={() => setFollowModal({ isOpen: true, type: 'followers' })}
                className="hover:underline text-left cursor-pointer transition-colors"
              >
                <span className="font-bold text-slate-100 mr-1">{profile.followersCount}</span>
                <span className="text-slate-400 hover:text-blue-400">Followers</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Posts Feed */}
        <ProfileUserPosts username={profile.username} />
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState((prev) => ({ ...prev, isOpen: false }))}
        type={imageModalState.type}
        imageUrl={imageModalState.type === 'avatar' ? profile?.avatarUrl : profile?.bannerUrl}
        isEditable={false}
      />

      {/* Followers / Following List Modal */}
      <FollowersModal
        username={profile.username}
        type={followModal.type}
        isOpen={followModal.isOpen}
        onClose={() => {
          setFollowModal({ isOpen: false, type: null });
          userService.getProfileByUsername(username, token).then((data) => setProfile(data)).catch(() => {});
          if (token && !isSelf) {
            userService.getFollowStatus(username, token).then((st) => setFollowStatus(st)).catch(() => {});
          }
        }}
        onFollowToggle={(targetUsername, isFollowing) => {
          if (targetUsername.toLowerCase() === profile.username.toLowerCase()) {
            setFollowStatus((prev) => (prev ? { ...prev, isFollowing } : null));
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    followersCount: isFollowing
                      ? prev.followersCount + 1
                      : Math.max(0, prev.followersCount - 1),
                  }
                : null
            );
          }
        }}
        onRemoveFollower={(targetUsername) => {
          if (targetUsername.toLowerCase() === currentUser?.username.toLowerCase()) {
            setFollowStatus((prev) => (prev ? { ...prev, followsYou: false } : null));
          }
          if (isSelf) {
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    followersCount: Math.max(0, prev.followersCount - 1),
                  }
                : null
            );
          }
        }}
      />
    </SidebarLayout>
  );
}
