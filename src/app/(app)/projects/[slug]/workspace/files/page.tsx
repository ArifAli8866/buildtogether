import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getProjectFiles, getProjectFolders } from '@/lib/queries/files-and-code';
import { FilesView } from '@/components/domain/workspace/files/files-view';

interface FilesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: FilesPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Files | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Files | Build Together' };

  return {
    title: `${context.project.title} — Files & Storage | Build Together`,
    description: `Secure project asset repository for ${context.project.title}`,
  };
}

export default async function WorkspaceFilesPage(props: FilesPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/files`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [files, folders] = await Promise.all([
    getProjectFiles(context.project.id),
    getProjectFolders(context.project.id),
  ]);

  return (
    <FilesView
      project={context.project}
      files={files}
      folders={folders}
      role={context.role}
      currentUserId={user.id}
    />
  );
}
