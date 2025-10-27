# Boost Project Setup Guide

## Overview

This document outlines the boost project system for KeyRing Protocol - a mechanism to test and measure signer activity and reliability through on-chain transactions.

## What We've Built

### 1. Threshold List Account ✅

**Account ID**: `0.0.7097961`  
**Network**: Hedera Testnet  
**Keys**: 3 public keys (all required for signing)

```
Key 1: 302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399
Key 2: 302a300506032b657003210059345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07
Key 3: 302a300506032b65700321000158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8
```

**Properties**:
- Balance: 1 HBAR
- Memo: "KeyRing Protocol KeyList Test Account"
- Threshold: All 3 keys required (no threshold parameter = all keys required)

### 2. BoostProject Smart Contract ✅

**Location**: `/contracts/BoostProject.sol`

**Purpose**: Simple contract to generate transactions for threshold list approval

**Key Features**:
- Operator can create boost transactions
- Threshold list must approve/execute transactions
- Automatic on-chain activity tracking
- Event emission for monitoring

**Functions**:
- `createBoostTransaction()` - Operator creates transactions
- `executeBoostTransaction()` - Threshold list executes
- `getBoostCounter()` - View total executed transactions
- `getTotalTransactions()` - View total created transactions

### 3. Deployment & Interaction Scripts ✅

**Scripts Created**:
- `utils/createThresholdList.ts` - Creates threshold list accounts
- `utils/deployBoostProject.ts` - Deploys boost project contract
- `utils/interactBoostProject.ts` - Interacts with deployed contract

**NPM Scripts**:
```json
{
  "hedera:threshold": "tsx utils/createThresholdList.ts",
  "boost:deploy": "tsx utils/deployBoostProject.ts",
  "boost:interact": "tsx utils/interactBoostProject.ts"
}
```

## How It Works

### Transaction Flow

```
1. Operator creates boost transaction
   ↓
   [TransactionCreated event emitted]
   ↓
2. Transaction awaits threshold list approval
   ↓
3. Threshold list (3 keys) signs and executes
   ↓
   [TransactionExecuted & BoostIncremented events emitted]
   ↓
4. Boost counter increments
   ↓
5. Activity tracked on-chain
```

### Activity Tracking

All activity is automatically tracked on Hedera:

**On-Chain Data**:
- Transaction creation timestamp
- Transaction execution timestamp
- Creator address
- Executor address
- Transaction descriptions
- Boost counter value

**Event Logs**:
- `TransactionCreated` - When operator creates transaction
- `TransactionExecuted` - When threshold list approves
- `BoostIncremented` - Counter update

**Querying Activity**:
```bash
# Via Mirror Node API
curl "https://testnet.mirrornode.hedera.com/api/v1/contracts/{contractId}/results"

# Via HashScan
https://hashscan.io/testnet/contract/{contractId}
```

## Next Steps

### Phase 1: Deploy & Test (Current)
- [ ] Compile BoostProject.sol contract
- [ ] Deploy contract to testnet
- [ ] Test operator creating transactions
- [ ] Test threshold list executing transactions
- [ ] Monitor on-chain events

### Phase 2: Signer Integration
- [ ] Add signer wallet connection
- [ ] Create UI for transaction approval
- [ ] Implement multi-signature flow
- [ ] Track individual signer participation

### Phase 3: Reward System
- [ ] Define reward calculation formula
- [ ] Implement token distribution contract
- [ ] Track reliability metrics
- [ ] Automate reward payouts

### Phase 4: Production Scaling
- [ ] Support multiple boost projects
- [ ] Implement project registration
- [ ] Add project governance
- [ ] Create signer reputation system

## Key Decisions Made

### 1. Threshold Requirements
**Decision**: Use KeyList without explicit threshold parameter  
**Result**: Requires ALL 3 keys to sign (maximum security)  
**Reasoning**: Best for testing reliability - all signers must participate

### 2. Activity Tracking
**Decision**: Track activity through on-chain events, not in-contract storage  
**Result**: Activity is automatically recorded by Hedera network  
**Reasoning**: More efficient, verifiable, and doesn't require additional contract logic

### 3. Reward Distribution
**Decision**: Deferred to future phase  
**Result**: Focus on transaction generation and approval first  
**Reasoning**: Need to observe activity patterns before designing rewards

### 4. Contract Simplicity
**Decision**: Minimal boost contract with just counter increment  
**Result**: Simple, testable, easy to understand  
**Reasoning**: Can iterate based on real-world usage patterns

## Environment Variables Required

Add to `.env.local`:

```bash
# Hedera Operator Account
HEDERA_TESTNET_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_TESTNET_PRIVATE_KEY=YOUR_PRIVATE_KEY

# After deploying contract
BOOST_PROJECT_CONTRACT_ID=0.0.YOUR_CONTRACT_ID
```

## Resources

- **Threshold List**: https://hashscan.io/testnet/account/0.0.7097961
- **Contract Source**: `/contracts/BoostProject.sol`
- **Documentation**: `/contracts/README.md`
- **Hedera Docs**: https://docs.hedera.com

## Questions to Resolve

1. **How often should boost transactions be created?**
   - Daily? Weekly? On-demand?
   - Should there be a minimum frequency?

2. **What happens if a signer is unresponsive?**
   - Timeout period?
   - Reputation penalty?
   - Alternative signers?

3. **How do we calculate rewards?**
   - Per transaction?
   - Based on response time?
   - Weighted by reliability score?

4. **Should we support different transaction types?**
   - Token transfers?
   - Contract upgrades?
   - Custom operations?

## Notes

- Threshold list created: October 20, 2025
- Network: Hedera Testnet
- Initial balance: 1 HBAR
- Status: Ready for contract deployment

