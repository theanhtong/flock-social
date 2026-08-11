'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useMessageStore } from '@/store/message-store';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';
import { CreateGroupModal } from '@/components/messages/create-group-modal';
import { SidebarLayout } from '@/components/layout/sidebar';
import { Loader2 } from 'lucide-react';

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convIdFromUrl = searchParams ? searchParams.get('convId') : null;

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { initSocketListeners, cleanSocketListeners, activeConversationId, setActiveConversationId } = useMessageStore();

  useEffect(() => {
    if (isLoading) return;

    if (!token && !user) {
      router.push('/login');
      return;
    }

    if (convIdFromUrl) {
      setActiveConversationId(convIdFromUrl);
    } else {
      setActiveConversationId(null);
    }
    initSocketListeners();

    return () => {
      cleanSocketListeners();
    };
  }, [isLoading, token, user, router, convIdFromUrl, initSocketListeners, cleanSocketListeners, setActiveConversationId]);

  if (isLoading || (!token && !user)) {
    return (
      <div className="flex-1 flex items-center justify-center text-blue-500 min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <SidebarLayout
      childrenSpan="md:col-span-3"
      rightPanelSpan="md:col-span-6"
      rightPanel={
        <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-col h-[calc(90vh-100px)] min-h-0 bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xl`}>
          <ChatWindow />
        </div>
      }
    >
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} flex-col h-[calc(90vh-100px)] min-h-0 bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xl`}>
        <ConversationList />
      </div>

      {/* Modals & Dialogs */}
      <CreateGroupModal />
    </SidebarLayout>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-blue-500 min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
