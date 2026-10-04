import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-primary">404</p>
        <h1 className="text-3xl font-bold tracking-tight text-content-primary">Page not found</h1>
        <p className="text-content-secondary max-w-md">
          The requested page or resource could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-content-inverse transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
