import {
  Client,
  PrivateKey,
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  ScheduleCreateTransaction,
  ScheduleInfoQuery,
  Timestamp
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const THRESHOLD_LIST_ACCOUNT = process.env.THRESHOLD_LIST_ACCOUNT_TESTNET;
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

async function createScheduledTransaction(): Promise<void> {
  const client = Client.forTestnet();
  
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY");
  }
  
  if (!THRESHOLD_LIST_ACCOUNT) {
    throw new Error("Please set THRESHOLD_LIST_ACCOUNT_TESTNET in .env.local");
  }
  
  if (!BOOST_PROJECT_CONTRACT_ID) {
    throw new Error("Please set BOOST_PROJECT_CONTRACT_ID in .env.local");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("🎓 Creating Educational Boost Transactions\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`Operator: ${operatorId}`);
    console.log(`Threshold List: ${THRESHOLD_LIST_ACCOUNT}`);
    console.log(`Contract: ${BOOST_PROJECT_CONTRACT_ID}\n`);
    
    for (const tx of TRANSACTIONS) {
      console.log(`\n📝 Creating: ${TransactionType[tx.type]}`);
      console.log(`   Description: ${tx.description}`);
    
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
      .setPayerAccountId(AccountId.fromString(THRESHOLD_LIST_ACCOUNT))
        .setScheduleMemo(`BoostProject: ${TransactionType[tx.type]}`)
        .setExpirationTime(Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
        .setWaitForExpiry(false);
      
    const scheduleTransactionFreeze = await scheduleTransaction.freezeWith(client);
    const scheduleTransactionSigned = await scheduleTransactionFreeze.sign(PrivateKey.fromString(operatorKey));
    
    const scheduleSubmit = await scheduleTransactionSigned.execute(client);
    const scheduleReceipt = await scheduleSubmit.getReceipt(client);
    
    const scheduleId = scheduleReceipt.scheduleId;
      
      console.log(`   ✅ Schedule ID: ${scheduleId}`);
      console.log(`   🔗 https://hashscan.io/testnet/schedule/${scheduleId}`);
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All Educational Transactions Created!\n");
    
    console.log("📋 What Happens Next:");
    console.log("   1. Threshold signers (2 of 3) approve each scheduled transaction");
    console.log("   2. Once approved, contract creates the BoostTransaction on-chain");
    console.log("   3. Individual signers can then approve/reject each transaction");
    console.log("   4. Signers earn points for participation");
    console.log("   5. Points are tracked on-chain for reward distribution\n");
    
    console.log("🔧 To Approve (threshold signers):");
    console.log(`   npm run boost:sign <SCHEDULE_ID>\n`);
    
    console.log("🔗 Monitor:");
    console.log(`   Threshold List: https://hashscan.io/testnet/account/${THRESHOLD_LIST_ACCOUNT}`);
    console.log(`   Contract: https://hashscan.io/testnet/contract/${BOOST_PROJECT_CONTRACT_ID}\n`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

if (require.main === module) {
  createScheduledTransaction()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createScheduledTransaction };
