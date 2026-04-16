-- Referral columns, backfill, indexes (runs after 014 commits enum values)

ALTER TABLE keyring_signers
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_signer_id UUID REFERENCES keyring_signers(id) ON DELETE SET NULL;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Backfill referral_code (must match lib/referral-code.ts: SHA-256 of 'keyring-ref:' || id, first 16 hex chars)
UPDATE keyring_signers s
SET referral_code = lower(substring(encode(digest('keyring-ref:' || s.id::text, 'sha256'), 'hex'), 1, 16))
WHERE s.referral_code IS NULL;

ALTER TABLE keyring_signers ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_keyring_signers_referral_code
  ON keyring_signers (referral_code);

CREATE INDEX IF NOT EXISTS idx_keyring_signers_referred_by
  ON keyring_signers (referred_by_signer_id);

-- At most one referral bonus (referee) per signer
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_referral_referee_reward
  ON keyring_rewards (signer_id)
  WHERE reward_type = 'referral_referee';

COMMENT ON COLUMN keyring_signers.referral_code IS 'Stable shareable code; SHA-256 prefix of keyring-ref:<signer uuid>';
COMMENT ON COLUMN keyring_signers.referred_by_signer_id IS 'Referrer signer id when this account registered via a valid referral link';
