'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import type {
  DetailedCodeSnippet,
  DetailedCodeReviewSummary,
} from '@/lib/queries/files-and-code';
import { deleteCodeSnippetAction } from '@/lib/actions/files-and-code';
import { SnippetEditorDialog } from './snippet-editor-dialog';
import { CreateReviewDialog } from './create-review-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Code2,
  GitPullRequest,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  GitBranch,
  MessageSquare,
  FileCode,
  ArrowRight,
  Send,
} from 'lucide-react';

interface CodeWorkspaceViewProps {
  project: Project;
  snippets: DetailedCodeSnippet[];
  reviews: DetailedCodeReviewSummary[];
  role: ProjectMemberRole;
  currentUserId: string;
}

export function CodeWorkspaceView({
  project,
  snippets,
  reviews,
  role,
  currentUserId,
}: CodeWorkspaceViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';

  const [activeTab, setActiveTab] = React.useState<'snippets' | 'reviews'>('reviews');
  const [selectedSnippetId, setSelectedSnippetId] = React.useState<string | null>(
    snippets[0]?.id || null
  );
  const [reviewStatusFilter, setReviewStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const [isSnippetEditorOpen, setIsSnippetEditorOpen] = React.useState(false);
  const [editingSnippet, setEditingSnippet] = React.useState<DetailedCodeSnippet | null>(null);

  const [isCreateReviewOpen, setIsCreateReviewOpen] = React.useState(false);
  const [snippetForReview, setSnippetForReview] = React.useState<DetailedCodeSnippet | null>(null);

  const [copied, setCopied] = React.useState(false);

  const selectedSnippet = React.useMemo(() => {
    return snippets.find((s) => s.id === selectedSnippetId) || snippets[0] || null;
  }, [snippets, selectedSnippetId]);

  const filteredSnippets = React.useMemo(() => {
    return snippets.filter((s) => {
      return (
        searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.file_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code_content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [snippets, searchQuery]);

  const filteredReviews = React.useMemo(() => {
    return reviews.filter((r) => {
      const matchesStatus =
        reviewStatusFilter === 'all' || r.status === reviewStatusFilter;
      const matchesSearch =
        searchQuery === '' ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.target_branch.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [reviews, reviewStatusFilter, searchQuery]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    await deleteCodeSnippetAction(snippetId, project.id);
    router.refresh();
  };

  const getReviewStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'review':
        return 'info';
      case 'changes_requested':
        return 'danger';
      case 'merged':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            Code Workspace & Reviews
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Browse project snippets, draft changes, and collaborate on line-level peer reviews.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSnippet(null);
              setIsSnippetEditorOpen(true);
            }}
            className="gap-2 text-xs h-8"
          >
            <Code2 className="h-4 w-4" />
            <span>Draft Snippet</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSnippetForReview(null);
              setIsCreateReviewOpen(true);
            }}
            className="gap-2 text-xs h-8"
          >
            <GitPullRequest className="h-4 w-4" />
            <span>Submit Review</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'reviews'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
            }`}
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>Code Reviews</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {reviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'snippets'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Snippets & Files</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {snippets.length}
            </span>
          </button>
        </div>

        {/* Global Search */}
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
          <Input
            placeholder={activeTab === 'reviews' ? 'Search reviews...' : 'Search code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-app-surface-2"
          />
        </div>
      </div>

      {/* TAB 1: CODE REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {['all', 'review', 'changes_requested', 'approved', 'draft', 'merged'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReviewStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                    reviewStatusFilter === st
                      ? 'bg-accent-primary text-white shadow-sm'
                      : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
                  }`}
                >
                  {st === 'all' ? 'All Reviews' : st.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
                <GitPullRequest className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-content-primary">
                No code reviews found
              </h3>
              <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
                {searchQuery
                  ? 'No reviews matched your search query.'
                  : 'Start a code review submission to review changes before merging.'}
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateReviewOpen(true)}
                  className="gap-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Submit Code Review</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-app-surface-1 overflow-hidden shadow-sm">
              {filteredReviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/projects/${project.slug}/workspace/code/${review.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-app-surface-2/60 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={getReviewStatusBadgeVariant(review.status)}
                        size="sm"
                        className="capitalize text-[10px] font-semibold"
                      >
                        {review.status.replace('_', ' ')}
                      </Badge>

                      <h3 className="text-sm font-bold text-content-primary group-hover:text-accent-primary transition-colors truncate">
                        {review.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-content-muted flex-wrap">
                      <span className="font-mono text-[11px] bg-app-surface-2 px-1.5 py-0.5 rounded text-content-secondary flex items-center gap-1">
                        <GitBranch className="h-3 w-3 text-accent-primary" />
                        <span>{review.target_branch}</span>
                        <ArrowRight className="h-3 w-3 text-content-muted" />
                        <span>{review.base_branch}</span>
                      </span>

                      <span>&bull;</span>

                      <div className="flex items-center gap-1 text-[11px]">
                        <Avatar
                          src={review.author.avatar_url}
                          alt={review.author.username}
                          fallbackText={review.author.username}
                          size="sm"
                          className="h-3.5 w-3.5 text-[8px]"
                        />
                        <span className="text-content-secondary font-medium">
                          {review.author.username}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges for Files and Comments */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs">
                    <div className="flex items-center gap-1 rounded bg-app-surface-2 px-2 py-1 text-content-secondary">
                      <FileCode className="h-3.5 w-3.5 text-content-muted" />
                      <span>{review.filesCount} files</span>
                    </div>

                    <div className="flex items-center gap-1 rounded bg-app-surface-2 px-2 py-1 text-content-secondary">
                      <MessageSquare className="h-3.5 w-3.5 text-content-muted" />
                      <span>{review.commentsCount} comments</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CODE SNIPPETS & WORKSPACE */}
      {activeTab === 'snippets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Snippets List / Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
                Drafted Snippets ({filteredSnippets.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSnippet(null);
                  setIsSnippetEditorOpen(true);
                }}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>New</span>
              </Button>
            </div>

            {filteredSnippets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-xs text-content-muted">
                No snippets drafted yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredSnippets.map((snippet) => {
                  const isSelected = selectedSnippet?.id === snippet.id;
                  return (
                    <div
                      key={snippet.id}
                      onClick={() => setSelectedSnippetId(snippet.id)}
                      className={`group flex items-center justify-between rounded-xl p-3 border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/10 shadow-sm'
                          : 'border-border-subtle bg-app-surface-1 hover:bg-app-surface-2/60'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-xs font-bold text-content-primary truncate block group-hover:text-accent-primary">
                          {snippet.title}
                        </span>
                        <span className="font-mono text-[11px] text-content-muted truncate block">
                          {snippet.file_path}
                        </span>
                      </div>

                      <Badge variant="neutral" size="sm" className="font-mono uppercase text-[9px]">
                        {snippet.language}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Snippet Code Viewer */}
          <div className="lg:col-span-8">
            {selectedSnippet ? (
              <div className="rounded-xl border border-border-subtle bg-app-surface-1 shadow-sm overflow-hidden space-y-0">
                {/* Code Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border-subtle bg-app-surface-2/40">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-content-primary">
                        {selectedSnippet.title}
                      </h2>
                      <Badge variant="neutral" size="sm" className="font-mono uppercase text-[10px]">
                        {selectedSnippet.language}
                      </Badge>
                    </div>
                    <span className="font-mono text-xs text-content-muted block truncate">
                      {selectedSnippet.file_path}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(selectedSnippet.code_content)}
                      className="h-8 text-xs gap-1.5"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSnippetForReview(selectedSnippet);
                        setIsCreateReviewOpen(true);
                      }}
                      className="h-8 text-xs gap-1.5 border-accent-primary/50 text-accent-primary"
                      title="Submit as a code review"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Review</span>
                    </Button>

                    {(selectedSnippet.author_id === currentUserId || isAdmin) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSnippet(selectedSnippet);
                            setIsSnippetEditorOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-content-muted hover:text-content-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSnippet(selectedSnippet.id)}
                          className="h-8 w-8 p-0 text-content-muted hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Code Body with Line Numbers */}
                <div className="overflow-x-auto p-4 bg-app-surface-2/20 font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto">
                  <pre className="flex">
                    {/* Line numbers column */}
                    <div className="select-none pr-4 text-right text-content-muted/50 border-r border-border-subtle/40">
                      {selectedSnippet.code_content.split('\n').map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Source code lines */}
                    <div className="pl-4 text-content-primary flex-1">
                      {selectedSnippet.code_content.split('\n').map((line, i) => (
                        <div key={i} className="whitespace-pre">
                          {line || ' '}
                        </div>
                      ))}
                    </div>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-subtle p-12 text-center text-content-muted text-xs">
                Select a code snippet or click Draft Snippet to begin writing code.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snippet Editor Modal */}
      <SnippetEditorDialog
        isOpen={isSnippetEditorOpen}
        onClose={() => {
          setIsSnippetEditorOpen(false);
          setEditingSnippet(null);
        }}
        projectId={project.id}
        snippetToEdit={editingSnippet}
      />

      {/* Create Review Modal */}
      <CreateReviewDialog
        isOpen={isCreateReviewOpen}
        onClose={() => {
          setIsCreateReviewOpen(false);
          setSnippetForReview(null);
        }}
        projectId={project.id}
        snippets={snippets}
        initialSnippet={snippetForReview}
      />
    </div>
  );
}
