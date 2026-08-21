'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Users, FileText, ArrowRight, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { adminUserService, SystemStats } from '@/services/admin-user-service';
import { Spinner } from '@/components/ui/spinner';
import { SidebarLayout } from '@/components/layout/sidebar';

export function AdminDashboard() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    adminUserService
      .getSystemStats(token)
      .then((data) => setStats(data))
      .catch((err) => toast.error(err.message || 'Failed to load system stats'))
      .finally(() => setIsLoadingStats(false));
  }, [token]);

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans">
        {/* Page Title & Welcome */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100">Admin Console</h1>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Logged in as @{currentUser?.username} ({currentUser?.role})
          </span>
        </div>

        {/* Overview Stats Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans">
          {[
            { label: 'Total Users', value: stats?.totalUsers, color: 'text-slate-100' },
            { label: 'Active Users', value: stats?.activeUsers, color: 'text-blue-400' },
            { label: 'Suspended Users', value: stats?.suspendedUsers, color: 'text-blue-400' },
            { label: 'Banned Users', value: stats?.bannedUsers, color: 'text-blue-400' },
            { label: 'Total Posts', value: stats?.totalPosts, color: 'text-blue-400' },
            { label: 'Pending Reports', value: stats?.pendingReports, color: 'text-blue-400' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-sm flex flex-col gap-1 font-sans"
            >
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider font-sans">
                {item.label}
              </span>
              <span className={`text-lg font-bold font-sans ${item.color}`}>
                {isLoadingStats ? <Spinner size="sm" /> : item.value ?? 0}
              </span>
            </div>
          ))}
        </section>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {/* Card 1: Reports Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 flex flex-col justify-between gap-4 font-sans hover:border-slate-700 transition-colors">
            <div className="flex flex-col gap-2 font-sans">
              <div className="w-9 h-9 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Flag className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-base font-bold text-slate-100">Reports Queue</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Review submitted content and user violation reports. Inspect reported posts/comments, issue warnings, or dismiss invalid claims.
              </p>
            </div>

            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors pt-2 border-t border-slate-800/80"
            >
              <span>Open Reports Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Users Manager */}
          {currentUser?.role === 'admin' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 flex flex-col justify-between gap-4 font-sans hover:border-slate-700 transition-colors">
              <div className="flex flex-col gap-2 font-sans">
                <div className="w-9 h-9 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-base font-bold text-slate-100">Users Manager</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  View, filter, search user directory. Manage member permissions, change roles, and issue temporary or permanent account bans.
                </p>
              </div>

              <Link
                href="/dashboard/users"
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors pt-2 border-t border-slate-800/80"
              >
                <span>Open Users Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-sm p-5 flex flex-col justify-between gap-4 font-sans opacity-60">
              <div className="flex flex-col gap-2 font-sans">
                <div className="w-9 h-9 rounded-sm bg-slate-800 flex items-center justify-center text-slate-500">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-400">Users Manager</h2>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  User role management and account deletion are restricted to Administrator accounts.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">Admin Only</span>
            </div>
          )}

          {/* Card 3: Audit Logs */}
          {currentUser?.role === 'admin' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-sm p-5 flex flex-col justify-between gap-4 font-sans hover:border-slate-700 transition-colors">
              <div className="flex flex-col gap-2 font-sans">
                <div className="w-9 h-9 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-base font-bold text-slate-100">Audit Logs</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Review system audit trails and administrative actions taken across user management and content moderation operations.
                </p>
              </div>

              <Link
                href="/dashboard/audit-logs"
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors pt-2 border-t border-slate-800/80"
              >
                <span>View Audit History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-sm p-5 flex flex-col justify-between gap-4 font-sans opacity-60">
              <div className="flex flex-col gap-2 font-sans">
                <div className="w-9 h-9 rounded-sm bg-slate-800 flex items-center justify-center text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-400">Audit Logs</h2>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Audit logs and activity history are restricted to Administrator accounts.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">Admin Only</span>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
