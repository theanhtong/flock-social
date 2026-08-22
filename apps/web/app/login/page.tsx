'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { triggerGoogleOAuthPopup } from '@/lib/google-oauth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const googleAuth = useAuthStore((s) => s.googleAuth);

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin' || user.role === 'moderator') {
        router.replace('/dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [user, isLoading, router]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
    setGoogleLoading(true);
    triggerGoogleOAuthPopup(
      async (idToken, userInfo) => {
        try {
          await googleAuth(idToken, userInfo);
          const loggedUser = useAuthStore.getState().user;
          if (loggedUser && (loggedUser.role === 'admin' || loggedUser.role === 'moderator')) {
            router.push('/dashboard');
          } else {
            router.push('/');
          }
        } catch (err) {
          // Handled by store toasts
        } finally {
          setGoogleLoading(false);
        }
      },
      (err) => {
        setGoogleLoading(false);
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-sm p-5 shadow-xl flex flex-col gap-4">
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

          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[11px] text-blue-400 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

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
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleLogin}
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
          <span>Sign in with Google</span>
        </Button>

        <div className="pt-2 border-t border-slate-800 text-center font-sans">
          <span className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-400 font-semibold hover:underline">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
