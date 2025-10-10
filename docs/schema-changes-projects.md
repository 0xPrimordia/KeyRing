# Database Schema Changes: Projects Model

## Overview
Refactored the database schema to introduce a proper `keyring_projects` table with a one-to-many relationship with `keyring_threshold_lists`.

## Changes Made

### 1. New Projects Table
Created `keyring_projects` table with the following fields:
- `id` (UUID, primary key)
- `company_name` (TEXT) - Display/common company name
- `legal_entity_name` (TEXT) - Official registered business entity name
- `public_record_url` (TEXT, nullable) - URL to government public records
- `owners` (TEXT[], nullable) - Array of owner names
- `topic_message_id` (TEXT, nullable) - HCS-2 topic message transaction ID
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 2. Modified Threshold Lists Table
- **Added**: `project_id` (UUID, foreign key to `keyring_projects`)
- **Removed**: `project_name` (TEXT)
- **Constraint**: ON DELETE CASCADE for project_id foreign key

### 3. Migration File
Created `/supabase/migrations/004_add_projects_table.sql` which:
1. Creates the projects table
2. Adds project_id column to threshold_lists
3. Migrates existing project_name data to new projects table
4. Updates foreign key relationships
5. Removes the old project_name column
6. Adds necessary indexes and RLS policies

### 4. TypeScript Types
Updated `/lib/database.types.ts`:
- Added `keyring_projects` table types (Row, Insert, Update)
- Updated `keyring_threshold_lists` types to use `project_id` instead of `project_name`
- Added relationship metadata between tables

### 5. Database Helper Methods
Updated `/lib/keyring-db.ts` with new methods:
- `createProject()` - Create a new project
- `getProjectById()` - Fetch project by ID
- `getProjectByName()` - Fetch project by company name
- `getAllProjects()` - Get all projects
- `updateProject()` - Update project information
- `registerThresholdList()` - Updated to accept `projectId` instead of `projectName`

### 6. API Routes
Updated `/src/app/api/threshold-lists/route.ts`:
- Modified query to join with `keyring_projects` table
- Returns project information (id, companyName, legalEntityName, publicRecordUrl) with each list
- Maintains backward compatibility by still returning `name` field (now sourced from project.company_name)

### 7. Schema Documentation
Updated `/supabase/schema.sql`:
- Added projects table definition
- Updated threshold_lists to reference projects
- Added indexes for project lookups
- Added RLS policies for projects
- Added updated_at trigger for projects

## Database Relationships

```
keyring_projects (1) ──→ (many) keyring_threshold_lists
```

Each project can have multiple threshold lists, but each threshold list belongs to only one project.

## Migration Notes

### Running the Migration
Execute the migration in Supabase SQL Editor:
```sql
-- Run /supabase/migrations/004_add_projects_table.sql
```

### Data Safety
The migration preserves all existing data by:
1. Creating projects from unique project_name values
2. Automatically linking existing threshold lists to their projects
3. Only dropping the old column after successful data migration

## API Response Changes

### Before
```json
{
  "id": "uuid",
  "name": "Company Name",
  ...
}
```

### After
```json
{
  "id": "uuid",
  "name": "Company Name",
  "project": {
    "id": "project-uuid",
    "companyName": "Company Name",
    "legalEntityName": "Company Legal Name Inc.",
    "publicRecordUrl": "https://example.gov/records/123",
    "owners": ["Owner 1", "Owner 2"],
    "topicMessageId": "0.0.12345@1234567890.123456789"
  },
  ...
}
```

## Next Steps

1. **Run the migration** in your Supabase database
2. **Update frontend code** to use the new project information
3. **Create UI** for managing projects (if needed)
4. **Update any tests** that reference the old project_name field

## Breaking Changes

⚠️ **API Compatibility**: The `registerThresholdList()` method now requires a `projectId` instead of `projectName`. Any code calling this method will need to be updated to:
1. Create or fetch a project first
2. Pass the project ID to `registerThresholdList()`

### Example Migration Pattern
```typescript
// Old code
await KeyRingDB.registerThresholdList({
  projectName: "My Company",
  ...
});

// New code
// Option 1: Create new project
const { project } = await KeyRingDB.createProject({
  companyName: "My Company",
  legalEntityName: "My Company Inc.",
  publicRecordUrl: "https://...",
  owners: ["Owner 1", "Owner 2"],
  topicMessageId: "0.0.12345@1234567890.123456789"
});

// Option 2: Get existing project
const project = await KeyRingDB.getProjectByName("My Company");

// Then register list
await KeyRingDB.registerThresholdList({
  projectId: project.id,
  ...
});
```

