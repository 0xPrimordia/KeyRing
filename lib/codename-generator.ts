/**
 * KeyRing Signer Identifier Generator
 * Scalable, deterministic identifiers for anonymous signers
 */

import { createHash } from 'crypto';

export type DisplayContext = 'list' | 'profile' | 'transaction' | 'registry';

/**
 * Generate a deterministic KeyRing ID from public key
 * Infinitely scalable - no word list limitations
 */
export function generateKeyRingId(publicKey: string): string {
  const hash = createHash('sha256').update(publicKey).digest('hex');
  
  // Use first 8 characters for uniqueness while remaining readable
  return `KR-${hash.substring(0, 8).toUpperCase()}`;
}

/**
 * Generate display name based on context
 * Same ID, different presentation for better UX
 */
export function getDisplayName(publicKey: string, context: DisplayContext = 'registry'): string {
  const keyringId = generateKeyRingId(publicKey);
  
  switch (context) {
    case 'list':
      return `Signer ${keyringId}`;
    case 'profile':
      return `KeyRing Validator ${keyringId}`;
    case 'transaction':
      return `Approver ${keyringId}`;
    case 'registry':
    default:
      return keyringId;
  }
}

/**
 * Generate short hash for compact display
 */
export function getShortHash(publicKey: string): string {
  return publicKey.substring(0, 8) + '...' + publicKey.slice(-4);
}

/**
 * Generate avatar seed for consistent visual identity
 */
export function getAvatarSeed(publicKey: string): string {
  const hash = createHash('sha256').update(publicKey).digest('hex');
  return hash.substring(0, 16); // Use for DiceBear or similar
}

/**
 * Validate KeyRing ID format
 */
export function isValidKeyRingId(id: string): boolean {
  const pattern = /^KR-[A-F0-9]{8}$/;
  return pattern.test(id);
}
