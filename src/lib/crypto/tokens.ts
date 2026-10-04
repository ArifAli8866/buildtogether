import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Returns the 32-byte encryption key buffer from environment.
 * Throws a descriptive error if the key is missing or invalid.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      'Invalid ENCRYPTION_KEY: Must be a 32-byte hexadecimal string (64 characters).'
    );
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts sensitive plaintext strings (e.g. user GitHub OAuth tokens) using AES-256-GCM.
 * Payload format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) {
    throw new Error('Cannot encrypt empty text');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted AES-256-GCM cipher payload.
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload) {
    throw new Error('Cannot decrypt empty payload');
  }

  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher payload format: Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
