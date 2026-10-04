'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarUploader } from '@/components/domain/profile/avatar-uploader';
import { ExperienceManager } from '@/components/domain/profile/experience-manager';
import { updateProfileAction } from '@/lib/actions/profile';
import type { Profile, ProfileExperience, Skill, Technology } from '@/types/database';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface ProfileEditorProps {
  profile: Profile;
  experiences: ProfileExperience[];
  availableSkills: Skill[];
  availableTechnologies: Technology[];
  userSkills: Skill[];
  userTechnologies: Technology[];
}

export function ProfileEditor({
  profile,
  experiences,
  availableSkills,
  availableTechnologies,
  userSkills,
  userTechnologies,
}: ProfileEditorProps) {
  const router = useRouter();

  const [fullName, setFullName] = React.useState(profile.full_name || '');
  const [username, setUsername] = React.useState(profile.username || '');
  const [headline, setHeadline] = React.useState(profile.headline || '');
  const [bio, setBio] = React.useState(profile.bio || '');
  const [location, setLocation] = React.useState(profile.location || '');
  const [timezone, setTimezone] = React.useState(profile.timezone || 'UTC');
  const [availabilityHours, setAvailabilityHours] = React.useState(
    profile.availability_hours_per_week ?? 10
  );

  const [selectedSkillIds, setSelectedSkillIds] = React.useState<string[]>(
    userSkills.map((s) => s.id)
  );
  const [selectedTechIds, setSelectedTechIds] = React.useState<string[]>(
    userTechnologies.map((t) => t.id)
  );

  const [githubUsername, setGithubUsername] = React.useState(profile.github_username || '');
  const [portfolioUrl, setPortfolioUrl] = React.useState(profile.portfolio_url || '');
  const [twitter, setTwitter] = React.useState((profile.social_links?.twitter as string) || '');
  const [linkedin, setLinkedin] = React.useState((profile.social_links?.linkedin as string) || '');

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  function toggleTech(techId: string) {
    setSelectedTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const socialLinks: Record<string, string> = {};
      if (twitter.trim()) socialLinks.twitter = twitter.trim();
      if (linkedin.trim()) socialLinks.linkedin = linkedin.trim();

      const result = await updateProfileAction({
        fullName,
        username,
        headline,
        bio,
        location,
        timezone,
        availabilityHours: Number(availabilityHours),
        githubUsername: githubUsername.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        socialLinks,
        skillIds: selectedSkillIds,
        technologyIds: selectedTechIds,
      });

      if (!result.success) {
        setErrorMessage(result.error.message);
        if (result.error.details) {
          setFieldErrors(result.error.details);
        }
      } else {
        setSuccessMessage('Profile saved successfully!');
        router.refresh();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setErrorMessage('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Avatar Section */}
      <section className="space-y-3 border-b border-border-subtle pb-6">
        <h4 className="text-sm font-semibold text-content-primary">Profile Photo</h4>
        <AvatarUploader currentAvatarUrl={profile.avatar_url} fullName={profile.full_name} />
      </section>

      {/* 2. Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md border border-status-danger/20 bg-status-danger/10 p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-md border border-status-success/20 bg-status-success/10 p-3 text-xs text-status-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-content-primary">Basic Information</h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName?.[0]}
            />

            <Input
              label="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username?.[0]}
              helperText={`buildtogether.dev/developers/${username}`}
            />
          </div>

          <Input
            label="Professional Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            error={fieldErrors.headline?.[0]}
            placeholder="e.g. Senior Frontend Engineer | React & Next.js"
          />

          <Textarea
            label="Bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            error={fieldErrors.bio?.[0]}
            placeholder="Introduce yourself and describe what you are excited to build..."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              error={fieldErrors.location?.[0]}
              placeholder="e.g. New York, NY"
            />

            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              error={fieldErrors.timezone?.[0]}
              placeholder="UTC"
            />

            <Input
              label="Availability (hrs/week)"
              type="number"
              min={0}
              max={100}
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(Number(e.target.value))}
              error={fieldErrors.availabilityHours?.[0]}
            />
          </div>
        </section>

        {/* 3. Skills & Technologies */}
        <section className="space-y-4 border-t border-border-subtle pt-6">
          <h4 className="text-sm font-semibold text-content-primary">Skills & Technologies</h4>

          <div>
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">
              Primary Skills & Roles
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {availableSkills.map((skill) => {
                const isSelected = selectedSkillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary text-content-inverse'
                        : 'border-border-subtle bg-app-surface-1 text-content-secondary hover:border-border-strong hover:text-content-primary'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    <span>{skill.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">
              Technologies & Frameworks
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {availableTechnologies.map((tech) => {
                const isSelected = selectedTechIds.includes(tech.id);
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => toggleTech(tech.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-accent-cyan bg-accent-cyan text-content-inverse'
                        : 'border-border-subtle bg-app-surface-1 text-content-secondary hover:border-border-strong hover:text-content-primary'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    <span>{tech.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. External Links */}
        <section className="space-y-4 border-t border-border-subtle pt-6">
          <h4 className="text-sm font-semibold text-content-primary">External Links</h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="GitHub Username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              error={fieldErrors.githubUsername?.[0]}
              placeholder="e.g. torvalds"
            />

            <Input
              label="Portfolio Website"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              error={fieldErrors.portfolioUrl?.[0]}
              placeholder="https://yourportfolio.dev"
            />

            <Input
              label="LinkedIn URL"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />

            <Input
              label="X / Twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://x.com/username"
            />
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2">
            <Save className="h-4 w-4" /> Save Profile
          </Button>
        </div>
      </form>

      {/* 5. Work Experience Manager */}
      <section className="border-t border-border-subtle pt-6">
        <ExperienceManager initialExperiences={experiences} />
      </section>
    </div>
  );
}
