'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { Header } from '@/components/layout/header';
import { LoginModal } from '@/components/auth/login-modal';
import { RegisterModal } from '@/components/auth/register-modal';

export default function UiKitPage() {
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const openRegisterModal = useAuthStore((s) => s.openRegisterModal);

  const [sampleOtp, setSampleOtp] = useState('');
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8 font-sans">
        {/* Page Title */}
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Flock UI Kit System</h1>
            <p className="text-xs text-slate-400">
              Minimalist component library (Rounded ~ 4px, high-contrast dark theme)
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openLoginModal}>
            Test Login Modal
          </Button>
        </div>

        {/* 1. Buttons Section */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            1. Button (`Button`)
          </h2>

          <div className="flex flex-col gap-3 font-sans">
            <span className="text-xs text-slate-400">Variants</span>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>

            <span className="text-xs text-slate-400 mt-2">Sizes</span>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large (lg)</Button>
            </div>

            <span className="text-xs text-slate-400 mt-2">States</span>
            <div className="flex flex-wrap gap-3 items-center">
              <Button isLoading variant="primary">Loading</Button>
              <Button disabled variant="primary">Disabled</Button>
            </div>
          </div>
        </section>

        {/* 2. Role Badges */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            2. Role Badges (`RoleBadge`)
          </h2>

          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <RoleBadge role="admin" size="sm" />
              <span className="text-xs text-slate-400">System Admin</span>
            </div>

            <div className="flex items-center gap-2">
              <RoleBadge role="moderator" size="sm" />
              <span className="text-xs text-slate-400">Content Moderator</span>
            </div>

            <div className="flex items-center gap-2">
              <RoleBadge role="bot_system" size="sm" />
              <span className="text-xs text-slate-400">System Bot</span>
            </div>

            <div className="flex items-center gap-2">
              <RoleBadge role="customer" size="sm" />
              <span className="text-xs text-slate-400">Standard Member</span>
            </div>
          </div>
        </section>

        {/* 3. Text Inputs Section */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            3. Text Input (`Input`)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              placeholder="Alex Mercer"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.length < 3) {
                  setInputError('Name must be at least 3 characters');
                } else {
                  setInputError('');
                }
              }}
              error={inputError}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Password"
              defaultValue="Password123"
            />

            <Input
              label="Disabled Input"
              value="user@flock.social"
              disabled
              readOnly
            />

            <Input
              label="Error State Input"
              value="invalid-username"
              error="Username already taken"
              readOnly
            />
          </div>
        </section>

        {/* 4. OTP Code Input */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            4. OTP Code Input (`OtpInput`)
          </h2>

          <div className="flex flex-col items-center gap-3 py-2">
            <OtpInput value={sampleOtp} onChange={setSampleOtp} />
            <p className="text-xs text-slate-400">
              Value: <span className="text-blue-400 font-mono">{sampleOtp || '(empty)'}</span>
            </p>
          </div>
        </section>

        {/* 5. Avatars */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            5. Avatar (`Avatar`)
          </h2>

          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar size="xs" name="Alex Mercer" />
              <span className="text-xs text-slate-500">xs</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Avatar size="sm" name="Alex Mercer" />
              <span className="text-xs text-slate-500">sm</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Avatar size="md" name="John Doe" isOnline />
              <span className="text-xs text-slate-500">md + Online</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Avatar size="lg" name="Flock Admin" isOnline />
              <span className="text-xs text-slate-500">lg + Online</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Avatar
                size="xl"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop"
                name="Sarah"
              />
              <span className="text-xs text-slate-500">xl + Image</span>
            </div>
          </div>
        </section>

        {/* 6. Spinners */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            6. Spinner (`Spinner`)
          </h2>

          <div className="flex gap-6 items-center">
            <Spinner size="sm" variant="primary" />
            <Spinner size="md" variant="primary" />
            <Spinner size="lg" variant="primary" />
            <Spinner size="xl" variant="white" />
          </div>
        </section>

        {/* 7. Toasts & Modals */}
        <section className="flex flex-col gap-4 p-5 border border-slate-800 bg-slate-900 rounded font-sans">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
            7. Toast & Modal (`Sonner Toast`, `Modal`)
          </h2>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Saved successfully')}
            >
              Success Toast
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.error('An error occurred')}
            >
              Error Toast
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Information message')}
            >
              Info Toast
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSampleModalOpen(true)}
            >
              Open Sample Modal
            </Button>

            <Button variant="primary" size="sm" onClick={openRegisterModal}>
              Open Register Modal
            </Button>
          </div>
        </section>
      </main>

      {/* Sample Modal */}
      <Modal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title="Confirm Action"
      >
        <div className="flex flex-col gap-4 py-2 font-sans">
          <p className="text-xs text-slate-300">
            Sample content rendered inside a minimal modal with 4px rounded corners.
          </p>
          <div className="flex justify-end gap-2 pt-2 font-sans">
            <Button variant="outline" size="sm" onClick={() => setSampleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setSampleModalOpen(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auth Modals */}
      <LoginModal />
      <RegisterModal />
    </div>
  );
}
