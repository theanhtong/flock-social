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

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-500">
        <Spinner size="lg" />
      </div>
    );
  }

  return <UserHomeFeed />;
}
