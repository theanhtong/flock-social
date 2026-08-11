'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Pencil, Image as ImageIcon, X, Globe, Lock, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { postService, Post } from '@/services/post-service';
import { uploadService } from '@/services/upload-service';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface EditPostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedPost: Post) => void;
}

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', icon: Globe },
  { value: 'followers', label: 'Followers', icon: Users },
  { value: 'close_friends', label: 'Close Friends', icon: Lock },
  { value: 'restricted', label: 'Restricted', icon: Lock },
];

function isVideoUrl(url: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('data:video/')) return true;
  return false;
}

export function EditPostModal({
  post,
  isOpen,
  onClose,
  onSuccess,
}: EditPostModalProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [audience, setAudience] = useState<string>('everyone');
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audienceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(e.target as Node)) {
        setIsAudienceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (post && isOpen) {
      setContent(post.content || '');
      setMediaUrls(post.media?.map((m) => m.url) || []);
      setAudience(post.audience || 'everyone');
      setNewMediaUrl('');
      setShowUrlInput(false);
      setIsAudienceOpen(false);
    }
  }, [post, isOpen]);

  if (!post || !isOpen) return null;

  const selectedAudience =
    AUDIENCE_OPTIONS.find((opt) => opt.value === audience) || AUDIENCE_OPTIONS[0];
  const SelectedIcon = selectedAudience.icon;

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploadingMedia(true);
    try {
      const uploadedResults = await uploadService.uploadMultipleFiles(fileList, token);
      const newUrls = uploadedResults.map((item) => item.url);
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 4));
      toast.success('Uploaded media to MinIO');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload media');
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    if (!newMediaUrl.trim()) return;
    if (mediaUrls.length >= 4) {
      toast.error('Maximum 4 media attachments allowed');
      return;
    }
    setMediaUrls((prev) => [...prev, newMediaUrl.trim()]);
    setNewMediaUrl('');
    setShowUrlInput(false);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updatedPost = await postService.updatePost(
        post.id,
        {
          content: content.trim(),
          mediaUrls,
          audience,
        },
        token
      );
      toast.success('Post updated successfully');
      onSuccess?.(updatedPost);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Post"
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4 font-sans text-xs">
        {/* User Avatar & Info */}
        <div className="flex items-center gap-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName || user?.username || 'User'}
            size="md"
          />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-slate-100 text-xs">
              {user?.displayName || user?.username}
            </span>

            {/* Custom Audience Selector Dropdown with Lucide Icons */}
            <div className="relative" ref={audienceRef}>
              <button
                type="button"
                onClick={() => setIsAudienceOpen((prev) => !prev)}
                className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-300 transition-colors"
              >
                <SelectedIcon className="w-3 h-3 text-blue-400" />
                <span>{selectedAudience.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {isAudienceOpen && (
                <div className="absolute left-0 mt-1 w-36 bg-slate-900 border border-slate-800 rounded shadow-xl py-1 z-30 flex flex-col">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAudience(opt.value);
                          setIsAudienceOpen(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                          audience === opt.value
                            ? 'bg-blue-600/20 text-blue-400 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full bg-slate-950/60 border border-slate-800 rounded p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
          autoFocus
        />

        {/* Small Square Image/Video Previews in 1 Row */}
        {mediaUrls.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {mediaUrls.map((url, idx) => {
              const isVideo = isVideoUrl(url);
              return (
                <div
                  key={idx}
                  className="w-16 h-16 rounded overflow-hidden relative border border-slate-800 shrink-0 bg-slate-950 group"
                >
                  {isVideo ? (
                    <video
                      src={url}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <img
                      src={url}
                      alt="Attachment preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors z-10"
                    title="Remove media"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* URL Input if opened */}
        {showUrlInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              placeholder="Paste image/video URL..."
              className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMediaUrl}
              className="gap-1 text-xs"
            >
              Add URL
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleSelectFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-blue-400 transition-colors p-1"
              title="Add media"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput((prev) => !prev)}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              + Add URL
            </button>
            <span className="text-[11px] text-slate-500">
              {content.length}/280
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5 px-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
