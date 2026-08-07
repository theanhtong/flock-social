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
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-100">Sign In to Flock</h1>
          <p className="text-xs text-slate-400">Enter your credentials to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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

        <div className="text-xs text-slate-400 text-center mt-1">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-400 font-medium hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
