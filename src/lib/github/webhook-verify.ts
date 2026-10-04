import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a GitHub webhook request signature using HMAC SHA-256 and constant-time comparison.
 * 
 * @param rawBody - The unparsed raw request body string.
 * @param signatureHeader - Value of the X-Hub-Signature-256 header (format: sha256=<hex>).
 * @param secret - The webhook secret, defaults to process.env.GITHUB_WEBHOOK_SECRET.
 * @returns boolean indicating whether the signature is valid.
 */
export function verifyGitHubWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined = process.env.GITHUB_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not configured.');
    return false;
  }

  try {
    const expectedSignature =
      'sha256=' +
      createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex');

    const sourceBuffer = Buffer.from(signatureHeader);
    const targetBuffer = Buffer.from(expectedSignature);

    if (sourceBuffer.length !== targetBuffer.length) {
      return false;
    }

    return timingSafeEqual(sourceBuffer, targetBuffer);
  } catch (error) {
    console.error('Failed to verify GitHub webhook signature:', error);
    return false;
  }
}
