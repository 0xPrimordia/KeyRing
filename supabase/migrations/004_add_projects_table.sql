-- Migration: Add Projects Table
-- This migration creates a projects table and refactors threshold lists to reference projects

-- Step 1: Create the projects table
CREATE TABLE keyring_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    legal_entity_name TEXT NOT NULL,
    public_record_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add project_id column to threshold lists (nullable for now)
ALTER TABLE keyring_threshold_lists 
ADD COLUMN project_id UUID REFERENCES keyring_projects(id) ON DELETE CASCADE;

-- Step 3: Migrate existing project_name data to projects table
-- Create a project for each unique project_name
INSERT INTO keyring_projects (company_name, legal_entity_name)
SELECT DISTINCT 
    project_name,
    project_name  -- Initially use same value for both fields
FROM keyring_threshold_lists
WHERE project_name IS NOT NULL;

-- Step 4: Update threshold lists to link to their projects
UPDATE keyring_threshold_lists tl
SET project_id = p.id
FROM keyring_projects p
WHERE tl.project_name = p.company_name;

-- Step 5: Make project_id NOT NULL now that data is migrated
ALTER TABLE keyring_threshold_lists 
ALTER COLUMN project_id SET NOT NULL;

-- Step 6: Drop the old project_name column
ALTER TABLE keyring_threshold_lists 
DROP COLUMN project_name;

-- Step 7: Add indexes for performance
CREATE INDEX idx_keyring_projects_company_name ON keyring_projects(company_name);
CREATE INDEX idx_keyring_threshold_lists_project_id ON keyring_threshold_lists(project_id);

-- Step 8: Add updated_at trigger for projects
CREATE TRIGGER update_keyring_projects_updated_at 
    BEFORE UPDATE ON keyring_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Enable Row Level Security for projects
ALTER TABLE keyring_projects ENABLE ROW LEVEL SECURITY;

-- Step 10: Add RLS policies for projects
CREATE POLICY "Service role can manage projects" ON keyring_projects
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can read projects" ON keyring_projects
    FOR SELECT USING (true);

