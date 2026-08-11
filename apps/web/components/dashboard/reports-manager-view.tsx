'use client';

import React, { useEffect, useState } from 'react';
import { Flag, RefreshCw, Eye, CheckCircle2, XCircle, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { reportService, ReportItem } from '@/services/report-service';
import { adminUserService } from '@/services/admin-user-service';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SidebarLayout } from '@/components/layout/sidebar';

export function ReportsManagerView() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentCursorIndex, setCurrentCursorIndex] = useState(0);

  const [statusTab, setStatusTab] = useState<string>('pending');
  const [targetFilter, setTargetFilter] = useState<string>('');
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Inspector Modal
  const [inspectReport, setInspectReport] = useState<ReportItem | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [deleteContentOnResolve, setDeleteContentOnResolve] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const fetchReports = (cursor?: string) => {
    setIsLoadingReports(true);
    reportService
      .getReports(
        {
          cursor,
          limit: 15,
          status: statusTab !== 'all' ? statusTab : undefined,
          targetType: targetFilter || undefined,
        },
        token,
      )
      .then((res) => {
        setReports(res.data);
        setNextCursor(res.meta.nextCursor);
        setHasNextPage(res.meta.hasNextPage);
      })
      .catch((err) => toast.error(err.message || 'Failed to load reports'))
      .finally(() => setIsLoadingReports(false));
  };

  useEffect(() => {
    setCursorHistory([undefined]);
    setCurrentCursorIndex(0);
    fetchReports(undefined);
  }, [token, statusTab, targetFilter]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    const nextIdx = currentCursorIndex + 1;
    const newHist = [...cursorHistory.slice(0, nextIdx), nextCursor];
    setCursorHistory(newHist);
    setCurrentCursorIndex(nextIdx);
    fetchReports(nextCursor);
  };

  const handlePrevPage = () => {
    if (currentCursorIndex <= 0) return;
    const prevIdx = currentCursorIndex - 1;
    setCurrentCursorIndex(prevIdx);
    fetchReports(cursorHistory[prevIdx]);
  };

  const handleResolve = async () => {
    if (!inspectReport) return;
    setIsResolving(true);
    try {
      await reportService.resolveReport(
        inspectReport.id,
        {
          resolution: resolutionText.trim() || 'Content moderated and report resolved',
          deleteContent: deleteContentOnResolve,
        },
        token,
      );
      toast.success(`Report #${inspectReport.id} resolved`);
      setInspectReport(null);
      setResolutionText('');
      fetchReports(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve report');
    } finally {
      setIsResolving(false);
    }
  };

  const handleDismiss = async () => {
    if (!inspectReport) return;
    setIsDismissing(true);
    try {
      await reportService.dismissReport(inspectReport.id, token);
      toast.success(`Report #${inspectReport.id} dismissed`);
      setInspectReport(null);
      fetchReports(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss report');
    } finally {
      setIsDismissing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Review</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
      case 'dismissed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">Dismissed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">{status}</span>;
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-rose-400" />
            <h1 className="text-lg font-bold text-slate-100">Reports Queue</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports(cursorHistory[currentCursorIndex])}
            disabled={isLoadingReports}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded p-3 font-sans flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['pending', 'resolved', 'dismissed', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors shrink-0 ${
                  statusTab === tab
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border border-slate-800/80 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-sans"
            >
              <option value="">All Targets</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {/* Reports Content */}
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden font-sans">
          {isLoadingReports ? (
            <div className="py-16 flex justify-center text-rose-500 font-sans">
              <Spinner size="lg" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-sans">
              No reports found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 font-sans">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3.5 flex items-center justify-between text-xs font-sans hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={rep.reporter?.avatarUrl}
                      name={rep.reporter?.displayName || rep.reporter?.username}
                      size="sm"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">
                          @{rep.reporter?.username}
                        </span>
                        <span className="text-slate-400 text-[11px]">reported</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {rep.targetType} #{rep.targetId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Reason: {rep.reason}
                        </span>
                        {getStatusBadge(rep.status)}
                      </div>

                      {rep.details && (
                        <p className="text-slate-400 text-xs truncate max-w-xl italic">
                          "{rep.details}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(rep.createdAt).toLocaleString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInspectReport(rep);
                        setResolutionText('');
                        setDeleteContentOnResolve(true);
                      }}
                      className="gap-1 text-[11px] h-7"
                    >
                      <Eye className="w-3 h-3" />
                      Inspect & Review
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
                disabled={currentCursorIndex === 0 || isLoadingReports}
                onClick={handlePrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isLoadingReports}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect & Review Report Modal */}
      <Modal
        isOpen={!!inspectReport}
        onClose={() => setInspectReport(null)}
        title={`Review Report #${inspectReport?.id}`}
      >
        {inspectReport && (
          <div className="flex flex-col gap-4 py-2 font-sans text-xs">
            {/* Reporter & Reason Header */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={inspectReport.reporter?.avatarUrl}
                  name={inspectReport.reporter?.displayName || inspectReport.reporter?.username}
                  size="sm"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Reporter</span>
                  <span className="font-bold text-slate-200">@{inspectReport.reporter?.username}</span>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Report Reason</span>
                <span className="font-bold text-rose-400 uppercase">{inspectReport.reason}</span>
              </div>
            </div>

            {inspectReport.details && (
              <div className="flex flex-col gap-1 p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Reporter Comments</span>
                <span className="text-slate-300 text-xs italic">"{inspectReport.details}"</span>
              </div>
            )}

            {/* Target Content Preview Box */}
            <div className="flex flex-col gap-1.5 p-3 bg-slate-950 border border-slate-800 rounded">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                Reported {inspectReport.targetType.toUpperCase()} Content Preview
              </span>

              {inspectReport.targetDetails ? (
                <div className="flex flex-col gap-2 pt-1 font-sans">
                  {inspectReport.targetType === 'user' ? (
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={inspectReport.targetDetails.avatarUrl}
                        name={inspectReport.targetDetails.displayName || inspectReport.targetDetails.username}
                        size="md"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100 text-sm">
                          {inspectReport.targetDetails.displayName || inspectReport.targetDetails.username}
                        </span>
                        <span className="text-slate-400 text-xs">@{inspectReport.targetDetails.username}</span>
                        {inspectReport.targetDetails.bio && (
                          <span className="text-slate-300 text-xs mt-1 italic">"{inspectReport.targetDetails.bio}"</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={inspectReport.targetDetails.author?.avatarUrl}
                          name={inspectReport.targetDetails.author?.displayName || inspectReport.targetDetails.author?.username}
                          size="xs"
                        />
                        <span className="font-bold text-slate-200">
                          @{inspectReport.targetDetails.author?.username}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs bg-slate-900 p-2.5 rounded border border-slate-800">
                        {inspectReport.targetDetails.content}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-500 text-xs italic py-2">
                  (Content may have already been deleted or is unavailable)
                </span>
              )}
            </div>

            {/* Resolution Controls for Pending Reports */}
            {inspectReport.status === 'pending' ? (
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-300">Moderation Notes / Resolution Note</label>
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="e.g. Violates TOS, content deleted and warning issued"
                    className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {inspectReport.targetType !== 'user' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300 font-semibold bg-rose-500/10 p-2.5 rounded border border-rose-500/20">
                    <input
                      type="checkbox"
                      checked={deleteContentOnResolve}
                      onChange={(e) => setDeleteContentOnResolve(e.target.checked)}
                      className="accent-rose-500"
                    />
                    <span>Delete reported {inspectReport.targetType} from platform immediately</span>
                  </label>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isDismissing}
                    onClick={handleDismiss}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Dismiss Report
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={isResolving}
                    onClick={handleResolve}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Resolve Report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Review Status</span>
                <span className="text-slate-300 text-xs">
                  {inspectReport.status === 'resolved' ? 'Resolved' : 'Dismissed'} by @{inspectReport.reviewedBy?.username || 'Moderator'} on {new Date(inspectReport.reviewedAt!).toLocaleString()}
                </span>
                {inspectReport.resolution && (
                  <span className="text-slate-400 text-xs italic mt-1 font-sans">
                    Note: "{inspectReport.resolution}"
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </SidebarLayout>
  );
}
