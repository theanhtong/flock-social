'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Users, UserX, UserPlus, UserMinus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserProfile } from '@/services/user-service';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FollowersModalProps {
  username: string;
  type: 'followers' | 'following' | 'requests' | null;
  isOpen: boolean;
  onClose: () => void;
  onFollowToggle?: (targetUsername: string, isFollowing: boolean) => void;
  onRemoveFollower?: (targetUsername: string) => void;
  onRespondRequest?: (requesterId: string, action: 'accept' | 'reject') => void;
}

export function FollowersModal({
  username,
  type,
  isOpen,
  onClose,
  onFollowToggle,
  onRemoveFollower,
  onRespondRequest,
}: FollowersModalProps) {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const isSelf = currentUser && currentUser.username.toLowerCase() === username?.toLowerCase();

  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'requests'>('followers');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    }
  }, [type, isOpen]);

  useEffect(() => {
    if (!isOpen || !username) return;

    const fetchList = async () => {
      setIsLoading(true);
      try {
        let res: UserProfile[] = [];
        if (activeTab === 'followers') {
          res = await userService.getFollowers(username, token);
        } else if (activeTab === 'following') {
          res = await userService.getFollowing(username, token);
        } else if (activeTab === 'requests') {
          res = await userService.getPendingFollowRequests(token);
        }
        setUsers(res || []);
      } catch (err: any) {
        toast.error(`Failed to load ${activeTab}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, [username, activeTab, isOpen, token]);

  if (!isOpen) return null;

  const handleRemoveFromList = (targetUsername: string) => {
    setUsers((prev) => prev.filter((u) => u.username !== targetUsername));
    onRemoveFollower?.(targetUsername);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`@${username}`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-3 font-sans text-xs">
        {/* Followers / Following / Requests Tabs */}
        <div className="flex border-b border-slate-800 -mt-1 mb-1">
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2.5 text-center text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'following'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Following
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2.5 text-center text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'followers'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Followers
          </button>
          {isSelf && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2.5 text-center text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Requests
            </button>
          )}
        </div>

        {/* Users List Container */}
        <div className="flex flex-col gap-2.5 min-h-[240px] max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Loading {activeTab}...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
              <Users className="w-6 h-6 text-slate-600 mb-1" />
              <span>No {activeTab} found.</span>
            </div>
          ) : (
            users.map((targetUser) => (
              <FollowerUserRow
                key={targetUser.id}
                targetUser={targetUser}
                profileUsername={username}
                type={activeTab}
                currentUsername={currentUser?.username}
                token={token}
                onCloseModal={onClose}
                onRemoveFromList={() => handleRemoveFromList(targetUser.username)}
                onFollowToggle={onFollowToggle}
                onRespondRequest={onRespondRequest}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

interface FollowerUserRowProps {
  targetUser: UserProfile;
  profileUsername: string;
  type: 'followers' | 'following' | 'requests';
  currentUsername?: string;
  token?: string | null;
  onCloseModal: () => void;
  onRemoveFromList: () => void;
  onFollowToggle?: (targetUsername: string, isFollowing: boolean) => void;
  onRespondRequest?: (requesterId: string, action: 'accept' | 'reject') => void;
}

function FollowerUserRow({
  targetUser,
  profileUsername,
  type,
  currentUsername,
  token,
  onCloseModal,
  onRemoveFromList,
  onFollowToggle,
  onRespondRequest,
}: FollowerUserRowProps) {
  const isSelf = currentUsername?.toLowerCase() === targetUser.username.toLowerCase();
  const isOwnerViewingOwnFollowers =
    currentUsername?.toLowerCase() === profileUsername.toLowerCase() &&
    type === 'followers';

  const [isFollowing, setIsFollowing] = useState(
    type === 'following' && currentUsername?.toLowerCase() === profileUsername.toLowerCase()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSelf || !token || type === 'requests') return;
    if (type === 'following' && currentUsername?.toLowerCase() === profileUsername.toLowerCase()) {
      setIsFollowing(true);
      return;
    }

    userService
      .getFollowStatus(targetUser.username, token)
      .then((status) => {
        setIsFollowing(status.isFollowing);
      })
      .catch(() => {});
  }, [targetUser.username, token, isSelf, type, currentUsername, profileUsername]);

  const handleToggleFollow = async () => {
    if (!token || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await userService.toggleFollow(targetUser.username, token);
      setIsFollowing(res.isFollowing);
      onFollowToggle?.(targetUser.username, res.isFollowing);
      if (res.isFollowing) {
        toast.success(`Followed @${targetUser.username}`);
      } else {
        toast.info(`Unfollowed @${targetUser.username}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update follow status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFollower = async () => {
    if (!token || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await userService.removeFollower(targetUser.username, token);
      toast.success(`Removed @${targetUser.username} from followers`);
      onRemoveFromList();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove follower');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondRequest = async (action: 'accept' | 'reject') => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await userService.respondFollowRequest(targetUser.id, action, token);
      if (action === 'accept') {
        toast.success(`Accepted follow request from @${targetUser.username}`);
      } else {
        toast.info(`Declined follow request from @${targetUser.username}`);
      }
      onRespondRequest?.(targetUser.id, action);
      onRemoveFromList();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded hover:border-slate-700 transition-colors">
      <Link
        href={`/profile/${targetUser.username}`}
        onClick={onCloseModal}
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        <Avatar
          src={targetUser.avatarUrl}
          name={targetUser.displayName || targetUser.username}
          size="md"
        />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors text-xs truncate">
              {targetUser.displayName || targetUser.username}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            @{targetUser.username}
          </span>
          {targetUser.bio && (
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {targetUser.bio}
            </p>
          )}
        </div>
      </Link>

      {/* Action Buttons */}
      {type === 'requests' ? (
        <div className="flex items-center gap-1.5 pl-2">
          <Button
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleRespondRequest('accept')}
            className="h-7 px-2.5 text-xs gap-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Accept</span>
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleRespondRequest('reject')}
            className="h-7 px-2.5 text-xs gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Decline</span>
              </>
            )}
          </Button>
        </div>
      ) : !isSelf && (
        <div className="flex items-center gap-2 pl-2">
          {isOwnerViewingOwnFollowers && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleRemoveFollower}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1.5 px-2.5"
              title="Remove this user from your followers"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant={isFollowing ? 'secondary' : 'primary'}
            size="sm"
            disabled={isSubmitting}
            onClick={handleToggleFollow}
            className={`gap-1.5 px-3 min-w-[84px] justify-center ${
              isFollowing
                ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                : ''
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="w-3.5 h-3.5" />
                <span>Unfollow</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Follow</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
