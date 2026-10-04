'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { uploadProjectFileAction } from '@/lib/actions/files-and-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, AlertCircle, File, Folder } from 'lucide-react';

interface UploadFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingFolders: string[];
}

export function UploadFileDialog({
  isOpen,
  onClose,
  projectId,
  existingFolders,
}: UploadFileDialogProps) {
  const router = useRouter();

  const [file, setFile] = React.useState<File | null>(null);
  const [folderPath, setFolderPath] = React.useState('/');
  const [customFolder, setCustomFolder] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 26214400) {
        setError('File exceeds 25MB maximum size limit.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const targetFolder = folderPath === 'custom' ? (customFolder.startsWith('/') ? customFolder : `/${customFolder}`) : folderPath;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('folderPath', targetFolder);
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    const result = await uploadProjectFileAction(formData);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setFile(null);
    setDescription('');
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="upload-dialog-title" className="text-lg font-bold text-content-primary">
              Upload Project Asset
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Securely store documents, diagrams, specs, and design assets (max 25MB).
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
          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-content-secondary block">
              File <span className="text-accent-primary">*</span>
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border-subtle hover:border-accent-primary/60 rounded-xl p-6 cursor-pointer bg-app-surface-2/40 hover:bg-app-surface-2/70 transition-colors">
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                required
              />
              <Upload className="h-8 w-8 text-accent-primary mb-2 opacity-80" />
              {file ? (
                <div className="text-center">
                  <span className="text-xs font-semibold text-content-primary block truncate max-w-xs">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-content-muted">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <span className="text-xs font-medium text-content-primary block">
                    Click to browse or drag and drop
                  </span>
                  <span className="text-[11px] text-content-muted block">
                    Images, PDFs, Markdown, JSON, Archives up to 25MB
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* Folder Destination */}
          <div className="space-y-1.5">
            <label htmlFor="folder-select" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-accent-primary" />
              <span>Target Folder</span>
            </label>
            <select
              id="folder-select"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none"
            >
              {existingFolders.map((f) => (
                <option key={f} value={f}>
                  {f === '/' ? '/ (Root)' : f}
                </option>
              ))}
              <option value="custom">+ Create New Folder...</option>
            </select>
          </div>

          {folderPath === 'custom' && (
            <div className="space-y-1.5">
              <label htmlFor="custom-folder" className="text-xs font-semibold text-content-secondary">
                New Folder Path
              </label>
              <Input
                id="custom-folder"
                placeholder="/docs/architecture"
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {/* Optional Description */}
          <div className="space-y-1.5">
            <label htmlFor="file-description" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <File className="h-3.5 w-3.5 text-content-muted" />
              <span>Description / Notes (Optional)</span>
            </label>
            <Textarea
              id="file-description"
              placeholder="e.g. Exported system design diagrams from FigJam..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-y text-xs"
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
              disabled={!file}
            >
              Upload Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
