import { redirect } from 'next/navigation';
import { getCurrentUser, getAllSkills, getAllTechnologies } from '@/lib/queries/profile';
import { OnboardingForm } from '@/components/domain/profile/onboarding-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login?redirect=/onboarding');
  }

  const [skills, technologies] = await Promise.all([
    getAllSkills(),
    getAllTechnologies(),
  ]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col justify-center px-4 py-8">
      <Card className="border-border-subtle bg-app-surface-1 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Developer Onboarding</CardTitle>
          <CardDescription>
            Configure your technical identity, skills, and availability so other developers can
            find and collaborate with you.
          </CardDescription>
        </CardHeader>

        <div className="pt-2">
          <OnboardingForm
            initialProfile={profile}
            availableSkills={skills}
            availableTechnologies={technologies}
          />
        </div>
      </Card>
    </div>
  );
}
