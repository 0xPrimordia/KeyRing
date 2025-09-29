# KeyRing Protocol - Hedera Utils

This folder contains utility scripts for interacting with Hedera testnet to demonstrate KeyRing Protocol functionality.

## Setup

1. **Get Hedera Testnet Credentials**
   - Visit [Hedera Portal](https://portal.hedera.com/register)
   - Create a testnet account
   - Note your Account ID and Private Key

2. **Environment Variables**
   Create a `.env` file in the project root with:
   ```
   HEDERA_ACCOUNT_ID=0.0.your_account_id
   HEDERA_PRIVATE_KEY=your_private_key_here
   ```

## Scripts

### `createThresholdList.js`

Creates a threshold key list on Hedera testnet to demonstrate KeyRing Protocol functionality.

**What it does:**
- Generates 5 ED25519 key pairs (simulating KeyRing verified signers)
- Creates a 3-of-5 threshold key structure
- Creates a test account with the threshold key as admin
- Queries on-chain metadata
- Outputs KeyRing Protocol-compatible metadata

**Usage:**
```bash
node utils/createThresholdList.js
```

**Output:**
- Individual signer key pairs with mock code names
- Threshold key structure details
- On-chain account information
- KeyRing Protocol metadata JSON

This demonstrates how KeyRing Protocol would:
1. Generate verified signer key pairs
2. Create threshold key structures using [Hedera's native KeyList functionality](https://docs.hedera.com/hedera/sdks-and-apis/sdks/keys/create-a-key-list)
3. Apply them to Hedera accounts/tokens/contracts
4. Maintain metadata for registry and certification

## KeyRing Protocol Integration

The threshold keys created by this script would be used in KeyRing Protocol as:
- **Admin Keys**: For token supply, freeze, wipe operations
- **Contract Keys**: For upgradeable smart contract admin
- **Account Keys**: For multi-sig treasury accounts
- **Topic Keys**: For consensus service admin operations

Each threshold list would be certified in the KeyRing registry with verifier metadata, reputation scores, and public transparency.
