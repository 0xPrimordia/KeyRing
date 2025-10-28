-- Migration: Simplify threshold lists table for demo/production use
-- Remove unnecessary columns and make project_id optional
-- All threshold list data is on-chain, we only need to track the association

-- Make project_id nullable (for demo threshold lists that don't belong to a project)
ALTER TABLE keyring_threshold_lists 
  ALTER COLUMN project_id DROP NOT NULL;

-- Remove required_signatures and total_signers columns (this data is on-chain)
ALTER TABLE keyring_threshold_lists 
  DROP COLUMN IF EXISTS required_signatures,
  DROP COLUMN IF EXISTS total_signers;

-- Rename list_topic_id to hcs_topic_id for clarity
ALTER TABLE keyring_threshold_lists 
  RENAME COLUMN list_topic_id TO hcs_topic_id;

-- Add index on hcs_topic_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_keyring_threshold_lists_hcs_topic 
  ON keyring_threshold_lists(hcs_topic_id);

-- Add comment to table
COMMENT ON TABLE keyring_threshold_lists IS 
  'Tracks threshold list accounts and their associated HCS-2 topics. All key structure and signature requirements are stored on-chain.';

COMMENT ON COLUMN keyring_threshold_lists.project_id IS 
  'Optional reference to project. Null for demo/standalone threshold lists.';

COMMENT ON COLUMN keyring_threshold_lists.hcs_topic_id IS 
  'HCS-2 topic ID for threshold list communication (rejections, activity).';

COMMENT ON COLUMN keyring_threshold_lists.threshold_account_id IS 
  'Hedera account ID with threshold KeyList (e.g., 2-of-3 multisig).';

