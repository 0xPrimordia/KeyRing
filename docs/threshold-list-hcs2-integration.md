# Threshold List HCS-2 Integration

## Overview
Updated the threshold list system to properly integrate HCS-2 topics for communication and simplified the database schema to rely on on-chain data.

## Changes Made

### 1. HCS-2 Topic Security
**File**: `utils/createThresholdListTopic.ts`

- Updated topic creation to reference the threshold list in the memo: `hcs-2:0:86400|{thresholdListId}`
- Added TODO for production: Submit key should be set to the threshold list's KeyList
- Currently uses operator key for demo purposes
- This ensures only threshold list members can post rejection feedback and activity

**Future Enhancement**: Parse threshold list KeyList from mirror node and set as submitKey

### 2. Database Schema Simplification
**Migration**: `supabase/migrations/007_simplify_threshold_lists.sql`

Simplified `keyring_threshold_lists` table:
- Made `project_id` nullable (supports demo/standalone threshold lists)
- Removed `required_signatures` column (data is on-chain)
- Removed `total_signers` column (data is on-chain)
- Renamed `list_topic_id` to `hcs_topic_id` (clearer naming)
- Added index on `hcs_topic_id` for fast lookups
- Added table and column comments

**New Schema**:
```sql
CREATE TABLE keyring_threshold_lists (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES keyring_projects(id), -- Nullable
    hcs_topic_id TEXT NOT NULL,
    threshold_account_id TEXT UNIQUE NOT NULL,
    status list_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Database Integration
**File**: `src/app/api/generate-demo/route.ts`

Added database save after threshold list and topic creation:
- Saves threshold list to `keyring_threshold_lists` table
- Links HCS-2 topic ID with threshold list account
- Sets `project_id` to null for demo lists
- Returns database ID in API response

**4-Step Demo Flow**:
1. Create threshold list account (2-of-N multisig)
2. Create HCS-2 topic for communication
3. Save to database (threshold_account_id + hcs_topic_id)
4. Generate educational boost transactions

## Usage

### Running the Migration
```bash
# Run in Supabase SQL Editor or via CLI
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/007_simplify_threshold_lists.sql
```

### Generate Demo List (API)
```bash
POST /api/generate-demo
{
  "connectedAccountId": "0.0.XXXXXX"
}

# Response includes:
{
  "success": true,
  "data": {
    "thresholdListId": "0.0.XXXXXX",
    "topicId": "0.0.XXXXXX",
    "scheduleIds": ["0.0.X", ...],
    "databaseId": "uuid",
    "message": "..."
  }
}
```

### HCS-2 Topic Structure
- **Memo**: `hcs-2:0:86400|{threshold_list_account_id}`
- **TTL**: 24 hours (86400 seconds)
- **Submit Key**: Operator (demo) / Threshold KeyList (production)
- **Usage**: Rejection feedback, activity logs, multi-sig communication

## Benefits

1. **Simplified Database**: Only tracks associations, not redundant on-chain data
2. **Flexible**: Supports both project-based and demo threshold lists
3. **Secured Communication**: HCS-2 topic references specific threshold list
4. **Performance**: Added index on `hcs_topic_id` for fast lookups
5. **Clear Ownership**: Topic memo includes threshold list account ID

## Production Considerations

### TODO: Secure Submit Key
The HCS-2 topic's `submitKey` should be set to the threshold list's KeyList in production:

```typescript
// Fetch KeyList from mirror node
const accountData = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${thresholdListId}`);
const keyStructure = accountData.key;

// Parse and reconstruct KeyList
const thresholdKey = parseKeyListFromMirrorNode(keyStructure);

// Set as submitKey
const createTopicTx = new TopicCreateTransaction()
  .setTopicMemo(`hcs-2:0:86400|${thresholdListId}`)
  .setSubmitKey(thresholdKey); // Only threshold list members can post
```

### Future Enhancements
1. Parse complex KeyList structures from mirror node API
2. Add topic update key for administrative changes
3. Implement HCS message posting for rejections
4. Add topic query/listening for real-time updates
5. Store topic messages in database for historical analysis

## Files Changed
- `utils/createThresholdListTopic.ts` - Topic creation for threshold list communication
- `src/app/api/generate-demo/route.ts` - Added database save logic
- `supabase/migrations/007_simplify_threshold_lists.sql` - Migration script
- `supabase/schema.sql` - Updated main schema file
- `docs/threshold-list-hcs2-integration.md` - This documentation

