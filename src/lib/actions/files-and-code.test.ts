/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadProjectFileAction,
  getProjectFileDownloadUrlAction,
  deleteProjectFileAction,
  createCodeSnippetAction,
  updateCodeSnippetAction,
  deleteCodeSnippetAction,
  createCodeReviewAction,
  updateCodeReviewAction,
  submitReviewDecisionAction,
  addCodeReviewCommentAction,
  resolveCodeReviewCommentAction,
  deleteCodeReviewCommentAction,
  deleteCodeReviewAction,
} from './files-and-code';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Files & Code Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: '11111111-1111-4111-8111-111111111111' };
  const mockOtherUser = { id: '99999999-9999-4999-8999-999999999999' };
  const projectId = '11111111-1111-4111-8111-111111111111';
  const fileId = '22222222-2222-4222-8222-222222222222';
  const snippetId = '33333333-3333-4333-8333-333333333333';
  const reviewId = '44444444-4444-4444-8444-444444444444';
  const commentId = '55555555-5555-4555-8555-555555555555';

  describe('Authorization Guards', () => {
    it('blocks unauthenticated callers from snippet creation', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not logged in' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createCodeSnippetAction({
        projectId,
        title: 'Snippet',
        filePath: 'src/test.ts',
        language: 'typescript',
        codeContent: 'const a = 1;',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('blocks non-members from snippet creation with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createCodeSnippetAction({
        projectId,
        title: 'Snippet',
        filePath: 'src/test.ts',
        language: 'typescript',
        codeContent: 'const a = 1;',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Project Files Actions', () => {
    it('uploads a file successfully to storage and inserts database record', async () => {
      const mockFile = new File(['hello world content'], 'test-file.txt', {
        type: 'text/plain',
      });
      const formData = new FormData();
      formData.set('file', mockFile);
      formData.set('projectId', projectId);
      formData.set('folderPath', '/docs');
      formData.set('description', 'Test notes');

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_files') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: fileId,
                      project_id: projectId,
                      uploader_id: mockUser.id,
                      file_name: 'test-file.txt',
                      folder_path: '/docs',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await uploadProjectFileAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.file_name).toBe('test-file.txt');
      }
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('workspace-files');
      expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
    });

    it('generates a signed download URL for project members', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_files') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: fileId,
                  storage_path: `${projectId}/file.pdf`,
                  file_name: 'file.pdf',
                },
              }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://storage.supabase.co/signed/file.pdf?token=abc' },
              error: null,
            }),
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await getProjectFileDownloadUrlAction({
        fileId,
        projectId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.downloadUrl).toContain('signed');
        expect(result.data.fileName).toBe('file.pdf');
      }
    });

    it('allows file uploader or admin to delete file and removes it from storage', async () => {
      const removeMock = vi.fn().mockResolvedValue({ error: null });
      const deleteDbMock = vi.fn().mockReturnThis();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_files') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: fileId,
                  uploader_id: mockUser.id,
                  storage_path: `${projectId}/old.txt`,
                  file_name: 'old.txt',
                },
              }),
              delete: deleteDbMock.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            remove: removeMock,
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteProjectFileAction({
        fileId,
        projectId,
      });

      expect(result.success).toBe(true);
      expect(removeMock).toHaveBeenCalledWith([`${projectId}/old.txt`]);
    });

    it('prevents non-uploader non-admin from deleting file', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'contributor' }, // regular contributor, not admin
              }),
            };
          }
          if (table === 'project_files') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: fileId,
                  uploader_id: mockOtherUser.id, // uploaded by other user
                  storage_path: `${projectId}/other.txt`,
                  file_name: 'other.txt',
                },
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteProjectFileAction({
        fileId,
        projectId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Code Snippets Actions', () => {
    it('creates a snippet and records activity', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_snippets') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: snippetId,
                      project_id: projectId,
                      author_id: mockUser.id,
                      title: 'API Client',
                      file_path: 'src/api.ts',
                      language: 'typescript',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createCodeSnippetAction({
        projectId,
        title: 'API Client',
        filePath: 'src/api.ts',
        language: 'typescript',
        codeContent: 'export const api = {};',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('API Client');
      }
    });

    it('allows author to update their snippet', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'contributor' },
              }),
            };
          }
          if (table === 'code_snippets') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: snippetId, author_id: mockUser.id },
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: snippetId, title: 'Updated API Client' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateCodeSnippetAction({
        snippetId,
        projectId,
        title: 'Updated API Client',
      });

      expect(result.success).toBe(true);
    });

    it('deletes snippet when requested by author or admin', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_snippets') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: snippetId, author_id: mockUser.id, title: 'Delete me' },
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteCodeSnippetAction(
        snippetId,
        projectId
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Code Review Lifecycle & Decisions', () => {
    it('creates a code review with changed files', async () => {
      const insertFilesMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: reviewId,
                      project_id: projectId,
                      author_id: mockUser.id,
                      title: 'Refactor Session Store',
                      status: 'review',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'code_review_files') {
            return {
              insert: insertFilesMock,
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createCodeReviewAction({
        projectId,
        title: 'Refactor Session Store',
        summary: 'Implements redis backend with fallback to memory.',
        targetBranch: 'feat/redis-session',
        status: 'review',
        files: [
          {
            filePath: 'src/lib/session.ts',
            changeType: 'modified',
            oldContent: 'export const session = null;',
            newContent: 'export const session = true;',
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Refactor Session Store');
      }
      expect(insertFilesMock).toHaveBeenCalled();
    });

    it('prevents non-admin review author from self-approving their own code review', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'contributor' }, // regular contributor
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: reviewId,
                  author_id: mockUser.id, // author is self!
                  status: 'review',
                  title: 'My PR',
                },
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitReviewDecisionAction({
        reviewId,
        projectId,
        decision: 'approved',
        notes: 'Self-approval attempt',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toContain('author cannot approve');
      }
    });

    it('allows project owner/maintainer to approve their own review or reviews by others', async () => {
      const insertDecisionMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id }, // mockUser is owner
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: reviewId,
                  author_id: mockOtherUser.id,
                  status: 'review',
                  title: 'Feature PR',
                },
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: reviewId, status: 'approved' },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'code_review_decisions') {
            return {
              insert: insertDecisionMock,
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await submitReviewDecisionAction({
        reviewId,
        projectId,
        decision: 'approved',
        notes: 'Code looks clean, verified tests.',
      });

      expect(result.success).toBe(true);
      expect(insertDecisionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'approved',
          reviewer_id: mockUser.id,
        })
      );
    });

    it('updates code review details and deletes reviews when authorized', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: reviewId, author_id: mockUser.id, title: 'PR 1' },
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: reviewId, title: 'Updated Title' },
                      error: null,
                    }),
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const updateRes = await updateCodeReviewAction({
        reviewId,
        projectId,
        title: 'Updated Title',
      });
      expect(updateRes.success).toBe(true);

      const deleteRes = await deleteCodeReviewAction(reviewId, projectId);
      expect(deleteRes.success).toBe(true);
    });
  });

  describe('Code Review Inline Comments', () => {
    it('posts an inline review comment on a specific line', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_review_comments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: commentId,
                      code_review_id: reviewId,
                      line_number: 45,
                      content: 'Potential null pointer here.',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await addCodeReviewCommentAction({
        reviewId,
        codeReviewFileId: '66666666-6666-4666-8666-666666666666',
        projectId,
        lineNumber: 45,
        diffSide: 'right',
        content: 'Potential null pointer here.',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.line_number).toBe(45);
      }
    });

    it('resolves and reopens a review comment', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_review_comments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: commentId, code_review_id: reviewId },
              }),
              update: updateMock,
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const resResolve = await resolveCodeReviewCommentAction(commentId, projectId, true);
      expect(resResolve.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ is_resolved: true });

      const resReopen = await resolveCodeReviewCommentAction(commentId, projectId, false);
      expect(resReopen.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ is_resolved: false });
    });

    it('deletes review comment when user is author or admin', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'code_review_comments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: commentId, author_id: mockUser.id, code_review_id: reviewId },
              }),
              delete: deleteMock,
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteCodeReviewCommentAction(commentId, projectId);
      expect(result.success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
    });
  });
});
