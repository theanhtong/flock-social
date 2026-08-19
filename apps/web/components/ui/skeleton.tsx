import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-800/70 ${className}`}
      {...props}
    />
  );
}

export function NotificationItemSkeleton() {
  return (
    <div className="p-4 border-b border-slate-800/60 flex items-start gap-3 animate-pulse">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="w-12 h-3" />
    </div>
  );
}

export function ReportRowSkeleton() {
  return (
    <div className="p-4 flex items-center justify-between border-b border-slate-800/60 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <Skeleton className="w-24 h-7 rounded shrink-0 ml-3" />
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded flex flex-col gap-3 animate-pulse font-sans">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xl flex flex-col font-sans animate-pulse">
      <Skeleton className="h-36 sm:h-44 w-full rounded-none" />
      <div className="p-6 relative pt-0 flex flex-col gap-4">
        <div className="-mt-10 sm:-mt-12 flex justify-between items-end">
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-slate-900" />
          <Skeleton className="w-24 h-8 rounded" />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-3/4 mt-1" />
        </div>
        <div className="flex gap-4 pt-2 border-t border-slate-800/60">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="p-4 flex items-center justify-between border-b border-slate-800/60 animate-pulse font-sans">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 flex-1 max-w-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  );
}
