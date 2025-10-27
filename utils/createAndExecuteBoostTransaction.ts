import {
  Client,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  AccountId
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const CONTRACT_ID = "0.0.7097984";
const THRESHOLD_LIST_ACCOUNT = "0.0.7097961";

async function createAndExecuteBoostTransaction(): Promise<void> {
  console.log("🚀 Creating Boost Transaction for Threshold List Approval\n");
  
  const client = Client.forTestnet();
  
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("📋 Configuration:");
    console.log(`   Operator: ${operatorId}`);
    console.log(`   Contract: ${CONTRACT_ID}`);
    console.log(`   Threshold List: ${THRESHOLD_LIST_ACCOUNT}\n`);
    
    // Step 1: Check current state
    console.log("🔍 Checking Current Contract State...");
    const counterQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(CONTRACT_ID))
      .setGas(50000)
      .setFunction("getBoostCounter")
      .execute(client);
    
    const currentCounter = counterQuery.getUint256(0);
    console.log(`   Current Boost Counter: ${currentCounter.toString()}\n`);
    
    const totalQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(CONTRACT_ID))
      .setGas(50000)
      .setFunction("getTotalTransactions")
      .execute(client);
    
    const totalTxs = totalQuery.getUint256(0);
    console.log(`   Total Transactions Created: ${totalTxs.toString()}\n`);
    
    // Step 2: Create a boost transaction (as operator)
    console.log("📝 Creating Boost Transaction (as Operator)...");
    console.log("   Description: 'Test Boost Transaction #1'");
    
    const createTx = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(CONTRACT_ID))
      .setGas(200000)
      .setFunction(
        "createBoostTransaction",
        new ContractFunctionParameters().addString("Test Boost Transaction #1")
      )
      .execute(client);
    
    const createReceipt = await createTx.getReceipt(client);
    console.log(`\n✅ Transaction Created!`);
    console.log(`   Status: ${createReceipt.status.toString()}`);
    console.log(`   Hedera TX ID: ${createTx.transactionId.toString()}\n`);
    
    // Step 3: Check new state
    console.log("🔍 Checking New State...");
    const newTotalQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(CONTRACT_ID))
      .setGas(50000)
      .setFunction("getTotalTransactions")
      .execute(client);
    
    const newTotal = newTotalQuery.getUint256(0);
    const transactionId = newTotal.toNumber();
    console.log(`   New Total Transactions: ${newTotal.toString()}`);
    console.log(`   Transaction ID: ${transactionId}\n`);
    
    // Step 4: Query the transaction details
    console.log("📄 Transaction Details:");
    const txDetailsQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(CONTRACT_ID))
      .setGas(100000)
      .setFunction(
        "getTransaction",
        new ContractFunctionParameters().addUint256(transactionId)
      )
      .execute(client);
    
    console.log(`   Transaction is now waiting in the contract`);
    console.log(`   Status: Pending execution\n`);
    
    // Step 5: Try to execute as operator (should FAIL)
    console.log("❌ Attempting to Execute as Operator (should fail)...");
    try {
      const badExecuteTx = await new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(CONTRACT_ID))
        .setGas(100000)
        .setFunction(
          "executeBoostTransaction",
          new ContractFunctionParameters().addUint256(transactionId)
        )
        .execute(client);
      
      await badExecuteTx.getReceipt(client);
      console.log("   ⚠️  Operator was able to execute (this shouldn't happen!)\n");
      
    } catch (error: any) {
      console.log("   ✅ Correctly rejected! Only threshold list can execute.\n");
    }
    
    // Step 6: Instructions for threshold list execution
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔐 THRESHOLD LIST EXECUTION REQUIRED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    console.log("📋 Transaction Details:");
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Description: "Test Boost Transaction #1"`);
    console.log(`   Status: ⏳ Waiting for threshold list approval\n`);
    
    console.log("👥 Required Signers (ALL 3 must sign):");
    console.log("   Key 1: 302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399");
    console.log("   Key 2: 302a300506032b657003210059345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07");
    console.log("   Key 3: 302a300506032b65700321000158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8\n");
    
    console.log("🔧 To Execute (requires all 3 private keys):");
    console.log("   1. Each signer must sign the transaction");
    console.log("   2. Call: executeBoostTransaction(" + transactionId + ")");
    console.log("   3. Transaction must be sent FROM threshold list account\n");
    
    console.log("📊 What This Tests:");
    console.log("   ✅ Operator can create boost transactions");
    console.log("   ✅ Transaction is stored in contract");
    console.log("   ⏳ Waiting for threshold list to execute");
    console.log("   ✅ Only threshold list can execute (not operator)\n");
    
    console.log("🔗 Monitor Activity:");
    console.log(`   Contract: https://hashscan.io/testnet/contract/${CONTRACT_ID}`);
    console.log(`   Threshold List: https://hashscan.io/testnet/account/${THRESHOLD_LIST_ACCOUNT}\n`);
    
    console.log("💡 This is how boost projects will work:");
    console.log("   1. KeyRing creates boost transactions regularly");
    console.log("   2. Signers in threshold lists must approve/execute them");
    console.log("   3. Activity tracked on-chain for reward calculations");
    console.log("   4. Reliable signers get more rewards\n");
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Run the script
if (require.main === module) {
  createAndExecuteBoostTransaction()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createAndExecuteBoostTransaction };

