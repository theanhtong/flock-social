'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  X,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  Volume2,
  VolumeX,
  LogOut,
  UserPlus,
  Edit2,
  Save,
  Loader2,
  Search,
  MessageSquareOff,
  MessageSquare,
  Ban,
  ExternalLink,
} from 'lucide-react';
import { useMessageStore } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { messageService } from '@/services/message-service';
import { userService, UserProfile } from '@/services/user-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function GroupDetailsOverlay() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const {
    activeConversation,
    setGroupDetailsOpen,
    setActiveConversationId,
    removeConversationFromList,
    updateConversationInList,
  } = useMessageStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(activeConversation?.title || '');
  const [avatarUrl, setAvatarUrl] = useState(activeConversation?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const isGroup = activeConversation?.type === 'group';
  const curUserIdStr = currentUser?.id ? String(currentUser.id) : '';

  const otherUser =
    !isGroup && activeConversation
      ? (activeConversation.otherUser && String(activeConversation.otherUser.id) !== curUserIdStr)
        ? activeConversation.otherUser
        : activeConversation.participants?.find((p) => String(p.user?.id) !== curUserIdStr)?.user ||
          activeConversation.members?.find((m) => String(m.userId) !== curUserIdStr)?.user
      : null;

  const currentMember = activeConversation?.members?.find(
    (m) => String(m.userId) === curUserIdStr || String(m.user?.id) === curUserIdStr
  );
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = isOwner || currentMember?.role === 'admin' || currentMember?.role === 'monitor';
  const isMuted = activeConversation?.isMuted;

  useEffect(() => {
    if (isAddMemberOpen && currentUser?.username && token) {
      setIsLoadingFollowers(true);
      userService
        .getFollowers(currentUser.username, token)
        .then((data) => setFollowers(data || []))
        .catch((err) => console.error('Failed to load followers:', err))
        .finally(() => setIsLoadingFollowers(false));
    }
  }, [isAddMemberOpen, currentUser?.username, token]);

  if (!activeConversation) return null;

  const handleClose = () => {
    setGroupDetailsOpen(false);
  };

  const handleToggleMute = async () => {
    if (!token || !activeConversation) return;
    try {
      const newMuteState = !isMuted;
      await messageService.toggleMute(activeConversation.id, newMuteState, token);
      updateConversationInList({ id: activeConversation.id, isMuted: newMuteState });
      toast.success(newMuteState ? 'Notifications muted' : 'Notifications unmuted');
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      toast.error('Failed to update mute settings');
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!token || !activeConversation || !title.trim()) return;
    setIsSaving(true);
    try {
      await messageService.updateGroupConversation(
        activeConversation.id,
        { title: title.trim(), avatarUrl: avatarUrl.trim() || undefined },
        token
      );
      updateConversationInList({ id: activeConversation.id, title: title.trim(), avatarUrl: avatarUrl.trim() });
      setIsEditingTitle(false);
      toast.success('Group details updated!');
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to update group:', err);
      toast.error(err?.message || 'Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (memberId: string) => {
    if (!token || !activeConversation || !memberId) return;
    setIsAddingMember(true);
    try {
      await messageService.addMember(activeConversation.id, memberId, token);
      toast.success('Member added to group!');
      setIsAddMemberOpen(false);
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to add member:', err);
      toast.error(err?.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!token || !activeConversation) return;
    if (!confirm(`Are you sure you want to kick @${memberName} from this group?`)) return;
    try {
      await messageService.removeMember(activeConversation.id, memberId, token);
      toast.success(`Kicked @${memberName} from group`);
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to kick member:', err);
      toast.error(err?.message || 'Failed to kick member');
    }
  };

  const handleToggleMemberMute = async (memberId: string, isCurrentlyMuted: boolean, memberName: string) => {
    if (!token || !activeConversation) return;
    try {
      await messageService.toggleMemberMute(activeConversation.id, memberId, !isCurrentlyMuted, token);
      toast.success(
        isCurrentlyMuted
          ? `Restored messaging for @${memberName}`
          : `Restricted @${memberName} from messaging in group`
      );
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to toggle member mute:', err);
      toast.error(err?.message || 'Failed to update member permissions');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member', memberName: string) => {
    if (!token || !activeConversation) return;
    try {
      await messageService.updateMemberRole(activeConversation.id, memberId, newRole, token);
      toast.success(`Updated @${memberName}'s role to ${newRole}`);
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toast.error(err?.message || 'Failed to update role');
    }
  };

  const handleLeaveGroup = async () => {
    if (!token || !activeConversation) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await messageService.leaveGroup(activeConversation.id, token);
      toast.success('You left the group');
      setGroupDetailsOpen(false);
      removeConversationFromList(activeConversation.id);
      setActiveConversationId(null);
    } catch (err: any) {
      console.error('Failed to leave group:', err);
      toast.error(err?.message || 'Failed to leave group');
    }
  };

  const handleBlockUser = async () => {
    if (!token || !otherUser?.username) return;
    const isBlocked = activeConversation.isBlockedByMe;
    if (!confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} @${otherUser.username}?`)) return;
    try {
      await userService.toggleBlock(otherUser.username, token);
      updateConversationInList({ id: activeConversation.id, isBlockedByMe: !isBlocked });
      toast.success(`${isBlocked ? 'Unblocked' : 'Blocked'} @${otherUser.username}`);
      await setActiveConversationId(activeConversation.id);
    } catch (err: any) {
      console.error('Failed to toggle block:', err);
      toast.error(err?.message || 'Failed to block/unblock user');
    }
  };

  const membersList = (
    activeConversation.members && activeConversation.members.length > 0
      ? activeConversation.members
      : (activeConversation.participants || []).map((p: any, idx: number) => ({
          id: p.user?.id || String(idx),
          userId: p.user?.id,
          role: p.role,
          status: p.status,
          user: p.user,
        }))
  );
  const filteredMembers = membersList.filter((m) => {
    const q = searchMemberQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.user?.username?.toLowerCase().includes(q) ||
      (m.user?.displayName && m.user.displayName.toLowerCase().includes(q))
    );
  });

  const existingMemberUsernames = membersList.map((m) => m.user?.username?.toLowerCase());
  const unaddedFollowers = followers.filter(
    (f) => !existingMemberUsernames.includes(f.username?.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-900 w-full min-h-0 overflow-y-auto font-sans animate-in fade-in zoom-in duration-150">
      {/* Header Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition-colors"
            title="Back to chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-100">
            {isGroup ? 'Group Information & Settings' : 'Conversation Settings'}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Details Body */}
      <div className="p-4 space-y-5 flex-1 min-h-0">
        {/* Profile Card / Header Info */}
        <div className="flex flex-col items-center justify-center text-center p-5 bg-slate-950 border border-slate-800 rounded-sm space-y-3 shadow-inner">
          <Avatar
            src={isGroup ? activeConversation.avatarUrl : otherUser?.avatarUrl}
            name={isGroup ? activeConversation.title || 'Group' : otherUser?.displayName || otherUser?.username || 'User'}
            size="xl"
            className="border-2 border-blue-500/40 shadow-lg"
          />

          <div className="flex flex-col items-center gap-1 w-full max-w-sm">
            {isGroup ? (
              isEditingTitle && isAdmin ? (
                <div className="w-full space-y-2 mt-1">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Group title..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-sm text-slate-100 text-center focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Avatar image URL (optional)..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-sm text-slate-100 text-center focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleUpdateGroupInfo}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 px-3"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingTitle(false)}
                      className="text-xs text-slate-400 h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    {activeConversation.title || 'Group Chat'}
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 text-slate-400 hover:text-blue-400 rounded-sm hover:bg-slate-900"
                      title="Edit group title & avatar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            ) : (
              <>
                <h2 className="text-base font-bold text-slate-100">
                  {otherUser?.displayName || otherUser?.username}
                </h2>
                <span className="text-xs text-blue-400">@{otherUser?.username}</span>
                {otherUser?.bio && (
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">{otherUser.bio}</p>
                )}
                {otherUser?.username && (
                  <Link
                    href={`/profile/${otherUser.username}`}
                    className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-sm transition-colors"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                  </Link>
                )}
              </>
            )}

            {isGroup && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                {membersList.length} members
              </span>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleMute}
              className={`text-xs h-8 px-3 border-slate-800 ${
                isMuted ? 'bg-rose-950/40 text-rose-400 border-rose-900/60' : 'bg-slate-900 text-slate-200 hover:bg-slate-850'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 mr-1.5" />}
              {isMuted ? 'Muted' : 'Mute Notifications'}
            </Button>

            {isGroup && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                className="text-xs h-8 px-3 border-slate-800 bg-blue-950/50 hover:bg-blue-900/50 text-blue-300"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Add Members
              </Button>
            )}
          </div>
        </div>

        {/* Add Follower Member Section (Inline Drawer) */}
        {isGroup && isAdmin && isAddMemberOpen && (
          <div className="p-3 bg-slate-950 border border-blue-900/60 rounded-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                Add Follower to Group
              </span>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">Select a follower to invite into this group chat.</p>

            <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-sm bg-slate-900 p-1 space-y-1">
              {isLoadingFollowers ? (
                <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Loading followers...</span>
                </div>
              ) : unaddedFollowers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No unadded followers found
                </div>
              ) : (
                unaddedFollowers.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleAddMember(f.id)}
                    className="flex items-center justify-between p-2 rounded-sm hover:bg-slate-800 cursor-pointer text-slate-200 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={f.avatarUrl} name={f.displayName || f.username} size="xs" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-200 truncate">{f.displayName || f.username}</span>
                        <span className="text-[10px] text-slate-400 truncate">@{f.username}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={isAddingMember}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] h-6 px-2"
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Group Members List */}
        {isGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Group Members</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-sm font-semibold">
                  {membersList.length}
                </span>
              </h3>
            </div>

            {/* Search Members */}
            {membersList.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter members..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Members Cards */}
            <div className="space-y-1.5">
              {filteredMembers.map((m) => {
                const memberUserId = String(m.userId || m.user?.id);
                const isSelf = memberUserId === curUserIdStr;
                const isMemberOwner = m.role === 'owner';
                const isMemberAdmin = m.role === 'admin' || m.role === 'monitor';
                const isMemberMuted = m.status === 'pending_approval' || m.status === 'muted';

                return (
                  <div
                    key={m.id || memberUserId}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-sm flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={m.user?.avatarUrl} name={m.user?.displayName || m.user?.username || 'Member'} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 truncate">
                            {m.user?.displayName || m.user?.username}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/80 border border-blue-800 px-1.5 py-0.2 rounded-sm">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 truncate">@{m.user?.username}</span>
                          {/* Role Badge */}
                          <span
                            className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-sm border ${
                              isMemberOwner
                                ? 'bg-amber-950/80 border-amber-800 text-amber-400'
                                : isMemberAdmin
                                ? 'bg-blue-950/80 border-blue-800 text-blue-400'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {m.role || 'member'}
                          </span>

                          {/* Muted Badge */}
                          {isMemberMuted && (
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-sm border bg-rose-950/80 border-rose-800 text-rose-400 flex items-center gap-0.5">
                              <MessageSquareOff className="w-2.5 h-2.5" />
                              Muted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions Menu */}
                    {isAdmin && !isSelf && !isMemberOwner && (
                      <div className="flex items-center gap-1">
                        {/* Toggle Messaging Permission (Mute / Unmute member) */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleMemberMute(
                              memberUserId,
                              isMemberMuted,
                              m.user?.displayName || m.user?.username || 'user'
                            )
                          }
                          title={isMemberMuted ? 'Unmute member (allow messaging)' : 'Mute member (restrict messaging)'}
                          className={`p-1.5 rounded-sm transition-colors ${
                            isMemberMuted
                              ? 'text-rose-400 hover:bg-rose-950/60'
                              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                          }`}
                        >
                          {isMemberMuted ? <MessageSquareOff className="w-3.5 h-3.5 text-rose-400" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        </button>

                        {/* Promote / Demote Admin */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateRole(
                                memberUserId,
                                isMemberAdmin ? 'member' : 'admin',
                                m.user?.displayName || m.user?.username || 'user'
                              )
                            }
                            title={isMemberAdmin ? 'Demote to Member' : 'Promote to Admin'}
                            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-sm hover:bg-slate-800 transition-colors"
                          >
                            {isMemberAdmin ? <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                          </button>
                        )}

                        {/* Kick Member */}
                        <button
                          type="button"
                          onClick={() => handleKickMember(memberUserId, m.user?.displayName || m.user?.username || 'user')}
                          title="Kick member from group"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-sm transition-colors"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {isGroup ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveGroup}
              className="w-full border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-xs h-9 justify-center"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Leave Group Chat
            </Button>
          ) : otherUser?.username ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlockUser}
              className="w-full border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-xs h-9 justify-center"
            >
              <Ban className="w-3.5 h-3.5 mr-2" />
              {activeConversation.isBlockedByMe ? `Unblock @${otherUser.username}` : `Block @${otherUser.username}`}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
