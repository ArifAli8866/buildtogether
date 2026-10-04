import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptSecret, decryptSecret } from './tokens';

describe('Token Encryption & Decryption (AES-256-GCM)', () => {
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = validKey;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('correctly encrypts and decrypts a plaintext token', () => {
    const rawToken = 'ghp_sampleUserAccessToken1234567890abcdef';
    const encrypted = encryptSecret(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('produces unique ciphertexts with different IVs for identical inputs', () => {
    const token = 'ghp_duplicateTokenTest';
    const enc1 = encryptSecret(token);
    const enc2 = encryptSecret(token);

    expect(enc1).not.toBe(enc2);
    expect(decryptSecret(enc1)).toBe(token);
    expect(decryptSecret(enc2)).toBe(token);
  });

  it('fails cleanly on tampered cipher payload', () => {
    const rawToken = 'ghp_secretToken';
    const encrypted = encryptSecret(rawToken);
    const parts = encrypted.split(':');

    // Tamper with the ciphertext
    const tamperedCiphertext = parts[2].slice(0, -2) + 'ff';
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it('fails cleanly on tampered auth tag', () => {
    const rawToken = 'ghp_secretToken';
    const encrypted = encryptSecret(rawToken);
    const parts = encrypted.split(':');

    // Tamper with the authTag
    const tamperedTag = '00' + parts[1].slice(2);
    const tamperedPayload = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  describe('Token handling failures', () => {
    it('throws when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encryptSecret('my_token')).toThrow(
        /Invalid ENCRYPTION_KEY: Must be a 32-byte hexadecimal string/
      );
    });

    it('throws when ENCRYPTION_KEY is invalid length', () => {
      process.env.ENCRYPTION_KEY = 'tooshort';
      expect(() => encryptSecret('my_token')).toThrow(
        /Invalid ENCRYPTION_KEY: Must be a 32-byte hexadecimal string/
      );
    });

    it('throws when encrypting empty text', () => {
      expect(() => encryptSecret('')).toThrow(/Cannot encrypt empty text/);
    });

    it('throws when decrypting empty payload or malformed format', () => {
      expect(() => decryptSecret('')).toThrow(/Cannot decrypt empty payload/);
      expect(() => decryptSecret('invalid:payload')).toThrow(
        /Invalid cipher payload format/
      );
      expect(() => decryptSecret('singlepart')).toThrow(
        /Invalid cipher payload format/
      );
    });
  });

  describe('Secret exposure regressions', () => {
    it('never contains the plaintext token within the cipher payload', () => {
      const sensitiveToken = 'ghp_superSensitiveSecretOAuthToken999';
      const encrypted = encryptSecret(sensitiveToken);

      expect(encrypted.includes(sensitiveToken)).toBe(false);
      expect(encrypted.toLowerCase().includes(sensitiveToken.toLowerCase())).toBe(false);
      expect(encrypted.includes(Buffer.from(sensitiveToken).toString('base64'))).toBe(false);
    });
  });
});
