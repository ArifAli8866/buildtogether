import type { ProjectRole, Profile, Skill, Technology } from '@/types/database';

export interface MatchBreakdown {
  totalScore: number;
  skills: {
    score: number;
    maxScore: 40;
    matchedSkills: string[];
    missingSkills: string[];
  };
  technologies: {
    score: number;
    maxScore: 30;
    matchedTech: string[];
    projectTech: string[];
  };
  availability: {
    score: number;
    maxScore: 20;
    userHours: number;
    requiredHours: number;
    fits: boolean;
  };
  timezone: {
    score: number;
    maxScore: 10;
    userTimezone: string;
    ownerTimezone: string;
    isCompatible: boolean;
  };
}

/**
 * Deterministically computes the match score (0-100) and detailed explanation
 * between a candidate developer profile and a project with open roles.
 *
 * Scoring Formula:
 * - Skills Overlap: 40 points
 * - Technologies Match: 30 points
 * - Availability Fit: 20 points
 * - Timezone Proximity: 10 points
 */
export function calculateMatchExplanation({
  projectRoles,
  projectTechNames,
  ownerProfile,
  userProfile,
  userSkills,
  userTechnologies,
}: {
  projectRoles: ProjectRole[];
  projectTechNames: string[];
  ownerProfile?: Profile | null;
  userProfile?: Profile | null;
  userSkills: Skill[];
  userTechnologies: Technology[];
}): MatchBreakdown {
  if (!userProfile) {
    return {
      totalScore: 0,
      skills: { score: 0, maxScore: 40, matchedSkills: [], missingSkills: [] },
      technologies: { score: 0, maxScore: 30, matchedTech: [], projectTech: projectTechNames },
      availability: { score: 0, maxScore: 20, userHours: 0, requiredHours: 10, fits: false },
      timezone: {
        score: 0,
        maxScore: 10,
        userTimezone: 'UTC',
        ownerTimezone: ownerProfile?.timezone || 'UTC',
        isCompatible: false,
      },
    };
  }

  // 1. Skill Overlap (40 points)
  const openRoles = projectRoles.filter((r) => r.status === 'open');
  const allRequiredSkills = Array.from(
    new Set(openRoles.flatMap((r) => r.required_skills || []))
  );

  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of allRequiredSkills) {
    if (userSkillNames.some((us) => us === reqSkill.toLowerCase())) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  let skillsScore = 0;
  if (allRequiredSkills.length > 0) {
    const ratio = matchedSkills.length / allRequiredSkills.length;
    skillsScore = Math.min(40, Math.round(ratio * 40));
  } else {
    // If project specified no specific role skills, allocate base partial points
    skillsScore = 20;
  }

  // 2. Technology Match (30 points)
  const userTechNames = userTechnologies.map((t) => t.name.toLowerCase());
  const matchedTech: string[] = [];

  for (const pt of projectTechNames) {
    if (userTechNames.some((ut) => ut === pt.toLowerCase())) {
      matchedTech.push(pt);
    }
  }

  let techScore = 0;
  if (projectTechNames.length > 0) {
    const techRatio = matchedTech.length / projectTechNames.length;
    techScore = Math.min(30, Math.round(techRatio * 30));
  } else {
    techScore = 15;
  }

  // 3. Availability Fit (20 points)
  const userHours = userProfile.availability_hours_per_week ?? 10;
  const minRequiredHours =
    openRoles.length > 0
      ? Math.min(...openRoles.map((r) => r.commitment_hours_per_week || 10))
      : 10;

  let availabilityScore = 0;
  const fits = userHours >= minRequiredHours;

  if (fits) {
    availabilityScore = 20;
  } else if (userHours >= minRequiredHours / 2) {
    availabilityScore = 10;
  } else {
    availabilityScore = 0;
  }

  // 4. Timezone Proximity (10 points)
  const userTz = (userProfile.timezone || 'UTC').toUpperCase();
  const ownerTz = (ownerProfile?.timezone || 'UTC').toUpperCase();

  let timezoneScore = 5;
  let isTzCompatible = false;

  if (userTz === ownerTz) {
    timezoneScore = 10;
    isTzCompatible = true;
  } else if (
    (userTz.includes('UTC') && ownerTz.includes('UTC')) ||
    (userTz.includes('EST') && ownerTz.includes('EDT')) ||
    (userTz.includes('PST') && ownerTz.includes('PDT'))
  ) {
    timezoneScore = 8;
    isTzCompatible = true;
  } else {
    timezoneScore = 5;
    isTzCompatible = false;
  }

  const totalScore = Math.min(
    100,
    Math.max(0, skillsScore + techScore + availabilityScore + timezoneScore)
  );

  return {
    totalScore,
    skills: {
      score: skillsScore,
      maxScore: 40,
      matchedSkills,
      missingSkills,
    },
    technologies: {
      score: techScore,
      maxScore: 30,
      matchedTech,
      projectTech: projectTechNames,
    },
    availability: {
      score: availabilityScore,
      maxScore: 20,
      userHours,
      requiredHours: minRequiredHours,
      fits,
    },
    timezone: {
      score: timezoneScore,
      maxScore: 10,
      userTimezone: userProfile.timezone || 'UTC',
      ownerTimezone: ownerProfile?.timezone || 'UTC',
      isCompatible: isTzCompatible,
    },
  };
}
