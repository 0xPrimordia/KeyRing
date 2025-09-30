-- KeyRing Protocol Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'suspended', 'revoked');
CREATE TYPE verification_provider AS ENUM ('entrust', 'sumsub');
CREATE TYPE list_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'removed');
CREATE TYPE reward_type AS ENUM ('onboarding', 'list_addition', 'transaction_review');
CREATE TYPE reward_status AS ENUM ('pending', 'paid', 'failed');

-- KeyRing Signers Table
-- Stores verified signers with hashed public keys for privacy
CREATE TABLE keyring_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id TEXT UNIQUE NOT NULL, -- Hedera account ID (0.0.xxxxx)
    public_key TEXT UNIQUE NOT NULL, -- ED25519 public key in DER format
    profile_topic_id TEXT NOT NULL, -- HCS-11 profile topic ID
    code_name TEXT NOT NULL, -- Anonymous identifier (e.g., crimson-firefly-10)
    verification_status verification_status DEFAULT 'pending',
    verification_provider verification_provider DEFAULT 'entrust',
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KeyRing Threshold Lists Table
-- Stores certified threshold key lists for projects
CREATE TABLE keyring_threshold_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    list_topic_id TEXT NOT NULL, -- HCS-2 topic for list metadata
    threshold_account_id TEXT UNIQUE NOT NULL, -- Hedera account with threshold key
    required_signatures INTEGER NOT NULL,
    total_signers INTEGER NOT NULL,
    status list_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KeyRing List Memberships Table
-- Tracks which signers are part of which threshold lists
CREATE TABLE keyring_list_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signer_id UUID NOT NULL REFERENCES keyring_signers(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES keyring_threshold_lists(id) ON DELETE CASCADE,
    status membership_status DEFAULT 'active',
    added_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    UNIQUE(signer_id, list_id)
);

-- KeyRing Rewards Table
-- Tracks rewards for signers (onboarding, list additions, transaction reviews)
CREATE TABLE keyring_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signer_id UUID NOT NULL REFERENCES keyring_signers(id) ON DELETE CASCADE,
    reward_type reward_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'LYNX',
    transaction_id TEXT, -- Hedera transaction ID when paid
    status reward_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_keyring_signers_account_id ON keyring_signers(account_id);
CREATE INDEX idx_keyring_signers_public_key ON keyring_signers(public_key);
CREATE INDEX idx_keyring_signers_verification_status ON keyring_signers(verification_status);
CREATE INDEX idx_keyring_threshold_lists_account_id ON keyring_threshold_lists(threshold_account_id);
CREATE INDEX idx_keyring_list_memberships_signer_id ON keyring_list_memberships(signer_id);
CREATE INDEX idx_keyring_list_memberships_list_id ON keyring_list_memberships(list_id);
CREATE INDEX idx_keyring_rewards_signer_id ON keyring_rewards(signer_id);
CREATE INDEX idx_keyring_rewards_status ON keyring_rewards(status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_keyring_signers_updated_at 
    BEFORE UPDATE ON keyring_signers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keyring_threshold_lists_updated_at 
    BEFORE UPDATE ON keyring_threshold_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Disable for service role access
-- Since we're using service role key, we don't need RLS for MVP
-- But we'll set it up for future security

ALTER TABLE keyring_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyring_threshold_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyring_list_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyring_rewards ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (bypass RLS)
CREATE POLICY "Service role can manage signers" ON keyring_signers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage lists" ON keyring_threshold_lists
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage memberships" ON keyring_list_memberships
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rewards" ON keyring_rewards
    FOR ALL USING (auth.role() = 'service_role');

-- Public read access for verified signers (for registry lookups)
CREATE POLICY "Public can read verified signers" ON keyring_signers
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Public can read active lists" ON keyring_threshold_lists
    FOR SELECT USING (status = 'active');

CREATE POLICY "Public can read active memberships" ON keyring_list_memberships
    FOR SELECT USING (status = 'active');
