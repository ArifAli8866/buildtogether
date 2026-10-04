'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import type { DetailedProjectFile } from '@/lib/queries/files-and-code';
import {
  getProjectFileDownloadUrlAction,
  deleteProjectFileAction,
} from '@/lib/actions/files-and-code';
import { UploadFileDialog } from './upload-file-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Folder,
  File,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Download,
  Trash2,
  Plus,
  Search,
  HardDrive,
  AlertCircle,
} from 'lucide-react';

interface FilesViewProps {
  project: Project;
  files: DetailedProjectFile[];
  folders: string[];
  role: ProjectMemberRole;
  currentUserId: string;
}

export function FilesView({
  project,
  files,
  folders,
  role,
  currentUserId,
}: FilesViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';

  const [selectedFolder, setSelectedFolder] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const filteredFiles = React.useMemo(() => {
    return files.filter((f) => {
      const matchesFolder = selectedFolder === 'all' || f.folder_path === selectedFolder;
      const matchesSearch =
        searchQuery === '' ||
        f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFolder && matchesSearch;
    });
  }, [files, selectedFolder, searchQuery]);

  const totalBytes = React.useMemo(() => {
    return files.reduce((acc, f) => acc + Number(f.file_size_bytes), 0);
  }, [files]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-emerald-400" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-rose-400" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) {
      return <FileArchive className="h-4 w-4 text-amber-400" />;
    }
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('text/')) {
      return <FileCode className="h-4 w-4 text-sky-400" />;
    }
    return <File className="h-4 w-4 text-content-secondary" />;
  };

  const handleDownload = async (file: DetailedProjectFile) => {
    try {
      setDownloadingId(file.id);
      setError(null);

      const result = await getProjectFileDownloadUrlAction({
        fileId: file.id,
        projectId: project.id,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Trigger download via signed url
      const link = document.createElement('a');
      link.href = result.data.downloadUrl;
      link.download = result.data.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    setError(null);

    const result = await deleteProjectFileAction({
      fileId,
      projectId: project.id,
    });

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            Project Files & Storage
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Secure asset repository backed by Supabase Storage for project documentation, designs, and specs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-content-muted bg-app-surface-2/60 px-3 py-1.5 rounded-lg border border-border-subtle/50">
            <HardDrive className="h-3.5 w-3.5 text-accent-primary" />
            <span>{files.length} files ({formatFileSize(totalBytes)})</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 text-xs h-8"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Asset</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border-subtle pb-4">
        {/* Folders */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedFolder('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFolder === 'all'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
            }`}
          >
            All Folders
          </button>
          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFolder === folder
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
              }`}
            >
              <Folder className="h-3 w-3" />
              <span>{folder === '/' ? '/ (Root)' : folder}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-app-surface-2"
          />
        </div>
      </div>

      {/* Files List / Table */}
      {filteredFiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <Folder className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-content-primary">
            No files found
          </h3>
          <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
            {searchQuery
              ? 'No files matched your search query in this folder.'
              : 'Upload project files, specifications, diagrams, or assets to get started.'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Upload First Asset</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-app-surface-1 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-subtle bg-app-surface-2/40 text-[11px] font-bold uppercase tracking-wider text-content-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">File Name</th>
                  <th scope="col" className="px-4 py-3 hidden md:table-cell">Folder</th>
                  <th scope="col" className="px-4 py-3">Size</th>
                  <th scope="col" className="px-4 py-3 hidden sm:table-cell">Uploaded By</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredFiles.map((file) => {
                  const isUploader = file.uploader_id === currentUserId;
                  const canDelete = isUploader || isAdmin;
                  const isDownloading = downloadingId === file.id;

                  return (
                    <tr
                      key={file.id}
                      className="group hover:bg-app-surface-2/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-content-primary">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(file.mime_type)}
                          <div className="min-w-0">
                            <span className="truncate block font-semibold hover:text-accent-primary cursor-pointer" onClick={() => handleDownload(file)}>
                              {file.file_name}
                            </span>
                            {file.description && (
                              <span className="text-[11px] text-content-muted truncate block max-w-xs sm:max-w-md">
                                {file.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-content-muted hidden md:table-cell">
                        <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                          {file.folder_path}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-content-secondary whitespace-nowrap">
                        {formatFileSize(Number(file.file_size_bytes))}
                      </td>

                      <td className="px-4 py-3 text-content-muted hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            src={file.uploader.avatar_url}
                            alt={file.uploader.username}
                            fallbackText={file.uploader.username}
                            size="sm"
                            className="h-4 w-4 text-[8px]"
                          />
                          <span className="text-content-secondary">
                            {file.uploader.username}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            isLoading={isDownloading}
                            className="h-7 w-7 p-0 text-content-muted hover:text-content-primary"
                            title="Download file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file.id)}
                              className="h-7 w-7 p-0 text-content-muted hover:text-red-400"
                              title="Delete file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Dialog Modal */}
      <UploadFileDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={project.id}
        existingFolders={folders}
      />
    </div>
  );
}
