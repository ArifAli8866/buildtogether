import { describe, it, expect } from 'vitest';
import { calculateMatchExplanation } from './engine';
import type { ProjectRole, Profile, Skill, Technology } from '@/types/database';

describe('calculateMatchExplanation', () => {
  const mockOwnerProfile: Profile = {
    id: 'owner-uuid-1',
    username: 'projectlead',
    full_name: 'Lead Developer',
    headline: 'Founder & Architect',
    bio: 'Building developer tools.',
    avatar_url: null,
    banner_url: null,
    location: null,
    github_username: 'projectlead',
    portfolio_url: null,
    social_links: {},
    timezone: 'UTC',
    availability_hours_per_week: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOpenRoles: ProjectRole[] = [
    {
      id: 'role-uuid-1',
      project_id: 'project-uuid-1',
      title: 'Senior Frontend Engineer',
      description: 'Build user interfaces in React.',
      required_skills: ['TypeScript', 'React'],
      capacity_count: 1,
      filled_count: 0,
      commitment_hours_per_week: 10,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const projectTechNames = ['Next.js', 'PostgreSQL'];

  it('returns 0 score and default structure when userProfile is null', () => {
    const result = calculateMatchExplanation({
      projectRoles: mockOpenRoles,
      projectTechNames,
      ownerProfile: mockOwnerProfile,
      userProfile: null,
      userSkills: [],
      userTechnologies: [],
    });

    expect(result.totalScore).toBe(0);
    expect(result.skills.score).toBe(0);
    expect(result.technologies.score).toBe(0);
    expect(result.availability.score).toBe(0);
  });

  it('computes 100% perfect match when all 4 dimensions align completely', () => {
    const candidateProfile: Profile = {
      ...mockOwnerProfile,
      id: 'candidate-uuid-1',
      username: 'canddev',
      timezone: 'UTC',
      availability_hours_per_week: 15, // >= 10
    };

    const userSkills: Skill[] = [
      { id: 's1', name: 'TypeScript', category: 'Language', created_at: '' },
      { id: 's2', name: 'React', category: 'Frontend', created_at: '' },
    ];

    const userTechnologies: Technology[] = [
      { id: 't1', name: 'Next.js', icon: null, created_at: '' },
      { id: 't2', name: 'PostgreSQL', icon: null, created_at: '' },
    ];

    const result = calculateMatchExplanation({
      projectRoles: mockOpenRoles,
      projectTechNames,
      ownerProfile: mockOwnerProfile,
      userProfile: candidateProfile,
      userSkills,
      userTechnologies,
    });

    expect(result.skills.score).toBe(40);
    expect(result.skills.matchedSkills).toEqual(['TypeScript', 'React']);
    expect(result.skills.missingSkills).toHaveLength(0);

    expect(result.technologies.score).toBe(30);
    expect(result.technologies.matchedTech).toEqual(['Next.js', 'PostgreSQL']);

    expect(result.availability.score).toBe(20);
    expect(result.availability.fits).toBe(true);

    expect(result.timezone.score).toBe(10);
    expect(result.timezone.isCompatible).toBe(true);

    expect(result.totalScore).toBe(100);
  });

  it('computes partial match proportionally with explainable missing skills', () => {
    const candidateProfile: Profile = {
      ...mockOwnerProfile,
      id: 'candidate-uuid-2',
      username: 'partdev',
      timezone: 'Asia/Tokyo', // Different timezone
      availability_hours_per_week: 6, // 6 is >= 10/2 (5), so half points (10)
    };

    // Candidate only knows TypeScript, not React
    const userSkills: Skill[] = [
      { id: 's1', name: 'TypeScript', category: 'Language', created_at: '' },
    ];

    // Candidate only knows Next.js, not PostgreSQL
    const userTechnologies: Technology[] = [
      { id: 't1', name: 'Next.js', icon: null, created_at: '' },
    ];

    const result = calculateMatchExplanation({
      projectRoles: mockOpenRoles,
      projectTechNames,
      ownerProfile: mockOwnerProfile,
      userProfile: candidateProfile,
      userSkills,
      userTechnologies,
    });

    // Skills: 1/2 -> 20 pts
    expect(result.skills.score).toBe(20);
    expect(result.skills.matchedSkills).toEqual(['TypeScript']);
    expect(result.skills.missingSkills).toEqual(['React']);

    // Tech: 1/2 -> 15 pts
    expect(result.technologies.score).toBe(15);
    expect(result.technologies.matchedTech).toEqual(['Next.js']);

    // Availability: 6 hrs >= 5 hrs -> 10 pts
    expect(result.availability.score).toBe(10);
    expect(result.availability.fits).toBe(false);

    // Timezone: fallback base 5 pts
    expect(result.timezone.score).toBe(5);

    expect(result.totalScore).toBe(50);
  });

  it('is strictly deterministic across repeated executions', () => {
    const candidateProfile: Profile = {
      ...mockOwnerProfile,
      id: 'candidate-uuid-3',
      timezone: 'UTC',
      availability_hours_per_week: 10,
    };
    const userSkills: Skill[] = [
      { id: 's1', name: 'TypeScript', category: 'Language', created_at: '' },
    ];
    const userTechnologies: Technology[] = [];

    const firstRun = calculateMatchExplanation({
      projectRoles: mockOpenRoles,
      projectTechNames,
      ownerProfile: mockOwnerProfile,
      userProfile: candidateProfile,
      userSkills,
      userTechnologies,
    });

    for (let i = 0; i < 50; i++) {
      const subsequentRun = calculateMatchExplanation({
        projectRoles: mockOpenRoles,
        projectTechNames,
        ownerProfile: mockOwnerProfile,
        userProfile: candidateProfile,
        userSkills,
        userTechnologies,
      });
      expect(subsequentRun).toEqual(firstRun);
    }
  });
});
