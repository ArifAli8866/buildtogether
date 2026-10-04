'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Skill, Technology } from '@/types/database';
import { createProjectAction } from '@/lib/actions/project';
import type { CreateProjectInput, ProjectRoleInput } from '@/lib/validators/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface ProjectCreateWizardProps {
  availableSkills: Skill[];
  availableTechnologies: Technology[];
}

const CATEGORIES = [
  'Developer Tools',
  'AI & Machine Learning',
  'Open Source Infrastructure',
  'Web Applications',
  'Mobile Apps',
  'FinTech',
  'Social & Collaboration',
  'Security & Privacy',
  'DevOps & Cloud',
  'Education',
  'Gaming & Entertainment',
  'Healthcare',
];

export function ProjectCreateWizard({
  availableSkills,
  availableTechnologies,
}: ProjectCreateWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  // Step 1: Identity
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [tagline, setTagline] = React.useState('');
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [stage, setStage] = React.useState<'idea' | 'planning' | 'in_development' | 'testing' | 'shipped'>('idea');
  const [collaborationType, setCollaborationType] = React.useState<'remote' | 'hybrid' | 'in_person'>('remote');
  const [visibility, setVisibility] = React.useState<'public' | 'private'>('public');

  // Step 2: Problem & Solution & Goals
  const [problemStatement, setProblemStatement] = React.useState('');
  const [proposedSolution, setProposedSolution] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [goals, setGoals] = React.useState<string[]>(['']);

  // Step 3: Technologies
  const [selectedTechIds, setSelectedTechIds] = React.useState<string[]>([]);
  const [techSearch, setTechSearch] = React.useState('');

  // Step 4: Contributor Roles
  const [roles, setRoles] = React.useState<ProjectRoleInput[]>([
    {
      title: 'Full Stack Engineer',
      description: 'Help architect core APIs and implement interactive Next.js application views.',
      requiredSkills: ['TypeScript', 'React'],
      capacityCount: 1,
      commitmentHours: 10,
    },
  ]);
  const [newSkillInput, setNewSkillInput] = React.useState<Record<number, string>>({});

  // Auto-slug generator
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
      setSlug(generated);
    }
  };

  // Add/remove goals
  const handleGoalChange = (idx: number, val: string) => {
    const updated = [...goals];
    updated[idx] = val;
    setGoals(updated);
  };

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, '']);
    }
  };

  const removeGoal = (idx: number) => {
    setGoals(goals.filter((_, i) => i !== idx));
  };

  // Tech toggle
  const toggleTech = (techId: string) => {
    setSelectedTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  // Role handlers
  const handleRoleChange = <K extends keyof ProjectRoleInput>(
    index: number,
    field: K,
    value: ProjectRoleInput[K]
  ) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], [field]: value };
    setRoles(updated);
  };

  const addRole = () => {
    setRoles([
      ...roles,
      {
        title: '',
        description: '',
        requiredSkills: [],
        capacityCount: 1,
        commitmentHours: 10,
      },
    ]);
  };

  const removeRole = (index: number) => {
    if (roles.length > 1) {
      setRoles(roles.filter((_, i) => i !== index));
    }
  };

  const addSkillToRole = (roleIndex: number, skillName: string) => {
    const clean = skillName.trim();
    if (!clean) return;
    const currentSkills = roles[roleIndex].requiredSkills || [];
    if (!currentSkills.includes(clean)) {
      handleRoleChange(roleIndex, 'requiredSkills', [...currentSkills, clean]);
    }
    setNewSkillInput((prev) => ({ ...prev, [roleIndex]: '' }));
  };

  const removeSkillFromRole = (roleIndex: number, skillName: string) => {
    const currentSkills = roles[roleIndex].requiredSkills || [];
    handleRoleChange(
      roleIndex,
      'requiredSkills',
      currentSkills.filter((s) => s !== skillName)
    );
  };

  // Step Validation
  const validateStep1 = () => {
    const errors: Record<string, string[]> = {};
    if (!title.trim() || title.length < 3) errors.title = ['Title must be at least 3 characters.'];
    if (!slug.trim() || slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = ['Slug must be lowercase alphanumeric with hyphens (min 3 chars).'];
    }
    if (!tagline.trim() || tagline.length < 10) errors.tagline = ['Tagline must be at least 10 characters.'];
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string[]> = {};
    if (!problemStatement.trim() || problemStatement.length < 10) {
      errors.problemStatement = ['Problem statement must be at least 10 characters.'];
    }
    if (!proposedSolution.trim() || proposedSolution.length < 10) {
      errors.proposedSolution = ['Proposed solution must be at least 10 characters.'];
    }
    if (!description.trim() || description.length < 20) {
      errors.description = ['Project description must be at least 20 characters.'];
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep4 = () => {
    const errors: Record<string, string[]> = {};
    if (roles.length === 0) {
      errors.roles = ['Define at least one contributor role.'];
    }
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      if (!r.title.trim() || r.title.length < 2) {
        errors[`role_${i}_title`] = ['Role title required (min 2 chars).'];
      }
      if (!r.description.trim() || r.description.length < 5) {
        errors[`role_${i}_desc`] = ['Role description required (min 5 chars).'];
      }
      if (!r.requiredSkills || r.requiredSkills.length === 0) {
        errors[`role_${i}_skills`] = ['Specify at least 1 required skill.'];
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3) {
      // Step 3 (tech) has optional selection
    }
    setCurrentStep((prev) => (Math.min(4, prev + 1) as 1 | 2 | 3 | 4));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setFieldErrors({});
    setCurrentStep((prev) => (Math.max(1, prev - 1) as 1 | 2 | 3 | 4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateStep1() || !validateStep2() || !validateStep4()) {
      setErrorMessage('Please fix validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateProjectInput = {
      title,
      slug,
      tagline,
      category,
      stage,
      collaborationType,
      visibility,
      problemStatement,
      proposedSolution,
      description,
      initialGoals: goals.filter((g) => g.trim().length > 0),
      technologyIds: selectedTechIds,
      roles,
    };

    const res = await createProjectAction(payload);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error?.message || 'Failed to create project.');
      if (res.error?.details) {
        setFieldErrors(res.error.details as Record<string, string[]>);
      }
      return;
    }

    // Success: Navigate to project page
    router.push(`/projects/${res.data.slug}`);
  };

  const filteredTechnologies = availableTechnologies.filter((t) =>
    t.name.toLowerCase().includes(techSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Steps Progress Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        {[
          { step: 1, label: 'Identity' },
          { step: 2, label: 'Vision' },
          { step: 3, label: 'Tech Stack' },
          { step: 4, label: 'Open Roles' },
        ].map(({ step, label }) => (
          <button
            key={step}
            type="button"
            onClick={() => {
              if (step < currentStep) setCurrentStep(step as 1 | 2 | 3 | 4);
            }}
            disabled={step > currentStep}
            className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
              currentStep === step
                ? 'text-accent-primary'
                : step < currentStep
                ? 'text-content-primary hover:text-accent-primary cursor-pointer'
                : 'text-content-muted cursor-not-allowed'
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                currentStep === step
                  ? 'bg-accent-primary text-content-inverse'
                  : step < currentStep
                  ? 'bg-status-success text-content-inverse'
                  : 'bg-app-surface-2 text-content-muted'
              }`}
            >
              {step < currentStep ? <Check className="h-3.5 w-3.5" /> : step}
            </div>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: IDENTITY */}
        {currentStep === 1 && (
          <Card className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-content-primary">Project Basics</h2>
              <p className="text-xs text-content-secondary">
                Name your project, choose a category, and specify its working stage.
              </p>
            </div>

            <Input
              label="Project Title"
              required
              placeholder="e.g. NextPulse Analytics"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              error={fieldErrors.title?.[0]}
              helperText="A clear, memorable name for your project (3-80 chars)."
            />

            <Input
              label="URL Slug"
              required
              placeholder="nextpulse-analytics"
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
              error={fieldErrors.slug?.[0]}
              helperText={`Your project will be accessible at: /projects/${slug || 'slug'}`}
            />

            <Input
              label="Tagline"
              required
              placeholder="e.g. Real-time telemetry dashboard for edge-deployed Next.js apps"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              error={fieldErrors.tagline?.[0]}
              helperText="A concise summary visible on discovery cards (10-160 chars)."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-content-secondary">
                  Category <span className="text-status-danger">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-1 px-3 py-1.5 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-content-secondary">
                  Current Stage <span className="text-status-danger">*</span>
                </label>
                <select
                  value={stage}
                  onChange={(e) =>
                    setStage(e.target.value as CreateProjectInput['stage'])
                  }
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-1 px-3 py-1.5 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <option value="idea">Idea (Conceptualizing)</option>
                  <option value="planning">Planning (Architecture & Specs)</option>
                  <option value="in_development">In Development (Active Coding)</option>
                  <option value="testing">Testing (QA & Staging)</option>
                  <option value="shipped">Shipped (Live in Production)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-content-secondary">
                  Collaboration Style
                </label>
                <select
                  value={collaborationType}
                  onChange={(e) =>
                    setCollaborationType(e.target.value as CreateProjectInput['collaborationType'])
                  }
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-1 px-3 py-1.5 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <option value="remote">Fully Remote (Async / Calls)</option>
                  <option value="hybrid">Hybrid (Remote + Periodic Meetups)</option>
                  <option value="in_person">In Person (Local co-working)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-content-secondary">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as CreateProjectInput['visibility'])
                  }
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-1 px-3 py-1.5 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <option value="public">Public (Visible in Explore feed)</option>
                  <option value="private">Private (Invite only)</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2: PROBLEM & SOLUTION */}
        {currentStep === 2 && (
          <Card className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-content-primary">The Vision & Narrative</h2>
              <p className="text-xs text-content-secondary">
                Developers join projects with strong problems and ambitious solutions.
              </p>
            </div>

            <Textarea
              label="The Problem Statement"
              required
              rows={3}
              placeholder="What friction, missing tooling, or inefficiency are you solving?"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              error={fieldErrors.problemStatement?.[0]}
              helperText="Explain why this problem matters (min 10 chars)."
            />

            <Textarea
              label="The Proposed Solution"
              required
              rows={3}
              placeholder="How does your application address this problem innovatively?"
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              error={fieldErrors.proposedSolution?.[0]}
              helperText="Describe your product architecture and differentiation (min 10 chars)."
            />

            <Textarea
              label="Detailed Project Description"
              required
              rows={5}
              placeholder="Provide context on the roadmap, tech decisions, target audience, and expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={fieldErrors.description?.[0]}
              helperText="Full markdown supported description (min 20 chars)."
            />

            {/* Initial Goals */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-medium text-content-secondary">
                    Initial Milestones / Goals (Optional, max 5)
                  </label>
                  <p className="text-[11px] text-content-muted">
                    Clear near-term milestones give prospective contributors confidence.
                  </p>
                </div>
                {goals.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                    <Plus className="h-3 w-3 mr-1" /> Add Milestone
                  </Button>
                )}
              </div>

              {goals.map((g, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`e.g. Milestone ${idx + 1}: Deploy MVP with Supabase auth & schema`}
                    value={g}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                  />
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(idx)}
                      className="p-2 text-content-muted hover:text-status-danger"
                      aria-label="Remove goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* STEP 3: TECH STACK */}
        {currentStep === 3 && (
          <Card className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-content-primary">Technology Stack</h2>
              <p className="text-xs text-content-secondary">
                Select the languages, frameworks, databases, and infrastructure your project utilizes.
                This directly feeds into developer match calculations (30% weight).
              </p>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-content-muted" />
              <input
                type="text"
                placeholder="Search technologies (e.g. Next.js, Postgres, Docker)..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-1 pl-9 pr-3 py-1.5 text-sm text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </div>

            {/* Selected Chips */}
            {selectedTechIds.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-content-secondary">
                  Selected ({selectedTechIds.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTechIds.map((id) => {
                    const tech = availableTechnologies.find((t) => t.id === id);
                    if (!tech) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleTech(id)}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 px-2.5 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/20"
                      >
                        <span>{tech.name}</span>
                        <span className="text-xs">×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Taxonomy List */}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border-subtle p-3 space-y-1 bg-app-surface-2/40">
              <div className="flex flex-wrap gap-1.5">
                {filteredTechnologies.map((tech) => {
                  const isSelected = selectedTechIds.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => toggleTech(tech.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-accent-primary text-content-inverse border-accent-primary'
                          : 'bg-app-surface-1 text-content-secondary border-border-subtle hover:border-border-focus'
                      }`}
                    >
                      {tech.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* STEP 4: OPEN ROLES BUILDER */}
        {currentStep === 4 && (
          <Card className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-content-primary">Contributor Roles Needed</h2>
                <p className="text-xs text-content-secondary">
                  Define the specific positions you want to recruit for. Skills specified here are evaluated
                  in deterministic candidate matching (40% weight).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRole}>
                <Plus className="h-3 w-3 mr-1" /> Add Role
              </Button>
            </div>

            {fieldErrors.roles && (
              <p className="text-xs text-status-danger">{fieldErrors.roles[0]}</p>
            )}

            <div className="space-y-4">
              {roles.map((role, rIdx) => (
                <div
                  key={rIdx}
                  className="rounded-xl border border-border-subtle bg-app-surface-2/50 p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">
                      Role #{rIdx + 1}
                    </span>
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(rIdx)}
                        className="text-content-muted hover:text-status-danger p-1 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <Input
                    label="Role Title"
                    required
                    placeholder="e.g. Lead Frontend Engineer, AI Research Contributor"
                    value={role.title}
                    onChange={(e) => handleRoleChange(rIdx, 'title', e.target.value)}
                    error={fieldErrors[`role_${rIdx}_title`]?.[0]}
                  />

                  <Textarea
                    label="Role Description & Responsibilities"
                    required
                    rows={2}
                    placeholder="What specific tasks or ownership areas will this contributor lead?"
                    value={role.description}
                    onChange={(e) => handleRoleChange(rIdx, 'description', e.target.value)}
                    error={fieldErrors[`role_${rIdx}_desc`]?.[0]}
                  />

                  {/* Skills tags for this role */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-content-secondary">
                      Required Skills <span className="text-status-danger">*</span>
                    </label>

                    {/* Skill chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {role.requiredSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 px-2 py-0.5 text-xs font-medium text-accent-primary"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSkillFromRole(rIdx, s)}
                            className="hover:text-status-danger ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add skill (e.g. Next.js, Postgres, UI Design) + Enter"
                        value={newSkillInput[rIdx] || ''}
                        onChange={(e) =>
                          setNewSkillInput((prev) => ({ ...prev, [rIdx]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkillToRole(rIdx, newSkillInput[rIdx] || '');
                          }
                        }}
                        className="flex h-8 flex-1 rounded-md border border-border-subtle bg-app-surface-1 px-3 py-1 text-xs text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addSkillToRole(rIdx, newSkillInput[rIdx] || '')}
                      >
                        Add
                      </Button>
                    </div>
                    {availableSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 items-center">
                        <span className="text-[10px] text-content-muted">Suggestions:</span>
                        {availableSkills.slice(0, 8).map((sk) => (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => addSkillToRole(rIdx, sk.name)}
                            className="text-[10px] rounded bg-app-surface-1 px-1.5 py-0.5 text-content-muted border border-border-subtle hover:text-content-primary hover:border-border-focus"
                          >
                            + {sk.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {fieldErrors[`role_${rIdx}_skills`] && (
                      <p className="text-xs text-status-danger">
                        {fieldErrors[`role_${rIdx}_skills`][0]}
                      </p>
                    )}
                  </div>

                  {/* Capacity & Commitment */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Input
                      label="Capacity (Developers needed)"
                      type="number"
                      min={1}
                      max={10}
                      value={role.capacityCount}
                      onChange={(e) =>
                        handleRoleChange(rIdx, 'capacityCount', parseInt(e.target.value) || 1)
                      }
                    />

                    <Input
                      label="Weekly Commitment (Hours/wk)"
                      type="number"
                      min={1}
                      max={60}
                      value={role.commitmentHours}
                      onChange={(e) =>
                        handleRoleChange(rIdx, 'commitmentHours', parseInt(e.target.value) || 10)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
          {currentStep > 1 ? (
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button type="button" variant="primary" size="sm" onClick={handleNext}>
              Next Step <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing Project...' : 'Publish Project & Open Roles'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
