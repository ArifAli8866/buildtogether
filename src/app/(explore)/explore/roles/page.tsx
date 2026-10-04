import Link from 'next/link';
import { getDiscoverableRoles } from '@/lib/queries/projects';
import { getCurrentUser } from '@/lib/queries/profile';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Users,
  Search,
  Clock,
  Briefcase,
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface RolesPageProps {
  searchParams: Promise<{
    search?: string;
    skill?: string;
    page?: string;
  }>;
}

export const metadata = {
  title: 'Open Roles | Build Together',
  description:
    'Find open contributor positions on active software projects across the developer community.',
};

export default async function OpenRolesPage(props: RolesPageProps) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || '';
  const skill = searchParams.skill || '';
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const pageSize = 15;

  const { user } = await getCurrentUser();

  const { roles, totalCount } = await getDiscoverableRoles({
    search: search || undefined,
    skill: skill || undefined,
    page: currentPage,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilters = Boolean(search || skill);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary text-content-inverse">
              <Users className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-content-primary">
              Open Contributor Roles
            </h1>
          </div>
          <p className="text-sm text-content-secondary max-w-2xl">
            Browse specific positions projects are actively looking to fill. Filter by required
            skills, domain competencies, or commitment level.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/explore">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Compass className="h-4 w-4" />
              <span>Browse All Projects</span>
            </Button>
          </Link>
          {user && (
            <Link href="/projects/new">
              <Button variant="primary" size="sm">
                Publish a Role
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 shadow-sm">
        <form method="GET" action="/explore/roles" className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6 space-y-1">
            <label className="block text-xs font-medium text-content-secondary">
              Search role title or description
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-content-muted" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="e.g. Frontend Engineer, DevOps, UI Designer..."
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 pl-9 pr-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
              />
            </div>
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className="block text-xs font-medium text-content-secondary">
              Filter by specific skill
            </label>
            <input
              type="text"
              name="skill"
              defaultValue={skill}
              placeholder="e.g. TypeScript, React, Docker..."
              className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              Filter Roles
            </Button>
            {hasActiveFilters && (
              <Link href="/explore/roles">
                <Button type="button" variant="ghost" size="sm" className="text-xs text-content-muted">
                  Reset
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Roles Count */}
      <div className="text-xs text-content-secondary">
        Found <strong className="text-content-primary">{roles.length}</strong> available positions
      </div>

      {/* Roles List */}
      {roles.length > 0 ? (
        <div className="space-y-4">
          {roles.map(({ role, project, owner }) => (
            <Card
              key={role.id}
              className="transition-all hover:border-border-focus hover:shadow-sm p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-content-primary">{role.title}</h2>
                    <Badge variant="accent" size="sm">
                      {role.capacity_count - role.filled_count} open
                    </Badge>
                  </div>

                  {/* Project Parent Link */}
                  <div className="flex items-center gap-2 text-xs text-content-secondary">
                    <span>at project:</span>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="font-semibold text-content-primary hover:text-accent-primary underline decoration-dotted"
                    >
                      {project.title}
                    </Link>
                    <span>&bull;</span>
                    <Badge variant="neutral" size="sm">
                      {project.category}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className="flex items-center gap-1 rounded-md bg-app-surface-2 px-2.5 py-1 text-content-secondary font-medium">
                    <Clock className="h-3.5 w-3.5 text-accent-primary" />
                    {role.commitment_hours_per_week || 10} hrs/week
                  </span>
                  <Link href={`/projects/${project.slug}`}>
                    <Button variant="primary" size="sm" className="gap-1">
                      <span>View Project</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-content-secondary leading-relaxed line-clamp-2">
                {role.description}
              </p>

              {/* Required Skills & Project Owner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mr-1">
                    Skills:
                  </span>
                  {role.required_skills?.map((s) => (
                    <Badge key={s} variant="neutral" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>

                <Link
                  href={`/developers/${owner.username}`}
                  className="flex items-center gap-2 group/owner shrink-0"
                >
                  <Avatar
                    src={owner.avatar_url}
                    alt={owner.full_name}
                    fallbackText={owner.full_name}
                    size="sm"
                  />
                  <span className="text-xs text-content-secondary group-hover/owner:text-content-primary">
                    Project Lead: <strong>{owner.full_name}</strong>
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-app-surface-1 p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-content-primary">No open roles found</h3>
            <p className="text-xs text-content-secondary max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your search or clearing active skill filters.'
                : 'No projects have published contributor roles yet.'}
            </p>
          </div>
          {hasActiveFilters && (
            <div className="pt-2">
              <Link href="/explore/roles">
                <Button variant="outline" size="sm">
                  Clear Filters
                </Button>
              </Link>
            </div>
          )}
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
              <Link
                href={`/explore/roles?page=${currentPage - 1}${search ? `&search=${search}` : ''}${
                  skill ? `&skill=${skill}` : ''
                }`}
              >
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
              <Link
                href={`/explore/roles?page=${currentPage + 1}${search ? `&search=${search}` : ''}${
                  skill ? `&skill=${skill}` : ''
                }`}
              >
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
