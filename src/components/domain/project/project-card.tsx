'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ProjectCardData } from '@/lib/queries/projects';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { MatchExplanationDialog } from '@/components/domain/project/match-explanation-dialog';
import { Sparkles, Users, Clock, ArrowRight } from 'lucide-react';

interface ProjectCardProps {
  data: ProjectCardData;
}

export function ProjectCard({ data }: ProjectCardProps) {
  const [showMatchModal, setShowMatchModal] = React.useState(false);
  const { project, owner, roles, technologies, matchBreakdown } = data;

  const openRoles = roles.filter((r) => r.status === 'open');

  const stageLabels: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'accent' | 'success' }> = {
    idea: { label: 'Idea Stage', variant: 'neutral' },
    planning: { label: 'Planning', variant: 'info' },
    in_development: { label: 'Building', variant: 'accent' },
    testing: { label: 'Testing', variant: 'warning' },
    shipped: { label: 'Shipped', variant: 'success' },
  };

  const currentStage = stageLabels[project.stage] || { label: project.stage, variant: 'neutral' };

  const getMatchScoreBadge = (score: number) => {
    let variant: 'success' | 'warning' | 'neutral' = 'neutral';
    if (score >= 70) variant = 'success';
    else if (score >= 40) variant = 'warning';

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMatchModal(true);
        }}
        className="group/badge inline-flex items-center gap-1.5 focus:outline-none"
        title="Click to view match explanation"
      >
        <Badge variant={variant} size="sm" className="cursor-pointer transition-transform group-hover/badge:scale-105">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="font-bold">{score}% Match</span>
          <span className="text-[10px] opacity-75 underline decoration-dotted ml-0.5">Why?</span>
        </Badge>
      </button>
    );
  };

  return (
    <>
      <Card className="flex flex-col justify-between transition-all duration-200 hover:border-border-focus hover:shadow-md h-full">
        <div className="space-y-4">
          {/* Top Row: Category, Stage, Match Score */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="neutral" size="sm">
                {project.category}
              </Badge>
              <Badge variant={currentStage.variant} size="sm">
                {currentStage.label}
              </Badge>
            </div>

            {matchBreakdown && getMatchScoreBadge(matchBreakdown.totalScore)}
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1.5">
            <Link
              href={`/projects/${project.slug}`}
              className="group flex items-center justify-between text-base font-bold text-content-primary hover:text-accent-primary"
            >
              <span className="line-clamp-1">{project.title}</span>
              <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 shrink-0 text-accent-primary" />
            </Link>
            <p className="text-xs text-content-secondary line-clamp-2 leading-relaxed">
              {project.tagline}
            </p>
          </div>

          {/* Tech Stack */}
          {technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {technologies.slice(0, 4).map((tech) => (
                <span
                  key={tech.id}
                  className="rounded-md bg-app-surface-2 px-2 py-0.5 text-[11px] font-medium text-content-secondary"
                >
                  {tech.name}
                </span>
              ))}
              {technologies.length > 4 && (
                <span className="text-[11px] text-content-muted self-center">
                  +{technologies.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Open Roles Preview */}
          <div className="rounded-lg bg-app-surface-2/60 p-3 space-y-2 border border-border-subtle/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-content-primary">
                <Users className="h-3.5 w-3.5 text-accent-primary" />
                <span>Open Roles</span>
              </div>
              <span className="text-[11px] text-content-muted">
                {openRoles.length} {openRoles.length === 1 ? 'position' : 'positions'}
              </span>
            </div>

            {openRoles.length > 0 ? (
              <div className="space-y-1.5">
                {openRoles.slice(0, 2).map((role) => (
                  <div key={role.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-content-primary truncate max-w-[180px]">
                      {role.title}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-content-muted">
                      <Clock className="h-3 w-3" />
                      {role.commitment_hours_per_week || 10}h/wk
                    </span>
                  </div>
                ))}
                {openRoles.length > 2 && (
                  <p className="text-[11px] text-content-muted pt-0.5">
                    +{openRoles.length - 2} more roles available
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-content-muted italic">No active open roles at this time.</p>
            )}
          </div>
        </div>

        {/* Footer: Owner and Details Link */}
        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-3 text-xs">
          <Link
            href={`/developers/${owner.username}`}
            className="flex items-center gap-2 group/owner truncate"
          >
            <Avatar
              src={owner.avatar_url}
              alt={owner.full_name}
              fallbackText={owner.full_name}
              size="sm"
            />
            <span className="truncate text-content-secondary group-hover/owner:text-content-primary font-medium">
              {owner.full_name}
            </span>
          </Link>

          <Link
            href={`/projects/${project.slug}`}
            className="text-xs font-semibold text-accent-primary hover:underline shrink-0"
          >
            View Project
          </Link>
        </div>
      </Card>

      {/* Match Explanation Modal */}
      {matchBreakdown && (
        <MatchExplanationDialog
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          projectTitle={project.title}
          matchBreakdown={matchBreakdown}
        />
      )}
    </>
  );
}
