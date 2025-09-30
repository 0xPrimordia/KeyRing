-- Add whitelist table for managing approved accounts
-- This migration adds a table to store whitelisted accounts that can create KeyRing profiles

-- Create whitelist table
CREATE TABLE keyring_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id TEXT UNIQUE NOT NULL, -- Hedera account ID (0.0.xxxxx)
    added_by TEXT, -- Who added this account (for audit trail)
    reason TEXT, -- Reason for whitelisting (optional)
    is_active BOOLEAN DEFAULT true, -- Allow disabling without deletion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_keyring_whitelist_account_id ON keyring_whitelist(account_id);
CREATE INDEX idx_keyring_whitelist_is_active ON keyring_whitelist(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_keyring_whitelist_updated_at 
    BEFORE UPDATE ON keyring_whitelist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE keyring_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage whitelist" ON keyring_whitelist
    FOR ALL USING (auth.role() = 'service_role');

-- Public read access for active whitelist entries (for verification)
CREATE POLICY "Public can read active whitelist" ON keyring_whitelist
    FOR SELECT USING (is_active = true);
