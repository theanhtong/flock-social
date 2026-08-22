'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const openLoginModal = useAuthStore((s) => s.openLoginModal);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      toast.success('Verification OTP code sent to your email.');
      setStep(2);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send OTP code.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      toast.error('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      toast.success('Password reset successfully! Please log in.');
      router.push('/');
      openLoginModal();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to reset password.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-sm p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-sm text-blue-400 mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Reset Your Password</h1>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Enter your registered email address and we will send you a 6-digit verification code.'
              : `Enter the 6-digit code sent to ${email} along with your new password.`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1 rounded-sm ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            1. Email
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span
            className={`px-3 py-1 rounded-sm ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            2. New Password
          </span>
        </div>

        {/* Step 1: Request OTP Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 text-xs border border-slate-800 rounded-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 rounded-sm"
            >
              {isLoading ? 'Sending Code...' : 'Send Verification OTP'}
            </Button>
          </form>
        )}

        {/* Step 2: Reset Form */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 text-xs border border-slate-800 rounded-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600 tracking-widest text-center font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with upper, lower & numbers"
                className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 text-xs border border-slate-800 rounded-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 text-xs border border-slate-800 rounded-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="w-1/3 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 rounded-sm"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 rounded-sm"
              >
                {isLoading ? 'Resetting Password...' : 'Confirm Reset Password'}
              </Button>
            </div>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
