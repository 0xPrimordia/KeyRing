-- Migration: Add is_testnet column to keyring_signers
-- Allows distinguishing testnet vs mainnet signer registrations

ALTER TABLE keyring_signers
  ADD COLUMN is_testnet BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_keyring_signers_is_testnet ON keyring_signers(is_testnet);

COMMENT ON COLUMN keyring_signers.is_testnet IS
  'Whether the signer was registered on Hedera testnet (true) or mainnet (false).';
