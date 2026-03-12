-- Migration: Add admin threshold to projects table
-- Stores which threshold list is the current admin of the project's contract (e.g. proxyTreasury).
-- Used when Mirror Node returns ECDSA admin keys that cannot be resolved to a Hedera account.

ALTER TABLE keyring_projects
  ADD COLUMN admin_threshold_account_id TEXT;

COMMENT ON COLUMN keyring_projects.admin_threshold_account_id IS 
  'Hedera account ID (0.0.xxxxx) of the threshold list that is the current admin of the project contract. Null if unknown or not yet set.';

CREATE INDEX idx_keyring_projects_admin_threshold 
  ON keyring_projects(admin_threshold_account_id) 
  WHERE admin_threshold_account_id IS NOT NULL;
