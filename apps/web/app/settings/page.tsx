'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Eye, Bell, Check, Settings, Loader2, Play, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { userService, UserSettings } from '@/services/user-service';
import { SidebarLayout } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const DEFAULT_SETTINGS: Partial<UserSettings> = {
  isPrivateProfile: false,
  requireFollowApproval: false,
  showReadReceipts: true,
  showOnlineStatus: true,
  allowTagging: 'everyone',
  whoCanReplyPosts: 'everyone',
  whoCanMessageMe: 'everyone',
  whoCanAddToGroup: 'everyone',
  notifyOnLikes: true,
  notifyOnComments: true,
  notifyOnFollows: true,
  notifyOnTagging: true,
  notifyOnReposts: true,
  autoplayVideos: true,
};

const VALID_SETTING_KEYS: (keyof UserSettings)[] = [
  'isPrivateProfile',
  'requireFollowApproval',
  'showReadReceipts',
  'showOnlineStatus',
  'allowTagging',
  'whoCanReplyPosts',
  'whoCanMessageMe',
  'whoCanAddToGroup',
  'notifyOnLikes',
  'notifyOnComments',
  'notifyOnFollows',
  'notifyOnTagging',
  'notifyOnReposts',
  'autoplayVideos',
];

export default function SettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [initialSettings, setInitialSettings] = useState<Partial<UserSettings>>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<Partial<UserSettings>>(DEFAULT_SETTINGS);
  const [fetching, setFetching] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token && !user) {
      router.push('/login');
      return;
    }

    const loadSettings = async () => {
      setFetching(true);
      try {
        const data = await userService.getUserSettings(token);
        setInitialSettings(data);
        setSettings(data);
      } catch (err) {
        console.error('Failed to load user settings from API:', err);
        toast.error('Failed to load settings from server');
      } finally {
        setFetching(false);
      }
    };

    if (token) {
      loadSettings();
    }
  }, [isLoading, token, user, router]);

  // Compute changed payload by comparing settings against initialSettings
  const getChangedPayload = () => {
    const payload: Partial<UserSettings> = {};
    VALID_SETTING_KEYS.forEach((key) => {
      if (settings[key] !== initialSettings[key]) {
        (payload as any)[key] = settings[key];
      }
    });
    return payload;
  };

  const changedPayload = getChangedPayload();
  const hasChanges = Object.keys(changedPayload).length > 0;

  const handleToggle = (key: keyof UserSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTogglePrivateProfile = () => {
    const newVal = !settings.isPrivateProfile;
    setSettings((prev) => ({
      ...prev,
      isPrivateProfile: newVal,
      requireFollowApproval: newVal,
    }));
  };

  const handleSelectChange = (key: keyof UserSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('No settings changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await userService.updateUserSettings(changedPayload, token);
      setSettings(updated);
      setInitialSettings(updated);
      toast.success('Settings saved successfully!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await userService.changePassword(
        {
          currentPassword: currentPassword.trim() || undefined,
          newPassword,
        },
        token
      );
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (isLoading || fetching || (!token && !user)) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-500 min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans max-w-4xl pb-10">
        {/* Page Header */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>User Account Settings</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your privacy, security, passwords, and notification rules.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            size="sm"
            className={`rounded-sm text-xs px-4 self-start sm:self-auto ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            )}
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>

        {/* Section 1: Security & Password Management */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Key className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Security & Change Password
            </h2>
          </div>

          <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4 text-xs">
            <p className="text-[11px] text-slate-400">
              Set or update your password to enable logging in via Email & Password.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Current Password"
                type="password"
                placeholder="Required if set"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-sm text-xs px-4"
                isLoading={changingPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>

        {/* Section 2: Profile Privacy & Status */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Eye className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Profile Privacy & Status
            </h2>
          </div>

          <div className="flex flex-col gap-3.5 text-xs text-slate-300">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.isPrivateProfile)}
                onChange={handleTogglePrivateProfile}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Private Profile
                </span>
                <span className="text-[11px] text-slate-400">
                  When enabled, your profile is private. New followers require your manual approval to view your posts and follow your account.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.showOnlineStatus)}
                onChange={() => handleToggle('showOnlineStatus')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Show Online Status
                </span>
                <span className="text-[11px] text-slate-400">
                  Allow other members to see when you are online in messages and feeds.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.showReadReceipts)}
                onChange={() => handleToggle('showReadReceipts')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Show Read Receipts
                </span>
                <span className="text-[11px] text-slate-400">
                  Let senders know when you have read their messages in direct chats.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Interaction & Messaging Rules */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Lock className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Interaction & Messaging Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-200">Who Can Message Me</label>
              <select
                value={settings.whoCanMessageMe || 'everyone'}
                onChange={(e) => handleSelectChange('whoCanMessageMe', e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers only</option>
                <option value="noone">Nobody</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-200">Who Can Reply to Posts</label>
              <select
                value={settings.whoCanReplyPosts || 'everyone'}
                onChange={(e) => handleSelectChange('whoCanReplyPosts', e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers only</option>
                <option value="noone">Nobody</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-200">Allow Tagging (@tag)</label>
              <select
                value={settings.allowTagging || 'everyone'}
                onChange={(e) => handleSelectChange('allowTagging', e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers only</option>
                <option value="noone">Nobody</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-200">Who Can Add Me to Groups</label>
              <select
                value={settings.whoCanAddToGroup || 'everyone'}
                onChange={(e) => handleSelectChange('whoCanAddToGroup', e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers only</option>
                <option value="noone">Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Notification Preferences */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bell className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              4. Notification Preferences
            </h2>
          </div>

          <div className="flex flex-col gap-3.5 text-xs text-slate-300">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.notifyOnLikes)}
                onChange={() => handleToggle('notifyOnLikes')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Notify on Likes
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive notifications when someone likes your posts or comments.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.notifyOnComments)}
                onChange={() => handleToggle('notifyOnComments')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Notify on Comments
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive notifications when users comment on your posts.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.notifyOnFollows)}
                onChange={() => handleToggle('notifyOnFollows')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Notify on Follows
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive notifications when a new user follows your profile.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.notifyOnTagging)}
                onChange={() => handleToggle('notifyOnTagging')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Notify on Tagging / Mentions
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive notifications when you are mentioned or tagged in posts.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.notifyOnReposts)}
                onChange={() => handleToggle('notifyOnReposts')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Notify on Reposts
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive notifications when someone reposts your content.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Media & Autoplay Settings */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Play className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              5. Media & Autoplay Settings
            </h2>
          </div>

          <div className="flex flex-col gap-3.5 text-xs text-slate-300">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(settings.autoplayVideos)}
                onChange={() => handleToggle('autoplayVideos')}
                className="mt-0.5 w-4 h-4 bg-slate-950 border border-slate-700 rounded-sm accent-blue-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  Autoplay Videos
                </span>
                <span className="text-[11px] text-slate-400">
                  Automatically play video attachments when scrolling through the home feed.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
