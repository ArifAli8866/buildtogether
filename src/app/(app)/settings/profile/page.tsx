import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getProfileByUsername,
  getAllSkills,
  getAllTechnologies,
} from '@/lib/queries/profile';
import { ProfileEditor } from '@/components/domain/profile/profile-editor';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function SettingsProfilePage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login?redirect=/settings/profile');
  }

  const [detailedProfileData, availableSkills, availableTechnologies] = await Promise.all([
    getProfileByUsername(profile.username),
    getAllSkills(),
    getAllTechnologies(),
  ]);

  const experiences = detailedProfileData?.experiences || [];
  const userSkills = detailedProfileData?.skills || [];
  const userTechnologies = detailedProfileData?.technologies || [];

  return (
    <Card className="border-border-subtle bg-app-surface-1">
      <CardHeader className="border-b border-border-subtle pb-4">
        <CardTitle className="text-lg">Public Profile</CardTitle>
        <CardDescription>
          This information will be displayed publicly on your developer portfolio and in project
          search feeds.
        </CardDescription>
      </CardHeader>

      <div className="pt-6">
        <ProfileEditor
          profile={profile}
          experiences={experiences}
          availableSkills={availableSkills}
          availableTechnologies={availableTechnologies}
          userSkills={userSkills}
          userTechnologies={userTechnologies}
        />
      </div>
    </Card>
  );
}
