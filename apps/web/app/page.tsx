'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { UserHomeFeed } from '@/components/dashboard/user-home-feed';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-xs text-slate-400 font-medium">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <UserHomeFeed />;
}
