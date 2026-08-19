'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const LoginModal: React.FC = () => {
  const router = useRouter();
  const isLoginModalOpen = useAuthStore((s) => s.isLoginModalOpen);
  const closeLoginModal = useAuthStore((s) => s.closeLoginModal);
  const openRegisterModal = useAuthStore((s) => s.openRegisterModal);
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errs.identifier = 'Please enter your email or username';
    }
    if (!password) {
      errs.password = 'Please enter your password';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login({ identifier, password });
      setIdentifier('');
      setPassword('');
      const loggedUser = useAuthStore.getState().user;
      if (loggedUser && (loggedUser.role === 'admin' || loggedUser.role === 'moderator')) {
        router.push('/dashboard');
      }
    } catch (err) {
      // Handled by store toasts
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info('Google OAuth provider is not configured yet.');
  };

  return (
    <Modal
      isOpen={isLoginModalOpen}
      onClose={closeLoginModal}
      maxWidth="md"
      title="Sign In"
    >
      <div className="flex flex-col gap-3.5 max-w-sm mx-auto py-0.5 font-sans">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 font-sans">
          <Input
            label="Email or Username"
            placeholder="e.g. alex or alex@domain.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-1 font-sans"
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="flex items-center gap-3 my-0.5 font-sans">
          <div className="flex-1 h-[1px] bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase font-medium font-sans">OR</span>
          <div className="flex-1 h-[1px] bg-slate-800" />
        </div>

        <Button
          variant="secondary"
          size="md"
          className="w-full font-sans"
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </Button>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800 font-sans">
          <span className="text-[10px] font-bold uppercase text-slate-500">Quick Login (Dev)</span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Admin', id: 'admin', pw: 'Admin123!', cls: 'text-rose-400 border-rose-800/60 hover:bg-rose-500/10' },
              { label: 'Mod', id: 'moderator', pw: 'Mod123456!', cls: 'text-amber-400 border-amber-800/60 hover:bg-amber-500/10' },
              { label: 'User', id: 'testuser', pw: 'Test123456!', cls: 'text-blue-400 border-blue-800/60 hover:bg-blue-500/10' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={async () => {
                  setIdentifier(p.id);
                  setPassword(p.pw);
                  setLoading(true);
                  try {
                    await login({ identifier: p.id, password: p.pw });
                    closeLoginModal();
                    setIdentifier('');
                    setPassword('');
                    const u = useAuthStore.getState().user;
                    if (u && (u.role === 'admin' || u.role === 'moderator')) router.push('/dashboard');
                  } catch {} finally {
                    setLoading(false);
                  }
                }}
                className={`px-2 py-1.5 rounded border text-[11px] font-bold transition-colors ${p.cls}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 text-center mt-1 font-sans">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={openRegisterModal}
            className="text-blue-400 font-medium hover:underline cursor-pointer font-sans"
          >
            Sign Up
          </button>
        </div>
      </div>
    </Modal>
  );
};
