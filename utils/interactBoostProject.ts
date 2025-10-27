import {
  Client,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  ContractId
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Update this after deploying the contract
const CONTRACT_ID = process.env.BOOST_PROJECT_CONTRACT_ID || "";

async function interactWithBoostProject(): Promise<void> {
  if (!CONTRACT_ID) {
    console.log("❌ Please set BOOST_PROJECT_CONTRACT_ID in your .env.local file");
    console.log("You'll get this ID after deploying the contract with: npm run boost:deploy\n");
    return;
  }

  // Configure client for testnet
  const client = Client.forTestnet();
  
  // Set operator account
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    console.log("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in your .env.local file");
    return;
  }
  
  client.setOperator(operatorId, operatorKey);
  
  console.log("🎮 Interacting with BoostProject Contract\n");
  console.log(`Contract ID: ${CONTRACT_ID}`);
  console.log(`Operator: ${operatorId}\n`);
  
  const menu = `
Choose an action:
1. Create boost transaction (operator only)
2. Query boost counter
3. Query total transactions
4. Get transaction details
5. Execute boost transaction (threshold list only)
0. Exit
  `;
  
  console.log(menu);
  
  // For now, let's demonstrate creating a boost transaction
  try {
    await createBoostTransaction(client, CONTRACT_ID, "Test Boost #1");
    await queryBoostCounter(client, CONTRACT_ID);
    await queryTotalTransactions(client, CONTRACT_ID);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.close();
  }
}

/**
 * Create a new boost transaction (operator only)
 */
async function createBoostTransaction(
  client: Client,
  contractId: string,
  description: string
): Promise<void> {
  console.log("\n📝 Creating Boost Transaction...");
  console.log(`Description: "${description}"`);
  
  try {
    const contractExecTx = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(contractId))
      .setGas(100000)
      .setFunction(
        "createBoostTransaction",
        new ContractFunctionParameters().addString(description)
      )
      .execute(client);
    
    const receipt = await contractExecTx.getReceipt(client);
    console.log(`✅ Transaction created successfully!`);
    console.log(`Status: ${receipt.status.toString()}`);
    console.log(`Transaction ID: ${contractExecTx.transactionId.toString()}\n`);
    
    console.log("📋 Next Step:");
    console.log("The threshold list (all 3 signers) must now call executeBoostTransaction()");
    console.log("to approve and execute this boost transaction.\n");
    
  } catch (error) {
    console.error("❌ Error creating boost transaction:", error);
    throw error;
  }
}

/**
 * Execute a boost transaction (threshold list only)
 */
async function executeBoostTransaction(
  client: Client,
  contractId: string,
  transactionId: number
): Promise<void> {
  console.log("\n⚡ Executing Boost Transaction...");
  console.log(`Transaction ID: ${transactionId}`);
  
  try {
    const contractExecTx = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(contractId))
      .setGas(100000)
      .setFunction(
        "executeBoostTransaction",
        new ContractFunctionParameters().addUint256(transactionId)
      )
      .execute(client);
    
    const receipt = await contractExecTx.getReceipt(client);
    console.log(`✅ Boost transaction executed successfully!`);
    console.log(`Status: ${receipt.status.toString()}`);
    console.log(`Hedera TX ID: ${contractExecTx.transactionId.toString()}\n`);
    
  } catch (error) {
    console.error("❌ Error executing boost transaction:", error);
    console.log("\n💡 Note: This function can only be called by the threshold list account.");
    console.log("All 3 keys must sign the transaction.\n");
    throw error;
  }
}

/**
 * Query the current boost counter value
 */
async function queryBoostCounter(client: Client, contractId: string): Promise<void> {
  console.log("🔍 Querying Boost Counter...");
  
  try {
    const contractQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(contractId))
      .setGas(50000)
      .setFunction("getBoostCounter")
      .execute(client);
    
    const counter = contractQuery.getUint256(0);
    console.log(`✅ Current Boost Counter: ${counter.toString()}\n`);
    
  } catch (error) {
    console.error("❌ Error querying boost counter:", error);
    throw error;
  }
}

/**
 * Query total number of transactions created
 */
async function queryTotalTransactions(client: Client, contractId: string): Promise<void> {
  console.log("🔍 Querying Total Transactions...");
  
  try {
    const contractQuery = await new ContractCallQuery()
      .setContractId(ContractId.fromString(contractId))
      .setGas(50000)
      .setFunction("getTotalTransactions")
      .execute(client);
    
    const total = contractQuery.getUint256(0);
    console.log(`✅ Total Transactions Created: ${total.toString()}\n`);
    
  } catch (error) {
    console.error("❌ Error querying total transactions:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  interactWithBoostProject();
}

export { 
  interactWithBoostProject,
  createBoostTransaction,
  executeBoostTransaction,
  queryBoostCounter,
  queryTotalTransactions
};

