'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, ''); // Digits only
    if (!val) return;

    const newOtp = value.split('');
    newOtp[index] = val.charAt(val.length - 1);
    const updatedValue = newOtp.join('');
    onChange(updatedValue);

    if (index < length - 1) {
      setActiveInput(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = value.split('');
      if (newOtp[index]) {
        newOtp[index] = '';
        onChange(newOtp.join(''));
      } else if (index > 0) {
        newOtp[index - 1] = '';
        onChange(newOtp.join(''));
        setActiveInput(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveInput(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveInput(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData.padEnd(length, ''));
      const focusIndex = Math.min(pastedData.length, length - 1);
      setActiveInput(focusIndex);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {Array.from({ length }, (_, index) => {
          const char = value[index] || '';
          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={char}
              disabled={disabled}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onFocus={() => setActiveInput(index)}
              className={cn(
                'w-9 h-11 sm:w-11 sm:h-12 text-center text-lg font-semibold rounded bg-slate-900 text-slate-100 border border-slate-700 transition-colors focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                activeInput === index && 'border-blue-500 ring-1 ring-blue-500',
                error && 'border-red-500 focus:border-red-500',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400 font-medium mt-1">{error}</p>}
    </div>
  );
};
