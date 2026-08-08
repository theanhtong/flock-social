'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Home, Palette, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export function Header() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
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
            {/* <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div> */}
            <span>Flock Social</span>
          </Link>

          {/* {pathname === '/dashboard' ? (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/80 border border-red-800/80 text-red-400 font-semibold font-sans">
              Admin Console
            </span>
          ) : (
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold font-sans">
              Social Network
            </span>
          )} */}
        </div>

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-2.5 font-sans">
          <nav className="flex items-center gap-1 font-sans">
            <Link
              href="/"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors font-medium ${pathname === '/'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
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
