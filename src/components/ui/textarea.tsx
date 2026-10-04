import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-content-secondary">
            {label}
            {props.required && <span className="ml-1 text-status-danger">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            'flex w-full rounded-md border bg-app-surface-1 px-3 py-2 text-sm text-content-primary placeholder:text-content-muted shadow-sm transition-colors',
            'border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]',
            error && 'border-status-danger focus-visible:ring-status-danger',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-status-danger">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="text-xs text-content-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
