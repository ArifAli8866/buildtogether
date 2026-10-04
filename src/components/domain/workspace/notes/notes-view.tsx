'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import type { DetailedProjectNote } from '@/lib/queries/collaboration';
import { deleteProjectNoteAction } from '@/lib/actions/collaboration';
import { NoteEditorDialog } from './note-editor-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  FileText,
  Plus,
  Search,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Layers,
  BookOpen,
  Calendar,
} from 'lucide-react';

interface NotesViewProps {
  project: Project;
  notes: DetailedProjectNote[];
  role: ProjectMemberRole;
  currentUserId: string;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Notes' },
  { id: 'decisions', label: 'Decisions (ADR)' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'research', label: 'Research' },
  { id: 'general', label: 'General' },
  { id: 'meeting', label: 'Meeting' },
];

export function NotesView({
  project,
  notes,
  role,
  currentUserId,
}: NotesViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';

  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<DetailedProjectNote | null>(null);

  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      const matchesCategory =
        selectedCategory === 'all' || n.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [notes, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'decisions':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'architecture':
        return <Layers className="h-3 w-3" />;
      case 'research':
        return <BookOpen className="h-3 w-3" />;
      case 'meeting':
        return <Calendar className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'decisions':
        return 'success';
      case 'architecture':
        return 'info';
      case 'research':
        return 'accent';
      case 'meeting':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    await deleteProjectNoteAction(noteId, project.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            Project Notes & Specs
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Centralized workspace documentation, decision records (ADRs), and research.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingNote(null);
            setIsEditorOpen(true);
          }}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border-subtle pb-4">
        {/* Category Tabs */}
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
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-app-surface-2"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-content-primary">
            No notes found
          </h3>
          <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
            {searchQuery
              ? 'No project notes matched your query.'
              : 'Start documenting project decisions and architectural guidelines.'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingNote(null);
                setIsEditorOpen(true);
              }}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Note</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isAuthor = note.author_id === currentUserId;
            const canModify = isAuthor || isAdmin;

            return (
              <div
                key={note.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border-subtle bg-app-surface-1 p-5 transition-all hover:border-border-subtle/80 hover:shadow-md cursor-pointer"
                onClick={() => {
                  setEditingNote(note);
                  setIsEditorOpen(true);
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={getCategoryBadgeVariant(note.category)}
                      size="sm"
                      className="capitalize text-[10px] gap-1 font-medium"
                    >
                      {getCategoryIcon(note.category)}
                      <span>{note.category}</span>
                    </Badge>

                    {canModify && (
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNote(note);
                            setIsEditorOpen(true);
                          }}
                          className="rounded p-1 text-content-muted hover:bg-app-surface-2 hover:text-content-primary"
                          title="Edit note"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="rounded p-1 text-content-muted hover:bg-red-500/10 hover:text-red-400"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-content-primary group-hover:text-accent-primary transition-colors line-clamp-2">
                    {note.title}
                  </h3>

                  <p className="text-xs text-content-secondary line-clamp-4 leading-relaxed font-mono">
                    {note.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle/60 text-[11px] text-content-muted">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={note.author.avatar_url}
                      alt={note.author.full_name || note.author.username}
                      fallbackText={note.author.username}
                      size="sm"
                      className="h-4 w-4"
                    />
                    <span className="truncate max-w-[100px]">
                      {note.author.username}
                    </span>
                  </div>

                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(note.updated_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Editor Dialog */}
      <NoteEditorDialog
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
        projectId={project.id}
        noteToEdit={editingNote}
      />
    </div>
  );
}
