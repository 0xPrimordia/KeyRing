-- Migration: Add owners and topic_message_id to projects
-- This migration adds two new fields to the existing keyring_projects table

-- Step 1: Add owners array field
ALTER TABLE keyring_projects 
ADD COLUMN owners TEXT[]; -- Array of owner names

-- Step 2: Add topic_message_id field  
ALTER TABLE keyring_projects 
ADD COLUMN topic_message_id TEXT; -- HCS-2 topic message transaction ID

-- Add comment for documentation
COMMENT ON COLUMN keyring_projects.owners IS 'Array of project owner names';
COMMENT ON COLUMN keyring_projects.topic_message_id IS 'Hedera HCS-2 topic message transaction ID linking to on-chain registration';

