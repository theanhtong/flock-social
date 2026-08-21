'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const sendVerification = useAuthStore((s) => s.sendVerification);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const googleAuth = useAuthStore((s) => s.googleAuth);

  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [errors, setErrors] = useState<{
    displayName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    otp?: string;
  }>({});

  const validateStep1 = () => {
    const errs: typeof errors = {};
    if (!displayName.trim()) errs.displayName = 'Please enter your display name';
    if (!username.trim()) errs.username = 'Please enter your username';
    if (!email.trim() || !email.includes('@')) errs.email = 'Please enter a valid email address';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    setErrors({});
    try {
      await sendVerification(email);
      setStep(2);
    } catch (err: any) {
      // Handled by store toasts
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter all 6 OTP digits' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await verifyEmail(email, otpCode);
      await register({ username, email, password, displayName });
      router.push('/');
    } catch (err: any) {
      setErrors({ otp: err?.message || 'Invalid or expired OTP code' });
    } finally {
      setLoading(false);
    }
  };

  const openGoogleModal = useAuthStore((s) => s.openGoogleModal);

  const handleGoogleAuth = () => {
    openGoogleModal();
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      await sendVerification(email);
    } catch (err) {
      // Handled by store toasts
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-slate-100">
            {step === 1 ? 'Create Account' : 'Verify Email OTP'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Enter your details to create a new account'
              : `Enter the 6-digit OTP code sent to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-3 font-sans">
            <Button
              variant="secondary"
              size="md"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleAuth}
              isLoading={googleLoading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-[1px] bg-slate-800" />
              <span className="text-[11px] text-slate-500 uppercase font-medium">OR EMAIL</span>
              <div className="flex-1 h-[1px] bg-slate-800" />
            </div>

            <form onSubmit={handleStep1Submit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Display Name"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  error={errors.displayName}
                />

                <Input
                  label="Username (@username)"
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  error={errors.username}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-1"
                isLoading={loading}
              >
                Continue
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="text-xs text-slate-300 font-medium">Enter 6-digit Code</span>
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                length={6}
                disabled={loading}
              />
              {errors.otp && (
                <span className="text-xs text-rose-400 font-medium text-center">{errors.otp}</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={loading}
            >
              Verify & Complete Registration
            </Button>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-sans">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Back to details
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-blue-400 hover:underline font-semibold"
              >
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800 text-center font-sans">
          <span className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 font-semibold hover:underline">
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
