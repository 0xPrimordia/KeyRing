# Project Registration Script

## Overview
The `send-test-project.ts` script registers KeyRing projects to Hedera HCS-2 topics and stores them in the database. It supports **both testnet and mainnet** based on your environment configuration.

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   ```bash
   # Network selection
   NEXT_PUBLIC_HEDERA_NETWORK=testnet  # or "mainnet"
   
   # Hedera credentials
   HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
   HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
   
   # Topic IDs (auto-created if not set)
   PROJECT_REGISTRY_TOPIC_TESTNET=0.0.0
   PROJECT_REGISTRY_TOPIC_MAINNET=0.0.0
   
   # Supabase (for database)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET=your-service-role-key
   ```

2. **Sufficient HBAR Balance**: Your operator account needs enough HBAR for:
   - Topic creation (~$0.01 USD worth of HBAR) - if topic doesn't exist
   - Message submission (~$0.0001 USD worth of HBAR)

## Usage

### For Testnet

```bash
# Set network to testnet in .env.local
NEXT_PUBLIC_HEDERA_NETWORK=testnet

# Run the script
npm run ts-node utils/send-test-project.ts
```

### For Mainnet

```bash
# Set network to mainnet in .env.local
NEXT_PUBLIC_HEDERA_NETWORK=mainnet

# Run the script
npm run ts-node utils/send-test-project.ts
```

## What It Does

1. **Validates Configuration**
   - Checks that `NEXT_PUBLIC_HEDERA_NETWORK` is set to "testnet" or "mainnet"
   - Verifies Hedera credentials are present

2. **Gets or Creates Registry Topic**
   - Looks for network-specific topic ID environment variable
   - If not found or invalid, creates a new HCS-2 indexed topic
   - Provides the topic ID to add to your `.env.local`

3. **Submits Project to HCS-2**
   - Creates properly formatted HCS-2 message with project metadata
   - Submits to the registry topic
   - Captures the transaction ID

4. **Saves to Database**
   - Stores project in `keyring_projects` table
   - Links the database record to the on-chain message via `topic_message_id`

5. **Provides Verification Links**
   - Shows HashScan links for both topic and transaction
   - Different links for testnet vs mainnet

## Output Example

### Testnet
```
🌐 KeyRing Project Registration
═══════════════════════════════════════

📡 Network: TESTNET
🔑 Operator Account: 0.0.123456

✓ Using existing testnet project registry topic: 0.0.234567

🎉 Project registered successfully on Hedera HCS-2 topic!
═══════════════════════════════════════
Network: TESTNET
Registry Topic ID: 0.0.234567
Transaction ID: 0.0.123456@1234567890.123456789
Status: SUCCESS

🔍 View on HashScan:
Topic: https://hashscan.io/testnet/topic/0.0.234567
Transaction: https://hashscan.io/testnet/transaction/0.0.123456@1234567890.123456789

💾 Saving project to database...
✅ Project saved to database successfully!
Database Project ID: uuid-here

✨ Registration Complete!
```

### Mainnet
```
🌐 KeyRing Project Registration
═══════════════════════════════════════

📡 Network: MAINNET
🔑 Operator Account: 0.0.987654

📝 Creating new KeyRing Project Registry topic on MAINNET (HCS-2 indexed)...
✅ Created new mainnet project registry topic with ID: 0.0.345678

📋 Add this to your .env.local file:
PROJECT_REGISTRY_TOPIC_MAINNET=0.0.345678

🎉 Project registered successfully on Hedera HCS-2 topic!
═══════════════════════════════════════
Network: MAINNET
Registry Topic ID: 0.0.345678
Transaction ID: 0.0.987654@1234567890.123456789
Status: SUCCESS

🔍 View on HashScan:
Topic: https://hashscan.io/mainnet/topic/0.0.345678
Transaction: https://hashscan.io/mainnet/transaction/0.0.987654@1234567890.123456789

💾 Saving project to database...
✅ Project saved to database successfully!
Database Project ID: uuid-here

✨ Registration Complete!
```

## HCS-2 Message Format

The script submits messages in this format:

```json
{
  "p": "hcs-2",
  "op": "register",
  "t_id": "0.0.123456",
  "metadata": {
    "company_name": "Lynxify",
    "legal_entity_name": "Lynxify LLC",
    "public_record_url": "https://wyobiz.wyo.gov/...",
    "owners": ["Jason Cox", "Kevin Compton"],
    "description": "Company description...",
    "hederaAccountId": "0.0.123456",
    "status": "verified"
  },
  "m": "KeyRing verified project registration"
}
```

## Network-Specific Topic IDs

The script uses different environment variables for each network:
- **Testnet**: `PROJECT_REGISTRY_TOPIC_TESTNET`
- **Mainnet**: `PROJECT_REGISTRY_TOPIC_MAINNET`

This allows you to maintain separate registries for testing and production.

## Customizing Project Data

Edit the `projectData` object in the script to register different projects:

```typescript
const projectData = {
    companyName: "Your Company",
    legalEntityName: "Your Company Inc.",
    publicRecordUrl: "https://...",
    owners: ["Owner 1", "Owner 2"],
    metadata: {
        description: "Your description...",
        hederaAccountId: operatorId.toString(),
        status: "verified"
    }
};
```

## Troubleshooting

### Error: "NEXT_PUBLIC_HEDERA_NETWORK must be set"
- Add `NEXT_PUBLIC_HEDERA_NETWORK=testnet` or `mainnet` to `.env.local`

### Error: "Insufficient balance"
- Add more HBAR to your operator account
- Testnet: Use the [Hedera Testnet Faucet](https://portal.hedera.com/faucet)
- Mainnet: Transfer HBAR from another account or exchange

### Error: "Invalid private key"
- Ensure your private key is in DER format
- Should start with `302e020100`

### Topic Not Found
- Remove the old topic ID from `.env.local`
- Script will create a new topic automatically

## Security Notes

⚠️ **Never commit** your `.env.local` file or expose:
- `HEDERA_ACCOUNT_ID`
- `HEDERA_PRIVATE_KEY`
- `PROJECT_REGISTRY_TOPIC_*` (they're linked to your operator account)

✅ **Safe to expose**:
- `NEXT_PUBLIC_HEDERA_NETWORK`
- Topic IDs themselves (they're public on Hedera)
- The HCS-2 messages (they're public by design)

## Verification

After running the script, you can verify:

1. **On HashScan**: Use the provided links to view the transaction and topic
2. **In Database**: Check the `keyring_projects` table in Supabase
3. **Via API**: Call `/api/threshold-lists` to see projects in threshold list responses

## Next Steps

After registering your project:
1. Create threshold lists linked to the project
2. Add signers to the lists
3. Use the lists for multi-signature operations

