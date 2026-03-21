-- Schedule History Table
-- Tracks all schedules that signers have interacted with (signed/pending/executed)

CREATE TYPE schedule_status AS ENUM ('pending', 'executed', 'expired', 'deleted');

CREATE TABLE keyring_schedule_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL DEFAULT 'Lynx',
    memo TEXT,
    payer_account_id TEXT,
    creator_account_id TEXT,
    threshold_account_id TEXT,
    status schedule_status DEFAULT 'pending',
    expiration_time TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    signature_count INTEGER DEFAULT 0,
    threshold_required INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_history_schedule_id ON keyring_schedule_history(schedule_id);
CREATE INDEX idx_schedule_history_status ON keyring_schedule_history(status);
CREATE INDEX idx_schedule_history_project_name ON keyring_schedule_history(project_name);

-- Updated_at trigger
CREATE TRIGGER update_keyring_schedule_history_updated_at
    BEFORE UPDATE ON keyring_schedule_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE keyring_schedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage schedule history" ON keyring_schedule_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read schedule history" ON keyring_schedule_history
    FOR SELECT USING (true);
