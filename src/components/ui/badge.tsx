import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    neutral: 'bg-app-surface-2 text-content-secondary border-border-subtle',
    success: 'bg-status-success/10 text-status-success border-status-success/20',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    danger: 'bg-status-danger/10 text-status-danger border-status-danger/20',
    info: 'bg-status-info/10 text-status-info border-status-info/20',
    accent: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
