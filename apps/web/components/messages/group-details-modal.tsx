'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, UserMinus, ShieldCheck, LogOut, UserPlus, Save, Loader2 } from 'lucide-react';
import { useMessageStore } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { messageService } from '@/services/message-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function GroupDetailsModal() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const {
    isGroupDetailsOpen,
    setGroupDetailsOpen,
    activeConversation,
    setActiveConversationId,
    removeConversationFromList,
  } = useMessageStore();

  const [newTitle, setNewTitle] = useState(activeConversation?.title || '');
  const [newAvatarUrl, setNewAvatarUrl] = useState(activeConversation?.avatarUrl || '');
  const [newMemberId, setNewMemberId] = useState('');

  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isGroupDetailsOpen || !activeConversation || activeConversation.type !== 'group') {
    return null;
  }

  const currentMember = activeConversation.members?.find((m) => m.userId === currentUser?.id);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleUpdateGroup = async () => {
    if (!token || !activeConversation) return;
    setIsUpdatingGroup(true);
    setErrorMsg('');
    try {
      await messageService.updateGroupConversation(
        activeConversation.id,
        {
          title: newTitle.trim() || undefined,
          avatarUrl: newAvatarUrl.trim() || undefined,
        },
        token
      );
      // Reload details
      setActiveConversationId(activeConversation.id);
    } catch (err: unknown) {
      console.error('Failed to update group:', err);
      setErrorMsg((err as Error)?.message || 'Failed to update group details.');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleAddMember = async () => {
    if (!token || !activeConversation || !newMemberId.trim()) return;
    setIsAddingMember(true);
    setErrorMsg('');
    try {
      await messageService.addMember(activeConversation.id, newMemberId.trim(), token);
      setNewMemberId('');
      setActiveConversationId(activeConversation.id);
    } catch (err: unknown) {
      console.error('Failed to add member:', err);
      setErrorMsg((err as Error)?.message || 'Failed to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!token || !activeConversation) return;
    try {
      await messageService.removeMember(activeConversation.id, memberId, token);
      setActiveConversationId(activeConversation.id);
    } catch (err: unknown) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    if (!token || !activeConversation) return;
    try {
      await messageService.updateMemberRole(activeConversation.id, memberId, newRole, token);
      setActiveConversationId(activeConversation.id);
    } catch (err: unknown) {
      console.error('Failed to update role:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!token || !activeConversation) return;
    try {
      await messageService.leaveGroup(activeConversation.id, token);
      setGroupDetailsOpen(false);
      removeConversationFromList(activeConversation.id);
    } catch (err: unknown) {
      console.error('Failed to leave group:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar src={activeConversation.avatarUrl} name={activeConversation.title || 'Group'} size="sm" />
            <h2 className="text-sm font-bold text-slate-100">{activeConversation.title || 'Group Settings'}</h2>
          </div>
          <button
            onClick={() => setGroupDetailsOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Edit Group Info (Admin Only) */}
          {isOwnerOrAdmin && (
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-3">
              <h3 className="text-xs font-bold text-slate-200">Edit Group Details</h3>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Group Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-100"
                />
              </div>
              <Button
                size="sm"
                onClick={handleUpdateGroup}
                disabled={isUpdatingGroup}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 px-3"
              >
                {isUpdatingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save Changes
              </Button>
            </div>
          )}

          {/* Add Member Input (Follower of Owner only) */}
          {isOwnerOrAdmin && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <h3 className="text-xs font-bold text-slate-200">Add Follower Member</h3>
              <p className="text-[10px] text-slate-400">Only followers of the group owner can be added.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="User ID of follower"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-100"
                />
                <Button
                  size="sm"
                  onClick={handleAddMember}
                  disabled={isAddingMember || !newMemberId.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Group Members</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {activeConversation.members?.length || 0} total
              </span>
            </h3>

            <div className="divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              {activeConversation.members?.map((m) => {
                const isSelf = m.userId === currentUser?.id;

                return (
                  <div key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={m.user.avatarUrl} name={m.user.displayName || m.user.username} size="xs" />
                      <div>
                        <span className="font-bold text-slate-200 block leading-none mb-0.5">
                          {m.user.displayName || m.user.username} {isSelf && '(You)'}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border inline-block ${
                            m.role === 'owner'
                              ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                              : m.role === 'admin'
                              ? 'bg-amber-950/80 border-amber-800 text-amber-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                    </div>

                    {/* Member actions */}
                    {isOwnerOrAdmin && !isSelf && m.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        {m.role === 'member' ? (
                          <button
                            onClick={() => handleUpdateRole(m.userId, 'admin')}
                            title="Promote to Admin"
                            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateRole(m.userId, 'member')}
                            title="Demote to Member"
                            className="p-1 text-slate-400 hover:text-slate-300 rounded hover:bg-slate-800"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          title="Kick from Group"
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
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

          {errorMsg && <p className="text-[11px] text-rose-400 font-medium">{errorMsg}</p>}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveGroup}
            className="border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 text-xs h-8"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Leave Group
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGroupDetailsOpen(false)}
            className="text-xs text-slate-400 hover:text-white h-8"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
