'use client';

import React, { useEffect, useState } from 'react';
import { Users, Shield, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { adminUserService } from '@/services/admin-user-service';
import { UserProfile } from '@/services/user-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { SidebarLayout } from '@/components/layout/sidebar';

export function UsersManagerView() {
  const token = useAuthStore((s) => s.token);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersNextCursor, setUsersNextCursor] = useState<string | null>(null);
  const [usersHasNextPage, setUsersHasNextPage] = useState<boolean>(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentCursorIndex, setCurrentCursorIndex] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Ban Modal state
  const [selectedUserForBan, setSelectedUserForBan] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [isBanning, setIsBanning] = useState(false);

  // Unban Confirm Modal state
  const [selectedUserForUnban, setSelectedUserForUnban] = useState<UserProfile | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  // Delete User Confirm Modal state
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Role Select & Confirm Modal state
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<'customer' | 'moderator' | 'admin' | 'bot_system'>('customer');
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchUsers = (cursor?: string) => {
    setIsLoadingUsers(true);
    adminUserService
      .getUsers(
        {
          cursor,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          role: roleFilter || undefined,
        },
        token,
      )
      .then((res) => {
        setUsers(res.data);
        setUsersNextCursor(res.meta.nextCursor);
        setUsersHasNextPage(res.meta.hasNextPage);
      })
      .catch((err) => toast.error(err.message || 'Failed to load users'))
      .finally(() => setIsLoadingUsers(false));
  };

  useEffect(() => {
    setCursorHistory([undefined]);
    setCurrentCursorIndex(0);
    fetchUsers(undefined);
  }, [search, statusFilter, roleFilter]);

  const handleNextPage = () => {
    if (!usersNextCursor) return;
    const nextIdx = currentCursorIndex + 1;
    const newHist = [...cursorHistory.slice(0, nextIdx), usersNextCursor];
    setCursorHistory(newHist);
    setCurrentCursorIndex(nextIdx);
    fetchUsers(usersNextCursor);
  };

  const handlePrevPage = () => {
    if (currentCursorIndex <= 0) return;
    const prevIdx = currentCursorIndex - 1;
    setCurrentCursorIndex(prevIdx);
    fetchUsers(cursorHistory[prevIdx]);
  };

  const handleBanUser = async () => {
    if (!selectedUserForBan) return;
    if (!banReason.trim()) {
      toast.error('Please enter a ban reason');
      return;
    }
    setIsBanning(true);
    try {
      await adminUserService.banUser(
        selectedUserForBan.id,
        {
          reason: banReason,
          durationDays: banDuration ? parseInt(banDuration, 10) : undefined,
        },
        token,
      );
      toast.success(`User @${selectedUserForBan.username} banned`);
      setSelectedUserForBan(null);
      setBanReason('');
      setBanDuration('');
      fetchUsers(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to ban user');
    } finally {
      setIsBanning(false);
    }
  };

  const handleConfirmUnban = async () => {
    if (!selectedUserForUnban) return;
    setIsUnbanning(true);
    try {
      await adminUserService.unbanUser(
        selectedUserForUnban.id,
        { liftReason: 'Restored by admin' },
        token,
      );
      toast.success(`User @${selectedUserForUnban.username} unbanned successfully`);
      setSelectedUserForUnban(null);
      fetchUsers(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to unban user');
    } finally {
      setIsUnbanning(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUserForDelete) return;
    setIsDeletingUser(true);
    try {
      await adminUserService.deleteUser(selectedUserForDelete.id, token);
      toast.success(`User @${selectedUserForDelete.username} permanently deleted`);
      setSelectedUserForDelete(null);
      fetchUsers(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleConfirmRoleUpdate = async () => {
    if (!selectedUserForRole) return;
    setIsUpdatingRole(true);
    try {
      await adminUserService.updateUserRole(
        selectedUserForRole.id,
        newRole,
        token,
      );
      toast.success(`User @${selectedUserForRole.username} role updated to ${newRole}`);
      setShowRoleConfirm(false);
      setSelectedUserForRole(null);
      fetchUsers(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans">
        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100">Users Manager</h1>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Manage user accounts, roles and status
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded p-3 font-sans">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-200">Users Directory</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 text-xs font-sans"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-sans"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-sans"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="bot_system">System Bot</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden font-sans">
          {isLoadingUsers ? (
            <div className="py-16 flex items-center justify-center text-blue-500 font-sans">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-sans">
              No users found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 font-sans">
                <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-sans">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Stats</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.avatarUrl}
                            name={u.displayName || u.username}
                            size="sm"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-100">
                              {u.displayName || u.username}
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <RoleBadge role={u.role} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        {u.isDeleted ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            Soft Deleted
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-sans ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : u.status === 'suspended'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {u.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {u.followersCount} followers • {u.postsCount} posts
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setNewRole(u.role as any);
                              setShowRoleConfirm(false);
                            }}
                          >
                            Role
                          </Button>

                          {u.status === 'banned' || u.status === 'suspended' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedUserForUnban(u)}
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setSelectedUserForBan(u)}
                            >
                              Ban
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 h-7 w-7"
                            onClick={() => setSelectedUserForDelete(u)}
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Clean Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400 font-sans">
            <span>Page {currentCursorIndex + 1}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentCursorIndex === 0 || isLoadingUsers}
                onClick={handlePrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!usersHasNextPage || isLoadingUsers}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ban User Modal */}
      <Modal
        isOpen={!!selectedUserForBan}
        onClose={() => setSelectedUserForBan(null)}
        title={`Ban User @${selectedUserForBan?.username}`}
      >
        <div className="flex flex-col gap-4 py-2 font-sans">
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This will restrict user @{selectedUserForBan?.username} from logging in or creating content.</span>
          </div>

          <Input
            label="Ban Reason *"
            placeholder="e.g. Violation of community guidelines"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />

          <Input
            label="Duration in Days (Optional, blank = Permanent)"
            type="number"
            placeholder="7"
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserForBan(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={isBanning} onClick={handleBanUser}>
              Confirm Ban
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unban User Confirmation Modal */}
      <Modal
        isOpen={!!selectedUserForUnban}
        onClose={() => setSelectedUserForUnban(null)}
        title={`Unban User @${selectedUserForUnban?.username}`}
      >
        <div className="flex flex-col gap-4 py-2 font-sans">
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Are you sure you want to lift restrictions and restore full active access for @{selectedUserForUnban?.username}?</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserForUnban(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={isUnbanning} onClick={handleConfirmUnban}>
              Confirm Unban
            </Button>
          </div>
        </div>
      </Modal>

      {/* Soft Delete User Confirmation Modal */}
      <Modal
        isOpen={!!selectedUserForDelete}
        onClose={() => setSelectedUserForDelete(null)}
        title={`Soft Delete User @${selectedUserForDelete?.username}`}
      >
        <div className="flex flex-col gap-4 py-2 font-sans">
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold">Soft Delete Account Warning</span>
              <span>
                Are you sure you want to soft-delete <strong className="text-white">@{selectedUserForDelete?.username}</strong>? Account access and sessions will be revoked immediately while preserving posts, comments, and audit trails for compliance.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserForDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={isDeletingUser} onClick={handleConfirmDeleteUser}>
              Confirm Soft Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Select & Confirm Role Change Modal */}
      <Modal
        isOpen={!!selectedUserForRole}
        onClose={() => {
          setSelectedUserForRole(null);
          setShowRoleConfirm(false);
        }}
        title={showRoleConfirm ? `Confirm Role Change` : `Change Role for @${selectedUserForRole?.username}`}
      >
        <div className="flex flex-col gap-4 py-2 font-sans">
          {!showRoleConfirm ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded border border-slate-800">
                <Avatar
                  src={selectedUserForRole?.avatarUrl}
                  name={selectedUserForRole?.displayName || selectedUserForRole?.username}
                  size="sm"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-100 text-xs">
                    {selectedUserForRole?.displayName || selectedUserForRole?.username}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-400">Current Role:</span>
                    <RoleBadge role={selectedUserForRole?.role || 'customer'} size="sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans">Select New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="customer">Customer (Standard User)</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin (Full System Control)</option>
                  <option value="bot_system">System Bot</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedUserForRole(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={newRole === selectedUserForRole?.role}
                  onClick={() => setShowRoleConfirm(true)}
                >
                  Continue to Confirmation
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Role Upgrade/Downgrade Confirmation</span>
                  <span>
                    You are about to change the system role of <strong className="text-white">@{selectedUserForRole?.username}</strong> from <strong className="uppercase">{selectedUserForRole?.role}</strong> to <strong className="uppercase">{newRole}</strong>.
                    {newRole === 'admin' && ' WARNING: This grants full administrative permissions across all platform resources.'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowRoleConfirm(false)}>
                  Back
                </Button>
                <Button variant="primary" size="sm" isLoading={isUpdatingRole} onClick={handleConfirmRoleUpdate}>
                  Confirm Role Update
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </SidebarLayout>
  );
}
