-- Referral program: new reward_type enum labels only.
-- Must be in its own migration: PG forbids using new enum values in the same transaction as ADD VALUE (55P04).

ALTER TYPE reward_type ADD VALUE IF NOT EXISTS 'referral_referee';
ALTER TYPE reward_type ADD VALUE IF NOT EXISTS 'referral_referrer';
