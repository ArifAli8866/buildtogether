/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitContributionRequestAction,
  reviewContributionRequestAction,
  withdrawContributionRequestAction,
  updateProjectMemberRoleAction,
  removeProjectMemberAction,
  leaveProjectAction,
} from './contribution';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Contribution & Membership Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: 'applicant-uuid-1' };
  const mockOwner = { id: 'owner-uuid-1' };
  const projectId = '11111111-1111-4111-8111-111111111111';
  const roleId = '22222222-2222-4222-8222-222222222222';
  const requestId = '33333333-3333-4333-8333-333333333333';
  const memberId = '44444444-4444-4444-8444-444444444444';

  describe('submitContributionRequestAction', () => {
    const validSubmitInput = {
      projectId,
      projectRoleId: roleId,
      pitch: 'I have extensive full-stack experience and would love to contribute to this workspace.',
      portfolioLinks: ['https://github.com/developer'],
      weeklyHours: 12,
    };

    it('blocks unauthenticated callers with UNAUTHORIZED', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns NOT_FOUND if project does not exist', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('prevents project owner from applying to their own project', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOwner }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('owner of this project');
      }
    });

    it('prevents existing project members from applying', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: memberId, role: 'contributor' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('already a member');
      }
    });

    it('prevents duplicate active applications for the same project', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: requestId, status: 'pending' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('active application pending review');
      }
    });

    it('submits successfully and derives applicant_id from session', async () => {
      let insertedPayload: any = null;

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockImplementation((payload) => {
                insertedPayload = payload;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: requestId, ...payload, status: 'pending' },
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }
          if (table === 'project_roles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: roleId,
                      project_id: projectId,
                      status: 'open',
                      capacity_count: 2,
                      filled_count: 0,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitContributionRequestAction(validSubmitInput);
      expect(result.success).toBe(true);
      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.applicant_id).toBe(mockUser.id);
      expect(insertedPayload.weekly_hours).toBe(12);
    });
  });

  describe('reviewContributionRequestAction', () => {
    it('blocks non-admin callers from reviewing applications with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: requestId,
                      project_id: projectId,
                      project: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { role: 'contributor' }, // contributor is not admin
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await reviewContributionRequestAction({
        requestId,
        decision: 'accepted',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('allows project owner to accept an application and records reviewer_id', async () => {
      let updatedStatus: any = null;

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOwner }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: requestId,
                      project_id: projectId,
                      applicant_id: mockUser.id,
                      project_role_id: roleId,
                      project: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((payload) => {
                updatedStatus = payload;
                return {
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: requestId, ...payload },
                        error: null,
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { role: 'owner' },
                      error: null,
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'new-member' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await reviewContributionRequestAction({
        requestId,
        decision: 'accepted',
        reviewNotes: 'Welcome aboard!',
      });

      expect(result.success).toBe(true);
      expect(updatedStatus).toBeDefined();
      expect(updatedStatus.status).toBe('accepted');
      expect(updatedStatus.reviewer_id).toBe(mockOwner.id);
      expect(updatedStatus.review_notes).toBe('Welcome aboard!');
    });
  });

  describe('withdrawContributionRequestAction', () => {
    it('blocks withdrawal if the caller is not the applicant', async () => {
      const mockOtherUser = { id: 'other-user-uuid' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOtherUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: requestId,
                      applicant_id: mockUser.id,
                      status: 'pending',
                      project: { slug: 'test-project' },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await withdrawContributionRequestAction(requestId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('blocks withdrawal if request was already accepted', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: requestId,
                      applicant_id: mockUser.id,
                      status: 'accepted',
                      project: { slug: 'test-project' },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await withdrawContributionRequestAction(requestId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('already accepted');
      }
    });

    it('successfully withdraws a pending request', async () => {
      let updatedPayload: any = null;

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'contribution_requests') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: requestId,
                      applicant_id: mockUser.id,
                      status: 'pending',
                      project: { slug: 'test-project' },
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((payload) => {
                updatedPayload = payload;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await withdrawContributionRequestAction(requestId);
      expect(result.success).toBe(true);
      expect(updatedPayload.status).toBe('withdrawn');
    });
  });

  describe('updateProjectMemberRoleAction & removeProjectMemberAction', () => {
    it('blocks changing role of the project owner', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOwner }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockImplementation((fields: string) => {
                if (fields.includes('slug')) {
                  // target member query
                  return {
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: memberId,
                          user_id: mockOwner.id,
                          project_id: projectId,
                          role: 'owner',
                          project: { slug: 'test-project', owner_id: mockOwner.id },
                        },
                        error: null,
                      }),
                    }),
                  };
                }
                // caller permission query (role)
                return {
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { role: 'owner' },
                        error: null,
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProjectMemberRoleAction({
        projectId,
        memberId,
        newRole: 'maintainer',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toContain('owner role cannot be modified');
      }
    });

    it('blocks removing the project owner from the team roster', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOwner }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockImplementation((fields: string) => {
                if (fields.includes('slug')) {
                  // target member query
                  return {
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: memberId,
                          user_id: mockOwner.id,
                          project_id: projectId,
                          role: 'owner',
                          project: { slug: 'test-project' },
                        },
                        error: null,
                      }),
                    }),
                  };
                }
                // caller admin query (role)
                return {
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { role: 'owner' },
                        error: null,
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await removeProjectMemberAction({
        projectId,
        memberId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toContain('project owner cannot be removed');
      }
    });
  });

  describe('leaveProjectAction', () => {
    it('blocks project owner from leaving their own project', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockOwner }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: memberId, role: 'owner', project: { slug: 'test-project' } },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await leaveProjectAction(projectId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toContain('owner cannot leave the project');
      }
    });

    it('allows a normal contributor to leave the project', async () => {
      let deleted = false;

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, owner_id: mockOwner.id, slug: 'test-project' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: memberId, role: 'contributor', project_role_id: roleId },
                      error: null,
                    }),
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  deleted = true;
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          if (table === 'project_roles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { filled_count: 1 },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await leaveProjectAction(projectId);
      expect(result.success).toBe(true);
      expect(deleted).toBe(true);
    });
  });
});
