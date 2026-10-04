'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  FolderGit2,
  Users,
  MessageSquare,
  CheckSquare,
  Sparkles,
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Tag,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type {
  SearchEntityType,
  GlobalSearchResponse,
  ProjectSearchItem,
  DeveloperSearchItem,
  PostSearchItem,
  TaskSearchItem,
} from '@/types/database';

interface SearchViewProps {
  initialQuery: string;
  initialType: SearchEntityType;
  initialData: GlobalSearchResponse;
}

export function SearchView({
  initialQuery,
  initialType,
  initialData,
}: SearchViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputVal, setInputVal] = React.useState(initialQuery);
  const activeType = (searchParams.get('type') as SearchEntityType) || initialType || 'all';
  const query = searchParams.get('q') ?? initialQuery;

  // Sync state if URL search query changes
  React.useEffect(() => {
    setInputVal(query);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) {
      router.push('/search');
      return;
    }
    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (activeType !== 'all') {
      params.set('type', activeType);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleTypeChange = (newType: SearchEntityType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newType === 'all') {
      params.delete('type');
    } else {
      params.set('type', newType);
    }
    router.push(`/search?${params.toString()}`);
  };

  const totalResults = initialData.totalCount;
  const projectCount = initialData.projects.length;
  const devCount = initialData.developers.length;
  const postCount = initialData.posts.length;
  const taskCount = initialData.tasks.length;

  const showProjects = activeType === 'all' || activeType === 'projects';
  const showDevs = activeType === 'all' || activeType === 'developers';
  const showPosts = activeType === 'all' || activeType === 'posts';
  const showTasks = activeType === 'all' || activeType === 'tasks';

  const filterTabs: { id: SearchEntityType; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', count: totalResults, icon: <Sparkles className="h-4 w-4" /> },
    { id: 'projects', label: 'Projects', count: projectCount, icon: <FolderGit2 className="h-4 w-4" /> },
    { id: 'developers', label: 'Developers', count: devCount, icon: <Users className="h-4 w-4" /> },
    { id: 'posts', label: 'Community Posts', count: postCount, icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'tasks', label: 'Workspace Tasks', count: taskCount, icon: <CheckSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary">
          Global Discovery
        </h1>
        <p className="mt-1 text-sm text-content-secondary">
          Search across public initiatives, developer profiles, technical discussions, and workspace tasks.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search projects, developers, tags, topics, tasks..."
              className="w-full rounded-lg border border-border-default bg-app-surface-1 py-2.5 pl-10 pr-4 text-sm text-content-primary placeholder:text-content-muted shadow-sm transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        {/* Filter Tabs */}
        {query && (
          <div className="mt-6 flex flex-wrap gap-2 border-b border-border-subtle pb-3">
            {filterTabs.map((tab) => {
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-accent-primary text-content-inverse shadow-sm'
                      : 'bg-app-surface-1 text-content-secondary border border-border-subtle hover:bg-app-surface-2 hover:text-content-primary'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-content-inverse'
                        : 'bg-app-surface-3 text-content-secondary'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!query ? (
        /* Empty Query Guide */
        <div className="rounded-xl border border-dashed border-border-default p-12 text-center bg-app-surface-1/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-content-primary">
            Enter a keyword to explore
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-content-muted">
            Find projects looking for your skills, discover fellow software architects, browse community solutions, or find workspace issues.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-content-muted">Try searching for:</span>
            {['TypeScript', 'Rust', 'Next.js', 'AI', 'Full Stack', 'Open Source'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setInputVal(term);
                  router.push(`/search?q=${encodeURIComponent(term)}`);
                }}
                className="rounded-md border border-border-subtle bg-app-surface-2 px-2.5 py-1 text-xs text-content-secondary hover:border-border-default hover:text-content-primary transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : totalResults === 0 ? (
        /* No Results Found */
        <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-warning/10 text-status-warning">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-content-primary">
            No results found for &ldquo;{query}&rdquo;
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-content-muted">
            We couldn&apos;t find any matches. Check your spelling or try broader terms.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInputVal('');
                router.push('/search');
              }}
            >
              Clear Search
            </Button>
            <Link href="/explore">
              <Button variant="primary" size="sm">
                Explore Projects
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Results Container */
        <div className="space-y-10">
          {/* Projects Section */}
          {showProjects && initialData.projects.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5 mb-4">
                <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-accent-primary" />
                  <span>Projects ({initialData.projects.length})</span>
                </h2>
                {activeType === 'all' && initialData.projects.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange('projects')}
                    className="text-xs font-medium text-accent-primary hover:underline flex items-center gap-1"
                  >
                    <span>View all projects</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialData.projects.map((project: ProjectSearchItem) => (
                  <Card
                    key={project.id}
                    className="flex flex-col justify-between p-5 hover:border-border-focus transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/projects/${project.slug}`}
                          className="font-bold text-base text-content-primary group-hover:text-accent-primary transition-colors flex items-center gap-1.5"
                        >
                          <span>{project.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {project.visibility === 'private' && (
                            <Badge variant="warning" size="sm">
                              Private
                            </Badge>
                          )}
                          <Badge variant="neutral" size="sm" className="capitalize">
                            {project.category}
                          </Badge>
                          <Badge variant="accent" size="sm" className="capitalize">
                            {project.stage}
                          </Badge>
                        </div>
                      </div>

                      {project.tagline && (
                        <p className="mt-2 text-xs font-medium text-content-secondary line-clamp-1">
                          {project.tagline}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-content-muted line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-content-muted">
                      <span>Owner: @{project.owner?.username || 'anonymous'}</span>
                      <Link
                        href={`/projects/${project.slug}`}
                        className="font-medium text-accent-primary hover:underline"
                      >
                        View Project &rarr;
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Developers Section */}
          {showDevs && initialData.developers.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5 mb-4">
                <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <Users className="h-4 w-4 text-status-success" />
                  <span>Developers ({initialData.developers.length})</span>
                </h2>
                {activeType === 'all' && initialData.developers.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange('developers')}
                    className="text-xs font-medium text-accent-primary hover:underline flex items-center gap-1"
                  >
                    <span>View all developers</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialData.developers.map((dev: DeveloperSearchItem) => (
                  <Card
                    key={dev.id}
                    className="flex flex-col justify-between p-5 hover:border-border-focus transition-all group"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={dev.avatar_url}
                          alt={dev.full_name || dev.username}
                          fallbackText={dev.full_name || dev.username}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/developers/${dev.username}`}
                            className="font-bold text-sm text-content-primary group-hover:text-accent-primary transition-colors flex items-center gap-1"
                          >
                            <span>{dev.full_name || dev.username}</span>
                            <span className="text-xs font-normal text-content-muted">
                              @{dev.username}
                            </span>
                          </Link>
                          {dev.headline && (
                            <p className="mt-0.5 text-xs text-content-secondary truncate">
                              {dev.headline}
                            </p>
                          )}
                        </div>
                      </div>

                      {dev.bio && (
                        <p className="mt-3 text-xs text-content-muted line-clamp-2">
                          {dev.bio}
                        </p>
                      )}

                      {/* Skills and Tech */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {dev.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="neutral" size="sm">
                            {skill}
                          </Badge>
                        ))}
                        {dev.technologies.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="accent" size="sm">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-content-muted">
                      <div className="flex items-center gap-3">
                        {dev.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{dev.location}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{dev.availability_hours_per_week}h/week</span>
                        </span>
                      </div>
                      <Link
                        href={`/developers/${dev.username}`}
                        className="font-medium text-accent-primary hover:underline"
                      >
                        Profile &rarr;
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Community Posts Section */}
          {showPosts && initialData.posts.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5 mb-4">
                <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-status-warning" />
                  <span>Community Posts ({initialData.posts.length})</span>
                </h2>
                {activeType === 'all' && initialData.posts.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => handleTypeChange('posts')}
                    className="text-xs font-medium text-accent-primary hover:underline flex items-center gap-1"
                  >
                    <span>View all posts</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {initialData.posts.map((post: PostSearchItem) => (
                  <Card
                    key={post.id}
                    className="p-5 hover:border-border-focus transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="accent" size="sm" className="capitalize">
                            {post.post_type.replace('_', ' ')}
                          </Badge>
                          {post.project && (
                            <Link
                              href={`/projects/${post.project.slug}`}
                              className="text-xs text-content-muted hover:text-content-primary inline-flex items-center gap-1"
                            >
                              <Tag className="h-3 w-3" />
                              <span>{post.project.title}</span>
                            </Link>
                          )}
                        </div>
                        <Link
                          href={`/feed/${post.id}`}
                          className="font-bold text-base text-content-primary group-hover:text-accent-primary transition-colors"
                        >
                          {post.title}
                        </Link>
                        <p className="mt-1 text-xs text-content-muted line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-content-muted">
                      <div className="flex items-center gap-3">
                        <span>by @{post.author.username}</span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{post.likes_count}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.comments_count}</span>
                        </span>
                      </div>
                      <Link
                        href={`/feed/${post.id}`}
                        className="font-medium text-accent-primary hover:underline"
                      >
                        Join Discussion &rarr;
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Workspace Tasks Section */}
          {showTasks && initialData.tasks.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5 mb-4">
                <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-status-info" />
                  <span>Workspace Tasks ({initialData.tasks.length})</span>
                </h2>
              </div>
              <div className="space-y-3">
                {initialData.tasks.map((task: TaskSearchItem) => (
                  <Card
                    key={task.id}
                    className="p-5 hover:border-border-focus transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="info" size="sm" className="uppercase font-mono">
                            {task.status}
                          </Badge>
                          <Badge variant="warning" size="sm" className="capitalize">
                            {task.priority}
                          </Badge>
                          <Link
                            href={`/projects/${task.project.slug}/workspace/tasks`}
                            className="text-xs text-content-muted hover:text-content-primary"
                          >
                            {task.project.title}
                          </Link>
                        </div>
                        <Link
                          href={`/projects/${task.project.slug}/workspace/tasks`}
                          className="font-bold text-sm text-content-primary group-hover:text-accent-primary transition-colors"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="mt-1 text-xs text-content-muted line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/projects/${task.project.slug}/workspace/tasks`}
                        className="text-xs font-medium text-accent-primary hover:underline flex-shrink-0"
                      >
                        Open in Workspace &rarr;
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Member Privacy Notice */}
          <div className="rounded-lg border border-border-subtle bg-app-surface-1/60 p-4 flex items-center gap-3 text-xs text-content-muted">
            <ShieldAlert className="h-4 w-4 text-status-info flex-shrink-0" />
            <span>
              Search strictly respects privacy rules. Private projects and workspace tasks are only returned to verified collaborators and project owners.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
