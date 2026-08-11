'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useMessageStore } from '@/store/message-store';
import { useAuthStore } from '@/store/auth-store';
import { uploadService } from '@/services/upload-service';
import { socketService } from '@/services/socket-service';
import { Button } from '@/components/ui/button';

export function MessageComposer() {
  const token = useAuthStore((s) => s.token);
  const {
    activeConversationId,
    sendDirectMessage,
    replyingToMessage,
    setReplyingToMessage,
  } = useMessageStore();

  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (activeConversationId) {
      socketService.sendTypingStart(activeConversationId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingStop(activeConversationId);
      }, 2000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const results = await uploadService.uploadMultipleFiles(files, token);
      const urls = results.map((r) => r.url);
      setMediaUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Failed to upload message attachments:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && mediaUrls.length === 0) || isSending || isUploading || !activeConversationId) return;

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketService.sendTypingStop(activeConversationId);

      await sendDirectMessage({
        content: text.trim() || undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        replyToId: replyingToMessage?.id,
      });

      setText('');
      setMediaUrls([]);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
      {/* Quoted Reply Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border-l-4 border-blue-500 text-xs">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-blue-400 block text-[11px]">
              Replying to {replyingToMessage.sender?.displayName || 'User'}
            </span>
            <p className="text-slate-300 truncate">
              {replyingToMessage.isUnsent ? 'Message unsent' : replyingToMessage.content || 'Attachment'}
            </p>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Attachments Preview Bar */}
      {mediaUrls.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {mediaUrls.map((url, idx) => (
            <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
              <img src={url} alt="upload preview" className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemoveMedia(idx)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-slate-950/80 hover:bg-rose-600 rounded-full text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input controls */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,video/*"
          className="hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending}
          title="Attach media"
          className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 h-9 w-9 rounded-sm flex-shrink-0"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Paperclip className="w-4 h-4" />}
        </Button>

        <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <textarea
            rows={1}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            className="w-full px-3 py-2 text-xs text-slate-100 bg-transparent placeholder-slate-500 focus:outline-none resize-none max-h-24"
          />
        </div>

        <Button
          type="submit"
          disabled={(!text.trim() && mediaUrls.length === 0) || isSending || isUploading}
          className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 h-9 w-9 rounded-sm flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95 disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
