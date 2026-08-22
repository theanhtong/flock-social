'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-sm p-8 shadow-2xl space-y-6 text-center">
        <div className="inline-flex p-4 bg-rose-500/10 border border-rose-500/20 rounded-sm text-rose-400">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Something went wrong!</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            An unexpected error occurred while rendering this page. Our team has been notified.
          </p>
          {error?.message && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-sm text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-24">
              {error.message}
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={() => reset()}
            variant="primary"
            size="sm"
            className="w-full sm:w-auto px-5 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto px-5 gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
