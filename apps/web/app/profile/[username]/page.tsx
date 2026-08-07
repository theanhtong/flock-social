'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
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
  const [loading, setLoading] = useState<boolean>(true);

  const [imageModalState, setImageModalState] = useState<{
    isOpen: boolean;
    type: 'avatar' | 'banner';
  }>({
    isOpen: false,
    type: 'avatar',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfileByUsername(username, token);
        setProfile(data);
      } catch (err: any) {
        toast.error(`User @${username} not found`);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, token]);

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

  const isSelf = currentUser && currentUser.username.toLowerCase() === profile.username.toLowerCase();

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
                isVerified={profile.isVerified}
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">{profile.displayName}</h1>
              </div>
              <p className="text-xs text-slate-400 font-mono">@{profile.username}</p>
            </div>

            <div>
              {isSelf ? (
                <Link href="/profile">
                  <Button variant="secondary" size="sm">Edit Profile</Button>
                </Link>
              ) : (
                <Button variant="primary" size="sm" onClick={() => toast.info(`Following @${profile.username}`)}>
                  Follow
                </Button>
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
