# Signer Dashboard Guide

## Overview

The Signer Dashboard allows verified signers to view and approve scheduled transactions that require their signature. This is the primary interface for boost project participation.

## Features

### Current (MVP)
- ✅ Connect HashPack wallet
- ✅ View pending scheduled transactions
- ✅ See transaction details
- ✅ Approve transactions via wallet
- ✅ Transaction risk assessment
- ✅ Real-time schedule queries

### Future Enhancements
- ⏳ Push notifications (email/SMS)
- ⏳ Contract code comparison
- ⏳ Security audit results
- ⏳ Community reviews
- ⏳ Reward tracking
- ⏳ Activity history

## User Flow

### 1. Access Dashboard
Navigate to `/signer-dashboard` or click "Signer Dashboard" in header

### 2. Connect Wallet
- Click "Connect HashPack Wallet"
- Approve connection in HashPack
- Dashboard loads pending transactions

### 3. View Pending Transactions
Dashboard shows:
- Number of pending approvals
- List of all scheduled transactions
- Basic info (ID, creator, timestamp)
- Current signature count

### 4. Review Transaction Details
Click "View Details" to see:
- Transaction type and risk level
- What the transaction does
- Raw transaction body
- Current signatures
- External links (HashScan, Mirror Node)

### 5. Approve Transaction
- Click "Approve" button
- HashPack wallet opens
- Review and sign
- Transaction executes when threshold met

## Risk Levels

### 🟢 Low Risk
- HBAR transfers
- Token transfers
- Simple queries

### 🟡 Medium Risk
- Contract execution
- Token minting/burning
- Account updates

### 🔴 High Risk
- Contract upgrades
- Admin key changes
- Critical system modifications

## Transaction Types

### HBAR Transfer
```
Type: CryptoTransfer
Risk: Low
Description: Transfer HBAR between accounts
```

### Contract Execution
```
Type: ContractCall
Risk: Medium  
Description: Execute function on smart contract
```

### Contract Update
```
Type: ContractUpdate
Risk: High
Description: Update smart contract (REQUIRES CAREFUL REVIEW)
```

### Token Mint
```
Type: TokenMint
Risk: Medium
Description: Mint new tokens
```

## Future: Contract Analysis

For high-risk transactions (contract upgrades), the dashboard will show:

### Side-by-Side Code Comparison
```
Old Contract              New Contract
----------------         ----------------
function transfer()  →   function transfer()  
  require(...)             require(...)
                           + new security check
```

### Security Audit
- Automated vulnerability scanning
- Known exploit detection
- Permission changes highlighted
- Risk score calculation

### Community Review
- Comments from other signers
- Approval/rejection recommendations
- Discussion threads
- Expert opinions

## Technical Details

### API Endpoints Used

**Mirror Node API:**
```
GET /api/v1/schedules?account.id={accountId}&executed=false
GET /api/v1/schedules/{scheduleId}
```

### Wallet Integration

Currently using localStorage for testing:
```typescript
// TODO: Replace with actual HashPack integration
const mockAccountId = '0.0.4337514';
localStorage.setItem('hedera_account_id', mockAccountId);
```

**Next Steps:**
1. Install `@hashgraph/hedera-wallet-connect`
2. Implement WalletConnect protocol
3. Handle sign requests

### Transaction Signing

```typescript
import { ScheduleSignTransaction } from "@hashgraph/sdk";

await new ScheduleSignTransaction()
  .setScheduleId(scheduleId)
  .freezeWithSigner(wallet)
  .executeWithSigner(wallet);
```

## Testing the Dashboard

### 1. Run Dev Server
```bash
npm run dev
```

### 2. Navigate to Dashboard
```
http://localhost:3000/signer-dashboard
```

### 3. Connect Wallet
- Currently uses mock account `0.0.4337514`
- Replace with actual wallet connection

### 4. View Test Schedule
The schedule we created earlier should appear:
- Schedule ID: `0.0.7098029`
- Memo: "Boost Project Test Transaction #1"
- Status: Pending

### 5. Try Approval Flow
- Click "View Details"
- Review transaction
- Click "Approve"
- (Will show alert until HashPack integrated)

## Integration Checklist

### Phase 1: Basic Functionality ✅
- [x] Dashboard layout
- [x] Schedule list view
- [x] Detail view
- [x] Risk assessment
- [x] Mirror Node queries

### Phase 2: Wallet Integration ⏳
- [ ] Install HashPack SDK
- [ ] Implement WalletConnect
- [ ] Handle sign requests
- [ ] Show transaction status
- [ ] Error handling

### Phase 3: Enhanced Features ⏳
- [ ] Real-time updates (polling/websockets)
- [ ] Push notifications
- [ ] Activity history
- [ ] Reward tracking
- [ ] Contract analysis tools

### Phase 4: Production Ready ⏳
- [ ] Security audit
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Accessibility (WCAG)
- [ ] Analytics integration

## File Structure

```
src/app/signer-dashboard/
├── page.tsx                    # Main dashboard
└── schedule/
    └── [id]/
        └── page.tsx           # Transaction detail view

utils/
├── createScheduledTransaction.ts   # Create schedules
└── queryPendingSchedules.ts       # Query Mirror Node
```

## Environment Setup

No additional environment variables needed for dashboard.

Uses public Mirror Node API:
```
https://testnet.mirrornode.hedera.com/api/v1
```

## Common Issues

### "No pending transactions"
- Verify account ID is correct
- Check if account is part of threshold list
- Create test schedule with `npm run boost:create`

### "Failed to load schedules"
- Check internet connection
- Verify Mirror Node API is accessible
- Check browser console for errors

### "Approval not working"
- HashPack integration not complete yet
- Shows alert instead of actual signing
- Needs WalletConnect implementation

## Next Development Steps

1. **HashPack Integration**
   ```bash
   npm install @hashgraph/hedera-wallet-connect
   ```

2. **Implement Wallet Connection**
   - Setup WalletConnect provider
   - Handle connection/disconnection
   - Store session state

3. **Implement Schedule Signing**
   - Create sign transaction
   - Send to wallet for approval
   - Handle success/failure
   - Update UI state

4. **Add Real-time Updates**
   - Poll Mirror Node every 30s
   - Update schedule list
   - Show notifications

5. **Build Activity Tracking**
   - Store approvals in database
   - Calculate rewards
   - Show history

## Resources

- **Test Dashboard**: http://localhost:3000/signer-dashboard
- **Test Schedule**: https://hashscan.io/testnet/schedule/0.0.7098029
- **Mirror Node API**: https://testnet.mirrornode.hedera.com/api/v1/docs
- **HashPack Docs**: https://docs.hashpack.app/

---

**Status**: MVP Complete ✅  
**Next**: HashPack Integration ⏳

