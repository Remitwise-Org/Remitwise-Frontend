/**
 * Domain errors for the envelope-encryption module (issue #631).
 *
 * `CryptoError` is the base for all failures raised by CryptoProvider and
 * KeyRotationService so callers can catch a single type when handling
 * encryption/decryption problems.
 */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Raised when encrypted data cannot be decrypted because no Key Encryption
 * Key (KEK) is configured. Services can catch this and degrade gracefully
 * instead of crashing the request with an untyped error.
 */
export class EncryptionKeyUnavailableError extends CryptoError {
  constructor(message = 'Encryption key (KEK) is unavailable') {
    super(message);
    this.name = 'EncryptionKeyUnavailableError';
  }
}

/**
 * Raised when a ciphertext fails authentication (tampered data, wrong key,
 * or corrupted storage).
 */
export class DecryptionFailedError extends CryptoError {
  constructor(message = 'Decryption failed: authentication failed or data is corrupted') {
    super(message);
    this.name = 'DecryptionFailedError';
  }
}
