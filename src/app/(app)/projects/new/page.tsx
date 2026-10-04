import { redirect } from 'next/navigation';
import { getCurrentUser, getAllSkills, getAllTechnologies } from '@/lib/queries/profile';
import { ProjectCreateWizard } from '@/components/domain/project/project-create-wizard';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Create a Project | Build Together',
  description: 'Launch a new project proposal and recruit passionate developers to build with you.',
};

export default async function NewProjectPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login?redirect=/projects/new');
  }

  const [skills, technologies] = await Promise.all([
    getAllSkills(),
    getAllTechnologies(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-content-secondary hover:text-content-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Create a New Project
          </h1>
        </div>
        <p className="text-sm text-content-secondary max-w-2xl">
          Define your project vision, specify required technologies, and publish open contributor
          roles. Our deterministic matching engine will connect you with qualified developers.
        </p>
      </div>

      <ProjectCreateWizard
        availableSkills={skills}
        availableTechnologies={technologies}
      />
    </main>
  );
}
