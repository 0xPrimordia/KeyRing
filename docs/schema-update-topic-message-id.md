# Schema Update: Topic Message ID for Projects

## Overview
Added `topic_message_id` field to the `keyring_projects` table to store the Hedera HCS-2 transaction ID when a project is registered to the topic.

## Changes Made

### 1. Database Schema
Added new field to `keyring_projects`:
- `topic_message_id` (TEXT, nullable) - Stores the HCS-2 topic message transaction ID

**Updated Files:**
- `/supabase/migrations/004_add_projects_table.sql` - Migration includes the new field
- `/supabase/schema.sql` - Main schema updated

### 2. TypeScript Types
Updated `/lib/database.types.ts`:
- Added `topic_message_id` to Row, Insert, and Update types for `keyring_projects`

### 3. Database Helper Methods
Updated `/lib/keyring-db.ts`:
- `createProject()` - Now accepts optional `topicMessageId` parameter
- `updateProject()` - Now accepts optional `topicMessageId` parameter

### 4. API Response
Updated `/src/app/api/threshold-lists/route.ts`:
- Now includes `topicMessageId` in the project object returned with each threshold list

### 5. Test Script
Completely refactored `/utils/send-test-project.ts`:
- Uses new database schema fields (company_name, legal_entity_name, public_record_url)
- Captures transaction ID from HCS-2 topic submission
- Automatically saves project to database with the topic_message_id
- Provides comprehensive output showing both on-chain and database information

## Usage Example

### Creating a Project with Topic Message

```typescript
// 1. Submit project to HCS-2 topic
const transaction = new TopicMessageSubmitTransaction()
  .setTopicId(topicId)
  .setMessage(projectMessage);

const response = await transaction.execute(client);
const transactionId = response.transactionId.toString();

// 2. Save to database with topic message ID
const result = await KeyRingDB.createProject({
  companyName: "DeFi Protocol Alpha",
  legalEntityName: "DeFi Protocol Alpha LLC",
  publicRecordUrl: "https://example.gov/business/123456789",
  topicMessageId: transactionId // Link to HCS-2 message
});
```

### Running the Test Script

```bash
# Make sure .env.local has required variables
npm run ts-node utils/send-test-project.ts
```

The script will:
1. Create or use existing PROJECT_REGISTRY_TOPIC
2. Submit project registration to HCS-2 topic
3. Capture the transaction ID
4. Save project to database with all fields including topic_message_id
5. Display complete information

## API Response Structure

```json
{
  "success": true,
  "lists": [{
    "id": "list-uuid",
    "name": "Company Name",
    "project": {
      "id": "project-uuid",
      "companyName": "Company Name",
      "legalEntityName": "Company Legal Name Inc.",
      "publicRecordUrl": "https://example.gov/records/123",
      "topicMessageId": "0.0.12345@1234567890.123456789"
    },
    ...
  }]
}
```

## Benefits

1. **Traceability**: Direct link between database records and on-chain messages
2. **Verification**: Can look up the original HCS-2 message using the transaction ID
3. **Auditing**: Full audit trail from database to blockchain
4. **Integration**: Enables building tools that sync database with on-chain data

## HCS-2 Message Format

The updated script sends messages in this format:

```json
{
  "p": "hcs-2",
  "op": "register",
  "t_id": "0.0.12345",
  "metadata": {
    "company_name": "DeFi Protocol Alpha",
    "legal_entity_name": "DeFi Protocol Alpha LLC",
    "public_record_url": "https://example.gov/business/123456789",
    "description": "Project description...",
    "owners": ["Alice Johnson", "Bob Smith"],
    "employees": ["Charlie Brown", "Diana Prince", "Eve Wilson"],
    "hederaAccountId": "0.0.12345",
    "status": "verified"
  },
  "m": "KeyRing verified project registration"
}
```

## Migration Notes

- The field is nullable, so existing projects without a topic message ID remain valid
- New projects should include the topic message ID when registering
- The migration in `004_add_projects_table.sql` includes this field from the start

