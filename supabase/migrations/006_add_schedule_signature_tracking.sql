-- Migration 006: Add Schedule Signature Tracking
-- Enhances rewards table to track schedule signatures with transaction IDs

-- Add columns for schedule signature tracking
ALTER TABLE keyring_rewards
ADD COLUMN schedule_id TEXT,
ADD COLUMN signature_transaction_id TEXT;

-- Update comments to clarify field usage
COMMENT ON COLUMN keyring_rewards.transaction_id IS 'Hedera transaction ID when KYRNG reward is paid out';
COMMENT ON COLUMN keyring_rewards.schedule_id IS 'Schedule ID that was signed (for transaction_review rewards)';
COMMENT ON COLUMN keyring_rewards.signature_transaction_id IS 'Transaction ID of the SCHEDULESIGN transaction';

-- Add index for schedule lookups
CREATE INDEX idx_keyring_rewards_schedule_id ON keyring_rewards(schedule_id);
CREATE INDEX idx_keyring_rewards_signature_tx_id ON keyring_rewards(signature_transaction_id);

-- Add constraint to ensure schedule_id is provided for transaction_review rewards
ALTER TABLE keyring_rewards
ADD CONSTRAINT check_transaction_review_has_schedule 
CHECK (
  reward_type != 'transaction_review' OR 
  (reward_type = 'transaction_review' AND schedule_id IS NOT NULL)
);

