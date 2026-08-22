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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    } else if (step === 3 && newPasswordInputRef.current) {
      newPasswordInputRef.current.focus();
    }
  }, [step]);

  // Step 1: Send OTP to Email
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
      toast.success(res?.message || 'Verification OTP code sent to your email!');
      setStep(2);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || 'Failed to send OTP code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>('/auth/verify-forgot-otp', {
        email: email.trim(),
        code: code.trim(),
      });
      toast.success(res?.message || 'OTP code verified! Please set your new password.');
      setStep(3);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || 'Invalid OTP code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Password reset successfully! Opening login...');
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
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      router.push('/login');
    }
  };

  const getStepTitle = () => {
    if (step === 1) return 'Forgot Password';
    if (step === 2) return 'Verify OTP Code';
    return 'Reset Password';
  };

  const getStepDescription = () => {
    if (step === 1) return 'Enter your email address to receive an OTP reset code';
    if (step === 2) return `Enter the 6-digit OTP code sent to ${email}`;
    return `Create a new secure password for ${email}`;
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-xl flex flex-col gap-4">
        {/* Top Back Action Button */}
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>
              {step === 3 ? 'Back to OTP' : step === 2 ? 'Back to Email' : 'Back to Login'}
            </span>
          </button>
        </div>

        {/* Card Header Title */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-100">{getStepTitle()}</h1>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-sm">
              Step {step} of 3
            </span>
          </div>
          <p className="text-xs text-slate-400">{getStepDescription()}</p>
        </div>

        {/* Step 1: Enter Email */}
        {step === 1 && (
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
              Continue
            </Button>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <Input
              ref={otpInputRef}
              label="OTP Code (6 digits)"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
                Verify OTP
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <Input
              ref={newPasswordInputRef}
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
                onClick={() => setStep(2)}
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
