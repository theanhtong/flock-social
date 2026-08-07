'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { UsersManagerView } from '@/components/dashboard/users-manager-view';

export default function UsersManagerPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/');
      }
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-500">
        <Spinner size="lg" />
      </div>
    );
  }

  return <UsersManagerView />;
}
