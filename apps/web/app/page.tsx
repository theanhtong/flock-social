'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserHomeFeed } from '@/components/dashboard/user-home-feed';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace('/login');
    }
  }, [mounted, isLoading, user, router]);

  if (!mounted || isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return <UserHomeFeed />;
}
