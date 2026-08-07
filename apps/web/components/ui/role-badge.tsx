'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type UserRole = 'customer' | 'bot_system' | 'moderator' | 'admin';

export interface RoleBadgeProps {
  role?: UserRole | string;
  size?: 'sm' | 'md';
  className?: string;
}

const roleConfigs: Record<string, { label: string; style: string }> = {
  admin: {
    label: 'ADMIN',
    style: 'bg-red-950/80 text-red-400 border-red-800/80',
  },
  moderator: {
    label: 'MODERATOR',
    style: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
  },
  bot_system: {
    label: 'BOT',
    style: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80',
  },
  customer: {
    label: 'MEMBER',
    style: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role = 'customer',
  size = 'sm',
  className,
}) => {
  const config = roleConfigs[role] || roleConfigs.customer;

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold tracking-wider',
    md: 'text-xs px-2 py-0.5 font-semibold tracking-wider',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border uppercase select-none font-sans',
        config.style,
        sizeStyles[size],
        className
      )}
    >
      {config.label}
    </span>
  );
};
