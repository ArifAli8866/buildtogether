'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PostCard } from './post-card';
import { CreatePostDialog } from './create-post-dialog';
import { EditPostDialog } from './edit-post-dialog';
import {
  MessageSquare,
  Plus,
  Users,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import type {
  CommunityPostWithAuthor,
  CommunityPostType,
  Project,
} from '@/types/database';

interface FeedViewProps {
  initialPosts: CommunityPostWithAuthor[];
  currentUserId: string | null;
  userProjects?: Pick<Project, 'id' | 'title' | 'slug'>[];
}

const TABS: { id: string; label: string; type?: CommunityPostType }[] = [
  { id: 'all', label: 'All Discussions' },
  { id: 'technical_discussion', label: 'Tech Discussions', type: 'technical_discussion' },
  { id: 'project_announcement', label: 'Announcements', type: 'project_announcement' },
  { id: 'recruitment', label: 'Recruiting', type: 'recruitment' },
  { id: 'project_update', label: 'Updates', type: 'project_update' },
  { id: 'question', label: 'Questions', type: 'question' },
  { id: 'achievement', label: 'Achievements', type: 'achievement' },
  { id: 'learning', label: 'Learnings', type: 'learning' },
];

export function FeedView({
  initialPosts,
  currentUserId,
  userProjects = [],
}: FeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('type') || 'all';

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<CommunityPostWithAuthor | null>(null);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === 'all') {
      params.delete('type');
    } else {
      params.set('type', tabId);
    }
    router.push(`/feed?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary flex items-center gap-2.5">
            <Terminal className="h-6 w-6 text-accent-primary" />
            <span>Developer Community Feed</span>
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            Technical discussions, architecture proposals, open contributor recruitment, and project logs.
          </p>
        </div>

        <div>
          {currentUserId ? (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="primary"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Post</span>
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="secondary" className="gap-2">
                <span>Sign in to Post</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: Feed Stream + Sidebar */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Left 3 cols: Stream */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <Filter className="h-4 w-4 text-content-muted mr-1 shrink-0 hidden sm:block" />
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none ${
                    isActive
                      ? 'bg-accent-primary text-content-inverse font-semibold'
                      : 'border border-border-subtle bg-app-surface-1 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Posts List */}
          {initialPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-muted p-12 text-center bg-app-surface-1/50">
              <MessageSquare className="h-10 w-10 text-content-muted mb-3" />
              <h3 className="text-base font-semibold text-content-primary">
                No discussions found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-content-muted">
                Be the first to share an engineering insight, project update, or recruitment call!
              </p>
              {currentUserId && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="mt-4 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Start Discussion</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {initialPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onEdit={(p) => setEditingPost(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 col: Sidebar */}
        <aside className="space-y-6 lg:col-span-1">
          {/* Peer Network Card */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-primary" />
              <h2 className="text-sm font-semibold text-content-primary">
                Developer Network
              </h2>
            </div>
            <p className="mt-2 text-xs text-content-secondary leading-relaxed">
              Find collaborators, discover engineers with complementary skillsets, and manage your peer connections.
            </p>
            <Link href="/network" className="mt-4 block">
              <Button variant="secondary" size="sm" className="w-full gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Explore Network</span>
              </Button>
            </Link>
          </div>

          {/* Community Standards */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-status-success" />
              <h2 className="text-sm font-semibold text-content-primary">
                Technical First
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-content-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary shrink-0 mt-0.5" />
                <span>Zero vanity metrics or follower algorithms.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary shrink-0 mt-0.5" />
                <span>Discussions backed by real projects and code.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary shrink-0 mt-0.5" />
                <span>Mention peers directly using @username syntax.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      <CreatePostDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        userProjects={userProjects}
      />

      {editingPost && (
        <EditPostDialog
          isOpen={Boolean(editingPost)}
          onClose={() => setEditingPost(null)}
          post={editingPost}
          userProjects={userProjects}
        />
      )}
    </div>
  );
}
