-- Add Sumsub fields to keyring_signers table
-- This migration adds fields to store Sumsub verification data

-- Add Sumsub-specific columns to keyring_signers table
ALTER TABLE keyring_signers 
ADD COLUMN sumsub_applicant_id TEXT,
ADD COLUMN sumsub_review_result TEXT CHECK (sumsub_review_result IN ('GREEN', 'RED', 'YELLOW'));

-- Add indexes for performance
CREATE INDEX idx_keyring_signers_sumsub_applicant_id ON keyring_signers(sumsub_applicant_id);
CREATE INDEX idx_keyring_signers_sumsub_review_result ON keyring_signers(sumsub_review_result);

-- Add comments for documentation
COMMENT ON COLUMN keyring_signers.sumsub_applicant_id IS 'Sumsub applicant ID for users verified through Sumsub';
COMMENT ON COLUMN keyring_signers.sumsub_review_result IS 'Sumsub review result: GREEN (approved), RED (rejected), YELLOW (needs review)';
