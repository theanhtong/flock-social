'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { UserProfile, userService } from '@/services/user-service';
import { uploadService } from '@/services/upload-service';
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

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatarUrl || '');
      setBannerUrl(profile.bannerUrl || '');
    }
  }, [isOpen, profile]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadService.uploadFile(file, token);
      if (res?.url) {
        setAvatarUrl(res.url);
        toast.success('Avatar image uploaded!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload avatar image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    try {
      const res = await uploadService.uploadFile(file, token);
      if (res?.url) {
        setBannerUrl(res.url);
        toast.success('Header banner uploaded!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload banner image');
    } finally {
      setUploadingBanner(false);
    }
  };

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
        
        {/* Hidden File Inputs for Direct File Upload */}
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
        <input
          type="file"
          ref={bannerInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleBannerFileChange}
        />

        {/* Banner & Avatar Photo Upload Header */}
        <div className="rounded-sm overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
          {/* Banner Container */}
          <div className="h-32 w-full bg-slate-900 relative group overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <span className="text-xs text-slate-500 font-medium">Header Banner</span>
              </div>
            )}
            
            {/* Banner Overlay Upload Button */}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-sm text-xs flex items-center gap-1.5 border border-slate-700/80 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {uploadingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Camera className="w-4 h-4 text-blue-400" />
                )}
                <span>{uploadingBanner ? 'Uploading...' : 'Change Cover'}</span>
              </button>

              {bannerUrl && (
                <button
                  type="button"
                  onClick={() => setBannerUrl('')}
                  className="p-1.5 bg-slate-900/90 hover:bg-rose-900/80 text-slate-300 hover:text-white rounded-sm border border-slate-700/80 transition-colors cursor-pointer"
                  title="Remove banner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Avatar & Display Name Section */}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-950 border-t border-slate-900">
            <div className="flex items-center gap-3">
              <div className="relative -mt-10 group">
                <div className="ring-4 ring-slate-950 rounded-full overflow-hidden bg-slate-900 shadow-xl">
                  <Avatar src={avatarUrl} name={displayName || profile.username} size="lg" />
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-slate-950/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change avatar photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : (
                    <Camera className="w-4 h-4 text-blue-400" />
                  )}
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

        {/* Profile Details Inputs */}
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Thể Anh Tống"
          maxLength={50}
          required
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
