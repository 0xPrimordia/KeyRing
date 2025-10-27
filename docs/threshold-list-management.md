# Threshold List Management on Hedera

## Overview

This document outlines how threshold lists and scheduled transactions are managed on the Hedera network, based on research of current best practices and API limitations.

## Key Findings

### 1. Mirror Node API Limitations

The Hedera Mirror Node API **does not** provide:
- Direct query parameter for filtering schedules by required signer (`?signer=` parameter does not exist on testnet as of Oct 2025)
- A `signers` field in schedule responses showing who needs to sign (only `signatures` showing who has signed)
- Direct way to query schedules requiring signatures from specific keys within a threshold list

**What the API provides:**
- Query schedules by creator/payer account: `?account.id=`
- Individual schedule details: `/api/v1/schedules/{scheduleId}`
- `signatures` array showing who has already signed
- `executed_timestamp` indicating if schedule has executed

### 2. Standard Approach: Off-Chain Tracking

Based on research and best practices, **off-chain tracking is the standard and recommended approach** for managing pending transactions in multi-signature/threshold list scenarios.

#### Why Off-Chain Tracking?

1. **Mirror Node Limitations**: The network doesn't expose schedules by required signer keys
2. **Cross-Project Coordination**: When transactions come from multiple projects on the platform
3. **Notification Systems**: Need to proactively notify signers rather than having them poll
4. **Rich Metadata**: Can store additional context not available on-chain

## Recommended Architecture

### Database Schema

Track scheduled transactions that require signatures from your platform's users:

```sql
CREATE TABLE pending_schedules (
  schedule_id TEXT PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  creator_account_id TEXT NOT NULL,
  threshold_list_account TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  
  -- Project/context info
  project_id TEXT,
  project_name TEXT,
  transaction_description TEXT,
  
  -- For quick lookups
  required_signatures INTEGER,
  current_signatures INTEGER
);

CREATE TABLE schedule_signatures (
  id SERIAL PRIMARY KEY,
  schedule_id TEXT REFERENCES pending_schedules(schedule_id),
  signer_account_id TEXT NOT NULL,
  signer_public_key TEXT NOT NULL,
  signed_at TIMESTAMP NOT NULL,
  transaction_hash TEXT,
  
  UNIQUE(schedule_id, signer_account_id)
);

CREATE TABLE threshold_list_members (
  id SERIAL PRIMARY KEY,
  threshold_list_account TEXT NOT NULL,
  member_account_id TEXT NOT NULL,
  member_public_key TEXT NOT NULL,
  added_at TIMESTAMP NOT NULL,
  project_id TEXT,
  
  UNIQUE(threshold_list_account, member_account_id)
);
```

### Workflow

#### 1. Schedule Creation (by Project)

When a project creates a scheduled transaction:

```typescript
// 1. Create the schedule on Hedera
const transaction = new ContractExecuteTransaction()
  .setContractId(contractId)
  .setFunction("someFunction", params);

const scheduleCreate = await new ScheduleCreateTransaction()
  .setScheduledTransaction(transaction)
  .setMemo("Project XYZ: Reward Distribution")
  .execute(client);

const scheduleId = (await scheduleCreate.getReceipt(client)).scheduleId;

// 2. Store in database for off-chain tracking
await database.pending_schedules.insert({
  schedule_id: scheduleId.toString(),
  threshold_list_account: thresholdListAccount,
  project_id: project.id,
  project_name: project.name,
  transaction_description: "Distribute 1000 HBAR to reward pool",
  required_signatures: 2, // from threshold config
  current_signatures: 1, // creator's signature
  created_at: new Date(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});

// 3. Notify required signers
const signers = await getThresholdListMembers(thresholdListAccount);
await notifySigners(signers, scheduleId);
```

#### 2. Dashboard Query (by Signer)

When a signer views their dashboard:

```typescript
async function loadPendingSchedules(accountId: string) {
  // Query database for schedules requiring this account's signature
  const pendingSchedules = await database.query(`
    SELECT ps.*, 
           tlm.threshold_list_account,
           COUNT(ss.id) as signatures_collected
    FROM pending_schedules ps
    JOIN threshold_list_members tlm 
      ON ps.threshold_list_account = tlm.threshold_list_account
    LEFT JOIN schedule_signatures ss 
      ON ps.schedule_id = ss.schedule_id
    WHERE tlm.member_account_id = $1
      AND ps.executed_at IS NULL
      AND ps.deleted = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM schedule_signatures 
        WHERE schedule_id = ps.schedule_id 
        AND signer_account_id = $1
      )
    GROUP BY ps.schedule_id, tlm.threshold_list_account
    ORDER BY ps.created_at DESC
  `, [accountId]);

  return pendingSchedules;
}
```

#### 3. Signature Recording

When a signer approves a schedule:

```typescript
async function recordSignature(scheduleId: string, signerAccountId: string) {
  // 1. Submit signature to Hedera
  const signTx = await new ScheduleSignTransaction()
    .setScheduleId(ScheduleId.fromString(scheduleId))
    .executeWithSigner(signer);

  // 2. Record in database
  await database.schedule_signatures.insert({
    schedule_id: scheduleId,
    signer_account_id: signerAccountId,
    signed_at: new Date(),
    transaction_hash: signTx.transactionHash
  });

  // 3. Update signature count
  await database.pending_schedules.update(scheduleId, {
    current_signatures: database.raw('current_signatures + 1')
  });

  // 4. Check if threshold met - query Mirror Node for execution status
  const schedule = await mirrorNode.getSchedule(scheduleId);
  if (schedule.executed_timestamp) {
    await database.pending_schedules.update(scheduleId, {
      executed_at: new Date(parseFloat(schedule.executed_timestamp) * 1000)
    });
  }
}
```

#### 4. Sync with Mirror Node (Background Job)

Periodically sync with Mirror Node to catch any missed executions or deletions:

```typescript
async function syncSchedulesWithMirrorNode() {
  const pendingSchedules = await database.pending_schedules
    .where('executed_at', null)
    .where('deleted', false);

  for (const schedule of pendingSchedules) {
    try {
      const mirrorData = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/schedules/${schedule.schedule_id}`
      ).then(r => r.json());

      // Check if executed
      if (mirrorData.executed_timestamp) {
        await database.pending_schedules.update(schedule.schedule_id, {
          executed_at: new Date(parseFloat(mirrorData.executed_timestamp) * 1000)
        });
      }

      // Check if deleted
      if (mirrorData.deleted) {
        await database.pending_schedules.update(schedule.schedule_id, {
          deleted: true
        });
      }

      // Sync signatures
      for (const sig of mirrorData.signatures || []) {
        await database.schedule_signatures.upsert({
          schedule_id: schedule.schedule_id,
          signed_at: new Date(parseFloat(sig.consensus_timestamp) * 1000),
          // Note: Mirror Node doesn't provide account ID in signatures
          // You may need to map public_key_prefix to account_id
        });
      }
    } catch (err) {
      console.error(`Error syncing schedule ${schedule.schedule_id}:`, err);
    }
  }
}
```

### Dashboard Metadata Display

Based on research, display the following key metadata:

1. **Account Information**
   - Public Key
   - Account ID
   - Account balance and tokens

2. **Threshold Lists Membership**
   - List of threshold list accounts the user is part of
   - For each list:
     - Account ID
     - Memo/Description
     - Key structure (e.g., "2-of-3 Threshold")
     - Project association
     - Creation date

3. **Recent Activity**
   - Recent SCHEDULESIGN transactions
   - Success/failure status
   - Timestamp
   - Associated memo

4. **Pending Transactions**
   - Schedules requiring signature
   - Project/creator context
   - Number of signatures collected vs. required
   - Expiration time
   - Transaction description

## Best Practices

### 1. Security
- Store only public information in database (no private keys)
- Validate all signatures on-chain (database is for coordination only)
- Use secure webhook endpoints for notifications
- Implement rate limiting to prevent spam

### 2. Expiration Handling
- Set reasonable expiration times (e.g., 30 days)
- Clean up expired schedules from database
- Notify signers before expiration

### 3. Error Handling
- Handle `NO_NEW_VALID_SIGNATURES` gracefully (already signed or not a required signer)
- Handle `INVALID_SCHEDULE_ID` (schedule deleted or expired)
- Sync with Mirror Node periodically to catch edge cases

### 4. Notifications
- Email/SMS when new schedule requires signature
- Push notifications via dApp
- Webhook notifications for integrations
- Reminders as expiration approaches

### 5. Threshold List Management
- Maintain a registry of threshold lists on the platform
- Store member lists and their public keys
- Track when members are added/removed
- Version control for list changes

## Implementation for KeyRing Platform

For the KeyRing platform, implement:

1. **Supabase Tables** (already have database setup)
   - Add `pending_schedules` table
   - Add `schedule_signatures` table
   - Add `threshold_list_members` table
   - Add triggers for automatic notification

2. **API Endpoints**
   - `POST /api/schedules` - Create and track new schedule
   - `GET /api/schedules/pending` - Get pending schedules for connected account
   - `POST /api/schedules/:id/sign` - Record signature
   - `GET /api/threshold-lists/:id/members` - Get list members

3. **Background Jobs**
   - Sync with Mirror Node every 5 minutes
   - Send reminder notifications daily
   - Clean up expired schedules weekly

4. **Dashboard Enhancements**
   - Display threshold list memberships (already started ✓)
   - Show pending schedules from database query
   - Rich transaction preview with project context
   - Signature progress indicators

## Conclusion

While the Mirror Node API has limitations for querying schedules by required signer, **off-chain tracking is not only viable but the recommended standard approach** for production multi-signature platforms on Hedera. This provides:

- Better UX with notifications and rich metadata
- Scalability across multiple projects
- Flexibility to add features not available on-chain
- Reliable coordination between parties

The on-chain scheduled transaction system remains the source of truth for execution, while the off-chain database provides coordination, discovery, and enhanced UX.

