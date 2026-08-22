'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      toast.success('Verification OTP code sent to your email');
      setStep(2);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send OTP code';
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
      toast.success('Password reset successfully! Please sign in.');
      router.push('/login');
      openLoginModal();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reset password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-slate-100">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Enter your email address to receive an OTP reset code'
              : `Enter OTP code sent to ${email} and your new password`}
          </p>
        </div>

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

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-1 font-sans"
              isLoading={loading}
            >
              Send OTP Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <Input
              label="OTP Code (6 digits)"
              type="text"
              placeholder="123456"
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
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-1/3 font-sans"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-2/3 font-sans"
                isLoading={loading}
              >
                Reset Password
              </Button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Remembered your password?{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
