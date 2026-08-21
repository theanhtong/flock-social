'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { UserProfile, userService } from '@/services/user-service';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdated: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdated,
}) => {
  const token = useAuthStore((s) => s.token);
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || '');
  const [showUrlInputs, setShowUrlInputs] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatarUrl || '');
      setBannerUrl(profile.bannerUrl || '');
      setShowUrlInputs(false);
    }
  }, [isOpen, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const updated = await userService.updateProfile(
        {
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatarUrl: avatarUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
        },
        token
      );
      toast.success('Profile updated successfully!');
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const bioLength = bio.length;
  const maxBioLength = 160;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-slate-100">
        
        {/* Banner & Avatar Interactive Preview Card */}
        <div className="rounded-sm overflow-hidden bg-slate-950 border border-slate-800/80 shadow-md">
          {/* Banner Container */}
          <div className="h-32 w-full bg-slate-900 relative group overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <span className="text-xs text-slate-500 font-medium">No Header Banner</span>
              </div>
            )}
            
            {/* Media URL Toggle Button */}
            <button
              type="button"
              onClick={() => setShowUrlInputs((prev) => !prev)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-sm text-xs flex items-center gap-1.5 backdrop-blur-md border border-slate-700/80 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>{showUrlInputs ? 'Hide Image URLs' : 'Edit Image URLs'}</span>
            </button>
          </div>

          {/* Avatar & Username Row */}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-950/90 border-t border-slate-900">
            <div className="flex items-center gap-3">
              <div className="relative -mt-10 group">
                <div className="ring-4 ring-slate-950 rounded-full overflow-hidden bg-slate-900 shadow-xl">
                  <Avatar src={avatarUrl} name={displayName || profile.username} size="lg" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowUrlInputs(true)}
                  className="absolute inset-0 bg-slate-950/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Change avatar"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                </button>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100 truncate max-w-[180px]">
                  {displayName || profile.username}
                </span>
                <span className="text-xs text-slate-400 font-mono">@{profile.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Image URL Inputs */}
        {showUrlInputs && (
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-sm flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Custom Image URLs</span>
              </div>
              <span className="text-[11px] text-slate-400">Paste direct image links</span>
            </div>
            
            <Input
              label="Avatar Image URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />

            <Input
              label="Header Banner URL"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
            />
          </div>
        )}

        {/* Profile Info Form Inputs */}
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Thể Anh Tống"
          maxLength={50}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <label>Bio</label>
            <span className={`text-[10px] font-mono ${bioLength > maxBioLength ? 'text-rose-400' : 'text-slate-500'}`}>
              {bioLength}/{maxBioLength}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a brief bio about yourself..."
            rows={3}
            maxLength={maxBioLength}
            className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500 resize-none transition-all"
          />
        </div>

        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Hanoi, Vietnam"
        />

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80 mt-1">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
