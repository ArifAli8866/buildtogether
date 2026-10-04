'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DetailedCodeSnippet } from '@/lib/queries/files-and-code';
import {
  createCodeSnippetAction,
  updateCodeSnippetAction,
} from '@/lib/actions/files-and-code';
import { SUPPORTED_LANGUAGES } from '@/lib/validators/files-and-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Code2, AlertCircle } from 'lucide-react';

interface SnippetEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  snippetToEdit?: DetailedCodeSnippet | null;
}

export function SnippetEditorDialog({
  isOpen,
  onClose,
  projectId,
  snippetToEdit,
}: SnippetEditorDialogProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(snippetToEdit?.title || '');
  const [filePath, setFilePath] = React.useState(snippetToEdit?.file_path || 'src/');
  const [language, setLanguage] = React.useState(snippetToEdit?.language || 'typescript');
  const [codeContent, setCodeContent] = React.useState(snippetToEdit?.code_content || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(snippetToEdit?.title || '');
    setFilePath(snippetToEdit?.file_path || 'src/');
    setLanguage(snippetToEdit?.language || 'typescript');
    setCodeContent(snippetToEdit?.code_content || '');
  }, [snippetToEdit]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !filePath.trim()) {
      setError('Title and file path are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const validLang = language as (typeof SUPPORTED_LANGUAGES)[number];

    if (snippetToEdit) {
      const result = await updateCodeSnippetAction({
        snippetId: snippetToEdit.id,
        projectId,
        title: title.trim(),
        filePath: filePath.trim(),
        language: validLang,
        codeContent,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }
    } else {
      const result = await createCodeSnippetAction({
        projectId,
        title: title.trim(),
        filePath: filePath.trim(),
        language: validLang,
        codeContent,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snippet-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="snippet-dialog-title" className="text-lg font-bold text-content-primary">
              {snippetToEdit ? 'Edit Code Snippet' : 'Draft Code Snippet'}
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Draft code components, SQL migrations, or functions before submitting for review.
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
            <label htmlFor="snippet-title" className="text-xs font-semibold text-content-secondary">
              Snippet Title <span className="text-accent-primary">*</span>
            </label>
            <Input
              id="snippet-title"
              placeholder="e.g. Supabase Auth Session Hook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="snippet-filepath" className="text-xs font-semibold text-content-secondary">
                File Path <span className="text-accent-primary">*</span>
              </label>
              <Input
                id="snippet-filepath"
                placeholder="src/hooks/use-auth.ts"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="snippet-lang" className="text-xs font-semibold text-content-secondary">
                Language
              </label>
              <select
                id="snippet-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="snippet-code" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-accent-primary" />
              <span>Source Code</span>
            </label>
            <Textarea
              id="snippet-code"
              placeholder="// Write or paste code here..."
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              rows={12}
              className="resize-y font-mono text-xs bg-app-surface-2/60"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
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
              {snippetToEdit ? 'Save Changes' : 'Save Snippet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
