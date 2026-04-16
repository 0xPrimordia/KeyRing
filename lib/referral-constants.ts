/** Cookie set by middleware when user lands with ?ref=<code> */
export const KEYRING_REFERRAL_COOKIE = 'keyring_ref';

/** Referral codes are lowercase hex derived from SHA-256 (see referral-code.ts). */
export const REFERRAL_CODE_HEX_REGEX = /^[a-f0-9]{12,32}$/;
