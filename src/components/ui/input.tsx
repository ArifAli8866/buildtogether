import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-content-secondary">
            {label}
            {props.required && <span className="ml-1 text-status-danger">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border bg-app-surface-1 px-3 py-1.5 text-sm text-content-primary placeholder:text-content-muted shadow-sm transition-colors',
            'border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-status-danger focus-visible:ring-status-danger',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-status-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-content-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
