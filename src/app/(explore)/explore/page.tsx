import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/profile';
import { getDiscoverableProjects, getProjectCategories } from '@/lib/queries/projects';
import { ProjectCard } from '@/components/domain/project/project-card';
import { Button } from '@/components/ui/button';
import {
  Compass,
  Search,
  Plus,
  Users,
  Sparkles,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';

interface ExplorePageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    stage?: string;
    page?: string;
  }>;
}

export const metadata = {
  title: 'Explore Projects | Build Together',
  description:
    'Discover developer projects, join early-stage teams, and build products together with deterministic skill matching.',
};

export default async function ExplorePage(props: ExplorePageProps) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || '';
  const category = searchParams.category || 'all';
  const stage = searchParams.stage || 'all';
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const pageSize = 12;

  const { user } = await getCurrentUser();

  const [categories, { projects, totalCount }] = await Promise.all([
    getProjectCategories(),
    getDiscoverableProjects(
      {
        search: search || undefined,
        category: category !== 'all' ? category : undefined,
        stage: stage !== 'all' ? stage : undefined,
        page: currentPage,
        pageSize,
      },
      user?.id
    ),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilters = Boolean(search || (category && category !== 'all') || (stage && stage !== 'all'));

  const buildQueryUrl = (params: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (category && category !== 'all') next.set('category', category);
    if (stage && stage !== 'all') next.set('stage', stage);
    if (currentPage > 1) next.set('page', String(currentPage));

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });

    const qs = next.toString();
    return `/explore${qs ? `?${qs}` : ''}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary text-content-inverse">
              <Compass className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-content-primary">
              Discover Projects
            </h1>
          </div>
          <p className="text-sm text-content-secondary max-w-2xl">
            Explore active developer projects looking for collaborators.
            {user
              ? ' Projects are dynamically scored and ranked according to your skills, technology stack, and availability.'
              : ' Sign in to see deterministic compatibility match scores for your profile.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link href="/explore/roles">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4 text-accent-primary" />
              <span>Open Roles Board</span>
            </Button>
          </Link>

          {user && (
            <Link href="/projects/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Start a Project</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 shadow-sm">
        <form method="GET" action="/explore" className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Search Input */}
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-xs font-medium text-content-secondary">
              Search by name, tagline or keywords
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-content-muted" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="e.g. telemetry, devtools, AI..."
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 pl-9 pr-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-xs font-medium text-content-secondary">Category</label>
            <select
              name="category"
              defaultValue={category}
              className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1.5 text-xs text-content-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Dropdown */}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-content-secondary">Stage</label>
            <select
              name="stage"
              defaultValue={stage}
              className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1.5 text-xs text-content-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
            >
              <option value="all">All Stages</option>
              <option value="idea">Idea</option>
              <option value="planning">Planning</option>
              <option value="in_development">In Development</option>
              <option value="testing">Testing</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>

          {/* Submit / Reset Actions */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm" className="w-full gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
            </Button>
            {hasActiveFilters && (
              <Link href="/explore">
                <Button type="button" variant="ghost" size="sm" className="text-xs text-content-muted">
                  Reset
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-content-secondary">
        <span>
          Showing <strong className="text-content-primary">{projects.length}</strong> of{' '}
          <strong className="text-content-primary">{totalCount}</strong> discoverable projects
        </span>
        {user && (
          <span className="inline-flex items-center gap-1 text-[11px] text-accent-primary">
            <Sparkles className="h-3.5 w-3.5" /> Ranked by compatibility
          </span>
        )}
      </div>

      {/* Project Cards Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((item) => (
            <ProjectCard key={item.project.id} data={item} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-app-surface-1 p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-content-primary">No projects found</h3>
            <p className="text-xs text-content-secondary max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing filters to see more results.'
                : 'No public projects have been created yet. Be the first to start building!'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {hasActiveFilters ? (
              <Link href="/explore">
                <Button variant="outline" size="sm">
                  Clear Filters
                </Button>
              </Link>
            ) : user ? (
              <Link href="/projects/new">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Start First Project
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle pt-6">
          <div className="text-xs text-content-secondary">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link href={buildQueryUrl({ page: currentPage - 1 })}>
                <Button variant="outline" size="sm" className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            )}

            {currentPage < totalPages ? (
              <Link href={buildQueryUrl({ page: currentPage + 1 })}>
                <Button variant="outline" size="sm" className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
