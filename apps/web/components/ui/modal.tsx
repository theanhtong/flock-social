'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  headerCenter?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  headerCenter = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full bg-slate-900 border border-slate-700 rounded shadow-xl z-10 overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in zoom-in-95 duration-150',
          maxWidthMap[maxWidth]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 min-h-[52px]">
            {title ? (
              <div
                className={cn(
                  'flex-1 text-base font-semibold text-slate-100 truncate pr-2',
                  headerCenter ? 'text-center' : 'text-left'
                )}
              >
                {title}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none shrink-0"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
