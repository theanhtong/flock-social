'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Camera, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { ProfileHeaderSkeleton, PostCardSkeleton } from '@/components/ui/skeleton';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ImagePreviewModal } from '@/components/profile/image-preview-modal';
import { FollowersModal } from '@/components/profile/followers-modal';
import { ProfileUserPosts } from '@/components/profile/profile-posts';
import { toast } from 'sonner';

export default function SelfProfilePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);

  const [followModal, setFollowModal] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following' | 'requests' | null;
  }>({
    isOpen: false,
    type: null,
  });

  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    type: 'avatar' | 'banner';
  }>({
    isOpen: false,
    type: 'avatar',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const [data, reqs] = await Promise.all([
          userService.getMyProfile(token),
          userService.getPendingFollowRequests(token).catch(() => []),
        ]);
        setProfile(data);
        setPendingRequests(reqs || []);
      } catch (err: any) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, token, router]);

  const handleRespondFollowRequest = async (requesterId: string, action: 'accept' | 'reject') => {
    if (!token) return;
    try {
      await userService.respondFollowRequest(requesterId, action, token);
      const reqUser = pendingRequests.find((r) => r.id === requesterId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));

      if (action === 'accept') {
        setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount + 1 } : null));
        toast.success(`Accepted follow request from @${reqUser?.username || 'user'}`);
      } else {
        toast.info(`Declined follow request from @${reqUser?.username || 'user'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond to follow request');
    }
  };

  const handleSaveImage = async (newUrl: string) => {
    try {
      const payload =
        imageModalState.type === 'avatar'
          ? { avatarUrl: newUrl }
          : { bannerUrl: newUrl };

      const updated = await userService.updateProfile(payload, token);
      setProfile(updated);
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          avatarUrl: updated.avatarUrl || undefined,
        });
      }
      toast.success(
        `${imageModalState.type === 'avatar' ? 'Avatar' : 'Banner'} updated successfully!`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update image');
      throw err;
    }
  };

  if (authLoading || loading) {
    return (
      <SidebarLayout rightPanel={<RightPanel />}>
        <div className="flex flex-col gap-4 font-sans">
          <ProfileHeaderSkeleton />
          <PostCardSkeleton />
        </div>
      </SidebarLayout>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 font-sans">
        <p className="text-slate-400 text-sm">Profile not found.</p>
        <Link href="/" className="mt-4">
          <Button variant="outline" size="sm">Go Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <SidebarLayout rightPanel={<RightPanel />}>
        <div className="flex flex-col gap-4 font-sans">
          {/* Profile Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xl flex flex-col font-sans">
            {/* Banner */}
            <div
              onClick={() => setImageModalState({ isOpen: true, type: 'banner' })}
              className="h-36 sm:h-44 bg-slate-800 relative border-b border-slate-800 font-sans cursor-pointer group overflow-hidden"
              title="Click to view or change banner"
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
              <div className="-mt-10 sm:-mt-12 mb-1">
                <div
                  onClick={() => setImageModalState({ isOpen: true, type: 'avatar' })}
                  className="relative inline-block group cursor-pointer"
                  title="Click to view or change avatar"
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

              {/* User Names & Edit Profile button */}
              <div className="flex items-center justify-between gap-4 font-sans">
                <div className="flex flex-col font-sans">
                  <div className="flex items-center gap-2 font-sans">
                    <h1 className="text-xl font-bold text-slate-100 font-sans">{profile.displayName}</h1>
                    {profile.status !== 'active' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-sans font-semibold">
                        {profile.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-sans">@{profile.username}</p>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
                  Edit Profile
                </Button>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">{profile.bio}</p>
              )}

              {/* Details (Location, Joined) */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1 font-sans items-center">
                {profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile.location}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </span>
              </div>

              {/* Stats Bar with Clickable Following & Followers */}
              <div className="flex items-center gap-6 pt-4 border-t border-slate-800 text-xs font-sans">
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
                {pendingRequests.length > 0 && (
                  <button
                    onClick={() => setFollowModal({ isOpen: true, type: 'requests' })}
                    className="hover:underline text-left cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-slate-100 mr-1">{pendingRequests.length}</span>
                    <span className="text-slate-400 hover:text-blue-400">Pending Requests</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Posts Section */}
          <ProfileUserPosts username={profile.username} />
        </div>
      </SidebarLayout>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={profile}
          onUpdated={(updated) => setProfile(updated)}
        />
      )}

      {/* Image Preview & Update Modal */}
      <ImagePreviewModal
        isOpen={imageModalState.isOpen}
        onClose={() => setImageModalState((prev) => ({ ...prev, isOpen: false }))}
        type={imageModalState.type}
        imageUrl={imageModalState.type === 'avatar' ? profile?.avatarUrl : profile?.bannerUrl}
        isEditable={true}
        onSave={handleSaveImage}
      />

      {/* Followers / Following List Modal */}
      <FollowersModal
        username={profile.username}
        type={followModal.type}
        isOpen={followModal.isOpen}
        onClose={() => {
          setFollowModal({ isOpen: false, type: null });
          userService.getMyProfile(token).then((data) => setProfile(data)).catch(() => {});
          userService.getPendingFollowRequests(token).then((reqs) => setPendingRequests(reqs || [])).catch(() => {});
        }}
        onRespondRequest={(requesterId, action) => {
          setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));
          if (action === 'accept') {
            setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount + 1 } : null));
          }
        }}
        onFollowToggle={(_, isFollowing) => {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followingCount: isFollowing
                    ? prev.followingCount + 1
                    : Math.max(0, prev.followingCount - 1),
                }
              : null
          );
        }}
        onRemoveFollower={() => {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followersCount: Math.max(0, prev.followersCount - 1),
                }
              : null
          );
        }}
      />
    </>
  );
}
