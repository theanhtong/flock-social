'use client';

import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { adminUserService, AuditLogItem } from '@/services/admin-user-service';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { SidebarLayout } from '@/components/layout/sidebar';

export function AuditLogsView() {
  const token = useAuthStore((s) => s.token);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  const fetchAuditLogs = (cursor?: string) => {
    setIsLoadingAudit(true);
    adminUserService
      .getAuditLogs({ cursor, limit: 20 }, token)
      .then((res) => {
        setAuditLogs(res.data);
      })
      .catch((err) => toast.error(err.message || 'Failed to load audit logs'))
      .finally(() => setIsLoadingAudit(false));
  };

  useEffect(() => {
    fetchAuditLogs(undefined);
  }, [token]);

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans">
        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100">Audit Logs</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(undefined)}
            disabled={isLoadingAudit}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Audit Logs Content */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4 font-sans">
          {isLoadingAudit ? (
            <div className="py-16 flex justify-center text-blue-500 font-sans">
              <Spinner size="lg" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-sans">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border border-slate-800 rounded bg-slate-950/40 flex items-center justify-between text-xs font-sans hover:bg-slate-950/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={log.admin?.avatarUrl}
                      name={log.admin?.displayName || log.admin?.username || 'Admin'}
                      size="sm"
                    />
                    <div className="flex flex-col gap-0.5 font-sans">
                      <div className="flex items-center gap-2 font-sans flex-wrap">
                        <span className="font-bold text-slate-200 font-sans">
                          @{log.admin?.username || log.adminId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-sans text-[10px] font-semibold border border-blue-500/20">
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-sans text-[10px]">
                          Target: {log.targetType} #{log.targetId}
                        </span>
                      </div>
                      {log.metadata && (
                        <span className="text-[11px] text-slate-400 font-sans font-mono bg-slate-900 px-2 py-1 rounded mt-1 border border-slate-800/80">
                          {JSON.stringify(log.metadata)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans whitespace-nowrap ml-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
