-- Prevent duplicate transaction_review rewards for the same signer + schedule.
-- Only one reward per currency per signer per schedule is allowed.
CREATE UNIQUE INDEX idx_unique_reward_per_signer_schedule
  ON keyring_rewards (signer_id, schedule_id, reward_type, currency)
  WHERE schedule_id IS NOT NULL;
