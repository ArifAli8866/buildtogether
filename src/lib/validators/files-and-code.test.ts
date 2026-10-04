import { describe, it, expect } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  uploadFileSchema,
  deleteFileSchema,
  getDownloadUrlSchema,
  createSnippetSchema,
  updateSnippetSchema,
  deleteSnippetSchema,
  codeReviewFileChangeSchema,
  createCodeReviewSchema,
  updateCodeReviewSchema,
  deleteCodeReviewSchema,
  submitReviewDecisionSchema,
  addCodeReviewCommentSchema,
  deleteCodeReviewCommentSchema,
  resolveCodeReviewCommentSchema,
} from './files-and-code';

describe('Files & Code Validators', () => {
  const validUUID = '11111111-1111-4111-8111-111111111111';
  const validUUID2 = '22222222-2222-4222-8222-222222222222';

  describe('File Management Schemas', () => {
    it('validates a valid file upload with defaults', () => {
      const res = uploadFileSchema.safeParse({
        projectId: validUUID,
        fileName: 'architecture_diagram.png',
        fileSizeBytes: 1024 * 50,
        mimeType: 'image/png',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.folderPath).toBe('/');
        expect(res.data.fileName).toBe('architecture_diagram.png');
        expect(res.data.fileSizeBytes).toBe(51200);
      }
    });

    it('validates custom folder path and description', () => {
      const res = uploadFileSchema.safeParse({
        projectId: validUUID,
        folderPath: '/docs/specifications',
        description: 'System design document v1',
        fileName: 'design.pdf',
        fileSizeBytes: 1024 * 1024 * 2, // 2MB
        mimeType: 'application/pdf',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.folderPath).toBe('/docs/specifications');
        expect(res.data.description).toBe('System design document v1');
      }
    });

    it('rejects folder path that does not start with / or contains invalid characters', () => {
      const res1 = uploadFileSchema.safeParse({
        projectId: validUUID,
        folderPath: 'docs/specs', // missing leading slash
        fileName: 'test.txt',
        fileSizeBytes: 100,
        mimeType: 'text/plain',
      });
      expect(res1.success).toBe(false);

      const res2 = uploadFileSchema.safeParse({
        projectId: validUUID,
        folderPath: '/docs/invalid space',
        fileName: 'test.txt',
        fileSizeBytes: 100,
        mimeType: 'text/plain',
      });
      expect(res2.success).toBe(false);
    });

    it('rejects file size exceeding MAX_FILE_SIZE_BYTES or <= 0', () => {
      const overLimit = uploadFileSchema.safeParse({
        projectId: validUUID,
        fileName: 'large.zip',
        fileSizeBytes: MAX_FILE_SIZE_BYTES + 1,
        mimeType: 'application/zip',
      });
      expect(overLimit.success).toBe(false);

      const zeroSize = uploadFileSchema.safeParse({
        projectId: validUUID,
        fileName: 'empty.txt',
        fileSizeBytes: 0,
        mimeType: 'text/plain',
      });
      expect(zeroSize.success).toBe(false);

      const negativeSize = uploadFileSchema.safeParse({
        projectId: validUUID,
        fileName: 'negative.txt',
        fileSizeBytes: -10,
        mimeType: 'text/plain',
      });
      expect(negativeSize.success).toBe(false);
    });

    it('rejects invalid or unsafe file names', () => {
      const unsafeNames = ['../hack.txt', 'file/with/slash.png', 'file*star.txt', ''];
      for (const name of unsafeNames) {
        const res = uploadFileSchema.safeParse({
          projectId: validUUID,
          fileName: name,
          fileSizeBytes: 100,
          mimeType: 'text/plain',
        });
        expect(res.success).toBe(false);
      }
    });

    it('allows permitted MIME types including text/* types', () => {
      const allowedTypes = [
        ...ALLOWED_MIME_TYPES,
        'text/x-python',
        'text/x-rust',
      ];

      for (const mime of allowedTypes) {
        const res = uploadFileSchema.safeParse({
          projectId: validUUID,
          fileName: 'code.txt',
          fileSizeBytes: 100,
          mimeType: mime,
        });
        expect(res.success).toBe(true);
      }
    });

    it('rejects unpermitted executable/dangerous MIME types', () => {
      const blockedTypes = ['application/x-msdownload', 'application/x-sh', 'application/x-dosexec'];
      for (const mime of blockedTypes) {
        const res = uploadFileSchema.safeParse({
          projectId: validUUID,
          fileName: 'run.exe',
          fileSizeBytes: 100,
          mimeType: mime,
        });
        expect(res.success).toBe(false);
      }
    });

    it('validates deleteFileSchema and getDownloadUrlSchema UUID requirements', () => {
      expect(deleteFileSchema.safeParse({ fileId: validUUID, projectId: validUUID2 }).success).toBe(true);
      expect(deleteFileSchema.safeParse({ fileId: 'not-uuid', projectId: validUUID2 }).success).toBe(false);
      expect(getDownloadUrlSchema.safeParse({ fileId: validUUID, projectId: validUUID2 }).success).toBe(true);
      expect(getDownloadUrlSchema.safeParse({ fileId: validUUID, projectId: 'invalid' }).success).toBe(false);
    });
  });

  describe('Code Snippet Schemas', () => {
    it('validates snippet creation with defaults', () => {
      const res = createSnippetSchema.safeParse({
        projectId: validUUID,
        title: 'Auth Context Hook',
        filePath: 'src/hooks/use-auth.ts',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.language).toBe('typescript');
        expect(res.data.codeContent).toBe('');
      }
    });

    it('validates snippet with explicit language and code content', () => {
      const res = createSnippetSchema.safeParse({
        projectId: validUUID,
        title: 'Python Migration Script',
        filePath: 'scripts/migrate.py',
        language: 'python',
        codeContent: 'import os\nprint("migrating...")',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.language).toBe('python');
        expect(res.data.codeContent).toContain('import os');
      }
    });

    it('fails when title is too short or file path contains invalid characters', () => {
      const shortTitle = createSnippetSchema.safeParse({
        projectId: validUUID,
        title: 'a',
        filePath: 'test.ts',
      });
      expect(shortTitle.success).toBe(false);

      const invalidPath = createSnippetSchema.safeParse({
        projectId: validUUID,
        title: 'Valid Title',
        filePath: 'test file!?.ts',
      });
      expect(invalidPath.success).toBe(false);
    });

    it('validates updateSnippetSchema and deleteSnippetSchema', () => {
      const updateRes = updateSnippetSchema.safeParse({
        snippetId: validUUID,
        projectId: validUUID2,
        title: 'Updated Title',
        language: 'rust',
      });
      expect(updateRes.success).toBe(true);

      const deleteRes = deleteSnippetSchema.safeParse({
        snippetId: validUUID,
        projectId: validUUID2,
      });
      expect(deleteRes.success).toBe(true);
    });
  });

  describe('Code Review Schemas', () => {
    it('validates file changes in a code review', () => {
      const res = codeReviewFileChangeSchema.safeParse({
        filePath: 'src/lib/auth.ts',
        changeType: 'modified',
        oldContent: 'const a = 1;',
        newContent: 'const a = 2;\nconst b = 3;',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.changeType).toBe('modified');
      }
    });

    it('validates createCodeReviewSchema with multi-file changes', () => {
      const res = createCodeReviewSchema.safeParse({
        projectId: validUUID,
        title: 'Add JWT verification middleware',
        summary: 'Implements edge-compatible JWT validation with automated token refresh.',
        targetBranch: 'feat/auth-middleware',
        files: [
          {
            filePath: 'src/middleware.ts',
            changeType: 'added',
            oldContent: null,
            newContent: 'export function middleware() {}',
          },
          {
            filePath: 'src/config.ts',
            changeType: 'modified',
            oldContent: 'export const auth = false;',
            newContent: 'export const auth = true;',
          },
        ],
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.baseBranch).toBe('main');
        expect(res.data.status).toBe('draft');
        expect(res.data.files).toHaveLength(2);
      }
    });

    it('rejects code review with empty files list', () => {
      const res = createCodeReviewSchema.safeParse({
        projectId: validUUID,
        title: 'Empty Change',
        summary: 'This should fail because no files were changed.',
        targetBranch: 'feat/empty',
        files: [],
      });

      expect(res.success).toBe(false);
    });

    it('validates updateCodeReviewSchema', () => {
      const res = updateCodeReviewSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        title: 'Updated PR Title',
        status: 'review',
      });
      expect(res.success).toBe(true);
    });

    it('validates submitReviewDecisionSchema enum states', () => {
      const approved = submitReviewDecisionSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        decision: 'approved',
        notes: 'LGTM!',
      });
      expect(approved.success).toBe(true);

      const changesReq = submitReviewDecisionSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        decision: 'changes_requested',
        notes: 'Please add unit tests.',
      });
      expect(changesReq.success).toBe(true);

      const invalid = submitReviewDecisionSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        decision: 'invalid_status' as unknown as 'approved',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates addCodeReviewCommentSchema with optional line numbers and replies', () => {
      const rootComment = addCodeReviewCommentSchema.safeParse({
        reviewId: validUUID,
        codeReviewFileId: validUUID2,
        projectId: validUUID,
        lineNumber: 42,
        diffSide: 'right',
        content: 'Consider extracting this into a helper function.',
      });
      expect(rootComment.success).toBe(true);

      const replyComment = addCodeReviewCommentSchema.safeParse({
        reviewId: validUUID,
        codeReviewFileId: validUUID2,
        projectId: validUUID,
        lineNumber: 42,
        diffSide: 'right',
        content: 'Good catch, refactored in next commit.',
        parentCommentId: validUUID,
      });
      expect(replyComment.success).toBe(true);

      const emptyComment = addCodeReviewCommentSchema.safeParse({
        reviewId: validUUID,
        codeReviewFileId: validUUID2,
        projectId: validUUID,
        content: '',
      });
      expect(emptyComment.success).toBe(false);
    });

    it('validates resolveCodeReviewCommentSchema and deleteCodeReviewCommentSchema', () => {
      expect(
        resolveCodeReviewCommentSchema.safeParse({
          commentId: validUUID,
          projectId: validUUID2,
          isResolved: true,
        }).success
      ).toBe(true);

      expect(
        deleteCodeReviewCommentSchema.safeParse({
          commentId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);

      expect(
        deleteCodeReviewSchema.safeParse({
          reviewId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });
});
