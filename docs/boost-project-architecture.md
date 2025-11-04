# Boost Project Architecture - How It Actually Works

## Overview

Boost projects use **Hedera Scheduled Transactions** to create tasks that require threshold list approval. This document explains the complete flow and architecture.

## Key Understanding

### What Scheduled Transactions Do
- Store pending transactions on Hedera network
- Collect signatures from required signers
- Auto-execute when threshold is met
- Track all activity on-chain

### What They DON'T Do
- ❌ Push notifications to signers
- ❌ Automatic wallet alerts
- ❌ Self-discovery in wallets

## The Complete Flow

### Step 1: Operator Creates Scheduled Transaction

**What Happens:**
```bash
npm run boost:create
```

**Result:**
- Scheduled transaction posted to Hedera
- Returns a Schedule ID (e.g., `0.0.7098029`)
- Transaction waits for signatures
- No signers are automatically notified

**On-Chain:**
```
Schedule ID: 0.0.7098029
Status: Pending
Required Signatures: 3
Current Signatures: 0
Expiry: 7 days
```

### Step 2: Signers Query for Pending Schedules

**Option A: Query by Signer Account**
```bash
npm run schedules:query -- --signer 0.0.SIGNER_ACCOUNT
```

Uses Mirror Node API:
```
GET https://testnet.mirrornode.hedera.com/api/v1/schedules?account.id=0.0.SIGNER_ACCOUNT&executed=false
```

**Option B: Query Specific Schedule**
```bash
npm run schedules:query -- --schedule 0.0.7098029
```

Uses Mirror Node API:
```
GET https://testnet.mirrornode.hedera.com/api/v1/schedules/0.0.7098029
```

### Step 3: Signers Approve via Dashboard

**Current State:** ⏳ **NEEDS TO BE BUILT**

The signer dashboard will:
1. Connect signer wallet (HashPack via WalletConnect)
2. Query Mirror Node for pending schedules
3. Display list of transactions needing approval
4. Click "Approve" → Signs via wallet
5. Track approval status

**Technical Flow:**
```typescript
// 1. Connect wallet
const wallet = await hashConnectService.connect();

// 2. Get pending schedules
const schedules = await queryPendingSchedules(signerAccountId);

// 3. Sign schedule
await new ScheduleSignTransaction()
  .setScheduleId(scheduleId)
  .freezeWithSigner(wallet)
  .executeWithSigner(wallet);
```

### Step 4: Auto-Execution

**When:** All required signatures collected  
**What:** Transaction automatically executes  
**Result:** Boost counter increments, activity tracked

## Architecture Components

### 1. Backend Scripts (Done ✅)

**Create Scheduled Transactions:**
- `utils/createScheduledTransaction.ts`
- Operator creates boost tasks
- Returns Schedule ID

**Query Schedules:**
- `utils/queryPendingSchedules.ts`
- Check pending schedules for signer
- Query specific schedule details

### 2. Signer Dashboard (To Build ⏳)

**Requirements:**
- Next.js web app
- HashPack WalletConnect integration
- Mirror Node API queries
- Real-time schedule updates

**Pages Needed:**
```
/dashboard
  - List of pending schedules for connected signer
  - Approval button for each
  - Activity history

/schedule/[id]
  - Detailed view of single schedule
  - Current signatures
  - Approve button
```

### 3. Smart Contract (Optional ⏳)

**Purpose:** Track boost project metadata  
**Not for:** Signature collection (use scheduled transactions)

**Potential Use:**
- Store boost project IDs
- Map Schedule IDs to boost projects
- Track completion status
- Calculate rewards

## Data Flow Diagram

```
┌─────────────┐
│  Operator   │
│  (KeyRing)  │
└──────┬──────┘
       │
       │ 1. Create Scheduled Transaction
       ▼
┌─────────────────────┐
│  Hedera Network     │
│  Schedule Service   │
│  ID: 0.0.7098029    │
└──────┬──────────────┘
       │
       │ 2. Mirror Node API
       │    /api/v1/schedules?account.id=0.0.SIGNER
       ▼
┌─────────────────────┐
│  Signer Dashboard   │
│  (Web App)          │
└──────┬──────────────┘
       │
       │ 3. Connect Wallet & Sign
       ▼
┌─────────────────────┐
│  HashPack Wallet    │
│  WalletConnect      │
└──────┬──────────────┘
       │
       │ 4. ScheduleSignTransaction
       ▼
┌─────────────────────┐
│  Hedera Network     │
│  Signature Added    │
│  (2/3 collected)    │
└──────┬──────────────┘
       │
       │ 5. When 3/3 collected
       ▼
┌─────────────────────┐
│  Auto-Execute       │
│  Transaction Done   │
│  Activity Tracked   │
└─────────────────────┘
```

## Current Status

### ✅ Completed
- [x] Threshold list created (`0.0.7097961`)
- [x] Script to create scheduled transactions
- [x] Script to query schedules via Mirror Node
- [x] Test scheduled transaction created (`0.0.7098029`)
- [x] Understanding of architecture

### ⏳ In Progress / Next Steps
- [ ] Build signer dashboard (Next.js)
- [ ] Integrate HashPack WalletConnect
- [ ] Implement schedule signing
- [ ] Real-time schedule updates
- [ ] Activity tracking & rewards

### 🔮 Future Enhancements
- [ ] Push notifications (email/SMS when schedule created)
- [ ] Mobile app for signers
- [ ] Reward calculation smart contract
- [ ] Multi-project support
- [ ] Signer reputation system

## API Endpoints

### Mirror Node (Testnet)
Base URL: `https://testnet.mirrornode.hedera.com/api/v1`

**Get schedules for signer:**
```
GET /schedules?account.id={accountId}&executed=false
```

**Get specific schedule:**
```
GET /schedules/{scheduleId}
```

**Get schedule transactions:**
```
GET /schedules/{scheduleId}/transactions
```

## Testing Flow

### 1. Create Test Schedule
```bash
npm run boost:create
```

**Output:**
```
Schedule ID: 0.0.7098029
Status: Waiting for 3 signatures
```

### 2. Query Schedule
```bash
npm run schedules:query -- --schedule 0.0.7098029
```

**Output:**
```
Executed: No
Signatures: 1/3
```

### 3. Sign Schedule (Need private keys)
```bash
npm run boost:sign 0.0.7098029
```

**Note:** Currently requires private keys. Dashboard will use wallet signing.

### 4. Monitor Execution
```bash
npm run schedules:query -- --schedule 0.0.7098029
```

**When complete:**
```
Executed: Yes
Timestamp: {executed_time}
```

## Integration with Existing KeyRing

### Signer Registration Flow

1. User registers on KeyRing
2. KYC verification (Sumsub)
3. Add to database: `keyring_signers`
4. User's Hedera account ID stored
5. When boost project needs signers → Add to threshold list
6. Threshold list used in scheduled transactions

### Database Schema

**Existing:**
- `keyring_signers` - Verified signers
- `keyring_projects` - Projects needing signatures
- `keyring_threshold_lists` - Threshold lists for projects

**New Tables Needed:**
```sql
CREATE TABLE keyring_boost_schedules (
    id UUID PRIMARY KEY,
    schedule_id TEXT UNIQUE NOT NULL,
    project_id UUID REFERENCES keyring_projects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE keyring_schedule_signatures (
    id UUID PRIMARY KEY,
    schedule_id UUID REFERENCES keyring_boost_schedules(id),
    signer_id UUID REFERENCES keyring_signers(id),
    signed_at TIMESTAMPTZ,
    transaction_id TEXT
);
```

## Security Considerations

1. **Schedule Creation:** Only operator can create
2. **Signature Authority:** Only threshold list keys can sign
3. **Expiration:** Schedules expire after 7 days
4. **No Double-Signing:** Hedera prevents duplicate signatures
5. **Audit Trail:** All activity on-chain

## Resources

- **Test Schedule:** https://hashscan.io/testnet/schedule/0.0.7098029
- **Threshold List:** https://hashscan.io/testnet/account/0.0.7097961
- **Hedera Docs:** https://docs.hedera.com/hedera/core-concepts/scheduled-transaction
- **Mirror Node API:** https://testnet.mirrornode.hedera.com/api/v1/docs

## Next Action Items

1. **Build Signer Dashboard MVP**
   - Connect HashPack wallet
   - Query & display pending schedules
   - Sign schedule via wallet

2. **Test with Real Signers**
   - Get 3 test accounts with wallets
   - Create schedule
   - Have each sign
   - Verify execution

3. **Implement Reward System**
   - Track participation
   - Calculate rewards
   - Distribute tokens

---

**Status:** Architecture Defined ✅  
**Next:** Build Signer Dashboard ⏳

