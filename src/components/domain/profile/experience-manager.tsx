'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { addExperienceAction, deleteExperienceAction } from '@/lib/actions/profile';
import type { ProfileExperience } from '@/types/database';
import { Plus, Trash2, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExperienceManagerProps {
  initialExperiences: ProfileExperience[];
}

export function ExperienceManager({ initialExperiences }: ExperienceManagerProps) {
  const [experiences, setExperiences] = React.useState<ProfileExperience[]>(initialExperiences);
  const [isAdding, setIsAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [companyOrProject, setCompanyOrProject] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [isCurrent, setIsCurrent] = React.useState(false);
  const [description, setDescription] = React.useState('');

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleAddExperience(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const result = await addExperienceAction({
        title,
        companyOrProject,
        startDate,
        endDate: isCurrent ? undefined : endDate || undefined,
        isCurrent,
        description: description.trim() || undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        if (result.error.details) {
          setFieldErrors(result.error.details);
        }
      } else {
        setExperiences((prev) => [result.data, ...prev]);
        setSuccessMessage('Experience added successfully.');
        setTitle('');
        setCompanyOrProject('');
        setStartDate('');
        setEndDate('');
        setIsCurrent(false);
        setDescription('');
        setIsAdding(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setErrorMessage('Failed to save experience entry.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteExperienceAction(id);
      if (result.success) {
        setExperiences((prev) => prev.filter((exp) => exp.id !== id));
      }
    } catch {
      console.error('Failed to delete experience');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4" id="experience">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-content-primary">Work & Project Experience</h4>
          <p className="text-xs text-content-secondary">
            Highlight your past engineering or design roles and projects.
          </p>
        </div>

        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Experience
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-status-success/20 bg-status-success/10 p-2 text-xs text-status-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleAddExperience}
          className="rounded-lg border border-border-strong bg-app-surface-2 p-4 space-y-3"
        >
          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
            <span className="text-xs font-semibold text-content-primary">New Experience Entry</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-content-muted hover:text-content-primary"
            >
              Cancel
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-status-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Role or Job Title"
              required
              placeholder="Fullstack Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={fieldErrors.title?.[0]}
            />

            <Input
              label="Company or Project Name"
              required
              placeholder="Acme Corp / Open Source Project"
              value={companyOrProject}
              onChange={(e) => setCompanyOrProject(e.target.value)}
              error={fieldErrors.companyOrProject?.[0]}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-center">
            <Input
              label="Start Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={fieldErrors.startDate?.[0]}
            />

            {!isCurrent ? (
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                error={fieldErrors.endDate?.[0]}
              />
            ) : (
              <div className="pt-4">
                <span className="text-xs font-medium text-accent-primary">Present (Active Role)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isCurrentRole"
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-accent-primary focus:ring-border-focus"
            />
            <label htmlFor="isCurrentRole" className="text-xs text-content-secondary select-none">
              I currently work or contribute in this role
            </label>
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="Key responsibilities, technical architecture, and impact..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description?.[0]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Experience
            </Button>
          </div>
        </form>
      )}

      {/* Experience List */}
      <div className="space-y-2">
        {experiences.map((exp) => (
          <div
            key={exp.id}
            className="flex items-start justify-between rounded-lg border border-border-subtle bg-app-surface-1 p-3 transition-colors hover:border-border-strong"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-accent-primary" />
                <h5 className="text-xs font-semibold text-content-primary">{exp.title}</h5>
                <span className="text-xs text-content-muted">&bull;</span>
                <span className="text-xs text-content-secondary">{exp.company_or_project}</span>
              </div>

              <p className="text-[11px] text-content-muted">
                {exp.start_date} &ndash; {exp.is_current ? 'Present' : exp.end_date || ''}
              </p>

              {exp.description && (
                <p className="text-xs text-content-secondary pt-0.5">{exp.description}</p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-content-muted hover:text-status-danger"
              onClick={() => handleDelete(exp.id)}
              isLoading={deletingId === exp.id}
              aria-label="Delete experience"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {experiences.length === 0 && !isAdding && (
          <p className="text-xs text-content-muted italic py-2">
            No work or project experience listed yet.
          </p>
        )}
      </div>
    </div>
  );
}
