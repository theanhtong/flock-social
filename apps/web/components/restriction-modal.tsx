'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useRestrictionStore } from '@/store/restriction-store';
import { Modal } from '@/components/ui/modal';

export function RestrictionModal() {
    const restriction = useRestrictionStore((s) => s.restriction);
    const setRestriction = useRestrictionStore((s) => s.setRestriction);

    if (!restriction) return null;
    const isBanned = restriction.status === 'banned';

    return (
        <Modal isOpen={!!restriction} onClose={() => setRestriction(null)} title={isBanned ? 'Account Banned' : 'Account Suspended'}>
            <div className="flex flex-col gap-4 py-2 font-sans text-xs">
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2">
                    {isBanned ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">
                            {isBanned ? 'Your account has been permanently banned.' : 'Your account is temporarily suspended.'}
                        </span>
                        {restriction.reason && <span>Reason: {restriction.reason}</span>}
                        {restriction.expiresAt && (
                            <span>Until: {new Date(restriction.expiresAt).toLocaleString()}</span>
                        )}
                    </div>
                </div>
                <p className="text-slate-400">
                    You can still view content, but cannot post, like, comment, or interact until this is resolved.
                </p>
            </div>
        </Modal>
    );
}