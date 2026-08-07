'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';

export const RegisterModal: React.FC = () => {
  const isRegisterModalOpen = useAuthStore((s) => s.isRegisterModalOpen);
  const closeRegisterModal = useAuthStore((s) => s.closeRegisterModal);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const register = useAuthStore((s) => s.register);
  const sendVerification = useAuthStore((s) => s.sendVerification);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);

  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
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
      handleClose();
    } catch (err: any) {
      setErrors({ otp: err?.message || 'Invalid or expired OTP code' });
    } finally {
      setLoading(false);
    }
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

  const resetForm = () => {
    setStep(1);
    setDisplayName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    closeRegisterModal();
  };

  return (
    <Modal
      isOpen={isRegisterModalOpen}
      onClose={handleClose}
      maxWidth="md"
      title={step === 1 ? 'Create Account' : 'Verify Email OTP'}
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4 max-w-sm mx-auto py-1">
          <form onSubmit={handleStep1Submit} className="flex flex-col gap-3">
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

            <Input
              label="Email Address"
              type="email"
              placeholder="email@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
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

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={loading}
            >
              Continue
            </Button>
          </form>

          <div className="text-xs text-slate-400 text-center mt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={openLoginModal}
              className="text-blue-400 font-medium hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-sm mx-auto py-1">
          <p className="text-xs text-slate-300 text-center">
            A 6-digit OTP code has been sent to{' '}
            <span className="text-white font-semibold">{email}</span>
          </p>

          <form onSubmit={handleVerifyAndRegister} className="flex flex-col gap-5 items-center">
            <OtpInput
              length={6}
              value={otpCode}
              onChange={(code) => {
                setOtpCode(code);
                setErrors({});
              }}
              error={errors.otp}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={loading}
              disabled={otpCode.length !== 6}
            >
              Verify & Complete Account
            </Button>
          </form>

          <div className="flex flex-col items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="text-xs text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              {resendLoading ? 'Resending...' : "Didn't receive code? Resend OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
            >
              Back to edit details
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
