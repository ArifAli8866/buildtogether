'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Project, ProjectMemberRole } from '@/types/database';
import type { DetailedDiscussion } from '@/lib/queries/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { CreateDiscussionDialog } from './create-discussion-dialog';
import {
  MessageSquare,
  Plus,
  Search,
  Pin,
  Clock,
  Layers,
  Sparkles,
  HelpCircle,
  Megaphone,
} from 'lucide-react';

interface DiscussionsViewProps {
  project: Project;
  discussions: DetailedDiscussion[];
  role: ProjectMemberRole;
  currentUserId: string;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Discussions' },
  { id: 'general', label: 'General' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'questions', label: 'Questions' },
  { id: 'announcements', label: 'Announcements' },
];

export function DiscussionsView({
  project,
  discussions,
  role,
}: DiscussionsViewProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const canPin = role === 'owner' || role === 'maintainer';

  const filteredDiscussions = React.useMemo(() => {
    return discussions.filter((d) => {
      const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [discussions, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'architecture':
        return <Layers className="h-3 w-3" />;
      case 'ideas':
        return <Sparkles className="h-3 w-3" />;
      case 'questions':
        return <HelpCircle className="h-3 w-3" />;
      case 'announcements':
        return <Megaphone className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'announcements':
        return 'danger';
      case 'architecture':
        return 'info';
      case 'ideas':
        return 'accent';
      case 'questions':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            Discussions
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Collaborative team threads for project decisions, architecture, and ideation.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Start Discussion</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border-subtle pb-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-app-surface-2"
          />
        </div>
      </div>

      {/* Thread List */}
      {filteredDiscussions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-content-primary">
            No discussions found
          </h3>
          <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
            {searchQuery
              ? 'No discussion threads matched your search query. Try clearing the filter.'
              : 'There are no discussion threads in this category yet. Start the conversation!'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start Discussion</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-app-surface-1 overflow-hidden">
          {filteredDiscussions.map((discussion) => (
            <Link
              key={discussion.id}
              href={`/projects/${project.slug}/workspace/discussions/${discussion.id}`}
              className="group flex flex-col gap-3 p-4 transition-colors hover:bg-app-surface-2/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Avatar
                  src={discussion.author.avatar_url}
                  alt={discussion.author.full_name || discussion.author.username}
                  fallbackText={discussion.author.username}
                  size="sm"
                  className="mt-0.5"
                />

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {discussion.pinned && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                        <Pin className="h-3 w-3 rotate-45" />
                        Pinned
                      </span>
                    )}

                    <Badge
                      variant={getCategoryBadgeVariant(discussion.category)}
                      size="sm"
                      className="capitalize text-[10px] gap-1 font-medium"
                    >
                      {getCategoryIcon(discussion.category)}
                      <span>{discussion.category}</span>
                    </Badge>

                    <h2 className="text-sm font-semibold text-content-primary group-hover:text-accent-primary transition-colors line-clamp-1">
                      {discussion.title}
                    </h2>
                  </div>

                  <p className="text-xs text-content-muted line-clamp-1">
                    {discussion.content}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-content-muted pt-0.5">
                    <span className="font-medium text-content-secondary">
                      {discussion.author.full_name || `@${discussion.author.username}`}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(discussion.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comments Count Badge */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="flex items-center gap-1 rounded-full bg-app-surface-2 px-2.5 py-1 text-xs font-medium text-content-secondary group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{discussion.commentsCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog Modal */}
      <CreateDiscussionDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={project.id}
        canPin={canPin}
      />
    </div>
  );
}
