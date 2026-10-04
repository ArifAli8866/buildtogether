import Link from 'next/link';
import { User, GitFork } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Settings</h1>
        <p className="text-sm text-content-secondary">
          Manage your developer profile, account details, and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
            <Link
              href="/settings/profile"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Developer Profile</span>
            </Link>
            <Link
              href="/settings/connections"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors"
            >
              <GitFork className="h-4 w-4" />
              <span>Connected Accounts</span>
            </Link>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
