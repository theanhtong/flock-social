'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, RefreshCw, Eye, ChevronLeft, Layers, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { reportService, ReportItem } from '@/services/report-service';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { SidebarLayout } from '@/components/layout/sidebar';
import { ReportRowSkeleton } from '@/components/ui/skeleton';

function parseEvidence(raw?: string | null): { text: string | null; images: string[] } {
  if (!raw) return { text: null, images: [] };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        text: parsed.text || null,
        images: Array.isArray(parsed.images) ? parsed.images : [],
      };
    }
  } catch { }
  return { text: raw, images: [] };
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReportsManagerView() {
  const token = useAuthStore((s) => s.token);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentCursorIndex, setCurrentCursorIndex] = useState(0);

  const [statusTab, setStatusTab] = useState<string>('pending');
  const [targetFilter, setTargetFilter] = useState<string>('');
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Inspector Modal state
  const [inspectReport, setInspectReport] = useState<ReportItem | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [deleteContentOnResolve, setDeleteContentOnResolve] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Sanction Drawer state
  const [activeAction, setActiveAction] = useState<'resolve' | 'dismiss' | null>(null);
  const [selectedSanction, setSelectedSanction] = useState<'no_action' | 'warning' | 'suspension' | 'ban'>('no_action');
  const [selectedEvidenceImg, setSelectedEvidenceImg] = useState<number>(0);

  // Suspension Date-Time Range
  const [suspensionFrom, setSuspensionFrom] = useState<string>(() => formatDateTimeLocal(new Date()));
  const [suspensionTo, setSuspensionTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDateTimeLocal(d);
  });

  const resetSuspensionDates = () => {
    const now = new Date();
    setSuspensionFrom(formatDateTimeLocal(now));
    const target = new Date(now);
    target.setDate(target.getDate() + 7);
    setSuspensionTo(formatDateTimeLocal(target));
  };

  const calculateDaysFromRange = (): number => {
    const from = new Date(suspensionFrom);
    const to = new Date(suspensionTo);
    const diffMs = to.getTime() - from.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const fetchReports = (cursor?: string) => {
    setIsLoadingReports(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 200));
    Promise.all([
      reportService.getReports(
        {
          cursor,
          limit: 15,
          status: statusTab !== 'all' ? statusTab : undefined,
          targetType: targetFilter || undefined,
        },
        token,
      ),
      minDelay,
    ])
      .then(([res]) => {
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

  const handleConfirmResolve = async () => {
    if (!inspectReport) return;
    setIsResolving(true);
    try {
      const targetUserId = inspectReport.targetType === 'user'
        ? inspectReport.targetId
        : inspectReport.targetDetails?.author?.id;

      const sanction = selectedSanction !== 'no_action' && targetUserId
        ? {
          type: selectedSanction as 'warning' | 'suspension' | 'ban',
          targetUserId,
          reason: resolutionText.trim() || 'Violated community guidelines',
          durationDays: selectedSanction === 'suspension' ? calculateDaysFromRange() : undefined,
        }
        : undefined;

      await reportService.resolveReport(
        inspectReport.id,
        {
          resolution: resolutionText.trim() || `Report resolved (${selectedSanction})`,
          deleteContent: deleteContentOnResolve,
          sanction,
        },
        token,
      );
      toast.success(`Report #${inspectReport.id} resolved`);
      closeModal();
      fetchReports(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve report');
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirmDismiss = async () => {
    if (!inspectReport) return;
    setIsDismissing(true);
    try {
      const sanction = selectedSanction !== 'no_action'
        ? {
          type: selectedSanction as 'warning' | 'suspension',
          targetUserId: inspectReport.reporterId,
          reason: resolutionText.trim() || 'False or malicious reporting',
          durationDays: selectedSanction === 'suspension' ? calculateDaysFromRange() : undefined,
        }
        : undefined;

      await reportService.dismissReport(
        inspectReport.id,
        {
          resolution: resolutionText.trim() || `Report dismissed (${selectedSanction})`,
          sanction,
        },
        token,
      );
      toast.success(`Report #${inspectReport.id} dismissed`);
      closeModal();
      fetchReports(cursorHistory[currentCursorIndex]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss report');
    } finally {
      setIsDismissing(false);
    }
  };

  const closeModal = () => {
    setInspectReport(null);
    setActiveAction(null);
    setSelectedSanction('no_action');
    setResolutionText('');
    resetSuspensionDates();
    setSelectedEvidenceImg(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-amber-400 font-semibold uppercase text-[11px]">Pending</span>;
      case 'resolved':
        return <span className="text-emerald-400 font-semibold uppercase text-[11px]">Resolved</span>;
      case 'dismissed':
        return <span className="text-slate-400 font-semibold uppercase text-[11px]">Dismissed</span>;
      default:
        return <span className="text-slate-400 font-semibold uppercase text-[11px]">{status}</span>;
    }
  };

  const evidence = inspectReport ? parseEvidence(inspectReport.details) : { text: null, images: [] };

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

        {/* Filter Bar & Tabs (Matching Notifications Tab Style) */}
        <div className="flex items-center justify-between px-4 bg-slate-950 border-b border-slate-800 overflow-x-auto gap-4 font-sans">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'dismissed', label: 'Dismissed' },
            ].map((tab) => {
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${isActive
                      ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 py-2">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
            >
              <option value="">All Targets</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {/* Reports Content Table/List */}
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden font-sans">
          {isLoadingReports ? (
            <div className="divide-y divide-slate-800/60 font-sans">
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
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
                        <Link
                          href={`/profile/${rep.reporter?.username}`}
                          className="font-bold text-slate-200 hover:underline transition-colors"
                        >
                          @{rep.reporter?.username}
                        </Link>
                        <span className="text-slate-500 text-[11px]">reported</span>
                        {rep.targetType === 'user' && rep.targetDetails?.username ? (
                          <Link
                            href={`/profile/${rep.targetDetails.username}`}
                            className="font-bold text-slate-200 hover:underline transition-colors"
                          >
                            @{rep.targetDetails.username}
                          </Link>
                        ) : (rep.targetType === 'post' || rep.targetType === 'comment') && rep.targetDetails?.author?.username ? (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium uppercase text-[11px]">
                              {rep.targetType}
                            </span>
                            <Link
                              href={`/profile/${rep.targetDetails.author.username}`}
                              className="font-bold text-slate-200 hover:underline transition-colors"
                            >
                              @{rep.targetDetails.author.username}
                            </Link>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium uppercase text-[11px]">
                            {rep.targetType} #{rep.targetId}
                          </span>
                        )}

                        <span className="text-slate-600">•</span>
                        <span className="text-rose-400 font-semibold uppercase text-[11px]">
                          {rep.reason}
                        </span>
                        <span className="text-slate-600">•</span>
                        {getStatusBadge(rep.status)}
                      </div>

                      {rep.details && (
                        <p className="text-slate-400 text-xs truncate max-w-xl italic">
                          "{parseEvidence(rep.details).text || rep.details}"
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
                        setActiveAction(null);
                        setSelectedSanction('no_action');
                        setResolutionText('');
                        setDeleteContentOnResolve(true);
                        resetSuspensionDates();
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
        onClose={closeModal}
        title={`Review Report #${inspectReport?.id}`}
      >
        {inspectReport && (
          <div className="flex flex-col gap-4 py-2 font-sans text-xs">
            {/* 1. Header: Reported By vs Target User (Flat Split) */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-800">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reported By</span>
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={inspectReport.reporter?.avatarUrl}
                    name={inspectReport.reporter?.displayName || inspectReport.reporter?.username}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <Link
                      href={`/profile/${inspectReport.reporter?.username}`}
                      target="_blank"
                      className="font-bold text-slate-100 hover:text-rose-400 hover:underline"
                    >
                      @{inspectReport.reporter?.username}
                    </Link>
                    <span className="text-[11px] text-slate-400">{inspectReport.reporter?.displayName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-l border-slate-800 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Target {inspectReport.targetType.toUpperCase()}
                </span>
                {inspectReport.targetDetails ? (
                  inspectReport.targetType === 'user' ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={inspectReport.targetDetails.avatarUrl}
                        name={inspectReport.targetDetails.displayName || inspectReport.targetDetails.username}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <Link
                          href={`/profile/${inspectReport.targetDetails.username}`}
                          target="_blank"
                          className="font-bold text-slate-100 hover:text-rose-400 hover:underline"
                        >
                          @{inspectReport.targetDetails.username}
                        </Link>
                        <span className="text-[11px] text-slate-400">{inspectReport.targetDetails.displayName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={inspectReport.targetDetails.author?.avatarUrl}
                        name={inspectReport.targetDetails.author?.displayName || inspectReport.targetDetails.author?.username}
                        size="xs"
                      />
                      {inspectReport.targetDetails.author?.username ? (
                        <Link
                          href={`/profile/${inspectReport.targetDetails.author.username}`}
                          target="_blank"
                          className="font-bold text-slate-200 hover:text-rose-400 hover:underline"
                        >
                          @{inspectReport.targetDetails.author.username}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-400">Unknown Author</span>
                      )}
                    </div>
                  )
                ) : (
                  <span className="text-slate-500 italic">Content unavailable</span>
                )}
              </div>
            </div>

            {/* 2. Reason & Evidence (Flat, No Inner Card) */}
            <div className="flex flex-col gap-2 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reason: </span>
                <span className="font-bold text-rose-400 uppercase">{inspectReport.reason}</span>
              </div>

              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evidence</span>

              {evidence.text ? (
                <p className="text-slate-200 italic leading-relaxed">
                  "{evidence.text}"
                </p>
              ) : (
                <p className="text-slate-500 italic">No text description provided</p>
              )}

              {evidence.images.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex gap-2 flex-wrap">
                    {evidence.images.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedEvidenceImg(idx)}
                        className={`w-14 h-14 rounded overflow-hidden shrink-0 border transition-all ${idx === selectedEvidenceImg ? 'border-rose-500' : 'border-slate-800'
                          }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-center max-h-60">
                    <img
                      src={evidence.images[selectedEvidenceImg]}
                      alt="Evidence"
                      className="object-contain max-h-56 rounded border border-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Content Preview (Flat) */}
            {inspectReport.targetType !== 'user' && inspectReport.targetDetails && (
              <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Reported Content
                </span>
                <p className="text-slate-200 leading-relaxed italic">
                  "{inspectReport.targetDetails.content}"
                </p>
              </div>
            )}

            {/* 4. Actions & Notes */}
            {inspectReport.status === 'pending' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-300">Moderation Notes</label>
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Optional moderation notes..."
                    className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {inspectReport.targetType !== 'user' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={deleteContentOnResolve}
                      onChange={(e) => setDeleteContentOnResolve(e.target.checked)}
                      className="accent-rose-500"
                    />
                    <span>Delete reported {inspectReport.targetType} immediately</span>
                  </label>
                )}

                {activeAction === null ? (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveAction('dismiss');
                        setSelectedSanction('no_action');
                      }}
                      className="flex-1 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100 font-bold"
                    >
                      Dismiss Report
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setActiveAction('resolve');
                        setSelectedSanction('no_action');
                      }}
                      className="flex-1 font-bold"
                    >
                      Resolve Report
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveAction(null)}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[1d1px] font-bold"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <span className="text-[11px] font-bold uppercase text-slate-200">
                        {activeAction === 'resolve' ? 'Select Sanction for Reported User' : 'Select Sanction for Reporter'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(activeAction === 'resolve'
                        ? [
                          { id: 'no_action', label: 'No Action' },
                          { id: 'warning', label: 'Warning' },
                          { id: 'suspension', label: 'Suspend' },
                          { id: 'ban', label: 'Ban' },
                        ]
                        : [
                          { id: 'no_action', label: 'No Action' },
                          { id: 'warning', label: 'Warn' },
                          { id: 'suspension', label: 'Suspend' },
                        ]
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedSanction(item.id as any)}
                          className={`flex-1 p-2 rounded border text-xs font-bold transition-all text-center ${selectedSanction === item.id
                            ? 'bg-rose-500/20 border-rose-500 text-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {selectedSanction === 'suspension' && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Suspension Period</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase">From</label>
                            <input
                              type="datetime-local"
                              value={suspensionFrom}
                              disabled
                              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-200 font-semibold uppercase">To</label>
                            <input
                              type="datetime-local"
                              value={suspensionTo}
                              onChange={(e) => setSuspensionTo(e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => setActiveAction(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant={activeAction === 'resolve' ? 'danger' : 'secondary'}
                        size="sm"
                        isLoading={activeAction === 'resolve' ? isResolving : isDismissing}
                        onClick={activeAction === 'resolve' ? handleConfirmResolve : handleConfirmDismiss}
                        className="font-bold"
                      >
                        {activeAction === 'resolve' ? 'Confirm Resolve' : 'Confirm Dismiss'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
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
