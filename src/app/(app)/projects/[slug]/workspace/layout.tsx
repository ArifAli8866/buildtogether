import * as React from 'react';
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getProjectBySlug } from '@/lib/queries/projects';
import { WorkspaceShell } from '@/components/domain/workspace/workspace-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Users } from 'lucide-react';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: WorkspaceLayoutProps): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getProjectBySlug(slug);

  if (!data) {
    return {
      title: 'Workspace Not Found | Build Together',
    };
  }

  return {
    title: `${data.project.title} Workspace | Build Together`,
    description: `Collaborative workspace for ${data.project.title}`,
  };
}

export default async function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context) {
    notFound();
  }

  if (!context.isAuthorized) {
    return (
      <div className="min-h-screen bg-app-bg text-content-primary flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6 border-border-subtle bg-app-surface-1 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-status-danger-subtle text-status-danger">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-content-primary">
              Workspace Access Restricted
            </h1>
            <p className="text-sm text-content-secondary leading-relaxed">
              This collaborative workspace is reserved for accepted contributors and maintainers of{' '}
              <span className="font-semibold text-content-primary">{context.project.title}</span>.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link href={`/projects/${slug}`}>
              <Button variant="primary" className="w-full gap-2">
                <Users className="h-4 w-4" />
                View Project Showcase & Apply
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Explore Other Projects
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <WorkspaceShell project={context.project} role={context.role}>
      {props.children}
    </WorkspaceShell>
  );
}
