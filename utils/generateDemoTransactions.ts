import {
  Client,
  PrivateKey,
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ScheduleCreateTransaction,
  Timestamp
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BOOST_PROJECT_CONTRACT_ID = process.env.BOOST_PROJECT_CONTRACT_ID;

// Transaction type enum matching contract
enum TransactionType {
  SIMPLE_BOOST = 0,
  TOKEN_MINT = 1,
  TOKEN_BURN = 2,
  SUPPLY_KEY_TRANSFER = 3,
  TREASURY_TRANSFER = 4,
  TOKEN_PAUSE = 5,
  FEE_SCHEDULE_UPDATE = 6,
  ACCOUNT_ALLOWANCE = 7,
}

// Transaction templates - realistic project scenarios
const TRANSACTIONS = [
  {
    type: TransactionType.SIMPLE_BOOST,
    description: "Q1 2025 Community Engagement Initiative - Tracking participation for upcoming reward distribution",
    targetToken: "0x0000000000000000000000000000000000000000",
    amount: 0,
    recipient: "0x0000000000000000000000000000000000000000",
    expirationDays: 7,
  },
  {
    type: TransactionType.TOKEN_MINT,
    description: "Monthly reward distribution to active community members - Minting 1,000,000 tokens to distribution pool as per tokenomics schedule",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 1000000,
    recipient: "0x0000000000000000000000000000000000000002",
    expirationDays: 5,
  },
  {
    type: TransactionType.TOKEN_BURN,
    description: "Q1 buyback and burn program - Removing 100,000 tokens from circulation to reduce supply per roadmap",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 100000,
    recipient: "0x0000000000000000000000000000000000000000",
    expirationDays: 5,
  },
  {
    type: TransactionType.TREASURY_TRANSFER,
    description: "Marketing budget allocation - 100 HBAR for Q1 social media campaign and influencer partnerships",
    targetToken: "0x0000000000000000000000000000000000000000",
    amount: 10000000000, // 100 HBAR in tinybars
    recipient: "0x0000000000000000000000000000000000000003",
    expirationDays: 5,
  },
  {
    type: TransactionType.ACCOUNT_ALLOWANCE,
    description: "SaucerSwap DEX integration - Approving 1,000,000 token allowance for liquidity pool creation",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 1000000,
    recipient: "0x0000000000000000000000000000000000000004",
    expirationDays: 5,
  },
  {
    type: TransactionType.FEE_SCHEDULE_UPDATE,
    description: "Token fee optimization - Adjusting transfer fee to 100 tinybars based on network conditions analysis",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 100,
    recipient: "0x0000000000000000000000000000000000000000",
    expirationDays: 5,
  },
  {
    type: TransactionType.TOKEN_PAUSE,
    description: "Emergency pause due to suspected smart contract vulnerability - Halting all token transfers pending security audit",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 1, // 1 = pause, 0 = unpause
    recipient: "0x0000000000000000000000000000000000000000",
    expirationDays: 2,
  },
  {
    type: TransactionType.SUPPLY_KEY_TRANSFER,
    description: "Governance upgrade - Transferring supply key control to new 3-of-5 multi-signature governance contract",
    targetToken: "0x0000000000000000000000000000000000000001",
    amount: 0,
    recipient: "0x0000000000000000000000000000000000000005",
    expirationDays: 7,
  },
];

/**
 * Creates educational boost transactions for a specific threshold list
 * @param thresholdListId - The threshold list account ID to create transactions for
 * @returns Array of created schedule IDs
 */
export async function generateDemoTransactions(thresholdListId: string): Promise<string[]> {
  const client = Client.forTestnet();
  
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY");
  }
  
  if (!BOOST_PROJECT_CONTRACT_ID) {
    throw new Error("Please set BOOST_PROJECT_CONTRACT_ID in .env.local");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  const scheduleIds: string[] = [];
  
  try {
    console.log(`\n🎓 Creating Educational Boost Transactions`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Operator: ${operatorId}`);
    console.log(`Threshold List: ${thresholdListId}`);
    console.log(`Contract: ${BOOST_PROJECT_CONTRACT_ID}\n`);
    
    for (const tx of TRANSACTIONS) {
      console.log(`\n📝 Creating: ${TransactionType[tx.type]}`);
      console.log(`   Description: ${tx.description.substring(0, 60)}...`);
    
      const transactionToSchedule = new ContractExecuteTransaction()
        .setContractId(BOOST_PROJECT_CONTRACT_ID)
        .setGas(300000)
        .setFunction(
          "createTransaction",
          new ContractFunctionParameters()
            .addString(tx.description)
            .addUint8(tx.type)
            .addAddress(tx.targetToken)
            .addUint256(tx.amount)
            .addAddress(tx.recipient)
            .addUint256(tx.expirationDays * 24 * 60 * 60)
        );
      
      const scheduleTransaction = new ScheduleCreateTransaction()
        .setScheduledTransaction(transactionToSchedule)
        .setPayerAccountId(AccountId.fromString(thresholdListId))
        .setScheduleMemo(`BoostProject: ${TransactionType[tx.type]}`)
        .setExpirationTime(Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
        .setWaitForExpiry(false);
      
      const scheduleTransactionFreeze = await scheduleTransaction.freezeWith(client);
      const scheduleTransactionSigned = await scheduleTransactionFreeze.sign(PrivateKey.fromString(operatorKey));
      
      const scheduleSubmit = await scheduleTransactionSigned.execute(client);
      const scheduleReceipt = await scheduleSubmit.getReceipt(client);
      
      const scheduleId = scheduleReceipt.scheduleId;
      
      if (scheduleId) {
        scheduleIds.push(scheduleId.toString());
        console.log(`   ✅ Schedule ID: ${scheduleId}`);
        console.log(`   🔗 https://hashscan.io/testnet/schedule/${scheduleId}`);
      }
      
      // Wait between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Created ${scheduleIds.length} Educational Transactions!\n`);
    
    return scheduleIds;
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Run directly if called from command line
if (require.main === module) {
  const thresholdListId = process.argv[2];
  
  if (!thresholdListId) {
    console.error("❌ Error: Please provide a threshold list account ID");
    console.error("Usage: npm run demo:transactions <threshold-list-id>");
    process.exit(1);
  }
  
  generateDemoTransactions(thresholdListId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

