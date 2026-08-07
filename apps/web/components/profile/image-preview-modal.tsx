'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Check, UploadCloud, FileImage, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'avatar' | 'banner';
  imageUrl?: string | null;
  isEditable?: boolean;
  onSave?: (newUrl: string) => Promise<void>;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  type,
  imageUrl,
  isEditable = false,
  onSave,
}: ImagePreviewModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setPreviewUrl(imageUrl || '');
    setSelectedFile(null);
    setPreviewError(false);
    setIsDragging(false);
  }, [imageUrl, isOpen]);

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    // Limit file size to 5MB for fast base64 upload
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewError(false);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave || !previewUrl) return;
    setIsLoading(true);
    try {
      await onSave(previewUrl);
      onClose();
    } catch (err) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const isAvatar = type === 'avatar';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAvatar ? 'Avatar Image' : 'Banner Image'}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4 py-2 font-sans">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelected(e.target.files[0]);
            }
          }}
        />

        {/* Preview Area (Only show if image exists) */}
        {previewUrl && !previewError && (
          <div className="flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded p-4 relative overflow-hidden font-sans">
            {isAvatar ? (
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-slate-700 shadow-lg relative">
                <img
                  src={previewUrl}
                  alt="Avatar Preview"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-44 rounded overflow-hidden border border-slate-800 shadow-lg relative">
                <img
                  src={previewUrl}
                  alt="Banner Preview"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* File Picker & Upload Controls (If Editable) */}
        {isEditable ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-sans">
            {/* Drag & Drop File Select Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                }`}
            >
              <UploadCloud className="w-6 h-6 text-blue-400" />
              <div className="flex flex-col items-center gap-0.5 text-center font-sans">
                <span className="text-xs font-semibold text-slate-200">
                  {selectedFile
                    ? selectedFile.name
                    : `Click or drag & drop to choose ${isAvatar ? 'avatar' : 'banner'} image`}
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : 'Supports PNG, JPG, WEBP, GIF (Max 5MB)'}
                </span>
              </div>
            </div>

            {/* Selected File Badge & Clear option */}
            {selectedFile && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <FileImage className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(imageUrl || '');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                  title="Remove selected file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">

              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isLoading}
                  disabled={!selectedFile && previewUrl === (imageUrl || '')}
                >
                  Save
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
