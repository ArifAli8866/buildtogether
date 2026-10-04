'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors securely without leaking confidential data
    console.error('Application Error Boundary caught an error:', error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-status-danger">Error</p>
        <h1 className="text-3xl font-bold tracking-tight text-content-primary">
          Something went wrong
        </h1>
        <p className="text-content-secondary max-w-md">
          An unexpected error occurred. Please try reloading the view.
        </p>
        <div className="pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-content-inverse transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Try Again
          </button>
        </div>
      </div>
    </main>
  );
}
