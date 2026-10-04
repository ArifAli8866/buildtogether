'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { signOutAction } from '@/lib/actions/auth';
import type { Profile } from '@/types/database';
import { NotificationPopover } from '@/components/layout/notification-popover';
import { CommandPalette } from '@/components/layout/command-palette';
import { Menu, X, User, Settings, LogOut, Code2, Search } from 'lucide-react';

interface NavbarProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}

export function Navbar({ user, profile }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const pathname = usePathname();

  // Listen for custom open event
  React.useEffect(() => {
    const handleOpen = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

  // Close menus on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setCommandPaletteOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-app-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight text-content-primary transition-opacity hover:opacity-90"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-primary text-content-inverse">
              <Code2 className="h-4 w-4" />
            </div>
            <span>Build Together</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-content-secondary">
            <Link
              href="/explore"
              className={`rounded-md px-3 py-1.5 transition-colors hover:text-content-primary ${
                pathname === '/explore' ? 'text-content-primary font-semibold' : ''
              }`}
            >
              Explore
            </Link>
            <Link
              href="/explore/roles"
              className={`rounded-md px-3 py-1.5 transition-colors hover:text-content-primary ${
                pathname === '/explore/roles' ? 'text-content-primary font-semibold' : ''
              }`}
            >
              Open Roles
            </Link>
            <Link
              href="/feed"
              className={`rounded-md px-3 py-1.5 transition-colors hover:text-content-primary ${
                pathname.startsWith('/feed') ? 'text-content-primary font-semibold' : ''
              }`}
            >
              Feed
            </Link>
            {user && (
              <>
                <Link
                  href="/network"
                  className={`rounded-md px-3 py-1.5 transition-colors hover:text-content-primary ${
                    pathname === '/network' ? 'text-content-primary font-semibold' : ''
                  }`}
                >
                  Network
                </Link>
                <Link
                  href="/dashboard"
                  className={`rounded-md px-3 py-1.5 transition-colors hover:text-content-primary ${
                    pathname === '/dashboard' ? 'text-content-primary font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right side: Search, Auth Controls & Project CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border-subtle bg-app-surface-2/80 px-2.5 py-1.5 text-xs text-content-muted hover:border-border-default hover:text-content-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Search Build Together (Cmd+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Search...</span>
            <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border-subtle bg-app-surface-1 px-1 font-mono text-[10px] text-content-muted">
              <span>⌘</span>K
            </kbd>
          </button>

          {user && (
            <Link href="/projects/new">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                <span>Start Project</span>
              </Button>
            </Link>
          )}
          {user && <NotificationPopover userId={user.id} />}
          {user && profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-full p-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  fallbackText={profile.full_name}
                  size="sm"
                />
                <span className="text-xs font-medium text-content-primary max-w-[120px] truncate">
                  {profile.username}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg border border-border-subtle bg-app-surface-1 py-1.5 shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-border-subtle px-3 py-2 text-xs">
                    <p className="font-semibold text-content-primary truncate">{profile.full_name}</p>
                    <p className="text-content-muted truncate">{user.email}</p>
                  </div>

                  <Link
                    href={`/developers/${profile.username}`}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                    role="menuitem"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>View Profile</span>
                  </Link>

                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                    role="menuitem"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Settings</span>
                  </Link>

                  <div className="border-t border-border-subtle my-1" />

                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-status-danger hover:bg-status-danger/10"
                      role="menuitem"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex md:hidden items-center gap-1">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="rounded-md p-1.5 text-content-secondary hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Search Build Together"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-content-secondary hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border-subtle bg-app-surface-1 px-4 py-3 md:hidden space-y-3">
          {/* Mobile Search Bar */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setCommandPaletteOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-left text-xs text-content-muted hover:border-border-default hover:text-content-primary transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search Build Together...</span>
            <kbd className="ml-auto rounded border border-border-subtle bg-app-surface-1 px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          {user && profile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 border-b border-border-subtle pb-2">
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  fallbackText={profile.full_name}
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-content-primary">{profile.full_name}</p>
                  <p className="text-xs text-content-muted">@{profile.username}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-sm font-medium">
                <Link
                  href="/explore"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Explore Projects
                </Link>
                <Link
                  href="/explore/roles"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Open Roles
                </Link>
                <Link
                  href="/feed"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Community Feed
                </Link>
                <Link
                  href="/network"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Developer Network
                </Link>
                <Link
                  href="/projects/new"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Start a Project
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/developers/${profile.username}`}
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  View Profile
                </Link>
                <Link
                  href="/settings/profile"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Profile Settings
                </Link>
              </div>

              <form action={signOutAction} className="pt-2 border-t border-border-subtle">
                <Button variant="danger" size="sm" className="w-full">
                  Sign Out
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-col gap-1 text-sm font-medium pb-2 border-b border-border-subtle">
                <Link
                  href="/explore"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Explore Projects
                </Link>
                <Link
                  href="/explore/roles"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Open Roles
                </Link>
                <Link
                  href="/feed"
                  className="rounded-md px-2 py-1.5 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                >
                  Community Feed
                </Link>
              </div>
              <Link href="/login" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" className="w-full">
                <Button variant="primary" size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </header>
  );
}
