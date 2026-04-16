import type { NextRequest } from 'next/server';
import { KEYRING_REFERRAL_COOKIE, REFERRAL_CODE_HEX_REGEX } from './referral-constants';

/**
 * Reads optional referral code from JSON body or referral cookie (set via ?ref= on any page).
 */
export function getReferralCodeFromRequest(
  request: NextRequest,
  bodyReferral?: unknown
): string | undefined {
  const fromBody = typeof bodyReferral === 'string' ? bodyReferral.trim().toLowerCase() : '';
  if (fromBody && REFERRAL_CODE_HEX_REGEX.test(fromBody)) {
    return fromBody;
  }
  const cookie = request.cookies.get(KEYRING_REFERRAL_COOKIE)?.value?.trim().toLowerCase();
  if (cookie && REFERRAL_CODE_HEX_REGEX.test(cookie)) {
    return cookie;
  }
  return undefined;
}
