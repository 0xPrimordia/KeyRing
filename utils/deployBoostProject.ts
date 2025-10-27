import {
  Client,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar,
  AccountId
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Threshold list account created earlier
const THRESHOLD_LIST_ACCOUNT = "0.0.7097961";

async function deployBoostProject(): Promise<void> {
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
  
  try {
    console.log("🚀 Deploying BoostProject Contract to Hedera Testnet\n");
    console.log(`Operator: ${operatorId}`);
    console.log(`Threshold List: ${THRESHOLD_LIST_ACCOUNT}\n`);
    
    // Read the compiled contract bytecode
    // Note: You'll need to compile the contract first
    const bytecode = await readContractBytecode();
    
    if (!bytecode) {
      console.log("❌ Contract bytecode not found. Please compile the contract first.");
      console.log("Run: npx hardhat compile");
      return;
    }
    
    console.log("📄 Contract bytecode loaded");
    console.log(`Bytecode size: ${bytecode.length} bytes\n`);
    
    // Deploy contract
    console.log("🔨 Deploying contract...");
    
    // Convert threshold list account to EVM address format
    const thresholdListAddress = AccountId.fromString(THRESHOLD_LIST_ACCOUNT).toSolidityAddress();
    const operatorAddress = AccountId.fromString(operatorId).toSolidityAddress();
    
    const contractCreate = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(100000)
      .setConstructorParameters(
        new ContractFunctionParameters()
          .addAddress(operatorAddress)
          .addAddress(thresholdListAddress)
      );
    
    const contractCreateSubmit = await contractCreate.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;
    
    if (!contractId) {
      throw new Error("Failed to deploy contract - no contract ID returned");
    }
    
    console.log(`✅ Contract deployed successfully!`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`Contract Address: ${contractId.toSolidityAddress()}\n`);
    
    console.log("📋 Contract Configuration:");
    console.log(`  Operator: ${operatorId}`);
    console.log(`  Threshold List: ${THRESHOLD_LIST_ACCOUNT}`);
    console.log(`  Initial Boost Counter: 0\n`);
    
    console.log("🎯 Next Steps:");
    console.log("1. Use your operator account to create boost transactions");
    console.log("2. Use the threshold list (all 3 keys) to approve transactions");
    console.log("3. Monitor on-chain events to track activity\n");
    
    console.log("🔗 View on HashScan:");
    console.log(`https://hashscan.io/testnet/contract/${contractId}\n`);
    
  } catch (error) {
    console.error("❌ Error deploying contract:", error);
  } finally {
    client.close();
  }
}

/**
 * Read the compiled contract bytecode
 * Supports both Hardhat and manual compilation
 */
async function readContractBytecode(): Promise<string | null> {
  const possiblePaths = [
    path.join(__dirname, '..', 'artifacts', 'contracts', 'BoostProject.sol', 'BoostProject.json'),
    path.join(__dirname, '..', 'build', 'contracts', 'BoostProject.json'),
    path.join(__dirname, '..', 'contracts', 'BoostProject.bin')
  ];
  
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // If it's a JSON artifact
        if (filePath.endsWith('.json')) {
          const artifact = JSON.parse(content);
          return artifact.bytecode || artifact.data?.bytecode?.object;
        }
        
        // If it's a raw .bin file
        return content.trim();
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

// Run the script
if (require.main === module) {
  deployBoostProject();
}

export { deployBoostProject };

