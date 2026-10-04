import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGitHubWebhook } from '@/lib/github/webhook-verify';

interface GitHubWebhookPayload {
  action?: string;
  repository?: { id?: number; full_name?: string };
  sender?: { login?: string };
  pull_request?: {
    number: number;
    html_url: string;
    merged?: boolean;
    state?: string;
  };
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  // 1. Read raw body and signature header
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const deliveryId = request.headers.get('x-github-delivery');
  const eventType = request.headers.get('x-github-event') || 'unknown';

  // 2. Cryptographic signature check
  const isValid = verifyGitHubWebhook(rawBody, signature);
  if (!isValid) {
    console.warn('Rejected GitHub webhook with invalid HMAC signature.');
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  if (!deliveryId) {
    return NextResponse.json({ error: 'Missing X-GitHub-Delivery header' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  // 3. Idempotency Check: reject duplicate delivery
  const { data: existingEvent } = await supabase
    .from('github_webhook_events')
    .select('id')
    .eq('delivery_id', deliveryId)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  // 4. Parse payload
  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as GitHubWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const repoId = payload.repository?.id ? Number(payload.repository.id) : null;
  let projectId: string | null = null;

  // 5. Correlate with connected project repository
  if (repoId) {
    const { data: repoRecord } = await supabase
      .from('project_github_repos')
      .select('id, project_id')
      .eq('repo_id', repoId)
      .maybeSingle();

    if (repoRecord) {
      projectId = repoRecord.project_id;
    }
  }

  // 6. Process domain events
  try {
    if (eventType === 'pull_request' && projectId && payload.pull_request) {
      const action = payload.action;
      const pr = payload.pull_request;

      if (action === 'closed' && pr.merged) {
        // PR merged on GitHub -> update corresponding Build Together code review
        const { data: matchedReview } = await supabase
          .from('code_reviews')
          .select('id, title')
          .eq('project_id', projectId)
          .or(`github_pr_url.eq.${pr.html_url},github_pr_number.eq.${pr.number}`)
          .maybeSingle();

        if (matchedReview) {
          await supabase
            .from('code_reviews')
            .update({
              status: 'merged',
              github_pr_status: 'merged',
            })
            .eq('id', matchedReview.id);

          await supabase.from('activity_logs').insert({
            project_id: projectId,
            actor_id: null,
            action: 'change_marked_merged',
            entity_type: 'code_review',
            entity_id: matchedReview.id,
            metadata: {
              source: 'github_webhook',
              prNumber: pr.number,
              prUrl: pr.html_url,
              title: matchedReview.title,
            },
          });
        }
      } else if (action === 'closed' && !pr.merged) {
        await supabase
          .from('code_reviews')
          .update({ github_pr_status: 'closed' })
          .eq('project_id', projectId)
          .or(`github_pr_url.eq.${pr.html_url},github_pr_number.eq.${pr.number}`);
      } else if (action === 'reopened') {
        await supabase
          .from('code_reviews')
          .update({ github_pr_status: 'open' })
          .eq('project_id', projectId)
          .or(`github_pr_url.eq.${pr.html_url},github_pr_number.eq.${pr.number}`);
      }
    } else if (eventType === 'pull_request_review' && projectId && payload.pull_request) {
      const pr = payload.pull_request;
      const reviewData = payload.review as { state?: string } | undefined;
      await supabase.from('activity_logs').insert({
        project_id: projectId,
        actor_id: null,
        action: 'github_pr_reviewed',
        entity_type: 'github_pr',
        entity_id: String(pr.number),
        metadata: {
          prNumber: pr.number,
          prUrl: pr.html_url,
          reviewer: payload.sender?.login || 'unknown',
          state: reviewData?.state || 'submitted',
        },
      });
    } else if (eventType === 'push' && projectId) {
      // Update last synced timestamp
      await supabase
        .from('project_github_repos')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        })
        .eq('project_id', projectId);
    }

    // 7. Store delivery record for idempotency and audit
    await supabase.from('github_webhook_events').insert({
      delivery_id: deliveryId,
      event_type: eventType,
      repo_id: repoId,
      project_id: projectId,
      payload: {
        action: payload.action || null,
        sender: payload.sender?.login || null,
        repository: payload.repository?.full_name || null,
      },
      status: 'processed',
    });

    return NextResponse.json({ ok: true, processed: true }, { status: 200 });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    // Record failed delivery for idempotency
    await supabase.from('github_webhook_events').insert({
      delivery_id: deliveryId,
      event_type: eventType,
      repo_id: repoId,
      project_id: projectId,
      payload: { rawBodySnippet: rawBody.slice(0, 500) },
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
