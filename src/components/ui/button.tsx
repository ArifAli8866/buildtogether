import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-app-bg disabled:opacity-50 disabled:pointer-events-none rounded-md';

    const variants = {
      primary:
        'bg-accent-primary text-content-inverse hover:bg-accent-primary-hover active:opacity-95 shadow-sm',
      secondary:
        'bg-app-surface-2 text-content-primary hover:bg-app-surface-3 border border-border-subtle',
      outline:
        'border border-border-strong text-content-primary hover:bg-app-surface-2 bg-transparent',
      ghost:
        'text-content-secondary hover:text-content-primary hover:bg-app-surface-2 bg-transparent',
      danger:
        'bg-status-danger text-content-inverse hover:opacity-90 active:opacity-95 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
