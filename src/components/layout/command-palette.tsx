'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FolderGit2,
  Users,
  MessageSquare,
  CheckSquare,
  ArrowRight,
  Loader2,
  X,
  Compass,
  Briefcase,
  Flame,
} from 'lucide-react';
import { globalSearchAction } from '@/lib/actions/search';
import type { GlobalSearchResponse } from '@/types/database';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlattenedSearchItem {
  id: string;
  type: 'project' | 'developer' | 'post' | 'task';
  title: string;
  subtitle: string;
  url: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<GlobalSearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut Cmd+K / Ctrl+K & Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event if external
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchAction({ q: trimmed, type: 'all', limit: 5 });
        if (res.success) {
          setResults(res.data);
          setSelectedIndex(0);
        } else {
          setResults(null);
        }
      } catch (err) {
        console.error('Failed to run search:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Build flattened items for keyboard arrow navigation
  const flattenedItems = React.useMemo<FlattenedSearchItem[]>(() => {
    if (!results) return [];
    const items: FlattenedSearchItem[] = [];

    results.projects.forEach((p) => {
      items.push({
        id: `p-${p.id}`,
        type: 'project',
        title: p.title,
        subtitle: p.tagline || p.category,
        url: `/projects/${p.slug}`,
      });
    });

    results.developers.forEach((d) => {
      items.push({
        id: `d-${d.id}`,
        type: 'developer',
        title: d.full_name || d.username,
        subtitle: d.headline || `@${d.username}`,
        url: `/developers/${d.username}`,
      });
    });

    results.posts.forEach((post) => {
      items.push({
        id: `post-${post.id}`,
        type: 'post',
        title: post.title,
        subtitle: `${post.post_type.replace('_', ' ')} • by @${post.author.username}`,
        url: `/feed/${post.id}`,
      });
    });

    results.tasks.forEach((t) => {
      items.push({
        id: `t-${t.id}`,
        type: 'task',
        title: t.title,
        subtitle: `${t.status.replace('_', ' ')} • ${t.project.title}`,
        url: `/projects/${t.project.slug}/workspace/tasks`,
      });
    });

    return items;
  }, [results]);

  const handleNavigate = (url: string) => {
    onClose();
    router.push(url);
  };

  const handleFullSearch = () => {
    if (!query.trim()) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flattenedItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flattenedItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flattenedItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flattenedItems.length) % flattenedItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedItems.length > 0 && selectedIndex < flattenedItems.length) {
        handleNavigate(flattenedItems[selectedIndex].url);
      } else {
        handleFullSearch();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border-strong bg-app-surface-1 shadow-2xl ring-1 ring-border-subtle flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border-subtle px-4 py-3 bg-app-surface-2/60">
          <Search className="h-5 w-5 text-content-muted mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, developers, posts, tasks..."
            className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-muted outline-none"
            aria-autocomplete="list"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-accent-primary mr-2" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults(null);
                inputRef.current?.focus();
              }}
              className="rounded p-1 text-content-muted hover:text-content-primary hover:bg-app-surface-3 transition-colors mr-2"
              aria-label="Clear query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border-subtle bg-app-surface-1 px-1.5 font-mono text-[10px] text-content-muted">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[60vh]">
          {/* Quick shortcuts if query is empty */}
          {!query.trim() && (
            <div className="p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-content-muted px-2">
                Quick Navigation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNavigate('/explore')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary group-hover:bg-accent-primary group-hover:text-content-inverse transition-colors">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-content-primary">Explore Projects</p>
                    <p className="text-xs text-content-muted">Discover open-source initiatives</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/explore/roles')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-status-info/10 text-status-info group-hover:bg-status-info group-hover:text-content-inverse transition-colors">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-content-primary">Open Roles</p>
                    <p className="text-xs text-content-muted">Find matching contributor spots</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/feed')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-status-warning/10 text-status-warning group-hover:bg-status-warning group-hover:text-content-inverse transition-colors">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-content-primary">Community Feed</p>
                    <p className="text-xs text-content-muted">Discussions, questions & updates</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('/network')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-content-secondary hover:bg-app-surface-2 hover:text-content-primary transition-colors group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-status-success/10 text-status-success group-hover:bg-status-success group-hover:text-content-inverse transition-colors">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-content-primary">Developer Network</p>
                    <p className="text-xs text-content-muted">Connect with peer creators</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Results List */}
          {results && flattenedItems.length > 0 && (
            <div className="space-y-4">
              {/* Projects Group */}
              {results.projects.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-3 py-1 flex items-center gap-1.5">
                    <FolderGit2 className="h-3.5 w-3.5" />
                    <span>Projects ({results.projects.length})</span>
                  </p>
                  <div className="space-y-1 mt-1">
                    {results.projects.map((p) => {
                      const idx = flattenedItems.findIndex((item) => item.id === `p-${p.id}`);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleNavigate(`/projects/${p.slug}`)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-accent-primary text-content-inverse'
                              : 'text-content-primary hover:bg-app-surface-2'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold">{p.title}</span>
                            {p.tagline && (
                              <span
                                className={`ml-2 text-xs truncate ${
                                  isSelected ? 'text-content-inverse/80' : 'text-content-muted'
                                }`}
                              >
                                {p.tagline}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black/20 text-content-inverse'
                                : 'bg-app-surface-3 text-content-secondary'
                            }`}
                          >
                            {p.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Developers Group */}
              {results.developers.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-3 py-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Developers ({results.developers.length})</span>
                  </p>
                  <div className="space-y-1 mt-1">
                    {results.developers.map((d) => {
                      const idx = flattenedItems.findIndex((item) => item.id === `d-${d.id}`);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleNavigate(`/developers/${d.username}`)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-accent-primary text-content-inverse'
                              : 'text-content-primary hover:bg-app-surface-2'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold">{d.full_name || d.username}</span>
                            <span
                              className={`ml-2 text-xs ${
                                isSelected ? 'text-content-inverse/80' : 'text-content-muted'
                              }`}
                            >
                              @{d.username}
                            </span>
                            {d.headline && (
                              <span
                                className={`ml-2 text-xs truncate ${
                                  isSelected ? 'text-content-inverse/70' : 'text-content-muted'
                                }`}
                              >
                                — {d.headline}
                              </span>
                            )}
                          </div>
                          {d.skills.length > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[120px] ${
                                isSelected
                                  ? 'bg-black/20 text-content-inverse'
                                  : 'bg-app-surface-3 text-content-secondary'
                              }`}
                            >
                              {d.skills.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Community Posts Group */}
              {results.posts.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-3 py-1 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Posts ({results.posts.length})</span>
                  </p>
                  <div className="space-y-1 mt-1">
                    {results.posts.map((post) => {
                      const idx = flattenedItems.findIndex((item) => item.id === `post-${post.id}`);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => handleNavigate(`/feed/${post.id}`)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-accent-primary text-content-inverse'
                              : 'text-content-primary hover:bg-app-surface-2'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold">{post.title}</span>
                            <span
                              className={`ml-2 text-xs ${
                                isSelected ? 'text-content-inverse/80' : 'text-content-muted'
                              }`}
                            >
                              by @{post.author.username}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] capitalize px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black/20 text-content-inverse'
                                : 'bg-app-surface-3 text-content-secondary'
                            }`}
                          >
                            {post.post_type.replace('_', ' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Workspace Tasks Group */}
              {results.tasks.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-3 py-1 flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Workspace Tasks ({results.tasks.length})</span>
                  </p>
                  <div className="space-y-1 mt-1">
                    {results.tasks.map((t) => {
                      const idx = flattenedItems.findIndex((item) => item.id === `t-${t.id}`);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleNavigate(`/projects/${t.project.slug}/workspace/tasks`)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'bg-accent-primary text-content-inverse'
                              : 'text-content-primary hover:bg-app-surface-2'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold">{t.title}</span>
                            <span
                              className={`ml-2 text-xs ${
                                isSelected ? 'text-content-inverse/80' : 'text-content-muted'
                              }`}
                            >
                              in {t.project.title}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black/20 text-content-inverse'
                                : 'bg-app-surface-3 text-content-secondary'
                            }`}
                          >
                            {t.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results message */}
          {query.trim() && !isLoading && results && flattenedItems.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-content-primary">
                No matching results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-content-muted mt-1">
                Try searching with different keywords or check out the dedicated search page.
              </p>
              <button
                type="button"
                onClick={handleFullSearch}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-accent-primary hover:underline"
              >
                <span>Open in dedicated search</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer info & shortcut hints */}
        <div className="border-t border-border-subtle bg-app-surface-2/60 px-4 py-2.5 flex items-center justify-between text-xs text-content-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border-subtle bg-app-surface-1 px-1 font-mono text-[10px]">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border-subtle bg-app-surface-1 px-1 font-mono text-[10px]">
                ↵
              </kbd>
              <span>Select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border-subtle bg-app-surface-1 px-1 font-mono text-[10px]">
                Esc
              </kbd>
              <span>Close</span>
            </span>
          </div>

          {query.trim() && (
            <button
              type="button"
              onClick={handleFullSearch}
              className="inline-flex items-center gap-1 font-medium text-accent-primary hover:underline"
            >
              <span>Full results for &ldquo;{query}&rdquo;</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
