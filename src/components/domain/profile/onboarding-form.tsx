'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateProfileAction } from '@/lib/actions/profile';
import type { Profile, Skill, Technology } from '@/types/database';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingFormProps {
  initialProfile: Profile;
  availableSkills: Skill[];
  availableTechnologies: Technology[];
}

export function OnboardingForm({
  initialProfile,
  availableSkills,
  availableTechnologies,
}: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = React.useState(initialProfile.full_name || '');
  const [username, setUsername] = React.useState(initialProfile.username || '');
  const [headline, setHeadline] = React.useState(initialProfile.headline || '');
  const [bio, setBio] = React.useState(initialProfile.bio || '');
  const [location, setLocation] = React.useState(initialProfile.location || '');
  const [timezone, setTimezone] = React.useState(initialProfile.timezone || 'UTC');
  const [availabilityHours, setAvailabilityHours] = React.useState(
    initialProfile.availability_hours_per_week ?? 15
  );

  const [selectedSkillIds, setSelectedSkillIds] = React.useState<string[]>([]);
  const [selectedTechIds, setSelectedTechIds] = React.useState<string[]>([]);

  const [githubUsername, setGithubUsername] = React.useState(
    initialProfile.github_username || ''
  );
  const [portfolioUrl, setPortfolioUrl] = React.useState(initialProfile.portfolio_url || '');
  const [twitter, setTwitter] = React.useState(
    (initialProfile.social_links?.twitter as string) || ''
  );
  const [linkedin, setLinkedin] = React.useState(
    (initialProfile.social_links?.linkedin as string) || ''
  );

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
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
        setIsSubmitting(false);
      } else {
        router.push(`/developers/${result.data.username}`);
        router.refresh();
      }
    } catch {
      setErrorMessage('Failed to save profile. Please check your inputs.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 1 ? 'bg-accent-primary text-content-inverse' : 'bg-app-surface-2 text-content-muted'
            }`}
          >
            1
          </span>
          <span className="text-xs font-medium text-content-primary">Identity</span>
        </div>

        <div className="h-0.5 w-8 bg-border-subtle" />

        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 2 ? 'bg-accent-primary text-content-inverse' : 'bg-app-surface-2 text-content-muted'
            }`}
          >
            2
          </span>
          <span className="text-xs font-medium text-content-primary">Skills & Stack</span>
        </div>

        <div className="h-0.5 w-8 bg-border-subtle" />

        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 3 ? 'bg-accent-primary text-content-inverse' : 'bg-app-surface-2 text-content-muted'
            }`}
          >
            3
          </span>
          <span className="text-xs font-medium text-content-primary">Links & Finish</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-status-danger/20 bg-status-danger/10 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* STEP 1: Basic Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={fieldErrors.fullName?.[0]}
                placeholder="Ada Lovelace"
              />

              <Input
                label="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={fieldErrors.username?.[0]}
                helperText="Unique handle for your public developer profile"
                placeholder="ada_lovelace"
              />
            </div>

            <Input
              label="Professional Headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              error={fieldErrors.headline?.[0]}
              helperText="E.g. Fullstack Engineer specializing in Next.js & Distributed Systems"
              placeholder="Your technical focus"
            />

            <Textarea
              label="Bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              error={fieldErrors.bio?.[0]}
              helperText="Share what you love building and what kind of projects you are seeking"
              placeholder="Tell other developers about yourself..."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                error={fieldErrors.location?.[0]}
                placeholder="San Francisco, CA"
              />

              <Input
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                error={fieldErrors.timezone?.[0]}
                placeholder="UTC-8"
              />

              <Input
                label="Weekly Availability (hrs/wk)"
                type="number"
                min={0}
                max={100}
                value={availabilityHours}
                onChange={(e) => setAvailabilityHours(Number(e.target.value))}
                error={fieldErrors.availabilityHours?.[0]}
              />
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (!fullName.trim() || !username.trim()) {
                    setErrorMessage('Please provide your full name and a username.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep(2);
                }}
              >
                Next: Select Skills <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Skills & Technologies */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">
                Primary Skills & Roles (Select up to 20)
              </label>
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
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
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
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

            <div className="flex justify-between pt-3">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" variant="primary" onClick={() => setStep(3)}>
                Next: Links & Finish <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Links & Social */}
        {step === 3 && (
          <div className="space-y-4">
            <Input
              label="GitHub Username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              error={fieldErrors.githubUsername?.[0]}
              helperText="Your personal GitHub handle"
              placeholder="torvalds"
            />

            <Input
              label="Portfolio / Personal Website"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              error={fieldErrors.portfolioUrl?.[0]}
              placeholder="https://yourwebsite.dev"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="LinkedIn Profile"
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

            <div className="flex justify-between pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                <Sparkles className="h-4 w-4 mr-1" /> Complete Onboarding
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
