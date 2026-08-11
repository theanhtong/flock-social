'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Camera, Loader2, MoreHorizontal, Flag, MessageSquare, Ban, Calendar, MapPin, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useMessageStore } from '@/store/message-store';
import { messageService } from '@/services/message-service';
import { userService, UserProfile, FollowStatus } from '@/services/user-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ImagePreviewModal } from '@/components/profile/image-preview-modal';
import { FollowersModal } from '@/components/profile/followers-modal';
import { ProfileUserPosts } from '@/components/profile/profile-posts';
import { toast } from 'sonner';
import { SidebarLayout } from '@/components/layout/sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { ReportModal } from '@/components/reports/report-modal';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean; isBlockedBy: boolean } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const [isBlockLoading, setIsBlockLoading] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [followModal, setFollowModal] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following' | 'requests' | null;
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

        // Fetch follow and block status if logged in and not self profile
        const isSelf = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();
        if (token && !isSelf) {
          try {
            const [status, bStatus] = await Promise.all([
              userService.getFollowStatus(username, token),
              userService.getBlockStatus(username, token),
            ]);
            setFollowStatus(status);
            setBlockStatus(bStatus);
          } catch (err) {
            console.error('Failed to load user relationship status', err);
          }
        } else if (token && isSelf) {
          try {
            const reqs = await userService.getPendingFollowRequests(token);
            setPendingRequests(reqs || []);
          } catch (err) {
            console.error('Failed to load pending follow requests', err);
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

  const canMessage = React.useMemo(() => {
    if (isSelf) return false;
    if (blockStatus?.isBlocked || blockStatus?.isBlockedBy) return false;
    const setting = profile?.whoCanMessageMe || 'everyone';
    if (setting === 'noone' || setting === 'nobody') return false;
    if (setting === 'followers') {
      return Boolean(followStatus?.isFollowing);
    }
    return true;
  }, [isSelf, blockStatus, profile?.whoCanMessageMe, followStatus?.isFollowing]);

  const isProfileLocked = React.useMemo(() => {
    if (isSelf) return false;
    if (blockStatus?.isBlocked || blockStatus?.isBlockedBy) return false;
    if (!profile?.isPrivateProfile) return false;
    return !followStatus?.isFollowing;
  }, [isSelf, blockStatus, profile?.isPrivateProfile, followStatus?.isFollowing]);

  const handleToggleBlock = async () => {
    if (!token) {
      toast.error('Please log in to block users');
      return;
    }
    if (!profile) return;

    setIsBlockLoading(true);
    try {
      const res = await userService.toggleBlock(username, token);
      setBlockStatus((prev) => ({
        isBlocked: res.isBlocked,
        isBlockedBy: prev?.isBlockedBy ?? false,
      }));
      setShowMoreMenu(false);
      if (res.isBlocked) {
        toast.success(`Blocked @${username}`);
      } else {
        toast.info(`Unblocked @${username}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update block status');
    } finally {
      setIsBlockLoading(false);
    }
  };

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

  const handleRespondFollowRequest = async (actionOrRequesterId: string, actionParam?: 'accept' | 'reject') => {
    if (!token) return;
    setIsFollowLoading(true);

    const requesterId = actionParam ? actionOrRequesterId : profile?.id;
    const action = actionParam || (actionOrRequesterId as 'accept' | 'reject');

    if (!requesterId) return;

    try {
      await userService.respondFollowRequest(requesterId, action, token);

      if (profile && profile.id === requesterId) {
        if (action === 'accept') {
          setFollowStatus((prev) => (prev ? { ...prev, followsYou: true, hasRequestedToFollowYou: false } : null));
          setProfile((prev) => (prev ? { ...prev, followingCount: prev.followingCount + 1 } : null));
          toast.success(`Accepted follow request from @${username}`);
        } else {
          setFollowStatus((prev) => (prev ? { ...prev, followsYou: false, hasRequestedToFollowYou: false } : null));
          toast.info(`Declined follow request from @${username}`);
        }
      } else {
        const reqUser = pendingRequests.find((r) => r.id === requesterId);
        setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId));

        if (action === 'accept') {
          setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount + 1 } : null));
          toast.success(`Accepted follow request from @${reqUser?.username || 'user'}`);
        } else {
          toast.info(`Declined follow request from @${reqUser?.username || 'user'}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process follow request');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleStartMessage = async () => {
    if (!token) {
      toast.error('Please log in to send messages');
      return;
    }
    if (!profile) return;

    try {
      const conv = await messageService.getOrCreateConversation(profile.username, token);
      await useMessageStore.getState().fetchConversations('main', true);
      await useMessageStore.getState().setActiveConversationId(conv.id);
      router.push(`/messages?convId=${conv.id}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to open message conversation');
    } finally {
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
    <SidebarLayout rightPanel={<RightPanel />}>
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
                ) : blockStatus?.isBlocked ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBlockLoading}
                      onClick={handleToggleBlock}
                      className="bg-slate-800 text-rose-400 border border-slate-700 hover:bg-slate-700"
                    >
                      {isBlockLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unblock'}
                    </Button>
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu((prev) => !prev)}
                        className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-20">
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              toast.info(`User @${username} reported`);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-400" />
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : blockStatus?.isBlockedBy ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed text-xs"
                    >
                      Blocked
                    </Button>
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu((prev) => !prev)}
                        className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-20">
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              setIsReportModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-400" />
                            Report @{username}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {canMessage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartMessage}
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>Message</span>
                      </Button>
                    )}

                    {followStatus?.hasRequestedToFollowYou ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isFollowLoading}
                          onClick={() => handleRespondFollowRequest('accept')}
                        >
                          {isFollowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isFollowLoading}
                          onClick={() => handleRespondFollowRequest('reject')}
                        >
                          {isFollowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Decline'}
                        </Button>
                      </div>
                    ) : followStatus?.isFollowing ? (
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
                        <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-20">
                          <button
                            onClick={handleToggleBlock}
                            disabled={isBlockLoading}
                            className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2 font-medium"
                          >
                            {isBlockLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            <span>{blockStatus?.isBlocked ? 'Unblock @' + username : 'Block @' + username}</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              setIsReportModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-400" />
                            Report @{username}
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
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </span>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-100 mr-1">{profile.postsCount}</span>
                <span className="text-slate-400">Posts</span>
              </div>
              <button
                onClick={() => !blockStatus?.isBlocked && !blockStatus?.isBlockedBy && !isProfileLocked && setFollowModal({ isOpen: true, type: 'following' })}
                className="hover:underline text-left cursor-pointer transition-colors"
              >
                <span className="font-bold text-slate-100 mr-1">{profile.followingCount}</span>
                <span className="text-slate-400 hover:text-blue-400">Following</span>
              </button>
              <button
                onClick={() => !blockStatus?.isBlocked && !blockStatus?.isBlockedBy && !isProfileLocked && setFollowModal({ isOpen: true, type: 'followers' })}
                className="hover:underline text-left cursor-pointer transition-colors"
              >
                <span className="font-bold text-slate-100 mr-1">{profile.followersCount}</span>
                <span className="text-slate-400 hover:text-blue-400">Followers</span>
              </button>
              {isSelf && pendingRequests.length > 0 && (
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

        {/* User Posts Feed / Locked / Blocked */}
        {blockStatus?.isBlocked || blockStatus?.isBlockedBy ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-8 text-center flex flex-col items-center justify-center gap-2">
            <Ban className="w-8 h-8 text-slate-500 mb-1" />
            <h3 className="text-sm font-bold text-slate-300">Posts Unavailable</h3>
          </div>
        ) : isProfileLocked ? (
          <div className="bg-slate-900 border border-slate-800 rounded p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100">This Account is Private</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Follow @{profile.username} to see their posts and photos.
            </p>
          </div>
        ) : (
          <ProfileUserPosts username={profile.username} />
        )}
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
          userService.getProfileByUsername(username, token).then((data) => setProfile(data)).catch(() => { });
          if (token && !isSelf) {
            userService.getFollowStatus(username, token).then((st) => setFollowStatus(st)).catch(() => { });
          }
          if (token && isSelf) {
            userService.getPendingFollowRequests(token).then((reqs) => setPendingRequests(reqs || [])).catch(() => { });
          }
        }}
        onRespondRequest={(requesterId, action) => {
          handleRespondFollowRequest(requesterId, action);
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
      {profile && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="user"
          targetId={profile.id}
          targetName={`@${profile.username}`}
        />
      )}
    </SidebarLayout>
  );
}
