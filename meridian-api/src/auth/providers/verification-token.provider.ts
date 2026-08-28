import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

/**
 * Verification-token helpers (issue #435).
 *
 * The provider returns a fresh raw token and its bcrypt hash so we can:
 *  1. store ONLY the hash on the user row;
 *  2. email the raw token to the user (it never touches the DB);
 *  3. on verify, bcrypt-compare the user-supplied raw token with the stored
 *     hash to confirm ownership without revealing the hash.
 */
@Injectable()
export abstract class VerificationTokenProvider {
  /** Generate a fresh random token (URL-safe hex). */
  abstract generate(): string;

  /** Hash a raw token so we can persist it safely. */
  abstract hash(raw: string): Promise<string>;

  /** bcrypt-compare a raw token against a previously stored hash. */
  abstract compare(raw: string, hashed: string): Promise<boolean>;
}

@Injectable()
export class BcryptVerificationTokenProvider extends VerificationTokenProvider {
  private static readonly BCRYPT_ROUNDS = 12;

  public generate(): string {
    return randomBytes(32).toString('hex');
  }

  public hash(raw: string): Promise<string> {
    return bcrypt.hash(raw, BcryptVerificationTokenProvider.BCRYPT_ROUNDS);
  }

  public compare(raw: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(raw, hashed);
  }
}
