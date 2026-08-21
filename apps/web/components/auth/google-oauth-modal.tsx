'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GoogleAccount {
  name: string;
  email: string;
  avatar: string;
}

const PRESET_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Anh Tong',
    email: 'theanhtong@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    name: 'Alex Dev',
    email: 'alex.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
];

export const GoogleOAuthModal: React.FC = () => {
  const router = useRouter();
  const isGoogleModalOpen = useAuthStore((s) => s.isGoogleModalOpen);
  const closeGoogleModal = useAuthStore((s) => s.closeGoogleModal);
  const googleAuth = useAuthStore((s) => s.googleAuth);

  const [step, setStep] = useState<'select' | 'password' | 'new_email'>('select');
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectAccount = (account: GoogleAccount) => {
    setSelectedAccount(account);
    setGmailPassword('');
    setPasswordError('');
    setStep('password');
  };

  const handleNewEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setPasswordError('Please enter a valid Gmail address');
      return;
    }
    const nameFromEmail = customEmail.split('@')[0];
    setSelectedAccount({
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      email: customEmail.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    });
    setGmailPassword('');
    setPasswordError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailPassword || gmailPassword.length < 4) {
      setPasswordError('Please enter your Google account password');
      return;
    }

    if (!selectedAccount) return;

    setIsLoading(true);
    setPasswordError('');

    try {
      const mockGoogleToken = `google_oauth_${Date.now()}`;
      await googleAuth(mockGoogleToken, {
        email: selectedAccount.email,
        name: selectedAccount.name,
        picture: selectedAccount.avatar,
      });

      toast.success(`Signed in with Google as ${selectedAccount.email}`);
      handleClose();

      const user = useAuthStore.getState().user;
      if (user && (user.role === 'admin' || user.role === 'moderator')) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedAccount(null);
    setCustomEmail('');
    setGmailPassword('');
    setPasswordError('');
    setIsLoading(false);
    closeGoogleModal();
  };

  return (
    <Modal
      isOpen={isGoogleModalOpen}
      onClose={handleClose}
      maxWidth="md"
      showCloseButton={true}
    >
      <div className="flex flex-col gap-4 font-sans text-slate-100 p-1">
        {/* Google Header */}
        <div className="flex flex-col items-center justify-center gap-1.5 pb-3 border-b border-slate-800 text-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24">
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
          <h2 className="text-lg font-bold text-slate-100">Sign in with Google</h2>
          <p className="text-xs text-slate-400">Choose an account to continue to flock.social</p>
        </div>

        {/* Step 1: Select Account */}
        {step === 'select' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              {PRESET_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleSelectAccount(account)}
                  className="flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-sm transition-colors text-left w-full cursor-pointer"
                >
                  <img
                    src={account.avatar}
                    alt={account.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {account.name}
                    </span>
                    <span className="text-xs text-slate-400 truncate">{account.email}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomEmail('');
                setPasswordError('');
                setStep('new_email');
              }}
              className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-800/80 border border-dashed border-slate-700 rounded-sm transition-colors text-left w-full cursor-pointer mt-1"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/20 shrink-0">
                +
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-blue-400">Use another Google account</span>
                <span className="text-xs text-slate-400">Sign in with a different Gmail email</span>
              </div>
            </button>
          </div>
        )}

        {/* Step 1b: Enter Custom Gmail */}
        {step === 'new_email' && (
          <form onSubmit={handleNewEmailSubmit} className="flex flex-col gap-3">
            <Input
              label="Google Email Address"
              type="email"
              placeholder="example@gmail.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              error={passwordError}
              autoFocus
            />

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ← Back to accounts
              </button>
              <Button type="submit" variant="primary" size="sm">
                Next
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Enter Google Account Password */}
        {step === 'password' && selectedAccount && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-sm">
              <img
                src={selectedAccount.avatar}
                alt={selectedAccount.name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-slate-200">{selectedAccount.name}</span>
                <span className="text-xs text-slate-400 truncate">{selectedAccount.email}</span>
              </div>
            </div>

            <Input
              label="Google Password"
              type="password"
              placeholder="Enter your Gmail password"
              value={gmailPassword}
              onChange={(e) => setGmailPassword(e.target.value)}
              error={passwordError}
              autoFocus
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setGmailPassword('');
                  setPasswordError('');
                  setStep('select');
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ← Change Account
              </button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="font-sans px-5"
                isLoading={isLoading}
              >
                Sign In with Google
              </Button>
            </div>
          </form>
        )}

        <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-800/80">
          To continue, Google will share your name, email address, and profile picture with flock.social.
        </div>
      </div>
    </Modal>
  );
};
