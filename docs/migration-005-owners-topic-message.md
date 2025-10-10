# Migration 005: Add Owners and Topic Message ID

## Overview
This migration adds two new fields to the existing `keyring_projects` table:
- `owners` - Array of owner names
- `topic_message_id` - Link to Hedera HCS-2 on-chain message

## Prerequisites
- Migration `004_add_projects_table.sql` must be applied first
- The `keyring_projects` table must already exist

## What This Migration Does

### 1. Adds `owners` Column
```sql
ALTER TABLE keyring_projects 
ADD COLUMN owners TEXT[];
```
- **Type**: Array of strings (TEXT[])
- **Nullable**: Yes (existing projects may not have this data)
- **Purpose**: Store the names of project owners for transparency and verification

### 2. Adds `topic_message_id` Column
```sql
ALTER TABLE keyring_projects 
ADD COLUMN topic_message_id TEXT;
```
- **Type**: TEXT
- **Nullable**: Yes (existing projects may not have been registered on-chain yet)
- **Purpose**: Store the Hedera HCS-2 transaction ID that links the database record to the on-chain registration message

## Running the Migration

### In Supabase Dashboard:
1. Go to SQL Editor
2. Copy the contents of `/supabase/migrations/005_add_owners_and_topic_message_id.sql`
3. Execute the SQL
4. Verify with: `SELECT * FROM keyring_projects LIMIT 1;`

### Using Supabase CLI:
```bash
supabase db push
```

## After Migration

### Database Schema
The complete `keyring_projects` table will now have:
```sql
CREATE TABLE keyring_projects (
    id UUID PRIMARY KEY,
    company_name TEXT NOT NULL,
    legal_entity_name TEXT NOT NULL,
    public_record_url TEXT,
    owners TEXT[],                    -- NEW
    topic_message_id TEXT,            -- NEW
    project_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Update Existing Projects
You can update existing projects to add owners:
```sql
UPDATE keyring_projects 
SET owners = ARRAY['Owner 1', 'Owner 2'] 
WHERE company_name = 'Your Company';
```

### Usage in Code
```typescript
// Create new project with owners
const { project } = await KeyRingDB.createProject({
  companyName: "Lynxify",
  legalEntityName: "Lynxify LLC",
  publicRecordUrl: "https://...",
  owners: ["Jason Cox", "Kevin Compton"],
  topicMessageId: "0.0.12345@1234567890.123456789"
});

// Update existing project
await KeyRingDB.updateProject(projectId, {
  owners: ["Jason Cox", "Kevin Compton"],
  topicMessageId: "0.0.12345@1234567890.123456789"
});
```

## Verification

After running the migration, verify the columns were added:
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'keyring_projects' 
  AND column_name IN ('owners', 'topic_message_id');
```

Expected output:
```
column_name        | data_type      | is_nullable
-------------------|----------------|-------------
owners             | ARRAY          | YES
topic_message_id   | text           | YES
```

## Rollback

If you need to rollback this migration:
```sql
ALTER TABLE keyring_projects DROP COLUMN owners;
ALTER TABLE keyring_projects DROP COLUMN topic_message_id;
```

⚠️ **Warning**: Rollback will delete any data stored in these columns!

## Related Files Updated
- `/lib/database.types.ts` - TypeScript types
- `/lib/keyring-db.ts` - Database methods
- `/src/app/api/threshold-lists/route.ts` - API response
- `/utils/send-test-project.ts` - Test script
- `/supabase/schema.sql` - Main schema reference

