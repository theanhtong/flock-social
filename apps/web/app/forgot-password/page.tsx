'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const openLoginModal = useAuthStore((s) => s.openLoginModal);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', {
        email: email.trim(),
      });
      toast.success(res?.message || 'OTP code sent to your email');
      setStep(2);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || 'Failed to send OTP code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      toast.success('Password reset successfully!');
      router.push('/login');
      openLoginModal();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || 'Failed to reset password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else router.push('/login');
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-xl flex flex-col gap-4">
        {/* Top Back Button */}
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-slate-100">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Enter your email to receive an OTP code'
              : `Enter 6-digit code sent to ${email} and your new password`}
          </p>
        </div>

        {/* Step 1: Send OTP */}
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. alex@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" size="md" className="w-full font-sans" isLoading={loading}>
              Continue
            </Button>
          </form>
        ) : (
          /* Step 2: OTP + New Password combined */
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <Input
              ref={otpInputRef}
              label="OTP Code"
              type="text"
              placeholder="6-digit code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" size="md" className="w-full font-sans mt-1" isLoading={loading}>
              Reset Password
            </Button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Remembered password?{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
