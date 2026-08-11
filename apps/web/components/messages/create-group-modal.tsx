'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserCheck, Loader2, Trash2, UploadCloud, Search } from 'lucide-react';
import { useMessageStore } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { messageService } from '@/services/message-service';
import { uploadService } from '@/services/upload-service';
import { userService, UserProfile } from '@/services/user-service';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function CreateGroupModal() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { isCreateGroupOpen, setCreateGroupOpen, setActiveConversationId, fetchConversations } = useMessageStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isCreateGroupOpen && user?.username && token) {
      setIsLoadingFollowers(true);
      userService.getFollowers(user.username, token)
        .then((data) => setFollowers(data || []))
        .catch((err) => console.error('Failed to fetch followers for group modal:', err))
        .finally(() => setIsLoadingFollowers(false));
    }
  }, [isCreateGroupOpen, user?.username, token]);

  if (!isCreateGroupOpen) return null;

  const processFile = async (file: File) => {
    if (!token) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg('');
    try {
      const res = await uploadService.uploadFile(file, token);
      setAvatarUrl(res.url);
    } catch (err: unknown) {
      console.error('Failed to upload group avatar:', err);
      setErrorMsg('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFollower = (username: string) => {
    const clean = username.trim().replace(/^@/, '');
    if (!members.includes(clean)) {
      setMembers((prev) => [...prev, clean]);
    }
  };

  const handleRemoveMember = (username: string) => {
    setMembers((prev) => prev.filter((m) => m !== username));
  };

  const unselectedFollowers = followers.filter(
    (f) => !members.includes(f.username)
  );

  const filteredFollowers = unselectedFollowers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.username.toLowerCase().includes(q) ||
      (f.displayName && f.displayName.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || members.length < 2 || isSubmitting || !token) {
      if (members.length < 2) {
        setErrorMsg('Select at least 2 members to create a group conversation');
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const conv = await messageService.createGroupConversation(
        {
          title: title.trim(),
          memberUsernames: members,
          avatarUrl: avatarUrl.trim() || undefined,
        },
        token
      );

      setCreateGroupOpen(false);
      setTitle('');
      setMembers([]);
      setAvatarUrl('');
      setSearchQuery('');

      await fetchConversations('main', true);
      await setActiveConversationId(conv.id);
    } catch (err: unknown) {
      console.error('Failed to create group:', err);
      setErrorMsg((err as Error)?.message || 'Failed to create group conversation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Create Group Conversation</span>
          </h2>
          <button
            onClick={() => setCreateGroupOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Group Title *</label>
            <input
              type="text"
              placeholder="e.g. Design Team, Friends Circle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Add Members (Followers)</label>
              <span className="text-[10px] text-blue-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Select followers
              </span>
            </div>

            {/* Search Followers Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search followers by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Scrollable Unselected Followers List (Max H-36) */}
            <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950 p-1 space-y-1 mb-2">
              {isLoadingFollowers ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Loading followers...</span>
                </div>
              ) : filteredFollowers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  {searchQuery ? 'No followers found matching search' : followers.length === 0 ? 'No followers found' : 'All followers selected'}
                </div>
              ) : (
                filteredFollowers.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFollower(f.username)}
                    className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors hover:bg-slate-900 text-slate-300"
                  >
                    <Avatar src={f.avatarUrl} name={f.displayName || f.username} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {f.displayName || f.username}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">@{f.username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Members List Below (Fixed Max H-36) */}
            <div className="space-y-1.5 pt-1">
              {/* <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider">
                <span className="text-slate-400">
                  Selected Members ({members.length}/2 minimum):
                </span>
                {members.length < 2 && (
                  <span className="text-amber-400 font-medium">Select at least 2 followers</span>
                )}
              </div> */}
              {members.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                  {members.map((username) => {
                    const followerObj = followers.find(
                      (f) => f.username.toLowerCase() === username.toLowerCase()
                    );
                    return (
                      <div
                        key={username}
                        className="flex items-center justify-between p-2 rounded-md bg-blue-950/40 border border-blue-900/60 text-slate-100 font-sans"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={followerObj?.avatarUrl}
                            name={followerObj?.displayName || username}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {followerObj?.displayName || username}
                            </span>
                            <span className="text-[10px] text-blue-400 truncate">
                              @{username}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(username)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Group Avatar (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            {avatarUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={avatarUrl} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover border border-slate-700 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-200 font-semibold">Avatar uploaded</span>
                    <span className="text-[11px] text-slate-400">Click change to pick another image</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="text-xs px-2.5 h-7 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    Change
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-blue-400" />
                )}
                <div className="flex flex-col items-center gap-0.5 text-center font-sans">
                  <span className="text-xs font-semibold text-slate-200">
                    Click or drag & drop to choose group avatar
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PNG, JPG, WEBP, GIF (Max 5MB)
                  </span>
                </div>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-[11px] text-rose-400 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateGroupOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || members.length < 2 || isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
