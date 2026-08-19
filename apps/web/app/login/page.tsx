'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errs.identifier = 'Please enter your email or username';
    if (!password) errs.password = 'Please enter your password';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login({ identifier, password });
      const loggedUser = useAuthStore.getState().user;
      if (loggedUser && (loggedUser.role === 'admin' || loggedUser.role === 'moderator')) {
        router.push('/dashboard');
      } else {
        router.push('/');
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
    <div className="flex-1 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold text-slate-100">Sign In to Flock</h1>
          <p className="text-xs text-slate-400">Enter your credentials to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            className="w-full mt-1"
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase font-medium">OR</span>
          <div className="flex-1 h-[1px] bg-slate-800" />
        </div>

        <Button
          variant="secondary"
          size="md"
          className="w-full"
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
                    const u = useAuthStore.getState().user;
                    if (u && (u.role === 'admin' || u.role === 'moderator')) router.push('/dashboard');
                    else router.push('/');
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

        <div className="text-xs text-slate-400 text-center">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-400 font-medium hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
