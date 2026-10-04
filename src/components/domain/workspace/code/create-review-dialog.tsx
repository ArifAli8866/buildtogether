'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DetailedCodeSnippet } from '@/lib/queries/files-and-code';
import { createCodeReviewAction } from '@/lib/actions/files-and-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Plus,
  Trash2,
  GitPullRequest,
  GitBranch,
  AlertCircle,
} from 'lucide-react';

interface CreateReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  snippets: DetailedCodeSnippet[];
  initialSnippet?: DetailedCodeSnippet | null;
}

interface FileChangeEntry {
  id: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  oldContent: string;
  newContent: string;
}

export function CreateReviewDialog({
  isOpen,
  onClose,
  projectId,
  snippets,
  initialSnippet,
}: CreateReviewDialogProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [baseBranch, setBaseBranch] = React.useState('main');
  const [targetBranch, setTargetBranch] = React.useState('feature/');
  const [status, setStatus] = React.useState<'draft' | 'review'>('review');

  const [files, setFiles] = React.useState<FileChangeEntry[]>([
    {
      id: 'file-1',
      filePath: initialSnippet ? initialSnippet.file_path : 'src/example.ts',
      changeType: initialSnippet ? 'added' : 'modified',
      oldContent: '',
      newContent: initialSnippet ? initialSnippet.code_content : '// Add new implementation here\n',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialSnippet) {
      setTitle(`Add ${initialSnippet.title}`);
      setSummary(`Implementation of ${initialSnippet.title}`);
      setTargetBranch(`feature/${initialSnippet.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
      setFiles([
        {
          id: 'file-1',
          filePath: initialSnippet.file_path,
          changeType: 'added',
          oldContent: '',
          newContent: initialSnippet.code_content,
        },
      ]);
    }
  }, [initialSnippet]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddFile = () => {
    setFiles((prev) => [
      ...prev,
      {
        id: `file-${Date.now()}`,
        filePath: 'src/file.ts',
        changeType: 'modified',
        oldContent: '',
        newContent: '',
      },
    ]);
  };

  const handleRemoveFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFileChange = (id: string, field: keyof FileChangeEntry, value: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleImportSnippet = (id: string, snippetId: string) => {
    const snippet = snippets.find((s) => s.id === snippetId);
    if (!snippet) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              filePath: snippet.file_path,
              newContent: snippet.code_content,
              changeType: 'added',
            }
          : f
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !targetBranch.trim()) {
      setError('Title, summary, and target branch are required.');
      return;
    }

    if (files.some((f) => !f.filePath.trim())) {
      setError('All files must have a valid file path.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createCodeReviewAction({
      projectId,
      title: title.trim(),
      summary: summary.trim(),
      baseBranch: baseBranch.trim() || 'main',
      targetBranch: targetBranch.trim(),
      status,
      files: files.map((f) => ({
        filePath: f.filePath.trim(),
        changeType: f.changeType,
        oldContent: f.changeType === 'added' ? null : f.oldContent,
        newContent: f.newContent,
      })),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    onClose();
    router.push(`/projects/${projectId}/workspace/code/${result.data.id}`);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-review-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="create-review-dialog-title" className="text-lg font-bold text-content-primary">
              Create Code Review Submission
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Submit file changes for peer review, diff inspection, and team approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="review-title" className="text-xs font-semibold text-content-secondary">
              Review Title <span className="text-accent-primary">*</span>
            </label>
            <Input
              id="review-title"
              placeholder="e.g. feat(auth): Implement Supabase Realtime session verification"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={150}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="base-branch" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-content-muted" />
                <span>Base Branch</span>
              </label>
              <Input
                id="base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="target-branch" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5 text-accent-primary" />
                <span>Target / Head Branch <span className="text-accent-primary">*</span></span>
              </label>
              <Input
                id="target-branch"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="feature/auth-realtime"
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="review-summary" className="text-xs font-semibold text-content-secondary">
              Summary & Context <span className="text-accent-primary">*</span>
            </label>
            <Textarea
              id="review-summary"
              placeholder="Describe the motivation, implementation details, and test instructions for reviewers..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              required
              className="resize-y text-xs"
            />
          </div>

          {/* Changed Files Section */}
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary">
                Changed Files ({files.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFile}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another File</span>
              </Button>
            </div>

            <div className="space-y-4">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className="rounded-xl border border-border-subtle bg-app-surface-2/40 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] font-bold text-content-muted">#{idx + 1}</span>
                      <Input
                        placeholder="src/components/auth/session.ts"
                        value={file.filePath}
                        onChange={(e) => handleFileChange(file.id, 'filePath', e.target.value)}
                        className="font-mono text-xs h-8 flex-1"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={file.changeType}
                        onChange={(e) => handleFileChange(file.id, 'changeType', e.target.value)}
                        className="rounded-lg border border-border-subtle bg-app-surface-1 px-2.5 py-1 text-xs text-content-primary focus:outline-none"
                      >
                        <option value="modified">Modified</option>
                        <option value="added">Added</option>
                        <option value="deleted">Deleted</option>
                      </select>

                      {snippets.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleImportSnippet(file.id, e.target.value);
                          }}
                          className="rounded-lg border border-border-subtle bg-app-surface-1 px-2 py-1 text-[11px] text-content-secondary focus:outline-none"
                        >
                          <option value="" disabled>Import Snippet...</option>
                          {snippets.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      )}

                      {files.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="rounded p-1 text-content-muted hover:text-red-400"
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {file.changeType !== 'added' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-content-muted">
                        Original Content (Left side of diff)
                      </label>
                      <Textarea
                        placeholder="// Past original source code before changes..."
                        value={file.oldContent}
                        onChange={(e) => handleFileChange(file.id, 'oldContent', e.target.value)}
                        rows={4}
                        className="font-mono text-xs bg-app-surface-1"
                      />
                    </div>
                  )}

                  {file.changeType !== 'deleted' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-content-muted">
                        New Content (Right side of diff)
                      </label>
                      <Textarea
                        placeholder="// Paste updated source code..."
                        value={file.newContent}
                        onChange={(e) => handleFileChange(file.id, 'newContent', e.target.value)}
                        rows={6}
                        className="font-mono text-xs bg-app-surface-1"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submission Mode */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer select-none">
                <input
                  type="radio"
                  name="review-status"
                  value="review"
                  checked={status === 'review'}
                  onChange={() => setStatus('review')}
                  className="text-accent-primary"
                />
                <span>Ready for Review</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer select-none ml-4">
                <input
                  type="radio"
                  name="review-status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="text-accent-primary"
                />
                <span>Save as Draft</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Create Submission
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
