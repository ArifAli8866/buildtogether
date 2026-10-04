import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyGitHubWebhook } from './webhook-verify';

describe('GitHub Webhook Signature Verification', () => {
  const secret = 'test-secret-12345';
  const originalSecret = process.env.GITHUB_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalSecret;
  });

  it('validates a genuine signature successfully', () => {
    const payload = JSON.stringify({ action: 'opened', pull_request: { number: 1 } });
    const signature =
      'sha256=' +
      createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

    const isValid = verifyGitHubWebhook(payload, signature);
    expect(isValid).toBe(true);
  });

  it('rejects an invalid signature with tampered body', () => {
    const payload = JSON.stringify({ action: 'opened' });
    const tamperedPayload = JSON.stringify({ action: 'closed' });
    const signature =
      'sha256=' +
      createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

    const isValid = verifyGitHubWebhook(tamperedPayload, signature);
    expect(isValid).toBe(false);
  });

  it('rejects missing or malformed signatures', () => {
    const payload = JSON.stringify({ action: 'opened' });

    expect(verifyGitHubWebhook(payload, null)).toBe(false);
    expect(verifyGitHubWebhook(payload, undefined)).toBe(false);
    expect(verifyGitHubWebhook(payload, '')).toBe(false);
    expect(verifyGitHubWebhook(payload, 'plain-hex-signature-without-prefix')).toBe(false);
  });

  it('rejects when secret is missing', () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    const payload = JSON.stringify({ action: 'opened' });
    const signature = 'sha256=abcdef';

    expect(verifyGitHubWebhook(payload, signature, undefined)).toBe(false);
  });
});
