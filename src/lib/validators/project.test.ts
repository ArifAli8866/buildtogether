import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  updateProjectSchema,
  projectRoleInputSchema,
} from './project';

describe('projectRoleInputSchema', () => {
  it('validates a valid project role', () => {
    const validRole = {
      title: 'Senior Frontend Engineer',
      description: 'Lead client state architecture and design system implementation.',
      requiredSkills: ['React', 'TypeScript'],
      capacityCount: 2,
      commitmentHours: 15,
    };
    const result = projectRoleInputSchema.safeParse(validRole);
    expect(result.success).toBe(true);
  });

  it('fails if title is too short or empty', () => {
    const invalidRole = {
      title: 'A',
      description: 'Valid description here',
      requiredSkills: ['React'],
      capacityCount: 1,
      commitmentHours: 10,
    };
    const result = projectRoleInputSchema.safeParse(invalidRole);
    expect(result.success).toBe(false);
  });

  it('fails if requiredSkills is empty', () => {
    const invalidRole = {
      title: 'Backend Engineer',
      description: 'Build robust REST and GraphQL services.',
      requiredSkills: [],
      capacityCount: 1,
      commitmentHours: 10,
    };
    const result = projectRoleInputSchema.safeParse(invalidRole);
    expect(result.success).toBe(false);
  });

  it('fails if capacity or commitment hours are zero or negative', () => {
    const invalidRole = {
      title: 'DevOps Engineer',
      description: 'Setup CI/CD pipelines.',
      requiredSkills: ['Docker'],
      capacityCount: 0,
      commitmentHours: -5,
    };
    const result = projectRoleInputSchema.safeParse(invalidRole);
    expect(result.success).toBe(false);
  });
});

describe('createProjectSchema', () => {
  const validProjectPayload = {
    title: 'Cloud Pulse Analytics',
    slug: 'cloud-pulse-analytics',
    tagline: 'Real-time telemetry and edge analytics for modern web applications',
    description:
      'Cloud Pulse provides developers with instantaneous insights into serverless function execution and performance metrics.',
    problemStatement:
      'Modern serverless stacks lack low-latency distributed tracing without massive vendor lock-in.',
    proposedSolution:
      'An open-source telemetry collector with ClickHouse storage and Next.js live visualization.',
    category: 'Developer Tools',
    stage: 'planning' as const,
    visibility: 'public' as const,
    collaborationType: 'remote' as const,
    technologyIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
    roles: [
      {
        title: 'Systems Engineer',
        description: 'Design distributed ingest pipelines in Go or Rust.',
        requiredSkills: ['Rust', 'Go'],
        capacityCount: 1,
        commitmentHours: 12,
      },
    ],
    initialGoals: ['Complete architecture RFC', 'Benchmark ClickHouse ingestion'],
  };

  it('accepts valid project creation payload', () => {
    const result = createProjectSchema.safeParse(validProjectPayload);
    expect(result.success).toBe(true);
  });

  it('rejects uppercase or invalid characters in slug', () => {
    const invalid = {
      ...validProjectPayload,
      slug: 'Cloud_Pulse_Analytics!',
    };
    const result = createProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects when roles array is empty', () => {
    const invalid = {
      ...validProjectPayload,
      roles: [],
    };
    const result = createProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects short problem or solution statements', () => {
    const invalid = {
      ...validProjectPayload,
      problemStatement: 'Short',
      proposedSolution: 'Fix it',
    };
    const result = createProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('accepts valid project update payload', () => {
    const validUpdate = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Cloud Pulse Analytics v2',
      tagline: 'Next-gen distributed edge analytics and telemetry platform',
      description: 'Extended description for v2 of Cloud Pulse Analytics platform.',
      problemStatement: 'Distributed systems remain difficult to monitor in real-time.',
      proposedSolution: 'Lightweight sidecar agents and fast columnar aggregates.',
      category: 'Developer Tools',
      stage: 'in_development' as const,
      visibility: 'public' as const,
      collaborationType: 'remote' as const,
      technologyIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
    };
    const result = updateProjectSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid id in update', () => {
    const invalid = {
      id: 'invalid-id',
      title: 'Valid Title',
      tagline: 'Valid Tagline for Testing',
      description: 'Valid Description with sufficient length for validation.',
      problemStatement: 'Valid problem statement text.',
      proposedSolution: 'Valid proposed solution text.',
      category: 'Developer Tools',
      stage: 'in_development' as const,
      visibility: 'public' as const,
      collaborationType: 'remote' as const,
      technologyIds: [],
    };
    const result = updateProjectSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
