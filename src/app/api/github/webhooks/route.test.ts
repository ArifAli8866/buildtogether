/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';

describe('GitHub Webhooks Route Handler (POST /api/github/webhooks)', () => {
  const webhookSecret = 'test_webhook_secret_key_12345';
  const projectId = '22222222-2222-4222-8222-222222222222';
  const repoId = 12345678;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = webhookSecret;
  });

  function createSignedRequest(
    payload: Record<string, unknown>,
    headers: { event?: string; deliveryId?: string; signature?: string | null } = {}
  ): NextRequest {
    const rawBody = JSON.stringify(payload);
    const signature =
      headers.signature !== undefined
        ? headers.signature
        : 'sha256=' +
          createHmac('sha256', webhookSecret)
            .update(rawBody, 'utf8')
            .digest('hex');

    const reqHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-github-event': headers.event || 'push',
    };

    if (headers.deliveryId !== undefined) {
      if (headers.deliveryId !== '') {
        reqHeaders['x-github-delivery'] = headers.deliveryId;
      }
    } else {
      reqHeaders['x-github-delivery'] = 'delivery-uuid-001';
    }

    if (signature) {
      reqHeaders['x-hub-signature-256'] = signature;
    }

    return new NextRequest('http://localhost:3000/api/github/webhooks', {
      method: 'POST',
      headers: reqHeaders,
      body: rawBody,
    });
  }

  it('rejects requests with missing or invalid signature with 401', async () => {
    const req = createSignedRequest({ test: true }, { signature: 'sha256=invalidsig' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid webhook signature');
  });

  it('rejects requests missing X-GitHub-Delivery header with 400', async () => {
    const req = createSignedRequest({ test: true }, { deliveryId: '' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing X-GitHub-Delivery');
  });

  it('handles idempotency by acknowledging duplicate delivery without re-processing', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'github_webhook_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing-event-id' }, // Already exists!
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const req = createSignedRequest(
      { action: 'opened' },
      { deliveryId: 'already-delivered-123', event: 'pull_request' }
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
  });

  it('processes PR merged event: updates code_review to merged and logs activity', async () => {
    const updateReviewMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertActivityMock = vi.fn().mockResolvedValue({ error: null });
    const insertEventMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'github_webhook_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }), // New delivery
              }),
            }),
            insert: insertEventMock,
          };
        }
        if (table === 'project_github_repos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'repo-rec-id', project_id: projectId },
                }),
              }),
            }),
          };
        }
        if (table === 'code_reviews') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'review-123', title: 'Feature Review' },
                  }),
                }),
              }),
            }),
            update: updateReviewMock,
          };
        }
        if (table === 'activity_logs') {
          return { insert: insertActivityMock };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const req = createSignedRequest(
      {
        action: 'closed',
        repository: { id: repoId, full_name: 'org/repo' },
        pull_request: {
          number: 42,
          html_url: 'https://github.com/org/repo/pull/42',
          merged: true,
          state: 'closed',
        },
      },
      { deliveryId: 'new-delivery-999', event: 'pull_request' }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(true);

    expect(updateReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'merged',
        github_pr_status: 'merged',
      })
    );

    expect(insertActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'change_marked_merged',
        project_id: projectId,
      })
    );

    expect(insertEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery_id: 'new-delivery-999',
        status: 'processed',
      })
    );
  });

  it('processes push event: updates repository last_synced_at timestamp', async () => {
    const updateRepoMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'github_webhook_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'project_github_repos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'repo-rec-id', project_id: projectId },
                }),
              }),
            }),
            update: updateRepoMock,
          };
        }
        return {};
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any);

    const req = createSignedRequest(
      {
        repository: { id: repoId, full_name: 'org/repo' },
        ref: 'refs/heads/main',
      },
      { deliveryId: 'push-delivery-001', event: 'push' }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(updateRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sync_status: 'synced',
      })
    );
  });
});
