/**
 * Magic-link token utilities.
 *
 * The raw token is an opaque high-entropy string handed to the reviewer once
 * (in the invite URL). Only its SHA-256 hash is stored in `access_tokens`, so a
 * database leak never yields a usable link. Verification re-hashes the bearer
 * token and matches on the hash.
 */
import { createHash, randomBytes } from 'crypto';

/** Generate a new opaque magic-link token (URL-safe). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex hash, stored as `access_tokens.token_hash`. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Build the absolute reviewer-portal URL for a raw token. */
export function magicLinkUrl(appUrl: string, rawToken: string): string {
  return `${appUrl.replace(/\/$/, '')}/supplier/${rawToken}`;
}
