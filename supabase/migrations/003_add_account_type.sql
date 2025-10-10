-- Add account_type field to keyring_signers table
-- This migration adds support for different blockchain account types (Hedera, Ethereum)

-- Create enum for account types
CREATE TYPE account_type AS ENUM ('hedera', 'ethereum');

-- Add account_type column to keyring_signers table
ALTER TABLE keyring_signers 
ADD COLUMN account_type account_type DEFAULT 'hedera' NOT NULL;

-- Update the account_id column to be nullable for Ethereum accounts
-- (Ethereum accounts don't have Hedera account IDs)
ALTER TABLE keyring_signers 
ALTER COLUMN account_id DROP NOT NULL;

-- Add wallet_address column for Ethereum addresses
ALTER TABLE keyring_signers 
ADD COLUMN wallet_address TEXT;

-- Add constraint to ensure either account_id (Hedera) or wallet_address (Ethereum) is provided
ALTER TABLE keyring_signers 
ADD CONSTRAINT check_account_identifier 
CHECK (
  (account_type = 'hedera' AND account_id IS NOT NULL) OR 
  (account_type = 'ethereum' AND wallet_address IS NOT NULL)
);

-- Update public_key to be nullable for Ethereum accounts (we only need the address)
ALTER TABLE keyring_signers 
ALTER COLUMN public_key DROP NOT NULL;

-- Add constraint to ensure public_key is provided for Hedera accounts
ALTER TABLE keyring_signers 
ADD CONSTRAINT check_hedera_public_key 
CHECK (
  (account_type = 'hedera' AND public_key IS NOT NULL) OR 
  (account_type = 'ethereum')
);

-- Update profile_topic_id to be nullable (not applicable for Ethereum accounts initially)
ALTER TABLE keyring_signers 
ALTER COLUMN profile_topic_id DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX idx_keyring_signers_account_type ON keyring_signers(account_type);
CREATE INDEX idx_keyring_signers_wallet_address ON keyring_signers(wallet_address);

-- Add unique constraint for wallet_address (Ethereum addresses should be unique)
ALTER TABLE keyring_signers 
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);

-- Add comments for documentation
COMMENT ON COLUMN keyring_signers.account_type IS 'Type of blockchain account: hedera or ethereum';
COMMENT ON COLUMN keyring_signers.wallet_address IS 'Ethereum wallet address (0x...) for ethereum account types';
COMMENT ON CONSTRAINT check_account_identifier ON keyring_signers IS 'Ensures either account_id (Hedera) or wallet_address (Ethereum) is provided based on account_type';
COMMENT ON CONSTRAINT check_hedera_public_key ON keyring_signers IS 'Ensures public_key is provided for Hedera accounts';
