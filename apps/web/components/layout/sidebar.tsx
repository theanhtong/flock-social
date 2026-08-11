'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Shield, Users, FileText, MessageSquare, Settings, Bell, Flag } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { Avatar } from '@/components/ui/avatar';

export const Sidebar = () => {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const pendingReportsCount = useNotificationStore((s) => s.pendingReportsCount);

    const navItem = (href: string, icon: React.ReactNode, label: string, danger = false, badge?: number) => {
        const isActive = pathname === href || (href === '/messages' && pathname?.startsWith('/messages')) || (href === '/notifications' && pathname?.startsWith('/notifications'));
        return (
            <Link
                href={href}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${isActive
                    ? danger
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-blue-400 bg-blue-500/10'
                    : danger
                        ? 'text-red-400 hover:bg-slate-800'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
            >
                <div className="flex items-center gap-2.5">
                    {icon}
                    <span>{label}</span>
                </div>
                {badge && badge > 0 ? (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                        {badge > 99 ? '99+' : badge}
                    </span>
                ) : null}
            </Link>
        );
    };

    return (
        <aside className="hidden md:block md:col-span-3 sticky top-[72px] font-sans">
            <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3 font-sans">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <Avatar
                        src={user?.avatarUrl}
                        name={user?.displayName || user?.username || 'User'}
                        size="md"
                    />
                    <div className="flex flex-col min-w-0 font-sans">
                        <span className="font-bold text-slate-100 text-xs truncate">
                            {user?.displayName || user?.username}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">@{user?.username}</span>
                    </div>
                </div>

                <nav className="flex flex-col gap-1 font-sans">
                    {navItem('/', <Home className="w-4 h-4" />, 'Home Feed')}
                    {navItem('/notifications', <Bell className="w-4 h-4" />, 'Notifications', false, unreadCount)}
                    {navItem('/messages', <MessageSquare className="w-4 h-4" />, 'Messages')}
                    {navItem('/profile', <User className="w-4 h-4" />, 'My Profile')}
                    {navItem('/settings', <Settings className="w-4 h-4" />, 'Settings')}

                    {(user?.role === 'admin' || user?.role === 'moderator') && (
                        <>
                            <div className="my-1.5 border-t border-slate-800/80 pt-1.5 font-sans">
                                <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Moderation & Admin
                                </span>
                            </div>
                            {navItem('/dashboard', <Shield className="w-4 h-4" />, 'Console Overview')}
                            {navItem('/dashboard/reports', <Flag className="w-4 h-4" />, 'Reports Queue', false, pendingReportsCount)}
                            {user?.role === 'admin' && (
                                <>
                                    {navItem('/dashboard/users', <Users className="w-4 h-4" />, 'Users Manager')}
                                    {navItem('/dashboard/audit-logs', <FileText className="w-4 h-4" />, 'Audit Logs')}
                                </>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </aside>
    );
};

interface SidebarLayoutProps {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
    childrenSpan?: string;
    rightPanelSpan?: string;
    fullWidth?: boolean;
    fixedHeight?: boolean;
}

export function SidebarLayout({ children, rightPanel, childrenSpan, rightPanelSpan, fullWidth }: SidebarLayoutProps) {
    return (
        <div className={`${fullWidth ? 'max-w-full px-4' : 'max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8'} py-4 w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-start font-sans`}>
            <Sidebar />

            <main className={`col-span-1 ${childrenSpan || (rightPanel ? 'md:col-span-6' : 'md:col-span-9')} flex flex-col gap-4 font-sans`}>
                {children}
            </main>

            {rightPanel && (
                <aside className={`hidden md:block ${rightPanelSpan || 'md:col-span-3'} sticky top-[72px] font-sans`}>
                    {rightPanel}
                </aside>
            )}
        </div>
    );
}