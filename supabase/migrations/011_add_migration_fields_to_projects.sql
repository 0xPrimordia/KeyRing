-- Migration: Add migration tracking fields to projects table
-- Used when a setAdmin schedule is pending: migration_threshold = new threshold account ID,
-- migration_schedule = schedule ID. When schedule executes successfully, admin_threshold_account_id
-- is updated and these fields are cleared.

ALTER TABLE keyring_projects
  ADD COLUMN migration_threshold_account_id TEXT,
  ADD COLUMN migration_schedule_id TEXT;

COMMENT ON COLUMN keyring_projects.migration_threshold_account_id IS 
  'Hedera account ID (0.0.xxxxx) of the threshold list we are migrating TO. Null when no migration pending.';

COMMENT ON COLUMN keyring_projects.migration_schedule_id IS 
  'Hedera schedule ID for the pending setAdmin call. Null when no migration pending.';

CREATE INDEX idx_keyring_projects_migration_schedule 
  ON keyring_projects(migration_schedule_id) 
  WHERE migration_schedule_id IS NOT NULL;
