'use client';

import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { reportService } from '@/services/report-service';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'post' | 'comment';
  targetId: string;
  targetName?: string;
}

const REASONS = [
  { id: 'spam', label: 'Spam or Misleading' },
  { id: 'harassment', label: 'Harassment or Bullying' },
  { id: 'hate_speech', label: 'Hate Speech or Symbols' },
  { id: 'violence', label: 'Violence or Threat' },
  { id: 'nudity', label: 'Nudity or Sexual Content' },
  { id: 'misinformation', label: 'False Information' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'other', label: 'Other Concern' },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const token = useAuthStore((s) => s.token);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Please login to submit a report');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDetails = evidenceImage
        ? JSON.stringify({ text: details.trim() || null, images: [evidenceImage] })
        : details.trim() || undefined;

      await reportService.createReport(
        {
          targetType,
          targetId,
          reason,
          details: finalDetails,
        },
        token,
      );
      toast.success('Report submitted successfully. Thank you for keeping our community safe.');
      onClose();
      setDetails('');
      setEvidenceImage(null);
      setReason('spam');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report ${targetType.toUpperCase()}${targetName ? `: ${targetName}` : ''}`}
    >
      <div className="flex flex-col gap-4 py-2 font-sans text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded flex items-center gap-2 text-slate-300">
          <Flag className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Help us understand what is wrong with this {targetType}. Select the reason below:</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-slate-200">Reason for Report *</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center justify-between p-2.5 rounded border transition-colors cursor-pointer ${
                  reason === r.id
                    ? 'bg-rose-500/10 border-rose-500/40 text-slate-100 font-semibold'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>{r.label}</span>
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="accent-rose-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-slate-200">Additional Details / Evidence (Text or Image)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide context or explanation..."
            rows={3}
            className="bg-slate-950/60 border border-slate-800 rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-sans"
          />
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              accept="image/*"
              id="report-evidence-file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setEvidenceImage(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor="report-evidence-file"
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 hover:text-slate-100 hover:border-slate-700 text-[11px] cursor-pointer flex items-center gap-1.5 font-sans"
            >
              📷 Attach Evidence Image
            </label>
            {evidenceImage && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <span>Image attached</span>
                <button
                  type="button"
                  onClick={() => setEvidenceImage(null)}
                  className="text-slate-500 hover:text-rose-400 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Submit Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}
