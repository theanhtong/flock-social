'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'full';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
      secondary:
        'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 active:bg-slate-800',
      outline:
        'border border-slate-700 text-slate-200 hover:bg-slate-800 active:bg-slate-900',
      ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    };

    const sizeStyles = {
      sm: 'px-2.5 py-1 text-xs gap-1.5 min-h-[30px]',
      md: 'px-3.5 py-2 text-sm gap-2 min-h-[36px]',
      lg: 'px-4.5 py-2.5 text-base gap-2 min-h-[42px]',
      full: 'w-full py-2.5 text-sm gap-2 min-h-[38px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" variant="white" className="shrink-0" />
        ) : leftIcon ? (
          <span className="inline-flex items-center shrink-0">{leftIcon}</span>
        ) : null}
        <span className="inline-flex items-center justify-center gap-1.5">{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex items-center shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
