# Boost Project Contract

## Overview

The Boost Project contract is a simple smart contract designed to test threshold list activity on Hedera. It allows an operator to create transactions that require approval from a threshold list (multi-signature account).

## Key Concepts

### Threshold List
A **threshold list** is a Hedera account with a KeyList that requires multiple signatures to authorize transactions. In our case:
- **Account ID**: `0.0.7097961`
- **Required Signatures**: All 3 keys must sign
- **Purpose**: Simulate real-world multi-signature governance for boost projects

### Boost Transactions
**Boost transactions** are simple on-chain operations that:
1. Get created by the operator account
2. Require approval from the threshold list (all 3 keys)
3. Increment a counter when executed
4. Emit events for tracking activity

## Contract Architecture

### Roles

**Operator** (Your testnet account)
- Can create boost transactions
- Cannot execute them

**Threshold List** (`0.0.7097961`)
- Must approve/execute boost transactions
- Requires all 3 keys to sign

### Key Functions

#### Operator Functions
```solidity
function createBoostTransaction(string memory description) external onlyOperator returns (uint256)
```
- Creates a new boost transaction
- Returns transaction ID
- Emits `TransactionCreated` event

#### Threshold List Functions
```solidity
function executeBoostTransaction(uint256 transactionId) external onlyThresholdList
```
- Executes a pending boost transaction
- Increments boost counter
- Emits `TransactionExecuted` and `BoostIncremented` events

#### View Functions
```solidity
function getBoostCounter() external view returns (uint256)
function getTotalTransactions() external view returns (uint256)
function getTransaction(uint256 transactionId) external view returns (BoostTransaction memory)
```

## Deployment & Usage

### Step 1: Compile the Contract

You'll need to compile the Solidity contract to bytecode. Options:

**Option A: Using Hardhat**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Move BoostProject.sol to contracts/
npx hardhat compile
```

**Option B: Using Remix**
1. Go to https://remix.ethereum.org
2. Create new file `BoostProject.sol`
3. Paste the contract code
4. Compile with Solidity 0.8.20+
5. Copy the bytecode

### Step 2: Deploy the Contract

```bash
npm run boost:deploy
```

This will:
- Deploy the contract to Hedera testnet
- Set your operator account as the operator
- Set `0.0.7097961` as the threshold list
- Return a contract ID

**Save the contract ID** - you'll need it for interactions.

Add to `.env.local`:
```bash
BOOST_PROJECT_CONTRACT_ID=0.0.YOUR_CONTRACT_ID
```

### Step 3: Create Boost Transactions

As the operator:
```bash
npm run boost:interact
```

This will create a boost transaction that requires threshold list approval.

### Step 4: Execute with Threshold List

To execute a boost transaction, you need to call `executeBoostTransaction()` from the threshold list account. This requires:
1. All 3 private keys
2. Signing the transaction with each key
3. Submitting to the network

Example code:
```typescript
const contractExecTx = await new ContractExecuteTransaction()
  .setContractId(contractId)
  .setGas(100000)
  .setFunction("executeBoostTransaction", 
    new ContractFunctionParameters().addUint256(transactionId)
  )
  .freezeWith(client);

// Sign with all 3 keys
const signedTx = await (await (await contractExecTx
  .sign(privateKey1))
  .sign(privateKey2))
  .sign(privateKey3);

await signedTx.execute(client);
```

## Activity Tracking

All activity is automatically tracked on-chain through:

### Events
```solidity
event TransactionCreated(uint256 indexed transactionId, address indexed creator, uint256 timestamp, string description)
event TransactionExecuted(uint256 indexed transactionId, address indexed executor, uint256 timestamp)
event BoostIncremented(uint256 indexed transactionId, uint256 newBoostValue, uint256 timestamp)
```

### State Variables
- `boostCounter`: Total number of executed boost transactions
- `nextTransactionId`: Counter for transaction IDs
- `transactions`: Mapping of all boost transactions

### Viewing Activity

**Via Mirror Node API:**
```bash
curl "https://testnet.mirrornode.hedera.com/api/v1/contracts/{contractId}/results"
```

**Via HashScan:**
```
https://hashscan.io/testnet/contract/{contractId}
```

## Future Enhancements

This is a minimal boost project contract. Future versions could include:

1. **Configurable Thresholds**: Set M-of-N signature requirements
2. **Time Windows**: Transactions expire if not executed within timeframe
3. **Transaction Types**: Different boost operations (not just counter)
4. **Signer Reputation**: Track individual signer participation
5. **Reward Distribution**: Integrate token rewards for active signers
6. **Emergency Pause**: Allow operator to pause during issues

## Testing Workflow

1. ✅ **Created threshold list** (`0.0.7097961`) with 3 keys
2. ⏳ **Deploy boost contract** with threshold list as admin
3. ⏳ **Operator creates transactions** for signers to approve
4. ⏳ **Threshold list executes** transactions with multi-sig
5. ⏳ **Monitor activity** via events and queries
6. ⏳ **Analyze metrics** to determine reward distribution

## Resources

- [Hedera Smart Contracts](https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts)
- [Hedera SDK Reference](https://docs.hedera.com/hedera/sdks-and-apis/sdks)
- [HashScan Explorer](https://hashscan.io/testnet)
- [Hedera Mirror Node API](https://testnet.mirrornode.hedera.com/api/v1/docs)

