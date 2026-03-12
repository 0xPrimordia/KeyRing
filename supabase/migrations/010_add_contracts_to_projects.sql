-- Migration: Add contracts array to projects table
-- Stores contract IDs (0.0.xxxxx) for the project. Primary/display contract is typically first.
-- Used instead of topic metadata so contracts can be updated independently when they change.

ALTER TABLE keyring_projects
  ADD COLUMN contracts TEXT[] DEFAULT '{}';

COMMENT ON COLUMN keyring_projects.contracts IS 
  'Array of Hedera contract IDs (0.0.xxxxx) for this project. Primary contract (e.g. proxyTreasury) typically first.';
