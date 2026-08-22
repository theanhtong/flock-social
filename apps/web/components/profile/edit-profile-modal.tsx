'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
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
