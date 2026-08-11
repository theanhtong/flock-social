'use client';

import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Eye, Shield, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { adminUserService, AuditLogItem } from '@/services/admin-user-service';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SidebarLayout } from '@/components/layout/sidebar';

export function AuditLogsView() {
  const token = useAuthStore((s) => s.token);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentCursorIndex, setCurrentCursorIndex] = useState(0);

  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  // Inspector Modal
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = (cursor?: string) => {
    setIsLoadingAudit(true);
    adminUserService
      .getAuditLogs({ cursor, limit: 15 }, token)
      .then((res) => {
        setAuditLogs(res.data);
        setNextCursor(res.meta.nextCursor);
        setHasNextPage(res.meta.hasNextPage);
      })
      .catch((err) => toast.error(err.message || 'Failed to load audit logs'))
      .finally(() => setIsLoadingAudit(false));
  };

  useEffect(() => {
    setCursorHistory([undefined]);
    setCurrentCursorIndex(0);
    fetchAuditLogs(undefined);
  }, [token]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    const nextIdx = currentCursorIndex + 1;
    const newHist = [...cursorHistory.slice(0, nextIdx), nextCursor];
    setCursorHistory(newHist);
    setCurrentCursorIndex(nextIdx);
    fetchAuditLogs(nextCursor);
  };

  const handlePrevPage = () => {
    if (currentCursorIndex <= 0) return;
    const prevIdx = currentCursorIndex - 1;
    setCurrentCursorIndex(prevIdx);
    fetchAuditLogs(cursorHistory[prevIdx]);
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter && log.action.toLowerCase() !== actionFilter.toLowerCase()) return false;
    if (targetFilter && log.targetType.toLowerCase() !== targetFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const adminName = log.admin?.username?.toLowerCase() || '';
      const targetId = log.targetId.toLowerCase();
      const meta = JSON.stringify(log.metadata || {}).toLowerCase();
      return adminName.includes(q) || targetId.includes(q) || meta.includes(q);
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'update':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'delete':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ban':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'unban':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans">
        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold text-slate-100">Audit Logs & Activity History</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(cursorHistory[currentCursorIndex])}
            disabled={isLoadingAudit}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded p-3 font-sans flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-200">System Logs Filter</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search admin, ID or meta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 text-xs font-sans"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-sans"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="ban">Ban</option>
              <option value="unban">Unban</option>
            </select>

            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-purple-500 font-sans"
            >
              <option value="">All Targets</option>
              <option value="user">User</option>
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="sanction">Sanction</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Content */}
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden font-sans">
          {isLoadingAudit ? (
            <div className="py-16 flex justify-center text-purple-400 font-sans">
              <Spinner size="lg" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-sans">
              No audit logs found matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 flex items-center justify-between text-xs font-sans hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={log.admin?.avatarUrl}
                      name={log.admin?.displayName || log.admin?.username || 'Admin'}
                      size="sm"
                    />
                    <div className="flex flex-col gap-1 min-w-0 font-sans">
                      <div className="flex items-center gap-2 font-sans flex-wrap">
                        <span className="font-bold text-slate-200">
                          @{log.admin?.username || log.adminId}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-sans text-[10px] font-bold uppercase border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          target: <strong className="text-slate-300">{log.targetType}</strong> #{log.targetId}
                        </span>
                      </div>

                      {log.metadata && (
                        <div className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800/80 truncate max-w-xl">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[11px] text-slate-500 font-sans whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectLog(log)}
                      className="gap-1 text-[11px] h-7"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clean Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400 font-sans">
            <span>Page {currentCursorIndex + 1}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentCursorIndex === 0 || isLoadingAudit}
                onClick={handlePrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isLoadingAudit}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Audit Log Details Modal */}
      <Modal
        isOpen={!!inspectLog}
        onClose={() => setInspectLog(null)}
        title={`Audit Log Record #${inspectLog?.id}`}
      >
        {inspectLog && (
          <div className="flex flex-col gap-4 py-2 font-sans text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-950 rounded border border-slate-800">
              <Avatar
                src={inspectLog.admin?.avatarUrl}
                name={inspectLog.admin?.displayName || inspectLog.admin?.username || 'Admin'}
                size="md"
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-100 text-sm">
                  {inspectLog.admin?.displayName || inspectLog.admin?.username}
                </span>
                <span className="text-slate-400 text-xs">@{inspectLog.admin?.username} (Admin ID: {inspectLog.adminId})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3 rounded border border-slate-800">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Action Type</span>
                <span className="font-bold text-slate-200 uppercase">{inspectLog.action}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Target Entity</span>
                <span className="font-bold text-slate-200">{inspectLog.targetType} #{inspectLog.targetId}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Recorded Timestamp</span>
                <span className="text-slate-300">{new Date(inspectLog.createdAt).toString()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-slate-300">Payload Metadata & Diffs</span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(inspectLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SidebarLayout>
  );
}
