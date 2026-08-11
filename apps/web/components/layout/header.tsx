'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Home, Palette, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export function Header() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const unreadNotificationsCount = useNotificationStore((s) => s.unreadCount);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const openRegisterModal = useAuthStore((s) => s.openRegisterModal);
  const logout = useAuthStore((s) => s.logout);

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between font-sans">
        {/* Brand Logo & Section Badge */}
        <div className="flex items-center gap-3 font-sans">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-base text-slate-100 hover:text-white transition-colors font-sans"
          >
            <span>Flock Social</span>
          </Link>
        </div>

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-2.5 font-sans">
          <nav className="flex items-center gap-1 font-sans">
            <Link
              href="/"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors font-medium ${
                pathname === '/'
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            {user && (
              <Link
                href="/notifications"
                className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors font-medium ${
                  pathname === '/notifications'
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* User Profile / Auth Actions */}
          {user ? (
            <div className="flex items-center gap-2 font-sans">
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${pathname === '/profile'
                  ? 'bg-slate-800 border border-slate-700'
                  : 'hover:bg-slate-800/60'
                  }`}
              >
                <Avatar
                  src={user.avatarUrl}
                  name={user.displayName || user.username}
                  size="xs"
                />
                <span className="hidden sm:inline-block text-xs font-bold text-slate-200">
                  {user.displayName}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-400 px-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-sans">
              <Button variant="ghost" size="sm" onClick={openLoginModal}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={openRegisterModal}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
