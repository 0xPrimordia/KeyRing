import { createHash } from 'crypto';

const REFERRAL_INPUT_PREFIX = 'keyring-ref:';

/**
 * Deterministic referral code from the signer's internal UUID.
 * Matches PostgreSQL backfill in migration 014 (pgcrypto digest + hex).
 */
export function deriveReferralCodeFromSignerId(signerId: string): string {
  return createHash('sha256')
    .update(`${REFERRAL_INPUT_PREFIX}${signerId}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
}
